const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const branding=require('../electron/branding.cjs');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-branding-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
test('first launch uses installer language, then the system locale when no installer choice exists',t=>{
 const root=fixture(t);
 for(const [code,expected] of [['1033','en'],['2052','zh'],['1028','zh-TW']]){
  fs.writeFileSync(path.join(root,'prism-install-language.txt'),code);
  assert.equal(branding.settings({theme:'dark'},{locale:'ja-JP',installDirectory:root}).language,expected);
 }
 fs.unlinkSync(path.join(root,'prism-install-language.txt'));
 for(const [locale,expected] of [['en-US','en'],['zh-CN','zh'],['zh-Hant-TW','zh-TW'],['ja-JP','ja'],['pt-BR','en']])assert.equal(branding.settings({}, {locale,installDirectory:root}).language,expected);
});
test('upgrades preserve a manually saved language and all other preferences',t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'prism-install-language.txt'),'1033');
 const saved={language:'zh-TW',theme:'dark',defaultMode:'read-only',customPreference:{enabled:true}};
 assert.strictEqual(branding.settings(saved,{locale:'en-US',installDirectory:root}),saved);
 assert.equal(branding.name('zh-TW'),'棱镜');assert.equal(branding.name('en'),'Prism');assert.equal(branding.name('de'),'Prism');
});
