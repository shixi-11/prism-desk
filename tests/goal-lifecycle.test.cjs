require('./helpers/config-fixture.cjs');
const {root}=require('./helpers/config-fixture.cjs'),{test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const life=require('../electron/goal-lifecycle.cjs'),actions=require('../electron/goal-actions.cjs'),plans=require('../electron/task-plan.cjs'),{TaskStore}=require('../electron/core.cjs'),{Runner}=require('../electron/runner.cjs'),{MessageQueue}=require('../electron/message-queue.cjs');
test('goal timer accumulates execution only and excludes idle, paused and offline time',()=>{
 const t={workPlan:{goal:'Deliver'},updated:new Date(12000).toISOString()};
 life.execution(t,'running',1000);life.execution(t,'running',2000);life.execution(t,'idle',4000);assert.equal(t.goalLifecycle.elapsedMs,3000);
 life.execution(t,'running',7000);life.pause(t,9000);life.execution(t,'running',10000);assert.equal(t.goalLifecycle.elapsedMs,5000);assert.equal(t.goalLifecycle.runningSince,null);
 life.resume(t);life.execution(t,'running',11000);life.recover(t);assert.equal(t.goalLifecycle.elapsedMs,6000);assert.equal(t.goalLifecycle.status,'paused');
});
function fixture(){const store=new TaskStore(path.join(root,'goal-actions')),task=store.create({title:'Lifecycle',cwd:root}),runner=new Runner(store),queue=new MessageQueue(store,runner,path.join(store.dir(task.id),'queue.json'));plans.save(store,runner,task.id,{goal:'Ship controls',steps:[]});return {store,task:store.get(task.id),runner,queue};}
test('pausing blocks queued work across restart; continuing dispatches it once',async()=>{
 const {store,task,runner,queue}=fixture();await actions.act(store,runner,queue,task.id,'pause',task.workPlan.revision);
 let calls=0;runner.codex=async function(t){calls++;this.state(t,'idle');};queue.enqueue(task.id,'Continue from the saved checkpoint');await queue.pump();assert.equal(calls,0);assert.equal(queue.items[0].status,'waiting');
 const restarted=new MessageQueue(store,runner,queue.file);await restarted.pump();assert.equal(calls,0);
 await actions.act(store,runner,restarted,task.id,'resume',task.workPlan.revision);for(let i=0;restarted.running&&i<40;i++)await new Promise(r=>setTimeout(r,5));assert.equal(calls,1);assert.equal(restarted.items.length,0);
});
test('deleting a goal waits for old execution exit and holds future messages without deleting records',async()=>{
 const {store,task,runner,queue}=fixture();runner.active={task,profile:{id:task.profile},started:true};runner.state(task,'running');queue.items=[{id:'pending',taskId:task.id,status:'waiting',text:'Later'}];queue.save();
 let release;runner.stop=async()=>{runner.state(task,'stopping');await new Promise(r=>release=r);runner.state(task,'paused');runner.active=null;runner.emit('idle',task);};
 const deletion=actions.act(store,runner,queue,task.id,'delete',task.workPlan.revision);await new Promise(r=>setTimeout(r,0));assert.equal(store.get(task.id).workPlan.goal,'Ship controls');release();await deletion;
 assert.equal(store.get(task.id).workPlan,undefined);assert.equal(queue.items[0].status,'held');assert.ok(store.get(task.id).cwd);assert.equal(store.get(task.id).title,'Lifecycle');
});
test('a failed stop does not claim the goal paused, and stale actions cannot alter a new goal',async()=>{
 const {store,task,runner,queue}=fixture();runner.active={task,requestedHandoff:'another-account'};runner.state(task,'running');runner.stop=async()=>{throw Error('Cannot stop');};await assert.rejects(actions.act(store,runner,queue,task.id,'pause',task.workPlan.revision),/Cannot stop/);assert.equal(task.goalLifecycle.status,'active');assert.equal(runner.active.requestedHandoff,'another-account');
 const stale=task.workPlan.revision;plans.save(store,runner,task.id,{goal:'New goal',steps:[],revision:stale});await assert.rejects(actions.act(store,runner,queue,task.id,'delete',stale),/目标已更新/);assert.equal(task.workPlan.goal,'New goal');
});
test('resuming a paused reviewed plan leaves execution waiting for confirmation',async()=>{
 const {store,task,runner,queue}=fixture();task.planReviewRequired=true;life.pause(task);store.save(task);let calls=0;runner.codex=async()=>calls++;
 await actions.act(store,runner,queue,task.id,'resume',task.workPlan.revision);assert.equal(calls,0);assert.equal(store.get(task.id).planReviewRequired,true);assert.equal(store.get(task.id).goalLifecycle.status,'active');
});
test('a paused task can resume into the queue while another task continues',async()=>{
 const {store,task,runner,queue}=fixture(),other=store.create({title:'Other',cwd:root});life.pause(task);store.save(task);runner.active={task:other};let count=0;runner.codex=async function(t){count++;this.state(t,'idle');};
 await actions.act(store,runner,queue,task.id,'resume',task.workPlan.revision);assert.equal(count,0);assert.equal(queue.items[0].taskId,task.id);assert.equal(store.get(task.id).goalLifecycle.status,'active');assert.equal(runner.active.task.id,other.id);
 runner.active=null;await queue.pump();assert.equal(count,1);
});
