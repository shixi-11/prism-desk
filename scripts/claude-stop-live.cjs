const prism_test_codex_first = require('./script-utils.cjs').testProfile('PRISM_TEST_CODEX_FIRST', 'Codex');
const prism_test_claude = require('./script-utils.cjs').testProfile('PRISM_TEST_CLAUDE', 'Claude');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {TaskStore}=require('../electron/core.cjs'),{Runner}=require('../electron/runner.cjs');
(async()=>{
 const root=path.resolve(__dirname,'..'),dir=path.join(root,'.local','claude-stop',String(Date.now()));fs.mkdirSync(dir,{recursive:true});process.env.PRISM_TEST_DATA=dir;
 fs.writeFileSync(path.join(dir,'integration.md'),'# Continuity review fixture\n\nA task persists across providers. Current requests keep their model. Stopping must await process exit before another provider starts. Actual application operations still need verification.\n');
 const store=new TaskStore(path.join(dir,'tasks')),task=store.create({title:'接续说明审查',cwd:dir,profile:prism_test_claude}),runner=new Runner(store);
 task.autoSwitch=false;store.save(task);
 let stopped=false,stopPromise;
 const timer=setInterval(()=>{if(!stopped&&runner.active?.started&&runner.active.proc){stopped=true;stopPromise=runner.stop();stopPromise.catch(()=>{});}},500);
 const deadline=setTimeout(()=>{if(runner.active?.proc)runner.active.proc.requestStop().catch(()=>{});},90000);
 try{await runner.run(task.id,'只读审查 integration.md，指出实际交接承诺中需要验证的边界和文档矛盾。请先读取文件，再给出具体审查意见。');if(stopPromise)await stopPromise;assert.equal(stopped,true);assert.equal(store.get(task.id).state,'paused');
  runner.switch(task.id,prism_test_codex_first);assert.equal(store.get(task.id).id,task.id);assert.ok(store.events(task.id).some(e=>e.type==='handoff'));console.log(JSON.stringify({passed:true,dir,state:store.get(task.id).state,checks:['real Claude process launched','controlled stop acknowledged','job exited','same task switched without replay']}));
 }finally{clearInterval(timer);clearTimeout(deadline);}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
