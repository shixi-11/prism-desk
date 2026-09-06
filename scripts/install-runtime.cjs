const path = require('node:path');
const {spawnSync} = require('node:child_process');
const result = spawnSync(process.execPath, [require.resolve('electron/install.js')], {
  stdio: 'inherit', windowsHide: true,
  env: {...process.env, electron_config_cache: process.env.electron_config_cache || path.resolve(__dirname, '../.local/electron-cache')}
});
if(result.error) throw result.error;
process.exit(result.status ?? 1);
