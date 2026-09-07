const {dependency}=require('./script-utils.cjs');
const {_electron}=dependency('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');

(async()=>{
 const root=path.resolve(__dirname,'..'),dir=path.join(root,'.local','login-link-check',String(Date.now()));
 fs.mkdirSync(dir,{recursive:true});
 const home=path.join(dir,'account');fs.mkdirSync(home);
 const config=path.join(dir,'config.json');
 fs.writeFileSync(config,JSON.stringify({profiles:[{id:'test',provider:'Claude',name:'Test',home,executable:'claude.exe',model:'opus',write:true}]}));
 const app=await _electron.launch({executablePath:path.join(root,'runtime/desktop/Prism.exe'),args:[root],env:{...process.env,PRISM_TEST_HIDE:'1',PRISM_TEST_DATA:dir,PRISM_CONFIG:config}});
 try{
  const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.getByLabel('Switch language').waitFor();
  assert.deepEqual(await page.locator('.sidebar footer button').allTextContents(),['账号','共享能力','归档','设置']);
  await app.evaluate(({app,shell,clipboard})=>{
   app.__opens=0;app.__copied=null;
   shell.openExternal=async()=>{app.__opens++;throw Error('The login flow must not open a browser');};
   // Keep this isolated UI test away from the user's actual clipboard.
   clipboard.writeText=value=>{app.__copied=value;};
   process.mainModule.require('./electron/account-login.cjs').startAccountLogin=(_profile,_cwd,onUrl)=>{
    let done,url=null;const completed=new Promise(resolve=>{done=resolve;});
    app.__sendUrl=()=>{url='https://claude.com/cai/oauth/authorize?state=fixture';onUrl(url);};
    return {get url(){return url;},completed,cancel:async()=>done({cancelled:true})};
   };
  });
  await page.getByRole('button',{name:'账号',exact:true}).click();
  await page.getByRole('button',{name:'登录账号',exact:true}).click();
  await page.getByRole('button',{name:'获取登录链接',exact:true}).click();
  await page.getByText('正在获取登录链接…',{exact:true}).waitFor();
  // Disabling the only profile during login must not crash the empty-task page.
  assert.equal(await page.locator('.inspector').count(),1);
  await assert.rejects(page.evaluate(()=>window.prism.copyAccountLogin('test')),/登录链接/);
  await app.evaluate(({app})=>app.__sendUrl());
  await page.getByRole('button',{name:'复制登录链接',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'重新打开登录页',exact:true}).count(),0);
  await page.getByRole('button',{name:'复制登录链接',exact:true}).click();
  await page.getByRole('button',{name:'登录链接已复制',exact:true}).waitFor();
  assert.equal(await app.evaluate(({app})=>app.__copied),'https://claude.com/cai/oauth/authorize?state=fixture');
  assert.equal(await app.evaluate(({app})=>app.__opens),0);
  assert.equal((await page.locator('body').innerText()).includes('state=fixture'),false);
  const publicState=await page.evaluate(()=>window.prism.init());
  assert.equal(JSON.stringify(publicState.accountLogins).includes('state=fixture'),false);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].showInactive());
  await page.screenshot({path:path.join(dir,'copy-link.png')});
  await page.getByRole('button',{name:'取消登录',exact:true}).click();
  await page.getByText('已取消登录',{exact:true}).waitFor();
  await assert.rejects(page.evaluate(()=>window.prism.copyAccountLogin('test')),/登录链接/);
  assert.equal(await page.getByRole('button',{name:'复制登录链接',exact:true}).count(),0);
  await page.getByRole('button',{name:'获取登录链接',exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,dir}));
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exit(1);});
