const {childEnv,executable,claudeAuth}=require('./core.cjs');
const {spawn}=require('node:child_process');
function startClaudeLogin(profile,cwd,onUrl=()=>{}){
 if(profile.provider!=='Claude')throw Error('请选择 Claude 账号');
 const args=['auth','login','--claudeai'];if(profile.email)args.push('--email',profile.email);
 const proc=spawn(executable(profile),args,{cwd,env:childEnv(profile),windowsHide:true,stdio:['pipe','pipe','pipe']});
 let output='',opened=false;
 const receive=data=>{output=(output+data.toString()).slice(-32768);if(opened)return;for(const text of output.match(/https:\/\/[^\s\x1b]+/g)||[]){try{const url=new URL(text);if(['claude.ai','claude.com'].includes(url.hostname)&&url.pathname.includes('oauth')&&url.searchParams.has('state')){opened=true;Promise.resolve(onUrl(url.href)).catch(()=>{});break;}}catch{}}};
 proc.stdout.on('data',receive);proc.stderr.on('data',receive);
 let timer;const completed=new Promise((resolve,reject)=>{
  timer=setTimeout(()=>proc.kill(),10*60*1000);
  proc.once('error',reject);
  proc.once('close',async code=>{clearTimeout(timer);if(code!==0)return reject(Error('Claude 登录未完成，请重新登录。'));try{resolve(await claudeAuth(profile,cwd));}catch(e){reject(e);}});
 }).finally(()=>clearTimeout(timer));
 return {completed,cancel:async()=>{proc.kill();}};
}
module.exports={startClaudeLogin};
