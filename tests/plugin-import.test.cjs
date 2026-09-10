const { root } = require('./helpers/config-fixture.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SharedCapabilities } = require('../electron/shared-capabilities.cjs');
const { installedPlugins, inventoryEnvironment } = require('../electron/plugin-inventory.cjs');

function fixture(name) {
  const base = path.join(root, name), cache = path.join(base, 'cache'), skills = path.join(base, 'skills');
  const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); return file; };
  const user = write(path.join(skills, 'user', 'SKILL.md'), 'User skill remains available.');
  const plugin = (name, version, options = {}) => {
    const dir = path.join(cache, 'market', name, version);
    write(path.join(dir, '.codex-plugin', 'plugin.json'), JSON.stringify({ name, version, skills: './skills', ...options }));
    if (!options.noSkills) write(path.join(dir, 'skills', 'main', 'SKILL.md'), `${name} ${version}`);
    return dir;
  };
  let rows = [], failure = false, calls = 0;
  const installed = (name, version, enabled = true) => ({ pluginId: name + '@market', installed: true, enabled, version });
  const manager = new SharedCapabilities({ config: { skillsPath: skills }, directory: path.join(base, 'state'), pluginCaches: [cache], inventoryReader: async () => { calls++; if (failure) throw Error('Offline'); return installedPlugins({ installed: rows }); } });
  return { base, cache, user, write, plugin, manager, installed, set: next => { rows = next; }, fail: value => { failure = value; }, calls: () => calls };
}

test('official inventory excludes uninstalled entries and does not retain credentials or connector settings', () => {
  const rows = installedPlugins({ installed: [
    { pluginId: 'demo@market', version: '1.0.0', installed: true, enabled: true, token: 'secret', source: { source: 'remote', id: 'private-account-id' }, config: { apiKey: 'secret' } },
    { pluginId: 'disabled@market', version: '1.0.0', installed: true, enabled: false },
    { pluginId: 'cached@market', version: '2.0.0', installed: false, enabled: true },
  ] });
  assert.equal(rows.length, 2);
  assert.equal(rows.find(p => p.name === 'disabled').enabled, false);
  assert.doesNotMatch(JSON.stringify(rows), /secret|private-account-id|apiKey|token/);
  const env = inventoryEnvironment(root, { PATH: 'tools', OPENAI_API_KEY: 'secret', ANTHROPIC_API_KEY: 'secret', CODEX_HOME: 'other-account', HTTPS_PROXY: 'proxy' });
  assert.deepEqual(env, { PATH: 'tools', HTTPS_PROXY: 'proxy', CODEX_HOME: root });
  assert.throws(() => installedPlugins({ available: [] }), /清单/);
  assert.throws(() => installedPlugins({ installed: [{ pluginId: '../bad@market', installed: true }] }), /清单/);
});

test('batch import selects the installed version, excludes cache-only and disabled plugins, and preserves user files', async () => {
  const f = fixture('installed-version');
  f.plugin('demo', '1.0.0'); f.plugin('demo', '2.0.0'); f.plugin('cache-only', '1.0.0'); f.plugin('disabled', '1.0.0');
  f.set([f.installed('demo', '1.0.0'), f.installed('disabled', '1.0.0', false)]);
  assert.equal(f.calls(), 0);
  await f.manager.refreshInstalled({ force: true });
  let view = f.manager.view();
  assert.equal(view.plugins.find(p => p.name === 'demo').version, '1.0.0');
  assert.equal(view.active.filter(p => p.source === 'plugin').length, 0);
  view = f.manager.syncInstalled(view.token);
  assert.deepEqual(f.manager.state().plugins, ['plugin:market/demo']);
  assert.equal(view.autoPlugins, true);
  assert.match(view.active.find(p => p.source === 'plugin').path, /1\.0\.0/);
  assert.equal(fs.readFileSync(f.user, 'utf8'), 'User skill remains available.');
  assert.equal(view.plugins.find(p => p.name === 'cache-only').installed, false);
  assert.throws(() => f.manager.sync(view.token, 'plugin:market/cache-only'), /不可用/);
});

