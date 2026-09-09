export function conversationStatus({task, hasMessages, thinking, activity, streaming, awaitingApproval}) {
  if (!task) return null;
  if (task.state === 'stopping') return {label:'正在停止…', moving:true, kind:'stopping'};
  if (task.state === 'running') {
    if (awaitingApproval || task.activeQuestionIds?.length) return {label:'等待确认…',moving:false,kind:'waiting'};
    if (activity) return {label:'正在调用工具…',moving:true,kind:'tool'};
    if (streaming) return {label:'正在回复…',moving:true,kind:'reply'};
    if (thinking) return {label:'正在思考…',moving:true,kind:'thinking'};
    return {label:'正在处理…',moving:true,kind:'working'};
  }
  if (task.state === 'paused') return {label:'已停止',moving:false,kind:'stopped'};
  if (task.state === 'failed') return {label:'执行未完成',moving:false,kind:'failed'};
  if (task.state === 'unknown') return {label:'需要核对进度',moving:false,kind:'unknown'};
  return hasMessages ? {label:'本轮已结束',moving:false,kind:'ended'} : null;
}
