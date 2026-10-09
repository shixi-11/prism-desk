const test=require('node:test'),assert=require('node:assert/strict');
test('context display distinguishes no session, settings changes and a real current measurement',async()=>{
 const {sessionContext}=await import('../src/session-context.js'),profile={id:'codex',provider:'Codex'};
 const task={sessions:{},contextUsage:{codex:{sessionId:'old',used:100,limit:1000}}};
 let view=sessionContext(task,profile);assert.equal(view.context,null);assert.equal(view.native,false);assert.match(view.message,/尚无会话/);
 task.sessions.codex='new';view=sessionContext(task,profile);assert.equal(view.context,null);assert.equal(view.native,true);assert.match(view.message,/请刷新/);
 task.contextUsage.codex={sessionId:'new',used:4595,limit:258400};view=sessionContext(task,profile);assert.equal(view.context.used,4595);assert.equal(view.message,null);
 task.pendingModelRefresh={codex:true};view=sessionContext(task,profile);assert.equal(view.native,false);assert.match(view.message,/设置待生效/);
 assert.equal(sessionContext(task,{...profile,provider:'Grok'}).native,false);
});
