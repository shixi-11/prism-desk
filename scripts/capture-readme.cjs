const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const scenes=['en-dark','en-light','zh-dark'];
if(process.argv[2]&&!scenes.includes(process.argv[2]))throw Error('Choose en-dark, en-light, or zh-dark.');
fs.mkdirSync(path.join(root,'.local'),{recursive:true});
if(!process.versions.electron){
 const captureEnv={...process.env,PRISM_TEST_HIDE:'1'};delete captureEnv.ELECTRON_RUN_AS_NODE;
 for(const scene of (process.argv[2]?[process.argv[2]]:scenes))cp.execFileSync(path.join(root,'node_modules/electron/dist/electron.exe'),[__filename,scene],{cwd:root,env:captureEnv,windowsHide:true,stdio:'inherit',timeout:30000});
}else{
 const {app}=require('electron');app.setAppPath(root);
 const scene=process.argv[2]||'en-dark',zh=scene.startsWith('zh'),theme=scene.endsWith('light')?'light':'dark';
 const base=fs.mkdtempSync(path.join(root,'.local','readme-demo-')),data=path.join(base,'data'),tasks=path.join(data,'tasks');fs.mkdirSync(data,{recursive:true});
 const profiles=['Claude','Codex','Grok'].map((provider,i)=>{const home=path.join(base,'accounts',provider);fs.mkdirSync(home,{recursive:true});return{id:provider.toLowerCase()+'-example',provider,name:zh?'个人账号':'Personal',home,executable:path.join(base,'not-a-cli.exe'),model:provider==='Codex'?'gpt-6-astra':provider==='Claude'?'opus':'grok-4.6',write:true};});
 const config=path.join(base,'config.json');fs.writeFileSync(config,JSON.stringify({profiles,assistant:{path:'',instructions:''},skillsPath:'',apps:{},storageRoot:tasks}));process.env.PRISM_CONFIG=config;process.env.PRISM_TEST_DATA=data;process.env.PRISM_TEST_HIDE='1';
 const {TaskStore}=require('../electron/core.cjs'),store=new TaskStore(tasks);
 const portfolio=path.join(base,zh?'作品集网站':'Portfolio'),studio=path.join(base,zh?'工作室':'Studio');for(const p of [portfolio,studio])fs.mkdirSync(p);
 const names=zh?['交互与动效','移动端适配','内容结构','品牌故事','发布清单']:['Interactions & motion','Mobile layout','Content structure','Brand story','Launch checklist'];
 names.forEach((title,i)=>{const t=store.create({title,cwd:i<3?portfolio:studio,profile:profiles[i%3].id,mode:'workspace-write'});if(i===4){t.pinned=true;store.save(t);}});
 const selected=store.create({title:zh?'让作品成为主角':'Let the work take the spotlight',cwd:portfolio,profile:profiles[0].id,mode:'workspace-write'});
 selected.workPlan={goal:zh?'完成一个简洁、温暖的设计师作品集':'Create a calm, thoughtful design portfolio',revision:'demo',steps:[{text:zh?'梳理作品与叙事':'Shape the content and story',status:'completed'},{text:zh?'搭建首页与作品详情':'Build the homepage and case studies',status:'completed'},{text:zh?'完善移动端与键盘操作':'Refine mobile and keyboard navigation',status:'pending'}]};store.save(selected);
 store.append(selected.id,'user',{text:zh?'接着已保存的设计方案继续。保留温暖的色调，让作品本身更突出，同时把移动端和键盘操作做好。':'Continue from the saved design brief. Keep the warm palette, give the projects more room, and make the site work well on mobile and with a keyboard.',profile:profiles[0].id});
 store.append(selected.id,'assistant',{text:zh?'## 让作品自己讲故事\n\n首页以一段简短的自我介绍开场，随后直接呈现三个精选项目。每个项目都有明确的背景、设计思路与成果，读者可以顺着内容继续深入。\n\n- **更从容的布局**：放大作品画面，留出足够的呼吸空间。\n- **统一的视觉语言**：温暖的米色、深棕色文字，以及克制的过渡动画。\n- **照顾不同的阅读方式**：手机上采用单列布局，链接与按钮都能通过键盘操作。\n\n下一步可以一起检查三个案例的内容，让每个项目都保留自己的个性。':'## Let the projects tell the story\n\nThe homepage opens with a short introduction, then moves straight into three selected projects. Each case study has a clear context, a design story, and an outcome worth exploring.\n\n- **Room to breathe.** Larger project images and a quieter page rhythm.\n- **A consistent visual language.** Warm neutrals, deep brown text, and subtle transitions.\n- **More ways to explore.** A single-column mobile layout, visible focus states, and keyboard-friendly links.\n\nNext, we can refine the three case studies so each project keeps its own character.',profile:profiles[0].id,phase:'final'});
 fs.mkdirSync(path.join(data,'drafts'),{recursive:true});fs.writeFileSync(path.join(data,'drafts','primary.json'),JSON.stringify({_selected:selected.id,[selected.id]:{text:'',images:[]}}));
 fs.writeFileSync(path.join(data,'settings.json'),JSON.stringify({theme,language:zh?'zh':'en',projects:[{cwd:portfolio,name:path.basename(portfolio)},{cwd:studio,name:path.basename(studio)}],projectNames:{[portfolio]:path.basename(portfolio),[studio]:path.basename(studio)},autoUpdateCheck:false}));
 app.on('browser-window-created',(_event,window)=>{window.setSize(1680,1050);window.webContents.once('did-finish-load',async()=>{await window.webContents.executeJavaScript("localStorage.setItem('prism-sidebar-folds',JSON.stringify({pinned:false,projects:false,recent:false}));");window.webContents.reload();window.webContents.once('did-finish-load',()=>{setTimeout(async()=>{try{window.webContents.invalidate();const image=await window.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true});const output=path.join(root,'output','20260912_prism-'+scene+'.png');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,image.toPNG());console.log(JSON.stringify({scene,path:output,size:image.getSize()}));app.exit(0);}catch(e){console.error(e.message);app.exit(1);}},6000);});});});
 require('../electron/main.cjs');
}
