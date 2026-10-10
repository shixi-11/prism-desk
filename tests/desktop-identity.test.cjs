const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {register}=require('../electron/desktop-identity.cjs');
function fixture(t,packaged=true){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-shortcuts-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const target=packaged?path.join(root,'install','Prism.exe'):path.join(root,'runtime','desktop','Prism.exe');
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,'fixture');
 const directories={exe:target,desktop:path.join(root,'desktop'),appData:path.join(root,'roaming'),userData:path.join(root,'data')};
 const menu=path.join(directories.appData,'Microsoft','Windows','Start Menu','Programs');
 for(const directory of [menu,directories.desktop])fs.mkdirSync(directory,{recursive:true});
 const calls=[];
 const app={isPackaged:packaged,getPath:key=>directories[key],setAsDefaultProtocolClient:()=>true};
 const shell={readShortcutLink:file=>JSON.parse(fs.readFileSync(file,'utf8')),writeShortcutLink:(file,operation,options)=>{calls.push({file,operation});fs.writeFileSync(file,JSON.stringify(options));return true;}};
 const link=(directory,name,executable=target,args=packaged?'':`"${root}" --user-data-dir="${directories.userData}"`)=>{const file=path.join(directory,name+'.lnk');fs.writeFileSync(file,JSON.stringify({target:executable,args}));return file;};
 return {root,target,directories,menu,app,shell,link,calls};
}
test('switching languages renames only this installation shortcuts and preserves their executable and identity',t=>{
 const f=fixture(t);f.link(f.menu,'Prism Desk');f.link(f.directories.desktop,'Prism Desk');
 const key='Software\\ec73b2ef-1373-40bd-840e-c3ed2c87cc42';fs.writeFileSync(path.join(path.dirname(f.target),'prism-install-key.txt'),key);
 const registry=[];const exec=(executable,args,options)=>registry.push({executable,args,options});
 for(const [language,name] of [['zh','棱镜'],['en','Prism']]){
  register(f.app,f.shell,f.root,language,exec);
  for(const directory of [f.menu,f.directories.desktop]){
   assert.deepEqual(fs.readdirSync(directory),[name+'.lnk']);
   const shortcut=f.shell.readShortcutLink(path.join(directory,name+'.lnk'));
   assert.equal(shortcut.target,f.target);assert.equal(shortcut.appUserModelId,'org.prismdesk.desktop');
  }
 }
 assert.deepEqual(registry.map(call=>call.args[7]),['棱镜','2052','Prism','1033']);
 assert.ok(registry.every(call=>call.executable==='reg.exe'&&call.args[1]==='HKCU\\'+key&&call.options.windowsHide));
});
test('deleted shortcuts are not recreated and unrelated shortcut names are left intact',t=>{
 const f=fixture(t);register(f.app,f.shell,f.root,'zh',()=>assert.fail('No installer registry marker'));
 assert.equal(f.calls.length,0);
 const old=f.link(f.menu,'Prism Desk');const other=f.link(f.directories.desktop,'棱镜',path.join(f.root,'other','Prism.exe'));
 const original=fs.readFileSync(other,'utf8');
 register(f.app,f.shell,f.root,'zh',()=>assert.fail('A conflicting name must not change uninstall metadata'));
 assert.ok(fs.existsSync(old));assert.equal(fs.readFileSync(other,'utf8'),original);assert.equal(f.calls.length,0);
});
test('source edition retains its arguments and never adopts shortcuts from another checkout',t=>{
 const f=fixture(t,false);const other=f.link(f.directories.desktop,'棱镜',f.target,`"${f.root}-other"`);const original=fs.readFileSync(other,'utf8');
 register(f.app,f.shell,f.root,'en');
 const shortcut=f.shell.readShortcutLink(path.join(f.menu,'Prism.lnk'));
 assert.equal(shortcut.args,`"${f.root}" --user-data-dir="${f.directories.userData}"`);
 assert.equal(fs.readFileSync(other,'utf8'),original);
});
test('an alternate path to the same installed executable still owns its existing shortcuts',t=>{
 const f=fixture(t);f.link(f.menu,'Prism Desk');f.link(f.directories.desktop,'Prism Desk');
 const alias=path.join(f.root,'alias-install');fs.symlinkSync(path.dirname(f.target),alias,'junction');
 const original=f.app.getPath;f.app.getPath=key=>key==='exe'?path.join(alias,'Prism.exe'):original(key);
 register(f.app,f.shell,f.root,'zh',()=>{});
 for(const folder of [f.menu,f.directories.desktop])assert.deepEqual(fs.readdirSync(folder),['棱镜.lnk']);
});
