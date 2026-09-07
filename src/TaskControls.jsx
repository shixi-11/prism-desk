import React,{useEffect,useState} from 'react';
import {X,ImagePlus,Settings2,ChevronDown} from 'lucide-react';
import {tr} from './i18n.js';
export function ImageAttachments({taskId,images,onRemove,onPreview}){
 const [thumbs,setThumbs]=useState({});
 useEffect(()=>{let live=true;for(const image of images||[])if(!image.thumbnail)window.prism.imageThumbnail(taskId,image.id).then(src=>{if(live)setThumbs(old=>({...old,[image.id]:src}));}).catch(()=>{});return()=>{live=false;};},[taskId,images]);
 return images?.length?<div className="image-attachments">{images.map(image=><div key={image.id}><button className="image-preview" title={image.name} onClick={()=>onPreview?.(image)}><img alt={image.name} src={image.thumbnail||thumbs[image.id]}/></button>{onRemove&&<button className="remove-image" aria-label={tr('移除图片')} onClick={()=>onRemove(image.id)}><X size={13}/></button>}</div>)}</div>:null;
}
export function QueuedMessages({items,onCancel,onRetry}){
 if(!items.length)return null;
 return <div className="queued-messages" aria-label={tr('待发送消息')}><strong>{tr('待发送消息')} · {items.length}</strong>{items.map(item=><div key={item.id}><span>{item.images?.length?`▧ ${item.images.length} · `:''}{item.text}</span>{item.error&&<small>{tr(item.error)}</small>}{item.status==='held'&&<button onClick={()=>onRetry(item.id)}>{tr('重试')}</button>}<button aria-label={tr('取消排队')} onClick={()=>onCancel(item.id)}><X size={14}/></button></div>)}</div>;
}
export function ActivityPanel({task,events,thinking,activity}){
 const summaries=events.filter(e=>e.type==='reasoning').slice(-6),plans=events.filter(e=>e.type==='plan').slice(-1);
 const busy=['running','stopping'].includes(task?.state);
 if(!busy&&!summaries.length&&!plans.length)return null;
 return <details className="activity-panel"><summary><span className={busy?'status-dot':''}/>{tr(busy?(activity?'正在执行':'正在思考'):'思考与执行')}<ChevronDown size={13}/></summary><div>{summaries.length>0&&<strong>{tr('思考摘要')}</strong>}{summaries.map(e=><p key={e.id}>{e.text}</p>)}{thinking&&<p>{thinking}</p>}{busy&&!thinking&&!summaries.length&&<p>{tr('等待 CLI 返回思考摘要')}</p>}{activity&&<pre>{activity}</pre>}{plans.map(p=><ol key={p.id}>{(p.data?.plan||[]).map((step,index)=><li key={index}>{step.status==='completed'?'✓ ':''}{step.step}</li>)}</ol>)}</div></details>;
}
export function GeneralSettings({settings,onSave,onAccounts,storage,onDefault,onAppearance,languageControl}){
 return <div className="general-settings"><label>{tr('发送快捷键')}<select aria-label={tr('发送快捷键')} value={settings.sendShortcut||'ctrl-enter'} onChange={e=>onSave({sendShortcut:e.target.value})}><option value="enter">Enter</option><option value="ctrl-enter">Ctrl / ⌘ + Enter</option></select></label><p>{tr('使用 Shift + Enter 换行')}</p><label>{tr('运行中发送')}<select aria-label={tr('运行中发送')} value={settings.busySend||'queue'} onChange={e=>onSave({busySend:e.target.value})}><option value="queue">{tr('排队')}</option><option value="steer">{tr('引导当前执行')}</option></select></label><p>{tr('Codex 支持实时引导；其他入口或尚未开始执行时转为排队。')}</p><label>{tr('新任务默认权限')}<select value={settings.defaultMode||'workspace-write'} onChange={e=>onDefault(e.target.value)}><option value="read-only">{tr('只读')}</option><option value="workspace-write">{tr('项目内编辑')}</option><option value="full-access">{tr('完全访问')}</option></select></label><label>{tr('外观主题')}<select value={settings.theme||'system'} onChange={e=>onAppearance(e.target.value)}><option value="light">{tr('白天')}</option><option value="dark">{tr('黑夜')}</option><option value="system">{tr('跟随系统')}</option></select></label>{languageControl}<button onClick={onAccounts}><Settings2 size={16}/>{tr('账号')}</button><button onClick={()=>window.prism.openTaskStorage()}>{tr('打开会话保存位置')}</button><code>{storage}</code></div>;
}
