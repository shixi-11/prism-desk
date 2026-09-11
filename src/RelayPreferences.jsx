import React,{useEffect,useState} from 'react';
import {GripVertical,ArrowUp,ArrowDown,Settings2} from 'lucide-react';
import {tr} from './i18n.js';
export default function RelayPreferences({task,profiles,onSaveOrder,onModelSettings,Modal,ModelControls}){
 const ids=[...(task.relayOrder||[]).filter(id=>profiles.some(p=>p.id===id)),...profiles.filter(p=>!(task.relayOrder||[]).includes(p.id)).map(p=>p.id)];
 const [open,setOpen]=useState(false),[order,setOrder]=useState(ids),[dragging,setDragging]=useState(null),[over,setOver]=useState(null),[editing,setEditing]=useState(null),[saving,setSaving]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 useEffect(()=>setOrder(ids),[ids.join('|')]);
 const describe=p=>{const c=task.modelSettings?.[p.id];return `${c?.model||(p.provider==='Codex'?'gpt-6-astra':p.model)} · ${c?.effort||(p.provider==='Codex'?'low':p.provider==='Gemini'?'auto':'high')}`;};
 const skipReason=p=>p.disabled?'已停用':(task.execution?.mode||task.mode)!=='read-only'&&!(p.write&&['Codex','Claude','Grok'].includes(p.provider))?'当前任务需要写入，此账号会被跳过':'';
 const move=async(from,to)=>{
  if(saving||from===to||!order.includes(from)||!order.includes(to))return;
  const before=order,next=order.filter(id=>id!==from);next.splice(order.indexOf(to),0,from);
  setOrder(next);setSaving(true);setNotice('');setError('');
  try{await onSaveOrder(next);setNotice(tr('顺序已保存'));}catch(e){setOrder(before);setError(e.message);}finally{setSaving(false);setDragging(null);setOver(null);}
 };
 return <section className="relay-preferences">
  <div className="plan-heading"><h2>{tr('自动接续偏好')}</h2><button aria-label={tr('调整接续顺序')} title={tr('调整接续顺序')} onClick={()=>setOpen(true)}><Settings2 size={17}/></button></div>
  <p>{tr('按顺序寻找账号，使用各账号已保存的模型与思考等级。')}</p>
  <ol className="relay-summary">{ids.slice(0,3).map(id=>{const p=profiles.find(p=>p.id===id);return <li key={id}>{p.provider} / {tr(p.name)}{skipReason(p)&&<small>{tr(skipReason(p))}</small>}</li>;})}</ol>
  <button className="outline" onClick={()=>setOpen(true)}>{tr('调整顺序与模型')}</button>
  {open&&<Modal title={tr('自动接续偏好')} onClose={()=>setOpen(false)}>
   <p>{tr('按住账号行拖动排序；点击设置可修改模型和思考等级。')}</p>
   <small>{tr('设置自动保存，仅用于当前任务。')}</small>
   <ol className="relay-order" aria-label={tr('接续顺序')}>
    {order.map((id,index)=>{const p=profiles.find(p=>p.id===id);return <li key={id} data-account-id={id} className={`relay-order-row ${dragging===id?'dragging':''} ${over===id?'drag-over':''}`} draggable={!saving&&editing!==id}
     onDragStart={e=>{setDragging(id);e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move';}}
     onDragOver={e=>{if(dragging&&dragging!==id){e.preventDefault();e.dataTransfer.dropEffect='move';setOver(id);}}}
     onDragLeave={()=>setOver(v=>v===id?null:v)}
     onDrop={e=>{e.preventDefault();move(dragging,id);}} onDragEnd={()=>{setDragging(null);setOver(null);}}>
     <span className="relay-grip" aria-hidden="true"><GripVertical size={18}/><small>{index+1}</small></span>
     <div className="relay-account"><strong>{p.provider} / {tr(p.name)}</strong><small dir="ltr">{describe(p)}</small>{skipReason(p)&&<small>{tr(skipReason(p))}</small>}</div>
     <div className="relay-row-actions"><button title={tr('设置模型与思考等级')} aria-label={tr('设置模型与思考等级')+' '+p.name} onClick={()=>setEditing(editing===id?null:id)}><Settings2 size={17}/></button><button disabled={saving||index===0} title={tr('上移')} aria-label={tr('上移')+' '+p.name} onClick={()=>move(id,order[index-1])}><ArrowUp size={17}/></button><button disabled={saving||index===order.length-1} title={tr('下移')} aria-label={tr('下移')+' '+p.name} onClick={()=>move(id,order[index+1])}><ArrowDown size={17}/></button></div>
     {editing===id&&<div className="relay-model-editor"><ModelControls task={task} profile={p} disabled={!!p.disabled} onSave={async value=>{await onModelSettings(value,id);setNotice(tr('模型与思考等级已保存'));}}/></div>}
    </li>;})}
   </ol>
   <p role="status" className="relay-save-status">{saving?tr('正在保存…'):notice}</p>{error&&<p role="alert">{error}</p>}
  </Modal>}
 </section>;
}
