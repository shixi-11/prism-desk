const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {targetPath,readPreview,savePreview}=require('../electron/preview.cjs');
test('preview resolves file links, saves explicit edits, and refuses stale versions',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'prism-preview-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const file=path.join(dir,'notes.md');await fs.writeFile(file,'# Original');
 const first=await readPreview('notes.md',dir);assert.equal(first.kind,'markdown');
 const saved=await savePreview(file,'# Revised',first.version);assert.equal(saved.text,'# Revised');
 await fs.writeFile(file,'# External');await assert.rejects(savePreview(file,'Lost update',saved.version),/外部修改/);
 assert.equal(await fs.readFile(file,'utf8'),'# External');
 assert.equal((await readPreview(file+':12',dir)).path,file);
 await fs.writeFile(path.join(dir,'tool.exe'),'binary');await assert.rejects(readPreview('tool.exe',dir),/不支持/);
 await assert.rejects(readPreview('missing.md',dir));
});
test('preview allows web URLs without exposing script or credential schemes',()=>{
 assert.equal(targetPath('http://localhost:5173/',process.cwd()).url,'http://localhost:5173/');
 for(const value of ['javascript:alert(1)','https://user:secret@example.com/','data:text/html,x'])assert.throws(()=>targetPath(value,process.cwd()));
});
