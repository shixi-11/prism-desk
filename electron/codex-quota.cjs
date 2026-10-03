const PRO_PLANS=new Set(['pro','prolite','promax']);
function codexQuota(result,accountPlanType=null,now=Date.now()){
 const bucket=result.rateLimitsByLimitId?.codex||(result.rateLimits?.limitId==='codex'?result.rateLimits:null);
 const legacy=result.rateLimits?.limitId==='codex'?result.rateLimits:null;
 const planType=bucket?.planType||accountPlanType||null;
 const ordinaryUsageAllowed=typeof result.ordinaryUsageAllowed==='boolean'?result.ordinaryUsageAllowed:null;
 const banner=result.rateLimitUpsell;
 const rateLimitUpsell=banner&&typeof banner==='object'?{banner_type:typeof banner.banner_type==='string'?banner.banner_type:null,reset_at:Number.isFinite(banner.reset_at)?banner.reset_at:null}:null;
 const rateLimitReachedType=bucket?.rateLimitReachedType||legacy?.rateLimitReachedType||result.rateLimitReachedType||null;
 const windows=[bucket?.primary,bucket?.secondary].filter(w=>w&&Number.isFinite(w.usedPercent)&&(!Number.isFinite(w.resetsAt)||w.resetsAt*1000>now)&&!(PRO_PLANS.has(planType)&&w.windowDurationMins===300)).map(w=>({remaining:Math.max(0,Math.min(100,100-w.usedPercent)),minutes:w.windowDurationMins,resetsAt:w.resetsAt}));
 const reason=rateLimitReachedType||rateLimitUpsell?.banner_type;
 const blockedReasons=new Set(['workspace_member_credits_depleted','workspace_owner_credits_depleted','usage_limit_reached','five_hour_limit_reached','weekly_limit_reached']);
 return {provider:'Codex',remaining:windows.length?Math.min(...windows.map(w=>w.remaining)):null,windows,credits:bucket?.credits||null,planType,ordinaryUsageAllowed,rateLimitReachedType,rateLimitUpsell,exhausted:ordinaryUsageAllowed===true?false:ordinaryUsageAllowed===false?true:blockedReasons.has(reason)?true:null};
}
module.exports={codexQuota};
