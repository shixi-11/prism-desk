export function sidebarGroups(tasks,savedProjects=[],preferences={}){
 const pinned=[],recent=[],projects=new Map(),sections=new Map();
 const addProject=cwd=>{if(!cwd)return;const key=cwd.replaceAll('\\','/').replace(/\/$/,'').toLowerCase();if(preferences[key]?.hidden)return;if(!projects.has(key))projects.set(key,{key:'project:'+key,label:cwd.split(/[\\/]/).filter(Boolean).pop(),path:cwd,tasks:[]});};
 for(const project of savedProjects)addProject(project.cwd);
 for(const task of tasks){for(const cwd of task.projectHistory||[])addProject(cwd);if(task.pinned&&(task.projectGroup||task.projectGroup!==false&&task.workspaceKind==='project'))addProject(task.cwd);}
 for(const task of [...tasks].sort((a,b)=>(b.updated||'').localeCompare(a.updated||''))){
  if(task.pinned){pinned.push(task);continue;}
  if(task.section){if(!sections.has(task.section))sections.set(task.section,{key:'section:'+task.section,label:task.section,tasks:[]});sections.get(task.section).tasks.push(task);continue;}
  if(task.projectGroup||task.projectGroup!==false&&task.workspaceKind==='project'){
   const key=task.cwd.replaceAll('\\','/').replace(/\/$/,'').toLowerCase();
   if(preferences[key]?.hidden){recent.push(task);continue;}
   if(!projects.has(key))projects.set(key,{key:'project:'+key,label:task.cwd.split(/[\\/]/).filter(Boolean).pop(),path:task.cwd,tasks:[]});
   projects.get(key).tasks.push(task);
  }else recent.push(task);
 }
 const pinnedProjects=[],normalProjects=[];for(const group of projects.values()){const prefs=preferences[group.key.slice(8)]||{};if(prefs.pinned)pinnedProjects.push(group);else if(prefs.section){if(!sections.has(prefs.section))sections.set(prefs.section,{key:'section:'+prefs.section,label:prefs.section,tasks:[],groups:[]});const section=sections.get(prefs.section);section.groups??=[];section.groups.push(group);}else normalProjects.push(group);}
 return [{key:'pinned',label:'置顶',tasks:pinned,groups:pinnedProjects},{key:'projects',label:'项目',tasks:[],groups:normalProjects},{key:'recent',label:'最近',tasks:recent,groups:[...sections.values()]}];
}
