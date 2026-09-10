const {CONFIG}=require('./config.cjs');
const MODES=['read-only','workspace-write','full-access'];
function newTaskMode(settings,profile){
  if(!profile?.write||!['Codex','Claude','Grok'].includes(profile.provider))return 'read-only';
  return MODES.includes(settings.defaultMode)?settings.defaultMode:'workspace-write';
}
function validateMode(mode,profile){
  if(!MODES.includes(mode))throw Error('Invalid permission mode');
  if(mode!=='read-only'&&(!profile?.write||!['Codex','Claude','Grok'].includes(profile.provider)))throw Error('这个入口仅支持只读研究。');
}
function applyPendingMode(task){
  if(!task.pendingMode)return;
  validateMode(task.pendingMode,CONFIG.profiles.find(p=>p.id===task.profile));
  task.mode=task.pendingMode;delete task.pendingMode;task.sessions={};
}
function updateTaskSetting(store,runner,id,update){
  const active=runner.active?.task.id===id?runner.active.task:null;
  const task=active||store.get(id);
  if(Object.keys(update).length!==1)throw Error('Change one task setting at a time');
  if('title' in update){
    if(typeof update.title!=='string'||!update.title.trim()||update.title.trim().length>100)throw Error('Task name must contain 1–100 characters');
    task.title=update.title.trim();
  }else if('mode' in update){
    validateMode(update.mode,CONFIG.profiles.find(p=>p.id===task.profile));
    if(task.state==='unknown')throw Error('请先核对工作目录。');
    if(active){if(update.mode===task.mode)delete task.pendingMode;else task.pendingMode=update.mode;}
    else {task.mode=update.mode;delete task.pendingMode;task.sessions={};}
  }else if('linkedProjects' in update){
    if(active||['running','stopping','unknown'].includes(task.state))throw Error('请先停止任务或核对执行状态。');
    task.linkedProjects=require('./project-access.cjs').normalizeRoots(task.cwd,update.linkedProjects);
    task.sessions={};
  }else throw Error('Unsupported task setting');
  return store.save(task);
}
function codexPermissions(mode){return mode==='full-access'?{approvalPolicy:'never',sandbox:'danger-full-access',sandboxPolicy:{type:'dangerFullAccess'}}:mode==='read-only'?{approvalPolicy:'on-request',sandbox:'read-only',sandboxPolicy:{type:'readOnly'}}:{approvalPolicy:'on-request',sandbox:'workspace-write',sandboxPolicy:{type:'workspaceWrite',networkAccess:true}};}
module.exports={MODES,newTaskMode,validateMode,applyPendingMode,updateTaskSetting,codexPermissions};
