import React, { useEffect, useState } from 'react';
import { RefreshCw, Check, Plus, FolderOpen, Sparkles, Monitor, BookOpen } from 'lucide-react';
import { tr, locale } from './i18n.js';

const sourceLabel = { user: '用户技能', system: '系统技能', plugin: '插件技能', extra: '添加的技能' };
const changeLabel = { added: '新增', changed: '有更新', removed: '已失效' };
const timestamp = value => value ? new Date(value).toLocaleString(locale(), { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : tr('尚未检查');

export default function CapabilityDialog({ data, onClose, onUpdate, Modal, api }) {
  const [tab, setTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const sync = data.sync || {};
  const run = async (name, action, message = '') => {
    setBusy(name); setError(''); setNotice('');
    try { const result = await action(); if (result) onUpdate(result); if (message && result) setNotice(message); }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };
  useEffect(() => {
    let live = true;
    setBusy('check');
    api.inspectCapabilities().then(value => { if (live) onUpdate(value); }).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setBusy(''); });
    return () => { live = false; };
  }, []);
  const selectTab = value => { setTab(value); setQuery(''); };
  const open = id => run('open', () => api.openCapabilitySource(id, sync.token));
  const items = data.skills.filter(s => `${s.name} ${s.description} ${s.sourceName || ''}`.toLowerCase().includes(query.toLowerCase()));
  const apps = data.apps.filter(a => `${a.name} ${a.category}`.toLowerCase().includes(query.toLowerCase()));
  const plugins = (sync.plugins || []).filter(p => `${p.name} ${p.displayName || ''} ${p.marketplace || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <Modal title={tr('共享能力')} wide onClose={onClose}>
    <div className="capability-center">
      <p className="muted">{tr('同步本机当前内容，下一轮任务即可按需读取。插件工具和软件授权单独验证。')}</p>
      <div className="capability-actions">
        <button className="outline" disabled={!!busy} onClick={() => run('check', () => api.inspectCapabilities())}><RefreshCw size={16} className={busy === 'check' ? 'spinning' : ''} />{tr(busy === 'check' ? '正在检测…' : '检查共享能力')}</button>
        <button className="primary" disabled={!!busy || !sync.token || !sync.pending} onClick={() => run('sync', () => api.syncCapabilities(sync.token), '已同步，下一轮任务生效。')}><Check size={16} />{tr(busy === 'sync' ? '正在同步…' : '同步本机最新')}</button>
        <small>{tr('检查时间')} · {timestamp(sync.checkedAt)}</small>
      </div>
      {error && <p className="capability-error" role="alert">{tr(error.replace(/^Error invoking remote method '[^']+': Error: /, ''))}</p>}
      {notice && <p className="capability-notice" role="status">{tr(notice)}</p>}
      <nav className="capability-tabs" aria-label={tr('共享能力分类')}>
        {[['overview','使用概览'], ['skills','技能目录'], ['apps','本机应用'], ['sources','来源与接入']].map(([id, label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => selectTab(id)}>{tr(label)}</button>)}
      </nav>
      {tab === 'overview' && <>
        <div className="capability-summary">
          <div><BookOpen size={18} /><strong>{data.skills.length}</strong><span>{tr('技能入口可读')}</span></div>
          <div><RefreshCw size={18} /><strong>{sync.pending || 0}</strong><span>{tr(sync.initialized ? '待同步变化' : '待建立同步记录')}</span></div>
          <div><Monitor size={18} /><strong>{data.apps.filter(a => a.taskVerification?.ok).length} / {data.apps.length}</strong><span>{tr('任务已实测 / 已发现应用')}</span></div>
        </div>
        <div className="capability-assistant"><Sparkles size={20} /><div><strong>{tr('太初')}</strong><p>{tr(data.taichu.exists ? '直接读取当前母包' : '助手入口未接通')}</p><code>{data.taichu.path || tr('尚未配置')}</code></div><button className="outline" disabled={!!busy} onClick={() => run('source', () => api.addCapabilitySource('assistant'))}>{tr('选择助手目录')}</button></div>
        <p className="capability-scope">{tr('检查范围：本机技能入口、已下载的插件资料和应用路径。在线最新版本需在原应用中检查；本页不会自动下载或升级软件。')}</p>
        {sync.syncedAt && <p className="muted">{tr('上次同步')} · {timestamp(sync.syncedAt)}</p>}
        {!sync.pending && !(sync.errors || []).length && <p className="capability-notice">{tr('当前已选择的来源没有待同步变化。')}</p>}
        {(sync.errors || []).length > 0 && <div className="capability-issues" role="status"><strong>{tr('需要处理')}</strong>{sync.errors.map((issue, index) => <p key={index}>{tr(issue.name)} · {tr(issue.reason)}</p>)}</div>}
        {!!sync.pending && <details className="capability-changes"><summary>{tr('查看待同步变化')} ({sync.pending})</summary><div>{sync.assistantChanged && <p><span>{tr('太初')}</span><small>{tr('入口记录有变化')}</small></p>}{(sync.changes || []).map(item => <p key={item.id}><span>{item.name}</span><small>{tr(changeLabel[item.change])} · {tr(sourceLabel[item.source] || item.sourceName)}</small></p>)}</div></details>}
        <div className="capability-next"><div><strong>{tr('插件资料也可以接入')}</strong><p>{tr('在来源与接入中选择插件。接入的是技能资料，不会复制登录信息或自动启用工具。')}</p></div><button className="outline" onClick={() => selectTab('sources')}>{tr('查看来源')}</button></div>
      </>}
      {tab === 'skills' && <>
        <input placeholder={tr('搜索技能名称与说明')} value={query} onChange={e => setQuery(e.target.value)} aria-label={tr('搜索技能')} />
        <p className="muted">{tr('技能入口可读')} · {items.length}</p>
        <div className="skill-list">{items.map(s => <details key={s.id || s.path}><summary>{s.name}<small>{tr(sourceLabel[s.source] || '用户技能')}{s.version ? ` · ${s.version}` : ''}</small></summary><p>{s.description}</p><code>{s.path}</code>{s.source === 'plugin' && <p className="muted">{tr('依赖的工具需在执行账号中单独接通。')}</p>}</details>)}{!items.length && <p className="muted">{tr('未找到匹配的技能。')}</p>}</div>
      </>}
      {tab === 'apps' && <>
        <p className="capability-legend">{tr('已发现：找到程序；检测通过：版本命令或服务响应正常。实际任务操作仍需单独验证。')}</p>
        <div className="capability-actions"><button className="outline" disabled={!!busy} onClick={() => run('apps', () => api.scan())}>{tr(busy === 'apps' ? '正在检测…' : '检测本机能力')}</button><button className="outline" disabled={!!busy} onClick={() => run('verify', () => api.validateApps())}>{tr(busy === 'verify' ? '正在检测…' : '验证应用调用')}</button></div>
        <input aria-label={tr('搜索应用')} placeholder={tr('搜索应用名称或类别，例如 ComfyUI')} value={query} onChange={e => setQuery(e.target.value)} />
        <div className="app-list">{apps.map(app => <div className="app-row" key={app.name}><Monitor size={16} /><strong>{app.name}</strong><span>{app.verification?.ok ? tr(app.verification.label || '命令已实测') : app.verification ? app.probe === 'comfy' ? tr('服务未连接') : tr('检测未通过') : tr('程序已发现，待实测')}</span><code>{app.path}</code>{app.taskVerification && <small className="task-verified">{tr('本机任务已实测')} · {tr(app.name === 'ComfyUI' ? '无模型工作流与文件输出' : app.name === 'Blender' ? '场景保存、重开与几何核验' : app.name === 'FFmpeg' ? '无声视频编码与逐帧解码' : '计算与中文文件读写')}</small>}<small>{tr(app.category)} · {tr(app.note)}</small>{app.verification && <small>{app.verification.ok ? app.verification.version : app.verification.error}</small>}{app.interfaceObservation && <small>{tr(app.interfaceObservation.detail)}</small>}</div>)}{!apps.length && <p className="muted">{tr('未找到匹配的已识别应用。')}</p>}</div>
      </>}
      {tab === 'sources' && <>
        <div className="capability-next"><p>{tr('添加目录后检查并同步。原文件保留在来源位置，移除来源只停止引用。')}</p><button className="outline" disabled={!!busy} onClick={() => run('source', () => api.addCapabilitySource('skills'))}><Plus size={16} />{tr('添加技能目录')}</button></div>
        <div className="capability-sources">{(sync.sources || []).map(source => <div key={source.id}><div><strong>{source.kind === 'extra' ? source.name : tr(source.name)}</strong><small>{tr(source.exists ? '来源可读' : '路径失效')}</small><code>{source.path}</code></div><button className="quiet" aria-label={tr('打开来源') + ' ' + source.name} disabled={!!busy || !source.exists} onClick={() => open(source.id)}><FolderOpen size={17} /></button>{source.kind === 'extra' && <button className="quiet" disabled={!!busy} onClick={() => run('remove', () => api.removeCapabilitySource(source.id, sync.token))}>{tr('移除来源')}</button>}</div>)}</div>
        <h3>{tr('本机插件资料')}<span className="mono">{(sync.plugins || []).length}</span></h3>
        <p className="muted">{tr('列出缓存中的最新可识别版本，不代表插件已安装、已授权或为线上最新版。')}</p>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={tr('搜索插件')} aria-label={tr('搜索插件')} />
        <div className="capability-plugins">{plugins.map(plugin => <div className="capability-plugin" key={plugin.id}><div><strong>{plugin.displayName || plugin.name}</strong><small>{plugin.marketplace} · v{plugin.version} · {plugin.count} {tr('个入口')}</small><p>{tr(plugin.selected ? '技能资料已选择' : '技能资料待接入')}{plugin.dependencies ? ' · ' + tr('工具授权待接通') : ''}</p></div><div className="capability-plugin-actions"><button className="quiet" aria-label={tr('打开来源') + ' ' + plugin.name} disabled={!!busy} onClick={() => open(plugin.id)}><FolderOpen size={16} /></button>{plugin.selected ? <button className="outline" disabled={!!busy} onClick={() => run('remove', () => api.removeCapabilitySource(plugin.id, sync.token))}>{tr('移除来源')}</button> : <button className="outline" disabled={!!busy || !plugin.count} onClick={() => run('plugin', () => api.syncCapabilities(sync.token, plugin.id), '技能资料已接入，工具权限未改变。')}>{tr('接入技能资料')}</button>}</div></div>)}{!plugins.length && <p className="muted">{tr('未找到匹配的插件资料。')}</p>}</div>
        <details className="capability-help"><summary>{tr('怎样接通插件工具？')}</summary><p>{tr('先在原应用更新插件并完成授权，再回来检查并同步资料。桌面插件的授权不会自动传给棱镜账号。')}</p><p>{tr('Codex 的 MCP 连接需在该账号的独立 CLI 中配置并验证。Claude、Grok、Gemini 当前执行通道未开放外部 MCP，接入技能资料不会改变这一限制。')}</p><p>{tr('本机应用可到本机应用页检测和验证；验证通过的范围会逐项显示。')}</p></details>
      </>}
    </div>
  </Modal>;
}
