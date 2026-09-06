require('./helpers/config-fixture.cjs');
const { test }=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {spawnCLI,profileFor}=require('../electron/core.cjs');
const processHostAvailable=process.platform==='win32' && fs.existsSync(path.join(__dirname,'..','runtime','PrismProcess.exe'));
const hostOptions={skip:!processHostAvailable && 'Build the Windows PrismProcess host to run process isolation checks'};
test('explicit stop acknowledges only after all job descendants exit',hostOptions,async()=>{
 const proc=spawnCLI({...profileFor('codex-test-1'),executable:process.execPath},['-e',"const p=require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',windowsHide:true});console.log(p.pid);setInterval(()=>{},1000);"],process.cwd());
 let pid;const closed=new Promise((resolve,reject)=>{proc.once('close',resolve);proc.once('error',reject);});
 await new Promise(resolve=>proc.stdout.once('data',d=>{pid=Number(String(d).trim());resolve();}));
 await proc.requestStop();assert.equal(await closed,1223);assert.throws(()=>process.kill(pid,0));
});
test('Windows job waits for and terminates descendants before allowing relay',hostOptions,async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-process-test-'));
 t.after(()=>{const resolved=fs.realpathSync.native(root);if(path.dirname(resolved).toLowerCase()!==fs.realpathSync.native(os.tmpdir()).toLowerCase()||!path.basename(resolved).startsWith('prism-process-test-'))throw Error('Invalid cleanup path');fs.rmSync(resolved,{recursive:true,force:true});});
 const child=path.join(root,'child.cjs');
 fs.writeFileSync(child,`const {spawn}=require('node:child_process');const p=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',windowsHide:true});console.log(p.pid);process.exit(0);`);
 const proc=spawnCLI({...profileFor('codex-test-1'),executable:process.execPath},[child],root);let output='';proc.stdout.on('data',d=>output+=d);proc.stderr.on('data',()=>{});proc.stdin.end();
 const code=await new Promise((resolve,reject)=>{proc.on('close',resolve);proc.on('error',reject);});assert.equal(code,0);const pid=Number(output.trim());assert.ok(Number.isInteger(pid)&&pid>0);assert.throws(()=>process.kill(pid,0));
});
