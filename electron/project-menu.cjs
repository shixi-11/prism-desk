const {key}=require('./project-access.cjs');
function projectTasks(tasks,cwd){return tasks.filter(t=>key(t.cwd)===key(cwd));}
function projectMenuTemplate(cwd,settings,tasks,tr,choose,{busy=false,git=false}={}){
 const prefs=settings.projectPreferences?.[key(cwd)]||{};
 const sections=[...new Set([...tasks.map(t=>t.section),...Object.values(settings.projectPreferences||{}).map(p=>p.section)].filter(Boolean))];
 const item=(label,action,value,extra={})=>({label:tr(label),click:()=>choose({action,value}),...extra});
 return [item(prefs.pinned?'取消置顶':'置顶','pin'),item('编辑','rename'),{type:'separator'},
 {label:tr('分区'),submenu:[item('新建分区…','section-new'),...sections.map(section=>({label:section,type:'checkbox',checked:prefs.section===section,click:()=>choose({action:'section',value:section})})),item('移出分区','section','')]},
 item('创建永久工作树','worktree',undefined,{enabled:git}),{type:'separator'},
 item('全部标为已读','read'),item('归档聊天','archive',undefined,{enabled:!busy&&projectTasks(tasks,cwd).length>0}),{type:'separator'},item('移除项目','remove')];
}
function manageProject(settings,store,runner,queue,cwd,action,value){
 if(typeof cwd!=='string'||!cwd.trim())throw Error('Invalid project');
 const id=key(cwd),tasks=projectTasks(store.list(),cwd),prefs={...settings.projectPreferences?.[id]};
 if(action==='archive'&&tasks.some(t=>(runner.activeFor?runner.activeFor(t.id):runner.active?.task.id===t.id)||['running','stopping','unknown'].includes(t.state)))throw Error('请先停止任务或核对执行状态。');
 if(action==='pin')prefs.pinned=!prefs.pinned;
 else if(action==='section'){
  if(typeof value!=='string'||value.trim().length>60)throw Error('分区名称不能超过 60 字。');
  prefs.section=value.trim();prefs.pinned=false;
 }else if(action==='remove'){prefs.hidden=true;prefs.pinned=false;}
 else if(action==='read'||action==='archive'){
  for(const original of tasks){const task=(runner.activeFor?.(original.id)?.task||(runner.active?.task.id===original.id?runner.active.task:original));
   if(action==='read')task.unread=false;else task.archivedAt=new Date().toISOString();store.save(task);
  }
  if(action==='archive'&&queue){const ids=new Set(tasks.map(t=>t.id));queue.items=queue.items.filter(i=>!ids.has(i.taskId));queue.save();}
 }else throw Error('Unsupported project action');
 return {...settings,projects:action==='remove'?(settings.projects||[]).filter(p=>key(p.cwd)!==id):settings.projects,projectPreferences:{...settings.projectPreferences,[id]:prefs}};
}
module.exports={projectMenuTemplate,projectTasks,manageProject};
