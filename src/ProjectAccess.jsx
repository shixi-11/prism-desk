import React,{useState} from 'react';
import {FolderPlus,X} from 'lucide-react';
import {tr} from './i18n.js';
const key=v=>v.replaceAll('\\','/').replace(/\/$/,'').toLowerCase();
export default function ProjectAccess({task,tasks,projectNames,onSave}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const roots=task.linkedProjects||[],disabled=busy||['running','stopping','unknown'].includes(task.state);
 const choices=[...new Map(tasks.flatMap(t=>[t.cwd,...(t.projectHistory||[])]).filter(dir=>dir&&key(dir)!==key(task.cwd)).map(dir=>[key(dir),dir])).values()].filter(dir=>!roots.some(root=>key(root)===key(dir)));
 async function save(next){setBusy(true);setError('');try{await onSave(next);}catch(e){setError(e.message);}finally{setBusy(false);}}
 const label=dir=>projectNames[key(dir)]||dir.split(/[\\/]/).filter(Boolean).pop();
 return <details className="project-access"><summary title={tr('关联项目')}><FolderPlus size={17}/><span>{tr('关联项目')}{roots.length?` · ${roots.length}`:''}</span></summary><div className="project-access-popover"><strong>{tr('关联项目')}</strong><p>{tr('关联目录沿用当前文件权限，下次执行生效。')}</p><small>{tr('受限目录访问支持 Codex 和 Claude；其他入口需要完全访问。')}</small>{roots.map(dir=><div className="project-access-row" key={dir}><span title={dir}>{label(dir)}</span><button aria-label={tr('移除')+' '+label(dir)} disabled={disabled} onClick={()=>save(roots.filter(root=>root!==dir))}><X size={14}/></button></div>)}<select aria-label={tr('关联项目')} value="" disabled={disabled} onChange={e=>{if(e.target.value)save([...roots,e.target.value]);}}><option value="">{tr('选择项目')}</option>{choices.map(dir=><option value={dir} key={dir}>{label(dir)}</option>)}</select><button disabled={disabled} onClick={async()=>{try{const dir=await window.prism.pickDirectory();if(dir)await save([...roots,dir]);}catch(e){setError(e.message);}}}>{tr('选择其他目录')}</button>{error&&<p role="alert">{error}</p>}</div></details>;
}
