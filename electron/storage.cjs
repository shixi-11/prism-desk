const fs=require('node:fs'),path=require('node:path');
function taskRoot(appPath,userData,testRoot=process.env.PRISM_TEST_DATA){
 if(testRoot)return path.join(testRoot,'tasks');
 const target=require('./config.cjs').CONFIG.storageRoot || path.join(userData,'tasks'),legacy=path.join(userData,'tasks');fs.mkdirSync(target,{recursive:true});
 // A default installation already stores tasks in userData; never copy a
 // directory onto itself, including aliases that resolve to the same location.
 if(fs.existsSync(legacy) && fs.realpathSync.native(target).toLowerCase()===fs.realpathSync.native(legacy).toLowerCase())return target;
 if(fs.existsSync(legacy))for(const id of fs.readdirSync(legacy)){
  if(!/^[a-f0-9-]{36}$/.test(id))continue;
  const source=path.join(legacy,id),dest=path.join(target,id),staging=dest+'.migrating';
  if(fs.existsSync(dest)||!fs.statSync(source).isDirectory())continue;
  // Keep the legacy source. A completed rename is the migration checkpoint;
  // incomplete staging is recopied on restart, never merged into a live task.
  fs.cpSync(source,staging,{recursive:true,force:true});
  JSON.parse(fs.readFileSync(path.join(staging,'task.json'),'utf8'));
  fs.renameSync(staging,dest);
 }
 return target;
}
module.exports={taskRoot};
