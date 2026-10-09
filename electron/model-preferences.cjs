const fs = require('node:fs');
const path = require('node:path');
const atomic = require('./atomic-file.cjs').atomic;

const FILE = 'model-preferences.json';
const CODEX_DEFAULT = Object.freeze({ model: 'gpt-6.1-sol', effort: 'high' });
function read(directory = require('./runtime-paths.cjs').stateRoot()) {
  const file = path.join(directory, FILE);
  if (!fs.existsSync(file)) return {};
  const value = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid model preferences file.');
  return value;
}
function defaults(provider, directory = require('./runtime-paths.cjs').stateRoot()) {
  if (provider !== 'Codex') return null;
  const saved = read(directory).Codex;
  if (saved === undefined) return { ...CODEX_DEFAULT };
  if (!saved || typeof saved !== 'object' || Array.isArray(saved) || typeof saved.model !== 'string' || !saved.model || typeof saved.effort !== 'string' || !saved.effort) throw Error('Invalid Codex model preference.');
  return { model: saved.model, effort: saved.effort };
}
function remember(profile, value, directory = require('./runtime-paths.cjs').stateRoot()) {
  if (!profile || profile.provider !== 'Codex') return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid model preference.');
  const previous = defaults('Codex', directory);
  const next = {
    model: value.model === undefined ? previous.model : value.model,
    effort: value.effort === undefined ? previous.effort : value.effort,
  };
  if (typeof next.model !== 'string' || !next.model || typeof next.effort !== 'string' || !next.effort) throw Error('Invalid model preference.');
  const preferences = read(directory);
  preferences.Codex = next;
  atomic(path.join(directory, FILE), preferences);
  return { ...next };
}

module.exports = { defaults, remember };
