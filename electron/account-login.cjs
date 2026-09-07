const {spawn}=require('node:child_process');
const {providerFor,officialLoginUrl}=require('./account-providers.cjs');
function startAccountLogin(profile,cwd,onUrl=()=>{},dependencies={}){
 const core=require('./core.cjs'),adapter=providerFor(profile.provider);
 const proc=(dependencies.spawn||spawn)((dependencies.executable||core.executable)(profile),adapter.loginArgs(profile),{cwd,env:(dependencies.childEnv||core.childEnv)(profile),windowsHide:true,stdio:['pipe','pipe','pipe']});
 let buffer='',url=null,cancelled=false,timedOut=false,closed=false,submitted=false,timer;
 const receive=data=>{buffer=(buffer+data.toString().replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'')).slice(-32768);let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);for(const raw of line.match(/https:\/\/[^\s<>"\x1b]+/g)||[]){const found=officialLoginUrl(profile.provider,raw.replace(/[).,;]+$/,''));if(found&&found!==url){url=found;onUrl(found);}}}};
 proc.stdout.on('data',receive);proc.stderr.on('data',receive);
 proc.stdin?.on('error',()=>{});
 const completed=new Promise((resolve,reject)=>{
  timer=setTimeout(()=>{timedOut=true;proc.kill();},dependencies.timeoutMs||600000);
  proc.once('error',()=>{closed=true;clearTimeout(timer);reject(Error('无法启动登录，请检查 CLI 安装与路径。'));});
  proc.once('close',code=>{closed=true;clearTimeout(timer);if(cancelled)return resolve({cancelled:true});if(timedOut)return reject(Error('登录等待超时，请重新登录。'));if(code!==0)return reject(Error(submitted?'登录未完成，请重新获取链接后重试。':'登录未完成，请重试并完成官方浏览器授权。'));resolve({completed:true});});
 }).finally(()=>{clearTimeout(timer);buffer='';url=null;});
 const submitCode=async value=>{
  if(!adapter.manualCode)throw Error('此平台无需手动输入授权码。');
  if(closed||cancelled||timedOut||!url||!proc.stdin?.writable)throw Error('当前登录已结束或尚未就绪，请重新获取登录链接。');
  const code=typeof value==='string'?value.trim():'';
  if(!code||code.length>4096||/[^\x21-\x7e]/.test(code))throw Error('请粘贴完整的授权码，不要包含空格或换行。');
  if(submitted)throw Error('授权码已提交，请等待登录结果。');
  submitted=true;
  await new Promise((resolve,reject)=>{try{proc.stdin.write(code+'\n','utf8',error=>error?reject(Error('授权码未能提交，请重新获取登录链接。')):resolve());}catch{reject(Error('授权码未能提交，请重新获取登录链接。'));}});
  return {submitted:true};
 };
 return {completed,get url(){return url;},submitCode,cancel:async()=>{cancelled=true;proc.kill();await completed.catch(()=>{});}};
}
module.exports={startAccountLogin};
