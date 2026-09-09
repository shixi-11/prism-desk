import React,{useState} from 'react';
import {ArrowUp,Square,LoaderCircle} from 'lucide-react';
import {tr} from './i18n.js';
export default function ComposerSubmit({busy,stopping,hasDraft,disabled,onSend,onStop,sendLabel}) {
  const [requestingStop,setRequestingStop]=useState(false);
  const pending=stopping||requestingStop;
  return <div className="composer-submit">
    {busy&&hasDraft&&<button className="composer-steer" onClick={onSend} disabled={disabled||pending}>{tr(sendLabel)}</button>}
    {busy?<button className="composer-primary" aria-label={tr(pending?'正在停止':'停止')} title={tr(pending?'正在停止':'停止')} disabled={pending} onClick={async()=>{setRequestingStop(true);try{await onStop();}finally{setRequestingStop(false);}}}>{pending?<LoaderCircle className="composer-stopping" size={21}/>:<Square size={18} fill="currentColor"/>}</button>:<button className="composer-primary" onClick={onSend} disabled={disabled} aria-label={tr(sendLabel)} title={tr(sendLabel)}><ArrowUp size={24}/></button>}
  </div>;
}
