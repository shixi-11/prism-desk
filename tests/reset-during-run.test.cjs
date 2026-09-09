require('./helpers/config-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

function harness({confirm=async()=>({response:1}),consume=async()=>({outcome:'reset'})}={}) {
  const source=fs.readFileSync(path.join(__dirname,'../electron/main.cjs'),'utf8');
  const start=source.indexOf("  handle('resetCredit',");
  const end=source.indexOf("  handle('models',",start);
  assert.ok(start>0&&end>start);
  let handler;
  const active={task:{id:'running-task',state:'running'},pending:new Map([['stream','open']])};
  const state={accountOperation:false,resetInProgress:false,runner:{active},PROFILES:[{id:'codex-test-1',provider:'Codex'}],
    handle:(_,fn)=>{handler=fn;},dialog:{showMessageBox:confirm},owner:()=>null,settings:()=>({language:'zh'}),resetCreditDialog:()=>({}),
    app:{getAppPath:()=>'/fixture'},dataPath:()=>'/fixture-data',require:name=>{assert.equal(name,'./reset-credits.cjs');return {consumeReset:consume};}};
  vm.runInNewContext(source.slice(start,end),state);
  return {state,active,run:()=>handler('codex-test-1')};
}

test('running task survives redemption; overlapping requests cannot spend another credit',async()=>{
  let finish,calls=0;
  const h=harness({consume:async id=>{assert.equal(id,'codex-test-1');calls++;return new Promise(resolve=>{finish=resolve;});}});
  const result=h.run();await new Promise(setImmediate);
  assert.equal(calls,1);assert.equal(h.state.resetInProgress,true);
  await assert.rejects(h.run(),/请等待/);
  assert.equal(h.state.runner.active,h.active);assert.equal(h.active.pending.get('stream'),'open');
  finish({outcome:'reset'});assert.equal((await result).outcome,'reset');
  assert.equal(h.state.resetInProgress,false);assert.equal(h.state.runner.active,h.active);assert.equal(h.active.task.state,'running');
});

test('cancelling confirmation or a failed redemption leaves running task intact and releases the lock',async()=>{
  let calls=0;
  const cancelled=harness({confirm:async()=>({response:0}),consume:async()=>{calls++;}});
  assert.equal((await cancelled.run()).outcome,'cancelled');assert.equal(calls,0);
  assert.equal(cancelled.state.resetInProgress,false);assert.equal(cancelled.state.runner.active,cancelled.active);
  const failed=harness({consume:async()=>{throw Error('network disconnected');}});
  await assert.rejects(failed.run(),/network/);assert.equal(failed.state.resetInProgress,false);assert.equal(failed.state.runner.active,failed.active);
});

test('account changes remain excluded and task completion during confirmation does not block redemption',async()=>{
  let calls=0,answer;
  const h=harness({confirm:()=>new Promise(resolve=>{answer=resolve;}),consume:async()=>{calls++;return {outcome:'reset'};}});
  h.state.accountOperation=true;await assert.rejects(h.run(),/账号操作/);assert.equal(calls,0);
  h.state.accountOperation=false;const result=h.run();h.state.runner.active=null;answer({response:1});
  assert.equal((await result).outcome,'reset');assert.equal(calls,1);assert.equal(h.state.runner.active,null);
});
