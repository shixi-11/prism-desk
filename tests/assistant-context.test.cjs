const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {assistantContext}=require('../electron/assistant-context.cjs');
test('assistant uses live mother rules and the real memory registry without copying content',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-assistant-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const mother=path.join(root,'mother'),home=path.join(root,'home');
 for(const file of ['AGENTS.md','portable/codex-home/AGENTS.md','references/codex-memory-map.md']){const target=path.join(mother,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,'private rules');}
 fs.mkdirSync(path.join(home,'memories'),{recursive:true});for(const file of ['MEMORY.md','memory_summary.md'])fs.writeFileSync(path.join(home,'memories',file),'private memory');
 const prompt=assistantContext(mother,home);assert.ok(prompt.includes(JSON.stringify(path.join(mother,'AGENTS.md'))));assert.ok(prompt.includes(JSON.stringify(path.join(home,'memories','MEMORY.md'))));assert.ok(!prompt.includes('private memory'));assert.ok(!prompt.includes(JSON.stringify(path.join(mother,'portable','codex-home','AGENTS.md'))));assert.equal(assistantContext('',home),'');
});
