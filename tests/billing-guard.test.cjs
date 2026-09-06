require('./helpers/config-fixture.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Runner}=require('../electron/runner.cjs'),{TaskStore}=require('../electron/core.cjs'),quota=require('../electron/provider-quota.cjs');
test('extra billing enabled or unknown is rejected before model execution',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-billing-')),store=new TaskStore(root);
 const originals={claudeQuota:quota.claudeQuota,grokQuota:quota.grokQuota};
 try{for(const provider of ['claude','grok'])for(const flag of [true,null]){
  quota[provider+'Quota']=async()=>({remaining:85,extraUsageEnabled:flag});
  const task=store.create({title:'billing guard',cwd:root,profile:provider==='claude'?'claude-test-3':'grok-test-1'}),runner=new Runner(store);
  await runner.run(task.id,'Read the project');assert.equal(store.get(task.id).state,'failed');assert.deepEqual(store.get(task.id).sessions,{});assert.match(store.events(task.id).find(e=>e.type==='notice').text,/未发起模型请求/);
 }}finally{Object.assign(quota,originals);fs.rmSync(root,{recursive:true,force:true});}
});
test('Claude model-specific cached limits do not block the other model',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-quota-model-')),previous=process.env.PRISM_TEST_DATA;process.env.PRISM_TEST_DATA=root;
 try{const {recordClaude,cachedQuota}=require('../electron/quota.cjs');const resetsAt=Date.now()/1000+3600;
  recordClaude('claude-test-3',{status:'rejected',rateLimitType:'seven_day_opus',resetsAt});
  recordClaude('claude-test-3',{status:'allowed',rateLimitType:'five_hour',utilization:.2,resetsAt});
  assert.equal(cachedQuota('claude-test-3',Date.now(),'sonnet').remaining,80);assert.equal(cachedQuota('claude-test-3',Date.now(),'opus').remaining,0);
 }finally{if(previous===undefined)delete process.env.PRISM_TEST_DATA;else process.env.PRISM_TEST_DATA=previous;fs.rmSync(root,{recursive:true,force:true});}
});
