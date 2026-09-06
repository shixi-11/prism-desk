const fs = require('node:fs'), path = require('node:path');
const { execFile } = require('node:child_process');
const root = path.resolve(__dirname, '../.local/app-validation');
const exists = file => fs.existsSync(file);
function exec(file, args, env = process.env) {
  return new Promise(resolve => execFile(file, args, { windowsHide: true, timeout: 15000, maxBuffer: 32000, env }, (error, stdout, stderr) => resolve({ ok: !error, output: String(stdout).trim().slice(0, 500), nativeModuleFailed: String(stderr).includes('initialization of fusionscript failed'), error: error ? '后台只读接口未成功响应' : undefined })));
}
async function main() {
  fs.mkdirSync(root, { recursive: true });
  const apps = require('../electron/discovery.cjs').discoverApps();
  const result = { checkedAt: new Date().toISOString(), scope: '只读接口盘点；注册或安装不代表操作任务已通过', apps: {} };
  const com = await exec('powershell.exe', ['-NoProfile', '-Command', "$ids=@('Photoshop.Application','Illustrator.Application','InDesign.Application','KWPS.Application','KET.Application'); @($ids | ForEach-Object { [pscustomobject]@{id=$_;registered=Test-Path -LiteralPath ('Registry::HKEY_CLASSES_ROOT\\'+$_+'\\CLSID')} }) | ConvertTo-Json -Compress"]);
  const registered = com.ok ? JSON.parse(com.output) : [];
  const comId = { Photoshop: 'Photoshop.Application', Illustrator: 'Illustrator.Application', InDesign: 'InDesign.Application', WPS: 'KWPS.Application' };
  for (const app of apps.filter(app => !['Blender', 'ComfyUI', 'FFmpeg', 'Python'].includes(app.name))) {
    const entry = { path: app.path, mtimeMs: fs.statSync(app.path).mtimeMs, level: 'discovered', interface: null, detail: '已发现程序；棱镜尚未接入该应用的自动化协议，未执行用户项目操作。' };
    if (comId[app.name]) {
      const active = registered.find(value => value.id === comId[app.name])?.registered === true;
      entry.interface = { kind: 'COM', progId: comId[app.name], registered: active };
      entry.detail = active ? '已发现 COM 自动化注册；尚未连接应用或验证文档操作。此轮不启动界面或读取用户文档。' : '程序已安装，未确认 COM 注册；需要可用自动化接口。';
    }
    if (app.name === 'After Effects') {
      const file = path.join(path.dirname(app.path), 'aerender.exe');
      entry.interface = { kind: 'command-line-renderer', path: file, exists: exists(file) };
      entry.detail = '已发现 aerender 后台渲染入口；还需独立测试工程、渲染配置及可用许可，未调用渲染。';
    }
    if (app.name === 'Cinema 4D') {
      const file = path.join(path.dirname(app.path), 'Commandline.exe');
      entry.interface = { kind: 'command-line-renderer', path: file, exists: exists(file) };
      entry.detail = '已发现命令行渲染程序；需要确认命令行许可及独立测试场景，未启动或占用许可。';
    }
    if (app.name === 'VS Code') {
      const cmd = path.join(path.dirname(app.path), 'bin/code.cmd');
      const match = fs.readFileSync(cmd, 'utf8').match(/%~dp0\.\.\\([^"\r\n]+cli\.js)/);
      const script = match && path.join(path.dirname(app.path), match[1]);
      const probe = script && exists(script) ? await exec(app.path, [script, '--version'], { ...process.env, ELECTRON_RUN_AS_NODE: '1' }) : { ok: false };
      entry.interface = { kind: 'CLI', path: script || null, versionProbe: probe.ok, version: probe.ok ? probe.output : undefined };
      entry.level = probe.ok ? 'interface-verified' : 'discovered';
      entry.detail = probe.ok ? 'CLI 版本查询已成功，无界面启动；编辑器会话或扩展自动化尚未接入。' : '发现 CLI 入口但版本查询未成功；编辑器自动化尚未接入。';
    }
    if (app.name === 'DaVinci Resolve') {
      const sdk = path.join(process.env.RESOLVE_SCRIPT_API || path.join(process.env.ProgramData || path.join(process.env.SystemDrive || '', 'ProgramData'), 'Blackmagic Design/DaVinci Resolve/Support/Developer/Scripting'), 'Modules');
      const lib = path.join(path.dirname(app.path), 'fusionscript.dll');
      const python = apps.find(value => value.name === 'Python')?.path;
      const code = `import sys,json;sys.path.insert(0,${JSON.stringify(sdk)});import DaVinciResolveScript as d;r=d.scriptapp('Resolve');print(json.dumps({'connected':r is not None,'version':r.GetVersionString() if r else None}))`;
      const probe = python && exists(lib) ? await exec(python, ['-c', code], { ...process.env, RESOLVE_SCRIPT_LIB: lib, PYTHON3HOME: path.dirname(python) }) : { ok: false };
      let data; try { data = JSON.parse(probe.output); } catch {}
      entry.interface = { kind: 'Python scripting SDK', sdkInstalled: exists(path.join(sdk, 'DaVinciResolveScript.py')), libraryInstalled: exists(lib), sdkLoaded: !!data, connected: data?.connected === true, version: data?.version || undefined };
      entry.level = data?.connected ? 'interface-verified' : 'discovered';
      entry.detail = data?.connected ? '已连接现有 Resolve 进程并读取版本；未读取项目内容或验证剪辑/导出。' : data ? '子进程 PYTHON3HOME 修正后 SDK 已加载；Resolve 未返回可连接脚本会话，尚需确认应用外部脚本设置及版本许可支持。' : probe.nativeModuleFailed ? '已发现 SDK 与脚本库，但本机 Python 加载 fusionscript 初始化失败；需继续检查运行时定位。' : '已发现 Python SDK 与库，尚未建立外部脚本连接；需检查应用外部脚本设置及版本许可支持。';
    }
    if (app.name === 'Voicebox') {
      let connected = false;
      try {
        const response = await fetch('http://127.0.0.1:17493/profiles', { headers: { 'X-Voicebox-Client-Id': 'prism-workbench' }, signal: AbortSignal.timeout(3000), redirect: 'error' });
        if (response.ok) { const data = await response.json(); connected = Array.isArray(data) || Array.isArray(data.profiles); }
      } catch {}
      entry.interface = { kind: 'REST/MCP', endpoint: 'http://127.0.0.1:17493', connected, serverInstalled: exists(path.join(path.dirname(app.path), 'voicebox-server.exe')), mcpInstalled: exists(path.join(path.dirname(app.path), 'voicebox-mcp.exe')) };
      entry.level = connected ? 'interface-verified' : 'discovered';
      entry.detail = connected ? '本机 REST 已响应；未保存声音资料，未选择声音、合成或下载模型。' : '已发现 server/MCP 入口，但本机 17493 服务未确认可用；尚未连接配音能力。';
    }
    if (app.name === 'Obsidian') {
      entry.interface = { kind: 'CLI candidate', launcherPresent: exists(path.join(path.dirname(app.path), 'Obsidian.com')) };
      entry.detail = '已发现命令行启动器；未确认已启用 CLI 或存在自动化连接，未读取任何知识库。';
    }
    if (['Premiere Pro', 'Audition', 'Media Encoder', 'Lightroom Classic'].includes(app.name)) {
      entry.detail = '程序已发现；棱镜尚未配置并验证该应用的插件/脚本桥接。此次未启动界面、读取项目或据安装路径推定可操作。';
    }
    result.apps[app.name] = entry;
  }
  fs.writeFileSync(path.join(root, 'interfaces.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
