const fs=require('node:fs'),path=require('node:path');
const {key}=require('./project-access.cjs');
function directory(value){
 if(typeof value!=='string'||!path.isAbsolute(value)||!fs.existsSync(value)||!fs.statSync(value).isDirectory())throw Error('请选择已有的工作目录。');
 return fs.realpathSync.native(value);
}
function addProject(settings,input,persist){
 if(!input||!['create','existing'].includes(input.kind))throw Error('Invalid project operation');
 const name=typeof input.name==='string'?input.name.trim():'';
 if(!name||name.length>100)throw Error('请填写 1–100 字的项目名称。');
 let cwd,created=false;
 if(input.kind==='create'){
  if(/[<>:"/\\|?*\x00-\x1f]/.test(name)||/[. ]$/.test(name)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)||name==='.'||name==='..')throw Error('项目名称不能包含无效的文件夹字符。');
  const parent=directory(input.parent);cwd=path.join(parent,name);
  if(path.dirname(cwd)!==parent)throw Error('Invalid project folder');
  if(fs.existsSync(cwd))throw Error('同名文件夹已存在，请使用已有文件夹。');
  fs.mkdirSync(cwd);created=true;
 }else cwd=directory(input.cwd);
 const existing=(settings.projects||[]).find(p=>key(p.cwd)===key(cwd));
 const project=existing||{cwd,createdAt:new Date().toISOString()};
 const next={...settings,projectPreferences:{...settings.projectPreferences,[key(cwd)]:{...settings.projectPreferences?.[key(cwd)],hidden:false}},projects:existing?settings.projects:[...(settings.projects||[]),project],projectNames:{...settings.projectNames,[key(cwd)]:name}};
 try{persist(next);}catch(error){if(created){try{fs.rmdirSync(cwd);}catch{}}throw error;}
 return {project,projects:next.projects,projectNames:next.projectNames,projectPreferences:next.projectPreferences};
}
module.exports={addProject};
