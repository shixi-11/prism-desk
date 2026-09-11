const {root}=require('./helpers/config-fixture.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {TaskStore}=require('../electron/core.cjs'),{Runner}=require('../electron/runner.cjs'),{RunnerPool}=require('../electron/runner-pool.cjs'),{MessageQueue}=require('../electron/message-queue.cjs');
const tick=()=>new Promise(r=>setTimeout(r,5));
async function until(fn){for(let i=0;i<200;i++){if(fn())return;await tick();}throw Error('Timed out');}
test('Codex, Claude and Grok conversations start concurrently; stopping one leaves the others running',async()=>{
 const store=new TaskStore(path.join(root,'parallel')),release=new Map(),calls=[];
 const pool=new RunnerPool(store,store=>{const r=new Runner(store);for(const provider of ['codex','claude','grok'])r[provider]=async function(task){calls.push(task.id);await new Promise(resolve=>release.set(task.id,resolve));this.state(task,this.active.cancelRequested?'paused':'idle');};r.stop=async()=>{r.active.cancelRequested=true;release.get(r.active.task.id)();};return r;});
 const q=new MessageQueue(store,pool,path.join(root,'parallel-queue.json'));pool.on('idle',()=>queueMicrotask(()=>q.pump()));
 const tasks=['codex','claude','grok'].map(provider=>store.create({title:provider,profile:provider+'-test-1',mode:'read-only'}));
 for(const task of tasks)q.enqueue(task.id,'Only test');await until(()=>calls.length===3);assert.equal(pool.activeRuns().length,3);assert.equal(q.items.filter(i=>i.status==='sending').length,3);
 await pool.stop(tasks[1].id);await until(()=>!pool.activeFor(tasks[1].id));assert.equal(pool.activeRuns().length,2);assert.ok(pool.activeFor(tasks[0].id));assert.ok(pool.activeFor(tasks[2].id));
 release.get(tasks[0].id)();release.get(tasks[2].id)();await until(()=>!q.running);assert.equal(q.items.length,0);
});
test('overlapping writable workspaces serialize while a different workspace starts immediately',async()=>{
 const store=new TaskStore(path.join(root,'workspace-pool')),cwd=path.join(root,'shared');fs.mkdirSync(cwd);const calls=[],release=new Map();
 const pool=new RunnerPool(store,store=>{const r=new Runner(store);r.codex=async function(task){calls.push(task.id);await new Promise(resolve=>release.set(task.id,resolve));this.state(task,'idle');};return r;});
 const q=new MessageQueue(store,pool,path.join(root,'workspace-queue.json'));pool.on('idle',()=>queueMicrotask(()=>q.pump()));
 const a=store.create({title:'a',cwd,mode:'workspace-write'}),b=store.create({title:'b',cwd,mode:'workspace-write'}),c=store.create({title:'c',mode:'workspace-write'});
 q.enqueue(a.id,'a');q.enqueue(b.id,'b');q.enqueue(c.id,'c');await until(()=>calls.length===2);assert.deepEqual(calls,[a.id,c.id]);release.get(a.id)();await until(()=>calls.includes(b.id));release.get(b.id)();release.get(c.id)();await until(()=>!q.running);assert.equal(q.items.length,0);
});
test('approval and steering route by task, even when request ids match',async()=>{
 const store=new TaskStore(path.join(root,'routing')),pool=new RunnerPool(store),a=store.create({title:'a'}),b=store.create({title:'b'}),calls=[];
 for(const task of [a,b]){const runner=pool.forTask(task.id);runner.approve=async(id,decision)=>calls.push([task.id,id,decision]);runner.steer=async(id,text)=>{calls.push([task.id,text]);return true;};}
 await pool.approve('1','accept',b.id);await pool.steer(a.id,'direction');assert.deepEqual(calls,[[b.id,'1','accept'],[a.id,'direction']]);assert.throws(()=>pool.approve('1','accept'),/审批/);
});
