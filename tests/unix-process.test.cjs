const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { defaultConfig } = require('../electron/config.cjs');
const { resolveExecutable } = require('../electron/discovery.cjs');
const { childEnv, spawnCLI } = require('../electron/core.cjs');
const { spawnUnix, confirmedStop, groupRunning } = require('../electron/unix-process.cjs');
const { providerFor } = require('../electron/account-providers.cjs');

test('platform parameter selects native CLI names and macOS account root', () => {
  const config = defaultConfig({ HOME: '/Users/example', USERPROFILE: '/Users/example' }, 'darwin');
  assert.deepEqual(config.profiles.map(p => p.executable), ['codex', 'claude', 'grok']);
  assert.equal(config.profiles[0].home, path.join('/Users/example', 'Library', 'Application Support', 'Prism', 'accounts', 'codex-personal-1'));
  assert.equal(defaultConfig({ USERPROFILE: 'C:\\Users\\example', LOCALAPPDATA: 'C:\\Users\\example\\AppData\\Local' }, 'win32').profiles[0].executable, 'codex.exe');
  assert.equal(providerFor('Claude', 'win32').executable, 'claude.exe');
  assert.equal(providerFor('Claude', 'darwin').executable, 'claude');
  assert.equal(confirmedStop('win32', true, true, 1223), true);
  assert.equal(confirmedStop('win32', true, true, null), false);
  assert.equal(confirmedStop('darwin', true, true, null), true);
  assert.equal(confirmedStop('darwin', true, false, null), false);
});

test('macOS discovery checks fixed GUI PATH locations while retaining account isolation', { skip: process.platform === 'win32' }, t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-unix-discovery-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const home = path.join(root, 'user');
  const bin = path.join(home, '.local', 'bin');
  fs.mkdirSync(bin, { recursive: true });
  const cli = path.join(bin, 'claude');
  fs.writeFileSync(cli, 'fixture');
  const resolved = resolveExecutable({ provider: 'Claude', executable: 'claude' }, { HOME: home, PATH: '' }, 'darwin');
  assert.equal(resolved, cli);
});

test('child environment sets Unix HOME and TMPDIR without an undefined CODEX_HOME path', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-unix-env-'));
  const profileHome = path.join(root, 'account');
  fs.mkdirSync(profileHome);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const env = childEnv({ provider: 'Claude', home: profileHome, id: 'claude-test' }, { HOME: '/Users/prism-smoke', TMPDIR: root, PATH: '/existing/bin' }, 'darwin');
  assert.equal(env.HOME, '/Users/prism-smoke');
  assert.equal(env.TMPDIR, root);
  assert.equal(env.PATH, ['/existing/bin', path.join('/Users/prism-smoke', '.local', 'bin'), path.join('/Users/prism-smoke', '.grok', 'bin'), '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin'].join(':'));
  assert.equal(env.CODEX_HOME, path.join('/Users/prism-smoke', 'Library', 'Application Support', 'Prism', 'unavailable-codex-home'));
});

test('Unix stop targets the execution process group and confirms it has exited', { skip: process.platform === 'win32' }, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-unix-stop-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const script = `const {spawn}=require('node:child_process'); const child=spawn(process.execPath,['-e',"setInterval(()=>{},1000)"],{stdio:'ignore'}); console.log(JSON.stringify({parent:process.pid,child:child.pid})); setInterval(()=>{},1000);`;
  const proc = spawnUnix(process.execPath, ['-e', script], { cwd: dir, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  proc.stdout.setEncoding('utf8');
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('process group did not start')), 5000);
    proc.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes('\n')) { clearTimeout(timer); resolve(); }
    });
    proc.once('error', reject);
  });
  const { parent, child } = JSON.parse(output.trim().split('\n')[0]);
  assert.equal(parent, proc.pid);
  assert.ok(Number.isInteger(child));
  const closed = new Promise(resolve => proc.once('close', resolve));
  await proc.requestStop();
  assert.equal(await closed, null);
  assert.equal(groupRunning(proc.pid),false,'No running descendant may remain in the isolated process group');
});
test('process group verification distinguishes live descendants, zombies and unrelated groups',()=>{
  const inspect=()=> '101 100 S\n102 100 Z\n201 200 S\n';
  assert.equal(groupRunning(100,inspect),true);
  assert.equal(groupRunning(300,inspect),false);
  assert.equal(groupRunning(100,()=> '102 100 Z\n201 200 S\n'),false);
  assert.throws(()=>groupRunning(100,()=>{throw Error('ps unavailable');}));
});

test('spawnCLI platform injection uses Unix process groups without a Windows host', { skip: process.platform === 'win32' }, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-unix-spawn-'));
  const home = path.join(dir, 'home');
  const accountHome = path.join(dir, 'account');
  fs.mkdirSync(home);
  fs.mkdirSync(accountHome);
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const profile = { provider: 'Claude', id: 'claude-isolated-test', home: accountHome, executable: process.execPath };
  const proc = spawnCLI(profile, ['-e', 'setInterval(()=>{},1000)'], dir, 'darwin');
  assert.ok(Number.isInteger(proc.pid));
  const closed = new Promise(resolve => proc.once('close', resolve));
  await proc.requestStop();
  assert.equal(await closed, null);
});
