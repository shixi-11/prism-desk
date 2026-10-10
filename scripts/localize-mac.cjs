'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const LOCALIZED_NAMES = [
  ['en', 'Prism'],
  ['zh-Hans', '棱镜'],
  ['zh-Hant', '棱镜'],
];

function quoteStringsValue(value) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`;
}

function stringsFile(name) {
  const value = quoteStringsValue(name);
  return `/* Localized application name. */\nCFBundleDisplayName = ${value};\nCFBundleName = ${value};\n`;
}

async function afterPack(context) {
  if (!context || context.electronPlatformName !== 'darwin') return;

  const appOutDir = context.appOutDir;
  if (typeof appOutDir !== 'string' || !appOutDir) {
    throw new TypeError('afterPack requires appOutDir for a macOS build');
  }

  const entries = await fs.readdir(appOutDir, { withFileTypes: true });
  const appBundles = entries.filter(entry => entry.isDirectory() && entry.name.endsWith('.app'));
  if (appBundles.length !== 1) {
    throw new Error(`Expected one .app bundle in ${appOutDir}, found ${appBundles.length}`);
  }

  const resourcesDir = path.join(appOutDir, appBundles[0].name, 'Contents', 'Resources');
  for (const [locale, name] of LOCALIZED_NAMES) {
    const localeDir = path.join(resourcesDir, `${locale}.lproj`);
    await fs.mkdir(localeDir, { recursive: true });
    await fs.writeFile(path.join(localeDir, 'InfoPlist.strings'), stringsFile(name), 'utf8');
  }
}

module.exports = { afterPack };
