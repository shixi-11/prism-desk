import React,{useEffect,useState} from 'react';
import {Target,Pencil,PauseCircle,PlayCircle,Trash2,Maximize2,Plus} from 'lucide-react';
import TaskPlan from './TaskPlan.jsx';
import {ActivityPanel} from './TaskControls.jsx';
import {tr} from './i18n.js';
function duration(ms){const s=Math.max(0,Math.floor(ms/1000));return s>=3600?`${Math.floor(s/3600)}h ${Math.floor(s%3600/60)}m ${s%60}s`:s>=60?`${Math.floor(s/60)}m ${s%60}s`:`${s}s`;}
export default function GoalBar({task,events,thinking,activity,Modal,onSave,onPlanAction,onGoalAction}){
 const [open,setOpen]=useState(false),[editing,setEditing]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState(''),[now,setNow]=useState(Date.now());
 const life=task.goalLifecycle,goal=task.workPlan?.goal,suggestion=task.goalSuggestion?.goal,paused=life?.status==='paused',busy=['running','stopping'].includes(task.state);
 useEffect(()=>{setNow(Date.now());if(!life?.runningSince||paused)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[life?.runningSince,paused]);
 const elapsed=(life?.elapsedMs||0)+(life?.runningSince&&!paused?Math.max(0,now-life.runningSince):0);
 const status=task.state==='stopping'&&paused?'正在暂停目标':paused?'已暂停的目标':task.relaySource==='quota_exhausted'?'额度已用完，正在接续':task.stopReason==='quota_exhausted'?'额度已用完':!goal?'待采用的目标':task.state==='failed'?'执行遇到问题':task.state==='unknown'?'执行状态待核对':busy?'进行中的目标':'当前目标';
 const show=(edit=false)=>{setEditing(edit);setOpen(true);};
 const act=async(action)=>{setPending(true);setError('');try{await onGoalAction(action,task.workPlan.revision);}catch(e){setError(tr(e.message.replace(/^Error invoking remote method '[^']+': Error: /,'')));}finally{setPending(false);}};
 return <div className="goal-control">
 {goal||suggestion||task.stopReason==='quota_exhausted'||task.relaySource==='quota_exhausted'?<div className="goal-bar" aria-label={tr('任务目标')}>
  <Target size={18}/><button className="goal-label" onClick={()=>show(!goal)} title={goal||suggestion||task.title}><strong>{tr(status)}</strong><span dir="auto">{goal||suggestion||task.title}</span></button>
  {goal&&<><time title={tr('累计执行用时，不含暂停和空闲时间')} aria-label={tr('累计执行用时')}>{duration(elapsed)}</time><button aria-label={tr('修改目标')} title={tr('修改目标')} disabled={pending} onClick={()=>show(true)}><Pencil size={16}/></button><button aria-label={tr('删除目标')} title={tr('删除目标')} disabled={pending||task.state==='unknown'||task.state==='stopping'} onClick={()=>act('delete')}><Trash2 size={16}/></button><button aria-label={tr(paused?'继续目标':'暂停目标')} title={tr(paused?'继续目标':'暂停目标')} disabled={pending||task.state==='unknown'||task.state==='stopping'} onClick={()=>act(paused?'resume':'pause')}>{paused?<PlayCircle size={17}/>:<PauseCircle size={17}/>}</button></>}
  <button aria-label={tr('展开目标与计划')} title={tr('展开目标与计划')} onClick={()=>show()}><Maximize2 size={16}/></button>
 </div>:<button className="goal-add" onClick={()=>show(true)}><Plus size={14}/>{tr('设置目标')}</button>}
 {error&&<p className="goal-error" role="alert">{error}</p>}
 {open&&<Modal title={tr('目标与计划')} onClose={()=>setOpen(false)}><TaskPlan key={editing?'edit':'view'} task={task} busy={busy||task.state==='unknown'} initialEditing={editing} onSave={onSave} onSaved={()=>setOpen(false)} onAction={onPlanAction}/><ActivityPanel task={task} events={events} thinking={thinking} activity={activity}/></Modal>}
 </div>;
}
