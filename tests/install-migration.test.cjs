const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { registerSource, migrate, migrateFrom, discoverSource } = require('../electron/install-migration.cjs');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-install-migration-'));
  const sharedRoot = path.join(root, 'shared'), sourceData = path.join(sharedRoot, '.local');
  const userData = path.join(root, 'installed');
  fs.mkdirSync(sourceData, { recursive: true }); fs.mkdirSync(userData, { recursive: true });
  const configFile = path.join(sourceData, 'config.json');
  const config = {
    profiles: [{ id: 'codex-one', provider: 'Codex', name: 'Work', model: 'gpt-6', home: path.join(root, 'provider-home'), executable: 'codex', write: true }],
    assistant: { path: path.join(root, 'assistant'), instructions: 'Keep context' },
    skillsPath: path.join(root, 'skills'), geminiEntry: '', storageRoot: '', apps: {},
  };
  fs.writeFileSync(configFile, '\uFEFF' + JSON.stringify(config));
  return { root, sharedRoot, sourceData, userData, configFile, config };
}
function clean(f) { fs.rmSync(f.root, { recursive: true, force: true }); }

test('imports approved config and state, merges destination draft values, and is safe to retry', t => {
  const f = fixture(); t.after(() => clean(f));
  fs.writeFileSync(path.join(f.sourceData, 'settings.json'), JSON.stringify({ language: 'zh-CN', theme: 'dark' }));
  const template=require('../electron/task-templates.cjs').save({title:'Reusable review',body:'Keep the approved layout.'},f.sourceData);
  fs.writeFileSync(path.join(f.userData, 'settings.json'), JSON.stringify({ theme: 'light' }));
  fs.mkdirSync(path.join(f.sourceData, 'drafts'));
  fs.writeFileSync(path.join(f.sourceData, 'drafts', 'window.json'), JSON.stringify({ old: 1, edit: 'source' }));
  fs.mkdirSync(path.join(f.userData, 'drafts'));
  fs.writeFileSync(path.join(f.userData, 'drafts', 'window.json'), JSON.stringify({ edit: 'destination' }));
  fs.mkdirSync(path.join(f.sourceData, 'tasks', '123e4567-e89b-12d3-a456-426614174000'), { recursive: true });
  fs.writeFileSync(path.join(f.sourceData, 'tasks', '123e4567-e89b-12d3-a456-426614174000', 'task.json'), '{"id":"kept"}');
  registerSource({ sharedRoot: f.sharedRoot, configFile: f.configFile, userData: f.sourceData });
  const marker = JSON.parse(fs.readFileSync(path.join(f.sharedRoot, 'source-installation.json')));
  assert.deepEqual(Object.keys(marker).sort(), ['configFile', 'sourceData']);
  assert.equal(migrate({ sharedRoot: f.sharedRoot, userData: f.userData }).migrated, true);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.userData, 'config.json'))), f.config);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.userData, 'settings.json'))), { language: 'zh-CN', theme: 'light' });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.userData, 'drafts', 'window.json'))), { old: 1, edit: 'destination' });
  assert.deepEqual(require('../electron/task-templates.cjs').list(f.userData),[template]);
  assert.equal(fs.readFileSync(path.join(f.userData, 'tasks', '123e4567-e89b-12d3-a456-426614174000', 'task.json'), 'utf8'), '{"id":"kept"}');
  assert.equal(migrate({ sharedRoot: f.sharedRoot, userData: f.userData }).reason, 'installed-config-exists');
  assert.equal(fs.readFileSync(f.configFile, 'utf8').startsWith('\uFEFF'), true);
});

test('does nothing without marker and leaves installed config untouched', t => {
  const f = fixture(); t.after(() => clean(f));
  assert.equal(migrate({ sharedRoot: f.sharedRoot, userData: f.userData }).reason, 'no-source-marker');
  fs.writeFileSync(path.join(f.userData, 'config.json'), '{"profiles":[]}');
  registerSource({ sharedRoot: f.sharedRoot, configFile: f.configFile, userData: f.sourceData });
  assert.equal(migrate({ sharedRoot: f.sharedRoot, userData: f.userData }).migrated, false);
  assert.equal(fs.readFileSync(path.join(f.userData, 'config.json'), 'utf8'), '{"profiles":[]}');
});

test('invalid config fails before writing state or installed config', t => {
  const f = fixture(); t.after(() => clean(f));
  fs.writeFileSync(f.configFile, '{"profiles":"bad"}');
  registerSource({ sharedRoot: f.sharedRoot, configFile: f.configFile, userData: f.sourceData });
  assert.throws(() => migrate({ sharedRoot: f.sharedRoot, userData: f.userData }), /Invalid source configuration/);
  assert.equal(fs.existsSync(path.join(f.userData, 'config.json')), false);
  assert.deepEqual(fs.readdirSync(f.userData), []);
});

