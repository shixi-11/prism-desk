const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {targetPath,readPreview,savePreview,openLocal}=require('../electron/preview.cjs');
test('preview resolves file links, saves explicit edits, and refuses stale versions',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'prism-preview-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const file=path.join(dir,'notes.md');await fs.writeFile(file,'# Original');
 const first=await readPreview('notes.md',dir);assert.equal(first.kind,'markdown');
 const saved=await savePreview(file,'# Revised',first.version);assert.equal(saved.text,'# Revised');
 await fs.writeFile(file,'# External');await assert.rejects(savePreview(file,'Lost update',saved.version),/外部修改/);
 assert.equal(await fs.readFile(file,'utf8'),'# External');
 assert.equal((await readPreview(file+':12',dir)).path,file);
 await fs.writeFile(path.join(dir,'tool.exe'),'binary');assert.equal((await readPreview('tool.exe',dir)).kind,'external');
 await assert.rejects(readPreview('missing.md',dir));
});
test('local directories and media preserve Chinese names and spaces through native actions',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'prism 中文 空格-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const file=path.join(dir,'正常 对照.mp4');await fs.writeFile(file,'fixture');
 const folder=await readPreview(dir,dir);assert.equal(folder.kind,'directory');
 assert.equal((await readPreview(require('node:url').pathToFileURL(file).href,dir)).kind,'external');
 assert.equal((await readPreview('/'+file.replaceAll('\\','/')+'#L12',dir)).path,file);
 const calls=[],shell={openPath:async p=>{calls.push(['open',p]);return '';},showItemInFolder:p=>calls.push(['reveal',p])};
 await openLocal(dir,'open',shell);await openLocal(file,'open',shell);await openLocal(file,'reveal',shell);
 assert.deepEqual(calls,[['open',dir],['open',file],['reveal',file]]);
 const exe=path.join(dir,'tool.exe');await fs.writeFile(exe,'fixture');await openLocal(exe,'open',shell);assert.deepEqual(calls.at(-1),['reveal',exe]);
 await assert.rejects(openLocal(file,'open',{openPath:async()=> 'No associated application'}),/No associated/);
 await assert.rejects(openLocal(file,'delete',shell),/不支持/);
});
test('standalone code paths are identified without turning commands into links',async()=>{
 const {localPathText}=await import('../src/local-path.js');
 for(const p of ['A:\\vibe coding\\中文目录','/A:/vibe coding/中文.mp4','file:///A:/vibe%20coding/test.mp4'])assert.equal(localPathText(p+'\n'),p);
 for(const p of ['node app.js','some prose','A:\\one\nA:\\two'])assert.equal(localPathText(p),null);
});
test('preview allows web URLs without exposing script or credential schemes',()=>{
 assert.equal(targetPath('http://localhost:5173/',process.cwd()).url,'http://localhost:5173/');
 for(const value of ['javascript:alert(1)','https://user:secret@example.com/','data:text/html,x'])assert.throws(()=>targetPath(value,process.cwd()));
});
