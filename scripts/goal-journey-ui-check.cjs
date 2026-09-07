// Real application IPC, queue, persistence and cold starts; provider replies are deterministic fixtures.
const { _electron: electron } = require('./script-utils.cjs').dependency('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
(async () => {
  const root = path.resolve(__dirname, '..');
  const dir = path.join(root, '.local', 'goal-journey-qa', String(Date.now()));
  fs.mkdirSync(dir, { recursive: true });
  const config = path.join(dir, 'config.json');
  fs.writeFileSync(config, JSON.stringify({ profiles: [
    { id: 'codex-journey', provider: 'Codex', name: 'First', model: 'fixture', write: true, home: dir, executable: process.execPath },
    { id: 'claude-journey', provider: 'Claude', name: 'Second', model: 'opus', write: true, home: dir, executable: process.execPath },
  ], assistant: { path: '', instructions: '' }, skillsPath: '', storageRoot: '' }));
  let app;
  async function launch() {
    app = await electron.launch({ executablePath: path.join(root, 'node_modules/electron/dist/electron.exe'), args: [root], env: { ...process.env, PRISM_CONFIG: config, PRISM_TEST_DATA: dir, PRISM_TEST_HIDE: '1' } });
    await app.evaluate(({ ipcMain }, root) => {
      const require = process.mainModule.require.bind(process.mainModule);
      const { Runner } = require(root + '/electron/runner.cjs');
      Runner.prototype.codex = async function(task, profile) {
        if (task.execution.mode === 'read-only') {
          this.confirmExecution(task, profile);
          this.event(task.id, 'assistant', { text: '```json\n{"steps":[{"text":"Write the acceptance marker after confirmation"}]}\n```' });
          this.state(task, 'idle');
        } else { this.active.quotaExhausted = true; this.state(task, 'failed'); }
      };
      Runner.prototype.claude = async function(task, profile, text, instructions) {
        const assert = require('node:assert/strict');
        assert.equal(task.planReviewRequired, false);
        assert.equal(task.planApproved, task.workPlan.revision);
        assert.equal(profile.model, 'sonnet');
        assert.equal(profile.effort, 'max');
        assert.match(instructions, /Preserve the goal through planning and relay/);
        this.confirmExecution(task, profile, 'fixture-sonnet');
        require('node:fs').writeFileSync(task.cwd + '/accepted.txt', task.workPlan.goal);
        this.event(task.id, 'assistant', { text: 'Acceptance marker written.' });
        this.state(task, 'idle');
      };
      ipcMain.removeHandler('prism:models');
      ipcMain.handle('prism:models', () => ({ models: [{ id: 'fixture', name: 'Fixture', efforts: ['high'] }], note: '' }));
    }, root);
    const page = await app.firstWindow();
    await page.getByLabel('Switch language').waitFor();
    return page;
  }
  try {
    let page = await launch();
    const task = await page.evaluate(dir => window.prism.create({ title: 'Goal journey', cwd: dir, profile: 'codex-journey', mode: 'full-access' }), dir);
    await page.reload();
    await page.getByRole('button', { name: '设置目标', exact: true }).click();
    await page.getByRole('textbox', { name: '目标', exact: true }).fill('Preserve the goal through planning and relay');
    await page.locator('.plan-actions').getByRole('button', { name: '保存', exact: true }).click();
    const file = path.join(dir, 'tasks', task.id, 'task.json');
    let saved = JSON.parse(fs.readFileSync(file));
    saved.relayOrder = ['claude-journey'];
    saved.modelSettings = { 'claude-journey': { model: 'sonnet', effort: 'max' } };
    fs.writeFileSync(file, JSON.stringify(saved));
    await page.reload();
    await page.getByRole('button', { name: '展开目标与计划', exact: true }).click();
    await page.getByRole('button', { name: '先制订计划', exact: true }).click();
    await page.waitForFunction(async id => { const { task } = await window.prism.task(id); return task.planReviewRequired && task.state === 'idle'; }, task.id);
    assert.equal(fs.existsSync(path.join(dir, 'accepted.txt')), false);
    await app.close(); app = null;
    page = await launch();
    await page.getByText('Preserve the goal through planning and relay', { exact: true }).waitFor();
    assert.equal(fs.existsSync(path.join(dir, 'accepted.txt')), false);
    await page.getByRole('button', { name: '确认计划并执行', exact: true }).click();
    await page.getByText('Acceptance marker written.', { exact: true }).waitFor();
    await page.waitForFunction(async id => (await window.prism.task(id)).task.state === 'idle', task.id);
    await app.close(); app = null;
    page = await launch();
    const restored = await page.evaluate(id => window.prism.task(id), task.id);
    assert.equal(restored.task.workPlan.goal, 'Preserve the goal through planning and relay');
    assert.equal(restored.task.workPlan.steps.length, 1);
    assert.equal(restored.task.profile, 'claude-journey');
    assert.equal(restored.task.lastExecution.reportedModel, 'fixture-sonnet');
    assert.equal(restored.task.goalLifecycle.runningSince, null);
    assert.equal(fs.readFileSync(path.join(dir, 'accepted.txt'), 'utf8'), restored.task.workPlan.goal);
    await page.getByText('Acceptance marker written.', { exact: true }).waitFor();
    console.log(JSON.stringify({ ok: true, providerReplies: 'fixtures', coldStarts: 3, dir, checks: ['goal save', 'read-only planning', 'confirmation survives restart', 'no premature execution', 'automatic relay', 'selected model and effort', 'goal and conversation restored'] }));
  } finally { if (app) await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

