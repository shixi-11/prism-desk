const {test}=require('node:test'),assert=require('node:assert/strict');
test('conversation status follows actual task state and never labels generic waiting as thinking',async()=>{
 const {conversationStatus:status}=await import('../src/conversation-status.js');
 const base={task:{state:'running'},hasMessages:true};
 assert.equal(status(base).kind,'working');
 assert.equal(status({...base,thinking:'summary'}).kind,'thinking');
 assert.equal(status({...base,thinking:'old',activity:'tool'}).kind,'tool');
 assert.equal(status({...base,streaming:'text'}).kind,'reply');
 assert.equal(status({...base,activity:'tool',awaitingApproval:true}).kind,'waiting');
 assert.equal(status({...base,task:{state:'running',activeQuestionIds:['q']}}).kind,'waiting');
 for(const [state,kind,label] of [['stopping','stopping','正在停止…'],['paused','stopped','已停止'],['idle','ended','本轮已结束'],['failed','failed','执行未完成'],['unknown','unknown','需要核对进度']]){
   const value=status({...base,task:{state},thinking:'stale',activity:'stale',streaming:'stale'});
   assert.equal(value.kind,kind);assert.equal(value.label,label);assert.equal(value.moving,state==='stopping');
 }
 assert.equal(status({task:{state:'idle'},hasMessages:false}),null);
 assert.equal(status({task:null,thinking:'other task'}),null);
});
