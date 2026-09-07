const {dependency}=require('./script-utils.cjs');
const {_electron}=dependency('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const dir=path.join(root,'.local','single-instance',String(Date.now()));
 fs.mkdirSync(dir,{recursive:true});
 const executablePath=path.join(root,'node_modules/electron/dist/electron.exe');
 const env={...process.env,PRISM_TEST_HIDE:'1',PRISM_TEST_DATA:dir};
 const app=await _electron.launch({executablePath,args:[root],env});
 try{
  await app.firstWindow();
  await app.evaluate(({BrowserWindow,app})=>{
   const w=BrowserWindow.getAllWindows()[0];app.__activation=[];
   w.isMinimized=()=>true;
   for(const name of ['restore','show','focus'])w[name]=()=>app.__activation.push(name);
  });
  for(let i=0;i<2;i++){
   const code=await new Promise((resolve,reject)=>{const p=spawn(executablePath,[root],{env,windowsHide:true,stdio:'ignore'});p.once('error',reject);p.once('exit',resolve);});
   assert.equal(code,0);
  }
  const result=await app.evaluate(({app,BrowserWindow})=>({calls:app.__activation,windows:BrowserWindow.getAllWindows().length}));
  assert.equal(result.windows,1);
  assert.deepEqual(result.calls,['restore','show','focus','restore','show','focus']);
  console.log(JSON.stringify({ok:true,...result}));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exit(1)});
