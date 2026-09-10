const fs=require('node:fs'),path=require('node:path');
function manageTask(store,runner,queue,id,action,value){
 const moving=action==='project-move';if(moving)action='project';
 const active=runner.active?.task.id===id?runner.active.task:null;
 const task=active||store.get(id,true);
 if(['archive','delete','restore','project'].includes(action)&&(active||['running','stopping','unknown'].includes(task.state)))throw Error('请先停止任务或核对执行状态。');
 if(task.deletedAt&&action!=='restore')throw Error('任务已删除，请先恢复。');
 switch(action){
 case 'pin':task.pinned=!task.pinned;break;
 case 'unread':task.unread=true;break;
 case 'archive':task.archivedAt=new Date().toISOString();break;
 case 'delete':task.deletedAt=new Date().toISOString();break;
 case 'restore':delete task.deletedAt;delete task.archivedAt;break;
 case 'section':if(typeof value!=='string'||value.length>60)throw Error('分区名称不能超过 60 字。');task.section=value.trim();break;
 case 'project':
  if(value===null){task.projectGroup=false;break;}
  if(typeof value!=='string'||!path.isAbsolute(value)||!fs.existsSync(value)||!fs.statSync(value).isDirectory())throw Error('请选择已有的工作目录。');
  {const cwd=fs.realpathSync.native(value);if(task.cwd!==cwd){if(task.workspaceKind==='project')task.projectHistory=[...new Set([...(task.projectHistory||[]),task.cwd])];task.previousWorkspaces=[...new Set([...(task.previousWorkspaces||[]),task.cwd])];task.cwd=cwd;task.workspaceKind='project';task.sessions={};}task.projectGroup=true;task.section='';if(moving)task.pinned=false;task.linkedProjects=(task.linkedProjects||[]).filter(root=>require('./project-access.cjs').key(root)!==require('./project-access.cjs').key(task.cwd));}break;
 default:throw Error('Unsupported task action');
 }
 store.save(task);
 if(['delete','archive'].includes(action)&&queue){queue.items=queue.items.filter(item=>item.taskId!==id);queue.save();}
 return task;
}
function conversationText(store,id){const task=store.get(id,true);return `# ${task.title}\n\n`+store.events(id).filter(e=>['user','assistant'].includes(e.type)).map(e=>`## ${e.type==='user'?'User':'Assistant'}\n\n${e.text||''}${e.images?.length?'\n\n'+e.images.map(image=>`[Image: ${image.name}]`).join('\n'):''}\n`).join('\n');}
async function forkTask(store,runner,id,independent=false){
 const source=store.get(id);if(runner.active?.task.id===id||['running','stopping','unknown'].includes(source.state))throw Error('请先停止任务或核对执行状态。');
 const fork=store.create({title:source.title.slice(0,88)+' · Fork',cwd:independent?undefined:source.cwd,profile:source.profile,mode:source.mode});
 try {
if(!independent)fork.linkedProjects=source.linkedProjects;
fork.checkpoint=source.checkpoint;fork.modelSettings=source.modelSettings;fork.autoSwitch=source.autoSwitch;fork.forkedFrom=id;
 if(!independent){fork.workspaceKind=source.workspaceKind;fork.projectGroup=source.projectGroup;fork.section=source.section;}
 const sourceImages=path.join(store.dir(id),'attachments'),destImages=path.join(store.dir(fork.id),'attachments');if(fs.existsSync(sourceImages))fs.cpSync(sourceImages,destImages,{recursive:true});
 const events=store.events(id).map(e=>({...e,...(e.images?{images:e.images.map(image=>({...image,path:path.join(destImages,image.id+'.png')}))}:{})}));
 fs.writeFileSync(path.join(store.dir(fork.id),'events.jsonl'),events.map(e=>JSON.stringify(e)).join('\n')+(events.length?'\n':''));
 if(independent){store.append(fork.id,'notice',{text:'此分叉保留对话，使用新的空白工作区；原项目文件仍在原工作目录。'});fork.previousWorkspaces=[source.cwd];}
 return store.save(fork);
} catch(error){const created=path.resolve(store.dir(fork.id));if(path.dirname(created)===path.resolve(store.root))fs.rmSync(created,{recursive:true,force:true});throw error;}
}
module.exports={manageTask,conversationText,forkTask};
