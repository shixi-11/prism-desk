require('./helpers/config-fixture.cjs');
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const {
  TaskStore,
  quotaView,
  childEnv,
  profileFor,
  PROFILES,
} = require("../electron/core.cjs");
const { Runner } = require("../electron/runner.cjs");
function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-test-"));
  t.after(() => {
    const resolved = fs.realpathSync.native(dir);
    assert.equal(
      path.dirname(resolved).toLowerCase(),
      fs.realpathSync.native(os.tmpdir()).toLowerCase(),
    );
    assert.ok(path.basename(resolved).startsWith("prism-test-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const store = new TaskStore(path.join(dir, "tasks"));
  const task = store.create({ title: "我的游戏", cwd: dir });
  return { dir, store, task };
}
test("shared task survives account relay with original demands and full tool evidence", (t) => {
  const { store, task } = setup(t);
  store.append(task.id, "user", { text: "保持主角位置，不要覆盖场景。" });
  store.append(task.id, "tool", {
    text: "render",
    data: {
      exitCode: 0,
      output: "Blender 4.5.13: rendered frame 7",
      file: "scene.blend",
    },
  });
  const runner = new Runner(store);
  runner.switch(task.id, "codex-test-2");
  const after = store.get(task.id);
  assert.equal(after.id, task.id);
  assert.equal(after.cwd, task.cwd);
  assert.equal(after.profile, "codex-test-2");
  const context = fs.readFileSync(store.context(after).path, "utf8");
  assert.match(context, /保持主角位置/);
  assert.match(context, /完整命令、输出与结果/);
  const ef = fs.readdirSync(path.join(store.dir(task.id), "evidence"))[0];
  const evidence = fs.readFileSync(
    path.join(store.dir(task.id), "evidence", ef),
    "utf8",
  );
  assert.match(evidence, /rendered frame 7/);
  assert.match(evidence, /scene.blend/);
});
test("switching while execution or crash state is unresolved is rejected", (t) => {
  const { store, task } = setup(t);
  const runner = new Runner(store);
  task.state = "running";
  store.save(task);
  assert.throws(() => runner.switch(task.id, "codex-test-3"));
  store.recover();
  assert.equal(store.get(task.id).state, "unknown");
  assert.throws(() => runner.switch(task.id, "codex-test-3"));
});
test("returning to an old account never resumes a stale native context", (t) => {
  const { store, task } = setup(t);
  task.sessions = { "codex-test-1": "old-thread" };
  store.save(task);
  const runner = new Runner(store);
  runner.switch(task.id, "codex-test-2");
  runner.switch(task.id, "codex-test-1");
  assert.equal(store.get(task.id).sessions["codex-test-1"], undefined);
});
test("quota missing is unknown; independent model buckets cannot cover exhausted Codex", () => {
  assert.equal(
    quotaView({
      rateLimitsByLimitId: { spark: { primary: { usedPercent: 0 } } },
    }).remaining,
    null,
  );
  assert.equal(
    quotaView({
      rateLimitsByLimitId: {
        codex: {
          primary: { usedPercent: 12 },
          secondary: { usedPercent: 100 },
        },
      },
    }).remaining,
    0,
  );
});
test("current desktop profile and arbitrary paths cannot be selected", () => {
  assert.throws(() => profileFor("desktop"));
  assert.throws(() => profileFor("../../.codex"));
  const fixture = require('./helpers/config-fixture.cjs');
  assert.deepEqual(PROFILES, fixture.profiles);
  assert.equal(process.env.PRISM_CONFIG, fixture.configPath);
  for (const profile of PROFILES) {
    assert.ok(profile.home.startsWith(fixture.root + path.sep));
    assert.equal(profile.executable, process.execPath);
  }
});
test("child process environment excludes API credentials and unrelated provider state", () => {
  process.env.OPENAI_API_KEY = "TEST-NEVER-SEND";
  process.env.ANTHROPIC_API_KEY = "TEST-NEVER-SEND";
  process.env.CLAUDE_CODE_OAUTH_TOKEN = "TEST-NEVER-SEND";
  try {
    const env = childEnv(profileFor("codex-test-1"));
    assert.equal(env.OPENAI_API_KEY, undefined);
    assert.equal(env.ANTHROPIC_API_KEY, undefined);
    assert.equal(env.CLAUDE_CODE_OAUTH_TOKEN, undefined);
    assert.equal(env.CODEX_HOME, profileFor("codex-test-1").home);
  } finally {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
  }
});
test("record path traversal and invalid work modes are rejected", (t) => {
  const { store, dir } = setup(t);
  assert.throws(() => store.get("../other"));
  assert.throws(() =>
    store.create({ title: "x", cwd: dir, mode: "invalid-mode" }),
  );
});
