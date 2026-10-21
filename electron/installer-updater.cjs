const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{EventEmitter}=require('node:events'),{Readable,Transform}=require('node:stream'),{pipeline}=require('node:stream/promises');
const {latestRelease,compareVersions,REPO}=require('./release.cjs'),{read,write}=require('./update-bootstrap.cjs');
async function matches(file,asset){try{if(fs.statSync(file).size!==asset.size)return false;const hash=crypto.createHash('sha256');for await(const part of fs.createReadStream(file))hash.update(part);return hash.digest('hex')===asset.sha256;}catch{return false;}}
class InstallerUpdater extends EventEmitter{
 constructor({root,version,fetchRelease=latestRelease,download=fetch,platform=process.platform,arch=process.arch,stallTimeoutMs=45000}){super();this.root=root;this.version=version;this.stallTimeoutMs=stallTimeoutMs;this.fetchRelease=fetchRelease;this.download=download;this.platform=platform;this.arch=arch;this.file=path.join(root,'installer-updates','status.json');this.busy=false;const saved=read(this.file);this.state={automatic:saved.automatic!==false,current:version,latest:version,release:null,status:'idle',error:'',repository:`https://github.com/${REPO}`,distribution:platform==='darwin'?'mac-dmg':'installer'};}
 snapshot(){return {...this.state,version:this.version};}
 set(value){Object.assign(this.state,value);write(this.file,this.state);this.emit('change',this.snapshot());return this.snapshot();}
 async current(){return this.version;}
 automatic(value){if(typeof value!=='boolean')throw Error('Invalid update preference');return this.set({automatic:value});}
 asset(release=this.state.release){return release?.installers?.[this.platform==='darwin'?`mac-${this.arch}`:'windows-x64']||(this.platform==='win32'&&this.arch==='x64'?release?.installer:null);}
 async check(){if(this.busy)return this.snapshot();this.busy=true;try{this.set({status:'checking',error:''});if(!(['win32','darwin'].includes(this.platform)&&['x64','arm64'].includes(this.arch))||(this.platform==='win32'&&this.arch!=='x64'))throw Error('Unsupported installer platform.');const release=await this.fetchRelease();const newer=release&&compareVersions(release.version,this.version)>0;if(newer&&!this.asset(release))throw Error('The new release does not contain a verified installer for this platform.');const ready=newer&&await matches(this.installerFile(release),this.asset(release));return this.set({release,latest:newer?release.version:this.version,checkedAt:new Date().toISOString(),status:newer?(ready?'ready':'available'):'current',downloadProgress:null});}catch(e){return this.set({status:'error',error:e.message});}finally{this.busy=false;}}
 installerFile(release=this.state.release){return path.join(this.root,'installer-updates',this.platform==='darwin'?`Prism-${release?.version}-${this.arch}.dmg`:`Prism-${release?.version}-Setup.exe`);}
 async prepare(){
  if(this.busy||!this.asset()||compareVersions(this.state.release.version,this.version)<=0)return this.snapshot();
  this.busy=true;const asset=this.asset(),file=this.installerFile(),temp=file+'.partial',controller=new AbortController();let idleTimer;
  const watch=()=>{clearTimeout(idleTimer);idleTimer=setTimeout(()=>controller.abort(Error('更新下载已停止响应，请检查网络后重试。')),this.stallTimeoutMs);idleTimer.unref?.();};
  try{
   this.set({status:'preparing',error:'',downloadProgress:{received:0,total:asset.size}});
   if(!await matches(file,asset)){
    watch();const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(600000)]);
    const response=await this.download(asset.url,{signal});if(!response.ok||!response.body)throw Error('Installer download failed: HTTP '+response.status);
    let bytes=0,last=0;const update=()=>this.set({downloadProgress:{received:bytes,total:asset.size}});
    await pipeline(Readable.fromWeb(response.body),new Transform({transform:(part,_enc,done)=>{
     bytes+=part.length;watch();if(bytes>asset.size)return done(Error('Installer download exceeds its published size'));
     try{if(Date.now()-last>=250){update();last=Date.now();}done(null,part);}catch(error){done(error);}
    }}),fs.createWriteStream(temp),{signal});
    clearTimeout(idleTimer);update();
    if(!await matches(temp,asset))throw Error('Installer integrity verification failed.');fs.renameSync(temp,file);
   }
   return this.set({status:'ready',detail:'',downloadProgress:null});
  }catch(e){fs.rmSync(temp,{force:true});return this.set({status:'error',downloadProgress:null,error:controller.signal.aborted?controller.signal.reason.message:e.message});}
  finally{clearTimeout(idleTimer);this.busy=false;}
 }
 async activate(){
  if(this.busy||this.state.status!=='ready')throw Error('The verified installer is not ready.');
  this.busy=true;
  const file=this.installerFile(),asset=this.asset();
  try{if(!await matches(file,asset))throw Error('The verified installer is not ready.');this.set({status:'restarting'});return file;}
  finally{this.busy=false;}
 }
 cancelActivation(){if(this.state.status==='restarting')this.set({status:'ready'});}
}
module.exports={InstallerUpdater,matches};
