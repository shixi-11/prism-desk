require('./helpers/config-fixture.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const {grokQuotaView,claudeUsageView,grokPaidUsageState}=require('../electron/provider-quota.cjs');
const now=Date.parse('2026-09-07T00:00:00Z');
const end='2026-09-08T00:00:00Z';
test('Claude query settles on stdin failure or timeout even if the child never closes',async()=>{
 const {EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');const {readClaudeUsage}=require('../electron/provider-quota.cjs');
 for(const brokenPipe of [true,false]){const proc=new EventEmitter();proc.stdout=new PassThrough();proc.stderr=new PassThrough();proc.stdin=new PassThrough();let killed=false;proc.kill=()=>{killed=true;};const result=readClaudeUsage({model:'opus'},'.',{claudeAuth:async()=>({email:'test@example.com'}),spawnCLI:()=>proc,timeoutMs:20});if(brokenPipe)setImmediate(()=>proc.stdin.emit('error',Error('EPIPE')));await assert.rejects(result,error=>error.queryUnavailable===true);assert.equal(killed,true);}
});
test('Grok omitted zero usage matches official pager only for a valid unified period',()=>{
 const config={isUnifiedBillingUser:true,currentPeriod:{type:'USAGE_PERIOD_TYPE_WEEKLY',start:'2026-09-06T00:00:00Z',end}};
 assert.equal(grokQuotaView({config},now).remaining,100);
 assert.equal(grokQuotaView({config:{...config,creditUsagePercent:null}},now).remaining,null);
 assert.equal(grokQuotaView({config:{...config,creditUsagePercent:'bad'}},now).remaining,null);
 assert.equal(grokQuotaView({config:{...config,isUnifiedBillingUser:false}},now).remaining,null);
 assert.equal(grokQuotaView({config},Date.parse(end)+1000).remaining,null);
 assert.equal(grokQuotaView({config:{}},now).remaining,null);
});
test('Claude retries transient query errors and missing usage, but not authentication failures',async()=>{
 const {readClaudeUsageWithRetry}=require('../electron/provider-quota.cjs');const profile={model:'opus'},ok={rate_limits_available:true,rate_limits:{five_hour:{utilization:20}}};let calls=0;
 assert.deepEqual(await readClaudeUsageWithRetry(profile,'.',async()=>{if(++calls===1)throw Object.assign(Error('temporary'),{queryUnavailable:true});return ok;}),ok);assert.equal(calls,2);
 calls=0;assert.deepEqual(await readClaudeUsageWithRetry(profile,'.',async()=>++calls===1?{}:ok),ok);assert.equal(calls,2);
 calls=0;await assert.rejects(readClaudeUsageWithRetry(profile,'.',async()=>{calls++;throw Object.assign(Error('login'),{code:'AUTH_REQUIRED'});}),/login/);assert.equal(calls,1);
 calls=0;await assert.rejects(readClaudeUsageWithRetry(profile,'.',async()=>{calls++;throw Object.assign(Error('temporary'),{queryUnavailable:true});}),/temporary/);assert.equal(calls,2);
});
test('Grok official billing percent and weekly reset, with no inference from other fields',()=>{
  const q=grokQuotaView({config:{creditUsagePercent:47,currentPeriod:{type:'USAGE_PERIOD_TYPE_WEEKLY',end}}},now);
  assert.equal(q.remaining,53);assert.equal(q.windows[0].minutes,10080);assert.equal(q.windows[0].resetsAt,Date.parse(end)/1000);
  assert.equal(grokQuotaView({remaining:0,message:'quota exhausted'},now).remaining,null);
  assert.equal(grokQuotaView({config:{creditUsagePercent:100,currentPeriod:{end:'2026-09-06'}}},now).exhausted,false);
  assert.equal(grokQuotaView({config:{creditUsagePercent:-1}},now).remaining,null);
});
test('Grok legacy allowance handles zero balance but never turns a missing limit into exhaustion',()=>{
  assert.equal(grokQuotaView({config:{monthlyLimit:{val:100},used:{val:30}}},now).remaining,70);
  assert.equal(grokQuotaView({config:{monthlyLimit:{val:0},used:{val:0}}},now).remaining,null);
});
test('Claude get_usage percent units and model-specific allowance are distinct',()=>{
  const raw={rate_limits_available:true,rate_limits:{five_hour:{utilization:1,resets_at:end},seven_day_opus:{utilization:100,resets_at:end},seven_day_sonnet:{utilization:25,resets_at:end}}};
  assert.equal(claudeUsageView(raw,'opus',now).remaining,0);
  assert.equal(claudeUsageView(raw,'sonnet',now).remaining,75);
  assert.equal(claudeUsageView({rate_limits_available:true,rate_limits:{five_hour:{utilization:1,resets_at:end}}},'opus',now).remaining,99);
  assert.equal(claudeUsageView({...raw,rate_limits_available:false},'opus',now).remaining,null);
  assert.equal(claudeUsageView({rate_limits_available:true,rate_limits:{seven_day_opus:{utilization:100,resets_at:'2026-09-06'}}},'opus',now).exhausted,false);
});
test('Grok paid-usage state is tri-state and accepts only official empty proto3 values',()=>{
  const empty={config:{onDemandCap:{},prepaidBalance:{}}};
  assert.equal(grokPaidUsageState(empty,{rule:{}}).extraUsageEnabled,false);
  assert.equal(grokPaidUsageState(empty,{rule:null}).extraUsageEnabled,false);
  assert.equal(grokPaidUsageState(empty,{}).extraUsageEnabled,false);
  assert.equal(grokPaidUsageState(empty,null).extraUsageEnabled,null);
  assert.equal(grokPaidUsageState({config:{}},{rule:{}}).extraUsageEnabled,null);
  assert.equal(grokPaidUsageState(empty,{rule:{enabled:true}}).extraUsageEnabled,true);
  assert.equal(grokPaidUsageState({config:{onDemandCap:{val:1},prepaidBalance:{}}},{rule:{}}).extraUsageEnabled,true);
  assert.equal(grokPaidUsageState({config:{onDemandCap:{},prepaidBalance:{val:1}}},{rule:{}}).extraUsageEnabled,true);
  assert.equal(grokPaidUsageState(empty,{raw:'request failed'}).extraUsageEnabled,null);
  assert.equal(grokPaidUsageState(empty,{rule:{enabled:'false'}}).extraUsageEnabled,null);
});
