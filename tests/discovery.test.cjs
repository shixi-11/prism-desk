require('./helpers/config-fixture.cjs');
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const{resolveExecutable}=require('../electron/discovery.cjs');
test('desktop with no CLI PATH finds official executable and ignores empty version directories',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-discovery-'));t.after(()=>{const real=fs.realpathSync.native(root);assert.equal(path.dirname(real).toLowerCase(),fs.realpathSync.native(os.tmpdir()).toLowerCase());assert.ok(path.basename(real).startsWith('prism-discovery-'));fs.rmSync(real,{recursive:true,force:true});});
 const base=path.join(root,'OpenAI','Codex','bin');for(const dir of ['old','new','empty'])fs.mkdirSync(path.join(base,dir),{recursive:true});
 const old=path.join(base,'old','codex.exe'),current=path.join(base,'new','codex.exe');fs.writeFileSync(old,'fixture');fs.writeFileSync(current,'fixture');fs.utimesSync(old,1,1);
 assert.equal(resolveExecutable({provider:'Codex',executable:'codex.exe'},{LOCALAPPDATA:root,Path:''}),current);
 assert.throws(()=>resolveExecutable({provider:'Codex',executable:'codex.exe'},{LOCALAPPDATA:'',Path:'.'}),/没有找到/);
 const previous=process.env.PRISM_TEST_DATA;process.env.PRISM_TEST_DATA=root;
 try{const app={name:'ComfyUI',path:current,probe:'comfy'},record={ok:true,path:current,mtimeMs:fs.statSync(current).mtimeMs,checkedAt:new Date().toISOString()};const cache=path.join(root,'capability-checks.json');fs.writeFileSync(cache,JSON.stringify({apps:{ComfyUI:record}}));assert.equal(require('../electron/diagnostics.cjs').observedApp(app).ok,true);record.checkedAt=new Date(Date.now()-121000).toISOString();fs.writeFileSync(cache,JSON.stringify({apps:{ComfyUI:record}}));assert.equal(require('../electron/diagnostics.cjs').observedApp(app),null);}finally{if(previous===undefined)delete process.env.PRISM_TEST_DATA;else process.env.PRISM_TEST_DATA=previous;}
 assert.throws(()=>resolveExecutable({provider:'Claude',executable:path.join(root,'missing.exe')},{}),/失效/);
 const fallback=path.join(root,'fallback');fs.mkdirSync(fallback);fs.writeFileSync(path.join(fallback,'tool.exe'),'fixture');assert.equal(resolveExecutable({provider:'Other',executable:'tool.exe'},{Path:fallback}),path.join(fallback,'tool.exe'));
});
