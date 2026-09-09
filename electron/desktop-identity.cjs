const fs=require('node:fs'),path=require('node:path');
const appId=test=>test?'org.prismdesk.test':'org.prismdesk.desktop';
function register(app,shell,root){
 const target=path.join(root,'runtime','desktop','Prism.exe');
 if(!fs.existsSync(target))return;
 const options={target,cwd:root,args:`"${root}" --user-data-dir="${app.getPath('userData')}"`,description:'棱镜 · Prism',icon:target,iconIndex:0,appUserModelId:appId(false)};
 const menu=path.join(app.getPath('appData'),'Microsoft','Windows','Start Menu','Programs','棱镜.lnk');
 fs.mkdirSync(path.dirname(menu),{recursive:true});
 if(!shell.writeShortcutLink(menu,'create',options))throw Error('Could not register Prism in the Start menu.');
 const desktop=path.join(app.getPath('desktop'),'棱镜.lnk');
 if(fs.existsSync(desktop)){
  const previous=shell.readShortcutLink(desktop);
  if(path.basename(previous.target).toLowerCase()==='prism.exe'&&!shell.writeShortcutLink(desktop,'update',options))throw Error('Could not update the Prism shortcut.');
 }
}
module.exports={appId,register};
