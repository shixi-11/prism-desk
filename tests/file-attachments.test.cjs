const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {addAttachment,attachmentFiles,codexInput,claudeInput,grokInput,attachmentText}=require('../electron/attachments.cjs');
test('document bytes, extensions and metadata survive imports; mixed payloads keep files out of images',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prism-files-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 for(const name of ['报告.pdf','table.xlsx','slides.pptx','notes.md','no-extension']){
  const bytes=Buffer.from([0,1,128,255,10]);const added=addAttachment(dir,{name,data:bytes.toString('base64')});const [file]=attachmentFiles(dir,[added.id]);assert.equal(file.kind,'file');assert.equal(file.name,name);assert.deepEqual(fs.readFileSync(file.path),bytes);
  const image={path:path.join(dir,'image.png')};fs.writeFileSync(image.path,'image');
  const codex=codexInput('Read',[file,image]);assert.equal(codex.length,2);assert.equal(codex[1].type,'localImage');assert.ok(codex[0].text.includes(JSON.stringify(file.path)));
  const claude=JSON.parse(claudeInput('Read',[file,image])).message.content;assert.equal(claude.length,2);assert.equal(claude[1].type,'image');
  assert.equal(grokInput('Read',[file]).length,1);assert.ok(grokInput('Read',[file],false)[0].text.includes(file.name));assert.ok(attachmentText('Read',[file]).includes(JSON.stringify(file.path)));
 }
});
test('tampered metadata cannot escape attachment directory; file limits reject before decoding',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prism-files-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const added=addAttachment(dir,{name:'file.txt',data:'QQ=='});
 fs.writeFileSync(path.join(dir,'attachments',added.id+'.json'),JSON.stringify({fileName:'../secret'}));assert.throws(()=>attachmentFiles(dir,[added.id]),/附件无效/);
 assert.throws(()=>addAttachment(dir,{name:'large.pdf',data:'A'.repeat(70*1024*1024+1)}),/50 MB/);
});
