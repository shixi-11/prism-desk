const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {codexInput,claudeInput,grokInput,attachmentFiles}=require('../electron/attachments.cjs');
test('images use native provider payloads and attachment ids cannot traverse paths',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prism-image-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'image.png');fs.writeFileSync(file,Buffer.from([1,2,3]));
 assert.deepEqual(codexInput(' See ',[{path:file}]),[{type:'text',text:'See'},{type:'localImage',path:file}]);
 const payload=JSON.parse(claudeInput('See',[{path:file}]));assert.equal(payload.message.content[1].source.data,'AQID');assert.equal(payload.message.content[1].source.media_type,'image/png');
 assert.deepEqual(grokInput(' See ',[{path:file}]),[{type:'text',text:'See'},{type:'image',mimeType:'image/png',data:'AQID'}]);
 const native=grokInput('See',[{path:file}],false);assert.match(native[0].text,/native Read tool/);assert.ok(native[0].text.includes(JSON.stringify(file)));assert.deepEqual(native[1],{type:'text',text:'See'});
 assert.throws(()=>attachmentFiles(dir,['../secret']));assert.throws(()=>attachmentFiles(dir,Array(6).fill('x')));
});
