'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { afterPack } = require('../scripts/localize-mac.cjs');

async function makeAppOutDir() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prism-mac-localization-'));
  const appOutDir = path.join(root, 'mac-arm64');
  await fs.mkdir(path.join(appOutDir, 'Prism Desk.app', 'Contents', 'Resources'), { recursive: true });
  return { root, appOutDir };
}

test('writes localized English, Simplified Chinese, and Traditional Chinese bundle names', async t => {
  const { root, appOutDir } = await makeAppOutDir();
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  await afterPack({ electronPlatformName: 'darwin', appOutDir });

  for (const [locale, expected] of [['en', 'Prism'], ['zh-Hans', '棱镜'], ['zh-Hant', '棱镜']]) {
    const content = await fs.readFile(path.join(appOutDir, 'Prism Desk.app', 'Contents', 'Resources', `${locale}.lproj`, 'InfoPlist.strings'), 'utf8');
    assert.match(content, new RegExp(`^CFBundleDisplayName = "${expected}";$`, 'm'));
    assert.match(content, new RegExp(`^CFBundleName = "${expected}";$`, 'm'));
  }
});

test('does nothing for non-macOS builds', async t => {
  const { root, appOutDir } = await makeAppOutDir();
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  await afterPack({ electronPlatformName: 'win32', appOutDir });

  const resources = path.join(appOutDir, 'Prism Desk.app', 'Contents', 'Resources');
  assert.deepEqual(await fs.readdir(resources), []);
});
