import React,{useEffect,useRef,useState} from 'react';
import {ChevronRight,RefreshCw,X} from 'lucide-react';
import {tr,locale} from './i18n.js';
import './session-usage.css';
const tokens=value=>value==null?tr('暂未返回'):new Intl.NumberFormat(locale(),{maximumFractionDigits:1}).format(value>=1000000?value/1000000:value>=1000?value/1000:value)+(value>=1000000?'M':value>=1000?'k':'');
const percent=(used,limit)=>Number.isFinite(used)&&limit>0?Math.max(0,used/limit*100):null;
function Meter({value,label,segments,limit}){const parts=segments?.filter(c=>c.kind==='used'&&c.tokens>0);return <div className="usage-meter" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value==null?undefined:Math.min(100,value)}>{parts?.length&&limit>0?parts.map((c,i)=><span key={i} title={`${c.name}: ${tokens(c.tokens)}`} style={{width:`${c.tokens/limit*100}%`,background:['#4b91e2','#d58d46','#58aa87','#9c87c6'][i%4],flexShrink:0}}/>):<span style={{width:`${Math.min(100,value??0)}%`}}/>}</div>;}
export default function SessionUsage({task,profile,quota,onRefresh,checking}){
 const [open,setOpen]=useState(false),[details,setDetails]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState(false),[now,setNow]=useState(Date.now());const root=useRef(null);
 useEffect(()=>{if(!open)return;const timer=setInterval(()=>setNow(Date.now()),30000);const close=e=>{if(!root.current?.contains(e.target))setOpen(false);};const key=e=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('pointerdown',close);document.addEventListener('keydown',key);return()=>{clearInterval(timer);document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',key);};},[open]);
 useEffect(()=>{setOpen(false);setDetails(false);setError('');},[task.id,profile?.id]);
 const raw=task.contextUsage?.[profile?.id],context=raw?.sessionId&&raw.sessionId===task.sessions?.[profile?.id]?raw:null,value=percent(context?.used,context?.limit);
 const busy=pending||['running','stopping','unknown'].includes(task.state),native=!profile?.disabled&&!task.pendingMode&&!task.pendingModelRefresh?.[profile?.id]&&!!task.sessions?.[profile?.id]&&['Codex','Claude'].includes(profile?.provider);
 const act=async action=>{setPending(true);setError('');try{await window.prism.sessionAction(task.id,action);}catch(e){setError(e.message);}finally{setPending(false);}};
 const reset=epoch=>{if(!Number.isFinite(epoch))return tr('暂未返回');const mins=Math.ceil((epoch*1000-now)/60000);return mins<=0?tr('需要刷新'):mins<1440?tr('{hours} 小时 {minutes} 分钟后恢复',{hours:Math.floor(mins/60),minutes:mins%60}):new Date(epoch*1000).toLocaleString(locale(),{weekday:'short',hour:'2-digit',minute:'2-digit'});};
 const stale=quota?.cached||quota?.checkedAt&&now-Date.parse(quota.checkedAt)>300000;
 return <div className="session-usage" ref={root}>
  <button className="usage-trigger" title={tr('上下文与额度')} aria-label={tr('上下文与额度')} aria-expanded={open} onClick={()=>{setNow(Date.now());setOpen(!open);}}><span className={`usage-ring ${value===null?'unknown':''}`} style={{'--usage':`${value??0}%`}}/>{value!==null&&<small>{Math.round(value)}%</small>}</button>
  {open&&<section className="usage-popover" aria-label={tr('上下文与额度')}>
   <header><strong>{tr('上下文窗口')}</strong><span>{tokens(context?.used)} / {tokens(context?.limit)}{value!==null?` (${Math.round(value)}%)`:''}</span><button aria-label={tr('关闭')} onClick={()=>setOpen(false)}><X size={15}/></button></header>
   <Meter value={value} label={tr('上下文窗口')} segments={context?.categories} limit={context?.limit}/>
   <div className="usage-actions"><small>{context?.limit!=null&&context?.used!=null?tr('可用空间：{tokens}',{tokens:tokens(Math.max(0,context.limit-context.used))}):tr('等待 CLI 返回上下文数据')}</small><button disabled={busy||!native} onClick={()=>act('compact')}>{tr('压缩会话')}</button></div>
   <div className="usage-actions"><small>{tr('自动压缩阈值：CLI 暂未返回')}</small><button disabled={busy||!native||profile.provider!=='Claude'} onClick={()=>act('context')}><RefreshCw size={13}/>{tr('刷新上下文')}</button></div>
   <hr/><div className="usage-plan"><strong>{tr('账号额度')} · {profile?.provider} / {tr(profile?.name||'')}</strong>{quota?.subscriptionType||quota?.planType?<small>{quota.subscriptionType||quota.planType}</small>:null}</div>
   {stale&&<small className="usage-stale">{tr('上次查询记录，请刷新')}</small>}
   {quota?.windows?.length?quota.windows.map((w,i)=>{const used=w.remaining==null?null:100-w.remaining;const label=w.kind?.includes('opus')?'Opus · '+tr('每周'):w.kind?.includes('sonnet')?'Sonnet · '+tr('每周'):w.minutes>=10080?tr('每周 · 所有模型'):w.minutes>=1440?tr('每日'):tr('会话额度');return <div key={i} className={`usage-window ${used>=80?'high':''}`}><div><span>{label}</span><small>{reset(w.resetsAt)}</small><b>{used==null?tr('暂未返回'):`${Math.round(used*10)/10}%`}</b></div><Meter value={used} label={label}/></div>;}):<p>{tr('等待 CLI 返回额度数据')}</p>}
   <div className="usage-credits"><span>{tr('使用余额')}</span><small>{quota?.credits?.unlimited?tr('不限量'):quota?.credits?.balance!=null?String(quota.credits.balance):tr('暂未返回')}</small></div>
   <button className="usage-details-toggle" aria-expanded={details} onClick={()=>setDetails(!details)}>{tr('查看详细用量')}<ChevronRight size={14}/></button>
   {details&&<div className="usage-details">{context?.categories?.filter(c=>c.tokens>0).map((c,i)=><div key={i}><span>{tr(c.name)}</span><b>{tokens(c.tokens)}</b></div>)}{['input','output','cached','reasoning'].filter(key=>context?.[key]!=null).map(key=><div key={key}><span>{tr({input:'输入 Token',output:'输出 Token',cached:'缓存 Token',reasoning:'思考 Token'}[key])}</span><b>{tokens(context[key])}</b></div>)}{context?.checkedAt&&<small>{tr('查询时间')}：{new Date(context.checkedAt).toLocaleTimeString(locale())}</small>}{quota?.extraUsage&&<div><span>{tr('额外用量')}</span><b>{quota.extraUsage.used??tr('暂未返回')} / {quota.extraUsage.limit??tr('暂未返回')}</b></div>}<small>{tr('额度条显示已使用比例；费用与余额仅显示官方返回的数据。')}</small></div>}
   <footer><button disabled={checking} onClick={onRefresh}><RefreshCw size={14}/>{tr('刷新额度')}</button></footer>{error&&<p role="alert">{error}</p>}
  </section>}
 </div>;
}
