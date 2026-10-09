const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function playwright() {
  return require(process.env.PRISM_PLAYWRIGHT_MODULE || 'playwright');
}

function bundleExecutable(bundle) {
  const plist = path.join(bundle, 'Contents', 'Info.plist');
  const name = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleExecutable', plist], { encoding: 'utf8' }).trim();
  const executable = path.join(bundle, 'Contents', 'MacOS', name);
  if (!fs.statSync(executable).isFile()) throw Error(`Packaged executable was not found: ${executable}`);
  return executable;
}

async function main() {
  const input = process.argv[2];
  if (!input) throw Error('Usage: node scripts/smoke-packaged.cjs <app-bundle-or-executable> [--metadata <file>]');
  const target = path.resolve(input);
  const isBundle = process.platform === 'darwin' && target.toLowerCase().endsWith('.app');
  if (isBundle && !fs.statSync(target).isDirectory()) throw Error('Expected a packaged .app directory.');
  if (!isBundle && !fs.statSync(target).isFile()) throw Error('Expected the packaged executable file.');

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-packaged-smoke-'));
  let application;
  let stagedBundle;
  try {
    let executablePath = target;
    if (isBundle) {
      // Run a private copy so this smoke test cannot collide with a user's installed instance.
      stagedBundle = path.join(root, path.basename(target));
      fs.cpSync(target, stagedBundle, { recursive: true, preserveTimestamps: true });
      executablePath = bundleExecutable(stagedBundle);
    }
    const env = { ...process.env, PRISM_TEST_DATA: root, PRISM_TEST_HIDE: '1' };
    const { _electron } = playwright();
    const launch = () => _electron.launch({ executablePath, env, timeout: 60000 });
    const openWindow = async app => {
      const page = await app.firstWindow();
      await page.waitForFunction(() => Boolean(window.prism), null, { timeout: 30000 });
      return page;
    };
    const appInfo = async app => app.evaluate(({ app: electronApp }) => ({ packaged: electronApp.isPackaged, version: electronApp.getVersion(), arch: process.arch }));

    application = await launch();
    let page = await openWindow(application);
    const info = await appInfo(application);
    assert.equal(info.packaged, true, 'Electron must run the packaged app');
    const expectedVersion = require('../package.json').version;
    assert.equal(info.version, expectedVersion, 'Packaged app version must match package.json');

    const initial = await page.evaluate(() => window.prism.init());
    assert.equal(initial.capabilities?.taichu?.exists, false, 'Smoke data must not load a configured assistant');
    assert.equal(initial.capabilities?.taichu?.path, '', 'Smoke data must not expose a private assistant path');
    assert.ok(initial.profiles.every(profile => !('home' in profile) && !('executable' in profile)), 'Init must not expose account directories or executable paths');
    assert.ok(!('assistant' in initial.settings), 'Init must not load private assistant settings');
    const updateStatus = await page.evaluate(() => window.prism.updateStatus());
    assert.equal(updateStatus.version, info.version);
    assert.equal(updateStatus.distribution, process.platform === 'darwin' ? 'mac-dmg' : 'installer');
    const storageRelative = path.relative(path.resolve(root), path.resolve(initial.taskStorage));
    assert.ok(storageRelative && !storageRelative.startsWith('..') && !path.isAbsolute(storageRelative), 'Task storage must stay inside PRISM_TEST_DATA');

    const smokeId = `packaged-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const taskTitle = `Packaged smoke ${smokeId}`;
    const created = await page.evaluate(async ({ id, title }) => window.prism.create({ title, mode: 'read-only' }), { id: smokeId, title: taskTitle });
    assert.equal(typeof created.id, 'string', 'window.prism.create must create a real task');
    await page.getByRole('button', { name: taskTitle, exact: true }).click();
    const composer = page.locator('.composer textarea');
    const draftText = `packaged persistence check ${smokeId}`;
    await composer.fill(draftText);
    await page.waitForFunction(async ({ id, text }) => (await window.prism.init()).drafts[id]?.text === text, { id: created.id, text: draftText }, { timeout: 10000 });

    await application.close();
    application = await launch();
    page = await openWindow(application);
    const restored = await page.evaluate(async () => window.prism.init());
    assert.ok(restored.tasks.some(task => task.id === created.id), 'Created task must persist across app restart');
    assert.equal(restored.drafts[created.id]?.text, draftText, 'UI draft must persist across app restart');
    assert.equal(await page.locator('.composer textarea').inputValue(), draftText, 'Persisted draft must be restored into the composer');
    const secondUpdateStatus = await page.evaluate(() => window.prism.updateStatus());
    assert.equal(secondUpdateStatus.distribution, updateStatus.distribution);
    const updateButtons = page.locator('button[aria-label]');
    const updateButtonIndex = await updateButtons.evaluateAll(buttons => buttons.findIndex(button => /update|更新|アップデート|更新を確認/i.test(button.getAttribute('aria-label') || '')));
    assert.ok(updateButtonIndex >= 0, 'Packaged UI must expose the update settings entry');
    await updateButtons.nth(updateButtonIndex).click();
    const versionLabel = page.locator('.update-settings .update-version').first();
    await versionLabel.waitFor({ state: 'visible', timeout: 10000 });
    assert.match(await versionLabel.innerText(), new RegExp(`v${info.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

    const commit = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }).trim();
    const metadata = { version: info.version, commit, arch: info.arch };
    const metadataIndex = process.argv.indexOf('--metadata');
    if (metadataIndex >= 0) {
      const file = path.resolve(process.argv[metadataIndex + 1] || '');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(metadata, null, 2) + '\n');
    }
    process.stdout.write(JSON.stringify(metadata) + '\n');
  } finally {
    if (application) await application.close().catch(() => {});
    const resolved = fs.realpathSync.native(root);
    if (path.dirname(resolved) !== fs.realpathSync.native(os.tmpdir())) throw Error('Refusing to remove smoke data outside the temporary directory.');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
