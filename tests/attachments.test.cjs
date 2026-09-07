const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {codexInput,claudeInput,attachmentFiles}=require('../electron/attachments.cjs');
test('images use native provider payloads and attachment ids cannot traverse paths',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prism-image-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'image.png');fs.writeFileSync(file,Buffer.from([1,2,3]));
 assert.deepEqual(codexInput(' See ',[{path:file}]),[{type:'text',text:'See'},{type:'localImage',path:file}]);
 const payload=JSON.parse(claudeInput('See',[{path:file}]));assert.equal(payload.message.content[1].source.data,'AQID');assert.equal(payload.message.content[1].source.media_type,'image/png');
 assert.throws(()=>attachmentFiles(dir,['../secret']));assert.throws(()=>attachmentFiles(dir,Array(6).fill('x')));
});
