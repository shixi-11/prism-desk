// Real Electron renderer/IPC/draft persistence. Network and activation are
// substituted so this check cannot update a developer's running installation.
const {_electron:electron}=require('./script-utils.cjs').dependency('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),dir=path.join(root,'.local','updater-qa',String(Date.now()));fs.mkdirSync(dir,{recursive:true});
 const config=path.join(dir,'config.json');fs.writeFileSync(config,JSON.stringify({profiles:[{id:'codex-fixture',provider:'Codex',name:'Fixture',model:'fixture',write:true,home:dir,executable:process.execPath}],assistant:{path:'',instructions:''},skillsPath:'',storageRoot:''}));
 let app;
 async function launch(){app=await electron.launch({executablePath:path.join(root,'node_modules/electron/dist/electron.exe'),args:[root],env:{...process.env,PRISM_TEST_HIDE:'1',PRISM_TEST_DATA:dir,PRISM_CONFIG:config}});await app.evaluate((_,root)=>{const require=process.mainModule.require.bind(process.mainModule),{Updater}=require(root+'/electron/updater.cjs');Updater.prototype.check=async function(){return this.set({status:'available',current:'a'.repeat(40),latest:'b'.repeat(40),checkedAt:new Date().toISOString()});};Updater.prototype.prepare=async function(){return this.set({status:'ready'});};Updater.prototype.activate=async function(){throw Error('RESTART_GUARD_PASSED');};},root);let page=await app.firstWindow();for(const candidate of app.windows()){const win=await app.browserWindow(candidate);if(await win.evaluate(w=>w.draftKey)==='primary'){page=candidate;break;}}await page.getByLabel('Switch language').waitFor();return page;}
 try{
  let page=await launch();
  const task=await page.evaluate(dir=>window.prism.create({title:'Update acceptance',cwd:dir,profile:'codex-fixture',mode:'read-only'}),dir);
  await page.reload();await page.getByPlaceholder('写下你的想法，或者接着上次的工作…').fill('Keep this unsent draft through the update.');
  await page.getByRole('button',{name:'设置目标',exact:true}).waitFor();
  await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=2;canvas.getContext('2d').fillRect(0,0,2,2);const data=new DataTransfer();data.items.add(new File([Uint8Array.from(atob(canvas.toDataURL().split(',')[1]),c=>c.charCodeAt(0))],'fixture.png',{type:'image/png'}));document.querySelector('.composer textarea').dispatchEvent(new ClipboardEvent('paste',{bubbles:true,clipboardData:data}));});
  await page.locator('.image-attachments img').waitFor();
  await page.waitForTimeout(400);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'drafts/primary.json')))[task.id].text,'Keep this unsent draft through the update.');
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await page.getByRole('button',{name:'检查更新',exact:true}).click();
  await page.locator('.sidebar .update-dot').waitFor();assert.equal(await page.locator('.sidebar .update-dot').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.getByRole('button',{name:'下载并准备',exact:true}).click();
  await page.getByRole('button',{name:'更新并重启',exact:true}).click();
  await page.getByText('RESTART_GUARD_PASSED',{exact:true}).waitFor();
  assert.equal(fs.existsSync(path.join(dir,'update-windows.json')),false);
  assert.equal(await page.evaluate(()=>document.body.inert),false);
  const capture=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG().toString('base64'));
  fs.writeFileSync(path.join(dir,'settings.png'),Buffer.from(capture,'base64'));
  const automatic=page.locator('.update-settings input[type=checkbox]');await automatic.uncheck();
  assert.equal((await page.evaluate(()=>window.prism.updateStatus())).automatic,false);
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.locator('dialog[open]').waitFor({state:'hidden'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  for(const width of [1024,1460]){await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,940),width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  const indicator=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG().toString('base64'));fs.writeFileSync(path.join(dir,'update-dot.png'),Buffer.from(indicator,'base64'));
  const taskFile=path.join(dir,'tasks',task.id,'task.json'),saved=JSON.parse(fs.readFileSync(taskFile));fs.writeFileSync(taskFile,JSON.stringify({...saved,state:'unknown'}));
  assert.match(await page.evaluate(()=>window.prism.installUpdate().then(()=>'',e=>e.message)),/等待任务和账号操作/);fs.writeFileSync(taskFile,JSON.stringify(saved));
  await page.getByRole('button',{name:'设置目标',exact:true}).click();
  const blocked=await page.evaluate(()=>window.prism.installUpdate().then(()=>'',e=>e.message));assert.match(blocked,/保存并关闭编辑窗口/);
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  // A second task window owns an independent draft slot; both must pass the
  // prepare handshake and be restored on the next cold start.
  const other=await page.evaluate(dir=>window.prism.create({title:'Second update task',cwd:dir,profile:'codex-fixture',mode:'read-only'}),dir);
  await page.evaluate(id=>window.prism.taskAction(id,'new-window'),other.id);
  await page.waitForTimeout(500);
  const pages=app.windows(),second=pages.find(p=>p!==page);assert.ok(second);await second.getByPlaceholder('写下你的想法，或者接着上次的工作…').fill('Second window draft');
  await second.waitForTimeout(400);
  await app.evaluate(({app},root)=>{const require=process.mainModule.require.bind(process.mainModule);require(root+'/electron/updater.cjs').Updater.prototype.activate=async function(){return this.appRoot;};globalThis.originalQuit=app.quit.bind(app);app.relaunch=value=>{globalThis.relaunchArguments=value;};app.quit=()=>{};},root);
  await page.evaluate(()=>window.prism.installUpdate());
  assert.equal((await app.evaluate(()=>globalThis.relaunchArguments)).args[0],root);
  await app.evaluate(({app})=>{app.quit=globalThis.originalQuit;});
  await app.close();app=null;
  page=await launch();await page.getByPlaceholder('写下你的想法，或者接着上次的工作…').waitFor();
  assert.equal(await page.getByPlaceholder('写下你的想法，或者接着上次的工作…').inputValue(),'Keep this unsent draft through the update.');
  await page.locator('.image-attachments img').waitFor();assert.equal(await page.locator('.image-attachments img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
  const restored=app.windows();assert.equal(restored.length,2);const restoredOther=restored.find(p=>p!==page);
  await restoredOther.getByPlaceholder('写下你的想法，或者接着上次的工作…').waitFor();assert.equal(await restoredOther.getByPlaceholder('写下你的想法，或者接着上次的工作…').inputValue(),'Second window draft');
  assert.equal(await restoredOther.locator('.topbar h2').textContent(),'Second update task');
  assert.equal((await page.evaluate(()=>window.prism.updateStatus())).automatic,false);
  await app.evaluate((_,root)=>{const require=process.mainModule.require.bind(process.mainModule);require(root+'/electron/updater.cjs').Updater.prototype.check=async function(){return this.set({current:'a'.repeat(40),latest:'a'.repeat(40),status:'current'});};},root);
  await page.evaluate(()=>window.prism.checkUpdates());await page.waitForFunction(()=>document.querySelectorAll('.update-dot').length===0);
  console.log(JSON.stringify({passed:true,draftPersistence:true,multiwindowRestore:true,editingGuard:true,manualControl:true,preferencePersistence:true,evidence:dir}));
 }finally{if(app)await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
