import React,{useState} from 'react';
import {Pencil,Plus,X,Check} from 'lucide-react';
import {tr} from './i18n.js';
export default function TaskPlan({task,busy,onSave,onAction,initialEditing=false,onSaved}){
 const [editing,setEditing]=useState(initialEditing),[draft,setDraft]=useState(()=>initialEditing?{...structuredClone(task.workPlan||{goal:'',steps:[]}),...(task.goalSuggestion&&!task.workPlan?.goal?{goal:task.goalSuggestion.goal}:{})}:null),[saving,setSaving]=useState(false),[error,setError]=useState(''),[planAfterSave,setPlanAfterSave]=useState(false);
 const plan=task.workPlan||{goal:'',steps:[]};
 const paused=task.goalLifecycle?.status==='paused';
 const action=async(fn)=>{setError('');setSaving(true);try{await fn();}catch(e){setError(tr(e.message.replace(/^Error invoking remote method '[^']+': Error: /,'')));}finally{setSaving(false);}};
 const edit=(startPlan=false)=>{setDraft(structuredClone(plan));setPlanAfterSave(startPlan);setError('');setEditing(true);};
 return <section className="task-plan">
 {!editing&&<div className="plan-heading"><h2>{tr('目标')}</h2><button title={tr('编辑目标与计划')} aria-label={tr('编辑目标与计划')} onClick={()=>edit()} disabled={saving}><Pencil size={14}/>{tr(plan.goal?'修改目标':'设置目标')}</button></div>}
 {editing?<div className="plan-editor"><label>{tr('目标')}<textarea autoFocus aria-label={tr('目标')} maxLength={4000} value={draft.goal} onChange={e=>setDraft({...draft,goal:e.target.value})}/></label>
 {draft.steps.map((step,i)=><div className="plan-edit-step" key={i}><input aria-label={`${tr('计划步骤')} ${i+1}`} maxLength={1000} value={step.text} onChange={e=>setDraft({...draft,steps:draft.steps.map((s,n)=>n===i?{...s,text:e.target.value}:s)})}/><button aria-label={`${tr('删除步骤')} ${i+1}`} onClick={()=>setDraft({...draft,steps:draft.steps.filter((_,n)=>n!==i)})}><X size={14}/></button></div>)}
 <button disabled={draft.steps.length>=60} onClick={()=>setDraft({...draft,steps:[...draft.steps,{text:'',status:'pending'}]})}><Plus size={14}/>{tr('添加步骤')}</button>
 <div className="plan-actions"><button disabled={saving||!draft.goal.trim()||draft.steps.some(s=>!s.text.trim())} onClick={()=>action(async()=>{const updated=await onSave(draft);setDraft(structuredClone(updated.workPlan));if(planAfterSave&&!busy&&!paused)await onAction('draft',updated.workPlan.revision);setEditing(false);onSaved?.();})}>{tr(planAfterSave&&!busy&&!paused?'保存并制订计划':'保存')}</button><button disabled={saving} onClick={()=>setEditing(false)}>{tr('取消')}</button></div></div>:<>
 <p className="plan-goal">{plan.goal||tr('尚未设置目标')}</p>
 {task.goalSuggestion&&<div className="goal-suggestion"><small>{tr('建议目标，尚未保存')}</small><p>{task.goalSuggestion.goal}</p><button onClick={()=>{edit();setDraft({...structuredClone(plan),goal:task.goalSuggestion.goal});}}>{tr('采用或修改建议')}</button></div>}
 <details className="plan-details" open><summary>{tr('计划步骤')}{!!plan.steps.length&&` · ${plan.steps.filter(s=>s.status==='completed').length} / ${plan.steps.length}`}</summary>
 <ol>{plan.steps.map((s,i)=><li key={i}><select aria-label={`${tr('步骤状态')} ${i+1}`} value={s.status} disabled={saving} onChange={e=>action(()=>onSave({...plan,steps:plan.steps.map((v,n)=>n===i?{...v,status:e.target.value}:v)}))}>{['pending','in_progress','completed'].map((v,n)=><option key={v} value={v}>{tr(['未开始','进行中','已完成'][n])}</option>)}</select><span>{s.text}</span></li>)}</ol>
 {!!plan.steps.length&&<small>{plan.steps.filter(s=>s.status==='completed').length} / {plan.steps.length} {tr('已完成')}</small>}
 <div className="plan-actions"><button className="outline" disabled={saving||paused||busy&&!!plan.goal.trim()} onClick={()=>plan.goal.trim()?action(()=>onAction('draft')):edit(true)}>{tr('先制订计划')}</button><button className="outline" disabled={busy||paused||saving||!plan.steps.length} onClick={()=>action(()=>onAction('execute'))}><Check size={14}/>{tr('确认计划并执行')}</button></div>
 {paused&&<small>{tr('目标已暂停，请先继续目标。')}</small>}
 {busy?<small>{tr('请等待当前执行结束。')}</small>:!plan.steps.length&&<small>{tr('先制订或添加计划步骤，再确认执行。')}</small>}
 {task.planReviewRequired&&<small>{tr('请核对计划并确认后执行')}</small>}
 </details>
 </>}{error&&<p role="alert">{error}</p>}
 </section>;
}
