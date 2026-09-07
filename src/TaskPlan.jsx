import React,{useState} from 'react';
import {Pencil,Plus,X,Check} from 'lucide-react';
import {tr} from './i18n.js';
export default function TaskPlan({task,busy,onSave,onAction}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(null),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const plan=task.workPlan||{goal:'',steps:[]};
 const action=async(fn)=>{setError('');setSaving(true);try{await fn();}catch(e){setError(e.message);}finally{setSaving(false);}};
 const edit=()=>{setDraft(structuredClone(plan));setEditing(true);};
 return <section className="task-plan">
 <div className="plan-heading"><h2>{tr('目标与计划')}</h2><button title={tr('编辑目标与计划')} aria-label={tr('编辑目标与计划')} onClick={edit} disabled={saving}><Pencil size={16}/></button></div>
 {editing?<div className="plan-editor"><label>{tr('目标')}<textarea aria-label={tr('目标')} maxLength={4000} value={draft.goal} onChange={e=>setDraft({...draft,goal:e.target.value})}/></label>
 {draft.steps.map((step,i)=><div className="plan-edit-step" key={i}><input aria-label={`${tr('计划步骤')} ${i+1}`} maxLength={1000} value={step.text} onChange={e=>setDraft({...draft,steps:draft.steps.map((s,n)=>n===i?{...s,text:e.target.value}:s)})}/><button aria-label={`${tr('删除步骤')} ${i+1}`} onClick={()=>setDraft({...draft,steps:draft.steps.filter((_,n)=>n!==i)})}><X size={14}/></button></div>)}
 <button disabled={draft.steps.length>=60} onClick={()=>setDraft({...draft,steps:[...draft.steps,{text:'',status:'pending'}]})}><Plus size={14}/>{tr('添加步骤')}</button>
 <div className="plan-actions"><button disabled={saving||draft.steps.some(s=>!s.text.trim())} onClick={()=>action(async()=>{await onSave(draft);setEditing(false);})}>{tr('保存')}</button><button disabled={saving} onClick={()=>setEditing(false)}>{tr('取消')}</button></div></div>:<>
 <p className="plan-goal">{plan.goal||tr('尚未设置目标')}</p>
 <ol>{plan.steps.map((s,i)=><li key={i}><select aria-label={`${tr('步骤状态')} ${i+1}`} value={s.status} disabled={saving} onChange={e=>action(()=>onSave({...plan,steps:plan.steps.map((v,n)=>n===i?{...v,status:e.target.value}:v)}))}>{['pending','in_progress','completed'].map((v,n)=><option key={v} value={v}>{tr(['未开始','进行中','已完成'][n])}</option>)}</select><span>{s.text}</span></li>)}</ol>
 {!!plan.steps.length&&<small>{plan.steps.filter(s=>s.status==='completed').length} / {plan.steps.length} {tr('已完成')}</small>}
 <div className="plan-actions"><button className="outline" disabled={busy||saving||!plan.goal.trim()} onClick={()=>action(()=>onAction('draft'))}>{tr('先制订计划')}</button><button className="outline" disabled={busy||saving||!plan.steps.length} onClick={()=>action(()=>onAction('execute'))}><Check size={14}/>{tr('确认计划并执行')}</button></div>
 {task.planReviewRequired&&<small>{tr('请核对计划并确认后执行')}</small>}
 </>}{error&&<p role="alert">{error}</p>}
 </section>;
}
