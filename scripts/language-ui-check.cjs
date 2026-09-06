const { _electron: electron } = require('./script-utils.cjs').dependency('playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(process.env.PRISM_QA_ROOT || path.join(__dirname,'..')),dir=path.join(root,'.local','languages',String(Date.now()));fs.mkdirSync(dir,{recursive:true});
 const launch=()=>electron.launch({executablePath:path.join(root,'node_modules/electron/dist/electron.exe'),args:[root],env:{...process.env,PRISM_TEST_HIDE:'1',PRISM_TEST_DATA:dir}});
 let app=await launch();try{
 const page=await app.firstWindow();await page.getByLabel('Switch language').waitFor();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1460,1024]){await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,768),width);
 for(const id of ['zh','zh-TW','en','ja','ko','es','fr','de','ar']){
 await page.getByLabel('Switch language').selectOption(id);await page.waitForFunction(id=>document.documentElement.lang===(id==='zh'?'zh-CN':id),id);
 assert.equal(await page.evaluate(()=>document.documentElement.dir),id==='ar'?'rtl':'ltr');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,`${id} ${width} overflow`);
 const box=await page.getByLabel('Switch language').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width);
 await page.screenshot({path:path.join(dir,`${id}-${width}.png`)});
 }}
 await page.locator('textarea').fill('我的任务 stays unchanged');await page.getByLabel('Switch language').selectOption('ja');assert.equal(await page.locator('textarea').inputValue(),'我的任务 stays unchanged');
 await page.getByLabel('Switch language').selectOption('ar');await app.close();app=await launch();const restored=await app.firstWindow();await restored.waitForFunction(()=>document.documentElement.lang==='ar');assert.equal(await restored.getByLabel('Switch language').inputValue(),'ar');assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,dir,languages:9,viewports:2,persistence:true}));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exit(1)});
