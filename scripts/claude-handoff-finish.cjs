const targetProfile = require('./script-utils.cjs').testProfile('PRISM_TEST_CODEX_FIRST', 'Codex');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {TaskStore}=require('../electron/core.cjs'),{Runner}=require('../electron/runner.cjs');
(async()=>{const root=path.resolve(__dirname,'../.local/claude-stop');const dir=path.join(root,fs.readdirSync(root).filter(n=>/^\d+$/.test(n)).sort().at(-1));const store=new TaskStore(path.join(dir,'tasks')),task=store.list()[0],runner=new Runner(store);runner.on('approval',a=>runner.approve(a.id,'decline'));
 assert.equal(task.profile,targetProfile,'The source task must have been handed off to the explicitly selected Codex profile');task.autoSwitch=false;store.save(task);
 const result=await runner.run(task.id,'接续先前的说明审查。读取 integration.md，结合交接记录，简短指出其中一到三项仍需真实验证的功能或过时说明。只读，不创建文件，不调用其他CLI；这是对现有文档的真实审查。');
 assert.equal(result.state,'idle');assert.ok(store.events(task.id).some(e=>e.type==='assistant'&&e.profile.startsWith('codex-')));console.log(JSON.stringify({passed:true,dir,taskId:task.id,profile:result.profile,checks:['Claude interrupted','same task continued by Codex','actual review response persisted']}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
