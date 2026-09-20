import React,{useState,useEffect,useRef} from 'react';
import {tr} from './i18n.js';
export default function McpConnections({profiles,api}){
 const accounts=profiles.filter(p=>p.provider==='Codex'&&!p.disabled);
 const [id,setId]=useState(accounts[0]?.id||''),[rows,setRows]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[name,setName]=useState('chatcut'),[url,setUrl]=useState('https://api.chatcut.io/api/external-mcp/mcp');
 const [loginUrl,setLoginUrl]=useState(''),[copied,setCopied]=useState(false);
 const ticket=useRef(0);
 async function run(action,input){const key=++ticket.current;setBusy(true);setError('');setLoginUrl('');setCopied(false);try{const r=action?await api.mcpChange(id,action,input):await api.mcpList(id);if(key===ticket.current){setRows(r.servers);setBusy(r.busy);setLoginUrl(r.loginUrl||'');}}catch(e){if(key===ticket.current){setError(e.message.replace(/^Error invoking remote method '[^']+': Error: /,''));setBusy(false);setLoginUrl('');}}}
 useEffect(()=>{setRows([]);if(id)run();return()=>{ticket.current++;};},[id]);
 useEffect(()=>{if(!busy||!id)return;let live=true;const timer=setInterval(()=>api.mcpList(id).then(r=>{if(live){setLoginUrl(r.loginUrl||'');if(!r.busy){setRows(r.servers);setBusy(false);}}}).catch(()=>{}),2000);return()=>{live=false;clearInterval(timer);};},[busy,id]);
 return <section className="capability-sources">
 <p>{tr('为所选 Codex 账号配置 MCP。登录授权在浏览器中完成，下一轮任务生效。')}</p>
 <label>{tr('订阅账号')}<select value={id} disabled={busy} onChange={e=>setId(e.target.value)}>{accounts.map(p=><option key={p.id} value={p.id}>{p.name} · {p.id}</option>)}</select></label>
 {!accounts.length?<p>{tr('请先添加 Codex 账号。')}</p>:<>
 <form onSubmit={e=>{e.preventDefault();run('add',{name,url});}}>
 <label>{tr('MCP 名称')}<input required value={name} disabled={busy} onChange={e=>setName(e.target.value)} pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}"/></label>
 <label>{tr('HTTPS 服务地址')}<input required type="url" value={url} disabled={busy} onChange={e=>setUrl(e.target.value)}/></label>
 <div className="capability-actions"><button className="outline" type="button" disabled={busy} onClick={()=>{setName('chatcut');setUrl('https://api.chatcut.io/api/external-mcp/mcp');run('add',{name:'chatcut',url:'https://api.chatcut.io/api/external-mcp/mcp'});}}>{tr('添加 ChatCut')}</button><button className="primary" disabled={busy}>{tr('添加连接')}</button><button className="outline" type="button" disabled={busy} onClick={()=>run()}>{tr('刷新')}</button></div>
 </form>
 {busy&&<p role="status">{tr('正在连接；如浏览器打开，请完成授权。')} <button onClick={async()=>{await api.mcpCancel(id);setBusy(false);run();}}>{tr('取消')}</button></p>}
 {busy&&loginUrl&&<section className="mcp-login-link"><label>{tr('登录网址')}<input readOnly value={loginUrl} onFocus={e=>e.target.select()}/></label><button className="outline" onClick={async()=>{try{await api.mcpCopyLogin(id);setCopied(true);}catch(e){setError(e.message);}}}>{tr(copied?'已复制':'复制登录网址')}</button><p className="muted">{tr('复制到浏览器完成授权，保持此连接等待；取消或超时后需重新登录。')}</p></section>}
 {error&&<p className="capability-error" role="alert">{tr(error)}</p>}
 {rows.map(row=><div key={row.name}><strong>{row.name}</strong><span>{tr(!row.enabled?'已停用':row.auth==='oauth'?'已授权':row.auth==='not_logged_in'?'待登录':row.auth==='unsupported'?'无需或不支持 OAuth':'授权状态待核验')}</span><button className="outline" disabled={busy||!row.enabled} onClick={()=>run('login',{name:row.name})}>{tr('登录授权')}</button></div>)}
 {!busy&&!rows.length&&<p>{tr('尚未配置 MCP 连接。')}</p>}
 <p className="muted">{tr('配置和授权状态不等于工具调用成功。接入后可在任务中要求列出 ChatCut 项目验证。')}</p>
 </>}
 </section>;
}
