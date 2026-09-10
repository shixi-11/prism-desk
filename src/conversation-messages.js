// Result markers classify the final Claude answer without rewriting history.
export function conversationMessages(events){
 const finals=new Set(events.filter(e=>e.type==='assistant-final').map(e=>e.messageId));
 const legacyProgress=new Set();let candidate=null;
 for(const e of events){
  if(e.type==='assistant')candidate=e;
  else if(['user','handoff','question'].includes(e.type)||e.executionStatus)candidate=null;
  else if(e.type==='tool'&&candidate&&!candidate.phase)legacyProgress.add(candidate.id);
 }
 const output=[];let group=null;
 for(const e of events){
  if(e.type==='assistant-final')continue;
  if(e.type==='assistant'&&(e.phase==='commentary'||legacyProgress.has(e.id))&&!finals.has(e.id)){
   if(!group||group.profile!==e.profile){group={...e,type:'progress',parts:[]};output.push(group);}
   group.parts.push(e);continue;
  }
  if(['user','assistant','handoff','notice','question'].includes(e.type)){group=null;output.push(e);}
 }
 return output;
}
