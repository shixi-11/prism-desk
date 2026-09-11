require('./helpers/config-fixture.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
const {ClaudeInput}=require('../electron/claude-input.cjs');
function fixture(){const proc=new EventEmitter();proc.stdin=new PassThrough();const messages=[];proc.stdin.on('data',data=>messages.push(JSON.parse(data.toString())));return {proc,messages,input:new ClaudeInput(proc)};}
test('Claude keeps stdin open for pending guidance, acknowledges its UUID and closes after completion',async()=>{
 const {proc,messages,input}=fixture();input.write('initial');const pending=input.write('change direction',[],true);assert.equal(proc.stdin.writableEnded,false);
 input.receive({type:'result',subtype:'success'});assert.equal(proc.stdin.writableEnded,false);
 input.receive({type:'user',uuid:messages[1].uuid});assert.equal(await pending,true);
 input.receive({type:'result',subtype:'success'});assert.equal(proc.stdin.writableEnded,true);assert.equal(await input.write('too late',[],true),false);
});
test('Claude rejects unacknowledged guidance on disconnect and on an error result',async()=>{
 for(const failure of ['close','result']){const {proc,input}=fixture();input.write('initial');const pending=input.write('guidance',[],true);const rejected=assert.rejects(pending);if(failure==='close')proc.emit('close');else input.receive({type:'result',is_error:true});await rejected;assert.equal(input.pending.size,0);}
});
test('Claude does not acknowledge a different message or close before all pending messages are received',async()=>{
 const {proc,input,messages}=fixture();input.write('initial');const a=input.write('one',[],true),b=input.write('two',[],true);input.receive({type:'user',uuid:'unrelated'});assert.equal(input.pending.size,2);input.receive({type:'user',uuid:messages[1].uuid});await a;input.receive({type:'result'});assert.equal(proc.stdin.writableEnded,false);input.receive({type:'user',uuid:messages[2].uuid});await b;input.receive({type:'result'});assert.equal(proc.stdin.writableEnded,true);
});
test('Grok keeps its native session open until a concurrently submitted prompt finishes',async()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');const file=path.resolve(__dirname,'../electron/grok.cjs'),localRequire=createRequire(file);let rpc;const prompts=[];
 class FakeRpc extends EventEmitter{constructor(){super();rpc=this;this.proc={pid:123};this.closed=false;}async init(){return {agentCapabilities:{promptCapabilities:{image:true}}};}call(method,params){if(method==='session/new')return Promise.resolve({sessionId:'native'});assert.equal(method,'session/prompt');return new Promise(resolve=>prompts.push({params,resolve}));}async end(){this.closed=true;}}
 const context={module:{exports:{}},require:name=>name==='./core.cjs'?{Rpc:FakeRpc}:localRequire(name)};vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
 const task={id:'t',cwd:process.cwd(),mode:'read-only',sessions:{}},runner={active:{images:[]},store:{save(){}},emit(){},event(){},state(t,s){t.state=s;}};const running=context.module.exports.runGrok(runner,task,{id:'g',provider:'Grok',write:true,model:'grok-4.6'},'initial','');await new Promise(r=>setImmediate(r));
 const guidance=runner.active.sendGuidance('change direction',[]);assert.equal(prompts.length,2);assert.equal(prompts[0].params.sessionId,prompts[1].params.sessionId);prompts[0].resolve({stopReason:'end_turn'});await new Promise(r=>setImmediate(r));assert.equal(rpc.closed,false);prompts[1].resolve({stopReason:'end_turn'});assert.equal(await guidance,true);await running;assert.equal(rpc.closed,true);assert.equal(task.state,'idle');
});
test('waiting for one providers acknowledgement does not block live delivery to another conversation',async()=>{
 const {MessageQueue}=require('../electron/message-queue.cjs'),path=require('node:path'),{root}=require('./helpers/config-fixture.cjs');const tasks=[{id:'a',state:'running'},{id:'b',state:'running'}],active=tasks.map(task=>({task}));let release;const calls=[];
 const runners=active.map(a=>({active:a})),pool={activeRuns:()=>active,forTask:id=>runners[id==='a'?0:1],canRun:()=>false,steer:async id=>{calls.push(id);if(id==='a')await new Promise(r=>release=r);return true;}};
 const q=new MessageQueue({get:id=>tasks.find(t=>t.id===id)},pool,path.join(root,'live-isolation.json'));q.items=tasks.map(t=>({id:t.id,taskId:t.id,text:'update',status:'waiting',options:{steer:true}}));const pending=q.flushGuidance();await new Promise(r=>setImmediate(r));assert.deepEqual(calls,['a','b']);assert.equal(q.items.length,1);release();await pending;assert.equal(q.items.length,0);
});
