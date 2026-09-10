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

test('manual queue send delivers once and excludes cancellation or a second click while dispatching',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prism-manual-send-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));let finish,calls=0;const runner={active:{},steer:async()=>{calls++;return new Promise(r=>finish=r);}},queue=new MessageQueue({get:()=>({state:'running'})},runner,path.join(dir,'queue.json'));const item=queue.enqueue('task','send now',[{id:'image'}]);const sending=queue.send(item.id);assert.equal(item.status,'dispatching');assert.throws(()=>queue.cancel(item.id));await assert.rejects(queue.send(item.id));finish(true);assert.deepEqual(await sending,{steered:true});assert.equal(calls,1);assert.equal(queue.items.length,0);
});
test('unavailable steering keeps messages queued; failed steering holds them without replay',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prism-manual-fallback-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const runner={active:{},steer:async()=>false},queue=new MessageQueue({get:()=>({state:'running'})},runner,path.join(dir,'queue.json'));const item=queue.enqueue('task','keep me');assert.deepEqual(await queue.send(item.id),{queued:true});assert.equal(queue.items[0].status,'waiting');runner.steer=async()=>{throw Error('delivery uncertain');};await assert.rejects(queue.send(item.id),/uncertain/);assert.equal(item.status,'held');const restored=new MessageQueue({},runner,queue.file);assert.equal(restored.items[0].text,'keep me');item.status='dispatching';queue.save();assert.equal(new MessageQueue({},runner,queue.file).items[0].status,'held');
});
test('manual send starts an idle message and preserves planning restrictions',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prism-manual-idle-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));let ran=0,steered=0;const runner={active:null,steer:async()=>{steered++;return false;},run:async(id,text,images,options)=>{ran++;assert.equal(options.planning,true);}},queue=new MessageQueue({get:()=>({state:'idle',planReviewRequired:true})},runner,path.join(dir,'queue.json'));queue.paused=true;const item=queue.enqueue('task','plan',[],{planning:true});queue.paused=false;assert.deepEqual(await queue.send(item.id),{queued:false});await until(()=>!queue.running);assert.equal(ran,1);assert.equal(steered,0);assert.equal(queue.items.length,0);
});
