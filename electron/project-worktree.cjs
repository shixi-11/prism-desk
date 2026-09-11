const fs=require('node:fs'),path=require('node:path'),{execFile}=require('node:child_process');
function git(cwd,args){return new Promise((resolve,reject)=>execFile('git',['-C',cwd,...args],{windowsHide:true,encoding:'utf8',timeout:60000,maxBuffer:1024*1024,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}},(error,out,err)=>error?reject(Error((err||error.message).slice(0,2000))):resolve(out.trim())));}
async function repository(cwd){try{await git(cwd,['rev-parse','--verify','HEAD']);return await git(cwd,['rev-parse','--show-toplevel']);}catch{return null;}}
async function createWorktree(cwd,destination){
 const root=await repository(cwd);if(!root)throw Error('此项目没有可用的 Git 提交。');
 if(typeof destination!=='string'||!path.isAbsolute(destination))throw Error('请选择工作树保存位置。');
 const parent=fs.realpathSync.native(path.dirname(destination)),target=path.join(parent,path.basename(destination));
 if(fs.existsSync(target))throw Error('工作树目录已存在，请选择新目录。');
 const rel=path.relative(fs.realpathSync.native(root),target);
 if(!rel||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel)))throw Error('工作树必须保存在原项目目录之外。');
 const branch='codex/worktree-'+Date.now()+'-'+require('node:crypto').randomBytes(3).toString('hex');
 await git(root,['worktree','add','-b',branch,target,'HEAD']);
 return {cwd:fs.realpathSync.native(target),branch,source:root};
}
module.exports={repository,createWorktree};
