// Unit tests must never inherit local account identities, credentials, or tools.
// Load this helper before importing any Electron module that reads configuration.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { after } = require('node:test');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-unit-config-'));
const definitions = [
  ['Codex', 'gpt-5.6-sol', true, 3],
  ['Claude', 'opus', true, 3],
  ['Grok', 'grok-4.6', false, 3],
  ['Gemini', 'auto', false, 1],
];
const profiles = definitions.flatMap(([provider, model, write, count]) =>
  Array.from({ length: count }, (_, index) => {
    const id = `${provider.toLowerCase()}-test-${index + 1}`;
    const home = path.join(root, 'accounts', id);
    fs.mkdirSync(home, { recursive: true });
    return { id, provider, model, write, home, name: `个人-${index + 1}`, executable: process.execPath };
  }),
);
const configPath = path.join(root, 'config.json');
fs.writeFileSync(configPath, JSON.stringify({
  profiles,
  assistant: { path: '', instructions: '' },
  skillsPath: '',
  geminiEntry: '',
  storageRoot: '',
  apps: {},
}));
const previous = { PRISM_CONFIG: process.env.PRISM_CONFIG, PRISM_TEST_DATA: process.env.PRISM_TEST_DATA };
process.env.PRISM_CONFIG = configPath;
process.env.PRISM_TEST_DATA = path.join(root, 'observations');

after(() => {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const resolved = fs.realpathSync.native(root);
  assert.equal(path.dirname(resolved).toLowerCase(), fs.realpathSync.native(os.tmpdir()).toLowerCase());
  assert.ok(path.basename(resolved).startsWith('prism-unit-config-'));
  fs.rmSync(resolved, { recursive: true, force: true });
});

module.exports = { root, configPath, profiles };
