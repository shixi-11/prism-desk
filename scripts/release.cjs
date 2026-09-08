const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {VERSION,REPO,compareVersions}=require('../electron/release.cjs');
const root=path.resolve(__dirname,'..');
function checkRelease(directory=root){
 const read=file=>JSON.parse(fs.readFileSync(path.join(directory,file),'utf8'));
 const pkg=read('package.json'),lock=read('package-lock.json'),release=read('release.json');
 if(!VERSION.test(pkg.version)||lock.version!==pkg.version||lock.packages?.['']?.version!==pkg.version||release.version!==pkg.version)throw Error('package.json, package-lock.json and release.json must use the same release version.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(release.date)||!Number.isFinite(Date.parse(release.date)))throw Error('Release date must be YYYY-MM-DD.');
 for(const language of ['en','zh'])if(!Array.isArray(release.notes?.[language])||!release.notes[language].length||release.notes[language].some(note=>typeof note!=='string'||!note.trim()||note.length>1000))throw Error(`Add concrete ${language} release notes before publishing.`);
 return release;
}
function releaseBody(release){
 const url=`https://github.com/${REPO}`;
 return `[English](#english) · [简体中文](#简体中文)\n\n## English\n\n### Prism v${release.version}\n\n${release.date}\n\n<!-- prism:notes:en -->\n${release.notes.en.map(note=>'- '+note).join('\n')}\n<!-- /prism:notes:en -->\n\n**Update:** Open **Check for updates**, review the changes, then choose **Download and prepare**. Select **Update and restart** when ready. You can close the panel and keep using your current version.\n\n**New installation:** Follow the [installation instructions](${url}#readme). This release uses the source installation; no standalone installer is attached.\n\n**Verification:** The updater checks the downloaded Git revision against the published tag and verifies the package version before building.\n\n## 简体中文\n\n### 棱镜v${release.version}\n\n${release.date}\n\n<!-- prism:notes:zh -->\n${release.notes.zh.map(note=>'- '+note).join('\n')}\n<!-- /prism:notes:zh -->\n\n**更新方式：**打开“检查更新”，阅读更新内容，再选择“下载并准备”。方便时点击“更新并重启”；也可以关闭面板，继续使用当前版本。\n\n**首次安装：**参照[安装说明](${url}#readme)。本次发布使用源码安装方式，未附独立安装包。\n\n**版本校验：**更新器核对下载的 Git 提交与正式标签，并在构建前校验软件版本号。\n`;
}
function git(args){return cp.execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}}).trim();}
async function publishRelease(){
 const release=checkRelease(),tag='v'+release.version,body=releaseBody(release);
 if(git(['status','--porcelain']))throw Error('Commit all release changes before publishing.');
 const head=git(['rev-parse','HEAD']),remote='https://github.com/'+REPO+'.git';
 if(git(['ls-remote',remote,'refs/heads/main']).split(/\s/)[0]!==head)throw Error('Push the verified release commit to main before publishing.');
 const credentials=cp.spawnSync('git',['credential','fill'],{cwd:root,input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
 if(credentials.status!==0)throw Error('GitHub credentials are unavailable.');
 const token=credentials.stdout.split(/\r?\n/).find(line=>line.startsWith('password='))?.slice(9);
 if(!token)throw Error('GitHub credentials are unavailable.');
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','User-Agent':'Prism-release'};
 const api=async(endpoint,options={})=>{
  const response=await fetch(`https://api.github.com/repos/${REPO}/${endpoint}`,{...options,headers,signal:AbortSignal.timeout(30000)});
  if(response.status===404)return null;
  if(!response.ok)throw Error('GitHub release request failed: HTTP '+response.status);
  return response.json();
 };
 const existing=await api('releases/tags/'+tag);
 if(existing){
  if(existing.draft||existing.prerelease||existing.body!==body||git(['ls-remote',remote,`refs/tags/${tag}^{}`]).split(/\s/)[0]!==head)throw Error('This version already exists with different content. Publish a new version; never move or overwrite a published tag.');
  return {published:true,existing:true,version:release.version,url:existing.html_url};
 }
 const latest=await api('releases/latest');
 if(latest&&compareVersions(release.version,latest.tag_name.replace(/^v/,''))<=0)throw Error('The version must increase beyond the latest published release.');
 const localTags=git(['tag','--list',tag]);
 if(localTags){if(git(['rev-parse',tag+'^{}'])!==head)throw Error('The local tag points to a different commit.');}
 else git(['tag','-a',tag,'-m','Prism '+tag]);
 git(['push',remote,'refs/tags/'+tag]);
 const result=await api('releases',{method:'POST',body:JSON.stringify({tag_name:tag,target_commitish:head,name:'Prism '+tag,draft:false,prerelease:false,make_latest:'true',body})});
 if(!result?.html_url)throw Error('Release publication was not confirmed. Inspect GitHub before retrying.');
 const verified=await api('releases/latest');
 if(verified?.tag_name!==tag||verified.body!==body)throw Error('Published release verification failed.');
 return {published:true,version:release.version,url:result.html_url};
}
if(require.main===module){
 const action=process.argv[2]||'check';
 Promise.resolve().then(()=>action==='check'?{valid:true,version:checkRelease().version}:action==='publish'?publishRelease():Promise.reject(Error('Use check or publish.'))).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={checkRelease,releaseBody};
