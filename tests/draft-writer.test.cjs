const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {DraftWriter}=require('../electron/draft-writer.cjs');
test('async drafts preserve newest edits and a close flush cannot be overwritten',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-drafts-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const file=path.join(root,'draft.json'),writer=new DraftWriter();
 await Promise.all([writer.save(file,{text:'old'}),writer.save(file,{text:'new'})]);assert.equal(JSON.parse(fs.readFileSync(file)).text,'new');
 const pending=writer.save(file,{text:'pending'});writer.flush(file,{text:'closing'});await pending;assert.equal(JSON.parse(fs.readFileSync(file)).text,'closing');
 await assert.rejects(writer.save(file,[]),/草稿/);assert.deepEqual(fs.readdirSync(root),['draft.json']);
});
