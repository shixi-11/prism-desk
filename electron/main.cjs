const { app, BrowserWindow, ipcMain, dialog, shell, Menu, clipboard } = require("electron");
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
let window, store, runner, messageQueue;
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
const claudeLogins=new Map();
let validatingApps=false;
const dataPath = () => app.getPath("userData");
const emit = (type, value) => {
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
    return callers.run(BrowserWindow.fromWebContents(event.sender),()=>fn(...args));
  });
}
app.whenReady().then(() => {
  if(!primaryInstance)return;
  store = new TaskStore(require('./storage.cjs').taskRoot(app.getAppPath(),dataPath()));
  store.recover();
  runner = new Runner(store);
  messageQueue=new (require('./message-queue.cjs').MessageQueue)(store,runner,path.join(dataPath(),'message-queue.json'));
  messageQueue.on('change',items=>emit('queue',items));
  messageQueue.on('failure',error=>emit('error',error.message));
  for (const type of ["event", "delta", "state", "idle", "approval", "quota", "approval-reset", "reasoning", "activity"])
    runner.on(type, (value) => emit(type, value));
  handle("init", () => ({
    tasks: store.list(),
    archivedTasks:store.list('archived'),deletedTasks:store.list('deleted'),
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
    input={...input,mode:input.mode??require('./task-settings.cjs').newTaskMode(settings(),PROFILES.find(p=>p.id===(input.profile||PROFILES[0].id)))};
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
    try{return await accountStatus(id,app.getAppPath(),model);}catch(error){if(error.code!=='AUTH_REQUIRED')throw error;return {id,authRequired:true,status:error.message,remaining:null,windows:[],checkedAt:new Date().toISOString()};}
  });
  handle('loginClaude',async id=>{
    const profile=PROFILES.find(p=>p.id===id&&p.provider==='Claude');if(!profile)throw Error('请选择 Claude 账号');
    if(runner.active?.profile.id===id)throw Error('请等待此账号当前执行结束');
    if(claudeLogins.has(id))throw Error('登录正在进行，请完成浏览器授权');
    const login=require('./claude-login.cjs').startClaudeLogin(profile,app.getAppPath(),url=>shell.openExternal(url));claudeLogins.set(id,login);
    try{return await login.completed;}finally{claudeLogins.delete(id);}
  });
  handle('cancelClaudeLogin',async id=>{await claudeLogins.get(id)?.cancel();});
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
    const profile=PROFILES.find(p=>p.id===id&&p.provider==='Codex');if(!profile)throw Error('请选择 Codex 订阅账号');
    if(runner.active||resetInProgress)throw Error('请等待当前执行或重置操作结束');
    resetInProgress=true;
    try{const answer=await dialog.showMessageBox(owner(),resetCreditDialog(settings().language,profile));if(answer.response!==1)return {outcome:'cancelled'};
      if(runner.active)throw Error('任务已经开始，请等本轮结束再使用重置卡');
      return await require('./reset-credits.cjs').consumeReset(id,app.getAppPath(),dataPath());
    }finally{resetInProgress=false;}
  });
  handle('models',id=>require('./models.cjs').modelOptions(id,app.getAppPath()));
  handle('modelSettings',(id,input,profileId)=>require('./models.cjs').updateSelectionForRunner(store,runner,id,input,profileId));
  handle("run", async (id, text, imageIds=[]) => {
    if(validatingApps)throw Error('请等待本机应用验证结束');
    if(resetInProgress)throw Error('请等待重置卡操作结束');
    const task = store.get(id);
    const images=require('./attachments.cjs').attachmentFiles(store.dir(id),imageIds);
    if(typeof text!=='string')throw Error('请填写指令。');
    text=text.trim()||(images.length?'请查看这些图片。':'');if(!text||text.length>60000)throw Error('请输入 1–60000 字的指令。');
    if(images.length&&!['Codex','Claude'].includes(PROFILES.find(p=>p.id===task.profile)?.provider))throw Error('当前入口暂不支持图片，请选择 Codex 或 Claude');
    if(settings().busySend==='steer'&&await runner.steer(id,text,images))return {steered:true};
    const busy=!!runner.active||messageQueue.running;
    const item=messageQueue.enqueue(id,text,images);
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
  function makeWindow(taskId){
  const window = new BrowserWindow({
    width: 1460,
    height: 940,
    minWidth: 1000,
    minHeight: 640,
    title: "棱镜 · PRISM",
    icon: path.join(__dirname, "..", "src", "assets", "prism.ico"),
    backgroundColor: "#272119",
    show: !process.env.PRISM_TEST_HIDE,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  windows.add(window);
  window.on('closed',()=>windows.delete(window));
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.setMenu(null);
  window.once('ready-to-show',()=>{if(!process.env.PRISM_TEST_HIDE)window.showInactive();});
  if(process.platform==='win32')window.setAppDetails({appId:'org.prismdesk.app',appIconPath:path.join(__dirname,'..','src','assets','prism.ico'),relaunchDisplayName:'棱镜',relaunchCommand:`"${process.execPath}" "${path.resolve(__dirname,'..')}" --user-data-dir="${app.getPath('userData')}"`});
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.loadFile(path.join(__dirname, "..", "dist", "index.html"),{query:taskId?{task:taskId}:{}});
  window.webContents.once('did-finish-load',()=>messageQueue.pump());
  window.on("close", (event) => {
    if (runner.active && windows.size===1) {
      event.preventDefault();
      emit("error", "任务仍在执行，请先停止或等待结束后关闭棱镜。");
    }
  });
  return window;
  }
  window=makeWindow();
});
app.on("window-all-closed", () => app.quit());
app.on('before-quit',()=>{for(const login of claudeLogins.values())login.cancel().catch(()=>{});});
