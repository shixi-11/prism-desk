import React,{useState} from 'react';
import {ChevronDown,FolderOpen} from 'lucide-react';
import {tr} from './i18n.js';
import {sidebarGroups} from './sidebar-groups.js';
export default function SidebarTasks({tasks,renderTask}){
 const [collapsed,setCollapsed]=useState(()=>{try{return JSON.parse(localStorage.getItem('prism-sidebar-folds')||'{}')||{};}catch{return {};}});
 const toggle=key=>setCollapsed(old=>{const next={...old,[key]:!old[key]};try{localStorage.setItem('prism-sidebar-folds',JSON.stringify(next));}catch{}return next;});
 function section(group,nested=false){const count=group.tasks.length+(group.groups||[]).reduce((n,g)=>n+g.tasks.length,0);return <section className={`sidebar-section${nested?' nested':''}`} key={group.key}>
  <button className="sidebar-section-toggle" aria-expanded={!collapsed[group.key]} title={group.path} onClick={()=>toggle(group.key)}><ChevronDown size={13} className={collapsed[group.key]?'folded':''}/>{group.path&&<FolderOpen size={14}/>}<span>{nested?group.label:tr(group.label)}</span><small>{count}</small></button>
  {!collapsed[group.key]&&<div className="sidebar-section-content">{group.tasks.map(renderTask)}{group.groups?.map(g=>section(g,true))}{!count&&<p className="sidebar-empty">{tr('暂无任务')}</p>}</div>}
 </section>;}
 return sidebarGroups(tasks).map(group=>section(group));
}
