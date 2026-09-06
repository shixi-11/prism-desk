// Optional developer dependencies and live-account tests are configured explicitly.
const fs = require('node:fs');
const path = require('node:path');

function dependency(name) {
  try { return require(name); }
  catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    if (process.env.PRISM_NODE_MODULES) return require(path.join(process.env.PRISM_NODE_MODULES, name));
    throw new Error(`Install ${name} locally, or set PRISM_NODE_MODULES to a node_modules directory containing it.`);
  }
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} explicitly before running this optional live test.`);
  return value;
}

function testProfile(variable, provider) {
  const id = requiredEnv(variable);
  const { CONFIG } = require('../electron/config.cjs');
  const profile = CONFIG.profiles.find(item => item.id === id);
  if (!profile || (provider && profile.provider !== provider)) {
    throw new Error(`${variable} must identify a configured ${provider || 'execution'} profile.`);
  }
  return id;
}

function skillFixture(directory) {
  const file = path.join(directory, 'SKILL.md');
  fs.writeFileSync(file, '---\nname: prism-test-skill\ndescription: Local fixture for an explicit read-only test.\n---\nReport the name only. Do not access any other files.\n');
  return file;
}

module.exports = { dependency, requiredEnv, testProfile, skillFixture };
