const {Rpc,profileFor,spawnCLI}=require('./core.cjs');
const cache=new Map(),pending=new Map();
function fastServiceTier(model){return model.serviceTiers?.find(t=>t.id==='priority'||t.id==='fast')?.id||(!model.serviceTiers?.length&&model.additionalSpeedTiers?.includes('fast')?'fast':null);}
async function modelOptions(id,cwd){
 const hit=cache.get(id);if(hit&&Date.now()-hit.at<300000)return hit.value;
 if(pending.has(id))return pending.get(id);
 const request=readModelOptions(id,cwd);pending.set(id,request);
 try{const value=await request;if(pending.get(id)===request)cache.set(id,{at:Date.now(),value});return value;}finally{if(pending.get(id)===request)pending.delete(id);}
}
async function readModelOptions(id,cwd){
 const p=profileFor(id);let models;
 if(p.provider==='Codex'){const rpc=new Rpc(p,cwd);try{await rpc.init();const data=await rpc.call('model/list',{includeHidden:false});models=data.data.filter(m=>!m.hidden).map(m=>({id:m.model,name:m.displayName,efforts:m.supportedReasoningEfforts.map(e=>e.reasoningEffort),defaultEffort:m.defaultReasoningEffort,fastServiceTier:fastServiceTier(m)}));}finally{await rpc.end();}}
 else if(p.provider==='Claude')models=['opus','sonnet'].map(id=>({id,name:id==='opus'?'Claude Opus':'Claude Sonnet',efforts:['low','medium','high','xhigh','max'],defaultEffort:'high'}));
 else if(p.provider==='Gemini')models=[{id:'auto',name:'Gemini Auto',efforts:['auto'],defaultEffort:'auto'}];
 else {const output=await new Promise((resolve,reject)=>{const proc=spawnCLI(p,['models'],cwd);let text='';const timer=setTimeout(()=>{proc.kill();reject(Error('模型列表查询超时'));},15000);proc.stdout.on('data',d=>{text+=d;if(text.length>64000)proc.kill();});proc.stderr.on('data',()=>{});proc.on('error',reject);proc.on('close',code=>{clearTimeout(timer);code===0?resolve(text):reject(Error('无法读取 Grok 模型列表'));});proc.stdin.end();});models=[...output.matchAll(/^\s*[-*]\s+(grok-[\w.-]+)/gm)].map(m=>({id:m[1],name:m[1],efforts:['high'],defaultEffort:'high'}));}
 if(!models.length)throw Error('CLI 未返回可选择的模型');
 const value={models,note:p.provider==='Gemini'?'由 Gemini CLI 自动选模；暂不提供独立思考等级':p.provider==='Claude'?'官方模型别名；实际可用性由订阅与组织权限决定':p.provider==='Grok'?'来自当前 CLI；思考等级暂提供已验证的 high':'来自当前 CLI 模型目录；实际调用仍受账号权限限制'};return value;
}
function selection(task,profile){const saved=task.modelSettings?.[profile.id];return {...profile,model:saved?.model||(profile.provider==='Codex'?'gpt-6-astra':profile.model),effort:saved?.effort||(profile.provider==='Codex'?'low':profile.provider==='Gemini'?'auto':'high'),...(profile.provider==='Codex'?{serviceTier:saved?.serviceTier||'default'}:{})};}
async function validateSelection(profileId,cwd,input){
 if(!input||typeof input.model!=='string'||typeof input.effort!=='string')throw Error('模型设置无效');
 const profile=profileFor(profileId),list=await modelOptions(profileId,cwd),model=list.models.find(m=>m.id===input.model);
 if(!model||!model.efforts.includes(input.effort))throw Error('当前模型不支持所选思考等级');
 const serviceTier=input.serviceTier||'default';
 if(serviceTier!=='default'&&(profile.provider!=='Codex'||serviceTier!==model.fastServiceTier))throw Error('当前模型不支持所选速度模式');
 return {model:input.model,effort:input.effort,...(profile.provider==='Codex'?{serviceTier}:{})};
}
async function saveSelection(store,task,input,beforeSave=()=>{},profileId=task.profile){
 const value=await validateSelection(profileId,task.cwd,input);
 const current=store.get(task.id);if(current.profile!==task.profile)throw Error('账号已改变，请重新选择模型');task=current;beforeSave(task);
 task.modelSettings={...task.modelSettings,[profileId]:value};task.pendingModelRefresh={...task.pendingModelRefresh,[profileId]:true};return store.save(task);
}
async function updateSelectionForRunner(store,runner,id,input,profileId){const updated=await saveSelection(store,store.get(id),input,()=>{},profileId);if(runner.active?.task.id===id){runner.active.task.modelSettings=updated.modelSettings;runner.active.task.pendingModelRefresh=updated.pendingModelRefresh;}return updated;}
module.exports={modelOptions,selection,saveSelection,validateSelection,fastServiceTier,updateSelectionForRunner,invalidate:id=>{cache.delete(id);pending.delete(id);}};
