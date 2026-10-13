const fs=require('node:fs'),path=require('node:path');
const appId=test=>test?'org.prismdesk.test':'org.prismdesk.desktop';
function register(app,shell,root,language='zh',execFileSync=require('node:child_process').execFileSync){
 const legacy=path.join(root,'runtime','desktop','Prism.exe'),launcher=path.join(root,'runtime','PrismLauncher.exe');
 const sourceRuntime=!app.isPackaged||path.resolve(app.getPath('exe')).toLowerCase()===path.resolve(legacy).toLowerCase();
 const packaged=!sourceRuntime;
 const useLauncher=sourceRuntime&&fs.existsSync(launcher);
 const target=packaged?app.getPath('exe'):useLauncher?launcher:legacy;
 if(!fs.existsSync(target))return;
 const registered=packaged?app.setAsDefaultProtocolClient(require('./task-links.cjs').scheme):app.setAsDefaultProtocolClient(require('./task-links.cjs').scheme,target,[root,'--user-data-dir='+app.getPath('userData')]);
 if(!registered)throw Error('Could not register Prism task links.');
 const name=require('./branding.cjs').name(language);
 const options={target,cwd:packaged?path.dirname(target):root,args:packaged?'':`"${root}" --user-data-dir="${app.getPath('userData')}"`,description:name,icon:target,iconIndex:0,appUserModelId:appId(false)};
 const identity=value=>{try{return fs.realpathSync.native(value).toLowerCase();}catch{return path.resolve(value).toLowerCase();}};
 const same=(a,b)=>identity(a)===identity(b);
 const owned=file=>{try{const previous=shell.readShortcutLink(file),args=previous.args||'';return (same(previous.target,target)||(!packaged&&same(previous.target,legacy)))&&(packaged||!args.trim()||args.startsWith(`"${root}" `)||useLauncher&&same(previous.target,launcher)&&args.startsWith('--user-data-dir='));}catch{return false;}};
 if(useLauncher)options.args=`--user-data-dir="${app.getPath('userData')}"`;
 const updates=[];
 for(const [directory,create] of [[path.join(app.getPath('appData'),'Microsoft','Windows','Start Menu','Programs'),!packaged],[app.getPath('desktop'),false]]){
  const aliases=['棱镜','Prism','Prism Desk'].map(n=>path.join(directory,n+'.lnk'));
  const previous=aliases.filter(file=>fs.existsSync(file)&&owned(file));
  const destination=path.join(directory,name+'.lnk');
  // Leave names and uninstall metadata together when a different app owns this name.
  if(fs.existsSync(destination)&&!owned(destination))return;
  if(!previous.length&&!create)continue;
  updates.push({directory,destination,previous});
 }
 for(const {directory,destination,previous} of updates){
  fs.mkdirSync(directory,{recursive:true});
  if(!shell.writeShortcutLink(destination,fs.existsSync(destination)?'update':'create',options))throw Error('Could not update the Prism shortcut.');
  for(const file of previous)if(!same(file,destination))fs.unlinkSync(file);
 }
 if(packaged){
  let key;try{key=fs.readFileSync(path.join(path.dirname(target),'prism-install-key.txt'),'utf8').trim();}catch{return;}
  if(!/^Software\\[a-f0-9-]{36}$/i.test(key))return;
  for(const [value,data] of [['ShortcutName',name],['InstallerLanguage',language==='zh-TW'?'1028':name==='棱镜'?'2052':'1033']])execFileSync('reg.exe',['add','HKCU\\'+key,'/v',value,'/t','REG_SZ','/d',data,'/f','/reg:64'],{windowsHide:true,stdio:'ignore',timeout:5000});
 }
}
module.exports={appId,register};
