import React,{useEffect,useState} from 'react';
import {tr} from './i18n.js';
const labels={idle:'尚未检查更新',checking:'正在检查更新',current:'已是最新版本',available:'发现新版本',preparing:'正在准备新版',ready:'新版已就绪',restarting:'正在重启更新',error:'更新未完成'};
export default function UpdateSettings({checkOnOpen=false,standalone=false}){
 const [state,setState]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;const unsub=window.prism.subscribe(({type,value})=>{if(live&&type==='app-update')setState(value);});window.prism[checkOnOpen?'checkUpdates':'updateStatus']().then(value=>{if(live)setState(value);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;unsub();};},[checkOnOpen]);
 const action=async method=>{setBusy(true);setError('');try{setState(await window.prism[method]()||state);}catch(e){setError(e.message.replace(/^Error invoking remote method '[^']+': Error: /,''));}finally{setBusy(false);}};
 const changeAutomatic=async value=>{const before=state;setBusy(true);setState({...state,automatic:value});try{setState(await window.prism.automaticUpdates(value));}catch(e){setState(before);setError(e.message);}finally{setBusy(false);}};
 return <section className={`update-settings${standalone?' standalone':''}`} aria-label={tr('软件更新')}>
 {!standalone&&<strong>{tr('软件更新')}</strong>}
 <label><span>{tr('自动检查更新')}</span><input type="checkbox" checked={state.automatic!==false} disabled={busy} onChange={e=>changeAutomatic(e.target.checked)}/></label>
 <p>{tr('发现新版时亮起蓝点，确认后下载并更新。')}</p>
 <p className="update-status" role="status">{tr(labels[state.status]||labels.idle)}{state.detail?` · ${tr(state.detail)}`:''}</p>
 <div className="update-metadata"><span className="update-version">{tr('当前版本')} · {state.version?`v${state.version}`:tr('暂未返回')}</span>{state.checkedAt&&<span>{tr('上次检查')} · {new Date(state.checkedAt).toLocaleString()}</span>}</div>
 <div className="update-actions"><button disabled={busy||['checking','preparing','restarting'].includes(state.status)} onClick={()=>action('checkUpdates')}>{tr('检查更新')}</button>{(state.status==='available'||state.status==='error'&&state.latest&&state.latest!==state.current)&&<button disabled={busy} onClick={()=>action('prepareUpdate')}>{tr('下载并准备')}</button>}{state.status==='ready'&&<button disabled={busy} onClick={()=>action('installUpdate')}>{tr('更新并重启')}</button>}</div>
 {(error||state.error)&&<p role="alert">{tr(error||state.error)}</p>}
 {state.current&&<details className="update-build-details"><summary>Git</summary><code>{state.current}</code>{state.latest&&state.latest!==state.current&&<code>GitHub · {state.latest}</code>}</details>}
 </section>;
}
