import React,{useEffect,useState} from 'react';
import {Zap} from 'lucide-react';
import {tr} from './i18n.js';
export default function FastControl({task,profile,draftSettings,onSave}){
 const [catalog,setCatalog]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let live=true;setCatalog(null);setError('');if(profile?.provider==='Codex')window.prism.models(profile.id).then(value=>{if(live)setCatalog(value);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[profile?.id]);
 if(profile?.provider!=='Codex')return null;
 const saved=task?.modelSettings?.[profile.id]||draftSettings?.[profile.id]||{},modelId=saved.model||profile.model,model=catalog?.models.find(m=>m.id===modelId),enabled=(saved.serviceTier||'default')!=='default';
 return <span className="composer-fast"><button type="button" className={enabled?'enabled':''} role="switch" aria-checked={enabled} aria-label={tr('快速模式')} disabled={busy||profile.disabled||!model||(!enabled&&!model.fastServiceTier)} title={error||tr(model?.fastServiceTier?'更快响应，会增加额度消耗':'当前模型未提供快速模式')} onClick={async()=>{setBusy(true);setError('');try{await onSave({model:modelId,effort:saved.effort||'xhigh',serviceTier:enabled?'default':model.fastServiceTier},profile.id);}catch(e){setError(e.message);}finally{setBusy(false);}}}><Zap size={15}/><span>Fast</span><i aria-hidden="true"/></button>{error&&<small role="alert">{error}</small>}</span>;
}
