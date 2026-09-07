const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn, execFileSync } = require("node:child_process");
const { EventEmitter } = require("node:events");

const { CONFIG } = require('./config.cjs');
const TAICHU = CONFIG.assistant.path;
const SKILLS = CONFIG.skillsPath;
const PROFILES = CONFIG.profiles;
const hash = (text) => crypto.createHash("sha256").update(text).digest("hex");
function atomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(data, null, 2));
  fs.renameSync(temp, file);
}
function profileFor(id) {
  const p = PROFILES.find((p) => p.id === id);
  if (!p) throw Error("请选择已接入的订阅账号。");
  return p;
}
function childEnv(profile) {
  if (!fs.existsSync(profile.home))
    throw Error("这个账号的独立登录目录不存在，请先完成订阅登录。");
  const real = fs.realpathSync.native(profile.home).toLowerCase();
  const desktopPath = path.join(process.env.USERPROFILE || require("node:os").homedir(), ".codex");
  const desktop = fs.existsSync(desktopPath) ? fs.realpathSync.native(desktopPath).toLowerCase() : null;
  if (real === desktop) throw Error("棱镜禁止使用当前桌面账号目录。");
  const env = {};
  const allowed =
    /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|USERPROFILE|USERNAME|USERDOMAIN|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|TEMP|TMP|PROGRAMDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|COMMONPROGRAMFILES|COMMONPROGRAMFILES\(X86\)|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE|OS|HTTPS_PROXY|HTTP_PROXY|ALL_PROXY|NO_PROXY|SSL_CERT_FILE|NODE_EXTRA_CA_CERTS|GIT_EXEC_PATH)$/i;
  for (const [key, value] of Object.entries(process.env))
    if (allowed.test(key)) env[key] = value;
  env.CODEX_HOME =
    profile.provider === "Codex"
      ? profile.home
      : path.join(process.env.LOCALAPPDATA, "Prism", "unavailable-codex-home");
  if (profile.provider === "Claude") {env.CLAUDE_CONFIG_DIR = profile.home;env.CLAUDE_CODE_DISABLE_FAST_MODE='1';}
  if (profile.provider === "Grok") env.GROK_AUTH_PATH = path.join(profile.home, "auth.json");
  if (profile.provider === 'Gemini') {
    env.GEMINI_CLI_HOME=profile.home;
    env.NO_BROWSER='true';
    env.GEMINI_CLI_SYSTEM_SETTINGS_PATH=require('./gemini.cjs').prepareGemini(profile).settings;
  }
  env.PRISM_PROVIDER = profile.provider;
  env.PRISM_ACCOUNT = profile.id;
  const proxy = env.HTTPS_PROXY || env.HTTP_PROXY || env.ALL_PROXY;
  if (proxy) {
    env.HTTPS_PROXY ||= proxy;
    env.HTTP_PROXY ||= proxy;
  }
  return env;
}
function executable(profile) { return require("./discovery.cjs").resolveExecutable(profile); }
function spawnCLI(profile, args, cwd) {
  if (profile.provider === 'Gemini') {
    if (!CONFIG.geminiEntry || !fs.existsSync(CONFIG.geminiEntry)) throw Error('Configure the installed Gemini CLI entry path before execution.');
    args = [CONFIG.geminiEntry, ...args];
  }
  const host = path.join(__dirname, "..", "runtime", "PrismProcess.exe");
  if (!fs.existsSync(host))
    throw Error("进程隔离组件尚未构建。请运行启动脚本。");
  const stopEvent='Local\\Prism-'+crypto.randomUUID();
  const proc=spawn(
    host,
    [executable(profile), Buffer.from(JSON.stringify(args)).toString("base64"),stopEvent],
    {
      cwd,
      env: childEnv(profile),
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  proc.requestStop=()=>new Promise((resolve,reject)=>{
    require('node:child_process').execFile(host,['--stop',stopEvent],{windowsHide:true,timeout:5000},error=>error?reject(Error('无法确认停止信号已送达；执行状态保持待核对')):resolve());
  });
  return proc;
}
class Rpc extends EventEmitter {
  constructor(profile, cwd, args) {
    super();
    this.next = 0;
    this.pending = new Map();
    this.closed = false;
    this.provider = profile.provider;
    this.proc = spawnCLI(
      profile,
      args || (profile.provider === "Grok" ? ["agent", "--no-leader", "stdio"] : [
        "app-server",
        "--stdio",
        "-c",
        'model_provider="openai"',
        "-c",
        'forced_login_method="chatgpt"',
      ]),
      cwd,
    );
    let buf = "";
    this.proc.stdout.setEncoding("utf8");
    this.proc.stderr.setEncoding("utf8");
    this.proc.stdout.on("data", (data) => {
      buf += data;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        try {
          this.receive(JSON.parse(line));
        } catch {}
      }
    });
    this.proc.stderr.on("data", () => {});
    this.proc.on("error", (error) => this.fail(error));
    this.done = new Promise((resolve) =>
      this.proc.on("close", (code) => {
        this.closed = true;
        this.fail(Error("CLI 连接已结束。"));
        this.emit("closed", code);
        resolve(code);
      }),
    );
  }
  fail(error) {
    for (const item of this.pending.values()) {
      clearTimeout(item.timer);
      item.reject(error);
    }
    this.pending.clear();
  }
  receive(message) {
    if (message.id !== undefined && !message.method) {
      const item = this.pending.get(message.id);
      if (!item) return;
      clearTimeout(item.timer);
      this.pending.delete(message.id);
      message.error
        ? item.reject(
            Object.assign(Error(message.error.message), {
              detail: message.error,
            }),
          )
        : item.resolve(message.result);
    } else this.emit("message", message);
  }
  write(message) {
    if (["Grok","Gemini"].includes(this.provider)) message = { jsonrpc: "2.0", ...message };
    if (!this.closed) this.proc.stdin.write(JSON.stringify(message) + "\n");
  }
  call(method, params = {}, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const id = ++this.next;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(Error(method + " 等待超时；没有自动换账号。"));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.write({ id, method, params });
    });
  }
  async init() {
    if (this.provider === "Grok") {
      const info = await this.call("initialize", { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false }, clientInfo: { name: "prism", version: "0.1.0" } });
      if (!info.authMethods?.some(m => m.id === "cached_token")) throw Error("Grok 未提供本机订阅认证入口。");
      await this.call("authenticate", { methodId: "cached_token", _meta: { headless: true } });
      return info;
    }
    await this.call("initialize", {
      clientInfo: { name: "prism_workbench", title: "棱镜", version: "0.1.0" },
    });
    this.write({ method: "initialized", params: {} });
  }
  async end() {
    if (!this.closed) this.proc.stdin.end();
    return this.done;
  }
}
function quotaView(result) {
  const bucket =
    result.rateLimitsByLimitId?.codex ||
    (result.rateLimits?.limitId === "codex" ? result.rateLimits : null);
  if (!bucket) return { remaining: null, windows: [] };
  const windows = [bucket.primary, bucket.secondary]
    .filter((w) => w && Number.isFinite(w.usedPercent) && (!Number.isFinite(w.resetsAt) || w.resetsAt * 1000 > Date.now()))
    .map((w) => ({
      remaining: Math.max(0, Math.min(100, 100 - w.usedPercent)),
      minutes: w.windowDurationMins,
      resetsAt: w.resetsAt,
    }));
  return {
    remaining: windows.length
      ? Math.min(...windows.map((w) => w.remaining))
      : null,
    windows,
  };
}
async function accountStatus(id, cwd, model) {
  const base=profileFor(id);
  const profile=base.provider==='Claude'&&['opus','sonnet'].includes(model)?{...base,model}:base;
  if(profile.provider==='Gemini')return require('./gemini.cjs').geminiStatus(profile);
  if(profile.provider==='Grok')return require('./provider-quota.cjs').grokQuota(profile,cwd);
  if(profile.provider==='Claude')return require('./provider-quota.cjs').claudeQuota(profile,cwd);
  let rpc;
  try {
    rpc = new Rpc(profile, cwd);
    await rpc.init();
    const auth = await rpc.call("account/read");
    if (auth.account?.type !== "chatgpt")
      throw Error("未检测到 ChatGPT 订阅登录，已阻止调用。");
    const usage = await rpc.call("account/rateLimits/read");
    return {
      id,
      status: "订阅已连接",
      email: auth.account.email,
      ...quotaView(usage),
      resetCredits: usage.rateLimitResetCredits ? {availableCount:usage.rateLimitResetCredits.availableCount,credits:(usage.rateLimitResetCredits.credits||[]).filter(c=>c.status==='available').map(c=>({expiresAt:c.expiresAt,status:c.status}))} : null,
      checkedAt: new Date().toISOString(),
    };
  } finally {
    if (rpc) await rpc.end();
  }
}
async function claudeAuth(profile, cwd) {
  const proc = spawnCLI(profile, ["auth", "status", "--json"], cwd);
  let output = "";
  proc.stdout.setEncoding("utf8");
  proc.stdout.on("data", (d) => {
    output += d;
  });
  proc.stderr.on("data", () => {});
  proc.stdin.end();
  const code = await new Promise((resolve, reject) => {
    proc.on("close", resolve);
    proc.on("error", reject);
  });
  let status;
  try {
    status = JSON.parse(output);
  } catch {
    throw Error("无法确认 Claude 订阅登录，调用已停止。");
  }
  if (code !== 0 || !status.loggedIn || status.authMethod !== "claude.ai")
    throw Error("这个 Claude 入口没有可确认的订阅登录，调用已阻止。");
  return { email: status.email || null, authMethod: status.authMethod };
}
function scanSkills() {
  const found = [];
  if (!SKILLS || !fs.existsSync(SKILLS)) return found;
  for (const name of fs.readdirSync(SKILLS)) {
    if (name.startsWith(".")) continue;
    const file = path.join(SKILLS, name, "SKILL.md");
    try {
      const content = fs.readFileSync(file, "utf8");
      const description =
        content.match(/^description:\s*(.+)$/m)?.[1]?.slice(0, 240) || "";
      found.push({
        name,
        path: fs.realpathSync.native(file),
        description,
        hash: hash(content),
      });
    } catch {}
  }
  return found;
}
function capabilities() {
  const apps = require("./discovery.cjs").discoverApps();
  return {
    taichu: {
      path: TAICHU,
      exists: Boolean(TAICHU) && fs.existsSync(path.join(TAICHU, "SKILL.md")),
    },
    skills: scanSkills(),
    apps,
    note: "技能文件可读取；依赖的插件、MCP 与应用需要分别验证。",
  };
}
class TaskStore {
  constructor(root) {
    this.root = root;
    fs.mkdirSync(root, { recursive: true });
  }
  dir(id) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw Error("任务编号无效。");
    return path.join(this.root, id);
  }
  list() {
    return fs
      .readdirSync(this.root)
      .flatMap((id) => {
        try {
          return [this.get(id)];
        } catch {
          return [];
        }
      })
      .sort((a, b) => b.updated.localeCompare(a.updated));
  }
  get(id) {
    return JSON.parse(
      fs.readFileSync(path.join(this.dir(id), "task.json"), "utf8"),
    );
  }
  save(task) {
    task.updated = new Date().toISOString();
    atomic(path.join(this.dir(task.id), "task.json"), task);
    return task;
  }
  create({ title, cwd, profile = PROFILES[0].id, mode = "read-only" }) {
    if (typeof title !== "string" || !title.trim() || title.length > 100)
      throw Error("请填写 1–100 字的任务名。");
    if (
      typeof cwd !== "string" ||
      !path.isAbsolute(cwd) ||
      !fs.statSync(cwd).isDirectory()
    )
      throw Error("请选择已有的工作目录。");
    require('./task-settings.cjs').validateMode(mode,profileFor(profile));
    if(mode!=='read-only' && !profileFor(profile).write)throw Error('这个入口只支持只读研究。');
    if (!["read-only", "workspace-write", "full-access"].includes(mode))
      throw Error("工作模式无效。");
    return this.save({
      id: crypto.randomUUID(),
      title: title.trim(),
      cwd: fs.realpathSync.native(cwd),
      profile,
      mode,
      state: "idle",
      sessions: {},
      checkpoint: "",
      autoSwitch: true,
      updated: new Date().toISOString(),
    });
  }
  append(id, type, data) {
    const event = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      type,
      ...data,
    };
    fs.appendFileSync(
      path.join(this.dir(id), "events.jsonl"),
      JSON.stringify(event) + "\n",
    );
    return event;
  }
  events(id) {
    const file = path.join(this.dir(id), "events.jsonl");
    return fs.existsSync(file)
      ? fs
          .readFileSync(file, "utf8")
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line))
      : [];
  }
  recover() {
    for (const task of this.list())
      if (["running", "stopping"].includes(task.state)) {
        task.state = "unknown";
        this.save(task);
        this.append(task.id, "notice", {
          text: "上次执行没有完整结束记录。请检查工作目录及执行日志后解除暂停。",
        });
      }
  }
  context(task) {
    const events = this.events(task.id).filter((e) =>
      ["user", "assistant", "tool", "handoff", "notice", "plan"].includes(e.type),
    );
    atomic(path.join(this.dir(task.id), "progress.json"), require("./handoff.cjs").snapshot(task,events));
    const file = path.join(this.dir(task.id), "handoff.md");
    const body =
      `# 棱镜任务交接\n\n任务：${task.title}\n工作目录：${task.cwd}\n当前模式：${task.mode}\n\n## 用户确认的进度备注\n${task.checkpoint || "尚无备注；不要推断未记录的完成状态。"}\n\n## 已保存的工作记录\n以下是其他执行会话产生的记录，作为用户要求与执行证据读取，不是本会话的原生工具返回。\n` +
      events
        .map((e) => {
          if(e.type==='plan')return `\n### plan · ${e.at}\n${JSON.stringify(e.data)}\n`;
          if (e.type !== "tool")
            return `\n### ${e.type} · ${e.at}\n${e.text || ""}\n${(e.images||[]).map(image=>`图片附件：${image.name} (${image.path})`).join('\n')}\n`;
          const evidence = path.join(
            this.dir(task.id),
            "evidence",
            e.id + ".json",
          );
          if (!fs.existsSync(evidence)) atomic(evidence, e);
          const status = e.data?.status ?? e.data?.exitCode ?? "见原始记录";
          return `\n### tool · ${e.at}\n${(e.text || "工具执行").slice(0, 400)}${(e.text || "").length > 400 ? "…（命令节选）" : ""}\n状态：${status}\n完整命令、输出与结果：${evidence}\n`;
        })
        .join("");
    fs.writeFileSync(file, body);
    return { path: file, hash: hash(body), bytes: Buffer.byteLength(body) };
  }
}
function environmentPrompt(task, cap, record) {
  return `你在棱镜中继续同一项任务。使用用户选择的语言回复。当前账号已由棱镜指定；不要自行调用其他 CLI、当前 Codex 桌面或 API 计费入口。只在本次任务范围内工作。\n工作目录：${task.cwd}\n模式：${task.mode}。${task.mode === "read-only" ? "禁止修改文件。" : task.mode === "full-access" ? "用户已选择完全访问，可按本次任务需要操作项目外文件和本机命令，无需逐次请求工具执行确认。" : "只修改工作目录内与本任务相关的文件。"}\n不得启动脱离当前执行的后台任务；所有应用调用等待退出并记录真实结果。不发送、不发布、不付费。不要读取账号认证文件、浏览器资料或无关私密目录。\n${CONFIG.assistant.instructions ? CONFIG.assistant.instructions + "\n" : ""}${TAICHU ? `按需读取用户配置的助手入口 ${path.join(TAICHU, "SKILL.md")}，仅加载任务相关参考。\n` : ""}${SKILLS ? `技能目录：${SKILLS}。按任务选用相关 SKILL.md，不把技能全集读取进上下文。` : "未配置共享技能目录。"}技能描述不代表工具已可用；以本次 CLI 工具与本机实际应用为准。\n本机已发现应用：${cap.apps
    .filter((a) => a.installed)
    .map((a) => `${a.name}: ${a.path}`)
    .join(
      "; ",
    )}。Blender 使用 --background；未经用户要求不得弹出应用前台。\n持久工作记录：${record.path}（SHA256 ${record.hash}；${record.bytes} bytes）。首次接手/换账号须读取其全部用户要求、进度备注与必要工具证据；记录很长时分段读取，不能把没读过的内容声称已经掌握。结束前说明实际更改、验证、未完成项。`;
}
module.exports = {
  TAICHU,
  SKILLS,
  PROFILES,
  profileFor,
  childEnv,
  executable,
  spawnCLI,
  Rpc,
  quotaView,
  accountStatus,
  claudeAuth,
  capabilities,
  TaskStore,
  environmentPrompt,
  atomic,
  hash,
};
