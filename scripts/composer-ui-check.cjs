const {dependency}=require('./script-utils.cjs');const {_electron}=dependency('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),dir=path.join(root,'.local','composer-ui',String(Date.now()));fs.mkdirSync(dir,{recursive:true});
 const config=path.join(dir,'config.json');fs.writeFileSync(config,JSON.stringify({profiles:[{id:'codex-test',provider:'Codex',name:'个人-1',home:dir,executable:path.join(dir,'missing-cli.exe'),model:'test',write:true}],assistant:{path:'',instructions:''},skillsPath:'',apps:{}}));
 const app=await _electron.launch({executablePath:path.join(root,'node_modules/electron/dist/electron.exe'),args:[root],env:{...process.env,PRISM_TEST_HIDE:'1',PRISM_TEST_DATA:dir,PRISM_CONFIG:config}});
 try{
  const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.getByLabel('Switch language').waitFor();
  await app.evaluate(async ({app})=>{
   const require=process.mainModule.require.bind(process.mainModule);
   app.__calls=[];app.__steers=[];
   const {Runner}=require(require('node:path').join(app.getAppPath(),'electron/runner.cjs'));
   Runner.prototype.codex=async function(task,profile,text){app.__calls.push({text,images:this.active.images});task.sessions[profile.id]='thread';this.active.turnId='turn';this.active.rpc={call:async(method,args)=>{app.__steers.push({method,args});}};
    this.event(task.id,'reasoning',{text:'Fixture: checking the requested change.'});this.emit('activity',{taskId:task.id,text:'Fixture tool running'});
    if(app.__calls.length===1)await new Promise(resolve=>app.__release=resolve);this.state(task,'idle');
   };
  });
  await page.evaluate(async dir=>{await window.prism.create({title:'Task A',cwd:dir,profile:'codex-test'});await window.prism.create({title:'Task B',cwd:dir,profile:'codex-test'});},dir);
  await page.reload();await page.getByRole('button',{name:'Task A',exact:true}).click();await page.getByRole('heading',{name:'Task A',exact:true}).waitFor();
  const png=await app.evaluate(({nativeImage})=>nativeImage.createFromBitmap(Buffer.from([0,120,255,255]),{width:1,height:1}).toPNG().toString('base64'));
  await page.evaluate(png=>{const bytes=Uint8Array.from(atob(png),c=>c.charCodeAt(0));const transfer=new DataTransfer();transfer.items.add(new File([bytes],'screenshot.png',{type:'image/png'}));document.querySelector('textarea[aria-label="任务指令"]').dispatchEvent(new ClipboardEvent('paste',{clipboardData:transfer,bubbles:true}));},png);
  await page.locator('.composer .image-attachments img').waitFor();const input=page.getByLabel('任务指令');await input.fill('first request');await input.press('Control+Enter');await page.getByRole('button',{name:'停止',exact:true}).waitFor();
  assert.equal(await app.evaluate(({app})=>app.__calls[0].images.length),1);
  await input.fill('queued second');await page.getByRole('button',{name:'排队',exact:true}).click();await page.getByLabel('待发送消息').getByText('queued second',{exact:true}).waitFor();
  await input.fill('cancel this');await page.getByRole('button',{name:'排队',exact:true}).click();await page.locator('.queued-messages>div').filter({hasText:'cancel this'}).getByLabel('取消排队').click();
  await input.fill('draft A');await page.getByRole('button',{name:'Task B',exact:true}).click();await page.getByRole('heading',{name:'Task B',exact:true}).waitFor();await input.fill('draft B');await page.getByRole('button',{name:'Task A',exact:true}).click();await page.getByRole('heading',{name:'Task A',exact:true}).waitFor();assert.equal(await input.inputValue(),'draft A');
  await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByLabel('发送快捷键').selectOption('enter');await page.getByLabel('运行中发送').selectOption('steer');await page.locator('.modal header button').click();
  await input.fill('guide this run');await input.press('Enter');await page.waitForFunction(()=>document.querySelector('textarea[aria-label="任务指令"]').value==='');assert.equal(await app.evaluate(({app})=>app.__steers[0].method),'turn/steer');
  await input.fill('line one');await input.press('Shift+Enter');await input.type('line two');assert.equal(await input.inputValue(),'line one\nline two');
  await page.locator('.activity-panel summary').click();await page.getByText('Fixture: checking the requested change.',{exact:true}).waitFor();await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].showInactive());await page.screenshot({path:path.join(dir,'composer.png')});
  await app.evaluate(({app})=>app.__release());await page.waitForFunction(async()=>!(await window.prism.init()).queue.length);assert.deepEqual(await app.evaluate(({app})=>app.__calls.map(c=>c.text)),['first request','queued second']);
  await page.reload();assert.equal(await page.evaluate(async()=> (await window.prism.init()).settings.sendShortcut),'enter');assert.equal(await page.evaluate(async()=> (await window.prism.init()).settings.busySend),'steer');assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,dir}));
 }catch(e){const page=await app.firstWindow();console.log((await page.locator('body').innerText()).slice(-5000));throw e;}finally{await app.evaluate(({app})=>app.__release?.()).catch(()=>{});await app.close();}
})().catch(e=>{console.error(e);process.exit(1)});
