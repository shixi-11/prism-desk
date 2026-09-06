require('./helpers/config-fixture.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {TaskStore}=require('../electron/core.cjs'),{Runner}=require('../electron/runner.cjs');
test('unsupported interruption leaves the active execution unchanged',async()=>{
 const runner=new Runner({});runner.active={started:true,cancelRequested:false,task:{state:'running'}};
 await assert.rejects(()=>runner.stop(),/不支持/);
 assert.equal(runner.active.cancelRequested,false);assert.equal(runner.active.task.state,'running');
});
test('manual handoff waits for confirmed stop and carries recorded evidence',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-handoff-'));
 try {
  const store=new TaskStore(root),task=store.create({title:'handoff',cwd:root}),runner=new Runner(store);
  let started,release;const ready=new Promise(r=>started=r),stopped=new Promise(r=>release=r);let calls=0;
  runner.codex=async(t,p)=>{calls++;if(calls===1){runner.active.started=true;runner.active.turnId='t';runner.active.rpc={call:async()=>release()};runner.event(t.id,'assistant',{text:'Partial work only'});runner.event(t.id,'tool',{text:'check file',data:{exitCode:0}});started();await stopped;runner.state(t,'paused');}else {assert.equal(p.id,'codex-test-2');runner.state(t,'idle');}};
  const work=runner.run(task.id,'original request');await ready;
  await runner.stopAndContinue(task.id,'codex-test-2');await work;
  assert.equal(calls,2);const handoff=store.events(task.id).find(e=>e.type==='handoff');assert.equal(handoff.progress.request,'original request');assert.equal(handoff.progress.report,'Partial work only');assert.equal(handoff.progress.evidence[0].status,0);
  assert.equal(store.get(task.id).execution,undefined);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('lost stop acknowledgement does not launch the replacement',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-handoff-'));
 try{const store=new TaskStore(root),task=store.create({title:'unknown',cwd:root}),runner=new Runner(store);let calls=0;
 runner.codex=async(t)=>{calls++;runner.active.started=true;runner.active.requestedHandoff='codex-test-2';throw Error('connection lost');};
 await runner.run(task.id,'keep work');assert.equal(calls,1);assert.equal(store.get(task.id).state,'unknown');assert.equal(store.get(task.id).requestedHandoff,null);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
