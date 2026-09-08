const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{EventEmitter}=require('node:events');
const {read,write,SHA,installation,versionPath,validVersion}=require('./update-bootstrap.cjs');
const {latestRelease,compareVersions}=require('./release.cjs');
const REPOSITORY='https://github.com/shixi-11/prism-desk.git';
function command(file,args,cwd,timeout=120000,extraEnv={}){return new Promise((resolve,reject)=>{
 let stdout='',stderr='',timedOut=false,settled=false,logBytes=0;
 const child=spawn(file,args,{cwd,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,GIT_TERMINAL_PROMPT:'0',...extraEnv}});
 const log=timeout>=300000?path.join(cwd,'.local','update-build.log'):null;
 const record=(chunk,error)=>{const value=chunk.toString();if(error)stderr=(stderr+value).slice(-65536);else stdout=(stdout+value).slice(-65536);if(log&&logBytes<8*1024*1024){try{fs.mkdirSync(path.dirname(log),{recursive:true});fs.appendFileSync(log,value);logBytes+=chunk.length;}catch{}}};
 child.stdout.on('data',c=>record(c,false));child.stderr.on('data',c=>record(c,true));
 const timer=setTimeout(()=>{if(settled)return;timedOut=true;if(process.platform==='win32'&&child.pid){const killer=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});killer.on('error',()=>child.kill());}else child.kill('SIGKILL');},timeout);
 const finish=(error,code)=>{if(settled)return;settled=true;clearTimeout(timer);if(error||code!==0||timedOut)reject(Error(timedOut?'更新命令超时，已停止本次构建':(stderr||error?.message||`Update command exited ${code}`).slice(-1800)));else resolve(stdout.trim());};
 child.on('error',error=>finish(error));child.on('close',code=>finish(null,code));
});}
class Updater extends EventEmitter{
 constructor(appRoot,{run=command,fetchRelease=latestRelease,platform=process.platform,root=installation(appRoot)}={}){super();this.appRoot=appRoot;this.root=root;this.run=run;this.fetchRelease=fetchRelease;this.platform=platform;this.file=path.join(this.root,'.local','updates','status.json');this.activeFile=path.join(this.root,'.local','updates','active.json');const saved=read(this.file);this.state={automatic:saved.automatic!==false,status:saved.release&&saved.latest&&saved.latest!==saved.current?(validVersion(this.root,saved.latest)?'ready':'available'):'idle',current:saved.current||'',latest:saved.release?saved.latest||'':saved.current||'',release:saved.release||null,checkedAt:saved.checkedAt||null,error:read(this.activeFile).error||'',repository:REPOSITORY};this.busy=false;}
 set(value){Object.assign(this.state,value);write(this.file,this.state);this.emit('change',this.snapshot());return this.snapshot();}
 snapshot(){return {...this.state,version:read(path.join(this.appRoot,'package.json')).version||null};}
 automatic(value){if(typeof value!=='boolean')throw Error('Invalid update preference');return this.set({automatic:value});}
 async current(){return this.run('git',['rev-parse','HEAD'],this.appRoot);}
 async check(){
  if(this.busy)return this.snapshot();this.busy=true;
  try{this.set({status:'checking',error:''});if(this.platform!=='win32')throw Error('自动安装目前支持 Windows 源码安装版');
   const [current,release]=await Promise.all([this.current(),this.fetchRelease()]);
   if(!SHA.test(current))throw Error('无法确认本地版本');
   if(!release||compareVersions(release.version,this.snapshot().version)<=0)return this.set({current,latest:current,release,checkedAt:new Date().toISOString(),status:'current',detail:''});
   const tag=`refs/tags/${release.tag}`,result=await this.run('git',['ls-remote',REPOSITORY,tag,tag+'^{}'],this.root);
   const refs=result.split(/\r?\n/).map(line=>line.trim().split(/\s+/));
   const latest=(refs.find(row=>row[1]===tag+'^{}')||refs.find(row=>row[1]===tag)||[])[0];
   if(!SHA.test(current)||!SHA.test(latest))throw Error('无法确认 GitHub 版本');
   if(read(this.activeFile).failed===latest)return this.set({current,latest,release,checkedAt:new Date().toISOString(),status:'error',error:'此版本启动失败，等待后续版本或手动重试',detail:''});
   return this.set({current,latest,release,checkedAt:new Date().toISOString(),status:latest===current?'current':validVersion(this.root,latest)?'ready':'available',detail:''});
  }catch(error){return this.set({status:'error',error:error.message});}finally{this.busy=false;}
 }
 async prepare(){
  if(this.busy)return this.snapshot();if(!SHA.test(this.state.latest)||this.state.latest===this.state.current)return this.snapshot();this.busy=true;
  const sha=this.state.latest,stage=versionPath(this.root,sha);
  try{
   this.set({status:'preparing',error:''});
   // Updating a modified checkout would silently hide a developer's changes.
   if(await this.run('git',['status','--porcelain','--untracked-files=normal'],this.appRoot))throw Error('当前源码有本地修改，请提交或另存后再更新');
   const space=fs.statfsSync(this.root);if(space.bavail*space.bsize<2*1024**3)throw Error('更新需要至少 2 GB 可用空间');
   if(!validVersion(this.root,sha)){
    if(fs.existsSync(stage)){try{fs.renameSync(stage,stage+'.failed-'+Date.now());}catch{throw Error('上次更新文件仍被占用，请稍后重试');}}
    fs.mkdirSync(path.dirname(stage),{recursive:true});
    await this.run('git',['clone','--no-checkout','--branch','main',REPOSITORY,stage],this.root,300000);
    await this.run('git',['fetch','origin',sha],stage,300000);
    try{await this.run('git',['merge-base','--is-ancestor',this.state.current,sha],stage);}catch{throw Error('本地版本与主线分叉，无法自动更新');}
    await this.run('git',['checkout','--detach',sha],stage);
    if(await this.run('git',['rev-parse','HEAD'],stage)!==sha)throw Error('下载版本校验失败');
    if(read(path.join(stage,'package.json')).version!==this.state.release?.version)throw Error('下载版本号与发布说明不一致');
    this.set({detail:'正在安装依赖'});
    const node=path.join(this.appRoot,'runtime','node','node.exe'),npm=path.join(this.appRoot,'node_modules','npm','bin','npm-cli.js');
    if(!fs.existsSync(node)||!fs.existsSync(npm))throw Error('更新运行环境缺失，请先运行 npm run build:desktop');
    const env={PATH:path.dirname(node)+path.delimiter+process.env.PATH,npm_config_cache:path.join(this.root,'.local','updates','npm-cache'),electron_config_cache:path.join(this.root,'.local','updates','electron-cache')};
    await this.run(node,[npm,'ci','--include=dev','--ignore-scripts','--no-audit','--no-fund'],stage,1200000,env);
    const oldElectron=path.join(this.appRoot,'node_modules','electron'),newElectron=path.join(stage,'node_modules','electron');
    const electronVersion=read(path.join(newElectron,'package.json')).version;
    if(electronVersion&&read(path.join(oldElectron,'package.json')).version===electronVersion&&fs.existsSync(path.join(oldElectron,'dist','electron.exe'))&&fs.readFileSync(path.join(oldElectron,'dist','version'),'utf8').trim().replace(/^v/,'')===electronVersion){
      fs.cpSync(path.join(oldElectron,'dist'),path.join(newElectron,'dist'),{recursive:true});
      fs.writeFileSync(path.join(newElectron,'path.txt'),'electron.exe');
    }
    await this.run(node,[npm,'rebuild','--foreground-scripts','--no-audit','--no-fund'],stage,1200000,env);
    this.set({detail:'正在构建新版'});
    await this.run(node,[path.join(stage,'node_modules','vite','bin','vite.js'),'build'],stage,300000,env);
    await this.run(node,[path.join(stage,'scripts','build-desktop.cjs')],stage,300000,env);
    await this.run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(stage,'scripts','build-host.ps1')],stage,120000);
    write(path.join(stage,'.local','installation.json'),{root:this.root});
    write(path.join(stage,'.local','ready.json'),{revision:sha});
    if(!validVersion(this.root,sha))throw Error('新版构建不完整');
   }
   return this.set({status:'ready',detail:''});
  }catch(error){
   // Keep incomplete files for diagnostics, but move them out of the immutable
   // revision slot so a retry is possible. This never touches user data.
   if(fs.existsSync(stage)&&!validVersion(this.root,sha)){try{fs.renameSync(stage,stage+'.failed-'+Date.now());}catch{}}
   return this.set({status:'error',detail:'',error:error.message});
  }finally{this.busy=false;}
 }
 async activate(){
  if(this.busy||this.state.status!=='ready'||!validVersion(this.root,this.state.latest))throw Error('新版尚未准备完成');
  if(await this.run('git',['status','--porcelain','--untracked-files=normal'],this.appRoot))throw Error('当前源码有本地修改，请提交或另存后再更新');
  const old=read(this.activeFile),sha=this.state.latest;
  this.activationBackup=old;
  try{this.set({status:'restarting'});write(this.activeFile,{current:sha,previous:old.current||null,pending:true,attempts:1,attempted:Date.now()});return versionPath(this.root,sha);}
  catch(error){this.state.status='ready';throw error;}
 }
 cancelActivation(){if(this.activationBackup){write(this.activeFile,this.activationBackup);delete this.activationBackup;this.set({status:'ready'});}}
}
module.exports={Updater,command,REPOSITORY};
