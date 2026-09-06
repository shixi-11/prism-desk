const fs=require('node:fs'),path=require('node:path'),{execFile}=require('node:child_process');
const file=()=>path.join(process.env.PRISM_TEST_DATA || path.join(process.env.LOCALAPPDATA,'Prism'),'capability-checks.json');
function evidence(){try{return JSON.parse(fs.readFileSync(file(),'utf8'));}catch{return {};}}
function observedApp(app){const result=evidence().apps?.[app.name];if(!result||result.path!==app.path)return null;if(app.probe==='comfy'&&!(Date.now()-Date.parse(result.checkedAt)>=0&&Date.now()-Date.parse(result.checkedAt)<120000))return null;try{if(fs.statSync(app.path).mtimeMs!==result.mtimeMs)return null;}catch{return null;}return result;}
async function verifyCapabilities(){
  const {capabilities}=require('./core.cjs');const cap=capabilities();const apps={};
  for(const app of cap.apps){try{if(!app.installed)continue;const args=app.name==='Blender'?['--background','--version']:['--version'];
    if(!app.probe)continue;
    if(app.probe==='comfy'){
      let check;
      try{const response=await fetch('http://127.0.0.1:8188/system_stats',{signal:AbortSignal.timeout(2500),redirect:'error'});if(!response.ok)throw Error('服务返回 '+response.status);const data=await response.json();if(typeof data.system?.comfyui_version!=='string'||!Array.isArray(data.devices))throw Error('未确认是 ComfyUI 服务');check={ok:true,version:'ComfyUI '+data.system.comfyui_version,label:'服务已连接'};}
      catch{check={ok:false,error:'8188 端口未确认有 ComfyUI 服务；安装入口仍可用，尚未启动或使用其他端口'};}
      apps[app.name]={...check,path:app.path,mtimeMs:fs.statSync(app.path).mtimeMs,checkedAt:new Date().toISOString(),method:'GET 127.0.0.1:8188/system_stats'};continue;
    }
    if(app.probe==='ffmpeg')args.splice(0,args.length,'-version');
    const result=await new Promise(resolve=>execFile(app.path,args,{windowsHide:true,timeout:15000,maxBuffer:64000},(error,stdout,stderr)=>resolve({ok:!error,version:String(stdout||stderr).trim().split('\n')[0].slice(0,180),error:error?.message?.slice(0,180)})));
    apps[app.name]={...result,path:app.path,mtimeMs:fs.statSync(app.path).mtimeMs,checkedAt:new Date().toISOString(),method:args.join(' ')};
    }catch{apps[app.name]={ok:false,path:app.path,checkedAt:new Date().toISOString(),error:'检测期间程序路径发生变化，请重新检测'};}
  }
  const result={apps,checkedAt:new Date().toISOString(),taichuEntryReadable:cap.taichu.exists,skillEntries:cap.skills.length};fs.mkdirSync(path.dirname(file()),{recursive:true});require('./core.cjs').atomic(file(),result);return capabilities();
}
module.exports={observedApp,verifyCapabilities};
