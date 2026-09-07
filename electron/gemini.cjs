const fs = require('node:fs');
const path = require('node:path');
const POLICY = `# Highest-tier policy: deny all tools except the explicit read-only set.
[[rule]]
toolName = "*"
decision = "deny"
priority = 900
denyMessage = "PRISM Gemini currently supports read-only tasks."

[[rule]]
toolName = ["read_file", "list_directory", "glob", "grep_search", "google_web_search", "get_internal_docs", "complete_task"]
decision = "allow"
priority = 950
`;
function prepareGemini(profile) {
  const dir = path.join(profile.home, '.prism');
  fs.mkdirSync(dir, {recursive:true});
  const settings = path.join(dir, 'system-settings.json');
  const policy = path.join(dir, 'read-only.toml');
  const content = JSON.stringify({
    security:{auth:{selectedType:'oauth-personal',enforcedType:'oauth-personal'}},
    admin:{mcp:{enabled:false},extensions:{enabled:false}},
    hooksConfig:{enabled:false},
    experimental:{enableAgents:false,autoMemory:false,gemma:false,gemmaModelRouter:{autoStartServer:false}},
    general:{enableAutoUpdate:false},
  }, null, 2);
  for (const [file,text] of [[settings,content],[policy,POLICY]]) {
    if (!fs.existsSync(file) || fs.readFileSync(file,'utf8') !== text) fs.writeFileSync(file,text);
  }
  return {settings,policy};
}
function geminiStatus(profile) {
  // Presence is a local observation, never proof of a valid subscription or live quota.
  const present = fs.existsSync(path.join(profile.home,'.gemini','oauth_creds.json'));
  return {id:profile.id, remaining:null, windows:[], checkedAt:new Date().toISOString(),
    authenticated:present ? null : false,
    status:present ? '已发现 Google 登录缓存；有效性将在执行时验证，额度暂不可查询' : 'Gemini 尚未完成 Google 登录',
    loginRequired:!present};
}
async function initializeGemini(rpc) {
  const info = await rpc.call('initialize',{protocolVersion:1,clientCapabilities:{fs:{readTextFile:false,writeTextFile:false},terminal:false},clientInfo:{name:'prism',version:'0.1.0'}});
  if (!info.authMethods?.some(item=>item.id==='oauth-personal')) throw Error('Gemini 未提供 Google OAuth 登录入口。');
  await rpc.call('authenticate',{methodId:'oauth-personal'});
  return info;
}
async function closeGemini(rpc) {
  let timer;
  try {
    timer=setTimeout(()=>rpc.proc.kill(),3000);
    await rpc.end();
  } finally {clearTimeout(timer);}
}
async function runGemini(runner,task,profile,text,instructions) {
  if (task.mode !== 'read-only') throw Error('Gemini 当前仅支持只读任务。');
  if (geminiStatus(profile).loginRequired) throw Error('Gemini 尚未完成 Google 登录，请先运行登录入口。');
  const {Rpc} = require('./core.cjs');
  const {policy} = prepareGemini(profile);
  const rpc = new Rpc(profile,task.cwd,['--acp','--approval-mode','plan','--admin-policy',policy,'--model',profile.model]);
  Object.assign(runner.active,{rpc,grok:true,gemini:true});
  task.activePid=rpc.proc.pid;runner.store.save(task);
  let answer='', terminal;
  rpc.on('message',message=>{
    if (message.id!==undefined && message.method) {
      rpc.write(message.method==='session/request_permission'
        ? {id:message.id,result:{outcome:{outcome:'cancelled'}}}
        : {id:message.id,error:{code:-32601,message:'Unsupported client operation'}});
      return;
    }
    const update=message.params?.update;
    if(message.method!=='session/update'||!update)return;
    if(update.sessionUpdate==='agent_message_chunk'&&update.content?.type==='text'){
      runner.confirmExecution?.(task,profile);answer+=update.content.text;runner.emit('delta',{taskId:task.id,text:update.content.text});
    }
    if(['tool_call','tool_call_update'].includes(update.sessionUpdate))runner.event(task.id,'tool',{text:update.title||'Gemini 工具',data:update,profile:profile.id});
    if(update.sessionUpdate==='plan')runner.event(task.id,'plan',{data:update});
  });
  try {
    await initializeGemini(rpc);
    if(runner.active.cancelRequested){runner.state(task,'paused');return;}
    const existing=task.sessions[profile.id];
    const session=await rpc.call(existing?'session/load':'session/new',{...(existing?{sessionId:existing}:{}),cwd:task.cwd,mcpServers:[]});
    const sessionId=existing||session.sessionId;
    if(!sessionId)throw Error('Gemini 未返回会话编号。');
    task.sessions[profile.id]=sessionId;runner.active.sessionId=sessionId;runner.store.save(task);
    runner.event(task.id,'notice',{text:`已连接 Gemini / ${profile.name}；只读模式，写入、命令、MCP 和扩展已禁用。`});
    runner.active.started=true;
    if(runner.active.cancelRequested){runner.state(task,'paused');return;}
    terminal=await rpc.call('session/prompt',{sessionId,prompt:[{type:'text',text:instructions},{type:'text',text}]},1800000);
  } finally {
    await closeGemini(rpc);
    if(answer)runner.event(task.id,'assistant',{text:answer,profile:profile.id});
  }
  if(terminal?.stopReason==='end_turn')runner.state(task,'idle');
  else if(terminal?.stopReason==='cancelled'||runner.active.cancelRequested)runner.state(task,'paused');
  else {runner.event(task.id,'notice',{text:`Gemini 本轮结束：${terminal?.stopReason||'未知原因'}；未标记任务完成。`});runner.state(task,'failed');}
}
module.exports={prepareGemini,geminiStatus,initializeGemini,runGemini};
