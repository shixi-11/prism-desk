// Official CLI protocols only. Never read tokens or infer quota from assistant text.
const clamp = n => Math.max(0, Math.min(100, n));
const epoch = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) / 1000 : null;
function centValue(value) {
  if(!value || typeof value!=='object' || Array.isArray(value))return null;
  // Official proto3 Cent decoding treats an existing empty object as zero.
  if(!Object.hasOwn(value,'val'))return 0;
  return Number.isSafeInteger(value.val)?value.val:null;
}
function grokPaidUsageState(result, topup) {
  const cap=centValue(result?.config?.onDemandCap);
  const balance=centValue(result?.config?.prepaidBalance);
  const payAsYouGoEnabled=cap===null||cap<0?null:cap>0;
  const prepaidCreditsPresent=balance===null?null:balance!==0;
  let autoTopupEnabled=null;
  if(topup && typeof topup==='object' && !Array.isArray(topup) && !('raw' in topup) && !('error' in topup)) {
    if(topup.rule===null || Object.keys(topup).length===0)autoTopupEnabled=false;
    else if(topup.rule && typeof topup.rule==='object' && !Array.isArray(topup.rule))autoTopupEnabled=typeof topup.rule.enabled==='boolean'?topup.rule.enabled:!Object.hasOwn(topup.rule,'enabled')?false:null;
  }
  const flags=[payAsYouGoEnabled,prepaidCreditsPresent,autoTopupEnabled];
  return {payAsYouGoEnabled,prepaidCreditsPresent,autoTopupEnabled,extraUsageEnabled:flags.includes(true)?true:flags.every(x=>x===false)?false:null};
}
function summarize(windows, source, now) {
  windows = windows.filter(w => w.resetsAt === null || w.resetsAt * 1000 > now);
  const remaining = windows.length ? Math.min(...windows.map(w => w.remaining)) : null;
  return { remaining, windows, exhausted: remaining === 0, source, checkedAt: new Date(now).toISOString(), status: remaining === null ? '订阅已连接；本次查询未返回有效额度' : remaining === 0 ? '订阅额度已耗尽' : '官方 CLI 返回的订阅额度' };
}
function grokQuotaView(result, now = Date.now()) {
  const c = result?.config;
  let used = c?.creditUsagePercent;
  if (!Number.isFinite(used) && Number.isFinite(c?.monthlyLimit?.val) && c.monthlyLimit.val > 0 && Number.isFinite(c?.used?.val) && c.used.val >= 0) used = c.used.val / c.monthlyLimit.val * 100;
  const start = epoch(c?.currentPeriod?.start || c?.billingPeriodStart);
  const resetsAt = epoch(c?.currentPeriod?.end || c?.billingPeriodEnd);
  // Official pager credit_balance_from_config uses zero when the optional
  // percentage is omitted. Apply only to a confirmed live unified period;
  // malformed, empty, legacy, and expired responses must remain unknown.
  if(c?.isUnifiedBillingUser===true&&!Object.hasOwn(c,'creditUsagePercent')&&!c.monthlyLimit&&start!==null&&start*1000<=now&&resetsAt*1000>now)used=0;
  const kind = c?.currentPeriod?.type;
  const minutes = kind === 'USAGE_PERIOD_TYPE_WEEKLY' ? 10080 : start && resetsAt > start ? Math.round((resetsAt - start) / 60) : null;
  const resultView = summarize(Number.isFinite(used) && used >= 0 ? [{ remaining: clamp(100 - used), minutes, resetsAt, kind: kind || 'billing_period' }] : [], 'grok-official-billing', now);
  if (resetsAt && resetsAt * 1000 > now) resultView.period = {minutes, resetsAt, kind:kind || 'billing_period'};
  return resultView;
}
function claudeUsageView(result, model = 'opus', now = Date.now()) {
  const durations = {five_hour:300, seven_day:10080, seven_day_opus:10080, seven_day_sonnet:10080};
  const windows = [];
  if (result?.rate_limits_available === true) for (const [kind, value] of Object.entries(result.rate_limits || {})) {
    if (!(kind in durations) || kind === 'seven_day_opus' && !model.includes('opus') || kind === 'seven_day_sonnet' && !model.includes('sonnet')) continue;
    if (!Number.isFinite(value?.utilization) || value.utilization < 0) continue;
    windows.push({remaining:clamp(100-value.utilization), minutes:durations[kind], resetsAt:epoch(value.resets_at), kind});
  }
  return summarize(windows, 'claude-official-get-usage', now);
}
async function grokQuota(profile, cwd) {
  const {Rpc} = require('./core.cjs');
  const rpc = new Rpc(profile, cwd);
  try {
    await rpc.init();
    let identity=null;
    try{identity=await rpc.call('_x.ai/auth/info',{},15000);}catch{}
    const billing=await rpc.call('_x.ai/billing', {}, 25000);
    let topup=null;
    try {topup=await rpc.call('_x.ai/auto-topup-rule',{},15000);}catch{}
    return {id:profile.id,...(typeof identity?.email==='string'?{email:identity.email}:{}),...grokQuotaView(billing),...grokPaidUsageState(billing,topup)};
  }
  finally { await rpc.end(); }
}
async function readClaudeUsage(profile, cwd, dependencies={}) {
  const {spawnCLI,claudeAuth} = {...require('./core.cjs'),...dependencies};
  const auth=await claudeAuth(profile,cwd);
  const proc = spawnCLI(profile, ['--print','--verbose','--input-format','stream-json','--output-format','stream-json','--no-session-persistence','--setting-sources','','--settings','{"apiKeyHelper":"","env":{},"disableAllHooks":true}','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--tools','','--permission-mode','dontAsk'], cwd);
  return new Promise((resolve,reject) => {
    let buffer='', done=false, finalError, finalValue;
    const timer=setTimeout(()=>finish(Error('Claude 额度查询超时；未将该账号判为耗尽。')),dependencies.timeoutMs||30000);
    function finish(error,value) {if(done)return;done=true;finalError=error?Object.assign(error,{queryUnavailable:true}):null;finalValue=value;clearTimeout(timer);try{proc.stdin.end();proc.kill();}catch{}finalError?reject(finalError):resolve(finalValue);}
    proc.stdin.on('error',()=>finish(Error('Claude 额度查询连接提前结束。')));
    proc.on('error',e=>finish(e));
    proc.on('close',()=>{if(!done)finish(Error('Claude 额度查询连接提前结束。'));finalError?reject(finalError):resolve(finalValue);});
    proc.stderr.on('data',()=>{});
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data',data=>{buffer+=data;if(buffer.length>1048576)return finish(Error('Claude 额度响应超出大小限制。'));let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);let msg;try{msg=JSON.parse(line);}catch{continue;}if(msg.type!=='control_response')continue;const r=msg.response;if(r?.request_id==='prism-quota-init'){if(r.subtype==='error')return finish(Error('Claude 不支持初始化额度查询。'));proc.stdin.write(JSON.stringify({type:'control_request',request_id:'prism-quota-usage',request:{subtype:'get_usage'}})+'\n');} else if(r?.request_id==='prism-quota-usage'){if(r.subtype==='error')return finish(Error('当前 Claude CLI 未能返回结构化额度。'));finish(null,{...r.response,prismAccount:auth});}}});
    proc.stdin.write(JSON.stringify({type:'control_request',request_id:'prism-quota-init',request:{subtype:'initialize'}})+'\n');
  });
}
async function readClaudeUsageWithRetry(profile,cwd,read=readClaudeUsage) {
  for(let attempt=0;attempt<2;attempt++){
    try{const usage=await read(profile,cwd);if(attempt===0&&claudeUsageView(usage,profile.model).remaining===null){await new Promise(r=>setTimeout(r,250));continue;}return usage;}
    catch(error){if(!error.queryUnavailable||attempt===1)throw error;await new Promise(r=>setTimeout(r,250));}
  }
}
async function claudeQuota(profile,cwd) {
  let usage;
  try {usage=await readClaudeUsageWithRetry(profile,cwd);} catch(error) {
    // Authentication failures never fall back to a former authenticated snapshot.
    if(!error.queryUnavailable)throw error;
    const cached=require('./quota.cjs').cachedQuota(profile.id,Date.now(),profile.model);
    if(!cached.checkedAt)throw error;
    return {id:profile.id,...cached,extraUsageEnabled:null,cached:true,status:'实时额度查询暂不可用；显示执行时的额度记录'};
  }
  const flag=usage?.rate_limits?.extra_usage?.is_enabled;
  return {id:profile.id,email:usage.prismAccount?.email,subscriptionType:usage.prismAccount?.subscriptionType,...claudeUsageView(usage,profile.model),extraUsageEnabled:typeof flag==='boolean'?flag:null};
}
module.exports={grokQuotaView,claudeUsageView,grokQuota,claudeQuota,readClaudeUsage,readClaudeUsageWithRetry,grokPaidUsageState};
