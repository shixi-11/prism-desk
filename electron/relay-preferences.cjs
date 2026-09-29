function pauseAccount(store,runner,profiles,id,accountId,paused){
 if(typeof paused!=='boolean'||!profiles.some(p=>p.id===accountId))throw Error('接续账号无效');
 const task=runner.activeFor(id)?.task||store.get(id);
 const ids=new Set(task.relayPaused||[]);if(paused)ids.add(accountId);else ids.delete(accountId);
 task.relayPaused=[...ids];store.save(task);return task;
}
module.exports={pauseAccount};
