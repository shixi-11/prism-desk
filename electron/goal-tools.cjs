const plans=require('./task-plan.cjs');
const tools=[
 {type:'function',name:'get_task_goal',description:'Read the actual saved goal and revision of this Prism task. Chat messages alone do not save goals.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {type:'function',name:'set_task_goal',description:'Save the goal in Prism when the user asks to set or change a goal, including asking you to choose one. First read get_task_goal and use its revision. This updates the visible goal; it does not prove completion or start a background loop.',inputSchema:{type:'object',properties:{goal:{type:'string',minLength:1,maxLength:4000},revision:{type:['string','null']}},required:['goal','revision'],additionalProperties:false}},
];
function request(runner,task,message){
 const p=message.params||{};
 if(message.method!=='item/tool/call'||!tools.some(t=>t.name===p.tool))return false;
 let result;
 try{
  const active=runner.active;
  if(!active||active.task.id!==task.id||active.cancelRequested||p.threadId!==task.sessions[active.profile.id])throw Error('This task is no longer accepting goal changes.');
  if(p.tool==='set_task_goal'){
   const a=p.arguments;
   if(!a||typeof a.goal!=='string'||!a.goal.trim()||!Object.hasOwn(a,'revision'))throw Error('A nonempty goal and the current revision are required.');
   const updated=plans.save(runner.store,runner,task.id,{goal:a.goal,steps:task.workPlan?.steps||[],revision:a.revision});
   active.planRevision=updated.workPlan.revision;
   if(updated.workPlan.steps.length){updated.planReviewRequired=true;runner.store.save(updated);runner.emit('state',updated);}
   runner.event(task.id,'notice',{text:updated.planReviewRequired?'目标已保存，请核对已有计划后确认执行':'目标已保存',goal:updated.workPlan.goal});
  }
  result={success:true,contentItems:[{type:'inputText',text:JSON.stringify({goal:task.workPlan?.goal||'',revision:task.workPlan?.revision||null,steps:task.workPlan?.steps||[],saved:!!task.workPlan?.goal,status:task.goalLifecycle?.status||null})}]};
 }catch(e){result={success:false,contentItems:[{type:'inputText',text:e.message}]};}
 runner.active?.rpc?.write({id:message.id,result});return true;
}
module.exports={tools,request};
