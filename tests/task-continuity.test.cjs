const {root}=require('./helpers/config-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{EventEmitter}=require('node:events'),{createRequire}=require('node:module');
const core=require('../electron/core.cjs');
test('successive guidance stays in the same active turn and a later message resumes its native thread',async()=>{
 const calls=[];let rpc,ended=0;
 class FakeRpc extends EventEmitter{
  constructor(){super();rpc=this;this.proc={pid:123};}
  async init(){}async end(){ended++;}
  async call(method,args){
   calls.push({method,args});
   if(method==='account/read')return {account:{type:'chatgpt'}};
   if(method==='account/rateLimits/read')return {};
   if(method==='thread/start'||method==='thread/resume')return {thread:{id:'same-native-thread'}};
   if(method==='turn/start')return {turn:{id:'same-active-turn'}};
   if(method==='turn/steer')return {};
   throw Error('Unexpected RPC '+method);
  }
 }
 const file=path.resolve(__dirname,'../electron/runner.cjs'),localRequire=createRequire(file),module={exports:{}};
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,exports:module.exports,require:id=>id==='./core.cjs'?{...core,Rpc:FakeRpc}:localRequire(id),process,Buffer,console,setTimeout,clearTimeout});
 const store=new core.TaskStore(path.join(root,'continuity')),task=store.create({title:'Original request'}),profile=core.profileFor(task.profile),runner=new module.exports.Runner(store);
 store.append(task.id,'user',{text:'Complete the original document review.'});
 const instructions=core.environmentPrompt(task,{apps:[]},store.context(task));
 assert.ok(instructions.includes(require('../electron/task-continuity.cjs').instructions));
 for(let turn=0;turn<2;turn++){
  runner.active={task,profile,images:[]};
  const running=runner.codex(task,profile,turn?'Continue reviewing.':'Review the document.',instructions);
  for(let n=0;!runner.active.turnId&&n<100;n++)await new Promise(r=>setImmediate(r));
  assert.equal(runner.active.turnId,'same-active-turn');
  if(!turn){
   for(const text of ['Keep the full names.','Clarify the opening scene.'])assert.equal(await runner.steer(task.id,text),true);
   assert.equal(ended,0);assert.equal(task.sessions[profile.id],'same-native-thread');
   const guidance=calls.filter(c=>c.method==='turn/steer');assert.equal(guidance.length,2);
   for(const call of guidance){assert.equal(call.args.threadId,'same-native-thread');assert.equal(call.args.expectedTurnId,'same-active-turn');assert.ok(call.args.input[0].text.includes('原目标'));}
   assert.equal(calls.some(c=>c.method==='turn/interrupt'),false);
   assert.deepEqual(store.events(task.id).filter(e=>e.steered).map(e=>e.text),['Keep the full names.','Clarify the opening scene.']);
  }
  rpc.emit('message',{method:'turn/completed',params:{turn:{status:'completed'}}});await running;
 }
 assert.deepEqual(calls.filter(c=>c.method.startsWith('thread/')).map(c=>c.method),['thread/start','thread/resume']);
 assert.equal(ended,2);assert.equal(task.state,'idle');
});
