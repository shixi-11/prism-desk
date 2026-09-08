require('./helpers/config-fixture.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {grokArgs,permissionOutcome}=require('../electron/grok.cjs');
const {validateMode,newTaskMode}=require('../electron/task-settings.cjs');
const {Runner}=require('../electron/runner.cjs');
const profile={provider:'Grok',write:true,model:'grok-4.6'};
test('Grok write modes are explicit; read-only and planning never expose write tools',()=>{
 for(const mode of ['read-only','workspace-write','full-access'])assert.doesNotThrow(()=>validateMode(mode,profile));
 assert.throws(()=>validateMode('full-access',{...profile,write:false}));
 assert.equal(newTaskMode({},profile),'workspace-write');
 const args=mode=>grokArgs({cwd:process.cwd(),mode},profile,'test');
 const value=(a,key)=>a[a.indexOf(key)+1];
 assert.equal(value(args('read-only'),'--tools'),'Read,Grep,WebSearch,WebFetch');
 assert.equal(value(args('workspace-write'),'--permission-mode'),'default');
 assert.equal(value(args('workspace-write'),'--sandbox'),'workspace');
 assert.equal(value(args('full-access'),'--sandbox'),'off');
 assert.equal(value(args('full-access'),'--permission-mode'),'bypassPermissions');
 const planning=grokArgs({cwd:process.cwd(),mode:'full-access',execution:{mode:'read-only'}},profile,'test');
 assert.equal(value(planning,'--tools'),'Read,Grep,WebSearch,WebFetch');
});
test('ACP approval grants only once and fails closed for unsupported choices',()=>{
 const params={options:[{kind:'allow_always',optionId:'all'},{kind:'allow_once',optionId:'yes'},{kind:'reject_once',optionId:'no'}]};
 assert.deepEqual(permissionOutcome(params,'accept'),{outcome:'selected',optionId:'yes'});
 assert.deepEqual(permissionOutcome(params,'decline'),{outcome:'selected',optionId:'no'});
 assert.deepEqual(permissionOutcome({options:[params.options[0]]},'accept'),{outcome:'cancelled'});
 let response;const runner=new Runner({append:()=>({})});
 runner.active={task:{id:'test'},pending:new Map([['7',{id:7,method:'session/request_permission',params}]]),rpc:{write:r=>response=r}};
 runner.approve('7','accept');assert.deepEqual(response,{id:7,result:{outcome:{outcome:'selected',optionId:'yes'}}});
 assert.throws(()=>runner.approve('7','accept'),/失效/);
});
test('stopping Grok resolves a pending approval before cancelling the session',async()=>{
 const runner=new Runner({save:()=>{}}),messages=[];runner.state=()=>{};
 runner.active={task:{id:'t'},started:true,grok:true,sessionId:'s',pending:new Map([['1',{id:1,method:'session/request_permission'}]]),rpc:{write:m=>messages.push(m)}};
 await runner.stop();assert.deepEqual(messages,[{id:1,result:{outcome:{outcome:'cancelled'}}},{method:'session/cancel',params:{sessionId:'s'}}]);assert.equal(runner.active.pending.size,0);
});
