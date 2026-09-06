const prism_test_claude = require('./script-utils.cjs').testProfile('PRISM_TEST_CLAUDE', 'Claude');
const path=require('node:path'), fs=require('node:fs');
const {TaskStore}=require('../electron/core.cjs'); const {Runner}=require('../electron/runner.cjs');
const root=path.join(__dirname,'..','.local','relay-check'); const store=new TaskStore(path.join(root,'records')); const runner=new Runner(store);
runner.on('state',task=>console.log(JSON.stringify({state:task.state,profile:task.profile})));
runner.on('event',e=>{if(['assistant','notice'].includes(e.event.type))console.log(JSON.stringify({type:e.event.type,text:(e.event.text||'').slice(0,900)}));});
(async()=>{
 const task=store.list().find(t=>t.id===require('./script-utils.cjs').requiredEnv('PRISM_TEST_TASK_ID')); if(!task)throw Error('已验证的源任务不存在');
 task.autoSwitch=false;store.save(task);
 runner.switch(task.id,prism_test_claude);
 const final=await runner.run(task.id,'这是同一项棱镜测试，接续前两个 Codex 账号。读取工作记录、relay-proof.json 和 blender-version.txt，保留原 marker 与 stage；在当前目录新建 claude-proof.json，写入原 marker、原 stage 和 provider="Claude"。只做这一项小型接力测试，不要通读所有技能，不调用其他 CLI，不操作本目录外文件。');
 if(final.state!=='idle')throw Error('Claude执行未正常结束');
 const proof=JSON.parse(fs.readFileSync(path.join(task.cwd,'claude-proof.json'),'utf8'));
 if(proof.marker!=='PRISM-KEEP-20260906'||proof.stage!==2||proof.provider!=='Claude')throw Error('Claude交接结果不一致');
 console.log(JSON.stringify({passed:true,taskId:task.id,proof}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
