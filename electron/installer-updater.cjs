const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{EventEmitter}=require('node:events'),{Readable,Transform}=require('node:stream'),{pipeline}=require('node:stream/promises');
const {latestRelease,compareVersions,REPO}=require('./release.cjs'),{read,write}=require('./update-bootstrap.cjs');
async function matches(file,asset){try{if(fs.statSync(file).size!==asset.size)return false;const hash=crypto.createHash('sha256');for await(const part of fs.createReadStream(file))hash.update(part);return hash.digest('hex')===asset.sha256;}catch{return false;}}
class InstallerUpdater extends EventEmitter{
 constructor({root,version,fetchRelease=latestRelease,download=fetch,platform=process.platform,arch=process.arch}){super();this.root=root;this.version=version;this.fetchRelease=fetchRelease;this.download=download;this.platform=platform;this.arch=arch;this.file=path.join(root,'installer-updates','status.json');this.busy=false;const saved=read(this.file);this.state={automatic:saved.automatic!==false,current:version,latest:version,release:null,status:'idle',error:'',repository:`https://github.com/${REPO}`,distribution:platform==='darwin'?'mac-dmg':'installer'};}
 snapshot(){return {...this.state,version:this.version};}
 set(value){Object.assign(this.state,value);write(this.file,this.state);this.emit('change',this.snapshot());return this.snapshot();}
 async current(){return this.version;}
 automatic(value){if(typeof value!=='boolean')throw Error('Invalid update preference');return this.set({automatic:value});}
 asset(release=this.state.release){return release?.installers?.[this.platform==='darwin'?`mac-${this.arch}`:'windows-x64']||(this.platform==='win32'&&this.arch==='x64'?release?.installer:null);}
 async check(){if(this.busy)return this.snapshot();this.busy=true;try{this.set({status:'checking',error:''});if(!(['win32','darwin'].includes(this.platform)&&['x64','arm64'].includes(this.arch))||(this.platform==='win32'&&this.arch!=='x64'))throw Error('Unsupported installer platform.');const release=await this.fetchRelease();const newer=release&&compareVersions(release.version,this.version)>0;if(newer&&!this.asset(release))throw Error('The new release does not contain a verified installer for this platform.');return this.set({release,latest:release?.version||this.version,checkedAt:new Date().toISOString(),status:newer?'available':'current'});}catch(e){return this.set({status:'error',error:e.message});}finally{this.busy=false;}}
 installerFile(){return path.join(this.root,'installer-updates',this.platform==='darwin'?`Prism-${this.state.release?.version}-${this.arch}.dmg`:`Prism-${this.state.release?.version}-Setup.exe`);}
 async prepare(){if(this.busy||!this.asset()||compareVersions(this.state.release.version,this.version)<=0)return this.snapshot();this.busy=true;const asset=this.asset(),file=this.installerFile(),temp=file+'.partial';try{this.set({status:'preparing',error:''});if(!await matches(file,asset)){
   const response=await this.download(asset.url,{signal:AbortSignal.timeout(600000)});if(!response.ok||!response.body)throw Error('Installer download failed: HTTP '+response.status);let bytes=0;
   await pipeline(Readable.fromWeb(response.body),new Transform({transform(part,_enc,done){bytes+=part.length;done(bytes>asset.size?Error('Installer download exceeds its published size'):null,part);}}),fs.createWriteStream(temp));
   if(!await matches(temp,asset))throw Error('Installer integrity verification failed.');fs.renameSync(temp,file);
  }return this.set({status:'ready',detail:''});}catch(e){fs.rmSync(temp,{force:true});return this.set({status:'error',error:e.message});}finally{this.busy=false;}}
 async activate(){if(this.busy||this.state.status!=='ready'||!await matches(this.installerFile(),this.asset()))throw Error('The verified installer is not ready.');this.set({status:'restarting'});return this.installerFile();}
 cancelActivation(){if(this.state.status==='restarting')this.set({status:'ready'});}
}
module.exports={InstallerUpdater,matches};
