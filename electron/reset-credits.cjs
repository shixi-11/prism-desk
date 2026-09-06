const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Rpc,profileFor,atomic}=require('./core.cjs');
async function consumeReset(id,cwd,dataRoot,RpcType=Rpc){
 const profile=profileFor(id);if(profile.provider!=='Codex')throw Error('重置卡仅支持 Codex 订阅账号');
 const dir=path.join(dataRoot,'reset-attempts');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,id+'.json');let attempt;
 try{attempt=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw Error('重置操作记录无法读取，请先核对，不会创建重复请求');}
 const rpc=new RpcType(profile,cwd);
 try{await rpc.init();const auth=await rpc.call('account/read');if(auth.account?.type!=='chatgpt')throw Error('当前入口未确认订阅登录');
 const usage=await rpc.call('account/rateLimits/read');
 if(!usage.accountId)throw Error('无法确认重置卡所属账号');
 // Save an attempt before sending. Uncertain failures retain the same key.
 if(attempt?.pending&&attempt.accountId!==usage.accountId)throw Error('登录账号发生变化，需先核对上一笔重置结果');
 if(!attempt?.pending){attempt={key:crypto.randomUUID(),accountId:usage.accountId,pending:true};atomic(file,attempt);}
 const result=await rpc.call('account/rateLimitResetCredit/consume',{idempotencyKey:attempt.key});
 if(!['reset','alreadyRedeemed','noCredit','nothingToReset'].includes(result.outcome))throw Error('重置结果未知；再次核对时将复用同一请求');
 atomic(file,{...attempt,pending:false,outcome:result.outcome});return {outcome:result.outcome};
 }finally{await rpc.end();}
}
module.exports={consumeReset};
