const fs=require('node:fs'),path=require('node:path');
const key=value=>value.replaceAll('\\','/').replace(/\/$/,'').toLowerCase();
function normalizeRoots(cwd,values){
 if(!Array.isArray(values)||values.length>32)throw Error('最多关联 32 个项目目录。');
 const seen=new Set([key(cwd)]),roots=[];
 for(const value of values){
  if(typeof value!=='string'||!path.isAbsolute(value)||!fs.existsSync(value)||!fs.statSync(value).isDirectory())throw Error('请选择已有的工作目录。');
  const root=fs.realpathSync.native(value);if(!seen.has(key(root))){seen.add(key(root));roots.push(root);}
 }
 return roots;
}
function validateAccess(task,profile){
 if(task.linkedProjects?.length&&!['Codex','Claude'].includes(profile.provider)&&(task.execution?.mode||task.mode)!=='full-access')throw Error('关联目录的受限访问目前支持 Codex 和 Claude。请切换账号或移除关联。');
 return normalizeRoots(task.cwd,task.linkedProjects||[]);
}
function codexSandbox(task){const mode=task.execution?.mode||task.mode;return mode==='full-access'?{type:'dangerFullAccess'}:mode==='read-only'?{type:'readOnly'}:{type:'workspaceWrite',writableRoots:[task.cwd,...normalizeRoots(task.cwd,task.linkedProjects||[])],networkAccess:true};}
module.exports={key,normalizeRoots,validateAccess,codexSandbox};
