const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
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
if (!app.requestSingleInstanceLock()) app.quit();
let window, store, runner;
let resetInProgress=false;
let geminiLogin=null;
let validatingApps=false;
const dataPath = () => app.getPath("userData");
const emit = (type, value) => {
  if (window && !window.isDestroyed())
    window.webContents.send("prism:event", { type, value });
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
      event.sender !== window.webContents ||
      event.senderFrame !== window.webContents.mainFrame
    )
      throw Error("非法调用来源");
    return fn(...args);
  });
}
app.whenReady().then(() => {
  store = new TaskStore(require('./storage.cjs').taskRoot(app.getAppPath(),dataPath()));
  store.recover();
  runner = new Runner(store);
  for (const type of ["event", "delta", "state", "idle", "approval", "quota", "approval-reset"])
    runner.on(type, (value) => emit(type, value));
  handle("init", () => ({
    tasks: store.list(),
    profiles: PROFILES.map(({ home, executable, ...p }) => p),
    settings: settings(),
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
  handle("task", (id) => ({ task: store.get(id), events: store.events(id) }));
  handle("create", async input => {
    if(input.executionOptions){const list=await require('./models.cjs').modelOptions(input.profile,app.getAppPath());const m=list.models.find(m=>m.id===input.executionOptions.model);if(!m?.efforts.includes(input.executionOptions.effort))throw Error('模型或思考等级无效');}
    const task=store.create(input);if(input.executionOptions){task.modelSettings={[task.profile]:{model:input.executionOptions.model,effort:input.executionOptions.effort}};store.save(task);}return task;
  });
  handle("pickDirectory", async () => {
    const result = await dialog.showOpenDialog(window, directoryDialog(settings().language));
    return result.canceled ? null : result.filePaths[0];
  });
  handle("theme", (theme) => {
    if (!["system", "light", "dark"].includes(theme)) throw Error("主题无效");
    atomic(path.join(dataPath(), "settings.json"), { ...settings(), theme });
  });
  handle('language',language=>{if(!isSupportedLanguage(language))throw Error('Unsupported language');atomic(path.join(dataPath(),'settings.json'),{...settings(),language});});
  handle("scan", () => require('./diagnostics.cjs').verifyCapabilities());
  handle('validateApps',async()=>{
    if(runner.active||validatingApps)throw Error('请等待当前执行或应用验证结束');
    validatingApps=true;
    try{await require('./app-validation.cjs').validateApps();return capabilities();}finally{validatingApps=false;}
  });
  handle("quota", (id,model) => accountStatus(id, app.getAppPath(),model));
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
    try{const answer=await dialog.showMessageBox(window,resetCreditDialog(settings().language,profile));if(answer.response!==1)return {outcome:'cancelled'};
      if(runner.active)throw Error('任务已经开始，请等本轮结束再使用重置卡');
      return await require('./reset-credits.cjs').consumeReset(id,app.getAppPath(),dataPath());
    }finally{resetInProgress=false;}
  });
  handle('models',id=>require('./models.cjs').modelOptions(id,app.getAppPath()));
  handle('modelSettings',(id,input)=>require('./models.cjs').updateSelectionForRunner(store,runner,id,input));
  handle("run", (id, text) => {
    if(validatingApps)throw Error('请等待本机应用验证结束');
    if(resetInProgress)throw Error('请等待重置卡操作结束');
    if (runner.active) throw Error("请等待当前执行完成。");
    const task = store.get(id);
    runner.assertIdle(task);
    if (typeof text !== "string" || !text.trim()) throw Error("请填写指令。");
    runner.run(id, text).catch((e) => emit("error", e.message));
    return { started: true };
  });
  handle("switch", (id, profile) => runner.switch(id, profile));
  handle('stopAndContinue', (id, profile) => runner.stopAndContinue(id, profile));
  handle('openTaskStorage', () => shell.openPath(store.root));
  handle("stop", () => runner.stop());
  handle("approve", (id, decision) => runner.approve(id, decision));
  handle("update", (id, update) => {
    if(update && Object.keys(update).length===1 && ('title' in update || 'mode' in update))return require('./task-settings.cjs').updateTaskSetting(store,runner,id,update);
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
    const result = await dialog.showSaveDialog(window, {
      title: translate(settings().language, '导出工作记录'),
      defaultPath: task.title + ".md",
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!result.canceled && result.filePath)
      fs.copyFileSync(record.path, result.filePath);
    return !result.canceled;
  });
  window = new BrowserWindow({
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
      offscreen: !!process.env.PRISM_TEST_HIDE,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.setMenu(null);
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  window.on("close", (event) => {
    if (runner.active) {
      event.preventDefault();
      emit("error", "任务仍在执行，请先停止或等待结束后关闭棱镜。");
    }
  });
});
app.on("window-all-closed", () => app.quit());
