const {test}=require('node:test'),assert=require('node:assert/strict');
test('thinking indicator follows an active turn and disappears for other visible phases or an ended turn',async()=>{
 const {conversationStatus:status}=await import('../src/conversation-status.js');
 const base={task:{state:'running'},hasMessages:true};
 assert.equal(status(base).kind,'thinking');
 assert.equal(status({...base,thinking:'summary'}).kind,'thinking');
 assert.equal(status({...base,thinking:'old',activity:'tool'}),null);
 assert.equal(status({...base,streaming:'text'}),null);
 assert.equal(status({...base,awaitingApproval:true}),null);
 assert.equal(status({...base,task:{state:'running',activeQuestionIds:['q']}}),null);
 for(const state of ['stopping','paused','idle','failed','unknown']) assert.equal(status({...base,task:{state},thinking:'stale'}),null);
 assert.equal(status({task:null,thinking:'other task'}),null);
 // After a tool finishes, an ongoing turn shows thinking again without requiring a reasoning delta.
 assert.equal(status({...base,activity:''}).label,'正在思考…');
});
