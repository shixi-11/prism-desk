import React,{useState} from 'react';
import {ArrowUp,Square,LoaderCircle} from 'lucide-react';
import {tr} from './i18n.js';
export default function ComposerSubmit({busy,stopping,hasDraft,disabled,onSend,onStop,sendLabel}) {
  const [requestingStop,setRequestingStop]=useState(false);
  const pending=stopping||requestingStop;
  const stop=async()=>{setRequestingStop(true);try{await onStop();}finally{setRequestingStop(false);}};
  const showSend=!busy||hasDraft;
  return <div className="composer-submit">
    {busy&&<button key="stop" className={showSend?'composer-stop':'composer-primary'} aria-label={tr(pending?'正在停止':'停止')} title={tr(pending?'正在停止':'停止')} disabled={pending} onClick={stop}>{pending?<LoaderCircle className="composer-stopping" size={21}/>:<Square size={18} fill="currentColor"/>}</button>}
    {showSend&&<button key="send" className="composer-primary" onClick={onSend} disabled={disabled||pending} aria-label={tr(sendLabel)} title={tr(sendLabel)}><ArrowUp size={24}/></button>}
  </div>;
}
