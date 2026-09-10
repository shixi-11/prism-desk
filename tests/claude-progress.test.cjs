require('./helpers/config-fixture.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module'),{EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
const core=require('../electron/core.cjs'),{root}=require('./helpers/config-fixture.cjs');
test('Claude receives linked directories and emits a final marker only for a successful result',async()=>{
 const file=path.resolve(__dirname,'../electron/runner.cjs'),localRequire=createRequire(file),linked=path.join(root,'linked-project');fs.mkdirSync(linked,{recursive:true});
 for(const success of [true,false]){
  let launchedArgs;
  const context={module:{exports:{}},require:name=>name==='./core.cjs'?{...core,spawnCLI:(_,args)=>{
   launchedArgs=args;const proc=new EventEmitter();proc.pid=123;proc.stdout=new PassThrough();proc.stderr=new PassThrough();proc.stdin=new PassThrough();proc.kill=()=>{};
   setImmediate(()=>{for(const msg of [{type:'assistant',message:{content:[{type:'text',text:'Checking files'},{type:'tool_use',name:'Read',id:'tool'}]}},{type:'assistant',message:{content:[{type:'text',text:'Final report'}]}},{type:'result',subtype:success?'success':'error_during_execution',is_error:!success,result:'Final report'}])proc.stdout.write(JSON.stringify(msg)+'\n');proc.emit('close',success?0:1);});return proc;
  }}:name==='./provider-quota.cjs'?{claudeQuota:async()=>({remaining:80})}:localRequire(name)};
  vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
  const store=new core.TaskStore(path.join(root,'progress-'+success)),task=store.create({title:'Stream test',cwd:root,profile:'claude-test-1',mode:'read-only'});task.linkedProjects=[linked];store.save(task);
  const runner=new context.module.exports.Runner(store);runner.active={task,images:[],quotaByWindow:{},cancelRequested:false};
  await runner.claude(task,core.profileFor('claude-test-1'),'Read only','');
  assert.equal(launchedArgs[launchedArgs.indexOf('--add-dir')+1],fs.realpathSync.native(linked));
  assert.equal(launchedArgs[launchedArgs.indexOf('--tools')+1],'Read,Glob,Grep');
  const events=store.events(task.id),answers=events.filter(e=>e.type==='assistant'),markers=events.filter(e=>e.type==='assistant-final');
  assert.equal(answers.length,2);assert.ok(answers.every(e=>e.phase==='commentary'));assert.equal(markers.length,success?1:0);if(success)assert.equal(markers[0].messageId,answers[1].id);
 }
});
