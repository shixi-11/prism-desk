const fs = require('node:fs'), path = require('node:path'), { execFile } = require('node:child_process');
const root = path.resolve(__dirname, '../.local/app-validation');
const apps = require('../electron/discovery.cjs').discoverApps();
const sdk = process.env.RESOLVE_SCRIPT_API || path.join(process.env.ProgramData || path.join(process.env.SystemDrive || '', 'ProgramData'), 'Blackmagic Design/DaVinci Resolve/Support/Developer/Scripting');
const resolveApp = apps.find(app => app.name === 'DaVinci Resolve');
const resolveDir = process.env.PRISM_RESOLVE_DIR || (resolveApp && path.dirname(resolveApp.path));
if (!resolveDir) throw new Error('Resolve was not discovered. Set PRISM_RESOLVE_DIR to its installation directory.');
const python = process.env.PRISM_PYTHON || apps.find(app => app.name === 'Python')?.path;
if (!python) throw new Error('Python was not discovered. Set PRISM_PYTHON to a Python executable.');
const runtimes = [{ name: 'Configured Python', file: python }];
const code = `import os,sys,json,struct,ctypes\nprint(json.dumps({'python':sys.version.split()[0],'bits':struct.calcsize('P')*8}),flush=True)\nhandles=[]\nif os.getenv('PRISM_DLL_SEARCH')=='1':\n for p in [${JSON.stringify(resolveDir)},os.path.dirname(sys.executable),sys.base_prefix]:\n  if os.path.isdir(p): handles.append(os.add_dll_directory(p))\nsys.path.insert(0,${JSON.stringify(path.join(sdk,'Modules'))})\ntry:\n import DaVinciResolveScript as d\n r=d.scriptapp('Resolve')\n print(json.dumps({'sdkLoaded':True,'connected':r is not None,'version':r.GetVersionString() if r else None,'projectManagerAvailable':r.GetProjectManager() is not None if r else False}),flush=True)\nexcept Exception as e:\n print(json.dumps({'sdkLoaded':False,'errorType':type(e).__name__,'error':str(e)}),flush=True)\n`;
function run(runtime, enhanced, explicitPythonHome = false) {
  const env = { ...process.env, RESOLVE_SCRIPT_API: sdk, RESOLVE_SCRIPT_LIB: path.join(resolveDir,'fusionscript.dll'), PRISM_DLL_SEARCH: enhanced ? '1' : '0' };
  delete env.PYTHONHOME; delete env.PYTHONPATH; delete env.PYTHON3HOME;
  if (explicitPythonHome) env.PYTHON3HOME = path.dirname(runtime.file);
  if (enhanced) {
    const key=Object.keys(env).find(key=>key.toUpperCase()==='PATH') || 'PATH';
    env[key] = [path.dirname(runtime.file),resolveDir,env[key]].join(path.delimiter);
  }
  return new Promise(resolve => execFile(runtime.file,['-c',code],{env,windowsHide:true,timeout:15000,maxBuffer:10000},(error,stdout)=>{
    const data=String(stdout).trim().split(/\r?\n/).map(line=>{try{return JSON.parse(line);}catch{return null;}}).filter(Boolean);
    resolve({runtime:runtime.name,path:runtime.file,enhancedDllSearch:enhanced,explicitPythonHome,exitCode:error?.code ?? 0,...Object.assign({},...data)});
  }));
}
async function main() {
  const result = {checkedAt:new Date().toISOString(),scope:'SDK 导入、连接、版本和项目管理器存在性；不读取或修改项目内容',attempts:[]};
  for(const runtime of runtimes.filter(runtime=>fs.existsSync(runtime.file))) {
    for(const enhanced of [false,true]) result.attempts.push(await run(runtime,enhanced));
    result.attempts.push(await run(runtime,false,true));
  }
  result.finding = 'SDK import and connection to an existing Resolve scripting session are separate checks. Inspect attempts for the result of each runtime setting.';
  result.connection = result.attempts.some(attempt=>attempt.connected) ? 'connected' : 'not-connected';
  fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,'resolve-probe.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
