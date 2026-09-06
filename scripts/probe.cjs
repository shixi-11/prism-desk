const {accountStatus, capabilities} = require('../electron/core.cjs');
(async () => {
  const cap = capabilities();
  console.log(JSON.stringify({ taichu: cap.taichu.exists, skillCount: cap.skills.length, apps: cap.apps }));
  for (const id of process.argv.slice(2)) {
    try { console.log(JSON.stringify(await accountStatus(id, process.cwd()))); }
    catch(e) { console.log(JSON.stringify({id, error:e.message})); }
  }
})().catch(error => { console.error(error.message); process.exitCode=1; });