test('never imports credentials, message queue, or cache and never changes source data', t => {
  const f = fixture(); t.after(() => clean(f));
  for (const [name, value] of [['message-queue.json', 'queue'], ['auth.json', 'auth'], ['secret.json', 'secret']]) fs.writeFileSync(path.join(f.sourceData, name), value);
  fs.mkdirSync(path.join(f.sourceData, 'Electron Cache')); fs.writeFileSync(path.join(f.sourceData, 'Electron Cache', 'x'), 'cache');
  const before = fs.readdirSync(f.sourceData).sort();
  registerSource({ sharedRoot: f.sharedRoot, configFile: f.configFile, userData: f.sourceData });
  registerSource({ sharedRoot: f.sharedRoot, configFile: f.configFile, userData: f.sourceData });
  const markerContents = fs.readFileSync(path.join(f.sharedRoot, 'source-installation.json'), 'utf8');
  assert.doesNotMatch(markerContents, /token|secret|auth/i);
  migrate({ sharedRoot: f.sharedRoot, userData: f.userData });
  for (const name of ['message-queue.json', 'auth.json', 'secret.json', 'Electron Cache']) assert.equal(fs.existsSync(path.join(f.userData, name)), false);
  assert.deepEqual(fs.readdirSync(f.sourceData).sort(), before);
  assert.equal(fs.readFileSync(path.join(f.sourceData, 'message-queue.json'), 'utf8'), 'queue');
});

test('explicit migrateFrom refuses source and destination identity collision', t => {
  const f = fixture(); t.after(() => clean(f));
  assert.throws(() => migrateFrom({ configFile: path.join(f.userData, 'config.json'), sourceData: f.sourceData, userData: f.userData }), /must differ/);
});

test('preserves the purged task array and imports capability and plugin inventories', t => {
  const f = fixture(); t.after(() => clean(f));
  fs.writeFileSync(path.join(f.sourceData, 'purged-tasks.json'), JSON.stringify(['old-id', 'shared-id']));
  fs.writeFileSync(path.join(f.userData, 'purged-tasks.json'), JSON.stringify(['shared-id', 'new-id']));
  fs.writeFileSync(path.join(f.sourceData, 'shared-capabilities.json'), JSON.stringify({ sources: [{ path: f.config.skillsPath }] }));
  fs.writeFileSync(path.join(f.sourceData, 'plugin-inventory.json'), JSON.stringify({ plugins: ['approved'] }));
  registerSource({ sharedRoot: f.sharedRoot, configFile: f.configFile, userData: f.sourceData });
  migrate({ sharedRoot: f.sharedRoot, userData: f.userData });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.userData, 'purged-tasks.json'))), ['old-id', 'shared-id', 'new-id']);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.userData, 'shared-capabilities.json'))), { sources: [{ path: f.config.skillsPath }] });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.userData, 'plugin-inventory.json'))), { plugins: ['approved'] });
});

test('rejects a relative assistant path before writing installed files', t => {
  const f = fixture(); t.after(() => clean(f));
  f.config.assistant.path = 'relative-assistant';
  fs.writeFileSync(f.configFile, JSON.stringify(f.config));
  registerSource({ sharedRoot: f.sharedRoot, configFile: f.configFile, userData: f.sourceData });
  assert.throws(() => migrate({ sharedRoot: f.sharedRoot, userData: f.userData }), /assistant.path must be an absolute path/);
  assert.deepEqual(fs.readdirSync(f.userData), []);
});
test('discovers the prior source shortcut without scanning unrelated folders',t=>{
 const f=fixture();t.after(()=>clean(f));
 const shortcut=path.join(f.root,'old.lnk');fs.writeFileSync(shortcut,'fixture');
 fs.writeFileSync(path.join(f.sharedRoot,'package.json'),JSON.stringify({name:'prism-desk'}));
 const old={cwd:f.sharedRoot,target:path.join(f.sharedRoot,'runtime','desktop','Prism.exe'),args:`"${f.sharedRoot}" --user-data-dir="${f.sourceData}"`};
 assert.deepEqual(discoverSource({shortcuts:[shortcut],readShortcut:()=>old}),{configFile:f.configFile,sourceData:f.sourceData});
 assert.equal(discoverSource({shortcuts:[shortcut],readShortcut:()=>({...old,target:path.join(f.root,'other.exe')})}),null);
});
