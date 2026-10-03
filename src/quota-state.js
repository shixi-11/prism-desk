export function quotaBlocked(quota,provider){return quota?.exhausted===true||(quota?.exhausted==null&&(quota?.provider||provider)!=='Codex'&&quota?.remaining===0);}
export function quotaStateLabel(quota,provider){
 if(!quota)return null;
 if((quota?.provider||provider)==='Codex'){
  if(quota?.ordinaryUsageAllowed===true)return '官方当前允许使用';
  if(quotaBlocked(quota,provider)){const reason=quota?.rateLimitReachedType||quota?.rateLimitUpsell?.banner_type;return reason==='workspace_member_credits_depleted'?'工作区成员额度受限':reason==='workspace_owner_credits_depleted'?'工作区总额度受限':'官方暂不允许使用';}
  return '可用状态尚未确认';
 }
 return quotaBlocked(quota,provider)?'已用完':null;
}
