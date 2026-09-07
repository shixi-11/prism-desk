import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Markdown from "react-markdown";
import QuestionChoices,{proseQuestion} from "./QuestionChoices.jsx";
import TaskPlan from "./TaskPlan.jsx";
import AccountManager from "./AccountManager.jsx";
import PreviewPanel,{LinkedMarkdown} from "./PreviewPanel.jsx";
import {ImageAttachments,QueuedMessages,ActivityPanel,GeneralSettings,AccountQuota} from "./TaskControls.jsx";
import {
  Sun,
  Languages,
  ImagePlus,
  PanelRightOpen,
  PanelRight,
  PanelBottom,
  Moon,
  Monitor,
  Plus,
  ArrowUpRight,
  ArrowRightLeft,
  FolderOpen,
  Terminal,
  RefreshCw,
  BookOpen,
  Archive,
  UsersRound,
  Sparkles,
  X,
  Settings2,
  ChevronDown,
  Square,
  Send,
  Download,
  Check,
  CircleDot,
  Pencil,
} from "lucide-react";
import "./style.css";
import "./desert.css";
import {tr,setLanguage,locale,languages} from './i18n.js';

const api = window.prism;
function taskGroups(tasks){
  const groups=new Map();
  for(const task of tasks){const key=task.pinned?'pinned':task.section?'section:'+task.section:task.projectGroup?'project:'+task.cwd:'tasks';
    if(!groups.has(key))groups.set(key,{key,label:task.pinned?tr('置顶'):task.section||(task.projectGroup?task.cwd.split(/[\\/]/).filter(Boolean).pop():tr('任务')),path:task.projectGroup?task.cwd:undefined,tasks:[]});
    groups.get(key).tasks.push(task);
  }
  return [...groups.values()];
}
function TaskEntry({item,selected,onSelect,onRename,onAction}){
  const [editing,setEditing]=useState(false),[name,setName]=useState(item.title),[saving,setSaving]=useState(false);
  const begin=()=>{setName(item.title);setEditing(true);};
  async function save(e){e.preventDefault();if(!name.trim()||saving)return;setSaving(true);try{await onRename(item.id,name.trim());setEditing(false);}catch{}finally{setSaving(false);}}
  const act=choice=>{if(choice?.action==='rename')begin();else if(choice)onAction(item.id,choice.action,choice.value);};
  useEffect(()=>{if(!selected||editing)return;const handler=e=>{const k=e.key.toLowerCase();const action=e.ctrlKey&&e.altKey&&k==='r'?'rename':e.ctrlKey&&e.altKey&&k==='p'?'pin':e.ctrlKey&&e.shiftKey&&k==='u'?'unread':e.ctrlKey&&e.shiftKey&&k==='a'?'archive':null;if(action&&!e.defaultPrevented){e.preventDefault();act({action});}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[selected,editing,item.id,onAction]);
  return <div className="task-entry" onContextMenu={async e=>{e.preventDefault();try{act(await api.taskMenu(item.id));}catch(error){onAction(item.id,'error',error);}}}>
    {editing?<form className="task-rename" onSubmit={save}>
      <input autoFocus dir="auto" aria-label={tr("任务名称")} maxLength={100} value={name} disabled={saving} onFocus={e=>e.target.select()} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'&&!saving)setEditing(false);}}/>
      <button type="submit" aria-label={tr("保存名称")} disabled={saving||!name.trim()}><Check size={15}/></button>
      <button type="button" aria-label={tr("取消")} disabled={saving} onClick={()=>setEditing(false)}><X size={15}/></button>
    </form>:<>
      <button className={`task-select ${selected?'selected':''} ${item.unread?'unread':''}`} onClick={onSelect} onDoubleClick={begin} onKeyDown={e=>{const k=e.key.toLowerCase();const action=e.key==='F2'||(e.ctrlKey&&e.altKey&&k==='r')?'rename':e.ctrlKey&&e.altKey&&k==='p'?'pin':e.ctrlKey&&e.shiftKey&&k==='u'?'unread':e.ctrlKey&&e.shiftKey&&k==='a'?'archive':e.key==='Delete'?'delete':null;if(action){e.preventDefault();act({action});}}} title={item.title}>
        <CircleDot size={11}/><span dir="auto">{item.pinned?'⌖ ':''}{item.title}</span>{(item.state==='running'||item.unread)&&<span className="status-dot"/>}
      </button>
      <button className="task-rename-button" title={tr("重命名")} aria-label={`${tr("重命名")} ${item.title}`} onClick={begin}><Pencil size={14}/></button>
    </>}
  </div>;
}
const labels = {
  idle: tr("就绪"),
  running: tr("正在执行"),
  stopping: tr("正在停止"),
  paused: tr("已暂停"),
  failed: tr("执行未完成"),
  unknown: tr("需要核对进度"),
};
function PrismMark({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M48 10 14 72 48 89 82 72 48 10Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M48 10V89M14 72 48 60 82 72"
        stroke="currentColor"
        strokeWidth=".7"
        opacity=".65"
      />
    </svg>
  );
}
function ThemeSwitch({ value, onChange }) {
  return (
    <div className="themes" aria-label={tr("外观主题")}>
      {[
        ["light", Sun, tr("白天")],
        ["dark", Moon, tr("黑夜")],
      ].map(([key, Icon, label]) => (
        <button
          key={key}
          className={value === key ? "active" : ""}
          title={label}
          aria-label={label}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >
          <Icon size={17} />
        </button>
      ))}
    </div>
  );
}
function Modal({ title, onClose, children, wide = false, dismissible = true }) {
  const ref = useRef(null);
  useEffect(() => {
    const old = document.activeElement;
    const dlg = ref.current;
    dlg.showModal();
    return () => {
      dlg.close();
      old?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        {dismissible && (
          <button className="icon" aria-label={tr("关闭")} onClick={onClose}>
            <X size={19} />
          </button>
        )}
      </header>
      {children}
    </dialog>
  );
}
const permissionModes=[['read-only','只读','查看文件、分析项目'],['workspace-write','项目内编辑','允许修改当前项目，额外权限按需确认'],['full-access','完全访问','允许访问项目外文件、执行命令，无需逐步确认']];
function PermissionControl({task,profile,defaultMode,onChange,onDefault}){
 const root=useRef(null),[saving,setSaving]=useState(false);
 const mode=task.pendingMode||task.mode;
 useEffect(()=>{const close=e=>{if(root.current&&!root.current.contains(e.target))root.current.open=false;};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[]);
 return <details className="permission-control" ref={root} onKeyDown={e=>{if(e.key==='Escape'){root.current.open=false;root.current.querySelector('summary').focus();}}}>
  <summary>{tr(permissionModes.find(p=>p[0]===mode)?.[1]||'只读')}<ChevronDown size={14}/></summary>
  <div className="permission-panel">
   <div role="radiogroup" aria-label={tr('文件修改权限')}>{permissionModes.map(([id,label,description])=><label className="permission-option" key={id}><input type="radio" name="task-permission" value={id} checked={mode===id} disabled={task.state==='unknown'||(id!=='read-only'&&(!profile?.write||!['Codex','Claude'].includes(profile.provider)))} onChange={()=>onChange(id)}/><span><strong>{tr(label)}</strong><small>{tr(description)}</small></span></label>)}</div>
   {task.pendingMode&&<p>{tr('下次执行生效')}</p>}
   <button type="button" disabled={saving||defaultMode===mode} onClick={async()=>{setSaving(true);try{await onDefault(mode);}finally{setSaving(false);}}}>{tr(defaultMode===mode?'已设为新任务默认权限':'设为新任务默认权限')}</button>
  </div>
 </details>;
}
function NewTask({ onClose, onCreate }) {
  const [title, setTitle] = useState(tr("新任务"));
  const [cwd, setCwd] = useState("");
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      await onCreate({ title, cwd });
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <Modal title={tr("从一个任务开始")} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted">{tr("可以直接开始对话，也可以选择项目文件夹。")}</p>
        <label>{tr("任务名称")}<input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            autoFocus
            required
          />
        </label>
        <label>{tr("工作目录（可选）")}<div className="field-row">
            <input
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder={tr("留空即可开始，文件保存在独立任务工作区")}
            />
            <button
              type="button"
              className="outline"
              aria-label={tr("浏览工作目录")}
              onClick={async () => {
                const p = await api.pickDirectory();
                if (p) setCwd(p);
              }}
            >
              <FolderOpen size={18} />
            </button>
          </div>
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer>
          <button type="button" className="quiet" onClick={onClose}>{tr("取消")}</button>
          <button className="primary" type="submit">{tr("创建任务")}<ArrowUpRight size={17} />
          </button>
        </footer>
      </form>
    </Modal>
  );
}
function CapabilityDialog({ data, onClose, onScan }) {
  const [query, setQuery] = useState("");
  const [appQuery,setAppQuery]=useState('');
  const [scanning,setScanning]=useState(false);
  return (
    <Modal title={tr("共享能力")} wide onClose={onClose}>
      <p className="muted">{tr("按需读取同一份太初与技能。插件、MCP 和软件授权需在各执行入口分别接通。")}</p>
      <div className="cap-detail">
        <Sparkles size={18} />
        <div>
          <strong>{tr("太初")}</strong>
          <p>{data.taichu.exists ? tr("入口已发现") : tr("入口不可用")}</p>
          <code>{data.taichu.path}</code>
        </div>
      </div>
      <p className="capability-legend">{tr("已发现：找到程序；检测通过：版本命令或服务响应正常。实际任务操作仍需单独验证。")}</p>
      <h3>{tr("本机应用")}<span className="mono">{data.apps.length}</span></h3>
      <input aria-label={tr("搜索应用")} placeholder={tr("搜索应用名称或类别，例如 ComfyUI")} value={appQuery} onChange={e=>setAppQuery(e.target.value)}/>
      <div className="app-list">
      {data.apps.filter(a=>(a.name+' '+a.category).toLowerCase().includes(appQuery.toLowerCase())).map((app) => (
        <div className="app-row" key={app.name}>
          <Monitor size={16} />
          <strong>{app.name}</strong>
          <span>{app.verification?.ok ? app.verification.label||tr("命令已实测") : app.verification ? app.probe==='comfy'?tr("服务未连接"):tr("检测未通过") : app.installed ? tr("程序已发现，待实测") : tr("未发现")}</span>
          <code>{app.path}</code>
          {app.taskVerification&&<small className="task-verified">{tr("本机任务已实测")} · {tr(app.name==='ComfyUI'?'无模型工作流与文件输出':app.name==='Blender'?'场景保存、重开与几何核验':app.name==='FFmpeg'?'无声视频编码与逐帧解码':'计算与中文文件读写')}</small>}
          <small>{tr(app.category)} · {tr(app.note)}</small>
          {app.verification && <small>{app.verification.ok ? app.verification.version : app.verification.error}</small>}
          {app.interfaceObservation&&<small>{tr(app.interfaceObservation.detail)}</small>}
        </div>
      ))}
      {!data.apps.some(a=>(a.name+' '+a.category).toLowerCase().includes(appQuery.toLowerCase()))&&<p className="muted">{tr("未找到匹配的已识别应用。")}</p>}
      </div>
      <h3>{tr("技能目录")}<span className="mono">{data.skills.length}</span>
      </h3>
      <input
        placeholder={tr("搜索技能名称与说明")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={tr("搜索技能")}
      />
      <div className="skill-list">
        {data.skills
          .filter((s) =>
            (s.name + s.description)
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((s) => (
            <details key={s.name}>
              <summary>{s.name}</summary>
              <p>{tr(s.description)}</p>
              <code>{s.path}</code>
            </details>
          ))}
      </div>
      <footer>
        <button className="outline" disabled={scanning} onClick={async()=>{setScanning(true);try{await onScan();}finally{setScanning(false);}}}>
          <RefreshCw size={16} />
          {scanning?tr("正在检测…"):tr("检测本机能力")}
        </button>
        <button className="outline" disabled={scanning} onClick={async()=>{setScanning(true);try{await onScan(true);}finally{setScanning(false);}}}>{tr("验证应用调用")}</button>
      </footer>
    </Modal>
  );
}
function ModelControls({task,profile,disabled,onSave}) {
  const [catalog,setCatalog]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{let live=true;setCatalog(null);setError('');api.models(profile.id).then(v=>{if(live)setCatalog(v);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[profile.id]);
  const saved=task.modelSettings?.[profile.id];const current=saved?.model||profile.model;
  const model=catalog?.models.find(m=>m.id===current);
  const effort=saved?.effort||(profile.provider==='Codex'?'xhigh':profile.provider==='Gemini'?'auto':'high');
  const labels={auto:tr("模型自动管理"),low:tr("低"),medium:tr("中"),high:tr("高"),xhigh:tr("更高"),max:tr("最高"),ultra:tr("极高"),minimal:tr("最少"),none:tr("无")};
  async function save(model,effort){setBusy(true);setError('');try{await onSave({model,effort});}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <div className="model-controls">
    <label>{tr("模型")}<select aria-label={tr("模型")} value={current} disabled={disabled||busy||!catalog} onChange={e=>{const next=catalog.models.find(m=>m.id===e.target.value);save(next.id,next.efforts.includes(effort)?effort:next.defaultEffort);}}>
      {!model&&<option value={current}>{current}</option>}{catalog?.models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
    </select></label>
    <label>{tr("思考等级")}<select aria-label={tr("思考等级")} value={effort} disabled={disabled||busy||!model} onChange={e=>save(current,e.target.value)}>
      {!model?.efforts.includes(effort)&&<option value={effort}>{labels[effort]||effort}</option>}{model?.efforts.map(v=><option key={v} value={v}>{labels[v]||v} · {v}</option>)}
    </select></label>
    <small>{error||(!catalog?tr("正在读取模型选项…"):busy?tr("正在保存…"):tr(!saved?"设置用于此账号的下一次执行":task.execution?.confirmed&&task.execution.profile===profile.id&&task.execution.model===current&&task.execution.effort===effort?"当前已生效":task.execution?"设置已保存，下次执行生效":"设置已保存，发送消息或切换并继续后生效"))}</small>
    {catalog&&<span className="model-source" title={tr(catalog.note)} aria-label={tr(catalog.note)}>ⓘ</span>}
  </div>;
}
function Inspector({
  task,
  profiles,
  cap,
  quotas,
  checking,
  onRefresh,
  onSwitch,
  onCapabilities,
  onModelSettings,
  onNew,
  draftSettings,
  onDraftAccount,
  onHandoff,
  onSavePlan,
  onPlanAction,
  onRelayPreferences,
  storage,
  disabled,
}) {
  const [target, setTarget] = useState(task?.profile || profiles.find(p=>!p.disabled)?.id);
  const [resetBusy,setResetBusy]=useState(false),[resetMessage,setResetMessage]=useState('');
  const [loginBusy,setLoginBusy]=useState(false),[loginMessage,setLoginMessage]=useState('');
  useEffect(()=>setResetMessage(''),[target]);
  useEffect(() => {
    setTarget(task?.profile || profiles.find(p=>!p.disabled)?.id);
  }, [task?.id, task?.profile]);
  const selected = profiles.find((p) => p.id === target);
  useEffect(()=>{if(!task&&(!profiles.some(p=>p.id===target&&!p.disabled))){const next=profiles.find(p=>!p.disabled)?.id;setTarget(next);onDraftAccount?.(next||'');}},[profiles,task?.id]);
  const quota = quotas[target];
  const selectedConfig=task?.modelSettings?.[target];
  const activeConfig=task?.execution||task?.lastExecution;
  const changedModel=!!selectedConfig&&(!activeConfig||activeConfig.model!==selectedConfig?.model||activeConfig.effort!==selectedConfig?.effort);
  const relayOrder=[...(task?.relayOrder||[]).filter(id=>profiles.some(p=>p.id===id)),...profiles.filter(p=>!(task?.relayOrder||[]).includes(p.id)).map(p=>p.id)];
  const running = task?.state === "running";
  const canStop = running && ["Codex","Claude","Grok"].includes(profiles.find(p=>p.id===task.profile)?.provider);
  const [clock,setClock]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),30000);return()=>clearInterval(timer);},[]);
  const stale = quota?.cached ||
    quota?.checkedAt &&
    (clock - new Date(quota.checkedAt).getTime() > 300000 || quota.windows?.some(w=>w.resetsAt&&w.resetsAt*1000<=clock));
  return (
    <aside className="inspector">
      <section className="inspector-fixed">
        <div className="section-title">
          <h2>{tr("执行账号")}</h2>
          <span>ACCOUNT</span>
        </div>
        <div className="select-wrap">
          <select
            aria-label={tr("执行账号")}
            value={target || ""}
            onChange={(e) => {const id=e.target.value;setTarget(id);if(!task)onDraftAccount(id);const q=quotas[id];if(!checking.includes(id)&&(!q?.checkedAt||Date.now()-new Date(q.checkedAt).getTime()>300000))onRefresh(id);}}
            disabled={disabled && !canStop}
          >
            {!selected&&<option value="" disabled>{tr("待登录")}</option>}
            {profiles.map((p) => (
              <option value={p.id} key={p.id} disabled={p.disabled}>
                {p.provider} / {tr(p.name)}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </div>
        {selected&&<ModelControls key={(task?.id||'draft')+target} task={task||{modelSettings:draftSettings}} profile={selected} disabled={!!selected.disabled} onSave={value=>onModelSettings(value,target)}/>}
        <div className="execution-status" role="status"><span className="status-dot" />{tr(labels[task?.state]||"就绪")}</div>
        {activeConfig&&<p className="active-config" role="status">{tr(task?.execution?(task.execution.confirmed?'当前已生效':'正在启动'):'上次已生效')} · {activeConfig.reportedModel||activeConfig.model} · {activeConfig.effort}</p>}
                <button
          className="relay outline"
          disabled={disabled || selected?.disabled || !selected || !!task && target === task.profile && !changedModel}
          onClick={() => task ? onSwitch(target) : onNew()}
        >
          <ArrowRightLeft size={16} />
          {task ? tr("切换并继续") : tr("新建任务后开始")}
        </button>
        <p className="relay-note">{!task?tr("先新建任务，再切换执行账号。"):task.state==='unknown'?tr("先核对上次执行进度，再切换账号。"):disabled?tr("请等待当前执行结束。"):target===task.profile&&!changedModel?tr("已是当前账号；选择其他账号后可切换。"):tr("切换后，在同一任务中发送指令继续。")}</p>
        {task && (
          <p className="relay-note">{tr("当前：")}{profiles.find((p) => p.id === task.profile)?.provider} /{" "}
            {tr(profiles.find((p) => p.id === task.profile)?.name)}
          </p>
        )}

        {canStop&&<button className="outline stop-handoff" onClick={()=>onHandoff(target)}>{tr("停止并交接")}</button>}
      </section>
      <div className="inspector-scroll">
      {task&&<TaskPlan key={task.id} task={task} busy={disabled} onSave={onSavePlan} onAction={onPlanAction}/>}
      {task&&<section className="relay-preferences"><h2>{tr('自动接续偏好')}</h2><p>{tr('按顺序寻找账号，使用各账号已保存的模型与思考等级。')}</p><ol>{relayOrder.map((id,i)=>{const p=profiles.find(p=>p.id===id),c=task.modelSettings?.[id];return <li key={id}><button title={tr('设置模型与思考等级')} onClick={()=>setTarget(id)}>{p.provider} / {tr(p.name)}<small>{c?.model||p.model} · {c?.effort||(p.provider==='Codex'?'xhigh':p.provider==='Gemini'?'auto':'high')}</small></button><button aria-label={tr('优先使用')+' '+p.name} disabled={i===0} onClick={()=>onRelayPreferences([id,...relayOrder.filter(v=>v!==id)])}>↑</button></li>;})}</ol></section>}

      <section>
        <div className="quota">
          <span>{tr("剩余额度")}</span>
          <strong>
            {stale ? tr("需要刷新") : quota?.remaining===0 ? tr("已用完") : quota?.remaining != null ? `${quota.remaining}%` : quota ? tr("暂时查不到") : tr("未查询")}
          </strong>
        </div>
        {quota?.windows?.map((w, i) => (
          <div className="quota-window" key={i}>
            <span>
              {w.kind==='seven_day_opus'?'Opus · '+tr("每周"):w.kind==='seven_day_sonnet'?'Sonnet · '+tr("每周"):w.minutes==null?tr("当前周期"):w.minutes >= 10080
                ? tr("每周")
                : w.minutes >= 1440
                  ? tr("每日")
                  : tr(`${w.minutes / 60} 小时`)}
            </span>
            <div className="meter">
              <span style={{ width: `${w.remaining}%` }} />
            </div>
            <b>{w.remaining}%</b>
            <small>{tr("恢复：")}{w.resetsAt==null?tr("暂未返回"):new Date(w.resetsAt * 1000).toLocaleString(locale(), {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
          </div>
        ))}
        {!quota?.windows?.length&&quota?.period?.resetsAt&&<p className="account-status">{tr("本周期结束：")}{new Date(quota.period.resetsAt*1000).toLocaleString(locale())}</p>}
        {selected?.provider==='Codex'&&<div className="reset-credit">
          <div><span>{tr("重置卡")}</span><strong>{quota?.resetCredits?.availableCount!=null?tr(`${quota.resetCredits.availableCount} 张`):tr("未查询")}</strong></div>
          {quota?.resetCredits?.credits?.map((card,index)=><small key={index}>{tr("重置卡")} {index+1} {tr("· 到期：")} {Number.isFinite(card.expiresAt)?new Date(card.expiresAt*1000).toLocaleString(locale(),{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):tr("到期时间未知")}</small>)}
          <button className="quiet" disabled={disabled||resetBusy||stale||!(quota?.resetCredits?.availableCount>0)} onClick={async()=>{const id=target;setResetBusy(true);try{const result=await api.resetCredit(id);setResetMessage(({reset:tr("已使用一张重置卡"),alreadyRedeemed:tr("此前请求已完成，未重复消耗"),noCredit:tr("此账号没有可用重置卡"),nothingToReset:tr("当前额度无需重置，未消耗卡"),cancelled:tr("已取消")})[result.outcome]||tr("请核对重置结果"));if(result.outcome!=='cancelled')await onRefresh(id);}catch(e){setResetMessage(e.message+tr("；请先刷新核对结果，再次请求会复用未完成的操作编号。"));}finally{setResetBusy(false);}}}>{resetBusy?tr("正在处理…"):tr("使用重置卡")}</button>
          {resetMessage&&<small role="status">{resetMessage}</small>}
        </div>}
        <div className="quota-meta">
          <span>
            {stale
              ? tr("上次查询已超过 5 分钟，请刷新")
              : quota?.checkedAt
                ? new Date(quota.checkedAt).toLocaleTimeString(locale(), {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : tr("等待查询")}
          </span>
          <button
            className="quiet"
            disabled={checking.includes(target)}
            onClick={() => onRefresh(target)}
          >
            <RefreshCw
              size={12}
              className={checking.includes(target) ? "spinning" : ""}
            />{tr("刷新")}</button>
        </div>
        {quota?.status && <p className="account-status">{tr(quota.status)}</p>}
        {quota?.extraUsageEnabled===true&&<p className="quota-notice">{tr("此账号启用了额外付费用量，棱镜会阻止执行。请在账号设置中关闭额外付费，或使用其他账号。")}</p>}
        {selected?.provider==='Gemini'&&<><p className="account-status">{tr("Gemini 当前提供只读接续；登录后仍需执行验证。")}</p><button className="outline" disabled={loginBusy||disabled} onClick={async()=>{setLoginBusy(true);setLoginMessage(tr("请在当前浏览器完成 Google 授权"));try{const result=await api.loginGemini();setLoginMessage(tr(result.ok?"Google 授权已完成；尚未验证模型执行":"登录未完成，请核对浏览器提示后重试"));await onRefresh(target);}catch(e){setLoginMessage(e.message);}finally{setLoginBusy(false);}}}>{tr(loginBusy?"等待浏览器授权…":"登录 Google")}</button><p className="account-status" role="status">{loginMessage}</p></>}
        {quota?.remaining===0&&!stale&&<p className="quota-notice" role="status">{tr("额度已用完，可换账号继续或等待恢复；重置卡需手动使用。")}</p>}
      </section>
      <section className="shared">
        <div className="section-title">
          <h2>{tr("共享能力")}</h2>
          <span>CONTEXT</span>
        </div>
        <button onClick={onCapabilities}>
          <Sparkles size={18} />
          <span>{tr("太初")}</span>
          <small>{cap.taichu.exists ? tr("入口可读") : tr("未发现")}</small>
        </button>
        <button onClick={onCapabilities}>
          <BookOpen size={18} />
          <span>Skills</span>
          <small>{cap.skills.length} {tr("个入口")}</small>
        </button>
        <button onClick={onCapabilities}>
          <Monitor size={18} />
          <span>{tr("本机应用")}</span>
          <small>{cap.apps.filter((a) => a.taskVerification?.ok).length} {tr("个任务已实测")}</small>
        </button>
      </section>
      <div className="inspector-foot">
        <button className="quiet storage-link" onClick={()=>api.openTaskStorage()}>{tr("打开会话保存位置")} <ArrowUpRight size={13}/></button><code className="storage-path">{storage}</code>
      </div>
      </div>
    </aside>
  );
}
function Conversation({ task, events, streaming, onNew, onPreview, onChoice }) {
  const end = useRef(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "instant" });
  }, [events.length, streaming]);
  const messages = events.filter((e) =>
    ["user", "assistant", "handoff", "notice", "question"].includes(e.type),
  );
  if (!messages.length)
    return (
      <div className="empty">
        <h1>{tr("小主人，今天想造点什么？")}</h1>
        <p>
          {task
            ? tr("写下你的想法，我们从这里继续。")
            : tr("选好工作目录，我们就从这里开始。")}
        </p>
        {!task && (
          <button className="empty-start" onClick={onNew}>{tr("新建任务")}<ArrowUpRight size={16} />
          </button>
        )}
      </div>
    );
  return (
    <div className="messages" aria-label={tr("任务对话")}>
      {messages.map((e) =>
        ["handoff","notice"].includes(e.type) ? (
          <div key={e.id} className="handoff">
            <ArrowRightLeft size={14} />
            <div><p>{e.executionStatus?`${tr(e.executionStatus)} · ${e.provider} / ${tr(e.accountName)} · ${e.execution.reportedModel||e.execution.model} · ${e.execution.effort}`:tr(e.text)}</p>{e.progress&&<details className="handoff-progress"><summary>{tr("交接进度")}</summary>
            <strong>{tr("任务要求")}</strong><p>{e.progress.request||tr("尚无记录")}</p>
            <strong>{tr("进度备注")}</strong><p>{e.progress.checkpoint||tr("尚无记录")}</p>
            <strong>{tr("上轮报告（需结合文件核对）")}</strong><div className="prose"><Markdown>{e.progress.report||tr("尚无报告")}</Markdown></div>
            <strong>{tr("工具证据")}</strong>{e.progress.evidence.map(v=><p key={v.id}>{v.text} · {v.status??tr("状态未记录")}</p>)}
            <strong>{tr("工具记录的文件改动")}</strong>{e.progress.files?.length?e.progress.files.map(file=><p key={file}>{file}</p>):<p>{tr("未记录文件清单，请结合上轮报告和项目文件核对。")}</p>}
            {e.progress.plan?.length>0&&<><strong>{tr("执行计划")}</strong>{e.progress.plan.map((step,index)=><p key={index}>{step.step} · {step.status}</p>)}</>}
            <strong>{tr("接下来")}</strong><p>{tr(e.progress.next)}</p></details>}</div>
          </div>
        ) : (
          <article dir="auto" key={e.id} className={`message ${e.type}`}>
            <header>
              <span>{e.type === "user" ? tr("小主人") : tr("太初")}</span>
              <time>
                {new Date(e.at).toLocaleTimeString(locale(), {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              {e.type === "assistant" && <small>{e.profile}</small>}
            </header>
            <div className="prose">
              <LinkedMarkdown onPreview={onPreview}>{e.type==='assistant'&&proseQuestion(e.text)?proseQuestion(e.text).prefix:e.text||""}</LinkedMarkdown>
              {e.type==='question'&&<QuestionChoices questions={e.questions} disabled={task.state!=='running'||!task.activeQuestionIds?.includes(e.requestId)} answer={events.find(v=>v.questionRequestId===e.requestId)?.text} onAnswer={answers=>api.answerQuestion(task.id,e.requestId,answers)}/>}
              {e.type==='assistant'&&proseQuestion(e.text)&&<QuestionChoices questions={[proseQuestion(e.text)]} disabled={task.state==='unknown'||task.state==='stopping'} answer={events.find(v=>v.choiceEventId===e.id)?.text} onAnswer={answers=>onChoice(e.id,answers.choice.answers[0])}/>}
              <ImageAttachments taskId={task.id} images={e.images} onPreview={image=>onPreview(image.path)}/>
            </div>
          </article>
        ),
      )}
      {streaming && (
        <article className="message assistant streaming">
          <header>{tr("太初")}<span className="status-dot" />
          </header>
          <div className="prose">
            <LinkedMarkdown onPreview={onPreview}>{streaming}</LinkedMarkdown>
          </div>
        </article>
      )}
      <div ref={end} />
    </div>
  );
}
function ExecutionLog({ events }) {
  const [open, setOpen] = useState(true);
  const records = events.filter((e) =>
    ["tool", "notice", "diff", "plan"].includes(e.type),
  );
  return (
    <div className={`execution ${open ? "expanded" : ""}`}>
      <button
        className="log-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>
          <Terminal size={15} />{tr("执行记录")}</span>
        <span className="log-status">
          <span className="status-dot" />
          {records.length ? tr(`${records.length} 条记录`) : tr("等待指令")}
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="log-list">
          {records.length ? (
            records.map((e) => (
              <details key={e.id}>
                <summary>
                  <time>{new Date(e.at).toLocaleTimeString(locale())}</time>
                  <span>
                    {e.type === "diff"
                      ? tr("文件变更")
                      : e.type === "plan"
                        ? tr("工作计划")
                        : e.text || e.type}
                  </span>
                </summary>
                <pre>{e.data ? JSON.stringify(e.data, null, 2) : e.text}</pre>
              </details>
            ))
          ) : (
            <p className="muted">{tr("执行后，命令、输出和文件变更会保存在这里。")}</p>
          )}
        </div>
      )}
    </div>
  );
}
function App() {
  const [init, setInit] = useState(null);
  const [task, setTask] = useState(null);
  const [events, setEvents] = useState([]);
  const [modal, setModal] = useState("");
  const [preview,setPreview]=useState(null);
  const [taskDialog,setTaskDialog]=useState(null),[sectionName,setSectionName]=useState('');
  const [view,setView]=useState(()=>{try{return {...{log:false,inspector:true},...JSON.parse(localStorage.getItem('prism-view')||'{}')};}catch{return {log:false,inspector:true};}});
  const changeView=update=>setView(old=>{const next={...old,...update};localStorage.setItem('prism-view',JSON.stringify(next));return next;});
  const [theme, setTheme] = useState("system");
  const [language,changeLanguage]=useState('zh');
  const [draftSettings,setDraftSettings]=useState({}),[draftAccount,setDraftAccount]=useState('');
  const [text, setText] = useState("");
  const [images,setImages]=useState([]),[uploading,setUploading]=useState(false),[sending,setSending]=useState(false),[queue,setQueue]=useState([]),[thinking,setThinking]=useState(""),[activity,setActivity]=useState("");
  const drafts=useRef({}),loadSequence=useRef(0),pendingImageFiles=useRef([]);
  const [streaming, setStreaming] = useState("");
  const [toast, setToast] = useState("");
  const [quotas, setQuotas] = useState({});
  const [checking, setChecking] = useState([]);
  const [bulk,setBulk]=useState(null);

  const [accountLogins,setAccountLogins]=useState({});
  const [approvals, setApprovals] = useState([]);
  const approval = approvals[0];
  const finishApproval = () => setApprovals((old) => old.slice(1));
  const [checkpoint, setCheckpoint] = useState("");
  const current = useRef(null);
  const fail = (error) => setToast(error.message || String(error));
  const load = async (id) => {
    if(current.current)drafts.current[current.current]={text,images};
    const sequence=++loadSequence.current;
    const result = await api.task(id);
    if(sequence!==loadSequence.current)return;
    setText(drafts.current[id]?.text||"");setImages(drafts.current[id]?.images||[]);setThinking("");setActivity("");
    setTask(result.task);
    current.current = id;
    setEvents(result.events);
    setStreaming("");
    setCheckpoint(result.task.checkpoint);
  };
  useEffect(() => {
    if (!api) {
      setToast(tr("请使用棱镜桌面启动程序打开。网页预览不连接本机账号。"));
      return;
    }
    api
      .init()
      .then((data) => {
        setInit(data);setQuotas(old=>({...data.quotas,...old}));setQueue(data.queue||[]);setAccountLogins(data.accountLogins||{});
        setDraftAccount(data.profiles.find(p=>!p.disabled)?.id||'');
        setTheme(data.settings.theme==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):data.settings.theme);
        setLanguage(data.settings.language||'zh');changeLanguage(data.settings.language||'zh');
        setApprovals(data.approvals || []);
        const requested=new URLSearchParams(location.search).get('task');
        if (data.tasks.length) load(data.tasks.find(t=>t.id===requested)?.id||data.tasks[0].id);
      })
      .catch(fail);
    return api.subscribe(({ type, value }) => {
      if(type==='accounts'){setInit(old=>old?{...old,profiles:value}:old);if(!current.current)setDraftAccount(old=>value.some(p=>p.id===old&&!p.disabled)?old:value.find(p=>!p.disabled)?.id||'');return;}
      if(type==='account-login'){setAccountLogins(old=>({...old,[value.id]:value}));return;}
      if(type==='task-list'){setInit(old=>old?{...old,...value}:old);const selected=value.tasks.find(t=>t.id===current.current);if(selected)setTask(selected);else if(current.current){++loadSequence.current;current.current=null;setTask(null);setEvents([]);setText('');setImages([]);setStreaming('');setThinking('');setActivity('');}return;}
      if(type==='approval-reset'){setApprovals(old=>old.filter(a=>a.taskId!==value.taskId));return;}
      if(type==='queue'){setQueue(value);return;}
      if(type==='quota'){setQuotas(old=>({...old,[value.id]:value}));return;}
      if (type === "error") return fail(value);
      if (type === "state" || type === "idle") {
        if (type === "idle")
          setApprovals((old) => old.filter((a) => a.taskId !== value.id));
        setInit((old) =>
          old
            ? {
                ...old,
                tasks: old.tasks.map((t) => (t.id === value.id ? value : t)),
              }
            : old,
        );
        if (value.id === current.current) {
          setTask(value);
          if (type === "idle") setStreaming("");
        }
      }
      if (type === "approval") {
        setApprovals((old) =>
          old.some((a) => a.id === value.id && a.taskId === value.taskId)
            ? old
            : [...old, value],
        );
        return;
      }
      if (value.taskId !== current.current) return;
      if(type==='reasoning'){setThinking(old=>old+value.text);return;}
      if(type==='activity'){setActivity(value.text);return;}
      if (type === "event") {
        if(value.event.type==='user'){setThinking('');setActivity('');}
        if(value.event.type==='reasoning')setThinking('');
        if(value.event.type==='tool')setActivity('');
        setEvents((old) =>
          old.some((e) => e.id === value.event.id)
            ? old
            : [...old, value.event],
        );
        if (value.event.type === "assistant") setStreaming("");
      }
      if (type === "delta") setStreaming((old) => old + value.text);
    });
  }, []);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === "system" ? (mq.matches ? "dark" : "light") : theme);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 10000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const setAppearance = async (value) => {
    setTheme(value);
    try {
      await api.theme(value);
    } catch (e) {
      fail(e);
    }
  };
  const busy = ["running", "stopping"].includes(task?.state);
  const anyBusy = init?.tasks.some((t) =>
    ["running", "stopping"].includes(t.state),
  );
  const changeTask = async (id) => {
    try {
      await load(id);
    } catch (e) {
      fail(e);
    }
  };
  const taskAction=async(id,action,value)=>{try{
    if(action==='error')throw value;
    if(action==='section-new'){setSectionName('');setTaskDialog({id,action});return;}
    const result=await api.taskAction(id,action,value);
    if(result.selectId)await load(result.selectId);
    if(result.text!==undefined)setTaskDialog({id,action,...result});
    if(action.startsWith('copy-'))setToast(tr('已复制'));
  }catch(error){fail(error);}};
  const create = async (values) => {
    const made = await api.create({...values,profile:draftAccount,executionOptions:draftSettings[draftAccount]});
    if(!task)drafts.current[made.id]={text,images:[]};
    setInit((old) => ({ ...old, tasks: [made, ...old.tasks.filter(t=>t.id!==made.id)] }));
    setModal("");
    await load(made.id);
    if(pendingImageFiles.current.length){const files=pendingImageFiles.current;pendingImageFiles.current=[];const inputs=await Promise.all(files.map(async file=>{const bytes=new Uint8Array(await file.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return{name:file.name,data:btoa(binary)};}));setImages(await api.addImages(made.id,inputs));}
  };
  const send = async () => {
    if (!task) {
      setModal("new");
      return;
    }
    try {
      if(sending||uploading)return;setSending(true);
      const sentText=text,sentImages=images,sentId=task.id;
      const result=await api.run(sentId,sentText,sentImages.map(image=>image.id));
      drafts.current[sentId]={text:"",images:[]};
      if(current.current===sentId){setText(value=>value===sentText?"":value);setImages(value=>value.filter(image=>!sentImages.some(sent=>sent.id===image.id)));}
      if(result.queued&&init.settings.busySend==='steer')setToast(tr('当前无法实时引导，消息已排队'));
    } catch (e) {
      fail(e);
    } finally {setSending(false);}
  };
  const savePreferences=async update=>{try{const settings=await api.preferences(update);setInit(old=>({...old,settings}));}catch(e){fail(e);}};
  const addImages=async files=>{if(!task){if(files){const list=Array.from(files).filter(file=>file.type.startsWith("image/"));if(list.length>5){fail(Error(tr("每条消息最多添加 5 张图片")));return;}if(list.some(file=>file.size>10*1024*1024)){fail(Error(tr("图片不能超过 10 MB")));return;}pendingImageFiles.current=list;}setModal("new");return;}const taskId=task.id;setUploading(true);try{let inputs=null;if(files){const list=Array.from(files).filter(file=>file.type.startsWith("image/"));if(!list.length)return;if(images.length+list.length>5)throw Error(tr("每条消息最多添加 5 张图片"));inputs=await Promise.all(list.map(async file=>{if(file.size>10*1024*1024)throw Error(tr("图片不能超过 10 MB"));const bytes=new Uint8Array(await file.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return{name:file.name,data:btoa(binary)};}));}const added=await api.addImages(taskId,inputs);if(images.length+added.length>5)throw Error(tr("每条消息最多添加 5 张图片"));if(current.current===taskId)setImages(old=>[...old,...added].slice(0,5));else drafts.current[taskId]={...drafts.current[taskId],images:[...(drafts.current[taskId]?.images||[]),...added].slice(0,5)};}catch(e){fail(e);}finally{setUploading(false);}};
  const refresh = async (id,model) => {
    setChecking(old=>[...old,id]);
    try {
      const result = await api.quota(id,model||task?.modelSettings?.[id]?.model||draftSettings[id]?.model);
      setQuotas((old) => ({ ...old, [id]: result }));
    } catch (e) {
      setQuotas((old) => ({
        ...old,
        [id]: {
          status: e.message.replace(/^Error invoking remote method '[^']+': Error: /,""),
          remaining: null,
          checkedAt: new Date().toISOString(),
        },
      }));
    } finally {
      setChecking(old=>old.filter(value=>value!==id));
    }
  };
  const refreshAll=async()=>{if(bulk||checking.length)return;const profiles=[...init.profiles];let cursor=0,done=0;setBulk({done:0,total:profiles.length});try{await Promise.all(Array.from({length:Math.min(2,profiles.length)},async()=>{while(cursor<profiles.length){const profile=profiles[cursor++];await refresh(profile.id);setBulk({done:++done,total:profiles.length});}}));}finally{setBulk(null);}};

  const changeMode = async (mode) => {
    try {
      const t = await api.update(task.id, { mode });
      setTask(t);
    } catch (e) {
      fail(e);
    }
  };
  const changeProfile = async (target) => {
    try {
      await api.switch(task.id, target);
      await api.run(task.id,'先核对已保存的工作记录，继续当前任务尚未完成的工作。');
      await load(task.id);
    } catch (e) {
      fail(e);
    }
  };
  if (!init)
    return (
      <div className="loading">
        <PrismMark />
        <h1>{tr("棱镜")}</h1>
        <p>{toast || tr("正在连接本机工作区…")}</p>
      </div>
    );
  return (
    <div className={`workbench ${events.length?"has-conversation":""} ${view.inspector?'':'inspector-hidden'}`}>
      <aside className="sidebar">
        <div className="brand">
          <PrismMark />
          <div className="wordmark">{tr("棱镜")}</div>
        </div>
        <button className="primary new-task" onClick={() => setModal("new")}>
          <Plus size={18} />{tr("新建任务")}</button>
        <div className="task-caption">{tr("任务")}<span>
            {init.tasks.length
              ? String(init.tasks.length).padStart(2, "0")
              : ""}
          </span>
        </div>
        <nav aria-label={tr("任务列表")}>
          {taskGroups(init.tasks).map(group=><React.Fragment key={group.key}><div className="task-group" title={group.path}>{group.label}</div>{group.tasks.map(t=><TaskEntry key={t.id} item={t} selected={task?.id===t.id} onSelect={()=>changeTask(t.id)} onAction={taskAction} onRename={async(id,title)=>{try{const updated=await api.update(id,{title});setInit(old=>({...old,tasks:old.tasks.map(t=>t.id===id?updated:t)}));setTask(old=>old?.id===id?updated:old);}catch(error){fail(error);throw error;}}}/>)}</React.Fragment>)}
          {!init.tasks.length && (
            <p className="no-tasks">{tr("你的任务会留在这里。")}</p>
          )}
        </nav>
        <footer>
          <button onClick={() => setModal("accounts")}>
            <UsersRound size={18} />{tr("账号")}</button>
          <button onClick={() => setModal("capabilities")}>
            <BookOpen size={18} />{tr("共享能力")}</button>
          <button onClick={()=>setTaskDialog({action:'history'})}><Archive size={18}/>{tr('归档')}</button>
          <button onClick={()=>setModal("settings")}><Settings2 size={18}/>{tr("设置")}</button>
          <button className="author-homepage" onClick={()=>api.authorHomepage().catch(fail)}><ArrowUpRight size={18}/><span>{tr("认识作者")}<small>shixilin.com</small></span></button>
        </footer>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <h2>{task?.title || tr("新任务")}</h2>
            <p>{tr("一个任务，持续向前。")}</p>
          </div>
          <div className="appearance-controls"><div className="view-controls"><button aria-label={tr("视图设置")} title={tr("视图设置")} onClick={()=>setModal("view")}><Settings2 size={19}/></button><button aria-label={tr("底部执行记录")} title={tr("底部执行记录")} aria-pressed={view.log} onClick={()=>changeView({log:!view.log})}><PanelBottom size={19}/></button><button aria-label={tr("右侧账号栏")} title={tr("右侧账号栏")} aria-pressed={view.inspector} onClick={()=>changeView({inspector:!view.inspector})}><PanelRight size={19}/></button></div><button title={tr("画布与预览")} disabled={!task} onClick={()=>setPreview({id:Date.now(),target:null,task})}><PanelRightOpen size={18}/></button><label className="language-control"><Languages size={18} aria-hidden="true"/><select className="language-toggle" aria-label="Switch language" title={tr("界面语言")} value={language} onChange={async e=>{const next=e.target.value;try{await api.language(next);setLanguage(next);changeLanguage(next);}catch(e){fail(e);}}}>{languages.map(l=><option key={l.id} value={l.id} lang={l.id}>{l.name}</option>)}</select></label><ThemeSwitch value={theme} onChange={setAppearance} /></div>
        </header>
        <Conversation
          task={task}
          events={events}
          onChoice={async(eventId,answer)=>{await api.run(task.id,answer,[],eventId);}}
          streaming={streaming}
          onPreview={target=>setPreview({id:Date.now(),target,task})}
          onNew={() => setModal("new")}
        />
        <div className="bottom-area">
          {task?.state === "unknown" && (
            <div className="reconcile">
              <p>{tr("上次执行意外中断。先检查文件和执行记录，确认没有遗留工作后再继续。")}</p>
              <button
                className="outline"
                onClick={async () => {
                  try {
                    setTask(await api.reconcile(task.id));
                  } catch (e) {
                    fail(e);
                  }
                }}
              >{tr("已核对，继续任务")}</button>
            </div>
          )}
          <ActivityPanel task={task} events={events} thinking={thinking} activity={activity}/>
          <QueuedMessages items={queue.filter(item=>item.taskId===task?.id&&item.status!=="sending")} onCancel={id=>api.cancelQueued(id).catch(fail)} onRetry={id=>api.retryQueued(id).catch(fail)}/>
          <div className="composer" onDragOver={e=>{if(e.dataTransfer.types.includes("Files"))e.preventDefault();}} onDrop={e=>{e.preventDefault();addImages(e.dataTransfer.files);}}>
            <ImageAttachments taskId={task?.id} images={images} onRemove={id=>setImages(old=>old.filter(image=>image.id!==id))} onPreview={image=>image.path&&setPreview({id:Date.now(),target:image.path,task})}/>
            <textarea dir="auto"
              aria-label={tr("任务指令")}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={e=>{if(Array.from(e.clipboardData.files).some(file=>file.type.startsWith("image/"))){e.preventDefault();addImages(e.clipboardData.files);}}}
              placeholder={tr("写下你的想法，或者接着上次的工作…")}
              onKeyDown={(e) => {
                if(e.nativeEvent.isComposing||e.keyCode===229)return;
                if (e.key === "Enter" && (init.settings.sendShortcut==='enter'?!e.shiftKey:((e.ctrlKey||e.metaKey)&&!e.shiftKey))) {
                  e.preventDefault();
                  if ((text.trim()||images.length)&&!sending&&!uploading) send();
                }
              }}
            />
            <div className="compose-actions">
              <button
                className="folder-control"
                title={task?.cwd}
                onClick={() =>
                  task
                    ? api.openWorkspace(task.id).catch(fail)
                    : setModal("new")
                }
              >
                <FolderOpen size={19} />
                <span>
                  {task ? task.workspaceKind==='managed'?tr("任务工作区"):task.cwd.split(/[\\/]/).pop() : tr("选择工作目录")}
                </span>
              </button>
              <span className="separator" />
              {task && <PermissionControl task={task} profile={init.profiles.find(p=>p.id===task.profile)} defaultMode={init.settings.defaultMode||'workspace-write'} onChange={changeMode} onDefault={async mode=>{try{await api.defaultMode(mode);setInit(old=>({...old,settings:{...old.settings,defaultMode:mode}}));}catch(e){fail(e);}}}/>}
              {task?.pendingMode&&<small className="permission-pending">{tr("下次执行生效")}</small>}
              <button title={tr("添加图片")} aria-label={tr("添加图片")} disabled={uploading||images.length>=5} onClick={()=>addImages(null)}><ImagePlus size={19}/></button>
              <span className="compose-spacer" />
              {busy && (
                <button
                  className="outline"
                  onClick={() => api.stop().catch(fail)}
                  disabled={task.state === "stopping"}
                >
                  <Square size={14} />
                  {task.state === "stopping"
                      ? tr("正在停止")
                      : tr("停止")}
                </button>
              )}
                <button
                  className="primary send"
                  onClick={send}
                  disabled={
                    (!text.trim()&&!images.length) || sending || uploading || task?.state === "unknown" || !!task&&init.profiles.find(p=>p.id===task.profile)?.disabled || Object.values(accountLogins).some(s=>['starting','waiting','verifying'].includes(s.phase))
                  }
                >{tr(anyBusy?(init.settings.busySend==='steer'?'引导':'排队'):'发送')}<Send size={17} />
                </button>
            </div>
          </div>
          <div className="task-tools">
            <span>{task ? tr(labels[task.state]) : tr("等待开始")}</span>
            {task && <label className="auto-relay"><input type="checkbox" checked={task.autoSwitch!==false} disabled={anyBusy} onChange={async e=>{const previous=task;const autoSwitch=e.target.checked;setTask({...task,autoSwitch});try{setTask(await api.update(task.id,{autoSwitch}));}catch(error){setTask(previous);fail(error);}}}/>{tr("额度耗尽后自动接续")}</label>}
            <span className="mono">{init.settings.sendShortcut==='enter'?'ENTER':'CTRL / ⌘ + ENTER'}</span>
            {task && (
              <>
                <button onClick={() => setModal("checkpoint")}>{tr("进度备注")}</button>
                <button
                  onClick={() => api.export(task.id).catch(fail)}
                  title={tr("导出工作记录")}
                >
                  <Download size={12} />
                </button>
              </>
            )}
          </div>
          {view.log&&<ExecutionLog events={events} />}
        </div>
      </main>
      {view.inspector&&<Inspector
        task={task}
        profiles={init.profiles}
        cap={init.capabilities}
        quotas={quotas}
        checking={checking}
        onRefresh={refresh}
        onSavePlan={async input=>{const updated=await api.savePlan(task.id,input);if(current.current===updated.id)setTask(updated);}}
        onPlanAction={async action=>{const id=task.id;await api.planAction(id,action,task.workPlan?.revision);if(current.current===id)await load(id);}}
        onRelayPreferences={async order=>{try{const updated=await api.relayPreferences(task.id,order);if(current.current===updated.id)setTask(updated);}catch(e){fail(e);}}}
        onSwitch={changeProfile}
        onCapabilities={() => setModal("capabilities")}
        onModelSettings={async(settings,id)=>{if(task){const updated=await api.modelSettings(task.id,settings,id);if(current.current===updated.id)setTask(updated);}else setDraftSettings(old=>({...old,[id]:settings}));if(init.profiles.find(p=>p.id===id)?.provider==='Claude')await refresh(id,settings.model);}}
        draftSettings={draftSettings}
        storage={init.taskStorage}
        onHandoff={async id=>{try{await api.stopAndContinue(task.id,id);}catch(e){fail(e);}}}
        onDraftAccount={setDraftAccount}
        onNew={()=>setModal('new')}
        disabled={anyBusy || task?.state === "unknown"}
      />}
      {preview&&<PreviewPanel task={preview.task} request={preview} onClose={()=>setPreview(null)}/>}
      {modal==='view'&&<Modal title={tr('视图设置')} onClose={()=>setModal('')}><div className="view-options"><label><input type="checkbox" checked={view.log} onChange={e=>changeView({log:e.target.checked})}/>{tr('底部执行记录')}</label><label><input type="checkbox" checked={view.inspector} onChange={e=>changeView({inspector:e.target.checked})}/>{tr('右侧账号栏')}</label></div></Modal>}
      {toast && (
        <div className="toast" role="alert">
          <p>{toast}</p>
          <button aria-label={tr("关闭提示")} onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {taskDialog&&<Modal title={taskDialog.title||tr(taskDialog.action==='history'?'归档与已删除':taskDialog.action==='section-new'?'新建分区':'分享对话')} wide={!!taskDialog.text} onClose={()=>setTaskDialog(null)}>
        {taskDialog.action==='history'?<div className="task-history">{['archivedTasks','deletedTasks'].map(key=><section key={key}><h3>{tr(key==='archivedTasks'?'已归档':'已删除')}</h3>{!init[key]?.length&&<p>{tr('暂无任务')}</p>}{init[key]?.map(t=><div className="history-row" key={t.id}><span>{t.title}</span><button onClick={()=>taskAction(t.id,'restore')}>{tr('恢复任务')}</button></div>)}</section>)}</div>:taskDialog.action==='section-new'?<form onSubmit={async e=>{e.preventDefault();if(!sectionName.trim())return;await taskAction(taskDialog.id,'section',sectionName);setTaskDialog(null);}}><label>{tr('分区名称')}<input autoFocus maxLength={60} value={sectionName} onChange={e=>setSectionName(e.target.value)}/></label><button type="submit" disabled={!sectionName.trim()}>{tr('保存')}</button></form>:<><p>{tr('复制或保存对话文档后即可分享。')}</p><div className="share-conversation"><Markdown>{taskDialog.text}</Markdown></div><div className="dialog-actions"><button onClick={()=>taskAction(taskDialog.id,'copy-conversation')}>{tr('复制对话')}</button><button onClick={()=>taskAction(taskDialog.id,'save-conversation')}>{tr('保存 Markdown')}</button></div></>}
      </Modal>}
      {modal === "settings" && <Modal title={tr("设置")} onClose={()=>setModal("")}><GeneralSettings settings={{...init.settings,theme}} onSave={savePreferences} storage={init.taskStorage} onAccounts={()=>setModal("accounts")} onDefault={async mode=>{try{await api.defaultMode(mode);setInit(old=>({...old,settings:{...old.settings,defaultMode:mode}}));}catch(e){fail(e);}}} onAppearance={setAppearance} languageControl={<label>{tr("界面语言")}<select value={language} onChange={async e=>{try{await api.language(e.target.value);setLanguage(e.target.value);changeLanguage(e.target.value);}catch(error){fail(error);}}}>{languages.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>}/></Modal>}
      {modal === "new" && (
        <NewTask onClose={() => setModal("")} onCreate={create} />
      )}{" "}
      {modal === "capabilities" && (
        <CapabilityDialog
          data={init.capabilities}
          onClose={() => setModal("")}
          onScan={async (verifyTasks=false) => {
            try {
              const data = verifyTasks?await api.validateApps():await api.scan();
              setInit((old) => ({ ...old, capabilities: data }));
            } catch (e) {
              fail(e);
            }
          }}
        />
      )}
      {modal === "accounts" && (
        <Modal title={tr("订阅账号")} wide onClose={() => setModal("")}>
          <AccountManager profiles={init.profiles} quotas={quotas} checking={checking} bulk={bulk} onRefresh={refresh} onRefreshAll={refreshAll} loginStates={accountLogins} busy={anyBusy}/>
        </Modal>
      )}
      {modal === "checkpoint" && (
        <Modal title={tr("进度备注")} onClose={() => setModal("")}>
          <p className="muted">{tr("记录你确认的要求、进度与下一步。换账号时会连同工作记录一起交接。")}</p>
          <textarea dir="auto"
            className="checkpoint"
            value={checkpoint}
            onChange={(e) => setCheckpoint(e.target.value)}
            maxLength={20000}
          />
          <footer>
            <button
              className="primary"
              disabled={anyBusy}
              onClick={async () => {
                try {
                  setTask(await api.update(task.id, { checkpoint }));
                  setModal("");
                } catch (e) {
                  fail(e);
                }
              }}
            >
              <Check size={16} />{tr("保存备注")}</button>
          </footer>
        </Modal>
      )}
      {approval && (
        <Modal title={tr("确认这次操作")} dismissible={false} onClose={() => {}}>
          <p>{approval.params.reason || tr("CLI 请求执行以下操作。")}</p>
          <pre className="approval-command">
            {approval.params.command ||
              JSON.stringify(
                approval.params.changes || {
                  grantRoot: approval.params.grantRoot,
                },
                null,
                2,
              )}
          </pre>
          <footer>
            <button
              className="outline"
              onClick={async () => {
                try {
                  await api.approve(approval.id, "decline");
                  finishApproval();
                } catch (error) {
                  fail(error);
                }
              }}
            >{tr("拒绝")}</button>
            <button
              className="primary"
              onClick={async () => {
                try {
                  await api.approve(approval.id, "accept");
                  finishApproval();
                } catch (error) {
                  fail(error);
                }
              }}
            >{tr("允许本次")}</button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
