const prism_test_codex_first = require('./script-utils.cjs').testProfile('PRISM_TEST_CODEX_FIRST', 'Codex');
const prism_test_codex_second = require('./script-utils.cjs').testProfile('PRISM_TEST_CODEX_SECOND', 'Codex');
const {
  _electron: electron,
} = require('./script-utils.cjs').dependency('playwright');
const path = require("node:path");
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const root = path.resolve(__dirname, "..");
  const dir = path.join(root, ".local", "ui-check", String(Date.now()));
  fs.mkdirSync(dir, { recursive: true });
  const workspace = path.join(dir, "我的游戏");
  fs.mkdirSync(workspace);
  const app = await electron.launch({
    executablePath: path.join(
      root,
      "node_modules",
      "electron",
      "dist",
      "electron.exe",
    ),
    args: [root],
    env: { ...process.env, PATH: process.env.SystemRoot+'\\System32', PRISM_TEST_HIDE: "1", PRISM_TEST_DATA: dir },
    timeout: 30000,
  });
  try {
    const page = await app.firstWindow();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.getByRole("button", { name: "黑夜", exact: true }).waitFor();
    assert.equal(await page.getByRole('button',{name:'新建任务后开始',exact:true}).isEnabled(),true);
    await page.getByLabel('执行账号',{exact:true}).selectOption(prism_test_codex_first);
    await page.getByLabel('模型',{exact:true}).waitFor();
    const quota=await page.evaluate(id=>window.prism.quota(id),prism_test_codex_first);
    assert.equal(quota.id,prism_test_codex_first);
    assert.ok(Number.isFinite(quota.remaining));
    await page.getByRole("button", { name: "黑夜", exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      animations: "disabled",
      path: path.join(dir, "夜间空态.png"),
    });
    await page.getByRole("button", { name: "白天", exact: true }).click();
    await page.screenshot({
      animations: "disabled",
      path: path.join(dir, "日间空态.png"),
    });
    await page.getByRole("button", { name: "新建任务", exact: true }).click();
    await page.getByLabel("任务名称", { exact: true }).fill("我的游戏");
    await page.getByPlaceholder("选择已有的项目文件夹").fill(workspace);
    await page.getByRole("button", { name: "创建任务", exact: false }).click();
    await page
      .getByRole("heading", { name: "我的游戏", exact: true })
      .waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole('button',{name:'刷新',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('.reset-credit button')?.disabled);
    await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:0});});
    await page.getByRole('button',{name:'使用重置卡',exact:true}).click();
    await page.getByText('已取消',{exact:true}).waitFor();
    assert.equal(await page.locator('.reset-credit small').filter({hasText:'到期：'}).count(),quota.resetCredits.credits.length);
    const fit=await page.locator('.inspector').evaluate(e=>({total:e.scrollHeight,visible:e.clientHeight}));
    assert.ok(fit.total<=fit.visible+2,JSON.stringify(fit));
    await page.screenshot({
      animations: "disabled",
      path: path.join(root, "docs", "日间界面.png"),
    });
    await page.getByLabel('思考等级',{exact:true}).selectOption('low');
    await page.waitForFunction(async id=>{const d=await window.prism.init();return d.tasks[0].modelSettings?.[id]?.effort==='low';},prism_test_codex_first);
    await page.getByLabel('模型',{exact:true}).selectOption('gpt-5.5');
    await page.waitForFunction(async id=>{const d=await window.prism.init();return d.tasks[0].modelSettings?.[id]?.model==='gpt-5.5';},prism_test_codex_first);
    await page.getByRole("button", { name: "黑夜", exact: true }).click();
    await page.screenshot({
      animations: "disabled",
      path: path.join(root, "docs", "夜间界面.png"),
    });
    await page.getByRole("button", { name: "白天", exact: true }).click();
    await page
      .getByLabel("执行账号", { exact: true })
      .selectOption(prism_test_codex_second);
    await page.getByRole("button", { name: "切换并继续", exact: true }).click();
    await page.waitForFunction(async id => (await window.prism.init()).tasks[0].profile === id, prism_test_codex_second);
    assert.equal(
      await page
        .getByRole("heading", { name: "我的游戏", exact: true })
        .count(),
      1,
    );
    const task = (await page.evaluate(() => window.prism.init())).tasks[0];
    assert.ok((await page.evaluate(() => window.prism.init())).profiles.length >= 2);
    const autoRelay=page.getByLabel('额度耗尽后自动接续', {exact:true});
    await autoRelay.uncheck();
    assert.equal((await page.evaluate(() => window.prism.init())).tasks[0].autoSwitch,false);
    await autoRelay.check();
    assert.equal((await page.evaluate(() => window.prism.init())).tasks[0].autoSwitch,true);
    await app.evaluate(({ BrowserWindow }, taskId) => {
      const wc = BrowserWindow.getAllWindows()[0].webContents;
      for (const id of ["qa-one", "qa-two"])
        wc.send("prism:event", {
          type: "approval",
          value: {
            taskId,
            id,
            params: { command: "echo approval-dialog-test" },
          },
        });
    }, task.id);
    await page
      .getByRole("heading", { name: "确认这次操作", exact: true })
      .waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog[open]").count(), 1);
    assert.equal(
      await page
        .locator("dialog")
        .getByRole("button", { name: "关闭", exact: true })
        .count(),
      0,
    );
    await app.evaluate(
      ({ BrowserWindow }, task) =>
        BrowserWindow.getAllWindows()[0].webContents.send("prism:event", {
          type: "idle",
          value: task,
        }),
      task,
    );
    await page
      .getByRole("heading", { name: "确认这次操作", exact: true })
      .waitFor({ state: "detached" });
    await page.getByRole("button", { name: "共享能力", exact: true }).click();
    await page
      .locator("dialog")
      .getByRole("heading", { name: "共享能力", exact: true })
      .waitFor();
    const catalog = (await page.evaluate(() => window.prism.init())).capabilities.skills;
    assert.ok(catalog.length, "Configure a skill source for this integration test");
    await page.getByLabel("搜索技能", { exact: true }).fill(catalog[0].name);
    assert.equal(await page.locator(".skill-list details").count(), 1);
    await page.getByLabel('搜索应用',{exact:true}).fill('ComfyUI');
    assert.equal(await page.locator('.app-row').count(),1);
    assert.ok((await page.locator('.app-row').textContent()).includes('main.py'));
    await page.getByLabel('搜索应用',{exact:true}).fill('');
    assert.ok(await page.locator('.app-row').count()>2);
    await page.getByRole('button',{name:'检测本机能力',exact:true}).click();
    await page.locator('.app-row').filter({hasText:'Blender'}).getByText('命令已实测',{exact:true}).waitFor();
    await page.locator('.app-row').filter({hasText:'Python'}).getByText('命令已实测',{exact:true}).waitFor();
    await page.screenshot({
      animations: "disabled",
      path: path.join(dir, "skills.png"),
    });
    await page.getByRole("button", { name: "关闭", exact: true }).click();
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setSize(1024, 768),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      animations: "disabled",
      path: path.join(dir, "compact.png"),
    });
    for (const size of [
      [1000, 640],
      [1460, 940],
    ]) {
      await app.evaluate(
        ({ BrowserWindow }, [w, h]) =>
          BrowserWindow.getAllWindows()[0].setSize(w, h),
        size,
      );
      assert.equal(
        await page.getByLabel("执行账号", { exact: true }).isVisible(),
        true,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    }
    await app.evaluate(
      ({ BrowserWindow }, taskId) =>
        BrowserWindow.getAllWindows()[0].webContents.send("prism:event", {
          type: "event",
          value: {
            taskId,
            event: {
              id: "visual-fixture",
              type: "assistant",
              at: new Date().toISOString(),
              text:
                "这是界面验收示例，不代表真实模型执行。\n\n" +
                "同一个任务继续保留需求与进度；正文需要清楚可读，文件路径、代码和中文段落自然换行。".repeat(
                  35,
                ),
            },
          },
        }),
      task.id,
    );
    await page.locator(".message").last().waitFor();
    for (const themeName of ["黑夜", "白天"]) {
      await page.getByRole("button", { name: themeName, exact: true }).click();
      await page.screenshot({
        animations: "disabled",
        path: path.join(dir, themeName + "对话.png"),
      });
      assert.equal(
        await page
          .locator(".messages")
          .evaluate((e) => e.scrollHeight > e.clientHeight),
        true,
      );
    }
    assert.equal(await page.getByRole('button',{name:'跟随系统',exact:true}).count(),0);
    await page.getByLabel('Switch language').selectOption('en');
    await page.getByRole('heading',{name:'Execution account',exact:true}).waitFor();
    assert.equal((await page.evaluate(()=>window.prism.init())).settings.language,'en');
    assert.equal(await page.getByRole('heading',{name:'我的游戏',exact:true}).count(),1);
    await page.screenshot({animations:'disabled',path:path.join(dir,'English.png')});
    await page.getByLabel('Switch language').selectOption('zh');
    await page.getByRole('heading',{name:'执行账号',exact:true}).waitFor();
    await page.getByRole('button',{name:'白天',exact:true}).click();
    const cdp = await app.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const dom = await cdp.send("DOM.getDocument");
    const heading = await cdp.send("DOM.querySelector", {
      nodeId: dom.root.nodeId,
      selector: ".topbar h2",
    });
    const fonts = await cdp.send("CSS.getPlatformFontsForNode", {
      nodeId: heading.nodeId,
    });
    fs.writeFileSync(
      path.join(dir, "fonts.json"),
      JSON.stringify(fonts, null, 2),
    );
    console.log(
      JSON.stringify({
        qaDirectory: dir,
        fonts: fonts.fonts.map((f) => f.familyName),
      }),
    );
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        passed: true,
        checks: [
          "native Electron window",
          "dark/light switch",
          "create task",
          "account relay same task",
          "approval cannot disappear on Escape",
          "completed turn clears pending approvals",
          "shared skill catalog",
          "1024x768 layout",
          "no renderer exceptions",
        ],
      }),
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
