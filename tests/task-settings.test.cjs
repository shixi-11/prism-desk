require('./helpers/config-fixture.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {TaskStore}=require('../electron/core.cjs'),{Runner}=require('../electron/runner.cjs');
const {updateTaskSetting,codexPermissions}=require('../electron/task-settings.cjs');
test('new-task defaults respect provider capabilities without changing existing tasks',()=>{
 const {newTaskMode}=require('../electron/task-settings.cjs');
 const writable={provider:'Codex',write:true};
 assert.equal(newTaskMode({},writable),'workspace-write');
 assert.equal(newTaskMode({defaultMode:'full-access'},writable),'full-access');
 assert.equal(newTaskMode({defaultMode:'read-only'},writable),'read-only');
 assert.equal(newTaskMode({defaultMode:'invalid'},writable),'workspace-write');
 assert.equal(newTaskMode({defaultMode:'full-access'},{provider:'Grok',write:false}),'read-only');
});
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prism-permissions-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const store=new TaskStore(path.join(dir,'tasks'));return {dir,store,runner:new Runner(store)};}
test('rename and queued permissions preserve a live task and apply on its next run',async t=>{
 const {dir,store,runner}=fixture(t),task=store.create({title:'Before',cwd:dir});let release;let turns=0;
 runner.codex=async function(task){turns++;if(turns===1){assert.equal(task.mode,'read-only');await new Promise(r=>release=r);assert.equal(task.mode,'read-only');this.event(task.id,'assistant',{text:'Original work preserved'});}else assert.equal(task.mode,'full-access');this.state(task,'idle');};
 const running=runner.run(task.id,'Original request');updateTaskSetting(store,runner,task.id,{title:'After'});updateTaskSetting(store,runner,task.id,{mode:'full-access'});
 assert.equal(store.get(task.id).title,'After');assert.equal(store.get(task.id).state,'running');assert.equal(store.get(task.id).mode,'read-only');assert.equal(store.get(task.id).pendingMode,'full-access');release();await running;
 assert.equal(store.get(task.id).title,'After');await runner.run(task.id,'Continue');assert.equal(store.get(task.id).pendingMode,undefined);assert.equal(store.events(task.id).filter(e=>e.type==='user').length,2);assert.ok(store.events(task.id).some(e=>e.text==='Original work preserved'));
});
test('invalid titles and permissions fail without changing saved settings',t=>{
 const {dir,store,runner}=fixture(t),task=store.create({title:'Keep',cwd:dir,profile:'grok-test-1'});
 for(const title of ['', ' ', 'a'.repeat(101)])assert.throws(()=>updateTaskSetting(store,runner,task.id,{title}));
 for(const mode of ['full-access','workspace-write','unknown'])assert.throws(()=>updateTaskSetting(store,runner,task.id,{mode}));
 assert.equal(store.get(task.id).title,'Keep');assert.equal(store.get(task.id).mode,'read-only');
 assert.throws(()=>store.create({title:'No',cwd:dir,profile:'gemini-test-1',mode:'full-access'}));
});
test('full access is explicit and normal modes retain approval checks',()=>{
 assert.deepEqual(codexPermissions('full-access'),{approvalPolicy:'never',sandbox:'danger-full-access',sandboxPolicy:{type:'dangerFullAccess'}});
 assert.equal(codexPermissions('read-only').approvalPolicy,'on-request');assert.equal(codexPermissions('workspace-write').sandbox,'workspace-write');
});
