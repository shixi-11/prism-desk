const fs=require('node:fs'),path=require('node:path');
function isFile(file){try{return fs.statSync(file).isFile();}catch{return false;}}
function dirs(root){try{return fs.readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>path.join(root,d.name));}catch{return [];}}
function resolveExecutable(profile,env=process.env){
  if(path.isAbsolute(profile.executable)){if(isFile(profile.executable))return profile.executable;throw Error('程序未安装或路径已失效：'+profile.executable);}
  // Explorer does not inherit the Codex terminal's injected PATH. Find the
  // official per-device installation without touching any account directory.
  if(profile.provider==='Codex' && env.LOCALAPPDATA && path.isAbsolute(env.LOCALAPPDATA)){
    const root=path.join(env.LOCALAPPDATA||'', 'OpenAI','Codex','bin');
    const candidates=[path.join(root,'codex.exe'),...dirs(root).map(dir=>path.join(dir,'codex.exe'))].filter(isFile);
    candidates.sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
    if(candidates.length)return candidates[0];
  }
  const key=Object.keys(env).find(k=>k.toUpperCase()==='PATH');
  for(const entry of (env[key]||'').split(path.delimiter).filter(Boolean)){
    const dir=entry.replace(/^"|"$/g,'');if(!path.isAbsolute(dir))continue;
    const file=path.join(dir,profile.executable);if(isFile(file))return file;
  }
  throw Error('没有找到 '+profile.executable+'，请检查本机 CLI 安装。');
}
function discoverApps(){
  const {CONFIG}=require('./config.cjs');
  const env=process.env;
  const pathKey=Object.keys(env).find(k=>k.toUpperCase()==='PATH');
  const onPath=exe=>(env[pathKey]||'').split(path.delimiter).map(d=>d.replace(/^"|"$/g,'')).filter(d=>path.isAbsolute(d)).map(d=>path.join(d,exe));
  const localPrograms=path.join(env.LOCALAPPDATA||require('node:os').homedir(),'Programs');
  const found=[];
  const add=(name,category,candidates,probe,note)=>{
    const configured=CONFIG.apps[name];
    const file=[...(typeof configured==='string'&&path.isAbsolute(configured)?[configured]:[]),...candidates].find(isFile);if(file)found.push({name,category,path:file,installed:true,probe,note:note||'程序已发现；自动化接口待验证'});
  };
  const programRoots=[process.env.ProgramFiles||'C:\\Program Files',process.env['ProgramFiles(x86)']||'C:\\Program Files (x86)'];
  add('ComfyUI','图像与三维',[],'comfy','已发现源码入口；检查本机 8188 端口，不自动启动或加载模型');
  add('Blender','图像与三维',[...onPath('blender.exe'),...programRoots.flatMap(r=>dirs(path.join(r,'Blender Foundation')).map(d=>path.join(d,'blender.exe')))],'blender');
  for(const [label,prefix,exe] of [
    ['Photoshop','Adobe Photoshop','Photoshop.exe'],['Illustrator','Adobe Illustrator','Support Files/Contents/Windows/Illustrator.exe'],
    ['Premiere Pro','Adobe Premiere Pro','Adobe Premiere Pro.exe'],['After Effects','Adobe After Effects','Support Files/AfterFX.exe'],
    ['Audition','Adobe Audition','Adobe Audition.exe'],['InDesign','Adobe InDesign','InDesign.exe'],
    ['Media Encoder','Adobe Media Encoder','Adobe Media Encoder.exe'],['Lightroom Classic','Adobe Lightroom Classic','Lightroom.exe']]){
    add(label,'Adobe',programRoots.flatMap(r=>dirs(path.join(r,'Adobe')).filter(d=>path.basename(d).startsWith(prefix)).sort().reverse().map(d=>path.join(d,exe))));
  }
  add('Cinema 4D','图像与三维',programRoots.flatMap(r=>dirs(r).filter(d=>path.basename(d).startsWith('Maxon Cinema 4D')).sort().reverse().map(d=>path.join(d,'Cinema 4D.exe'))));
  add('DaVinci Resolve','视频与音频',programRoots.map(r=>path.join(r,'Blackmagic Design','DaVinci Resolve','Resolve.exe')));
  add('Voicebox','视频与音频',[...onPath('voicebox.exe'),path.join(localPrograms,'voicebox','voicebox.exe')]);
  add('FFmpeg','视频与音频',onPath('ffmpeg.exe'),'ffmpeg');
  add('Stable Diffusion WebUI','图像与三维',[],null,'已发现源码入口；服务与模型待验证');
  add('WPS','文档与开发',[...programRoots,path.join(env.LOCALAPPDATA||localPrograms,'Kingsoft')].flatMap(r=>dirs(path.join(r,'WPS Office')).sort((a,b)=>path.basename(b).localeCompare(path.basename(a),undefined,{numeric:true})).map(d=>path.join(d,'office6','wps.exe'))));
  add('VS Code','文档与开发',[path.join(localPrograms,'Microsoft VS Code','Code.exe'),...programRoots.map(r=>path.join(r,'Microsoft VS Code','Code.exe'))]);
  add('Obsidian','文档与开发',[path.join(env.LOCALAPPDATA||localPrograms,'Obsidian','Obsidian.exe'),...onPath('Obsidian.exe')]);
  add('Python','文档与开发',[...onPath('python.exe').filter(p=>!p.toLowerCase().includes('windowsapps')),...dirs(path.join(localPrograms,'Python')).map(d=>path.join(d,'python.exe'))],'python');
  return found.map(app=>({...app,verification:require('./diagnostics.cjs').observedApp(app),taskVerification:require('./app-validation.cjs').observedTaskValidation(app),interfaceObservation:require('./interface-state.cjs').interfaceState(app)}));
}
module.exports={resolveExecutable,discoverApps};
