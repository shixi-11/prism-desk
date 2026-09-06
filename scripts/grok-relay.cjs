const prism_test_grok_first = require('./script-utils.cjs').testProfile('PRISM_TEST_GROK_FIRST', 'Grok');
const prism_test_grok_second = require('./script-utils.cjs').testProfile('PRISM_TEST_GROK_SECOND', 'Grok');
const prism_test_grok_third = require('./script-utils.cjs').testProfile('PRISM_TEST_GROK_THIRD', 'Grok');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {TaskStore,accountStatus}=require('../electron/core.cjs');const{Runner}=require('../electron/runner.cjs');
(async()=>{
 const root=path.resolve(__dirname,'..','.local','grok-live');const cwd=path.join(root,'workspace');fs.mkdirSync(cwd,{recursive:true});
 fs.writeFileSync(path.join(cwd,'fixture.json'),JSON.stringify({marker:'PRISM-DESERT-READ',stage:3}));
 require('./script-utils.cjs').skillFixture(cwd);
 const store=new TaskStore(path.join(root,'records'));const task=store.create({title:'Grok共享技能实测',cwd,profile:prism_test_grok_first});task.autoSwitch=false;store.save(task);
 const runner=new Runner(store);runner.on('state',t=>console.log(JSON.stringify({state:t.state,profile:t.profile})));
 runner.on('event',e=>{if(['notice','assistant'].includes(e.event.type))console.log(JSON.stringify({type:e.event.type,text:e.event.text?.slice(0,1400)}));});
 const result=await runner.run(task.id,'只做棱镜只读能力验证：读取当前工作目录 fixture.json，准确报告 marker 和 stage。然后只读取 当前目录 SKILL.md 的开头，报告其name。不要读私密参考、不要改文件、不要启动其他CLI、不要做额外研究。请用中文简短回复。');
 const events=store.events(task.id);fs.writeFileSync(path.join(root,'result.json'),JSON.stringify({taskId:task.id,state:result.state,tools:events.filter(e=>e.type==='tool').map(e=>e.text)}));
 assert.equal(result.state,'idle');assert.ok(events.some(e=>e.type==='assistant'&&e.text.includes('PRISM-DESERT-READ')&&e.text.includes('prism-test-skill')));assert.deepEqual(JSON.parse(fs.readFileSync(path.join(cwd,'fixture.json'),'utf8')),{marker:'PRISM-DESERT-READ',stage:3});
 for(const id of [prism_test_grok_second,prism_test_grok_third])console.log(JSON.stringify(await accountStatus(id,cwd)));
 console.log(JSON.stringify({passed:true,taskId:task.id}));
})().catch(e=>{console.error(e);process.exitCode=1;});
