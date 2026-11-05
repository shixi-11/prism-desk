const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {dependency}=require('./script-utils.cjs');
const {_electron}=dependency('playwright');

async function main(){
 const root=path.resolve(__dirname,'..');
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'prism-account-order-'));
 const config=path.join(data,'config.json');
 const profiles=[
  {id:'claude',provider:'Claude',name:'团队-1',executable:'claude',model:'opus',write:true},
  {id:'gemini',provider:'Gemini',name:'Gemini 个人-1',executable:'agy',model:'auto',write:false,disabled:true,connectionState:'pending'},
  {id:'grok',provider:'Grok',name:'个人-1',executable:'grok',model:'auto',write:true},
 ].map(profile=>({...profile,home:path.join(data,profile.id)}));
 const original=JSON.stringify({profiles});
 fs.writeFileSync(config,original);
 const launch=()=>_electron.launch({
  executablePath:process.env.PRISM_TEST_ELECTRON||path.join(root,'runtime','desktop',process.platform==='win32'?'Prism.exe':'Prism'),
  args:[root],
  env:{...process.env,PRISM_TEST_HIDE:'1',PRISM_TEST_DATA:data,PRISM_CONFIG:config},
 });
 let app;
 try{
  app=await launch();
  let page=await app.firstWindow();
  const openAccounts=()=>page.getByRole('button',{name:'账号',exact:true}).click();
  const cardOrder=()=>page.locator('.connection-identity > strong').allTextContents();
  const executionOrder=()=>page.getByLabel('执行账号',{exact:true}).locator('option').allTextContents();
  const originalOrder=['Claude','Gemini','Grok'];
  const sorted=['Gemini','Grok','Claude'];
  const execution=['Claude / 团队-1','Gemini / 个人-1','Grok / 个人-1'];
  assert.deepEqual(await executionOrder(),execution);
  await openAccounts();
  assert.deepEqual(await cardOrder(),originalOrder);
  await page.getByRole('button',{name:'手动排序'}).click();
  assert.equal(await page.getByRole('button',{name:'上移 Claude / 团队-1'}).isDisabled(),true);
  assert.equal(await page.getByRole('button',{name:'下移 Grok / 个人-1'}).isDisabled(),true);
  await page.getByRole('button',{name:'上移 Gemini / 个人-1'}).click();
  await page.getByRole('button',{name:'下移 Claude / 团队-1'}).click();
  await page.getByRole('button',{name:'返回账号列表'}).click();
  assert.deepEqual(await cardOrder(),sorted);
  await app.close();
  app=await launch();
  page=await app.firstWindow();
  assert.deepEqual(await executionOrder(),execution);
  await openAccounts();
  await page.getByRole('button',{name:'手动排序'}).waitFor();
  assert.deepEqual(await cardOrder(),sorted);
  assert.equal(fs.readFileSync(config,'utf8'),original);
  assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().every(w=>!w.isVisible())),true);
  console.log('Account list reorders, persists after relaunch, and leaves execution order and account configuration intact.');
 }finally{await app?.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
