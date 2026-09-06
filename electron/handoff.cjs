// A compact index of recorded evidence, never a generated completion claim.
function snapshot(task, events) {
  const lastUser = events.findLast(e => e.type === 'user');
  const recent = events.slice(lastUser ? events.indexOf(lastUser) : 0);
  const tools = recent.filter(e => e.type === 'tool');
  const plan = recent.findLast(e=>e.type==='plan')?.data?.plan;
  const files = [...new Set(tools.flatMap(e=>e.data?.type==='fileChange' && Array.isArray(e.data.changes) ? e.data.changes.map(c=>c.path).filter(p=>typeof p==='string') : []))];
  return {
    at: new Date().toISOString(), state: task.state,
    request: lastUser?.text || '', checkpoint: task.checkpoint || '',
    report: recent.findLast(e => e.type === 'assistant')?.text || '',
    evidence: tools.slice(-8).map(e => ({id:e.id, text:(e.text || '').slice(0,500), status:e.data?.status ?? e.data?.exitCode ?? null})),
    toolCount: tools.length,
    files, plan: Array.isArray(plan) ? plan : [],
    next: '先核对工作记录与项目文件，再继续未完成部分。',
  };
}
module.exports = {snapshot};
