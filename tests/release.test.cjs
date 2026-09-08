const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {compareVersions,releaseInfo}=require('../electron/release.cjs');
const {checkRelease,releaseBody}=require('../scripts/release.cjs');
test('only stable, documented numeric releases are accepted',()=>{
 assert.equal(compareVersions('0.10.0','0.9.9'),1);assert.equal(compareVersions('0.2.0','0.2.0'),0);assert.equal(compareVersions('0.1.9','0.2.0'),-1);
 for(const tag_name of ['main','v0.2.0-beta','v01.2.0','v../../file'])assert.throws(()=>releaseInfo({tag_name,body:'notes'}));
 for(const extra of [{draft:true},{prerelease:true},{body:''}])assert.throws(()=>releaseInfo({tag_name:'v0.2.0',body:'notes',...extra}));
 assert.equal(releaseInfo({tag_name:'v0.2.0',body:'notes'}).version,'0.2.0');
});
test('publish checks reject mismatched versions or missing change notes',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-release-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const write=(name,value)=>fs.writeFileSync(path.join(root,name),JSON.stringify(value));
 const release={version:'0.2.0',date:'2026-09-09',notes:{en:['Added image support.'],zh:['支持图片输入。']}};
 write('package.json',{version:'0.2.0'});write('package-lock.json',{version:'0.2.0',packages:{'':{version:'0.2.0'}}});write('release.json',release);
 assert.equal(checkRelease(root).version,'0.2.0');write('release.json',{...release,version:'0.1.0'});assert.throws(()=>checkRelease(root),/same release version/);
 write('release.json',{...release,notes:{en:[],zh:['支持图片输入。']}});assert.throws(()=>checkRelease(root),/release notes/);
});
test('one bilingual release body provides locale-specific notes without mixed paragraphs',async()=>{
 const release={version:'0.2.0',date:'2026-09-09',notes:{en:['Added image support.'],zh:['支持图片输入。']}};
 const body=releaseBody(release),{releaseNotes}=await import('../src/release-notes.js');
 assert.ok(body.indexOf('## English')<body.indexOf('## 简体中文'));
 assert.equal(releaseNotes(body,'zh-CN'),'- 支持图片输入。');assert.equal(releaseNotes(body,'ja'),'- Added image support.');
 assert.equal(releaseNotes('Older release notes','en'),'Older release notes');
});
