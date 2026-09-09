require('./helpers/config-fixture.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Runner}=require('../electron/runner.cjs'),{TaskStore}=require('../electron/core.cjs'),quota=require('../electron/provider-quota.cjs');
test('Grok paid usage and zero readings are informational',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-billing-')),store=new TaskStore(root),grok=require('../electron/grok.cjs');
 const originalQuota=quota.grokQuota,originalRun=grok.runGrok;let calls=0;
 try{grok.runGrok=async()=>{calls++;};for(const flag of [true,false,null])for(const remaining of [0,85]){
  quota.grokQuota=async()=>({remaining,extraUsageEnabled:flag});const task=store.create({title:'billing status',cwd:root,profile:'grok-test-1'}),runner=new Runner(store);
  await runner.grok(task,{id:'grok-test-1'},'Read the project','');
 }assert.equal(calls,6);}finally{quota.grokQuota=originalQuota;grok.runGrok=originalRun;const real=fs.realpathSync(root);assert.equal(path.dirname(real).toLowerCase(),fs.realpathSync(os.tmpdir()).toLowerCase());assert.ok(path.basename(real).startsWith('prism-billing-'));fs.rmSync(real,{recursive:true,force:true});}
});

test('Codex zero allowance reaches the service while subscription authentication still applies',async()=>{
 const vm=require('node:vm'),source=fs.readFileSync(path.join(__dirname,'../electron/runner.cjs'),'utf8');
 const start=source.indexOf('      await rpc.init();',source.indexOf('async codex('));
 const end=source.indexOf('      const options =',start);assert.ok(start>0&&end>start);
 for(const type of ['chatgpt','apiKey']){
  let checked=false;const runner={active:{},emit:()=>{},state:()=>{throw Error('unexpected local block');}};
  const rpc={init:async()=>{},call:async method=>method==='account/read'?{account:{type}}:(checked=true,{})};
  const run=vm.runInNewContext('(async function(){'+source.slice(start,end)+'return "continue";})',{rpc,profile:{id:'test'},task:{},quotaView:()=>({remaining:0})});
  if(type==='chatgpt'){assert.equal(await run.call(runner),'continue');assert.equal(checked,true);}
  else {await assert.rejects(run.call(runner),/订阅登录/);assert.equal(checked,false);}
 }
});

test('Claude model-specific cached limits do not block the other model',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-quota-model-')),previous=process.env.PRISM_TEST_DATA;process.env.PRISM_TEST_DATA=root;
 try{const {recordClaude,cachedQuota}=require('../electron/quota.cjs');const resetsAt=Date.now()/1000+3600;
  recordClaude('claude-test-3',{status:'rejected',rateLimitType:'seven_day_opus',resetsAt});
  recordClaude('claude-test-3',{status:'allowed',rateLimitType:'five_hour',utilization:.2,resetsAt});
  assert.equal(cachedQuota('claude-test-3',Date.now(),'sonnet').remaining,80);assert.equal(cachedQuota('claude-test-3',Date.now(),'opus').remaining,0);
 }finally{if(previous===undefined)delete process.env.PRISM_TEST_DATA;else process.env.PRISM_TEST_DATA=previous;fs.rmSync(root,{recursive:true,force:true});}
});
