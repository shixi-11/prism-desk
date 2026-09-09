const { app, BrowserWindow, ipcMain, dialog, shell, Menu, clipboard, Tray } = require("electron");
const updateBootstrap=require('./update-bootstrap.cjs');
const callers=new (require('node:async_hooks').AsyncLocalStorage)();
const windows=new Set();
const owner=()=>callers.getStore()||[...windows][0];
const path = require("node:path");
const fs = require("node:fs");
const {
  TaskStore,
  PROFILES,
  capabilities,
  accountStatus,
  atomic,
} = require("./core.cjs");
const { Runner } = require("./runner.cjs");
const { isSupportedLanguage, translate, directoryDialog, resetCreditDialog } = require('./localization.cjs');
app.setName("棱镜");
app.setAppUserModelId("org.prismdesk.app");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
if (process.env.PRISM_TEST_HIDE) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("force-device-scale-factor", "1");
}
if (process.env.PRISM_TEST_DATA)
  app.setPath("userData", process.env.PRISM_TEST_DATA);
const primaryInstance=app.requestSingleInstanceLock();
if (!primaryInstance) app.quit();
const bootstrapError=primaryInstance?updateBootstrap.bootstrap(app,path.resolve(__dirname,'..')):null;
let window, store, runner, messageQueue, quotaDisplay;
let tray,quitting=false,quitPending=false;
let updater,updateInstalling=false,operations=0;
async function quitPrism(){
 if(quitPending)return;quitPending=true;if(messageQueue)messageQueue.paused=true;
 try{
   if(runner?.active){
     const idle=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{runner.off('idle',done);reject(Error('任务尚未停止，请稍后再退出'));},30000);const done=()=>{clearTimeout(timer);resolve();};runner.once('idle',done);});
     idle.catch(()=>{});delete runner.active.requestedHandoff;
     await runner.stop();await idle;
   }
   await Promise.allSettled([...accountLogins.values()].map(login=>login.cancel()));
   quitting=true;tray?.destroy();app.quit();
 }catch(e){quitPending=false;if(messageQueue)messageQueue.paused=false;showWindow();emit('error',e.message);}
}
function showWindow(){
  window=owner();
  if(!window||window.isDestroyed())return;
  if(window.isMinimized())window.restore();
  window.show();
  window.focus();
}
app.on('second-instance',showWindow);
app.on('activate',showWindow);
let resetInProgress=false;
let geminiLogin=null;
const accountLogins=new Map(),accountLoginStates=new Map();
let accountOperation=false;
let accountQueries=0;
let validatingApps=false;
const dataPath = () => app.getPath("userData");
const emit = (type, value) => {
  if(type==='quota'&&quotaDisplay){quotaDisplay.save(value);value=quotaDisplay.values[value.id];}
  for(const win of windows)if(!win.isDestroyed())win.webContents.send("prism:event", { type, value });
};
function settings() {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(dataPath(), "settings.json"), "utf8"),
    );
  } catch {
    return { theme: "system" };
  }
}
function handle(method, fn) {
  ipcMain.handle("prism:" + method, async (event, ...args) => {
    if (
      ![...windows].some(win=>win.webContents===event.sender) ||
      event.senderFrame !== event.sender.mainFrame
    )
      throw Error("非法调用来源");
    if(updateInstalling&&!['updateStatus'].includes(method))throw Error('正在切换新版，请稍候');
    operations++;
    try{return await callers.run(BrowserWindow.fromWebContents(event.sender),()=>fn(...args));}finally{operations--;}
  });
}
app.whenReady().then(() => {
  if(!primaryInstance)return;
  store = new TaskStore(require('./storage.cjs').taskRoot(app.getAppPath(),dataPath()));
  store.recover();
  quotaDisplay=new (require('./quota-display.cjs').QuotaDisplay)(dataPath());
  const draftFile=win=>path.join(dataPath(),'drafts',win.draftKey+'.json');
  ipcMain.on('prism:saveDrafts',(event,value)=>{
    try{const win=[...windows].find(w=>w.webContents===event.sender);if(!win||event.senderFrame!==event.sender.mainFrame)throw Error('非法调用来源');
      const encoded=JSON.stringify(value);if(encoded.length>4*1024*1024||!value||typeof value!=='object'||Array.isArray(value))throw Error('草稿过大');
      updateBootstrap.write(draftFile(win),value);event.returnValue=true;
    }catch(error){event.returnValue={error:error.message};}
  });
  runner = new Runner(store);
  updater=new (require('./updater.cjs').Updater)(app.getAppPath(),process.env.PRISM_TEST_DATA?{root:path.join(dataPath(),'installation')}:{ });
  updater.on('change',value=>emit('app-update',value));
  if(bootstrapError){updater.state.status='error';updater.state.error=bootstrapError;}
  updater.current().then(current=>updater.set({current,...(updater.state.latest===current?{status:'current'}:{})})).catch(()=>{});
  messageQueue=new (require('./message-queue.cjs').MessageQueue)(store,runner,path.join(dataPath(),'message-queue.json'));
  messageQueue.on('change',items=>emit('queue',items));
  messageQueue.on('failure',error=>emit('error',error.message));
  // A plan may run directly outside the queue. Wake queued tasks afterwards;
  // defer until the runner has had a chance to begin a requested handoff.
  runner.on('idle',()=>queueMicrotask(()=>messageQueue.pump()));
  for (const type of ["event", "delta", "state", "idle", "approval", "quota", "approval-reset", "reasoning", "activity"])
    runner.on(type, (value) => emit(type, value));
  handle("init", () => ({
    appUpdate:updater.snapshot(),
    drafts:updateBootstrap.read(draftFile(owner()),{}),
    tasks: store.list(),
    archivedTasks:store.list('archived'),deletedTasks:store.list('deleted'),
    accountLogins:Object.fromEntries(accountLoginStates),
    quotas:quotaDisplay.snapshot(PROFILES),
    profiles: PROFILES.map(({ home, executable, ...p }) => p),
    settings: settings(),
    queue:messageQueue.items,
    taskStorage:store.root,
    capabilities: capabilities(),
    approvals: runner.active
      ? [...runner.active.pending.values()].map((m) => ({
          taskId: runner.active.task.id,
          id: String(m.id),
          method: m.method,
          params: m.params,
        }))
      : [],
  }));
  const broadcastTasks=()=>emit('task-list',{tasks:store.list(),archivedTasks:store.list('archived'),deletedTasks:store.list('deleted')});
  const updateBusy=()=>runner.active||messageQueue.running||messageQueue.items.some(i=>['waiting','sending'].includes(i.status))||accountOperation||accountQueries||resetInProgress||accountLogins.size||geminiLogin||validatingApps||quitPending||store.list().some(t=>['running','stopping','unknown'].includes(t.state));
  async function installUpdate(automatic=false){
    if(updateInstalling||updateBusy()||operations>(automatic?0:1))throw Error('等待任务和账号操作结束后更新');
    updateInstalling=true;messageQueue.paused=true;
    const opened=[...windows].filter(w=>!w.isDestroyed());
    const token=require('node:crypto').randomUUID(),deadline=Date.now()+5000;
    try{
      const ready=await Promise.allSettled(opened.map(w=>Promise.race([w.webContents.executeJavaScript(`window.__prismPrepareUpdate?.(${automatic},${JSON.stringify(token)},${deadline}) === true`),new Promise(resolve=>setTimeout(()=>resolve(false),5000))])));
      if(!opened.length||ready.some(v=>v.status!=='fulfilled'||!v.value)||updateBusy())throw Error('请保存并关闭编辑窗口，空闲后将自动更新');
      updateBootstrap.write(path.join(dataPath(),'update-windows.json'),opened.map(w=>({key:w.draftKey,hidden:!w.isVisible(),bounds:w.getBounds()})));
      const target=await updater.activate();
      app.relaunch({execPath:path.join(target,'runtime','desktop','Prism.exe'),args:[target,'--user-data-dir='+dataPath()]});
      quitting=true;tray?.destroy();app.quit();
    }catch(error){updateInstalling=false;messageQueue.paused=false;try{updater.cancelActivation();}catch{}const layoutFile=path.join(dataPath(),'update-windows.json');try{if(fs.existsSync(layoutFile))fs.unlinkSync(layoutFile);}catch{}for(const w of opened)if(!w.isDestroyed())w.webContents.executeJavaScript(`window.__prismCancelUpdate?.(${JSON.stringify(token)})`).catch(()=>{});messageQueue.pump();throw error;}
  }
  handle('updateStatus',()=>updater.snapshot());
  handle('updateHealthy',()=>{if(!process.env.PRISM_TEST_DATA)updateBootstrap.healthy(app.getAppPath());return true;});
  handle('checkUpdates',()=>updater.check());
  handle('prepareUpdate',()=>updater.prepare());
  handle('automaticUpdates',value=>updater.automatic(value));
  handle('installUpdate',()=>installUpdate(false));
  let autoUpdating=false,lastAutoCheck=0;
  async function autoUpdate(){
    if(autoUpdating||updateInstalling||!updater.state.automatic)return;autoUpdating=true;
    try{
      if(Date.now()-lastAutoCheck>4*60*60*1000){lastAutoCheck=Date.now();await updater.check();}
    }catch{}finally{autoUpdating=false;}
  }
  if(!process.env.PRISM_TEST_DATA){setTimeout(autoUpdate,60000).unref();setInterval(autoUpdate,30000).unref();}
  const publicProfiles=()=>PROFILES.map(({home,executable,...p})=>p);
  const broadcastAccounts=()=>emit('accounts',publicProfiles());
  const assertAccountIdle=()=>{if(runner.active||accountOperation||accountQueries||resetInProgress||store.list().some(t=>['running','stopping','unknown'].includes(t.state)))throw Error('请等待当前执行或账号操作结束。');};
  const loginState=(id,state)=>{const value={id,...state};accountLoginStates.set(id,value);emit('account-login',value);};
  const verifyAccount=async id=>{const status=await require('./core.cjs').accountStatus(id,app.getAppPath());require('./accounts.cjs').recordVerified(id,status);broadcastAccounts();emit('quota',{id,...status});return status;};
  handle('accounts',()=>require('./accounts.cjs').accountList());
  handle('answerQuestion',(id,requestId,answers)=>require('./questions.cjs').answer(runner,id,requestId,answers));
  handle('renameAccount',(id,name)=>{const result=require('./accounts.cjs').renameAccount(id,name);broadcastAccounts();return result;});
  handle('savePlan',(id,input)=>require('./task-plan.cjs').save(store,runner,id,input));
  handle('goalAction',(id,action,revision)=>{
    if(action==='resume'&&(accountOperation||validatingApps||resetInProgress))throw Error('请等待账号或应用操作结束。');
    return require('./goal-actions.cjs').act(store,runner,messageQueue,id,action,revision);
  });
  handle('relayPreferences',(id,order)=>{if(!Array.isArray(order)||new Set(order).size!==order.length||order.some(id=>!PROFILES.some(p=>p.id===id)))throw Error('接续顺序无效');const task=runner.active?.task.id===id?runner.active.task:store.get(id);task.relayOrder=order;store.save(task);emit('state',task);return task;});
  handle('planAction',(id,action,revision)=>{
    const task=store.get(id);runner.assertIdle(task);
    if(task.goalLifecycle?.status==='paused')throw Error('目标已暂停，请先继续目标。');
    if(accountOperation||validatingApps||resetInProgress||messageQueue.running||messageQueue.items.some(i=>i.taskId===id&&i.status==='waiting'))throw Error('请等待当前执行结束。');
    if(revision!==task.workPlan?.revision)throw Error('计划已更新，请重新打开后编辑');
    if(action==='draft'){
      if(!task.workPlan?.goal)throw Error('请先设置目标');
      runner.run(id,'请依据已保存的目标和当前项目，只制订计划，不实施。列出可执行步骤及验收条件，等待我确认。',[],{planning:true}).catch(e=>emit('error',e.message));
    }else if(action==='execute'){
      if(!task.workPlan?.steps?.length)throw Error('请先保存计划步骤');
      task.planReviewRequired=false;task.planApproved=task.workPlan.revision;store.save(task);
      messageQueue.enqueue(id,'我已确认保存的目标和计划。请按计划继续执行，先核对现有成果，避免重复成功操作。');
    }else throw Error('计划操作无效');
    return store.get(id);
  });
  handle('authorHomepage',()=>shell.openExternal('https://shixilin.com/'));
  handle('projectRepository',()=>shell.openExternal('https://github.com/shixi-11/prism-desk'));
  handle('saveAccount',input=>{assertAccountIdle();const result=require('./accounts.cjs').saveAccount(input,path.join(dataPath(),'accounts'));broadcastAccounts();return result;});
  handle('enableAccount',(id,enabled)=>{assertAccountIdle();if(typeof enabled!=='boolean')throw Error('账号设置无效。');const result=require('./accounts.cjs').setEnabled(id,enabled);broadcastAccounts();return result;});
  handle('verifyAccount',async id=>{assertAccountIdle();accountOperation=true;messageQueue.paused=true;try{return await verifyAccount(id);}finally{accountOperation=false;messageQueue.paused=false;messageQueue.pump();}});
  handle('accountInstall',provider=>shell.openExternal(require('./account-providers.cjs').providerFor(provider).installUrl));
  handle('pickAccountFile',async kind=>{if(!['directory','executable'].includes(kind))throw Error('Invalid selection');const selected=await dialog.showOpenDialog(owner(),kind==='directory'?{properties:['openDirectory']}:{properties:['openFile'],filters:[{name:'CLI',extensions:['exe']}]});return selected.canceled?null:selected.filePaths[0];});
  handle('startAccountLogin',id=>{
    assertAccountIdle();const profile=PROFILES.find(p=>p.id===id);if(!profile)throw Error('账号不存在。');
    require('./account-providers.cjs').providerFor(profile.provider);
    accountOperation=true;messageQueue.paused=true;
    try{
      require('./accounts.cjs').clearAccountSessions(store,id);
      quotaDisplay.clear(id);
      require('./accounts.cjs').prepareLogin(id);broadcastAccounts();
      loginState(id,{phase:'starting',hasUrl:false});
      const login=require('./account-login.cjs').startAccountLogin(profile,app.getAppPath(),()=>{
        loginState(id,{phase:'waiting',hasUrl:true});
      });
      accountLogins.set(id,login);
      login.completed.then(async result=>{if(result.cancelled){loginState(id,{phase:'cancelled',hasUrl:false});return;}loginState(id,{phase:'verifying',hasUrl:false});await verifyAccount(id);loginState(id,{phase:'connected',hasUrl:false});}).catch(error=>loginState(id,{phase:'error',hasUrl:false,message:error.message})).finally(()=>{accountLogins.delete(id);accountOperation=false;messageQueue.paused=false;messageQueue.pump();});
      return {id};
    }catch(error){accountOperation=false;messageQueue.paused=false;loginState(id,{phase:'error',hasUrl:false,message:error.message});messageQueue.pump();throw error;}
  });
  handle('copyAccountLogin',id=>{const login=accountLogins.get(id);const profile=PROFILES.find(p=>p.id===id);const url=profile&&login?.url&&require('./account-providers.cjs').officialLoginUrl(profile.provider,login.url);if(!url)throw Error('登录链接尚未准备好，请稍候。');clipboard.writeText(url);return {copied:true};});
  handle('submitAccountLoginCode',async(id,code)=>{const login=accountLogins.get(id);if(!login)throw Error('当前登录已结束或尚未就绪，请重新获取登录链接。');const result=await login.submitCode(code);if(accountLogins.get(id)===login&&accountLoginStates.get(id)?.phase==='waiting')loginState(id,{phase:'waiting',hasUrl:!!login.url,codeSubmitted:true});return result;});
  handle('cancelAccountLogin',async id=>{await accountLogins.get(id)?.cancel();});
  handle("task", (id) => {const task=runner.active?.task.id===id?runner.active.task:store.get(id);if(task.unread){task.unread=false;store.save(task);broadcastTasks();}return {task,events:store.events(id)};});
  handle('taskMenu',id=>new Promise(resolve=>{const task=store.get(id);let chosen=null;Menu.buildFromTemplate(require('./task-menu.cjs').taskMenuTemplate(task,store.list(),key=>translate(settings().language,key),action=>{chosen=action;},runner.active?.task.id===id||['running','stopping','unknown'].includes(task.state))).popup({window:owner(),callback:()=>resolve(chosen)});}));
  handle('taskAction',async(id,action,value)=>{
    const {manageTask,forkTask,conversationText}=require('./task-actions.cjs');
    if(['pin','unread','archive','delete','restore','project','section'].includes(action)){const task=manageTask(store,runner,messageQueue,id,action,value);broadcastTasks();return {task};}
    const task=store.get(id);
    if(action==='project-pick'){const selected=await dialog.showOpenDialog(owner(),{properties:['openDirectory']});if(selected.canceled)return {};const next=manageTask(store,runner,messageQueue,id,'project',selected.filePaths[0]);broadcastTasks();return {task:next};}
    if(action==='fork'){const fork=await forkTask(store,runner,id,!!value);broadcastTasks();return {selectId:fork.id};}
    if(action==='share'||action==='preview-conversation')return {text:conversationText(store,id),title:task.title};
    if(action==='save-conversation'){const result=await dialog.showSaveDialog(owner(),{defaultPath:task.title.replace(/[<>:"/\\|?*]/g,'_')+'.md',filters:[{name:'Markdown',extensions:['md']}]});if(!result.canceled)fs.writeFileSync(result.filePath,conversationText(store,id));return {};}
    if(action.startsWith('copy-')){const values={'copy-conversation':()=>conversationText(store,id),'copy-title':()=>task.title,'copy-id':()=>id,'copy-path':()=>task.cwd};if(!values[action])throw Error('Unsupported copy action');clipboard.writeText(values[action]());return {};}
    if(action==='open-folder'){await shell.openPath(task.cwd);return {};}
    if(action==='open-document'){const file=path.join(store.dir(id),'conversation.md');fs.writeFileSync(file,conversationText(store,id));await shell.openPath(file);return {};}
    if(action==='new-window'){makeWindow(id);return {};}
    throw Error('Unsupported task action');
  });
  handle('cancelQueued',id=>messageQueue.cancel(id));
  handle('retryQueued',id=>messageQueue.retry(id));
  handle('preferences',update=>{
    const allowed={sendShortcut:['enter','ctrl-enter'],busySend:['queue','steer']};
    for(const [key,value]of Object.entries(update))if(!allowed[key]?.includes(value))throw Error('Invalid preference');
    const next={...settings(),...update};atomic(path.join(dataPath(),'settings.json'),next);return next;
  });
  handle('addImages',async(id,inputs)=>{
    store.get(id);const {nativeImage}=require('electron');
    if(!inputs){const result=await dialog.showOpenDialog(owner(),{properties:['openFile','multiSelections'],filters:[{name:'Images',extensions:['png','jpg','jpeg','webp','gif']}]});if(result.canceled)return [];inputs=result.filePaths.map(file=>{if(fs.statSync(file).size>10*1024*1024)throw Error('图片不能超过 10 MB');return {name:path.basename(file),data:fs.readFileSync(file).toString('base64')};});}
    if(!Array.isArray(inputs)||inputs.length>5)throw Error('每条消息最多添加 5 张图片');
    return inputs.map(input=>require('./attachments.cjs').addAttachment(store.dir(id),input,nativeImage));
  });
  handle('imageThumbnail',(id,imageId)=>{store.get(id);const [image]=require('./attachments.cjs').attachmentFiles(store.dir(id),[imageId]);return require('electron').nativeImage.createFromPath(image.path).resize({width:180}).toDataURL();});
  const previewFiles=new Set();
  handle('preview',async(id,target,relativeTo)=>{
    const task=store.get(id);
    if(!target){const picked=await dialog.showOpenDialog(owner(),{properties:['openFile'],defaultPath:task.cwd});if(picked.canceled)return null;target=picked.filePaths[0];}
    const base=relativeTo&&previewFiles.has(relativeTo)?path.dirname(relativeTo):task.cwd;
    const result=await require('./preview.cjs').readPreview(target,base);if(result.path)previewFiles.add(result.path);return result;
  });
  handle('savePreview',async(file,text,version)=>{if(!previewFiles.has(file))throw Error('请先打开文件');return require('./preview.cjs').savePreview(file,text,version);});
  handle("create", async input => {
    input={...input,mode:input.mode??require('./task-settings.cjs').newTaskMode(settings(),PROFILES.find(p=>p.id===(input.profile||PROFILES.find(p=>!p.disabled)?.id)))};
    if(input.executionOptions){const list=await require('./models.cjs').modelOptions(input.profile,app.getAppPath());const m=list.models.find(m=>m.id===input.executionOptions.model);if(!m?.efforts.includes(input.executionOptions.effort))throw Error('模型或思考等级无效');}
    const task=store.create(input);if(input.executionOptions){task.modelSettings={[task.profile]:{model:input.executionOptions.model,effort:input.executionOptions.effort}};store.save(task);}broadcastTasks();return task;
  });
  handle("pickDirectory", async () => {
    const result = await dialog.showOpenDialog(owner(), directoryDialog(settings().language));
    return result.canceled ? null : result.filePaths[0];
  });
  handle("theme", (theme) => {
    if (!["system", "light", "dark"].includes(theme)) throw Error("主题无效");
    atomic(path.join(dataPath(), "settings.json"), { ...settings(), theme });
  });
  handle('language',language=>{if(!isSupportedLanguage(language))throw Error('Unsupported language');atomic(path.join(dataPath(),'settings.json'),{...settings(),language});});
  handle('defaultMode',mode=>{if(!require('./task-settings.cjs').MODES.includes(mode))throw Error('Invalid permission mode');atomic(path.join(dataPath(),'settings.json'),{...settings(),defaultMode:mode});return mode;});
  handle("scan", () => require('./diagnostics.cjs').verifyCapabilities());
  handle('validateApps',async()=>{
    if(runner.active||validatingApps)throw Error('请等待当前执行或应用验证结束');
    validatingApps=true;
    try{await require('./app-validation.cjs').validateApps();return capabilities();}finally{validatingApps=false;}
  });
  handle("quota", async(id,model) => {
    if(accountOperation)throw Error('请等待账号操作结束。');
    accountQueries++;
    try{const result=await require('./core.cjs').accountStatus(id,app.getAppPath(),model);if(result.email){require('./accounts.cjs').recordVerified(id,result);broadcastAccounts();}emit('quota',{id,...result});return result;}catch(error){const result=quotaDisplay.failure(id,error);emit('quota',result);return result;}finally{accountQueries--;}
  });
  handle('loginGemini',async()=>{
    if(geminiLogin)throw Error('Google 登录窗口已打开，请完成当前授权');
    const profile=PROFILES.find(p=>p.provider==='Gemini');
    if(runner.active?.profile.provider==='Gemini')throw Error('请等待 Gemini 当前执行结束');
    const proc=require('node:child_process').spawn(profile.executable,[path.join(app.getAppPath(),'scripts','gemini-login.cjs')],{cwd:app.getAppPath(),windowsHide:true,stdio:['ignore','pipe','pipe']});
    geminiLogin=proc;
    proc.stdout.on('data',()=>{});proc.stderr.on('data',()=>{});
    try {const code=await new Promise((resolve,reject)=>{proc.once('error',reject);proc.once('close',resolve);});return {ok:code===0,status:await accountStatus(profile.id,app.getAppPath())};}
    finally {geminiLogin=null;}
  });
  handle('resetCredit',async id=>{
    if(accountOperation)throw Error('请等待账号操作结束。');
    const profile=PROFILES.find(p=>p.id===id&&p.provider==='Codex');if(!profile)throw Error('请选择 Codex 订阅账号');
    if(runner.active||resetInProgress)throw Error('请等待当前执行或重置操作结束');
    resetInProgress=true;
    try{const answer=await dialog.showMessageBox(owner(),resetCreditDialog(settings().language,profile));if(answer.response!==1)return {outcome:'cancelled'};
      if(runner.active)throw Error('任务已经开始，请等本轮结束再使用重置卡');
      return await require('./reset-credits.cjs').consumeReset(id,app.getAppPath(),dataPath());
    }finally{resetInProgress=false;}
  });
  handle('models',id=>{if(accountOperation)throw Error('请等待账号操作结束。');return require('./models.cjs').modelOptions(id,app.getAppPath());});
  handle('modelSettings',(id,input,profileId)=>{if(accountOperation)throw Error('请等待账号操作结束。');return require('./models.cjs').updateSelectionForRunner(store,runner,id,input,profileId);});
  handle("run", async (id, text, imageIds=[], choiceEventId) => {
    if(accountOperation)throw Error('请先完成或取消账号登录。');
    if(validatingApps)throw Error('请等待本机应用验证结束');
    if(resetInProgress)throw Error('请等待重置卡操作结束');
    const task = store.get(id);
    if(PROFILES.find(p=>p.id===task.profile)?.disabled)throw Error('账号尚未启用，请先登录或选择其他账号。');
    if(choiceEventId){const source=store.events(id).find(e=>e.id===choiceEventId&&e.type==='assistant');if(!source)throw Error('这项选择已失效，请继续当前任务');if(store.events(id).some(e=>e.choiceEventId===choiceEventId))throw Error('已提交选择');}
    const images=require('./attachments.cjs').attachmentFiles(store.dir(id),imageIds);
    if(typeof text!=='string')throw Error('请填写指令。');
    if(task.goalLifecycle?.status==='paused')throw Error('目标已暂停，请先继续目标。');
    text=text.trim()||(images.length?'请查看这些图片。':'');if(!text||text.length>60000)throw Error('请输入 1–60000 字的指令。');
    if(images.length&&!['Codex','Claude'].includes(PROFILES.find(p=>p.id===task.profile)?.provider))throw Error('当前入口暂不支持图片，请选择 Codex 或 Claude');
    if(settings().busySend==='steer'&&await runner.steer(id,text,images)){if(choiceEventId)runner.event(id,'notice',{choiceEventId,text:'已提交选择 · '+text});return {steered:true};}
    const busy=!!runner.active||messageQueue.running;
    const item=messageQueue.enqueue(id,text,images,{planning:!!task.planReviewRequired});
    if(choiceEventId)runner.event(id,'notice',{choiceEventId,text:'已提交选择 · '+text});
    return {started:!busy,queued:busy,id:item.id};
  });
  handle("switch", (id, profile) => runner.switch(id, profile));
  handle('stopAndContinue', (id, profile) => runner.stopAndContinue(id, profile));
  handle('openTaskStorage', () => shell.openPath(store.root));
  handle("stop", () => runner.stop());
  handle("approve", (id, decision) => runner.approve(id, decision));
  handle("update", (id, update) => {
    if(update && Object.keys(update).length===1 && ('title' in update || 'mode' in update)){const result=require('./task-settings.cjs').updateTaskSetting(store,runner,id,update);broadcastTasks();return result;}
    const task = store.get(id);
    runner.assertIdle(task);
    if (
      typeof update.title === "string" &&
      update.title.trim() &&
      update.title.length <= 100
    )
      task.title = update.title.trim();
    if (
      typeof update.checkpoint === "string" &&
      update.checkpoint.length <= 20000
    )
      task.checkpoint = update.checkpoint;
    if (["read-only", "workspace-write"].includes(update.mode)) {
      if(update.mode==='workspace-write' && !PROFILES.find(p=>p.id===task.profile)?.write)throw Error('当前入口只支持只读研究。');
      task.mode = update.mode;
      task.sessions = {};
    }
    if(typeof update.autoSwitch==='boolean')task.autoSwitch=update.autoSwitch;
    return store.save(task);
  });
  handle("reconcile", (id) => {
    if (runner.active) throw Error("仍有执行在进行。");
    const task = store.get(id);
    if (task.activePid) {
      let live = false;
      try {
        process.kill(task.activePid, 0);
        live = true;
      } catch (e) {
        if (e.code !== "ESRCH") live = true;
      }
      if (live) throw Error("上次执行进程仍存在。请等待它结束后再解除暂停。");
    }
    if (task.state !== "unknown") return task;
    task.state = "paused";
    delete task.activePid;
    task.sessions = {};
    store.append(id, "notice", {
      text: "用户已核对执行记录和项目文件，允许从当前状态继续。",
    });
    return store.save(task);
  });
  handle("openWorkspace", (id) => shell.openPath(store.get(id).cwd));
  handle("export", async (id) => {
    const task = store.get(id);
    const record = store.context(task);
    const result = await dialog.showSaveDialog(owner(), {
      title: translate(settings().language, '导出工作记录'),
      defaultPath: task.title + ".md",
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!result.canceled && result.filePath)
      fs.copyFileSync(record.path, result.filePath);
    return !result.canceled;
  });
  function makeWindow(taskId,restore){
  const window = new BrowserWindow({
    width: 1460,
    height: 940,
    minWidth: 1000,
    minHeight: 640,
    title: `棱镜 · Prism v${app.getVersion()}`,
    icon: path.join(__dirname, "..", "src", "assets", "prism.ico"),
    backgroundColor: "#272119",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  windows.add(window);
  window.draftKey=restore?.key||(taskId?require('node:crypto').randomUUID():'primary');
  if(restore?.bounds&&[restore.bounds.x,restore.bounds.y,restore.bounds.width,restore.bounds.height].every(Number.isFinite))window.setBounds(restore.bounds);
  window.on('page-title-updated',event=>event.preventDefault());
  window.on('closed',()=>windows.delete(window));
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.setMenu(null);
  window.once('ready-to-show',()=>{if(!process.env.PRISM_TEST_HIDE&&!restore?.hidden)window.showInactive();});
  if(process.platform==='win32')window.setAppDetails({appId:'org.prismdesk.app',appIconPath:path.join(__dirname,'..','src','assets','prism.ico'),relaunchDisplayName:'棱镜',relaunchCommand:`"${path.join(updater.root,'runtime','desktop','Prism.exe')}" "${updater.root}" --user-data-dir="${app.getPath('userData')}"`});
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.loadFile(path.join(__dirname, "..", "dist", "index.html"),{query:taskId?{task:taskId}:{}});
  window.webContents.once('did-finish-load',()=>messageQueue.pump());
  window.on("close", (event) => {
    if(!quitting&&tray){event.preventDefault();window.hide();return;}
    if (runner.active && windows.size===1) {
      event.preventDefault();
      emit("error", "任务仍在执行，请先停止或等待结束后关闭棱镜。");
    }
  });
  return window;
  }
  const windowFile=path.join(dataPath(),'update-windows.json'),restoreWindows=updateBootstrap.read(windowFile,[]);
  const layouts=Array.isArray(restoreWindows)?restoreWindows.filter(item=>item&&(item.key==='primary'||/^[a-f0-9-]{36}$/.test(item.key))).slice(0,20):[];
  window=makeWindow(undefined,layouts[0]);
  for(const layout of layouts.slice(1))makeWindow(undefined,layout);
  if(fs.existsSync(windowFile))fs.unlinkSync(windowFile);
  if(!process.env.PRISM_TEST_HIDE||process.env.PRISM_TEST_TRAY){
    tray=new Tray(path.join(__dirname,'..','src','assets','prism.ico'));
    tray.setToolTip('棱镜 · Prism');
    const updateTray=()=>tray.setContextMenu(Menu.buildFromTemplate([
      {label:translate(settings().language,'打开棱镜'),click:showWindow},
      {type:'separator'},
      {label:translate(settings().language,'退出棱镜'),click:quitPrism},
    ]));updateTray();tray.on('right-click',updateTray);tray.on('click',showWindow);
  }
});
app.on("window-all-closed", () => app.quit());
app.on('before-quit',event=>{if(tray&&!quitting){event.preventDefault();quitPrism();return;}quitting=true;for(const login of accountLogins.values())login.cancel().catch(()=>{});});
