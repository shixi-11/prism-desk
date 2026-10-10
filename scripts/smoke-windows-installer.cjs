const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
// This test installs and uninstalls the actual product. Never run it on a user's machine.
if(process.platform!=='win32'||process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Windows')throw Error('Run this installer test only in an isolated GitHub Windows runner.');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-install-smoke-'));
const target=path.join(root,'installed'),installer=path.resolve('.local/installer/Prism-Setup.exe');
const key='HKCU\\Software\\0b23aefc-8206-53c0-8157-4e63e2549a41';
const userData=path.join(process.env.APPDATA,'Prism');
const reg=args=>cp.execFileSync('reg.exe',args,{encoding:'utf8',windowsHide:true,timeout:10000});
if(fs.existsSync(userData)||cp.spawnSync('reg.exe',['query',key,'/reg:64'],{windowsHide:true,stdio:'ignore'}).status===0)throw Error('Installer smoke requires a clean runner without an existing Prism installation.');
const menu=path.join(process.env.APPDATA,'Microsoft','Windows','Start Menu','Programs');
const desktop=path.join(os.homedir(),'Desktop');
const preserved=new Map();
for(const relative of ['settings.json','config.json','drafts/primary.json','tasks/fixture/task.json','accounts/fixture/auth.json']){
 const file=path.join(userData,relative);fs.mkdirSync(path.dirname(file),{recursive:true});
 const content=JSON.stringify({fixture:'installer preservation check',language:'en'});fs.writeFileSync(file,content);preserved.set(file,content);
}
function assertData(){for(const [file,content] of preserved)assert.equal(fs.readFileSync(file,'utf8'),content,'Installation and default uninstall must keep user data');}
(async()=>{
 for(const [code,name] of [['2052','棱镜'],['1033','Prism'],['1028','棱镜']]){
  reg(['add',key,'/v','InstallerLanguage','/t','REG_SZ','/d',code,'/f','/reg:64']);
  cp.execFileSync(installer,['/S','/D='+target],{stdio:'inherit',windowsHide:true,timeout:180000});
  assert.equal(fs.readFileSync(path.join(target,'prism-install-language.txt'),'utf8').trim(),code,'Silent upgrade must read the saved installer language from the x64 registry');
  assert.equal(fs.readFileSync(path.join(target,'prism-install-key.txt'),'utf8').trim(),key.slice(5));
  // reg query loses Chinese text on an English Windows console; .reg exports use UTF-16.
  const registryExport=path.join(root,'installed.reg');
  reg(['export',key,registryExport,'/y']);
  assert.ok(fs.readFileSync(registryExport,'utf16le').includes(`"ShortcutName"="${name}"`),'The installed registry name must match the selected language');
  for(const folder of [menu,desktop]){
   assert.ok(fs.existsSync(path.join(folder,name+'.lnk')),'The selected language must name the actual installed shortcut');
   for(const alias of ['棱镜','Prism','Prism Desk'])if(alias!==name)assert.ok(!fs.existsSync(path.join(folder,alias+'.lnk')),'An upgrade must not leave duplicate shortcuts');
  }
  assertData();
 }
 cp.execFileSync(process.execPath,['scripts/smoke-packaged.cjs',path.join(target,'Prism.exe'),'--metadata',path.resolve('.local/installer/metadata.json')],{stdio:'inherit',windowsHide:true,timeout:180000});
 cp.execFileSync(path.join(target,'Uninstall Prism.exe'),['/S'],{stdio:'inherit',windowsHide:true,timeout:180000});
 const deadline=Date.now()+30000;
 while((fs.existsSync(path.join(target,'Prism.exe'))||[menu,desktop].some(folder=>fs.existsSync(path.join(folder,'棱镜.lnk'))))&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,200));
 assert.ok(!fs.existsSync(path.join(target,'Prism.exe')),'Uninstaller must remove its own program');
 for(const folder of [menu,desktop])assert.ok(!fs.existsSync(path.join(folder,'棱镜.lnk')),'Uninstaller must remove the localized shortcut');
 assertData();
 console.log('Verified three installer languages, shortcut upgrades, real app startup, and data-preserving uninstall.');
})().catch(error=>{console.error(error.stack);console.error(JSON.stringify({status:error.status,signal:error.signal,code:error.code,installed:fs.existsSync(target)?fs.readdirSync(target):[],stdout:error.stdout?.toString(),stderr:error.stderr?.toString()}));process.exitCode=1;});
