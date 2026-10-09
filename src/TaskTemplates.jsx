import React,{useEffect,useState} from 'react';
import {Plus,Pencil,Trash2} from 'lucide-react';
import {tr} from './i18n.js';
import './task-templates.css';

export default function TaskTemplates({Modal,onClose,draft,onInsert}){
 const [items,setItems]=useState([]),[query,setQuery]=useState(''),[editor,setEditor]=useState(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[removing,setRemoving]=useState(null);
 useEffect(()=>{let active=true;window.prism.listTemplates().then(value=>{if(active)setItems(value);}).catch(()=>{if(active)setError(tr('加载模板失败'));}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[]);
 async function save(insert=false){
  if(busy||!editor?.title.trim()||!editor?.body.trim())return;
  setBusy(true);setError('');
  try{const saved=await window.prism.saveTemplate({...editor,title:editor.title.trim()});setItems(old=>editor.id?old.map(item=>item.id===saved.id?saved:item):[...old,saved]);setEditor(null);if(insert)onInsert(saved);}
  catch{setError(tr('保存模板失败'));}finally{setBusy(false);}
 }
 async function remove(){setBusy(true);setError('');try{await window.prism.removeTemplate(removing);setItems(old=>old.filter(item=>item.id!==removing));setRemoving(null);}catch{setError(tr('删除模板失败'));}finally{setBusy(false);}}
 return <Modal title={tr('任务模板')} onClose={onClose}>
  <div className="task-templates" aria-busy={busy}>
   {error&&<p role="alert" className="error">{error}</p>}
   {editor?<form onSubmit={e=>{e.preventDefault();save();}}>
    <button type="button" disabled={busy} onClick={()=>setEditor(null)}>{tr('返回模板列表')}</button>
    <label>{tr('模板名称')}<input aria-label={tr('模板名称')} autoFocus value={editor.title} maxLength={100} required onChange={e=>setEditor({...editor,title:e.target.value})}/></label>
    <label>{tr('模板内容')}<textarea aria-label={tr('模板内容')} dir="auto" value={editor.body} maxLength={100000} required onChange={e=>setEditor({...editor,body:e.target.value})}/></label>
    <p className="muted">{tr('仅保存文字，不包含附件')}</p>
    <div className="template-actions"><button type="submit" disabled={busy||!editor.title.trim()||!editor.body.trim()}>{tr('保存')}</button><button type="button" disabled={busy||!editor.title.trim()||!editor.body.trim()} onClick={()=>save(true)}>{tr('保存并插入')}</button></div>
   </form>:<>
    <div className="template-actions"><button disabled={busy} onClick={()=>{setRemoving(null);setEditor({title:'',body:''});}}><Plus size={16}/>{tr('新建模板')}</button><button disabled={busy||!draft.trim()||draft.length>100000} onClick={()=>{setRemoving(null);setEditor({title:draft.split(/\r?\n/).find(line=>line.trim())?.slice(0,100)||'',body:draft});}}>{tr('保存当前草稿')}</button></div>
    <input aria-label={tr('搜索模板')} placeholder={tr('搜索模板')} value={query} onChange={e=>setQuery(e.target.value)}/>
    <div className="template-list">{items.filter(item=>(item.title+'\n'+item.body).toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(item=><article key={item.id} className="template-item">
     <h3 dir="auto">{item.title}</h3><p dir="auto">{item.body.slice(0,600)}{item.body.length>600?'…':''}</p>
     {removing===item.id?<div className="template-actions"><span>{tr('确认删除此模板？')}</span><button disabled={busy} onClick={remove}>{tr('删除')}</button><button disabled={busy} onClick={()=>setRemoving(null)}>{tr('取消')}</button></div>:<div className="template-actions"><button disabled={busy} onClick={()=>onInsert(item)}>{tr('插入当前任务')}</button><button aria-label={tr('编辑')+' '+item.title} disabled={busy} onClick={()=>{setRemoving(null);setEditor({id:item.id,title:item.title,body:item.body});}}><Pencil size={15}/>{tr('编辑')}</button><button aria-label={tr('删除')+' '+item.title} disabled={busy} onClick={()=>setRemoving(item.id)}><Trash2 size={15}/>{tr('删除')}</button></div>}
    </article>)}{!busy&&!items.length&&<p className="muted">{tr('暂无模板')}</p>}</div>
   </>}
  </div>
 </Modal>;
}
