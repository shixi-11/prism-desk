const {Rpc}=require('./core.cjs');
async function runGrok(runner,task,profile,text,instructions) {
  const rpc=new Rpc(profile,task.cwd,['--cwd',task.cwd,'--model',profile.model,'--reasoning-effort',profile.effort||'high','--permission-mode','dontAsk','--no-subagents','--sandbox','strict','--tools','Read,Grep,WebSearch,WebFetch','--allow','Read','--allow','Grep','--allow','WebSearch','--allow','WebFetch','--deny','Edit','--deny','Bash','--deny','MCPTool','--rules',instructions,'agent','--no-leader','stdio']);
  Object.assign(runner.active,{rpc,grok:true});task.activePid=rpc.proc.pid;runner.store.save(task);
  let answer='';let sessionId;let terminal;
  rpc.on('message',m=>{
    if(m.id!==undefined && m.method) {
      rpc.write(m.method==='session/request_permission' ? {id:m.id,result:{outcome:{outcome:'cancelled'}}} : {id:m.id,error:{code:-32601,message:'Unsupported client operation'}});return;
    }
    const u=m.params?.update;if(m.method!=='session/update'||!u)return;
    if(u.sessionUpdate==='agent_message_chunk' && u.content?.type==='text') {answer+=u.content.text;runner.emit('delta',{taskId:task.id,text:u.content.text});}
    if(['tool_call','tool_call_update'].includes(u.sessionUpdate)) runner.event(task.id,'tool',{text:u.title||u.toolCallId||'Grok 工具',data:u,profile:profile.id});
    if(u.sessionUpdate==='plan')runner.event(task.id,'plan',{data:u});
  });
  try {
    await rpc.init();
    if(runner.active.cancelRequested){runner.state(task,'paused');return;}
    const existing=task.sessions[profile.id];
    const result=await rpc.call(existing?'session/load':'session/new',{...(existing?{sessionId:existing}:{}),cwd:task.cwd,mcpServers:[]});
    sessionId=existing||result.sessionId;if(!sessionId)throw Error('Grok 未返回会话编号。');
    task.sessions[profile.id]=sessionId;runner.active.sessionId=sessionId;runner.store.save(task);
    runner.event(task.id,'notice',{text:`已连接 Grok / ${profile.name}；只读研究模式。`});
    runner.active.started=true;
    if(runner.active.cancelRequested){runner.state(task,'paused');return;}
    terminal=await rpc.call('session/prompt',{sessionId,prompt:[{type:'text',text:instructions},{type:'text',text}]},1800000);
  } finally {
    await rpc.end();
    if(answer)runner.event(task.id,'assistant',{text:answer,profile:profile.id});
  }
  if(terminal?.stopReason==='end_turn')runner.state(task,'idle');
  else if(terminal?.stopReason==='cancelled'||runner.active.cancelRequested)runner.state(task,'paused');
  else {runner.event(task.id,'notice',{text:`Grok 本轮结束：${terminal?.stopReason||'未知原因'}；未标记任务完成。`});runner.state(task,'failed');}
}
module.exports={runGrok};
