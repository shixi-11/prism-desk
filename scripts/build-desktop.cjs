const fs=require('node:fs'),path=require('node:path'),rcedit=require('rcedit');
(async()=>{
 const root=path.resolve(__dirname,'..'),target=path.join(root,'runtime','desktop'),exe=path.join(target,'Prism.exe');
 fs.mkdirSync(target,{recursive:true});
 require('node:child_process').execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts','build-launcher.ps1')],{stdio:'inherit',windowsHide:true});
 const nodeDir=path.join(root,'runtime','node');fs.mkdirSync(nodeDir,{recursive:true});
 if(path.resolve(process.execPath).toLowerCase()!==path.join(nodeDir,'node.exe').toLowerCase())fs.copyFileSync(process.execPath,path.join(nodeDir,'node.exe'));
 fs.cpSync(path.join(root,'node_modules','electron','dist'),target,{recursive:true});
 fs.renameSync(path.join(target,'electron.exe'),exe);
 await rcedit(exe,{'icon':path.join(root,'src','assets','prism.ico'),'version-string':{ProductName:'棱镜',FileDescription:'棱镜',InternalName:'Prism',OriginalFilename:'Prism.exe',CompanyName:'Prism Desk'},'file-version':require('../package.json').version,'product-version':require('../package.json').version});
 console.log(exe);
})().catch(e=>{console.error(e);process.exitCode=1;});
