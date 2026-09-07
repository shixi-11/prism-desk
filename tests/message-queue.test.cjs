require('./helpers/config-fixture.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {TaskStore}=require('../electron/core.cjs'),{Runner}=require('../electron/runner.cjs'),{MessageQueue}=require('../electron/message-queue.cjs');
const pause=()=>new Promise(r=>setTimeout(r,10));
test('a thrown send failure holds subsequent messages for that task',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prism-queue-fail-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const store={get:()=>({state:'idle'})},runner={run:async()=>{throw Error('offline');}},queue=new MessageQueue(store,runner,path.join(dir,'queue.json'));
 queue.paused=true;queue.enqueue('task','first');queue.enqueue('task','second');queue.paused=false;await queue.pump();assert.deepEqual(queue.items.map(i=>i.status),['held','held']);
});
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await pause();}throw Error('Condition timed out');}
test('messages are serialized, cancellation persists, and images reach execution',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prism-queue-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const store=new TaskStore(path.join(dir,'tasks'));const a=store.create({title:'A',cwd:dir}),b=store.create({title:'B',cwd:dir});const runner=new Runner(store),queue=new MessageQueue(store,runner,path.join(dir,'queue.json'));let release;const calls=[];
 runner.codex=async function(task,profile,text){calls.push({id:task.id,text,images:this.active.images});if(calls.length===1)await new Promise(r=>release=r);this.state(task,'idle');};
 queue.enqueue(a.id,'first');await until(()=>release);
 queue.enqueue(a.id,'second',[{id:'fixture-image',path:'fixture.png'}]);const removed=queue.enqueue(a.id,'cancel me');queue.cancel(removed.id);queue.enqueue(b.id,'third');assert.equal(calls.length,1);release();await until(()=>!queue.running);
 assert.deepEqual(calls.map(c=>c.text),['first','second','third']);assert.equal(calls[1].images[0].path,'fixture.png');assert.equal(queue.items.length,0);assert.equal(JSON.parse(fs.readFileSync(queue.file)).length,0);
});
test('unfinished sends are held after restart and never replayed blindly',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prism-queue-recovery-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'queue.json');fs.writeFileSync(file,JSON.stringify([{id:'old',status:'sending',taskId:'t'}]));const queue=new MessageQueue({}, {},file);assert.equal(queue.items[0].status,'held');
});
test('steering uses the active turn precondition and logs only successful delivery',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prism-steer-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const store=new TaskStore(path.join(dir,'tasks')),task=store.create({title:'A',cwd:dir}),runner=new Runner(store);let received;
 task.sessions[task.profile]='thread';runner.active={task,profile:{id:task.profile,provider:'Codex'},turnId:'turn',images:[],rpc:{call:async(method,args)=>{received={method,args};}}};
 assert.equal(await runner.steer(task.id,'New direction'),true);assert.equal(received.method,'turn/steer');assert.equal(received.args.expectedTurnId,'turn');assert.ok(store.events(task.id).some(e=>e.steered));
 runner.active.rpc.call=async()=>{throw Error('Delivery failed');};await assert.rejects(runner.steer(task.id,'Do not duplicate'));assert.equal(store.events(task.id).filter(e=>e.type==='user').length,1);
});
