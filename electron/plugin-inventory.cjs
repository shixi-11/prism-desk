const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');

// Keep only installation metadata. Never retain CLI output, credentials,
// connector settings, or the source account's authorization material.
function installedPlugins(value) {
  if (!value || !Array.isArray(value.installed)) throw Error('插件安装清单无法识别，请更新 Codex 后重试。');
  const plugins = new Map();
  for (const item of value.installed) {
    if (item.installed !== true) continue;
    if (typeof item.pluginId !== 'string' || !/^[a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+$/.test(item.pluginId)) throw Error('插件安装清单无法识别，请更新 Codex 后重试。');
    const [name, marketplace] = item.pluginId.split('@');
    if (typeof item.enabled !== 'boolean' || typeof item.version !== 'string' || !/^\d+(?:\.\d+){1,3}(?:-[a-zA-Z0-9.-]+)?$/.test(item.version)) throw Error('插件安装清单无法识别，请更新 Codex 后重试。');
    const sourcePath = item.source?.source === 'local' && typeof item.source.path === 'string' && path.isAbsolute(item.source.path) ? path.normalize(item.source.path) : null;
    plugins.set(item.pluginId, { id: `plugin:${marketplace}/${name}`, reference: item.pluginId, name, marketplace, version: item.version, enabled: item.enabled, sourcePath });
  }
  return [...plugins.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function inventoryEnvironment(codexHome, env = process.env) {
  const clean = {};
  const allowed = /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|USERPROFILE|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|TEMP|TMP|PROGRAMDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|OS|HTTPS_PROXY|HTTP_PROXY|ALL_PROXY|NO_PROXY|SSL_CERT_FILE|NODE_EXTRA_CA_CERTS)$/i;
  for (const [key, value] of Object.entries(env)) if (allowed.test(key)) clean[key] = value;
  clean.CODEX_HOME = codexHome;
  return clean;
}

async function readInstalledPlugins({ codexHome, executable, env = process.env } = {}) {
  if (!codexHome || !path.isAbsolute(codexHome) || !fs.existsSync(codexHome)) throw Error('未找到 Codex 插件安装来源，请先安装并登录 Codex。');
  const command = executable || require('./discovery.cjs').resolveExecutable({ provider: 'Codex', executable: 'codex.exe' }, env);
  const output = await new Promise((resolve, reject) => {
    execFile(command, ['plugin', 'list', '--json', '-c', 'forced_login_method="chatgpt"'], {
      cwd: codexHome, env: inventoryEnvironment(codexHome, env), windowsHide: true,
      encoding: 'utf8', timeout: 25000, maxBuffer: 8 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error || /\b(error|failed|failure)\b/i.test(stderr || '')) return reject(Error('未能完整读取插件安装状态，请检查 Codex 登录与网络后重试。'));
      try { resolve(installedPlugins(JSON.parse(stdout))); }
      catch { reject(Error('插件安装清单无法识别，请更新 Codex 后重试。')); }
    });
  });
  return output;
}

module.exports = { installedPlugins, inventoryEnvironment, readInstalledPlugins };
