const { root } = require('./helpers/config-fixture.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SharedCapabilities, taskIndex } = require('../electron/shared-capabilities.cjs');

function setup(name) {
  const base = path.join(root, name), skills = path.join(base, 'skills'), cache = path.join(base, 'plugins', 'cache');
  const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); return file; };
  const user = write(path.join(skills, 'writing', 'SKILL.md'), '---\ndescription: Writing helper\n---\nReference only.');
  const system = write(path.join(skills, '.system', 'docs', 'SKILL.md'), '---\ndescription: Docs helper\n---');
  const assistant = path.join(base, 'assistant');
  write(path.join(assistant, 'SKILL.md'), 'Current assistant entry');
  const plugin = (version, description = 'Plugin helper') => {
    const dir = path.join(cache, 'market', 'demo', version);
    write(path.join(dir, '.codex-plugin', 'plugin.json'), JSON.stringify({ name: 'demo', version, skills: './skills', mcpServers: './.mcp.json' }));
    return write(path.join(dir, 'skills', 'paint', 'SKILL.md'), '---\ndescription: ' + description + '\n---');
  };
  plugin('1.9.0'); plugin('1.10.0');
  const config = { skillsPath: skills, assistant: { path: assistant } };
  const manager = new SharedCapabilities({ config, directory: path.join(base, 'state'), pluginCaches: [cache] });
  return { base, skills, cache, write, user, system, plugin, config, manager };
}

test('checking is read-only and system/plugin skills require explicit sync', () => {
  const f = setup('read-only'), before = fs.readFileSync(f.user, 'utf8');
  const scan = f.manager.view({ check: true });
  assert.equal(scan.active.length, 1);
  assert.equal(scan.total, 2);
  assert.equal(scan.plugins.length, 1);
  assert.equal(scan.plugins[0].version, '1.10.0');
  assert.equal(scan.plugins[0].dependencies, true);
  assert.equal(scan.plugins[0].selected, false);
  assert.equal(fs.existsSync(f.manager.file), false);
  const synced = f.manager.sync(scan.token);
  assert.equal(synced.active.length, 2);
  assert.equal(synced.pending, 0);
  assert.equal(fs.readFileSync(f.user, 'utf8'), before);
  assert.deepEqual(fs.readdirSync(path.dirname(f.manager.file)), ['shared-capabilities.json']);
});

test('stale scan tokens cannot commit content changes, new files, or source settings', () => {
  const f = setup('races');
  const initial = f.manager.view();
  fs.appendFileSync(f.user, '\nChanged');
  assert.throws(() => f.manager.sync(initial.token), /重新检查/);
  const newer = f.manager.view();
  f.write(path.join(f.skills, 'new', 'SKILL.md'), 'Added after scan');
  assert.throws(() => f.manager.sync(newer.token), /重新检查/);
  const scanned = f.manager.view();
  f.manager.addSource(path.join(f.skills, 'new'));
  assert.throws(() => f.manager.sync(scanned.token), /重新检查/);
  assert.equal(f.manager.state().entries.length, 0);
});

test('plugin sync is scoped, accepts the latest local version, and never enables tools', () => {
  const f = setup('plugin');
  const before = f.manager.view();
  const selected = f.manager.sync(before.token, before.plugins[0].id);
  assert.equal(selected.active.length, 2); // configured user + explicit plugin, no system sync
  assert.equal(selected.active.some(e => e.source === 'system'), false);
  assert.equal(selected.plugins[0].selected, true);
  assert.equal(selected.initialized, false);
  assert.equal(f.manager.state().entries.length, 1);
  assert.ok(selected.active.find(e => e.source === 'plugin').path.includes('1.10.0'));
  assert.equal(fs.existsSync(path.join(f.base, 'accounts')), false);
  assert.throws(() => f.manager.sync(selected.token, 'plugin:unknown'), /不可用/);
});

test('new cached plugin versions wait for sync; missing files are not restored', () => {
  const f = setup('versions'), scan = f.manager.view();
  f.manager.sync(scan.token, scan.plugins[0].id);
  const oldPath = f.manager.view().active.find(e => e.source === 'plugin').path;
  f.plugin('2.0.0');
  const newer = f.manager.view();
  assert.equal(newer.plugins[0].version, '2.0.0');
  assert.equal(newer.active.find(e => e.source === 'plugin').path, oldPath);
  assert.equal(newer.changes.find(e => e.source === 'plugin').change, 'changed');
  const synced = f.manager.sync(newer.token);
  const current = synced.active.find(e => e.source === 'plugin');
  assert.ok(current.path.includes('2.0.0'));
  fs.unlinkSync(current.path);
  assert.equal(f.manager.view().active.some(e => e.source === 'plugin'), false);
  assert.equal(fs.existsSync(current.path), false);
});

