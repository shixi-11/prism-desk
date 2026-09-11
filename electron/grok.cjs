const {Rpc}=require('./core.cjs');
function grokArgs(task,profile,instructions){
  const mode=task.execution?.mode||task.mode;
  require('./task-settings.cjs').validateMode(mode,profile);
  const readOnly=mode==='read-only',full=mode==='full-access';
  return ['--cwd',task.cwd,'--model',profile.model,'--reasoning-effort',profile.effort||'high',
    '--permission-mode',readOnly?'dontAsk':full?'bypassPermissions':'default','--no-subagents',
    '--sandbox',readOnly?'read-only':full?'off':'workspace',
    '--tools',readOnly?'Read,Grep,WebSearch,WebFetch':'Read,Grep,WebSearch,WebFetch,Edit,Bash',
    '--allow','Read','--allow','Grep','--allow','WebSearch','--allow','WebFetch',
    ...(readOnly?['--deny','Edit','--deny','Bash']:['--no-plan']),
    '--deny','MCPTool','--rules',instructions,'agent','--no-leader','stdio'];
}
function permissionOutcome(params,decision){
  const kind=decision==='accept'?'allow_once':'reject_once';
  const option=params?.options?.find(o=>o.kind===kind);
  return option?{outcome:'selected',optionId:option.optionId}:{outcome:'cancelled'};
}
async function runGrok(runner,task,profile,text,instructions) {
  const rpc=new Rpc(profile,task.cwd,grokArgs(task,profile,instructions));
  Object.assign(runner.active,{rpc,grok:true});task.activePid=rpc.proc.pid;runner.store.save(task);
  let answer='';let sessionId;let terminal;const guidance=new Set();let guidanceError;
  rpc.on('message',m=>{
    if(m.id!==undefined && m.method) {
      if(m.method==='session/request_permission'&&(task.execution?.mode||task.mode)!=='read-only'&&!runner.active.cancelRequested){
        runner.active.pending.set(String(m.id),m);
        runner.emit('approval',{taskId:task.id,id:String(m.id),method:m.method,params:{reason:m.params?.toolCall?.title,changes:m.params?.toolCall}});return;
      }
      rpc.write(m.method==='session/request_permission' ? {id:m.id,result:{outcome:{outcome:'cancelled'}}} : {id:m.id,error:{code:-32601,message:'Unsupported client operation'}});return;
    }
    const u=m.params?.update;if(m.method!=='session/update'||!u)return;
    if(u.sessionUpdate==='agent_message_chunk' && u.content?.type==='text') {runner.confirmExecution?.(task,profile);answer+=u.content.text;runner.emit('delta',{taskId:task.id,text:u.content.text});}
    if(['tool_call','tool_call_update'].includes(u.sessionUpdate)) runner.event(task.id,'tool',{text:u.title||u.toolCallId||'Grok 工具',data:u,profile:profile.id});
    if(u.sessionUpdate==='plan')runner.event(task.id,'plan',{data:u});
  });
  try {
    const capabilities=await rpc.init();
    if(runner.active.cancelRequested){runner.state(task,'paused');return;}
    const existing=task.sessions[profile.id];
    const result=await rpc.call(existing?'session/load':'session/new',{...(existing?{sessionId:existing}:{}),cwd:task.cwd,mcpServers:[]});
    sessionId=existing||result.sessionId;if(!sessionId)throw Error('Grok 未返回会话编号。');
    task.sessions[profile.id]=sessionId;runner.active.sessionId=sessionId;runner.store.save(task);
    const mode=task.execution?.mode||task.mode;
    runner.event(task.id,'notice',{text:`已连接 Grok / ${profile.name}；${mode==='read-only'?'只读研究':mode==='full-access'?'完全访问':'项目内编辑'}模式。`});
    runner.active.started=true;
    if(runner.active.cancelRequested){runner.state(task,'paused');return;}
    const initial=rpc.call('session/prompt',{sessionId,prompt:[{type:'text',text:instructions},...require('./attachments.cjs').grokInput(text,runner.active.images,capabilities.agentCapabilities?.promptCapabilities?.image===true)]},1800000);
    runner.active.sendGuidance=(text,images)=>{
      if(rpc.closed||runner.active.cancelRequested)return Promise.resolve(false);
      const request=rpc.call('session/prompt',{sessionId,prompt:require('./attachments.cjs').grokInput(text,images,capabilities.agentCapabilities?.promptCapabilities?.image===true)},1800000).then(result=>{if(result.stopReason!=='end_turn')throw Error('Grok 未完成补充消息，请核对记录。');terminal=result;return true;});
      guidance.add(request);request.then(()=>guidance.delete(request),error=>{guidanceError=error;guidance.delete(request);});return request;
    };
    runner.emit('steer-ready',{taskId:task.id});
    terminal=await initial;
    while(guidance.size)await Promise.all([...guidance]);
    if(guidanceError)throw guidanceError;
    runner.active.sendGuidance=null;
  } finally {
    await rpc.end();
    if(answer)runner.event(task.id,'assistant',{text:answer,profile:profile.id});
  }
  if(terminal?.stopReason==='end_turn')runner.state(task,'idle');
  else if(terminal?.stopReason==='cancelled'||runner.active.cancelRequested)runner.state(task,'paused');
  else {runner.event(task.id,'notice',{text:`Grok 本轮结束：${terminal?.stopReason||'未知原因'}；未标记任务完成。`});runner.state(task,'failed');}
}
module.exports={runGrok,grokArgs,permissionOutcome};
