const {spawn}=require('node:child_process');
const {providerFor,officialLoginUrl}=require('./account-providers.cjs');
function startAccountLogin(profile,cwd,onUrl=()=>{},dependencies={}){
 const core=require('./core.cjs'),adapter=providerFor(profile.provider);
 const proc=(dependencies.spawn||spawn)((dependencies.executable||core.executable)(profile),adapter.loginArgs(profile),{cwd,env:(dependencies.childEnv||core.childEnv)(profile),windowsHide:true,stdio:['pipe','pipe','pipe']});
 let buffer='',url=null,cancelled=false,timedOut=false,timer;
 const receive=data=>{buffer=(buffer+data.toString().replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'')).slice(-32768);let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);for(const raw of line.match(/https:\/\/[^\s<>"\x1b]+/g)||[]){const found=officialLoginUrl(profile.provider,raw.replace(/[).,;]+$/,''));if(found&&found!==url){url=found;onUrl(found);}}}};
 proc.stdout.on('data',receive);proc.stderr.on('data',receive);
 const completed=new Promise((resolve,reject)=>{
  timer=setTimeout(()=>{timedOut=true;proc.kill();},dependencies.timeoutMs||600000);
  proc.once('error',()=>{clearTimeout(timer);reject(Error('无法启动登录，请检查 CLI 安装与路径。'));});
  proc.once('close',code=>{clearTimeout(timer);buffer='';if(cancelled)return resolve({cancelled:true});if(timedOut)return reject(Error('登录等待超时，请重新登录。'));if(code!==0)return reject(Error('登录未完成，请重试并完成官方浏览器授权。'));resolve({completed:true});});
 }).finally(()=>clearTimeout(timer));
 return {completed,get url(){return url;},cancel:async()=>{cancelled=true;proc.kill();await completed.catch(()=>{});}};
}
module.exports={startAccountLogin};
