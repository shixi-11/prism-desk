const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {InstallerUpdater}=require('../electron/installer-updater.cjs'),{releaseInfo}=require('../electron/release.cjs');
const data=Buffer.from('verified installer fixture'),sha256=crypto.createHash('sha256').update(data).digest('hex');
function fixture(t,platform='win32',arch='x64',downloadData=data){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-installer-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let downloads=0;const key=platform==='darwin'?`mac-${arch}`:'windows-x64';
 const u=new InstallerUpdater({root,version:'0.1.0',platform,arch,fetchRelease:async()=>({version:'0.1.1',installers:{[key]:{url:'https://example.invalid/installer',size:data.length,sha256}}}),download:async()=>{downloads++;return new Response(downloadData);}});
 return {u,downloads:()=>downloads};
}
test('checking never downloads; explicit preparation verifies bytes and activation rechecks them',async t=>{
 const {u,downloads}=fixture(t);assert.equal((await u.check()).status,'available');assert.equal(downloads(),0);assert.equal(fs.existsSync(u.installerFile()),false);
 assert.equal((await u.prepare()).status,'ready');assert.equal(downloads(),1);assert.equal(await u.activate(),u.installerFile());u.cancelActivation();
 fs.writeFileSync(u.installerFile(),'tampered');await assert.rejects(u.activate(),/not ready/);
});
test('bad digest and oversized downloads cannot become installable',async t=>{
 for(const bytes of [Buffer.alloc(data.length),Buffer.alloc(data.length+1)]){const {u}=fixture(t,'win32','x64',bytes);await u.check();assert.equal((await u.prepare()).status,'error');assert.equal(fs.existsSync(u.installerFile()),false);assert.equal(fs.existsSync(u.installerFile()+'.partial'),false);await assert.rejects(u.activate());}
});
test('Mac selects the matching native disk image and never falls back to Windows',async t=>{
 for(const arch of ['arm64','x64']){const {u}=fixture(t,'darwin',arch);await u.check();assert.equal((await u.prepare()).distribution,'mac-dmg');assert.ok(u.installerFile().endsWith(`-${arch}.dmg`));assert.equal(await u.activate(),u.installerFile());}
 const {u}=fixture(t,'darwin');u.fetchRelease=async()=>({version:'0.1.1',installer:{size:data.length,sha256}});assert.equal((await u.check()).status,'error');
});
test('release assets require exact official names, URLs and published digests',()=>{
 const base={tag_name:'v0.1.1',body:'notes'},url='https://github.com/shixi-11/prism-desk/releases/download/v0.1.1/Prism-arm64.dmg',asset={name:'Prism-arm64.dmg',browser_download_url:url,size:data.length,digest:'sha256:'+sha256};
 assert.equal(releaseInfo({...base,assets:[asset]}).installers['mac-arm64'].sha256,sha256);
 for(const change of [{browser_download_url:'https://example.invalid/file'},{digest:undefined},{name:'Prism-evil.dmg'},{size:0}])assert.equal(Object.keys(releaseInfo({...base,assets:[{...asset,...change}]}).installers).length,0);
});
test('publication refuses missing, duplicate or tampered installer assets',()=>{
 const {verifyReleaseAssets}=require('../scripts/release.cjs'),expected=[{name:'Prism-arm64.dmg',size:data.length,sha256}],asset={name:'Prism-arm64.dmg',size:data.length,digest:'sha256:'+sha256,state:'uploaded'};
 assert.doesNotThrow(()=>verifyReleaseAssets({assets:[asset]},expected,true));
 assert.throws(()=>verifyReleaseAssets({assets:[]},expected,true),/expected installer/);
 assert.throws(()=>verifyReleaseAssets({assets:[asset,asset]},expected,true),/duplicate/);
 assert.throws(()=>verifyReleaseAssets({assets:[{...asset,digest:'sha256:'+'0'.repeat(64)}]},expected,true),/does not match/);
});
