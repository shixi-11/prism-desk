const prism_test_claude = require('./script-utils.cjs').testProfile('PRISM_TEST_CLAUDE', 'Claude');
const prism_test_grok_first = require('./script-utils.cjs').testProfile('PRISM_TEST_GROK_FIRST', 'Grok');
const prism_test_grok_second = require('./script-utils.cjs').testProfile('PRISM_TEST_GROK_SECOND', 'Grok');
const {_electron:electron}=require('./script-utils.cjs').dependency('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const root=path.resolve(__dirname,'..'),dir=path.join(root,'.local','integration-ui',String(Date.now()));fs.mkdirSync(dir,{recursive:true});
 const app=await electron.launch({executablePath:path.join(root,'node_modules/electron/dist/electron.exe'),args:[root],env:{...process.env,PRISM_TEST_HIDE:'1',PRISM_TEST_DATA:dir}});
 try{const page=await app.firstWindow();await page.getByLabel('执行账号',{exact:true}).waitFor();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const id of [prism_test_claude,prism_test_grok_first]){await page.getByLabel('执行账号',{exact:true}).selectOption(id);await page.getByRole('button',{name:'刷新',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.quota strong')?.textContent.includes('%'));await page.screenshot({path:path.join(dir,id+'.png')});}
  await page.getByLabel('执行账号',{exact:true}).selectOption(prism_test_grok_second);await page.getByRole('button',{name:'刷新',exact:true}).click();await page.getByText('本周期结束：',{exact:false}).waitFor();assert.equal(await page.locator('.quota strong').textContent(),'暂时查不到');
  await page.getByRole('button',{name:'共享能力',exact:true}).click();
  const before=JSON.parse(fs.readFileSync(path.join(root,'.local/app-validation/latest.json'),'utf8')).checkedAt;
  await page.getByRole('button',{name:'验证应用调用',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('dialog button.outline')?.disabled,{},{timeout:180000});
  const after=JSON.parse(fs.readFileSync(path.join(root,'.local/app-validation/latest.json'),'utf8'));assert.notEqual(before,after.checkedAt);assert.equal(Object.values(after.apps).filter(x=>x.ok).length,4);assert.equal(await page.getByText('本机任务已实测',{exact:false}).count(),4);
  await page.screenshot({path:path.join(dir,'capabilities.png')});assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,dir,checks:['Claude live allowance in UI','Grok live allowance in UI','unknown percentage retains real period','app validation button completed four real workflows','no renderer errors']}));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
