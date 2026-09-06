const prism_test_codex_first = require('./script-utils.cjs').testProfile('PRISM_TEST_CODEX_FIRST', 'Codex');
const prism_test_codex_second = require('./script-utils.cjs').testProfile('PRISM_TEST_CODEX_SECOND', 'Codex');
const fs = require('node:fs'); const path = require('node:path');
const {TaskStore} = require('../electron/core.cjs'); const {Runner} = require('../electron/runner.cjs');
const root=path.join(__dirname,'..','.local','relay-check');fs.mkdirSync(root,{recursive:true});
const store=new TaskStore(path.join(root,'records'));const runner=new Runner(store);
runner.on('state',t=>console.log(JSON.stringify({state:t.state,profile:t.profile})));
runner.on('event',e=>{if(['assistant','notice'].includes(e.event.type))console.log(JSON.stringify({type:e.event.type,text:e.event.text.slice(0,700)}));});
runner.on('approval',a=>{
  console.log(JSON.stringify({approval:a.id,command:a.params.command,method:a.method}));
  const command=a.params.command || '';
  // Test-only permission scope: reads of the requested skill sources and writes
  // in this dedicated fixture. Never used by the desktop approval handler.
  const unsafe=/Remove-Item|rmdir|Invoke-WebRequest|Invoke-RestMethod|Start-Process|auth\.json|API_KEY|https?:/i.test(command);
  const scoped=a.method==='item/fileChange/requestApproval' || /Get-Content|Get-Item|Test-Path|Set-Content|ConvertTo-Json|blender|relay-proof|blender-version/i.test(command);
  runner.approve(a.id,!unsafe&&scoped?'accept':'decline');
});
(async()=>{
  const cwd=path.join(root,'workspace');fs.mkdirSync(cwd,{recursive:true});
  const task=store.create({title:'棱镜接力测试',cwd,profile:prism_test_codex_first,mode:'workspace-write'});
  task.autoSwitch=false;store.save(task);
  const first=await runner.run(task.id,'这是棱镜自己的隔离功能验收。只需完成：在当前工作目录创建 relay-proof.json，内容为 {"marker":"PRISM-KEEP-20260906","stage":1}。不要读取其他助手或技能资料。不要通读所有规则，不启动其他 CLI，不修改本目录外文件。不要弹出前台窗口。完成后简短报告。');
  if(first.state!=='idle'||!fs.existsSync(path.join(cwd,'relay-proof.json')))throw Error('第一账号文件写入未完成');
  runner.switch(task.id,prism_test_codex_second);
  const second=await runner.run(task.id,'继续前一个账号的任务。先读取棱镜交接记录和 relay-proof.json，保留其中 marker，把 stage 改成 2，再在后台运行已发现 Blender 的 --version，将第一行版本写入 blender-version.txt。不得重建任务，不启动其他 CLI，不修改当前工作目录外文件，不弹出前台。结束后报告真实结果。');
  const proof=JSON.parse(fs.readFileSync(path.join(cwd,'relay-proof.json'),'utf8'));
  if(second.state!=='idle'||proof.marker!=='PRISM-KEEP-20260906'||proof.stage!==2||!fs.readFileSync(path.join(cwd,'blender-version.txt'),'utf8').includes('Blender'))throw Error('接力验证未通过');
  console.log(JSON.stringify({passed:true,taskId:task.id,proof,blender:fs.readFileSync(path.join(cwd,'blender-version.txt'),'utf8').trim()}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
