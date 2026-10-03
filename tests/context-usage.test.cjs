require('./helpers/config-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {codexContext,claudeContext}=require('../electron/context-usage.cjs');
test('Codex context uses the latest window, never cumulative billed tokens',()=>{
 const c=codexContext({tokenUsage:{total:{totalTokens:9000000},last:{totalTokens:500300,inputTokens:490000,outputTokens:10300},modelContextWindow:1000000}});assert.equal(c.used,500300);assert.equal(c.limit,1000000);assert.equal(codexContext({}),null);
});
test('Claude uses context reports and ignores cumulative or subagent usage',()=>{
 const first=claudeContext({message:{usage:{input_tokens:100,cache_read_input_tokens:400,cache_creation_input_tokens:200,output_tokens:30}}});assert.equal(first.used,730);
 const result=claudeContext({type:'result',modelUsage:{opus:{inputTokens:9000000,contextWindow:1000000}}},first);assert.equal(result.used,730);assert.equal(result.limit,1000000);
 assert.equal(claudeContext({parent_tool_use_id:'agent',message:{usage:{input_tokens:999}}}),null);
 const report=claudeContext({context_usage:{model:'opus',total_tokens:500300,raw_max_tokens:1000000,categories:[{name:'Messages',tokens:500000,kind:'used'}]}});assert.equal(report.used,500300);assert.equal(report.categories[0].name,'Messages');
 const compacted=claudeContext({type:'system',subtype:'compact_boundary',compact_metadata:{pre_tokens:500300}},report);assert.equal(compacted.used,null);assert.ok(compacted.compactedAt);
});
test('maintenance preserves the goal and never rotates or submits a normal user instruction',async t=>{
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{TaskStore}=require('../electron/core.cjs'),{Runner}=require('../electron/runner.cjs');const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-context-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const store=new TaskStore(root),task=store.create({title:'context',cwd:root}),runner=new Runner(store);
 task.sessions[task.profile]='native-session';task.goalLifecycle={status:'paused',elapsedMs:1000};task.planReviewRequired=true;store.save(task);let calls=0;runner.codex=async function(current){calls++;assert.equal(this.active.maintenance,'compact');assert.equal(current.execution.mode,'read-only');this.active.quotaExhausted=true;this.state(current,'failed');};
 await runner.run(task.id,'/compact',[],{maintenance:'compact'});assert.equal(calls,1);assert.equal(store.events(task.id).filter(e=>e.type==='user').length,0);assert.deepEqual(store.get(task.id).goalLifecycle,task.goalLifecycle);
});
test('Codex compaction calls the native method and waits for completion, without turn/start',async t=>{
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),{createRequire}=require('node:module'),{EventEmitter}=require('node:events'),core=require('../electron/core.cjs');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-compact-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const calls=[];
 class Rpc extends EventEmitter{constructor(){super();this.proc={pid:123};}async init(){}async end(){}async call(method){calls.push(method);if(method==='account/read')return {account:{type:'chatgpt'}};if(method==='account/rateLimits/read')return {};if(method==='thread/resume')return {thread:{id:'existing'}};if(method==='thread/compact/start'){setImmediate(()=>{this.emit('message',{method:'thread/tokenUsage/updated',params:{tokenUsage:{last:{totalTokens:2000},modelContextWindow:1000000}}});this.emit('message',{method:'turn/completed',params:{turn:{status:'completed'}}});});return {}; }throw Error(method);}}
 const file=path.resolve(__dirname,'../electron/runner.cjs'),local=createRequire(file),context={module:{exports:{}},require:name=>name==='./core.cjs'?{...core,Rpc}:local(name)};vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
 const store=new core.TaskStore(root),task=store.create({title:'compact',cwd:root});task.sessions[task.profile]='existing';store.save(task);const runner=new context.module.exports.Runner(store);runner.active={task,profile:core.profileFor(task.profile),images:[],pending:new Map(),maintenance:'compact'};
 await runner.codex(task,core.profileFor(task.profile),'/compact','');assert.ok(calls.includes('thread/compact/start'));assert.ok(!calls.includes('turn/start'));assert.equal(store.get(task.id).state,'idle');assert.equal(store.get(task.id).contextUsage[task.profile].used,2000);
});
