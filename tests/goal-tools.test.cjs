require('./helpers/config-fixture.cjs');
const {root}=require('./helpers/config-fixture.cjs'),{test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {TaskStore}=require('../electron/core.cjs'),{Runner}=require('../electron/runner.cjs'),goals=require('../electron/goal-tools.cjs'),plans=require('../electron/task-plan.cjs');
test('native goal calls save actual state, reject stale revisions and preserve existing steps',()=>{
 const store=new TaskStore(path.join(root,'goals')),task=store.create({title:'goal',cwd:root}),runner=new Runner(store),replies=[];
 task.sessions[task.profile]='thread';runner.active={task,profile:{id:task.profile},rpc:{write:v=>replies.push(v)}};
 const call=(tool,args,threadId='thread')=>goals.request(runner,task,{id:replies.length+1,method:'item/tool/call',params:{tool,arguments:args,threadId}});
 call('get_task_goal',{});assert.equal(JSON.parse(replies.at(-1).result.contentItems[0].text).saved,false);
 call('set_task_goal',{goal:'Make movement responsive',revision:null});assert.equal(replies.at(-1).result.success,true);assert.equal(store.get(task.id).workPlan.goal,'Make movement responsive');
 const revision=task.workPlan.revision;call('set_task_goal',{goal:'Stale',revision:null});assert.equal(replies.at(-1).result.success,false);assert.equal(task.workPlan.revision,revision);
 call('set_task_goal',{goal:'Other thread',revision},'other');assert.equal(replies.at(-1).result.success,false);
 plans.save(store,runner,task.id,{goal:task.workPlan.goal,revision,steps:[{text:'Check controls',status:'pending'}]});
 call('set_task_goal',{goal:'Updated direction',revision:task.workPlan.revision});assert.equal(task.workPlan.steps.length,1);assert.equal(task.planReviewRequired,true);
 assert.equal(goals.request(runner,task,{method:'item/tool/call',params:{tool:'unrelated'}}),false);
});
test('provider fallback records a suggestion, never adopts prose claims or overwrites a concurrent user edit',()=>{
 const task={},events=[{type:'user',text:'Set a goal'},{type:'assistant',id:'a',text:'```prism-goal\n{"goal":"Deliver responsive controls"}\n```'}];
 assert.equal(plans.suggest(task,events,undefined),true);assert.equal(task.workPlan,undefined);assert.equal(task.goalSuggestion.goal,'Deliver responsive controls');
 assert.equal(plans.suggest({},[{type:'assistant',text:'目标已设置：假的目标'}],undefined),false);
 task.workPlan={goal:'User edit',revision:'fresh',steps:[]};assert.equal(plans.suggest(task,events,'old'),false);assert.equal(task.workPlan.goal,'User edit');
});
test('goal suggestions survive a provider error without becoming saved goals',async()=>{
 const store=new TaskStore(path.join(root,'goal-failure')),task=store.create({title:'Suggestion',cwd:root}),runner=new Runner(store);
 runner.codex=async function(t){this.event(t.id,'assistant',{text:'```prism-goal\n{"goal":"Finish input validation"}\n```'});this.state(t,'failed');};
 await runner.run(task.id,'Propose a goal');const saved=store.get(task.id);assert.equal(saved.goalSuggestion.goal,'Finish input validation');assert.equal(saved.workPlan,undefined);
});
test('quota exhaustion persists as a stop reason, but ordinary failures do not',async()=>{
 const store=new TaskStore(path.join(root,'quota-goal')),task=store.create({title:'Quota',cwd:root}),runner=new Runner(store);task.autoSwitch=false;store.save(task);
 runner.codex=async function(t){this.active.quotaExhausted=true;this.state(t,'failed');};await runner.run(task.id,'Work');assert.equal(store.get(task.id).stopReason,'quota_exhausted');
 runner.codex=async function(){throw Error('Network disconnected');};await runner.run(task.id,'Retry');assert.equal(store.get(task.id).stopReason,undefined);
});
