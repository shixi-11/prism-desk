// The transient indicator follows turn progress, not availability of reasoning text.
export function conversationStatus({task, activity, streaming, awaitingApproval}) {
  if (task?.state !== 'running') return null;
  if (awaitingApproval || task.activeQuestionIds?.length || activity || streaming) return null;
  return {label:'正在思考…', moving:true, kind:'thinking'};
}
