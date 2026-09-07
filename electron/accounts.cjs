const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const {CONFIG,saveProfiles}=require('./config.cjs');
const {providerFor,providerCatalog}=require('./account-providers.cjs');
const revision=p=>crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex');
function accountList(){return {providers:providerCatalog(),profiles:CONFIG.profiles.map(p=>{let cliAvailable=false;try{require('./discovery.cjs').resolveExecutable(p);cliAvailable=true;}catch{}return {...p,revision:revision(p),cliAvailable};})};}
function canonical(file){let parent=path.resolve(file);const tail=[];while(!fs.existsSync(parent)){const above=path.dirname(parent);if(above===parent)break;tail.unshift(path.basename(parent));parent=above;}return path.join(fs.existsSync(parent)?fs.realpathSync.native(parent):parent,...tail).replace(/[\\/]+$/,'').toLowerCase();}
function overlaps(a,b){return a===b||a.startsWith(b+path.sep)||b.startsWith(a+path.sep);}
function validateHome(home,id){
 if(!path.isAbsolute(home))throw Error('请选择绝对路径的独立账号目录。');
 const real=canonical(home),desktop=canonical(process.env.CODEX_HOME||path.join(process.env.USERPROFILE||os.homedir(),'.codex'));
 const standardDesktop=canonical(path.join(process.env.USERPROFILE||os.homedir(),'.codex'));
 if(overlaps(real,desktop)||overlaps(real,standardDesktop))throw Error('不能使用当前 Codex 桌面的账号目录。');
 if(CONFIG.profiles.some(p=>p.id!==id&&overlaps(real,canonical(p.home))))throw Error('这个目录已被其他账号使用，请选择独立目录。');
 if(fs.existsSync(home)&&!fs.statSync(home).isDirectory())throw Error('账号目录不是文件夹。');
 return fs.existsSync(home)?fs.realpathSync.native(home):path.resolve(home);
}
function saveAccount(input,accountRoot){
 if(!input||typeof input!=='object')throw Error('账号设置无效。');
 const existing=input.id?CONFIG.profiles.find(p=>p.id===input.id):null;
 if(input.id&&!existing)throw Error('账号不存在。');
 if(existing&&input.revision!==revision(existing))throw Error('账号已在其他窗口更新，请重新打开设置。');
 const adapter=providerFor(existing?.provider||input.provider);
 if(existing&&((input.provider&&input.provider!==existing.provider)||(input.home&&canonical(input.home)!==canonical(existing.home))))throw Error('已有账号的平台和登录目录不可更换，请接入新账号。');
 const name=typeof input.name==='string'?input.name.trim():'';if(!name||name.length>60)throw Error('请填写 1–60 字的账号名称。');
 const executable=(typeof input.executable==='string'?input.executable.trim():'')||adapter.executable;
 if(executable!==existing?.executable&&path.basename(executable).toLowerCase()!==adapter.executable)throw Error('请选择对应平台的官方 CLI 程序。');
 if(executable!==adapter.executable&&(!path.isAbsolute(executable)||!fs.existsSync(executable)||!fs.statSync(executable).isFile()||(process.platform==='win32'&&path.extname(executable).toLowerCase()!=='.exe')))throw Error('请选择有效的 CLI 可执行程序。');
 const id=existing?.id||adapter.provider.toLowerCase()+'-'+crypto.randomUUID();
 const supplied=typeof input.home==='string'&&input.home.trim();
 if(!existing&&supplied&&!fs.existsSync(supplied))throw Error('选择的已有账号目录不存在。');
 const home=existing?.home||validateHome(supplied||path.join(accountRoot,id),id);
 const profile=existing?{...existing,name,executable}:{id,provider:adapter.provider,name,home,executable,model:adapter.model,write:adapter.write,isolatedHome:true,disabled:true,connectionState:'pending'};
 const changed=!existing||existing.executable!==executable;
 const made=!fs.existsSync(home);if(made)fs.mkdirSync(home,{recursive:true});
 try{saveProfiles(existing?CONFIG.profiles.map(p=>p.id===id?profile:p):[...CONFIG.profiles,profile]);}catch(error){if(made&&fs.readdirSync(home).length===0)fs.rmdirSync(home);throw error;}
 if(changed)require('./models.cjs').invalidate(id);
 return {...profile,revision:revision(profile)};
}
function setEnabled(id,enabled){
 const profile=CONFIG.profiles.find(p=>p.id===id);if(!profile)throw Error('账号不存在。');
 if(enabled&&(profile.connectionState==='pending'||profile.loginRequired))throw Error('请先登录或检查连接。');
 const next={...profile,disabled:!enabled};if(!enabled)delete next.enableAfterLogin;saveProfiles(CONFIG.profiles.map(p=>p.id===id?next:p));return next;
}
function prepareLogin(id){const profile=CONFIG.profiles.find(p=>p.id===id);if(!profile)throw Error('账号不存在。');const next={...profile,disabled:true,loginRequired:true,enableAfterLogin:!profile.disabled||profile.enableAfterLogin||profile.connectionState==='pending'};saveProfiles(CONFIG.profiles.map(p=>p.id===id?next:p));return next;}
function recordVerified(id,status){
 const profile=CONFIG.profiles.find(p=>p.id===id);if(!profile)throw Error('账号不存在。');
 if(profile.email&&status.email&&profile.email.toLowerCase()!==status.email.toLowerCase())throw Error('登录账号与已有账号身份不一致，请使用原账号登录。');
 const next={...profile,connectionState:'connected',lastVerifiedAt:new Date().toISOString(),...(profile.connectionState==='pending'||profile.enableAfterLogin?{disabled:false}:{}),...(status.email?{email:status.email}:{}),...(status.subscriptionType?{subscriptionType:status.subscriptionType}:{})};delete next.loginRequired;delete next.enableAfterLogin;
 saveProfiles(CONFIG.profiles.map(p=>p.id===id?next:p));require('./models.cjs').invalidate(id);return next;
}
function clearAccountSessions(store,id){for(const view of ['active','archived','deleted'])for(const task of store.list(view)){if(task.sessions?.[id]){delete task.sessions[id];store.save(task);}}}
module.exports={accountList,saveAccount,setEnabled,prepareLogin,recordVerified,clearAccountSessions,validateHome,revision};
