const lifecycle=require('./goal-lifecycle.cjs');
async function stopTask(runner,id){
 if(runner.active?.task.id!==id)return;
 let done,timer;
 const idle=new Promise((resolve,reject)=>{done=task=>{if(task.id===id){clearTimeout(timer);runner.off('idle',done);resolve();}};runner.on('idle',done);timer=setTimeout(()=>{runner.off('idle',done);reject(Error('任务尚未停止，请稍后再试。'));},30000);});
 idle.catch(()=>{});
 try{delete runner.active.requestedHandoff;await runner.stop();await idle;}finally{clearTimeout(timer);runner.off('idle',done);}
}
async function act(store,runner,queue,id,action,revision){
 let task=runner.active?.task.id===id?runner.active.task:store.get(id);
 if(!task.workPlan?.goal)throw Error('尚未设置目标');
 if(task.workPlan.revision!==revision)throw Error('目标已更新，请核对后重试。');
 if(task.state==='unknown')throw Error('请先核对工作目录。');
 if(!['pause','resume','delete'].includes(action))throw Error('目标操作无效');
 if(action==='resume'){
  if(['running','stopping','unknown'].includes(task.state)||runner.active?.task.id===id)throw Error('请等待当前执行结束。');
  lifecycle.resume(task);delete task.stopReason;store.save(task);store.context(task);runner.emit('state',task);
  if(!task.planReviewRequired){
   if(!queue.items.some(i=>i.taskId===id&&i.status==='waiting'))queue.enqueue(id,'继续已保存目标中尚未完成的工作。先读取持久工作记录并核对现有成果，避免重复已完成的操作。');
   else queue.pump();
  }
  return store.get(id);
 }
 const prior=structuredClone(task.goalLifecycle||null);
 const previousRun=runner.active?.task.id===id?runner.active:null,previousHandoff=previousRun?.requestedHandoff;
 lifecycle.pause(task);store.save(task);runner.emit('state',task);
 try{await stopTask(runner,id);}catch(e){task=runner.active?.task.id===id?runner.active.task:store.get(id);if(runner.active===previousRun&&previousRun&&!previousRun.cancelRequested){previousRun.requestedHandoff=previousHandoff;if(task.workPlan?.revision===revision){task.goalLifecycle=prior;store.save(task);runner.emit('state',task);}}throw e;}
 task=store.get(id);
 // A different window may have edited the goal while the old turn stopped.
 if(task.workPlan?.revision!==revision)throw Error('目标已更新，请核对后重试。');
 if(action==='delete'){
  lifecycle.remove(task);
  for(const item of queue.items.filter(i=>i.taskId===id&&i.status==='waiting')){item.status='held';item.error='目标已删除，排队消息请核对后重试。';}
  queue.save();
 }
 store.save(task);store.context(task);runner.emit('state',task);return task;
}
module.exports={act,stopTask};
