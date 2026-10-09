export function sessionContext(task,profile){
 const id=profile?.id,session=task.sessions?.[id],raw=task.contextUsage?.[id];
 const context=session&&raw?.sessionId===session?raw:null;
 const supported=['Codex','Claude'].includes(profile?.provider);
 const pending=!!task.pendingMode||!!task.pendingModelRefresh?.[id];
 const native=supported&&!profile?.disabled&&!pending&&!!session;
 const message=!supported?'此账号不支持上下文查询':profile?.disabled?'此账号已暂停':pending?'设置待生效，下次发送后开始统计':!session?'当前账号尚无会话，发送消息后开始统计':context?.used==null?'尚未读取到上下文用量，请刷新':null;
 return {context,native,message};
}
