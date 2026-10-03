const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {codexHistory}=require('../electron/context-history.cjs');
test('historical context reads only the selected account session and its last window',async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'prism-context-history-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));const dir=path.join(home,'sessions','2026','10','03');fs.mkdirSync(dir,{recursive:true});const id='11111111-1111-7111-8111-111111111111';
 const record={timestamp:'2026-10-03T00:00:00Z',payload:{type:'token_count',info:{total_token_usage:{total_tokens:9999999},last_token_usage:{total_tokens:63823,input_tokens:63710,output_tokens:113},model_context_window:258400}}};fs.writeFileSync(path.join(dir,'rollout-date-'+id+'.jsonl'),JSON.stringify(record)+'\n'+JSON.stringify({payload:{type:'token_count',info:null}})+'\n');
 const value=await codexHistory({provider:'Codex',home},id);assert.equal(value.used,63823);assert.equal(value.limit,258400);assert.equal(value.sessionId,id);assert.equal(value.checkedAt,record.timestamp);assert.equal(await codexHistory({provider:'Claude',home},id),null);assert.equal(await codexHistory({provider:'Codex',home},'../../other'),null);assert.equal(await codexHistory({provider:'Codex',home:path.join(home,'other')},id),null);
});
