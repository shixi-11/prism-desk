const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {compareVersions,releaseInfo}=require('../electron/release.cjs');
const {checkRelease,releaseBody,findReleaseByTag}=require('../scripts/release.cjs');
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

test('draft lookup falls back to paginated releases and selects the exact unique tag',async()=>{
 const calls=[];
 const found=await findReleaseByTag(async endpoint=>{calls.push(endpoint);if(endpoint.startsWith('releases/tags/'))return null;if(endpoint.endsWith('page=1'))return Array.from({length:100},(_,i)=>({tag_name:`v0.2.${i}`,draft:true}));return [{tag_name:'v0.1.44',draft:true,id:44,body:'preserve me'}];},'v0.1.44');
 assert.equal(found.id,44);assert.equal(found.body,'preserve me');assert.ok(calls.includes('releases?per_page=100&page=2'));
});
test('draft lookup rejects duplicate exact tags and never returns a different version',async()=>{
 await assert.rejects(findReleaseByTag(async endpoint=>endpoint.startsWith('releases/tags/')?null:[{tag_name:'v0.1.43',draft:true},{tag_name:'v0.1.44',draft:true},{tag_name:'v0.1.44',draft:false}],'v0.1.44'),/multiple releases/);
 const none=await findReleaseByTag(async endpoint=>endpoint.startsWith('releases/tags/')?null:[{tag_name:'v0.1.43',draft:true}],'v0.1.44');assert.equal(none,null);
});
test('installer release verification text stays in the matching language section',()=>{
 const release={version:'0.2.0',date:'2026-09-09',notes:{en:['Added image support.'],zh:['支持图片输入。']},distribution:['windows-x64','mac-arm64','mac-x64']};
 const body=releaseBody(release),en=body.split('## 简体中文')[0],zh=body.split('## 简体中文')[1];
 assert.match(en,/Installer integrity/);assert.match(en,/Source build/);assert.doesNotMatch(en,/安装包完整性|源码构建/);
 assert.match(zh,/安装包完整性/);assert.match(zh,/源码构建/);assert.doesNotMatch(zh,/Installer integrity|Source build/);
});