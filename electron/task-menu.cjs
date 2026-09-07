function taskMenuTemplate(task,tasks,tr,choose,busy=false){
 const item=(label,action,extra={})=>({label:tr(label),click:()=>choose(action),...extra});
 const divider={type:'separator'};
 const sections=[...new Set(tasks.map(t=>t.section).filter(Boolean))];
 const projects=[...new Set(tasks.filter(t=>t.projectGroup||t.workspaceKind==='project').map(t=>t.cwd))];
 return [item('重命名',{action:'rename'},{accelerator:'Alt+Ctrl+R'}),item(task.pinned?'取消置顶':'置顶',{action:'pin'},{accelerator:'Alt+Ctrl+P'}),item('标记为未读',{action:'unread'},{accelerator:'Ctrl+Shift+U'}),item('归档',{action:'archive'},{accelerator:'Ctrl+Shift+A',enabled:!busy}),divider,
 {label:tr('项目'),submenu:[item('选择项目文件夹…',{action:'project-pick'},{enabled:!busy}),item('按当前工作目录分组',{action:'project',value:task.cwd},{enabled:!busy}),...projects.map(cwd=>({label:cwd,enabled:!busy,click:()=>choose({action:'project',value:cwd})})),item('移出项目分组',{action:'project',value:null},{enabled:!busy})]},
 {label:tr('分区'),submenu:[item('新建分区…',{action:'section-new'}),...sections.map(section=>({label:section,click:()=>choose({action:'section',value:section})})),item('移出分区',{action:'section',value:''})]},divider,
 item('分享',{action:'share'}),{label:tr('复制'),submenu:[item('复制对话',{action:'copy-conversation'}),item('复制任务名称',{action:'copy-title'}),item('复制任务编号',{action:'copy-id'}),item('复制工作目录',{action:'copy-path'})]},divider,
 {label:tr('分叉'),submenu:[item('在同一工作目录分叉',{action:'fork',value:false},{enabled:!busy}),item('复制对话到独立工作区',{action:'fork',value:true},{enabled:!busy})]},divider,
 {label:tr('打开方式'),submenu:[item('打开工作目录',{action:'open-folder'}),item('预览对话文档',{action:'preview-conversation'}),item('使用默认应用打开对话',{action:'open-document'})]},item('在新窗口中打开',{action:'new-window'}),divider,item('删除任务',{action:'delete'},{enabled:!busy})];
}
module.exports={taskMenuTemplate};
