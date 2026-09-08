const { contextBridge, ipcRenderer } = require('electron');
const methods = ['goalAction','answerQuestion','renameAccount','savePlan','planAction','relayPreferences','authorHomepage','accounts','saveAccount','enableAccount','verifyAccount','accountInstall','pickAccountFile','startAccountLogin','copyAccountLogin','submitAccountLoginCode','cancelAccountLogin','taskMenu','taskAction','preferences','cancelQueued','retryQueued','addImages','imageThumbnail','preview','savePreview','defaultMode','validateApps','loginGemini','openTaskStorage','stopAndContinue','language','resetCredit','models','modelSettings','init','task','create','pickDirectory','theme','scan','quota','run','switch','stop','approve','update','reconcile','openWorkspace','export'];
contextBridge.exposeInMainWorld('prism', {
  saveDrafts(value){const result=ipcRenderer.sendSync('prism:saveDrafts',value);if(result!==true)throw Error(result?.error||'草稿保存失败');return true;},
  ...Object.fromEntries(['updateStatus','checkUpdates','prepareUpdate','installUpdate','automaticUpdates','updateHealthy'].map(method=>[method,(...args)=>ipcRenderer.invoke('prism:'+method,...args)])),
  ...Object.fromEntries(methods.map(method => [method, (...args) => ipcRenderer.invoke('prism:' + method, ...args)])),
  subscribe(fn) { const listener = (_event, data) => fn(data); ipcRenderer.on('prism:event', listener); return () => ipcRenderer.removeListener('prism:event', listener); }
});
