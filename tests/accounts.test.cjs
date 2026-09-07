const fixture=require('./helpers/config-fixture.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{EventEmitter}=require('node:events');
const {CONFIG,saveProfiles,loadConfig}=require('../electron/config.cjs');
const {accountList,saveAccount,setEnabled,recordVerified,clearAccountSessions,validateHome}=require('../electron/accounts.cjs');
const {TaskStore,PROFILES}=require('../electron/core.cjs');
test('account CRUD keeps live array references, credentials, configuration and historical task identities',async()=>{
 const old=structuredClone(CONFIG.profiles),initial=JSON.parse(fs.readFileSync(fixture.configPath));
 const accounts=path.join(fixture.root,'new-accounts');const added=saveAccount({provider:'Codex',name:'Second account'},accounts);
 assert.equal(PROFILES,CONFIG.profiles);assert.ok(PROFILES.some(p=>p.id===added.id));assert.equal(added.disabled,true);assert.equal(added.connectionState,'pending');assert.ok(fs.statSync(added.home).isDirectory());assert.equal(loadConfig().profiles.length,old.length+1);
 assert.deepEqual(JSON.parse(fs.readFileSync(fixture.configPath)).assistant,initial.assistant);assert.throws(()=>setEnabled(added.id,true),/登录/);
 fs.writeFileSync(path.join(added.home,'auth.json'),'DO NOT READ OR CHANGE');
 assert.throws(()=>saveAccount({provider:'Claude',name:'Collision',home:added.home},accounts),/其他账号/);
 assert.throws(()=>validateHome(path.join(process.env.USERPROFILE,'.codex'),null),/Codex/);
 assert.throws(()=>saveAccount({provider:'Codex',name:'Executable spoof',executable:process.execPath},accounts),/官方 CLI/);
 recordVerified(added.id,{email:'owner@example.com'});const connected=accountList().profiles.find(p=>p.id===added.id);assert.equal(connected.disabled,false);assert.throws(()=>recordVerified(added.id,{email:'other@example.com'}),/身份不一致/);
 const updated=saveAccount({...connected,name:'Renamed account'},accounts);assert.equal(updated.home,added.home);assert.equal(updated.id,added.id);assert.throws(()=>saveAccount({...connected,name:'Lost update'},accounts),/其他窗口/);
 const store=new TaskStore(path.join(fixture.root,'task-history')),task=store.create({title:'History',profile:added.id});task.sessions={[added.id]:'old-native-session'};store.save(task);setEnabled(added.id,false);assert.equal(store.get(task.id).profile,added.id);assert.throws(()=>store.create({title:'Disabled',profile:added.id}),/尚未启用/);clearAccountSessions(store,added.id);assert.deepEqual(store.get(task.id).sessions,{});assert.equal(fs.readFileSync(path.join(added.home,'auth.json'),'utf8'),'DO NOT READ OR CHANGE');setEnabled(added.id,true);
 saveProfiles(old);
});
test('reauthorization holds an account until verified and remembers an explicit disabled state',()=>{
 const {prepareLogin}=require('../electron/accounts.cjs');const old=structuredClone(CONFIG.profiles),id=old[0].id;
 prepareLogin(id);assert.equal(CONFIG.profiles[0].disabled,true);assert.equal(CONFIG.profiles[0].loginRequired,true);assert.throws(()=>setEnabled(id,true),/登录/);prepareLogin(id);recordVerified(id,{email:'owner@example.com'});assert.equal(CONFIG.profiles[0].disabled,false);assert.equal(CONFIG.profiles[0].loginRequired,undefined);setEnabled(id,false);prepareLogin(id);recordVerified(id,{email:'owner@example.com'});assert.equal(CONFIG.profiles[0].disabled,true);saveProfiles(old);
});
test('external account configuration edits are not silently overwritten',()=>{
 const original=fs.readFileSync(fixture.configPath,'utf8');const changed=JSON.parse(original);changed.profiles[0].name='Changed outside app';fs.writeFileSync(fixture.configPath,JSON.stringify(changed));try{assert.throws(()=>saveProfiles(CONFIG.profiles),/外部改变/);assert.equal(JSON.parse(fs.readFileSync(fixture.configPath)).profiles[0].name,'Changed outside app');}finally{fs.writeFileSync(fixture.configPath,original);}
});
test('browser login accepts only provider OAuth URLs and cancellation waits for native process exit',async()=>{
 const {officialLoginUrl}=require('../electron/account-providers.cjs'),{startAccountLogin}=require('../electron/account-login.cjs');
 assert.equal(officialLoginUrl('Codex','https://auth.openai.com.evil.test/oauth/authorize?state=x'),null);assert.equal(officialLoginUrl('Claude','https://claude.ai/oauth/authorize'),null);assert.equal(officialLoginUrl('Grok','file:///auth.x.ai/authorize?state=x'),null);
 assert.equal(officialLoginUrl('Claude','https://claude.com/cai/oauth/authorize?state=x'),'https://claude.com/cai/oauth/authorize?state=x');
 assert.equal(officialLoginUrl('Claude','https://claude.com/cai/oauth/authorize/other?state=x'),null);
 for(const [provider,url]of [['Codex','https://auth.openai.com/oauth/authorize?state=x'],['Claude','https://claude.ai/oauth/authorize?state=x'],['Claude','https://claude.com/cai/oauth/authorize?state=x'],['Grok','https://auth.x.ai/oauth2/authorize?state=x']]){
  const proc=new EventEmitter();proc.stdout=new EventEmitter();proc.stderr=new EventEmitter();let killed=false,captured,opened;proc.kill=()=>{killed=true;setImmediate(()=>proc.emit('close',null));};
  const login=startAccountLogin({provider},fixture.root,value=>opened=value,{spawn:(exe,args,options)=>{captured={exe,args,options};return proc;},executable:()=>provider.toLowerCase()+'.exe',childEnv:()=>({isolated:'yes'}),timeoutMs:5000});
  const half=Math.floor(url.length/2);proc.stdout.emit('data',url.slice(0,half));assert.equal(opened,undefined);proc.stdout.emit('data',url.slice(half)+'\n');assert.equal(opened,url);assert.equal(captured.options.windowsHide,true);assert.equal(captured.args.includes('--with-api-key'),false);assert.equal(captured.args.includes('--console'),false);await login.cancel();assert.equal(killed,true);assert.deepEqual(await login.completed,{cancelled:true});
 }
});
