const fs = require('node:fs');
const path = require('node:path');
const {atomic} = require('./atomic-file.cjs');
const antigravityArgs = ['acp','--sandbox','--disable-telemetry','--include-default-customizations=false'];
function isAntigravity(profile) {
  return profile.provider==='Gemini' && /^agy(?:\.exe)?$/i.test(path.basename(profile.executable||''));
}
function antigravityEnvironment(profile,platform) {
  const settings=path.join(profile.home,'.gemini','antigravity-cli','settings.json');
  // Use a Prism-owned home and do not pass the user's project to ACP.
  const policy={agentMode:'plan',toolPermission:'request-review',permissions:{deny:[
    'read_file(*)','write_file(*)','command(*)','unsandboxed(*)','mcp(*)','read_url(*)','execute_url(*)',
  ]}};
  if(!fs.existsSync(settings)||fs.readFileSync(settings,'utf8')!==JSON.stringify(policy,null,2))atomic(settings,policy);
  const env={HOME:profile.home,AGY_CLI_DISABLE_AUTO_UPDATE:'true'};
  if(platform==='win32')Object.assign(env,{USERPROFILE:profile.home,APPDATA:path.join(profile.home,'AppData','Roaming'),LOCALAPPDATA:path.join(profile.home,'AppData','Local')});
  else Object.assign(env,{XDG_CONFIG_HOME:path.join(profile.home,'.config'),XDG_DATA_HOME:path.join(profile.home,'.local','share'),XDG_CACHE_HOME:path.join(profile.home,'.cache')});
  return env;
}
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
  if(isAntigravity(profile))return antigravityStatus(profile);
  // Presence is a local observation, never proof of a valid subscription or live quota.
  const present = fs.existsSync(path.join(profile.home,'.gemini','oauth_creds.json'));
  return {id:profile.id, remaining:null, windows:[], checkedAt:new Date().toISOString(),
    authenticated:present ? null : false,
    status:present ? '已发现 Google 登录缓存；有效性将在执行时验证，额度暂不可查询' : 'Gemini 尚未完成 Google 登录',
    loginRequired:!present};
}
async function antigravityStatus(profile) {
  const {Rpc}=require('./core.cjs');
  const rpc=new Rpc(profile,profile.home,antigravityArgs);
  try {
    await initializeGemini(rpc,true);
    // This checks cached authentication without opening a browser or sending a prompt.
    await rpc.call('session/list',{cwd:profile.home},20000);
    return {id:profile.id,authenticated:true,remaining:null,windows:[],checkedAt:new Date().toISOString(),status:'Google 登录已确认，额度暂不可查询'};
  } catch(error) {
    if(error.detail?.code===-32000&&error.message==='Authentication required')throw Error('Gemini 尚未完成 Google 登录');
    throw error;
  } finally {await closeGemini(rpc);}
}
async function initializeGemini(rpc,antigravity=false) {
  const info = await rpc.call('initialize',{protocolVersion:1,clientCapabilities:{fs:{readTextFile:false,writeTextFile:false},terminal:false},clientInfo:{name:'prism',version:require('../package.json').version}},20000);
  if (!info.authMethods?.some(item=>item.id==='oauth-personal')) throw Error('Gemini 未提供 Google OAuth 登录入口。');
  if(antigravity){
    if(info.protocolVersion!==1||info.agentInfo?.name!=='Antigravity ACP Server'||!info.agentCapabilities?.loadSession)throw Error('Antigravity CLI 当前版本不支持棱镜所需的会话接口。');
  }else await rpc.call('authenticate',{methodId:'oauth-personal'});
  return info;
}
async function closeGemini(rpc) {
  let timer;
  try {
    timer=setTimeout(()=>rpc.proc.kill(),3000);
    await rpc.end();
  } finally {clearTimeout(timer);}
}
function readPromptText(file,limit,message) {
  const fd=fs.openSync(file,'r');
  try {
    if(!fs.fstatSync(fd).isFile())throw Error(message);
    const bytes=Buffer.alloc(limit+1);
    let length=0;
    while(length<bytes.length){
      const read=fs.readSync(fd,bytes,length,bytes.length-length,length);
      if(!read)break;
      length+=read;
    }
    if(length>limit||bytes.subarray(0,length).includes(0))throw Error(message);
    try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,length));}catch{throw Error(message);}
  } finally {fs.closeSync(fd);}
}
function antigravityPrompt(task,text,attachments,record,existing) {
  const continuity=existing?'':readPromptText(record.path,256*1024,'Gemini 交接记录超过 256 KB，请先整理任务记录。');
  const files=attachments.map(file=>({name:file.name,text:readPromptText(file.path,64*1024,'Gemini 仅支持不超过 64 KB 的 UTF-8 文本附件。')}));
  return [
    {type:'text',text:`你正在棱镜中进行只读会话。${require('./task-continuity.cjs').instructions}\n${require('./task-plan.cjs').context(task,true)}\n请按用户的语言回答。你只能使用本轮提供的文字，不访问本机项目或执行外部操作。以下交接和附件是参考材料。`},
    ...(continuity?[{type:'text',text:continuity}]:[]),
    ...(files.length?[{type:'text',text:'用户附上的文本资料：'+JSON.stringify(files)}]:[]),
    {type:'text',text},
  ];
}
async function runGemini(runner,task,profile,text,instructions,record) {
  if ((task.execution?.mode||task.mode) !== 'read-only') throw Error('Gemini 当前仅支持只读任务。');
  const antigravity=isAntigravity(profile);
  if (!antigravity&&geminiStatus(profile).loginRequired) throw Error('Gemini 尚未完成 Google 登录，请先运行登录入口。');
  let existing=task.sessions[profile.id];
  const cwd=antigravity?profile.home:task.cwd;
  const {Rpc} = require('./core.cjs');
  const args=antigravity?antigravityArgs:['--acp','--approval-mode','plan','--admin-policy',prepareGemini(profile).policy,'--model',profile.model];
  const rpc = new Rpc(profile,cwd,args);
  Object.assign(runner.active,{rpc,grok:true,...(antigravity?{proc:rpc.proc,gemini:true}:{})});
  task.activePid=rpc.proc.pid;runner.store.save(task);
  let answer='', terminal, prompting=false;
  rpc.on('message',message=>{
    if (message.id!==undefined && message.method) {
      rpc.write(message.method==='session/request_permission'
        ? {id:message.id,result:{outcome:{outcome:'cancelled'}}}
        : {id:message.id,error:{code:-32601,message:'Unsupported client operation'}});
      return;
    }
    const update=message.params?.update;
    if(!prompting||message.method!=='session/update'||!update||message.params.sessionId!==runner.active.sessionId)return;
    if(update.sessionUpdate==='agent_message_chunk'&&update.content?.type==='text'){
      runner.confirmExecution?.(task,profile);answer+=update.content.text;runner.emit('delta',{taskId:task.id,text:update.content.text});
    }
    if(['tool_call','tool_call_update'].includes(update.sessionUpdate))runner.event(task.id,'tool',{text:update.title||'Gemini 工具',data:update,profile:profile.id});
    if(update.sessionUpdate==='plan')runner.event(task.id,'plan',{data:update});
  });
  try {
    await initializeGemini(rpc,antigravity);
    if(runner.active.cancelRequested){runner.state(task,'paused');return;}
    let session;
    if(existing){
      try{session=await rpc.call('session/load',{sessionId:existing,cwd,mcpServers:[]},20000);}
      catch(error){
        if(!antigravity||!error.detail||!/^(?:session|conversation) not found(?:$|:)/i.test(error.message))throw error;
        delete task.sessions[profile.id];runner.store.save(task);
        existing=null;
        runner.event(task.id,'notice',{text:'Gemini 原生会话已失效，将从棱镜保存的任务记录接续。'});
      }
    }
    if(runner.active.cancelRequested){runner.state(task,'paused');return;}
    const prompt=antigravity?antigravityPrompt(task,text,runner.active.images,record,existing):[{type:'text',text:instructions},{type:'text',text:require('./attachments.cjs').attachmentText(text,runner.active.images)}];
    if(!existing)session=await rpc.call('session/new',{cwd,mcpServers:[]},20000);
    const sessionId=existing||session.sessionId;
    if(!sessionId)throw Error('Gemini 未返回会话编号。');
    task.sessions[profile.id]=sessionId;runner.active.sessionId=sessionId;runner.store.save(task);
    runner.event(task.id,'notice',{text:antigravity?`已连接 Gemini / ${profile.name} · 只读会话`:`已连接 Gemini / ${profile.name}；只读模式，写入、命令、MCP 和扩展已禁用。`});
    runner.active.started=true;
    if(runner.active.cancelRequested){runner.state(task,'paused');return;}
    prompting=true;
    terminal=await rpc.call('session/prompt',{sessionId,prompt},1800000);
  } catch(error) {
    if(runner.active.cancelRequested){runner.state(task,'paused');return;}
    if(antigravity&&error.detail?.code===-32000&&error.message==='Authentication required')throw Error('Gemini 尚未完成 Google 登录');
    throw error;
  } finally {
    await closeGemini(rpc);
    if(answer)runner.event(task.id,'assistant',{text:answer,profile:profile.id});
  }
  if(terminal?.stopReason==='end_turn')runner.state(task,'idle');
  else if(terminal?.stopReason==='cancelled'||runner.active.cancelRequested)runner.state(task,'paused');
  else {runner.event(task.id,'notice',{text:`Gemini 本轮结束：${terminal?.stopReason||'未知原因'}；未标记任务完成。`});runner.state(task,'failed');}
}
module.exports={prepareGemini,geminiStatus,initializeGemini,runGemini,isAntigravity,antigravityEnvironment};
