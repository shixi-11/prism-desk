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
 require('./goal-lifecycle.cjs').execution(task,task.state);
 delete task.planApproved;delete task.goalSuggestion;store.save(task);store.context(task);runner.emit('state',task);return task;
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
function suggest(task,events,startRevision){
 if(task.workPlan?.revision!==startRevision)return false;
 const recent=events.slice(events.findLastIndex(e=>e.type==='user'));
 for(const e of recent.filter(e=>e.type==='assistant').reverse()){
  const block=(e.text||'').match(/```prism-goal\s*\n([\s\S]*?)```/);
  if(!block)continue;
  try{const {goal}=JSON.parse(block[1]);if(typeof goal!=='string'||!goal.trim()||goal.length>4000||goal.trim()===task.workPlan?.goal)return false;task.goalSuggestion={goal:goal.trim(),eventId:e.id};return true;}catch{return false;}
 }
 return false;
}
const goalInstructions='目标与计划由棱镜真实保存，聊天中的“已设置/已激活”不算保存。用户要求设置或修改目标（包括请你自行选择目标）时，如有 get_task_goal / set_task_goal，先读取真实目标和版本，再调用保存工具；只有工具成功才可说目标已保存。没有该工具时，给出目标建议并在 prism-goal 代码块中返回 {"goal":"完整目标"}，说明用户可在上方采用，不要声称已经保存或启动。不要为了普通提問自动创建目标。设置目标仅记录工作方向，不创建无人值守循环，不代表计划已确认或成果已验收。';
module.exports={validate,save,context,capture,suggest,goalInstructions};
