const {root}=require('./helpers/config-fixture.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {projectMenuTemplate,manageProject}=require('../electron/project-menu.cjs');
test('project context menu exposes requested actions, sections and accurate availability',()=>{
 let choice;const menu=projectMenuTemplate('C:/Art',{projectPreferences:{'c:/art':{pinned:true,section:'Work'}}},[{cwd:'C:/Art'}],s=>s,c=>choice=c,{busy:true,git:false});
 for(const name of ['取消置顶','编辑','分区','创建永久工作树','全部标为已读','归档聊天','移除项目'])assert.ok(menu.some(i=>i.label===name));
 assert.equal(menu.find(i=>i.label==='归档聊天').enabled,false);assert.equal(menu.find(i=>i.label==='创建永久工作树').enabled,false);menu.find(i=>i.label==='编辑').click();assert.equal(choice.action,'rename');
 const section=menu.find(i=>i.label==='分区').submenu.find(i=>i.label==='Work');assert.equal(section.checked,true);section.click();assert.deepEqual(choice,{action:'section',value:'Work'});
});
test('project read, archive and removal are scoped and never delete project files',()=>{
 const cwd=path.join(root,'project-actions');fs.mkdirSync(cwd);fs.writeFileSync(path.join(cwd,'keep'),'unchanged');const tasks=[{id:'a',cwd,state:'idle',unread:true},{id:'b',cwd:root,state:'idle',unread:true}],store={list:()=>tasks,save:()=>{}};
 const runner={activeFor:id=>id==='a'?{task:tasks[0]}:null},queue={items:[{taskId:'a'},{taskId:'b'}],save:()=>{}};
 let settings={projects:[{cwd}]};settings=manageProject(settings,store,runner,queue,cwd,'read');assert.equal(tasks[0].unread,false);assert.equal(tasks[1].unread,true);
 assert.throws(()=>manageProject(settings,store,runner,queue,cwd,'archive'),/停止/);assert.equal(tasks[0].archivedAt,undefined);
 settings=manageProject(settings,store,{active:null},queue,cwd,'archive');assert.ok(tasks[0].archivedAt);assert.equal(tasks[1].archivedAt,undefined);assert.deepEqual(queue.items,[{taskId:'b'}]);
 settings=manageProject(settings,store,{active:null},queue,cwd,'remove');assert.equal(settings.projects.length,0);assert.equal(fs.readFileSync(path.join(cwd,'keep'),'utf8'),'unchanged');
});
test('project pins and sections preserve conversations; removal reveals them in Recent and re-add restores grouping',async()=>{
 const {sidebarGroups}=await import('../src/sidebar-groups.js'),tasks=[{id:'a',cwd:'C:/Art',workspaceKind:'project',projectHistory:['C:/Art']}],saved=[{cwd:'C:/Art'}];
 let groups=sidebarGroups(tasks,saved,{'c:/art':{pinned:true}});assert.equal(groups[0].groups[0].tasks[0].id,'a');assert.equal(groups[1].groups.length,0);
 groups=sidebarGroups(tasks,saved,{'c:/art':{section:'Creative'}});assert.equal(groups[2].groups[0].label,'Creative');assert.equal(groups[2].groups[0].groups[0].tasks[0].id,'a');
 groups=sidebarGroups(tasks,[],{'c:/art':{hidden:true}});assert.equal(groups[1].groups.length,0);assert.equal(groups[2].tasks[0].id,'a');
});
test('permanent worktree uses a separate real Git checkout and preserves uncommitted source files',async()=>{
 const source=path.join(root,'git-source'),destination=path.join(root,'git-worktree');fs.mkdirSync(source);
 const git=args=>cp.execFileSync('git',['-C',source,...args],{windowsHide:true,encoding:'utf8',stdio:'pipe'});
 git(['init']);fs.writeFileSync(path.join(source,'file.txt'),'committed');git(['add','file.txt']);git(['-c','user.name=Prism Test','-c','user.email=test@example.invalid','commit','-m','fixture']);fs.writeFileSync(path.join(source,'file.txt'),'uncommitted');
 const {repository,createWorktree}=require('../electron/project-worktree.cjs');assert.ok(await repository(source));const result=await createWorktree(source,destination);
 assert.match(result.branch,/^codex\/worktree-/);assert.equal(fs.readFileSync(path.join(destination,'file.txt'),'utf8'),'committed');assert.equal(fs.readFileSync(path.join(source,'file.txt'),'utf8'),'uncommitted');assert.match(git(['worktree','list','--porcelain']),/git-worktree/);
 await assert.rejects(createWorktree(source,destination),/已存在/);await assert.rejects(createWorktree(source,path.join(source,'nested')),/之外/);
});
