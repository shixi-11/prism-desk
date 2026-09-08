const fs=require('node:fs'),path=require('node:path'),rcedit=require('rcedit');
(async()=>{
 const root=path.resolve(__dirname,'..'),target=path.join(root,'runtime','desktop'),exe=path.join(target,'Prism.exe');
 fs.mkdirSync(target,{recursive:true});
 const nodeDir=path.join(root,'runtime','node');fs.mkdirSync(nodeDir,{recursive:true});
 if(path.resolve(process.execPath).toLowerCase()!==path.join(nodeDir,'node.exe').toLowerCase())fs.copyFileSync(process.execPath,path.join(nodeDir,'node.exe'));
 fs.cpSync(path.join(root,'node_modules','electron','dist'),target,{recursive:true});
 fs.renameSync(path.join(target,'electron.exe'),exe);
 await rcedit(exe,{'icon':path.join(root,'src','assets','prism.ico'),'version-string':{ProductName:'棱镜',FileDescription:'棱镜',InternalName:'Prism',OriginalFilename:'Prism.exe',CompanyName:'Prism Desk'},'file-version':'0.1.0','product-version':'0.1.0'});
 console.log(exe);
})().catch(e=>{console.error(e);process.exitCode=1;});
