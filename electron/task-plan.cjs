const crypto=require('node:crypto');
function validate(input){
 if(!input||typeof input.goal!=='string'||input.goal.length>4000||!Array.isArray(input.steps)||input.steps.length>60)throw Error('目标或计划格式无效');
 const steps=input.steps.map(s=>{if(!s||typeof s.text!=='string'||!s.text.trim()||s.text.length>1000||!['pending','in_progress','completed'].includes(s.status))throw Error('计划步骤格式无效');return {text:s.text.trim(),status:s.status};});
 return {goal:input.goal.trim(),steps};
}
function save(store,runner,id,input){
 const task=runner.active?.task.id===id?runner.active.task:store.get(id);
 if((input?.revision||null)!==(task.workPlan?.revision||null))throw Error('计划已更新，请重新打开后编辑');
 const next=validate(input);task.workPlan={...next,revision:crypto.randomUUID()};
 delete task.planApproved;store.save(task);store.context(task);runner.emit('state',task);return task;
}
function context(task,brief=false){const p=task.workPlan;const text=p?`目标：${p.goal||'未设置'}\n计划：\n${p.steps.map((s,i)=>`${i+1}. [${s.status}] ${s.text}`).join('\n')}\n步骤状态为用户记录，须核对实际结果；不得自行声称用户已验收。`:'';return brief&&text.length>1800?text.slice(0,1800)+'\n（计划节选；完整目标与计划请读取持久工作记录。）':text;}
function capture(task,events,startRevision){
 if(task.workPlan?.revision!==startRevision)return false;
 const current=events.slice(events.findLastIndex(e=>e.type==='user'));
 let steps=current.findLast(e=>e.type==='plan')?.data?.plan?.map(s=>({text:s.step,status:'pending'}));
 if(!steps?.length){for(const e of current.filter(e=>e.type==='assistant').reverse()){
   const blocks=[...(e.text||'').matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)];
   for(const block of blocks){try{const data=JSON.parse(block[1]);if(Array.isArray(data.steps)){steps=data.steps.map(s=>({text:typeof s==='string'?s:s.text,status:'pending'}));break;}}catch{}}
   if(steps?.length)break;
 }}
 if(!steps?.length)return false;
 try{task.workPlan={...validate({goal:task.workPlan?.goal||'',steps}),revision:crypto.randomUUID()};return true;}catch{return false;}
}
module.exports={validate,save,context,capture};
