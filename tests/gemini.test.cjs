require('./helpers/config-fixture.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {EventEmitter}=require('node:events');
const {prepareGemini,geminiStatus}=require('../electron/gemini.cjs');
const bundle=process.env.PRISM_GEMINI_TEST_BUNDLE;
if(bundle && (!path.isAbsolute(bundle) || !fs.existsSync(bundle))) throw Error('PRISM_GEMINI_TEST_BUNDLE must point to an existing absolute Gemini policy bundle path.');
test('Gemini official policy engine blocks writes, shell, MCP and exiting read-only mode', {skip:!bundle && 'Set PRISM_GEMINI_TEST_BUNDLE to validate an installed official Gemini policy engine'}, async()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'prism-gemini-policy-'));
  try {
    const profile={id:'gemini-test',home};
    const {policy,settings}=prepareGemini(profile);
    assert.equal(geminiStatus(profile).loginRequired,true);
    const {PolicyEngine,loadPoliciesFromToml,resolveModel}=await import(pathToFileURL(bundle));
    const parsed=await loadPoliciesFromToml([policy],()=>5);
    assert.deepEqual(parsed.errors,[]);
    const engine=new PolicyEngine({rules:parsed.rules,approvalMode:'plan',nonInteractive:true});
    for(const name of ['write_file','replace','run_shell_command','exit_plan_mode','invoke_agent','activate_skill','mcp__blender__execute_code']) {
      const result=await engine.check({name,args:{}});
      assert.equal(result.decision,'deny',name);
    }
    for(const name of ['read_file','list_directory','glob','grep_search']) {
      const result=await engine.check({name,args:{}});
      assert.equal(result.decision,'allow',name);
    }
    assert.ok(resolveModel('auto').startsWith('gemini-'));
    const locked=JSON.parse(fs.readFileSync(settings));
    assert.equal(locked.security.auth.enforcedType,'oauth-personal');
  } finally {fs.rmSync(home,{recursive:true,force:true});}
});

test('Antigravity transfers the task record once, resumes by native ID and ignores replayed messages',async t=>{
  const core=require('../electron/core.cjs');
  const {runGemini}=require('../electron/gemini.cjs');
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'prism-antigravity-'));
  t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const record={path:path.join(home,'record.md')};
  fs.writeFileSync(record.path,'Evidence from the previous provider');
  const calls=[],events=[];
  class Agent extends EventEmitter {
    constructor(_profile,cwd,args){super();assert.equal(cwd,home);assert.equal(args[0],'acp');this.proc={pid:1};}
    async call(method,params){
      calls.push({method,params});
      if(method==='initialize')return {protocolVersion:1,agentInfo:{name:'Antigravity ACP Server'},agentCapabilities:{loadSession:true},authMethods:[{id:'oauth-personal'}]};
      if(method==='session/new')return {sessionId:'native-id'};
      if(method==='session/load'){this.update('Replay');return {};}
      if(method==='session/prompt'){this.update('Fresh reply');return {stopReason:'end_turn'};}
      throw Error('Unexpected RPC '+method);
    }
    update(text){this.emit('message',{method:'session/update',params:{sessionId:'native-id',update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text}}}});}
    async end(){}
  }
  const original=core.Rpc;core.Rpc=Agent;t.after(()=>{core.Rpc=original;});
  const profile={provider:'Gemini',id:'gemini',executable:'agy',home,name:'Test'};
  const task={id:'test',mode:'read-only',cwd:path.join(home,'original-project'),sessions:{}};
  const runner={active:{images:[]},store:{save(){}},emit(){},event(_id,type,data){events.push({type,...data});},state(_task,state){task.state=state;}};
  await runGemini(runner,task,profile,'Continue','',record);
  await runGemini(runner,task,profile,'Next turn','',record);
  assert.equal(task.state,'idle');
  assert.deepEqual(calls.map(c=>c.method),['initialize','session/new','session/prompt','initialize','session/load','session/prompt']);
  assert.equal(calls[4].params.sessionId,'native-id');
  assert.match(JSON.stringify(calls[2].params.prompt),/Evidence from the previous provider/);
  assert.doesNotMatch(JSON.stringify(calls[5].params.prompt),/Evidence from the previous provider/);
  assert.deepEqual(events.filter(e=>e.type==='assistant').map(e=>e.text),['Fresh reply','Fresh reply']);
  task.mode='workspace-write';
  await assert.rejects(runGemini(runner,task,profile,'Write','',record),/只读/);
  assert.equal(calls.length,6);
});
