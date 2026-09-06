const fs=require('node:fs'); const path=require('node:path');
const root=()=>path.join(process.env.PRISM_TEST_DATA || path.join(process.env.LOCALAPPDATA,'Prism'),'quota');
const minutes={five_hour:300,seven_day:10080,seven_day_opus:10080,seven_day_sonnet:10080};
function normalizeClaude(info,now=Date.now(),model=null) {
  if(!info || !['allowed','allowed_warning','rejected'].includes(info.status)) return null;
  const kind=info.rateLimitType;
  const relevant=['five_hour','seven_day'].includes(kind)||kind==='seven_day_opus'&&(!model||model.includes('opus'))||kind==='seven_day_sonnet'&&(!model||model.includes('sonnet'));
  const exhausted=info.status==='rejected' && relevant && !info.isUsingOverage;
  const utilization=Number.isFinite(info.utilization) && info.utilization>=0 && info.utilization<=1 ? info.utilization : null;
  const remaining=exhausted ? 0 : utilization===null ? null : Math.round((1-utilization)*1000)/10;
  const resetsAt=Number.isFinite(info.resetsAt) ? info.resetsAt : null;
  return {remaining,exhausted,windows:minutes[kind] && remaining!==null ? [{remaining,minutes:minutes[kind],resetsAt}] : [],checkedAt:new Date(now).toISOString(),source:'claude-rate-limit-event',status:exhausted?'订阅额度已耗尽':remaining===null?'订阅可用；CLI 未返回额度百分比':'CLI 返回的订阅额度',resetsAt};
}
function recordClaude(id,info,model=null) {
  const result=normalizeClaude(info);if(!result)return null;
  if(!require('./config.cjs').CONFIG.profiles.some(p=>p.id===id && p.provider==='Claude'))throw Error('额度账号无效');
  const file=path.join(root(),id+'.json');let observations={};
  try {observations=JSON.parse(fs.readFileSync(file,'utf8')).observations||{};}catch{}
  observations[info.rateLimitType||'unspecified']=result;
  observations=Object.fromEntries(Object.entries(observations).filter(([,q])=>fresh(q,Date.now())));
  fs.mkdirSync(root(),{recursive:true});fs.writeFileSync(file,JSON.stringify({observations}));return {id,...combine(Object.entries(observations).filter(([kind])=>relevantWindow(kind,model)).map(([,value])=>value))};
}
function fresh(q,now){const age=now-Date.parse(q.checkedAt);return age>=0&&age<=300000&&(!q.resetsAt||q.resetsAt*1000>now);}
function combine(observations){
  if(!observations.length)return {status:'额度记录已过期；等待下次执行更新',remaining:null,windows:[],exhausted:false};
  const latest=observations.reduce((a,b)=>Date.parse(a.checkedAt)>Date.parse(b.checkedAt)?a:b);
  const windows=observations.flatMap(q=>q.windows||[]);
  const exhausted=observations.some(q=>q.exhausted);
  const values=observations.map(q=>q.remaining).filter(Number.isFinite);
  return {...latest,remaining:exhausted?0:values.length?Math.min(...values):null,windows,exhausted,status:exhausted?'订阅额度已耗尽':values.length?'CLI 返回的订阅额度':latest.status};
}
function relevantWindow(kind,model){return !model || kind!=='seven_day_opus'&&kind!=='seven_day_sonnet' || kind==='seven_day_opus'&&model.includes('opus') || kind==='seven_day_sonnet'&&model.includes('sonnet');}
function cachedQuota(id,now=Date.now(),model=null) {
  if(!require('./config.cjs').CONFIG.profiles.some(p=>p.id===id && p.provider==='Claude'))return {};
  try {const q=JSON.parse(fs.readFileSync(path.join(root(),id+'.json'),'utf8'));return combine(Object.entries(q.observations||{legacy:q}).filter(([kind,v])=>relevantWindow(kind,model)&&fresh(v,now)).map(([,v])=>v));} catch{return {};}
}
function codexExhausted(error) {return error?.codexErrorInfo==='usageLimitExceeded';}
module.exports={normalizeClaude,recordClaude,cachedQuota,codexExhausted};
