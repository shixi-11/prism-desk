// Local Git release fixture; real git/npm/Vite/Electron/.NET commands. No live
// accounts, project edits, production pointer changes, or foreground windows.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {Updater,command,REPOSITORY}=require('../electron/updater.cjs');
const {_electron:electron}=require('./script-utils.cjs').dependency('playwright');
const {write,read,validVersion}=require('../electron/update-bootstrap.cjs');
(async()=>{
 const source=path.resolve(__dirname,'..'),dir=path.join(source,'.local','update-journey',String(Date.now())),remote=path.join(dir,'release'),base=path.join(dir,'installed');fs.mkdirSync(dir,{recursive:true});
 const git=(cwd,...args)=>execFileSync('git',args,{cwd,windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git(dir,'clone','--no-hardlinks',source,remote);git(remote,'checkout','-B','main');
 const files=git(source,'ls-files','-z').split('\0').filter(Boolean).concat(['electron/updater.cjs','electron/update-bootstrap.cjs','src/UpdateSettings.jsx','tests/updater.test.cjs','scripts/updater-ui-check.cjs','scripts/updater-journey-check.cjs']);
 for(const file of files){const dest=path.join(remote,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(source,file),dest);}
 git(remote,'add','--',...files);git(remote,'-c','user.name=Prism Test','-c','user.email=test@example.invalid','commit','-m','Update acceptance fixture');
 const latest=git(remote,'rev-parse','HEAD'),previous=git(remote,'rev-parse','HEAD~1');
 git(dir,'clone','--no-hardlinks',remote,base);git(base,'checkout','--detach',previous);
 fs.mkdirSync(path.join(base,'runtime/node'),{recursive:true});fs.copyFileSync(process.execPath,path.join(base,'runtime/node/node.exe'));
 fs.mkdirSync(path.join(base,'node_modules'),{recursive:true});fs.cpSync(path.join(source,'node_modules/npm'),path.join(base,'node_modules/npm'),{recursive:true});
 fs.cpSync(path.join(source,'node_modules/electron'),path.join(base,'node_modules/electron'),{recursive:true});
 const u=new Updater(base,{run:(file,args,cwd,timeout,env)=>command(file,args.map(arg=>arg===REPOSITORY?remote:arg),cwd,timeout,env)});
 u.on('change',s=>console.log(JSON.stringify({phase:s.status,detail:s.detail||'',error:s.error||''})));
 assert.equal((await u.check()).latest,latest);assert.equal((await u.prepare()).status,'ready');assert.ok(validVersion(base,latest));
 const target=await u.activate();assert.equal(read(u.activeFile).pending,true);
 const data=path.join(dir,'user-data'),config=path.join(dir,'config.json');
 write(config,{profiles:[{id:'codex-fixture',provider:'Codex',name:'Fixture',model:'fixture',write:true,home:data,executable:process.execPath}],assistant:{path:'',instructions:''},skillsPath:'',storageRoot:path.join(data,'tasks')});
 // Launch the real newly built executable with the same persisted userData
 // convention used by app.relaunch. Bootstrap health is not mocked here.
 let app;
 try{
  app=await electron.launch({executablePath:path.join(target,'runtime/desktop/Prism.exe'),args:[target,'--user-data-dir='+data],env:{...process.env,PRISM_CONFIG:config,PRISM_TEST_HIDE:'1',PRISM_TEST_DATA:''}});
  const page=await app.firstWindow();await page.getByLabel('Switch language').waitFor();
  assert.equal(read(u.activeFile).pending,false);
  assert.equal(await app.evaluate(({app})=>app.getAppPath()),target);
  assert.equal(path.resolve(await app.evaluate(({app})=>app.getPath('userData'))),path.resolve(data));
  const task=await page.evaluate(dir=>window.prism.create({title:'Across two updates',cwd:dir,profile:'codex-fixture',mode:'read-only'}),dir);await page.reload();await page.getByRole('button',{name:'设置目标',exact:true}).waitFor();await page.getByLabel('任务指令').fill('Keep this through a second update');await page.waitForTimeout(400);
  await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('region',{name:'软件更新'}).waitFor();
  const shot=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG().toString('base64'));fs.writeFileSync(path.join(dir,'installed.png'),Buffer.from(shot,'base64'));
  await app.close();app=null;
  fs.appendFileSync(path.join(remote,'README.md'),'\nSecond update acceptance fixture.\n');git(remote,'add','README.md');git(remote,'-c','user.name=Prism Test','-c','user.email=test@example.invalid','commit','-m','Second update fixture');
  const next=new Updater(target,{run:(file,args,cwd,timeout,env)=>command(file,args.map(arg=>arg===REPOSITORY?remote:arg),cwd,timeout,env)});next.on('change',s=>console.log(JSON.stringify({second:s.status,detail:s.detail||'',error:s.error||''})));
  assert.equal((await next.check()).status,'available');assert.equal((await next.prepare()).status,'ready');const secondTarget=await next.activate();assert.equal(read(next.activeFile).previous,latest);
  app=await electron.launch({executablePath:path.join(secondTarget,'runtime/desktop/Prism.exe'),args:[secondTarget,'--user-data-dir='+data],env:{...process.env,PRISM_CONFIG:config,PRISM_TEST_HIDE:'1',PRISM_TEST_DATA:''}});
  const second=await app.firstWindow();await second.getByRole('button',{name:'设置目标',exact:true}).waitFor();assert.equal(await second.getByLabel('任务指令').inputValue(),'Keep this through a second update');assert.equal(read(next.activeFile).pending,false);assert.equal((await second.evaluate(id=>window.prism.task(id),task.id)).task.title,'Across two updates');
  console.log(JSON.stringify({passed:true,realBuild:true,newExecutable:true,healthy:true,chainedUpdate:true,draftPreserved:true,evidence:dir}));
 }finally{if(app)await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
