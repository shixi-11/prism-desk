require('./helpers/config-fixture.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {TaskStore}=require('../electron/core.cjs'),{Runner}=require('../electron/runner.cjs');
test('no folder creates a durable isolated workspace per task and preserves it during handoff',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-workspaces-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const store=new TaskStore(root),first=store.create({title:'First'}),second=store.create({title:'Second',cwd:'  '});
 assert.equal(first.workspaceKind,'managed');assert.notEqual(first.cwd,second.cwd);assert.equal(first.cwd,path.join(store.dir(first.id),'workspace'));assert.ok(fs.statSync(first.cwd).isDirectory());fs.writeFileSync(path.join(first.cwd,'note.txt'),'Saved work');
 const reopened=new TaskStore(root),runner=new Runner(reopened);await runner.switch(first.id,'claude-test-1');assert.equal(reopened.get(first.id).cwd,first.cwd);assert.equal(fs.readFileSync(path.join(reopened.get(first.id).cwd,'note.txt'),'utf8'),'Saved work');
 assert.throws(()=>store.create({title:'Invalid',cwd:path.join(root,'missing')}));assert.throws(()=>store.create({title:'Relative',cwd:'relative'}));assert.equal(store.list().length,2);
});
