const fs=require('node:fs'),path=require('node:path');
const SHA=/^[a-f0-9]{40}$/;
function canonical(value){try{return fs.realpathSync.native(value).toLowerCase();}catch{return path.resolve(value).toLowerCase();}}
function rootExists(root){return typeof root==='string'&&path.isAbsolute(root)&&read(path.join(root,'package.json')).name==='prism-desk'&&fs.existsSync(path.join(root,'electron','main.cjs'));}
function read(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function write(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value,null,2));fs.renameSync(tmp,file);}
function installation(appRoot){
 const marker=read(path.join(appRoot,'.local','installation.json'));
 if(rootExists(marker.root))return path.resolve(marker.root);
 const inferred=path.resolve(appRoot,'../../../..');
 if(SHA.test(path.basename(appRoot))&&rootExists(inferred)&&canonical(versionPath(inferred,path.basename(appRoot)))===canonical(appRoot))return inferred;
 return path.resolve(appRoot);
}
function versionPath(root,sha){if(!SHA.test(sha))throw Error('Invalid update revision');return path.join(root,'.local','updates','versions',sha);}
function validVersion(root,sha){try{const dir=versionPath(root,sha);return ['electron/main.cjs','electron/update-bootstrap.cjs','dist/index.html','runtime/desktop/Prism.exe','runtime/PrismProcess.exe','runtime/node/node.exe','node_modules/npm/bin/npm-cli.js','.local/installation.json'].every(p=>fs.existsSync(path.join(dir,p)))&&canonical(installation(dir))===canonical(root)&&read(path.join(dir,'.local','ready.json')).revision===sha;}catch{return false;}}
function bootstrap(app,appRoot){
 if(process.env.PRISM_TEST_DATA)return;
 try{
 const root=installation(appRoot),file=path.join(root,'.local','updates','active.json');
 if(!process.env.PRISM_CONFIG&&fs.existsSync(path.join(root,'.local','config.json')))process.env.PRISM_CONFIG=path.join(root,'.local','config.json');
 const state=read(file);
 // A launch that never reached renderer readiness is retried using the last
 // healthy installation on the next launch. Never delete either installation.
 const retry=state.pending&&((state.bootPid&&state.bootPid!==process.pid)||(canonical(appRoot)===canonical(root)&&state.attempts>=1)||(state.attempted&&Date.now()-state.attempted>120000));
 if(retry){state.failed=state.current;state.current=state.previous||null;state.pending=false;state.error='新版启动未完成，已恢复上一版本';write(file,state);}
 if(state.current&&!validVersion(root,state.current)){state.failed=state.current;state.current=validVersion(root,state.previous)?state.previous:null;state.pending=false;state.error='新版文件不完整，已恢复上一版本';write(file,state);}
 const target=state.current?versionPath(root,state.current):root;
 if(canonical(target)!==canonical(appRoot)){
   if(state.pending){state.attempted=state.attempted||Date.now();state.attempts=(state.attempts||0)+1;write(file,state);}
   app.relaunch({execPath:path.join(target,'runtime','desktop','Prism.exe'),args:[target,...process.argv.slice(2)]});app.exit(0);
 }else if(state.pending){state.attempted=state.attempted||Date.now();state.attempts=state.attempts||1;state.bootPid=process.pid;write(file,state);}
 }catch(error){return '更新状态无法读取，暂时使用当前版本：'+error.message;}
}
function healthy(appRoot){const root=installation(appRoot),file=path.join(root,'.local','updates','active.json'),state=read(file);if(state.current&&canonical(versionPath(root,state.current))===canonical(appRoot)&&state.pending){state.pending=false;state.healthyAt=new Date().toISOString();delete state.error;write(file,state);}}
module.exports={read,write,SHA,installation,versionPath,validVersion,bootstrap,healthy};
