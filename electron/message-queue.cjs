const {EventEmitter}=require('node:events'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
class MessageQueue extends EventEmitter{
 constructor(store,runner,file){super();this.store=store;this.runner=runner;this.file=file;this.running=false;this.paused=false;this.jobs=new Set();try{this.items=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(this.items))this.items=[];}catch{this.items=[];}for(const item of this.items)if(['sending','dispatching'].includes(item.status)){item.status='held';item.error='上次发送未确认，请核对记录后重试';}}
 save(){fs.mkdirSync(path.dirname(this.file),{recursive:true});const tmp=this.file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(this.items));fs.renameSync(tmp,this.file);this.emit('change',this.items);}
 enqueue(taskId,text,images=[],options={}){const task=this.store.get(taskId);if(task.state==='unknown')throw Error('请先核对工作目录。');if(!text.trim()||text.length>60000)throw Error('请输入 1–60000 字的指令。');if(this.items.length>=100)throw Error('待发送消息过多');const item={id:crypto.randomUUID(),taskId,text,images,options,at:new Date().toISOString(),status:'waiting'};this.items.push(item);this.save();if(options.steer)this.flushGuidance();this.pump();return item;}
 cancel(id){if(['sending','dispatching'].includes(this.items.find(i=>i.id===id)?.status))throw Error('消息已开始执行，请使用停止按钮');this.items=this.items.filter(i=>i.id!==id);this.save();}
 retry(id){const item=this.items.find(i=>i.id===id&&i.status==='held');if(item){item.status='waiting';delete item.error;this.save();this.pump();}}
 async send(id){
  const item=this.items.find(i=>i.id===id);if(!item||['sending','dispatching'].includes(item.status))throw Error('消息已开始发送');
  const task=this.store.get(item.taskId);if(task.goalLifecycle?.status==='paused'||task.state==='unknown')throw Error('请先继续目标或核对任务状态');
  item.options={...item.options,steer:true};item.status='dispatching';delete item.error;this.save();
  try{
   if((!item.options?.planning||this.taskRunner(item.taskId).active?.planning)&&(!task.planReviewRequired||this.runner.active?.planning)&&await this.runner.steer(item.taskId,item.text,item.images)){
    this.items=this.items.filter(i=>i.id!==id);this.save();return {steered:true};
   }
   item.status='waiting';this.items=[item,...this.items.filter(i=>i.id!==id)];this.save();
   const queued=this.isBusy(item.taskId)||this.paused;this.pump();return {queued,...(queued&&this.runner.guidanceReason?{reason:this.runner.guidanceReason(item.taskId)}:{})};
  }catch(error){item.status='held';item.error=error.message;this.save();throw error;}
 }
 // A live-send request survives a temporary gap while Codex starts its turn.
 // Only positively acknowledged messages leave the queue; uncertain sends stay held.
 taskRunner(id){return this.runner.forTask?this.runner.forTask(id):this.runner;}
 isBusy(id){return this.runner.canRun?!this.runner.canRun(this.store.get(id))||this.jobs.has(id):!!this.runner.active||this.running;}
 async flushGuidance(){
  if(this.paused)return;if(this.guiding){this.guidancePending=true;return;}this.guiding=true;
  try{
   const activeRuns=this.runner.activeRuns?this.runner.activeRuns():[this.runner.active].filter(Boolean);
   for(const active of activeRuns){
    while(!this.paused&&this.taskRunner(active.task?.id).active===active){
     const item=this.items.find(i=>i.taskId===active.task?.id&&i.status==='waiting'&&i.options?.steer);if(!item)break;
     const task=this.store.get(item.taskId);if(task.goalLifecycle?.status==='paused'||task.state==='unknown'||active.cancelRequested)break;
     const result=await this.send(item.id);if(!result.steered)break;
    }
   }
  }catch(error){this.emit('failure',error);}finally{this.guiding=false;if(this.guidancePending){this.guidancePending=false;queueMicrotask(()=>this.flushGuidance());}}
 }
 async runItem(item){
  try{await this.runner.run(item.taskId,item.text,item.images,item.options||{});this.items=this.items.filter(i=>i.id!==item.id);const task=this.store.get(item.taskId);
   if(task.goalLifecycle?.status!=='paused'&&['failed','unknown','paused'].includes(task.state))for(const queued of this.items.filter(i=>i.taskId===item.taskId)){queued.status='held';queued.error='上一轮未正常完成，请确认后重试';}
  }catch(e){for(const pending of this.items.filter(i=>i.taskId===item.taskId)){pending.status='held';pending.error=e.message;}}
  finally{this.jobs.delete(item.taskId);this.running=this.jobs.size>0;this.save();queueMicrotask(()=>this.pump());}
 }
 pumpParallel(){
  if(this.paused)return;
  for(const item of this.items){
   if(item.status!=='waiting'||this.jobs.has(item.taskId))continue;
   let task;try{task=this.store.get(item.taskId);}catch{item.status='held';item.error='任务不存在';this.save();continue;}
   if(task.goalLifecycle?.status==='paused'||['unknown','running','stopping'].includes(task.state)||!this.runner.canRun(task))continue;
   this.jobs.add(item.taskId);this.running=true;item.status='sending';this.save();this.runItem(item).catch(e=>this.emit('failure',e));
  }
 }
 // Goal pauses keep waiting messages intact. Goal deletion labels them only
 // after the old run exits; treating a paused goal as failure would race it.
 async pump(){if(this.runner.canRun)return this.pumpParallel();if(this.running||this.runner.active||this.paused)return;this.running=true;try{while(!this.runner.active&&!this.paused){const index=this.items.findIndex(i=>{try{const task=this.store.get(i.taskId);return i.status==='waiting'&&task.goalLifecycle?.status!=='paused'&&!['unknown','running','stopping'].includes(task.state);}catch{i.status='held';i.error='任务不存在';return false;}});if(index<0)break;const item=this.items[index];item.status='sending';this.save();try{await this.runner.run(item.taskId,item.text,item.images,item.options||{});this.items=this.items.filter(i=>i.id!==item.id);const task=this.store.get(item.taskId);if(task.goalLifecycle?.status!=='paused'&&['failed','unknown','paused'].includes(task.state)){for(const queued of this.items.filter(i=>i.taskId===item.taskId)){queued.status='held';queued.error='上一轮未正常完成，请确认后重试';}}}catch(e){for(const pending of this.items.filter(i=>i.taskId===item.taskId)){pending.status='held';pending.error=e.message;}}this.save();}}catch(e){this.emit('failure',e);}finally{this.running=false;}}
}
module.exports={MessageQueue};