test('automatic import adds newly installed plugins, follows installed versions, and honors removals', async () => {
  const f = fixture('automatic'); f.plugin('demo', '1.0.0');
  f.set([f.installed('demo', '1.0.0')]); await f.manager.refreshInstalled({ force: true });
  f.manager.syncInstalled(f.manager.view().token);
  const revision = f.manager.state().revision;
  await f.manager.refreshInstalled({ force: true });
  assert.equal(f.manager.state().revision, revision, 'unchanged inventory must not rewrite accepted references');
  f.plugin('new', '1.0.0'); f.plugin('demo', '2.0.0');
  f.set([f.installed('demo', '2.0.0'), f.installed('new', '1.0.0')]); await f.manager.refreshInstalled({ force: true });
  assert.equal(f.manager.view().active.filter(p => p.source === 'plugin').length, 2);
  assert.match(f.manager.view().active.find(p => p.sourceId === 'plugin:market/demo').path, /2\.0\.0/);
  f.manager.removeSource('plugin:market/new', f.manager.view().token);
  await f.manager.refreshInstalled({ force: true });
  assert.equal(f.manager.view().plugins.find(p => p.name === 'new').selected, false);
  f.manager.syncInstalled(f.manager.view().token);
  assert.equal(f.manager.view().plugins.find(p => p.name === 'new').selected, false, 'batch import respects manual exclusions');
  f.manager.sync(f.manager.view().token, 'plugin:market/new');
  assert.equal(f.manager.view().plugins.find(p => p.name === 'new').selected, true);
  f.set([f.installed('new', '1.0.0', false)]); await f.manager.refreshInstalled({ force: true });
  assert.equal(f.manager.view().active.filter(p => p.source === 'plugin').length, 0);
  assert.ok(fs.existsSync(path.join(f.cache, 'market', 'demo', '2.0.0', 'skills', 'main', 'SKILL.md')));
});

test('automatic preference survives reload, can be disabled and re-enabled with an unchanged inventory', async () => {
  const f = fixture('toggle'); f.plugin('demo', '1.0.0'); f.set([f.installed('demo', '1.0.0')]);
  await f.manager.refreshInstalled({ force: true }); f.manager.syncInstalled(f.manager.view().token);
  f.manager.setAutomaticPlugins(false, f.manager.view().token);
  f.manager.setAutomaticPlugins(true, f.manager.view().token);
  assert.equal(f.manager.state().autoPlugins, true);
  f.manager.setAutomaticPlugins(false, f.manager.view().token);
  f.plugin('later', '1.0.0'); f.set([f.installed('demo', '1.0.0'), f.installed('later', '1.0.0')]);
  await f.manager.refreshInstalled({ force: true });
  assert.equal(f.manager.view().plugins.find(p => p.name === 'later').selected, false);
  const reopened = new SharedCapabilities({ config: { skillsPath: path.dirname(path.dirname(f.user)) }, directory: f.manager.directory, pluginCaches: [f.cache] });
  assert.equal(reopened.view().autoPlugins, false);
  assert.equal(reopened.view().installation.count, 2);
});

test('failed discovery preserves accepted content, blocks batch writes and coalesces concurrent checks', async () => {
  const f = fixture('failure'); f.plugin('demo', '1.0.0'); f.set([f.installed('demo', '1.0.0')]);
  await Promise.all([f.manager.refreshInstalled({ force: true }), f.manager.refreshInstalled({ force: true })]);
  assert.equal(f.calls(), 1);
  f.manager.syncInstalled(f.manager.view().token);
  const accepted = fs.readFileSync(f.manager.file, 'utf8');
  f.fail(true); await f.manager.refreshInstalled({ force: true });
  const view = f.manager.view();
  assert.equal(view.installation.status, 'error');
  assert.equal(fs.readFileSync(f.manager.file, 'utf8'), accepted);
  assert.equal(view.active.filter(p => p.source === 'plugin').length, 1);
  assert.throws(() => f.manager.syncInstalled(view.token), /先成功检查/);
});

test('missing installed versions are reported instead of importing another cache version or claiming tool access', async () => {
  const f = fixture('missing'); f.plugin('missing', '1.0.0'); f.plugin('cloud', '1.0.0', { apps: './apps.json', noSkills: true });
  f.set([f.installed('missing', '2.0.0'), f.installed('cloud', '1.0.0')]); await f.manager.refreshInstalled({ force: true });
  const view = f.manager.syncInstalled(f.manager.view().token);
  assert.equal(view.active.filter(p => p.source === 'plugin').length, 0);
  assert.equal(view.plugins.find(p => p.name === 'missing').missing, true);
  assert.equal(view.plugins.find(p => p.name === 'cloud').toolState, 'connection-required');
  assert.equal(view.plugins.find(p => p.name === 'cloud').selected, true);
  f.manager.removeSource('plugin:market/cloud', f.manager.view().token);
  f.manager.sync(f.manager.view().token, 'plugin:market/cloud');
  assert.equal(f.manager.view().plugins.find(p => p.name === 'cloud').selected, true, 'plugins without skill files can be explicitly re-registered');
  assert.equal(fs.existsSync(path.join(f.base, 'accounts')), false);
});

test('inventory changes invalidate a previously reviewed token', async () => {
  const f = fixture('token'); f.plugin('demo', '1.0.0'); f.set([f.installed('demo', '1.0.0')]);
  await f.manager.refreshInstalled({ force: true }); const token = f.manager.view().token;
  f.set([]); await f.manager.refreshInstalled({ force: true });
  assert.throws(() => f.manager.syncInstalled(token), /重新检查/);
});
