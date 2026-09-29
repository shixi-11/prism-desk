const fs=require('node:fs'),path=require('node:path');
const {execFile}=require('node:child_process');
async function copyMarkdown({text,title,directory,clipboard,platform=process.platform,execute=execFile}){
 if(platform!=='win32'){clipboard.writeText(text);return {fileCopied:false};}
 const folder=path.join(directory,'clipboard');fs.mkdirSync(folder,{recursive:true});
 const name=(title||'conversation').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/,'').slice(0,80)||'conversation';
 const safeName=/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name)?name+'_':name;
 const file=path.join(folder,safeName+'.md');fs.writeFileSync(file,text,'utf8');
 const executable=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 try{await new Promise((resolve,reject)=>execute(executable,['-NoProfile','-NonInteractive','-STA','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'copy-markdown.ps1'),file],{windowsHide:true,timeout:10000,maxBuffer:16384},error=>error?reject(error):resolve()));return {fileCopied:true};}
 catch{clipboard.writeText(text);return {fileCopied:false};}
}
module.exports={copyMarkdown};
