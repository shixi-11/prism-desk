require('../electron/app-validation.cjs').validateApps(process.argv.length > 2 ? process.argv.slice(2) : undefined)
  .then(result => { console.log(JSON.stringify(result, null, 2)); if (Object.values(result.apps).some(app => !app.ok)) process.exitCode = 1; })
  .catch(error => { console.error(error.message); process.exitCode = 1; });
