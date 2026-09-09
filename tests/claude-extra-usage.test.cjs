require('./helpers/config-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module'),{EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
const core=require('../electron/core.cjs');
test('Claude extra usage does not block launch or terminate an overage stream',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-claude-overage-'));
  t.after(()=>{const real=fs.realpathSync(root);assert.equal(path.dirname(real).toLowerCase(),fs.realpathSync(os.tmpdir()).toLowerCase());assert.ok(path.basename(real).startsWith('prism-claude-overage-'));fs.rmSync(real,{recursive:true,force:true});});
  const file=path.resolve(__dirname,'../electron/runner.cjs'),localRequire=createRequire(file);
  for(const [flag,remaining] of [[true,80],[true,0],[false,80],[false,0],[null,80],[null,0]]){
    let launched=0,killed=0;
    const context={module:{exports:{}},require:name=>name==='./core.cjs'?{...core,spawnCLI:()=>{
      launched++;const proc=new EventEmitter();proc.pid=123;proc.stdout=new PassThrough();proc.stderr=new PassThrough();proc.stdin=new PassThrough();proc.kill=()=>{killed++;};
      setImmediate(()=>{for(const item of [{type:'rate_limit_event',rate_limit_info:{status:'allowed',rateLimitType:'five_hour',isUsingOverage:flag===true}},{type:'assistant',message:{content:[{type:'text',text:'OK'}]}},{type:'result',is_error:false}])proc.stdout.write(JSON.stringify(item)+'\n');proc.emit('close',0);});return proc;
    }}:name==='./provider-quota.cjs'?{claudeQuota:async()=>({remaining,extraUsageEnabled:flag})}:name==='./quota.cjs'?{...localRequire(name),recordClaude:()=>null}:localRequire(name)};
    vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
    const store=new core.TaskStore(path.join(root,String(flag)+remaining));const task=store.create({title:'isolated test',cwd:root,profile:'claude-test-1',mode:'read-only'});
    const runner=new context.module.exports.Runner(store);runner.active={task,images:[],quotaByWindow:{},cancelRequested:false};
    await runner.claude(task,core.profileFor('claude-test-1'),'Only reply OK','Do not use tools.');
    assert.equal(launched,1);assert.equal(killed,0);assert.equal(runner.active.cancelRequested,false);assert.equal(store.get(task.id).state,'idle');
    assert.equal(store.events(task.id).find(e=>e.type==='assistant').text,'OK');
  }
});
