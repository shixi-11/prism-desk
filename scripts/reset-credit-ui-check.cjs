// Exercises the real button, IPC guard and reset implementation without consuming a subscription credit.
const { _electron: electron } = require('./script-utils.cjs').dependency('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
(async () => {
  const root = path.resolve(__dirname, '..'), dir = path.join(root, '.local', 'reset-credit-qa', String(Date.now()));
  fs.mkdirSync(dir, { recursive: true });
  const config = path.join(dir, 'config.json');
  fs.writeFileSync(config, JSON.stringify({ profiles: [{ id: 'reset-fixture', provider: 'Codex', name: 'Reset test account', model: 'fixture', write: true, home: dir, executable: process.execPath }], assistant: { path: '', instructions: '' }, skillsPath: '', storageRoot: '' }));
  const app = await electron.launch({ executablePath: path.join(root, 'node_modules/electron/dist/electron.exe'), args: [root], env: { ...process.env, PRISM_CONFIG: config, PRISM_TEST_DATA: dir, PRISM_TEST_HIDE: '1' } });
  try {
    await app.evaluate(({ ipcMain, dialog }, { root }) => {
      const require = process.mainModule.require.bind(process.mainModule);
      globalThis.resetQA = { calls: [], dialogs: [], remaining: 2, refreshes: 0 };
      dialog.showMessageBox = async (_owner, options) => {
        resetQA.dialogs.push(options);
        return new Promise(resolve => { resetQA.answer = response => resolve({ response }); });
      };
      ipcMain.removeHandler('prism:quota');
      ipcMain.handle('prism:quota', () => { resetQA.refreshes++; return { remaining: 0, checkedAt: new Date().toISOString(), resetCredits: { availableCount: resetQA.remaining, credits: [] } }; });
      ipcMain.removeHandler('prism:models');
      ipcMain.handle('prism:models', () => ({ models: [{ id: 'fixture', name: 'Fixture', efforts: ['high'] }], note: '' }));
      const resets = require(root + '/electron/reset-credits.cjs'), consume = resets.consumeReset;
      class FixtureRpc {
        async init() {}
        async end() {}
        async call(method, args) {
          if (method === 'account/read') return { account: { type: 'chatgpt' } };
          if (method === 'account/rateLimits/read') return { accountId: 'reset-fixture-account' };
          if (method === 'account/rateLimitResetCredit/consume') { resetQA.calls.push(args); resetQA.remaining--; return { outcome: 'reset' }; }
          throw Error('Unexpected RPC method: ' + method);
        }
      }
      resets.consumeReset = (id, cwd, dataRoot) => { resetQA.profile = id; return consume(id, cwd, dataRoot, FixtureRpc); };
    }, { root });
    const page = await app.firstWindow();
    await page.getByLabel('Switch language').waitFor();
    await page.getByRole('button', { name: '刷新', exact: true }).click();
    const use = page.getByRole('button', { name: '使用重置卡', exact: true });
    await use.click();
    await page.getByRole('button', { name: '正在处理…', exact: true }).waitFor();
    let state = await app.evaluate(() => ({ calls: resetQA.calls.length, dialog: resetQA.dialogs[0] }));
    assert.equal(state.calls, 0);
    assert.deepEqual(state.dialog.buttons, ['取消', '确认使用一张']);
    assert.match(state.dialog.message, /Reset test account/);
    assert.equal(state.dialog.defaultId, 0);
    assert.equal(state.dialog.cancelId, 0);
    assert.equal(await page.getByRole('button', { name: '正在处理…', exact: true }).isDisabled(), true);
    const duplicate = await page.evaluate(async () => { try { await window.prism.resetCredit('reset-fixture'); return 'unexpected success'; } catch (error) { return error.message; } });
    assert.match(duplicate, /请等待当前执行或重置操作结束/);
    await app.evaluate(() => resetQA.answer(0));
    await page.getByText('已取消', { exact: true }).waitFor();
    assert.equal(await app.evaluate(() => resetQA.calls.length), 0);
    await use.click();
    await page.getByRole('button', { name: '正在处理…', exact: true }).waitFor();
    await app.evaluate(() => resetQA.answer(1));
    await page.getByText('已使用一张重置卡', { exact: true }).waitFor();
    state = await app.evaluate(() => ({ calls: resetQA.calls, profile: resetQA.profile, refreshes: resetQA.refreshes }));
    assert.equal(state.calls.length, 1);
    assert.match(state.calls[0].idempotencyKey, /^[0-9a-f-]{36}$/);
    assert.equal(state.profile, 'reset-fixture');
    assert.ok(state.refreshes >= 2);
    await page.getByText('1 张', { exact: true }).waitFor();
    const attempt = JSON.parse(fs.readFileSync(path.join(dir, 'reset-attempts', 'reset-fixture.json')));
    assert.equal(attempt.pending, false);
    assert.equal(attempt.outcome, 'reset');
    console.log(JSON.stringify({ ok: true, actualCreditsConsumed: 0, dir, checks: ['button opens confirmation', 'account named', 'cancel is default', 'cancel sends no request', 'duplicate blocked', 'confirm sends one idempotent request', 'result and balance refresh'] }));
  } finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
