const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {loadConfig, defaultConfig} = require('../electron/config.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-config-'));
  t.after(() => {
    assert.equal(path.dirname(fs.realpathSync(root)).toLowerCase(), fs.realpathSync(os.tmpdir()).toLowerCase());
    assert.ok(path.basename(root).startsWith('prism-config-'));
    fs.rmSync(root, {recursive:true, force:true});
  });
  return root;
}

test('unconfigured install has generic isolated accounts and no personal assistant source', t => {
  const root=fixture(t), env={USERPROFILE:root, LOCALAPPDATA:path.join(root,'appdata')};
  const config=loadConfig(path.join(root,'absent.json'),env);
  assert.equal(config.profiles.length,3);
  assert.deepEqual(config.assistant,{path:'',instructions:''});
  assert.equal(config.skillsPath,'');
  assert.equal(config.geminiEntry,'');
  for(const p of config.profiles) {
    assert.ok(p.home.startsWith(env.LOCALAPPDATA));
    assert.match(p.id,/^(codex|claude|grok|gemini)-personal-1$/);
    assert.ok(!p.home.includes('@'));
  }
});

test('explicit local configuration preserves account identity and assistant settings', t => {
  const root=fixture(t), file=path.join(root,'config.json');
  const original=defaultConfig({USERPROFILE:root,LOCALAPPDATA:root});
  original.profiles[0].id='existing-account';
  original.profiles[0].home=path.join(root,'existing-login');
  original.assistant={path:path.join(root,'assistant'),instructions:'Use the configured assistant.'};
  original.geminiEntry=path.join(root,'gemini.js');
  fs.writeFileSync(file,JSON.stringify(original));
  assert.deepEqual(loadConfig(file),original);
});

test('bad configuration cannot silently fall back to a different account', t => {
  const root=fixture(t),file=path.join(root,'config.json');
  fs.writeFileSync(file,'{invalid');
  assert.throws(()=>loadConfig(file));
  const config=defaultConfig();config.profiles.push({...config.profiles[0]});
  fs.writeFileSync(file,JSON.stringify(config));
  assert.throws(()=>loadConfig(file),/unique/);
  const missing=path.join(root,'missing.json');
  assert.throws(()=>loadConfig(missing,{PRISM_CONFIG:missing}),/does not exist/);
});

test('fresh installation can create tasks without personal profiles or assistant dependencies', t => {
  const root=fixture(t),file=path.join(root,'config.json');
  fs.writeFileSync(file,'{}');
  const corePath=path.resolve(__dirname,'../electron/core.cjs');
  const script=`const assert=require('node:assert/strict'); const c=require(${JSON.stringify(corePath)}); const s=new c.TaskStore(${JSON.stringify(path.join(root,'tasks'))}); const task=s.create({title:'Example',cwd:${JSON.stringify(root)}}); assert.equal(task.profile,'codex-personal-1'); const p=c.environmentPrompt(task,{apps:[]},{path:${JSON.stringify(path.join(root,'record.md'))},hash:'example',bytes:0}); assert.ok(!p.includes('按需读取用户配置的助手入口')); assert.ok(!p.includes('太初')); assert.ok(!p.includes('小主人'));`;
  require('node:child_process').execFileSync(process.execPath,['-e',script],{env:{...process.env,PRISM_CONFIG:file},windowsHide:true});
});

test('configured app paths take priority and default storage does not copy itself', t => {
  const root=fixture(t),file=path.join(root,'config.json'),binary=path.join(root,'blender.exe');
  fs.writeFileSync(binary,'fixture');
  fs.writeFileSync(file,JSON.stringify({apps:{Blender:binary}}));
  const discovery=path.resolve(__dirname,'../electron/discovery.cjs');
  const storage=path.resolve(__dirname,'../electron/storage.cjs');
  const user=path.join(root,'userdata');
  const script=`const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'); const app=require(${JSON.stringify(discovery)}).discoverApps().find(a=>a.name==='Blender'); assert.equal(app.path,${JSON.stringify(binary)}); const {taskRoot}=require(${JSON.stringify(storage)}); const target=taskRoot(${JSON.stringify(root)},${JSON.stringify(user)},''); assert.equal(target,path.join(${JSON.stringify(user)},'tasks')); const id='12345678-1234-1234-1234-123456789012'; fs.mkdirSync(path.join(target,id)); fs.writeFileSync(path.join(target,id,'task.json'),'{}'); assert.equal(taskRoot(${JSON.stringify(root)},${JSON.stringify(user)},''),target); assert.equal(fs.readdirSync(target).length,1);`;
  require('node:child_process').execFileSync(process.execPath,['-e',script],{env:{...process.env,PRISM_CONFIG:file},windowsHide:true});
});
