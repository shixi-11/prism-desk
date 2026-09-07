function request(runner,task,message){
 const questions=message.params?.questions;
 if(!Array.isArray(questions)||!questions.length||questions.length>3||questions.some(q=>typeof q.id!=='string'||typeof q.question!=='string'))return false;
 runner.active.questions??=new Map();runner.active.questions.set(String(message.id),message);
 task.activeQuestionIds=[...runner.active.questions.keys()];runner.store?.save(task);runner.emit?.('state',task);
 runner.event(task.id,'question',{requestId:String(message.id),questions});return true;
}
function answer(runner,id,requestId,answers){
 const run=runner.active,message=run?.task.id===id?run.questions?.get(requestId):null;
 if(!message||run.cancelRequested)throw Error('这项选择已失效，请继续当前任务');
 const normalized={};
 for(const q of message.params.questions){const values=answers?.[q.id]?.answers;if(!Array.isArray(values)||!values.length||values.some(v=>typeof v!=='string'||!v.trim()||v.length>4000))throw Error('请填写或选择答案');normalized[q.id]={answers:values};}
 run.rpc.write({id:message.id,result:{answers:normalized}});run.questions.delete(requestId);
 run.task.activeQuestionIds=[...run.questions.keys()];runner.store?.save(run.task);runner.emit?.('state',run.task);
 runner.event(id,'user',{text:message.params.questions.map(q=>`${q.question}\n${normalized[q.id].answers.join('；')}`).join('\n\n'),questionRequestId:requestId,profile:run.profile.id});
}
module.exports={request,answer};
