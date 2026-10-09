const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const preferences = require('../electron/model-preferences.cjs');

function directory(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-model-preferences-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('uses the requested fresh default only for Codex', t => {
  const root = directory(t);
  assert.deepEqual(preferences.defaults('Codex', root), { model: 'gpt-6.1-sol', effort: 'high' });
  assert.equal(preferences.defaults('Claude', root), null);
});

test('remembers Codex model and effort across module reloads', t => {
  const root = directory(t);
  preferences.remember({ provider: 'Codex' }, { model: 'gpt-6-astra', effort: 'xhigh' }, root);
  delete require.cache[require.resolve('../electron/model-preferences.cjs')];
  const reloaded = require('../electron/model-preferences.cjs');
  assert.deepEqual(reloaded.defaults('Codex', root), { model: 'gpt-6-astra', effort: 'xhigh' });
});

test('partial updates retain the previous model and effort and never save service tier', t => {
  const root = directory(t), profile = { provider: 'Codex' };
  preferences.remember(profile, { model: 'gpt-6-astra', effort: 'medium', serviceTier: 'fast' }, root);
  preferences.remember(profile, { model: 'gpt-6.1-sol' }, root);
  assert.deepEqual(preferences.defaults('Codex', root), { model: 'gpt-6.1-sol', effort: 'medium' });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'model-preferences.json'))), { Codex: { model: 'gpt-6.1-sol', effort: 'medium' } });
  preferences.remember(profile, { effort: 'high' }, root);
  assert.deepEqual(preferences.defaults('Codex', root), { model: 'gpt-6.1-sol', effort: 'high' });
});

test('ignores other providers and preserves only their existing map data', t => {
  const root = directory(t);
  fs.writeFileSync(path.join(root, 'model-preferences.json'), JSON.stringify({ Claude: { model: 'opus', effort: 'high' } }));
  assert.equal(preferences.remember({ provider: 'Claude' }, { model: 'sonnet', effort: 'low' }, root), null);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'model-preferences.json'))), { Claude: { model: 'opus', effort: 'high' } });
  assert.equal(preferences.defaults('Claude', root), null);
});

test('malformed preference files fail explicitly', t => {
  const root = directory(t);
  fs.writeFileSync(path.join(root, 'model-preferences.json'), '{broken');
  assert.throws(() => preferences.defaults('Codex', root));
});
