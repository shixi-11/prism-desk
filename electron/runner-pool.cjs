const {EventEmitter}=require('node:events'),path=require('node:path'),fs=require('node:fs');
const {Runner}=require('./runner.cjs');
const events=['event','delta','state','idle','approval','quota','approval-reset','reasoning','activity','steer-ready'];
function canonical(dir){try{dir=fs.realpathSync.native(dir);}catch{}return path.resolve(dir).toLowerCase();}
function overlaps(a,b){const rel=path.relative(canonical(a),canonical(b));return !rel||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));}
function conflicts(a,b){
 if((a.execution?.mode||a.mode)==='read-only'&&(b.execution?.mode||b.mode)==='read-only')return false;
 return [a.cwd,...(a.linkedProjects||[])].some(x=>[b.cwd,...(b.linkedProjects||[])].some(y=>overlaps(x,y)||overlaps(y,x)));
}
class RunnerPool extends EventEmitter{
 constructor(store,factory=store=>new Runner(store)){super();this.store=store;this.factory=factory;this.runners=new Map();}
 forTask(id){if(!this.runners.has(id)){const runner=this.factory(this.store);for(const type of events)runner.on(type,value=>this.emit(type,value));this.runners.set(id,runner);}return this.runners.get(id);}
 get active(){return this.activeRuns()[0]||null;}
 activeRuns(){return [...this.runners.values()].map(r=>r.active).filter(Boolean);}
 activeFor(id){return this.runners.get(id)?.active||null;}
 blocker(task){return this.activeRuns().find(a=>a.task.id===task.id||conflicts(task,a.task));}
 canRun(task){return !this.blocker(task);}
 assertIdle(task){this.forTask(task.id).assertIdle(task);if(!this.canRun(task))throw Error('同一工作目录仍有任务执行，请等待完成。');}
 run(id,...args){const task=this.store.get(id);this.assertIdle(task);return this.forTask(id).run(id,...args);}
 steer(id,...args){return this.forTask(id).steer(id,...args);}
 switch(id,...args){return this.forTask(id).switch(id,...args);}
 stopAndContinue(id,...args){return this.forTask(id).stopAndContinue(id,...args);}
 event(id,...args){return this.forTask(id).event(id,...args);}
 guidanceReason(id){const task=this.store.get(id);if(!this.activeFor(id)&&this.blocker(task))return '消息已排队，等待同一工作目录的任务结束';return this.forTask(id).guidanceReason(id);}
 stop(id){if(typeof id!=='string')throw Error('请选择要停止的任务。');return this.forTask(id).stop();}
 approve(requestId,decision,taskId){if(typeof taskId!=='string')throw Error('请选择对应任务的审批。');return this.forTask(taskId).approve(requestId,decision);}
 async stopAll(){await Promise.all(this.activeRuns().map(async active=>{
  const runner=this.forTask(active.task.id);let done,timer;
  const idle=new Promise((resolve,reject)=>{done=()=>{clearTimeout(timer);resolve();};runner.once('idle',done);timer=setTimeout(()=>{runner.off('idle',done);reject(Error('任务尚未停止，请稍后再退出'));},30000);});idle.catch(()=>{});
  try{delete active.requestedHandoff;await runner.stop();await idle;}finally{clearTimeout(timer);runner.off('idle',done);}
 }));}
}
module.exports={RunnerPool,conflicts};
