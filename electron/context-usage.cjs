const number=v=>Number.isFinite(v)&&v>=0?v:null;
function codexContext(params){
 const usage=params?.tokenUsage;if(!usage)return null;
 const last=usage.last||{};return {used:number(last.totalTokens),limit:number(usage.modelContextWindow),input:number(last.inputTokens),output:number(last.outputTokens),cached:number(last.cachedInputTokens),reasoning:number(last.reasoningOutputTokens),source:'codex-token-usage',checkedAt:new Date().toISOString()};
}
function claudeContext(message,previous={}){
 if(message?.parent_tool_use_id)return null;
 const value=message?.context_usage;
 if(value)return {used:number(value.total_tokens),limit:number(value.raw_max_tokens),model:value.model,categories:(Array.isArray(value.categories)?value.categories:[]).filter(c=>c&&typeof c.name==='string'&&number(c.tokens)!==null).map(({name,tokens,kind})=>({name:name.slice(0,120),tokens,kind})),source:'claude-context-report',checkedAt:new Date().toISOString()};
 const usage=message?.message?.usage||message?.event?.message?.usage;
 if(usage){const inputs=['input_tokens','cache_read_input_tokens','cache_creation_input_tokens'];if(!inputs.some(k=>number(usage[k])!==null))return null;return {...previous,used:inputs.reduce((n,k)=>n+(number(usage[k])||0),0)+(number(usage.output_tokens)||0),categories:[],source:'claude-message-usage',checkedAt:new Date().toISOString()};}
 if(message?.type==='result'&&message.modelUsage){const values=Object.values(message.modelUsage);const model=message.model||previous.model;const match=model&&message.modelUsage[model]||values.length===1&&values[0];if(match&&number(match.contextWindow)>0)return {...previous,limit:match.contextWindow,checkedAt:new Date().toISOString()};}
 if(message?.type==='system'&&message.subtype==='compact_boundary')return {...previous,used:number(message.compact_metadata?.post_tokens),categories:[],compactedAt:new Date().toISOString(),source:'claude-compact-boundary',checkedAt:new Date().toISOString()};
 return null;
}
module.exports={codexContext,claudeContext};
