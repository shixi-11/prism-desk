const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { execFile, spawn } = require('node:child_process');
const crypto = require('node:crypto');
const root = path.join(process.env.PRISM_TEST_DATA || path.join(require('./update-bootstrap.cjs').installation(path.resolve(__dirname, '..')), '.local'), 'app-validation');
function outputPath(base, name) {
  const target = path.resolve(base, name);
  if (!target.startsWith(path.resolve(base) + path.sep)) throw Error('Output must remain inside validation directory');
  return target;
}
function execute(file, args, cwd, timeout = 60000) {
  return new Promise((resolve, reject) => execFile(file, args, { cwd, windowsHide: true, timeout, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => error ? reject(Error(String(stderr || error.message).slice(-1800))) : resolve(stdout)));
}
function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function observedTaskValidation(app) {
  try {
    const result = JSON.parse(fs.readFileSync(path.join(root, 'latest.json'), 'utf8')).apps?.[app.name];
    if (!result?.ok || result.path !== app.path || result.mtimeMs !== fs.statSync(app.path).mtimeMs) return null;
    const artifact = outputPath(root, result.artifact);
    if (hash(artifact) !== result.sha256) return null;
    return result;
  } catch { return null; }
}
async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
async function validateBlender(app, dir) {
  const blend = outputPath(dir, 'probe.blend'), create = outputPath(dir, 'create.py'), verify = outputPath(dir, 'verify.py');
  fs.writeFileSync(create, `import bpy\nbpy.ops.wm.read_factory_settings(use_empty=True)\nbpy.ops.mesh.primitive_cube_add(size=2, location=(1,2,3))\nbpy.context.object.name='PrismValidationCube'\nbpy.ops.wm.save_as_mainfile(filepath=${JSON.stringify(blend)})\n`);
  fs.writeFileSync(verify, `import bpy, json\no=bpy.data.objects['PrismValidationCube']\nassert len(o.data.vertices)==8\nassert tuple(o.location)==(1.0,2.0,3.0)\nprint('PRISM_BLENDER_VERIFIED')\n`);
  await execute(app.path, ['--background', '--factory-startup', '--python-exit-code', '1', '--python', create], dir);
  const text = await execute(app.path, ['--background', blend, '--python-exit-code', '1', '--python', verify], dir);
  if (!text.includes('PRISM_BLENDER_VERIFIED')) throw Error('Reopened scene verification marker missing');
  return { method: 'Background scene creation, save, reopen and geometry/location assertions', artifact: blend, sha256: hash(blend), scope: '本机后台场景读写；未代表所有 CLI 账号已实测' };
}
async function validatePython(app, dir) {
  const file = outputPath(dir, 'calculation.json');
  await execute(app.path, ['-c', `import json,hashlib; p=${JSON.stringify(file)}; data={'sum':sum(range(101)),'utf8':'棱镜'}; open(p,'w',encoding='utf-8').write(json.dumps(data,ensure_ascii=False)); assert json.load(open(p,encoding='utf-8'))['sum']==5050`], dir);
  if (JSON.parse(fs.readFileSync(file, 'utf8')).sum !== 5050) throw Error('Python result mismatch');
  return { method: 'Compute and UTF-8 JSON write/read roundtrip', artifact: file, sha256: hash(file) };
}
async function validateFFmpeg(app, dir) {
  // Silent technical fixture only; no music or user artwork is generated.
  const video = outputPath(dir, 'technical-fixture.mkv');
  await execute(app.path, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=64x64:r=4:d=1', '-an', '-c:v', 'ffv1', '-y', video], dir);
  const result = await execute(app.path, ['-hide_banner', '-loglevel', 'error', '-i', video, '-f', 'framemd5', '-'], dir);
  if (result.split('\n').filter(line => /^0,/.test(line)).length !== 4) throw Error('Decoded frame count mismatch');
  return { method: 'Encode one-second silent test fixture and decode all four frames', artifact: video, sha256: hash(video) };
}
async function validateComfy(app, dir) {
  const python = path.resolve(path.dirname(app.path), '../python_embeded/python.exe');
  if (!fs.existsSync(python)) throw Error('ComfyUI bundled Python missing');
  const port = await availablePort(), output = outputPath(dir, 'output');
  fs.mkdirSync(output, { recursive: true });
  const args = [app.path, '--listen', '127.0.0.1', '--port', String(port), '--cpu', '--disable-auto-launch', '--disable-all-custom-nodes', '--disable-api-nodes', '--base-directory', dir, '--output-directory', output];
  const child = spawn(python, args, { cwd: path.dirname(app.path), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '', exit = false, launchError;
  child.stdout.on('data', chunk => { log = (log + chunk).slice(-8000); });
  child.stderr.on('data', chunk => { log = (log + chunk).slice(-8000); });
  child.on('error', error => { launchError = error; exit = true; });
  child.on('exit', () => { exit = true; });
  const endpoint = `http://127.0.0.1:${port}`;
  const request = async (route, options = {}) => {
    const response = await fetch(endpoint + route, { ...options, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw Error(`ComfyUI HTTP ${response.status}`);
    return response.json();
  };
  try {
    let stats;
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      if (exit) throw Error(launchError?.message || 'ComfyUI exited: ' + log.slice(-1800));
      try { stats = await request('/system_stats'); if (stats.system?.comfyui_version) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!stats?.system?.comfyui_version) throw Error('ComfyUI startup timed out: ' + log.slice(-1800));
    const nodes = await request('/object_info');
    if (!nodes.EmptyImage || !nodes.SaveImage) throw Error('Required built-in nodes unavailable');
    const prompt = { '1': { class_type: 'EmptyImage', inputs: { width: 64, height: 64, batch_size: 1, color: 0 } }, '2': { class_type: 'SaveImage', inputs: { images: ['1', 0], filename_prefix: 'prism-technical-probe' } } };
    fs.writeFileSync(outputPath(dir, 'workflow.json'), JSON.stringify(prompt, null, 2));
    const submitted = await request('/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, client_id: crypto.randomUUID() }) });
    if (!submitted.prompt_id) throw Error('ComfyUI did not accept workflow');
    let result;
    for (let i = 0; i < 60; i++) {
      const history = await request('/history/' + submitted.prompt_id); result = history[submitted.prompt_id];
      if (result?.status?.completed || result?.status?.status_str === 'error') break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (result?.status?.status_str !== 'success') throw Error('Workflow failed or did not complete');
    const saved = result.outputs?.['2']?.images?.[0];
    if (!saved || saved.type !== 'output') throw Error('Workflow output missing');
    const artifact = outputPath(output, path.join(saved.subfolder || '', saved.filename));
    const data = fs.readFileSync(artifact);
    if (data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || data.readUInt32BE(16) !== 64 || data.readUInt32BE(20) !== 64) throw Error('Saved PNG dimensions mismatch');
    return { method: 'Private loopback CPU server; built-in EmptyImage → SaveImage; output validated', version: stats.system.comfyui_version, artifact, sha256: hash(artifact), scope: '仅无模型工作流与文件输出；未测试生图模型或自定义节点。临时服务验证后关闭。' };
  } finally {
    if (!exit) { child.kill(); await Promise.race([new Promise(resolve => child.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 5000))]); }
  }
}
async function validateApps(names = ['Blender', 'Python', 'FFmpeg', 'ComfyUI']) {
  const run = path.join(root, new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(run, { recursive: true });
  const apps = require('./discovery.cjs').discoverApps();
  const handlers = { Blender: validateBlender, Python: validatePython, FFmpeg: validateFFmpeg, ComfyUI: validateComfy };
  const result = { checkedAt: new Date().toISOString(), scope: '本机后台技术验证，不代表全部订阅 CLI 权限或艺术成品能力', apps: {} };
  for (const name of names) {
    const app = apps.find(value => value.name === name);
    if (!app || !handlers[name]) { result.apps[name] = { ok: false, error: '未发现可验证入口' }; continue; }
    const dir = outputPath(run, name); fs.mkdirSync(dir, { recursive: true });
    try { result.apps[name] = { ok: true, level: 'task-verified', path: app.path, mtimeMs: fs.statSync(app.path).mtimeMs, checkedAt: new Date().toISOString(), ...await handlers[name](app, dir) }; }
    catch (error) { result.apps[name] = { ok: false, path: app.path, checkedAt: new Date().toISOString(), error: error.message }; }
  }
  fs.writeFileSync(path.join(run, 'results.json'), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(root, 'latest.json'), JSON.stringify(result, null, 2));
  return result;
}
module.exports = { validateApps, outputPath, observedTaskValidation };
