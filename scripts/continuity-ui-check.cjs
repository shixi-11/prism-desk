const prism_test_codex_first = require('./script-utils.cjs').testProfile('PRISM_TEST_CODEX_FIRST', 'Codex');
const prism_test_codex_second = require('./script-utils.cjs').testProfile('PRISM_TEST_CODEX_SECOND', 'Codex');
const prism_test_gemini = require('./script-utils.cjs').testProfile('PRISM_TEST_GEMINI', 'Gemini');
const {_electron:electron}=require('./script-utils.cjs').dependency('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),dir=path.join(root,'.local','continuity-qa',String(Date.now()));fs.mkdirSync(dir,{recursive:true});
 const app=await electron.launch({executablePath:path.join(root,'node_modules/electron/dist/electron.exe'),args:[root],env:{...process.env,PRISM_TEST_DATA:dir,PRISM_TEST_HIDE:'1'}});
 try{const page=await app.firstWindow();await page.getByLabel('模型',{exact:true}).waitFor();
  assert.equal(await page.locator('.wordmark').textContent(),'棱镜');
  await page.getByLabel('执行账号',{exact:true}).selectOption(prism_test_gemini);
  await page.waitForFunction(()=>document.querySelector('[aria-label="思考等级"]')?.value==='auto');
  const status=await page.evaluate(id=>window.prism.quota(id),prism_test_gemini);assert.equal(status.remaining,null);
  const task=await page.evaluate(({cwd,profile})=>window.prism.create({title:'交接验收',cwd,profile}),{cwd:dir,profile:prism_test_codex_first});
  const {TaskStore}=require('../electron/core.cjs'),{Runner}=require('../electron/runner.cjs');const store=new TaskStore(path.join(dir,'tasks'));
  store.append(task.id,'user',{text:'继续制作游戏'});store.append(task.id,'assistant',{text:'已保存界面。构建尚未运行。'});store.append(task.id,'tool',{text:'fileChange',data:{type:'fileChange',status:'completed',changes:[{path:'src/game.js'}]}});
  new Runner(store).switch(task.id,prism_test_codex_second);await page.reload();
  await page.getByText('交接进度',{exact:true}).click();await page.getByText('src/game.js',{exact:true}).waitFor();
  await page.getByText('打开会话保存位置',{exact:true}).waitFor();
  for(const [width,height] of [[1460,940],[1024,768]]){
   await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setSize(...size),[width,height]);
   const before=await page.locator('.inspector-fixed').boundingBox();
   await page.locator('.inspector-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);
   const after=await page.locator('.inspector-fixed').boundingBox();assert.equal(before.y,after.y);
   assert.ok(after.y+after.height<height);
  }
  await page.getByLabel('Switch language').selectOption('en');await page.waitForFunction(()=>document.querySelector('.wordmark')?.textContent==='PRISM');await page.getByText('Handoff progress',{exact:true}).waitFor();
  await page.screenshot({path:path.join(dir,'continuity.png')});console.log(JSON.stringify({passed:true,dir,checks:['localized brand','Gemini automatic reasoning','quota unknown stays unknown','handoff file evidence','fixed controls while scrolling','storage entry','English handoff']}));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