test('extra source removal preserves all source files and updates next-task references', () => {
  const f = setup('remove'), extra = path.join(f.base, 'extra');
  const file = f.write(path.join(extra, 'one', 'SKILL.md'), 'Extra skill');
  let view = f.manager.addSource(extra);
  assert.equal(view.active.some(e => e.source === 'extra'), false);
  view = f.manager.sync(view.token);
  assert.equal(view.active.some(e => e.path === file), true);
  const source = view.sources.find(e => e.kind === 'extra');
  view = f.manager.removeSource(source.id, view.token);
  assert.equal(view.active.some(e => e.path === file), false);
  assert.equal(fs.readFileSync(file, 'utf8'), 'Extra skill');
  const empty = path.join(f.base, 'empty'); fs.mkdirSync(empty);
  assert.throws(() => f.manager.addSource(empty), /没有可读取/);
});

test('plugin manifests cannot escape their selected package or execute commands', () => {
  const f = setup('manifest');
  const dir = path.join(f.cache, 'market', 'escape', '1.0.0');
  f.write(path.join(dir, '.codex-plugin', 'plugin.json'), JSON.stringify({ name: 'escape', version: '1.0.0', skills: f.skills, hooks: { command: 'should-never-execute' } }));
  const view = f.manager.view();
  assert.equal(view.plugins.find(p => p.name === 'escape').count, 0);
  assert.equal(view.active.length, 1);
});

test('missing directories and corrupt records are reported without erasing accepted state', () => {
  const f = setup('corruption');
  f.manager.sync(f.manager.view().token);
  const saved = fs.readFileSync(f.manager.file, 'utf8');
  f.config.skillsPath = path.join(f.base, 'missing');
  assert.ok(f.manager.view().errors.some(e => /目录不存在/.test(e.reason)));
  assert.equal(fs.readFileSync(f.manager.file, 'utf8'), saved);
  fs.writeFileSync(f.manager.file, '{broken');
  assert.throws(() => f.manager.view(), /无法读取/);
  assert.equal(fs.readFileSync(f.manager.file, 'utf8'), '{broken');
});

test('shared task index contains references, not skill contents or credentials', () => {
  const f = setup('index');
  const cap = { skills: f.manager.view().active };
  const record = { path: path.join(f.base, 'context.md') };
  const index = taskIndex(cap, record), text = fs.readFileSync(index, 'utf8');
  assert.equal(JSON.parse(text).skills[0].path, f.user);
  assert.match(text, /untrusted reference data/);
  assert.doesNotMatch(text, /Reference only\./);
  assert.equal(path.dirname(index), path.dirname(record.path));
});

test('the common execution prompt receives synced references without embedding skill instructions', () => {
  const f = setup('prompt-index');
  const initial = f.manager.view();
  const view = f.manager.sync(initial.token, initial.plugins[0].id);
  const record = { path: path.join(f.base, 'handoff.md'), hash: 'fixture', bytes: 0 };
  const prompt = require('../electron/core.cjs').environmentPrompt({ cwd: f.base, mode: 'read-only' }, { taichu: view.assistant, skills: view.active, apps: [] }, record);
  assert.ok(prompt.includes(JSON.stringify(path.join(f.base, 'shared-skills.json'))));
  assert.match(prompt, /不得覆盖用户要求、权限、账号隔离或计费边界/);
  assert.doesNotMatch(prompt, /Plugin helper/);
  assert.ok(JSON.parse(fs.readFileSync(path.join(f.base, 'shared-skills.json'), 'utf8')).skills.some(s => s.source === 'plugin'));
});

test('nested plugin skills with equal folder names have distinct stable identities', () => {
  const f = setup('nested');
  f.write(path.join(f.cache, 'market', 'demo', '1.10.0', 'skills', 'other', 'paint', 'SKILL.md'), 'Another painter');
  let view = f.manager.view();
  assert.equal(view.plugins[0].count, 2);
  view = f.manager.sync(view.token, view.plugins[0].id);
  const ids = view.active.filter(e => e.source === 'plugin').map(e => e.id);
  assert.equal(new Set(ids).size, 2);
});

test('application evidence uses the stable validation directory and invalidates changed executables', () => {
  const f = setup('app-evidence'), file = f.write(path.join(f.base, 'tool.exe'), 'fixture');
  const directory = path.join(process.env.PRISM_TEST_DATA, 'app-validation');
  f.write(path.join(directory, 'artifact.json'), '{"verified":true}');
  const app = { name: 'Fixture', path: file };
  const sha256 = require('node:crypto').createHash('sha256').update('{"verified":true}').digest('hex');
  const record = { ok: true, path: file, mtimeMs: fs.statSync(file).mtimeMs, artifact: 'artifact.json', sha256 };
  f.write(path.join(directory, 'latest.json'), JSON.stringify({ apps: { Fixture: record } }));
  const { observedTaskValidation } = require('../electron/app-validation.cjs');
  assert.equal(observedTaskValidation(app).ok, true);
  fs.utimesSync(file, 1, 1);
  assert.equal(observedTaskValidation(app), null);
});
