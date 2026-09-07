import React,{useEffect,useState} from 'react';
import {Plus,RefreshCw,ExternalLink,FolderOpen,Check,Settings2,Copy} from 'lucide-react';
import {AccountQuota} from './TaskControls.jsx';
import {tr} from './i18n.js';
const api=window.prism;
const errorText=error=>(error.message||String(error)).replace(/^Error invoking remote method '[^']+': Error: /,'');
const active=state=>['starting','waiting','verifying'].includes(state?.phase);
function LoginStatus({state}){
 if(!state)return null;
 const labels={starting:'正在获取登录链接…',waiting:'登录链接已准备好',verifying:'正在检查账号…',connected:'账号已连接',cancelled:'已取消登录',error:'登录未完成'};
 return <div className={`connection-status ${state.phase}`} role="status">{state.phase==='connected'?<Check size={17}/>:active(state)?<RefreshCw size={17} className="spinning"/>:null}<span>{tr(state.phase==='waiting'&&state.codeSubmitted?'授权码已提交，正在等待登录结果…':labels[state.phase])}{state.message&&<small>{tr(state.message)}</small>}</span></div>;
}
export default function AccountManager({profiles,quotas,checking,bulk,onRefresh,onRefreshAll,loginStates,busy}){
 const [data,setData]=useState(null),[editor,setEditor]=useState(null),[step,setStep]=useState('form'),[working,setWorking]=useState(false),[error,setError]=useState('');
 const [copied,setCopied]=useState(false);
 const [authorizationCode,setAuthorizationCode]=useState('');
 const reload=async()=>{const result=await api.accounts();setData(result);return result;};
 useEffect(()=>{reload().catch(e=>setError(errorText(e)));},[profiles]);
 const locked=busy||working||!!bulk||checking.length>0||Object.values(loginStates).some(active);
 const current=editor?.id?data?.profiles.find(p=>p.id===editor.id)||editor:null;
 const state=current?loginStates[current.id]:null;
 useEffect(()=>setCopied(false),[current?.id,state?.phase]);
 useEffect(()=>setAuthorizationCode(''),[current?.id,state?.phase,state?.codeSubmitted]);
 const begin=profile=>{setError('');setStep('form');setEditor(profile?{...profile}:{provider:'Codex',name:`Codex ${tr('个人')}-${(data?.profiles.filter(p=>p.provider==='Codex').length||0)+1}`,executable:'',home:''});};
 const action=async fn=>{setError('');setWorking(true);try{await fn();await reload();}catch(e){setError(errorText(e));}finally{setWorking(false);}};
 const login=id=>action(()=>api.startAccountLogin(id));
 const picker=async kind=>{try{const value=await api.pickAccountFile(kind);if(value)setEditor(old=>({...old,[kind==='directory'?'home':'executable']:value}));}catch(e){setError(errorText(e));}};
 const provider=data?.providers.find(p=>p.provider===editor?.provider);
 const install=()=>action(()=>api.accountInstall(editor.provider));
 const save=e=>{e.preventDefault();action(async()=>{const saved=await api.saveAccount(editor);setEditor(saved);setStep('connect');});};
 return <div className="account-manager">
  {error&&<p className="connection-error" role="alert">{tr(error)}</p>}
  {editor?<section className="account-setup">
   <div className="connection-heading"><div><small>{tr('账号接入')}</small><h3>{step==='form'?tr(editor.id?'账号设置':'选择平台，接入账号'):editor.name}</h3></div><button onClick={()=>{setEditor(null);setError('');}}>{tr('返回账号列表')}</button></div>
   <div className="connection-steps"><span className={step==='form'?'current':''}>1 · {tr('账号设置')}</span><span className={step==='connect'?'current':''}>2 · {tr('登录与检查')}</span></div>
   {step==='form'?<form onSubmit={save}>
    <div className="provider-choices" role="group" aria-label={tr('平台')}>{data?.providers.map(p=><button type="button" key={p.provider} aria-pressed={editor.provider===p.provider} disabled={!!editor.id||locked} onClick={()=>setEditor({...editor,provider:p.provider,executable:'',name:`${p.provider} ${tr('个人')}-${data.profiles.filter(a=>a.provider===p.provider).length+1}`})}><strong>{p.provider}</strong><small>{tr(p.installed?'CLI 已就绪':'需要安装 CLI')}</small></button>)}</div>
    <label>{tr('账号名称')}<input dir="auto" autoFocus required maxLength={60} value={editor.name} onChange={e=>setEditor({...editor,name:e.target.value})} disabled={locked}/></label>
    <p className="muted">{tr('使用官方订阅登录，每个账号保存在独立目录。')}</p>
    {!provider?.installed&&!editor.executable&&<div className="connection-install"><span>{tr('本机尚未找到此平台的 CLI。')}</span><button type="button" onClick={install}><ExternalLink size={15}/>{tr('官方安装说明')}</button></div>}
    <details className="connection-advanced"><summary>{tr('高级设置')}</summary><label>{tr('CLI 程序路径')}<div className="connection-path"><input dir="ltr" placeholder={provider?.executable||''} value={editor.executable} onChange={e=>setEditor({...editor,executable:e.target.value})} disabled={locked}/><button type="button" aria-label={tr('选择 CLI 程序')} onClick={()=>picker('executable')} disabled={locked}><FolderOpen size={17}/></button></div></label><label>{tr('独立账号目录')}<div className="connection-path"><input dir="ltr" placeholder={tr('留空自动创建，也可选择已有独立目录')} value={editor.home} onChange={e=>setEditor({...editor,home:e.target.value})} readOnly={!!editor.id} disabled={locked}/>{!editor.id&&<button type="button" aria-label={tr('选择账号目录')} onClick={()=>picker('directory')} disabled={locked}><FolderOpen size={17}/></button>}</div></label><p className="muted">{tr(editor.id?'已有账号的平台与登录目录保持固定；接入其他账号请新建。':'已有目录直接使用原登录；不会复制其他账号的凭据。')}</p></details>
    <div className="dialog-actions"><button type="submit" className="primary" disabled={locked||!editor.name.trim()}>{working?tr('保存中…'):tr('保存并继续')}</button></div>
   </form>:<div className="connection-connect">
    <p>{tr(provider?.manualCode?'复制登录链接到浏览器，授权后将网页给出的授权码粘贴到下方。':'获取登录链接，复制到浏览器完成授权后返回这里。')}</p>
    <LoginStatus state={state}/>
    {!current?.cliAvailable&&<div className="connection-install"><span>{tr('本机尚未找到此平台的 CLI。')}</span><button onClick={install}><ExternalLink size={15}/>{tr('官方安装说明')}</button><button onClick={()=>action(reload)}>{tr('重新检测')}</button></div>}
    <div className="connection-buttons">
      {state?.hasUrl?<button className="primary" disabled={working} onClick={()=>action(async()=>{await api.copyAccountLogin(current.id);setCopied(true);})}>{copied?<Check size={17}/>:<Copy size={17}/>}<span>{tr(copied?'登录链接已复制':'复制登录链接')}</span></button>:<button className="primary" disabled={locked||!current?.cliAvailable} onClick={()=>login(current.id)}><ExternalLink size={17}/>{tr('获取登录链接')}</button>}
      <button disabled={locked||!current?.cliAvailable} onClick={()=>action(()=>api.verifyAccount(current.id))}><RefreshCw size={17}/>{tr('检查已有登录')}</button>
      {active(state)&&state.phase!=='verifying'&&<button onClick={()=>action(()=>api.cancelAccountLogin(current.id))}>{tr('取消登录')}</button>}
    </div>
    {state?.hasUrl&&<p className="muted" role={copied?'status':undefined}>{tr('粘贴到已打开的浏览器地址栏，完成授权后返回这里。')}</p>}
    {state?.hasUrl&&provider?.manualCode&&<form className="authorization-code-form" autoComplete="off" onSubmit={e=>{e.preventDefault();const code=authorizationCode;setAuthorizationCode('');action(()=>api.submitAccountLoginCode(current.id,code));}}><label htmlFor="authorization-code">{tr('授权码')}</label><p className="muted">{tr('浏览器显示授权码时，将完整内容粘贴到这里。')}</p><div className="authorization-code-row"><input id="authorization-code" name="authorization-code" type="password" dir="ltr" autoComplete="off" spellCheck={false} required maxLength={4096} placeholder={tr('粘贴浏览器给出的授权码')} value={authorizationCode} onChange={e=>setAuthorizationCode(e.target.value)} disabled={working||state.codeSubmitted}/><button type="submit" className="primary" disabled={working||state.codeSubmitted||!authorizationCode.trim()}>{tr(state.codeSubmitted?'已提交':'提交授权码')}</button></div></form>}
    {current?.connectionState==='connected'&&!active(state)&&<p className="connection-ready"><Check size={17}/>{tr(current.disabled?'登录已确认，账号当前已停用。':'此账号已加入执行账号列表。')}{current.email&&<span>{current.email}</span>}</p>}
    <p className="muted">{tr('凭据由官方 CLI 保存在本机，棱镜不接收你的密码。')}</p>
    <div className="dialog-actions"><button disabled={active(state)} onClick={()=>{setEditor({...current});setStep('form');}}>{tr('修改设置')}</button><button className="primary" onClick={()=>setEditor(null)}>{tr('返回账号列表')}</button></div>
   </div>}
  </section>:<>
   <p className="muted">{tr('在这里接入和管理订阅账号，登录成功后即可选择执行。')}</p>
   <div className="account-query-toolbar"><button className="primary" disabled={!data||locked} onClick={()=>begin(null)}><Plus size={17}/>{tr('接入账号')}</button><button disabled={!!bulk||checking.length>0||locked} onClick={onRefreshAll}><RefreshCw size={16} className={bulk?'spinning':''}/>{tr('一键查询全部')}</button><span role="status">{bulk?`${tr('查询中…')} ${bulk.done} / ${bulk.total}`:''}</span></div>
   <div className="connection-list">{(data?.profiles||profiles).map(p=><article className={`connection-card ${p.disabled?'disabled-account':''}`} key={p.id}><div className="connection-identity"><strong>{p.provider}</strong><span>{tr(p.name)}</span>{p.disabled&&<small>{tr((p.connectionState==='pending'||p.loginRequired)?'待登录':'已停用')}</small>}{(quotas[p.id]?.email||p.email)&&<small dir="ltr" className="account-email">{quotas[p.id]?.email||p.email}</small>}</div><AccountQuota profile={p} quota={quotas[p.id]}/><LoginStatus state={loginStates[p.id]}/><div className="connection-card-actions"><button disabled={locked||checking.includes(p.id)} onClick={()=>onRefresh(p.id)}>{tr(checking.includes(p.id)?'查询中…':'查询')}</button><button disabled={locked&&!active(loginStates[p.id])} onClick={()=>{setEditor({...p});setStep('connect');setError('');}}>{tr(active(loginStates[p.id])?'继续登录':'登录账号')}</button><button disabled={locked} aria-label={`${tr('账号设置')} ${p.name}`} onClick={()=>begin(p)}><Settings2 size={15}/>{tr('设置')}</button><button disabled={locked||p.connectionState==='pending'||p.loginRequired} onClick={()=>action(()=>api.enableAccount(p.id,!!p.disabled))}>{tr(p.disabled?'启用':'停用')}</button>{active(loginStates[p.id])&&<button onClick={()=>action(()=>api.cancelAccountLogin(p.id))}>{tr('取消登录')}</button>}</div></article>)}</div>
   <p className="muted">{tr('首批支持 Codex、Claude、Grok；后续平台通过独立适配器接入。')}</p>
  </>}
 </div>;
}
