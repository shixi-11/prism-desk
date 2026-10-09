const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const atomic = require('./atomic-file.cjs').atomic;

const POINTER = 'source-installation.json';
const JSON_FILES = ['settings.json', 'purged-tasks.json', 'model-preference-request.json'];

function absolute(value, name) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) throw Error(`${name} must be an absolute path.`);
  return path.resolve(value);
}
function same(a, b) { const left = path.resolve(a), right = path.resolve(b); return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right; }
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}
function validateConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config) || !Array.isArray(config.profiles)) throw Error('Invalid source configuration.');
  const ids = new Set();
  for (const p of config.profiles) {
    if (!p || !['Codex', 'Claude', 'Grok', 'Gemini'].includes(p.provider) || typeof p.id !== 'string' || !/^[\w-]+$/.test(p.id) || ids.has(p.id)) throw Error('Invalid source profile.');
    ids.add(p.id);
    for (const key of ['name', 'model', 'home', 'executable']) if (typeof p[key] !== 'string' || !p[key]) throw Error(`Invalid source profile ${key}.`);
    absolute(p.home, 'profile.home');
    if (typeof p.write !== 'boolean') throw Error('Invalid source profile write permission.');
  }
  if (!config.assistant || typeof config.assistant.path !== 'string' || typeof config.assistant.instructions !== 'string') throw Error('Invalid source assistant configuration.');
  if (config.assistant.path) absolute(config.assistant.path, 'assistant.path');
  for (const key of ['skillsPath', 'geminiEntry', 'storageRoot']) {
    if (typeof config[key] !== 'string') throw Error(`Invalid source ${key}.`);
    if (config[key]) absolute(config[key], key);
  }
  if (!config.apps || typeof config.apps !== 'object' || Array.isArray(config.apps)) throw Error('Invalid source apps configuration.');
  return config;
}
function registerSource({ sharedRoot, configFile, userData }) {
  const root = absolute(sharedRoot, 'sharedRoot'), config = absolute(configFile, 'configFile'), sourceData = absolute(userData, 'userData');
  const pointer = path.join(root, POINTER);
  atomic(pointer, { configFile: config, sourceData });
  return pointer;
}
function assertNotLink(file) {
  try { if (fs.lstatSync(file).isSymbolicLink()) throw Error(`Refusing symbolic link: ${file}`); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
}
function discoverSource({ shortcuts, readShortcut }) {
  const candidates = [];
  for (const file of shortcuts) {
    if (!fs.existsSync(file)) continue;
    let shortcut;
    try { shortcut = readShortcut(file); } catch { continue; }
    const root = shortcut.cwd;
    if (!root || !path.isAbsolute(root)) continue;
    const executable = path.join(root, 'runtime', 'desktop', 'Prism.exe');
    if (!shortcut.target || !same(shortcut.target, executable)) continue;
    const configFile = path.join(root, '.local', 'config.json');
    if (!fs.existsSync(configFile)) continue;
    try { if (readJson(path.join(root, 'package.json')).name !== 'prism-desk') continue; } catch { continue; }
    const args = shortcut.args || '';
    const user = args.match(/--user-data-dir=(?:"([^"]+)"|(\S+))/);
    const sourceData = user?.[1] || user?.[2] || path.join(root, '.local', 'desktop-runtime');
    if (!path.isAbsolute(sourceData)) continue;
    if (!candidates.some(c => same(c.configFile, configFile))) candidates.push({ configFile, sourceData });
  }
  if (candidates.length > 1) throw Error('Multiple Prism source installations were found. Choose the existing configuration explicitly.');
  return candidates[0] || null;
}
function importKnownFiles(sourceData, userData, configDir) {
  for (const name of JSON_FILES) {
    const from = path.join(sourceData, name), to = path.join(userData, name);
    if (!fs.existsSync(from)) continue;
    assertNotLink(from); assertNotLink(to);
    const source = readJson(from);
    if (name === 'purged-tasks.json') {
      if (!Array.isArray(source)) throw Error('Invalid source purged-task list.');
      const existing = fs.existsSync(to) ? readJson(to) : [];
      if (!Array.isArray(existing)) throw Error('Invalid installed purged-task list.');
      atomic(to, [...new Set([...source, ...existing])]);
    } else atomic(to, fs.existsSync(to) ? { ...source, ...readJson(to) } : source);
  }
  for (const name of ['shared-capabilities.json', 'plugin-inventory.json']) {
    const from = path.join(configDir, name), to = path.join(userData, name);
    if (!fs.existsSync(from) || fs.existsSync(to)) continue;
    assertNotLink(from); assertNotLink(to);
    atomic(to, readJson(from));
  }
  const fromDrafts = path.join(sourceData, 'drafts'), toDrafts = path.join(userData, 'drafts');
  if (!fs.existsSync(fromDrafts)) return;
  assertNotLink(fromDrafts); fs.mkdirSync(toDrafts, { recursive: true }); assertNotLink(toDrafts);
  for (const name of fs.readdirSync(fromDrafts).filter(n => n.endsWith('.json'))) {
    const from = path.join(fromDrafts, name), to = path.join(toDrafts, name);
    assertNotLink(from); if (!fs.statSync(from).isFile()) continue;
    if (!fs.existsSync(to)) { atomic(to, readJson(from)); continue; }
    assertNotLink(to);
    const merged = { ...readJson(from), ...readJson(to) };
    atomic(to, merged);
  }
}
function importTasks(sourceData, userData) {
  const source = path.join(sourceData, 'tasks'), target = path.join(userData, 'tasks');
  if (!fs.existsSync(source)) return;
  assertNotLink(source); fs.mkdirSync(target, { recursive: true }); assertNotLink(target);
  for (const name of fs.readdirSync(source)) {
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(name)) continue;
    const from = path.join(source, name), to = path.join(target, name);
    assertNotLink(from);
    if (!fs.statSync(from).isDirectory()) continue;
    assertNotLink(to);
    if (fs.existsSync(to)) {
      const existingTask = path.join(to, 'task.json');
      assertNotLink(existingTask);
      if (!fs.existsSync(existingTask) || !fs.statSync(existingTask).isFile()) throw Error(`Incomplete installed task directory: ${name}`);
      readJson(existingTask);
      continue;
    }
    const stage = path.join(target, `.${name}.${crypto.randomUUID()}.importing`);
    try {
      fs.cpSync(from, stage, { recursive: true, errorOnExist: true, filter: p => { assertNotLink(p); return true; } });
      const taskFile = path.join(stage, 'task.json');
      assertNotLink(taskFile);
      if (!fs.existsSync(taskFile) || !fs.statSync(taskFile).isFile()) throw Error(`Invalid source task directory: ${name}`);
      readJson(taskFile);
      fs.renameSync(stage, to);
    } finally { if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true }); }
  }
}
function migrateFrom({ configFile, sourceData, userData }) {
  const configPath = absolute(configFile, 'configFile'), dataPath = absolute(sourceData, 'sourceData'), target = absolute(userData, 'userData');
  const destinationConfig = path.join(target, 'config.json');
  if (same(configPath, destinationConfig) || same(dataPath, target)) throw Error('Source and installed data paths must differ.');
  if (fs.existsSync(destinationConfig)) return { migrated: false, reason: 'installed-config-exists' };
  const config = validateConfig(readJson(configPath));
  importKnownFiles(dataPath, target, path.dirname(configPath));
  if (!config.storageRoot) importTasks(dataPath, target);
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(destinationConfig, JSON.stringify(config, null, 2), { flag: 'wx' });
  return { migrated: true };
}
function migrate({ sharedRoot, userData }) {
  const root = absolute(sharedRoot, 'sharedRoot'), target = absolute(userData, 'userData');
  const pointer = path.join(root, POINTER);
  if (!fs.existsSync(pointer)) return { migrated: false, reason: 'no-source-marker' };
  assertNotLink(pointer);
  const marker = readJson(pointer);
  if (!marker || typeof marker !== 'object' || Array.isArray(marker)) throw Error('Invalid source installation marker.');
  const configFile = absolute(marker.configFile, 'marker.configFile'), sourceData = absolute(marker.sourceData, 'marker.sourceData');
  if (same(configFile, path.join(target, 'config.json')) || same(sourceData, target)) throw Error('Source and installed data paths must differ.');
  return migrateFrom({ configFile, sourceData, userData: target });
}
module.exports = { registerSource, migrate, migrateFrom, discoverSource };
