const fs=require('node:fs'),path=require('node:path');
function purgeTargets(store,ids,isBusy=()=>false){
 return [...new Set(ids)].map(id=>{const task=store.get(id,true);if(!task.deletedAt||isBusy(id)||['running','stopping','unknown'].includes(task.state))throw Error('只能彻底删除已停止且已删除的任务。');
  const target=path.resolve(store.dir(id)),root=fs.realpathSync.native(store.root);if(fs.lstatSync(target).isSymbolicLink()||path.dirname(fs.realpathSync.native(target))!==root)throw Error('任务目录超出删除范围。');return {id,target};});
}
function withoutPurged(value,ids){const result={...value};for(const id of ids){delete result[id];if(result._selected===id)result._selected=null;}return result;}
async function purgeTargetsOnDisk(targets){for(const {target} of targets)await fs.promises.rm(target,{recursive:true,force:false});}
module.exports={purgeTargets,withoutPurged,purgeTargetsOnDisk};
