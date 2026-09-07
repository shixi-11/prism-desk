const { contextBridge, ipcRenderer } = require('electron');
const methods = ['preferences','cancelQueued','retryQueued','addImages','imageThumbnail','preview','savePreview','defaultMode','validateApps','loginGemini','openTaskStorage','stopAndContinue','language','resetCredit','models','modelSettings','init','task','create','pickDirectory','theme','scan','quota','run','switch','stop','approve','update','reconcile','openWorkspace','export'];
contextBridge.exposeInMainWorld('prism', {
  ...Object.fromEntries(methods.map(method => [method, (...args) => ipcRenderer.invoke('prism:' + method, ...args)])),
  subscribe(fn) { const listener = (_event, data) => fn(data); ipcRenderer.on('prism:event', listener); return () => ipcRenderer.removeListener('prism:event', listener); }
});
