import React,{useEffect,useRef,useState} from 'react';
import Markdown from 'react-markdown';
import {X,RefreshCw,FolderOpen,Maximize2,Save} from 'lucide-react';
import {localPathText} from './local-path.js';
import {tr} from './i18n.js';
export function LinkedMarkdown({children,onPreview}){
 const pathLink=(children)=>{const value=Array.isArray(children)?children.every(c=>typeof c==='string')?children.join(''):null:children;return localPathText(value);};
 return <Markdown urlTransform={url=>url} components={{a:({href,children})=><button className="file-link" onClick={()=>href&&onPreview(href)}>{children}</button>,img:({src,alt})=><button className="file-link" onClick={()=>src&&onPreview(src)}>{alt||tr('预览图片')}</button>,code:({children,className})=>{const target=pathLink(children);return target?<button className="file-link local-path-link" title={tr('打开')} onClick={()=>onPreview(target)}><code>{children}</code></button>:<code className={className}>{children}</code>;},p:({children})=>{const target=pathLink(children);return <p>{target?<button className="file-link local-path-link" onClick={()=>onPreview(target)}>{children}</button>:children}</p>;}}}>{children}</Markdown>;
}
export default function PreviewPanel({task,request,onClose}){
 const [item,setItem]=useState(null),[text,setText]=useState(''),[edit,setEdit]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[wide,setWide]=useState(false),[address,setAddress]=useState(''),[frame,setFrame]=useState(0);
 const ticket=useRef(0);const dirty=item&&text!==item.text&&item.text!==undefined;
 function canLeave(){return !dirty||window.confirm(tr('放弃未保存的修改？'));}
 async function open(target,relativeTo){if(!canLeave())return;const id=++ticket.current;setBusy(true);setError('');try{const next=await window.prism.preview(task.id,target,relativeTo);if(id===ticket.current&&next){setItem(next);setText(next.text||'');setEdit(false);setAddress(next.path||next.url);setFrame(v=>v+1);if(next.kind==='directory')await window.prism.openPreview(next.path,'open');}}catch(e){if(id===ticket.current)setError(e.message);}finally{if(id===ticket.current)setBusy(false);}}
 useEffect(()=>{open(request.target);},[request.id]);
 const nativeLabel=item?.kind==='directory'?'打开文件夹':item?.nativeAction==='reveal'?'在文件夹中显示':'用本机应用打开';
 async function openNative(action){setError('');try{await window.prism.openPreview(item.path,action);}catch(e){setError(e.message);}}
 async function save(){setBusy(true);setError('');try{const next=await window.prism.savePreview(item.path,text,item.version);setItem(next);setText(next.text);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <aside className={`preview-panel ${wide?'expanded':''}`} aria-label={tr('画布与预览')}>
 <header><strong>{tr('画布与预览')}</strong><span>{item?.name}{dirty?' *':''}</span><button title={tr('展开面板')} onClick={()=>setWide(!wide)}><Maximize2 size={17}/></button><button aria-label={tr('关闭预览')} onClick={()=>{if(canLeave())onClose();}}><X size={19}/></button></header>
 <form className="preview-address" onSubmit={e=>{e.preventDefault();open(address);}}><input aria-label={tr('文件路径或网址')} placeholder={tr('文件路径或网址')} value={address} onChange={e=>setAddress(e.target.value)}/><button disabled={busy||!address.trim()}>{tr('打开')}</button><button type="button" title={tr('选择文件')} disabled={busy} onClick={()=>open(null)}><FolderOpen size={18}/></button></form>
 <div className="preview-tools">{item?.path&&<><button onClick={()=>openNative(item.nativeAction||'open')}><FolderOpen size={15}/>{tr(nativeLabel)}</button>{item.kind!=='directory'&&item.nativeAction!=='reveal'&&<button onClick={()=>openNative('reveal')}>{tr('在文件夹中显示')}</button>}</>}<button disabled={busy||!item} onClick={()=>open(item.path||item.url)}><RefreshCw size={15}/>{tr('刷新')}</button>{item?.text!==undefined&&<><button aria-pressed={edit} onClick={()=>setEdit(!edit)}>{tr(edit?'预览':'编辑')}</button><button disabled={busy||!dirty} onClick={save}><Save size={15}/>{tr('保存')}</button></>}</div>
 {error&&<p className="preview-error" role="alert">{tr(error)}</p>}
 <div className="preview-content">{busy&&<p>{tr('正在加载…')}</p>}{!busy&&item&&(edit?<textarea aria-label={tr('文件内容')} spellCheck={false} value={text} onChange={e=>setText(e.target.value)}/>:['directory','external'].includes(item.kind)?<div className="preview-native"><p>{item.name}</p><p>{tr(item.kind==='directory'?'可在资源管理器中打开此文件夹。':item.nativeAction==='reveal'?'在文件夹中显示':'此文件可用本机应用打开，或在文件夹中显示。')}</p><button onClick={()=>openNative(item.nativeAction||'open')}>{tr(nativeLabel)}</button></div>:item.kind==='image'?<img alt={item.name} src={item.data}/>:item.kind==='markdown'?<article className="prose"><LinkedMarkdown onPreview={target=>open(target,item.path)}>{text}</LinkedMarkdown></article>:item.kind==='text'?<pre>{text}</pre>:item.kind==='html'?<iframe title={item.name} sandbox="allow-scripts" srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:">${text}`}/>:item.kind==='web'?<iframe key={frame} title={item.name} sandbox="allow-scripts allow-same-origin allow-forms" src={item.url}/>:<iframe title={item.name} src={item.data}/>)}</div>
 {item?.kind==='html'&&<footer>{tr('交互项目请启动本地服务，再输入预览网址。')}</footer>}
 {item?.kind==='web'&&<footer>{tr('网址需已启动服务；部分网站不允许嵌入预览。')}</footer>}
 </aside>;
}
