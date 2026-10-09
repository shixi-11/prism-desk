const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {VERSION,REPO,compareVersions}=require('../electron/release.cjs');
const root=path.resolve(__dirname,'..');
const distribution=['windows-x64','mac-arm64','mac-x64'];
const assetDefinitions=[
 {distribution:'windows-x64',name:'Prism-Setup.exe',file:'.local/installer/Prism-Setup.exe',maxSize:500*1024**2-1},
 {distribution:'mac-arm64',name:'Prism-arm64.dmg',file:'.local/installer/Prism-arm64.dmg',maxSize:500*1024**2-1},
 {distribution:'mac-x64',name:'Prism-x64.dmg',file:'.local/installer/Prism-x64.dmg',maxSize:500*1024**2-1}
];

function checkRelease(directory=root){
 const read=file=>JSON.parse(fs.readFileSync(path.join(directory,file),'utf8'));
 const pkg=read('package.json'),lock=read('package-lock.json'),release=read('release.json');
 if(!VERSION.test(pkg.version)||lock.version!==pkg.version||lock.packages?.['']?.version!==pkg.version||release.version!==pkg.version)throw Error('package.json, package-lock.json and release.json must use the same release version.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(release.date)||!Number.isFinite(Date.parse(release.date)))throw Error('Release date must be YYYY-MM-DD.');
 for(const language of ['en','zh'])if(!Array.isArray(release.notes?.[language])||!release.notes[language].length||release.notes[language].some(note=>typeof note!=='string'||!note.trim()||note.length>1000))throw Error(`Add concrete ${language} release notes before publishing.`);
 if(release.distribution!==undefined&&(!Array.isArray(release.distribution)||release.distribution.length!==distribution.length||new Set(release.distribution).size!==distribution.length||distribution.some(item=>!release.distribution.includes(item))))throw Error('Distribution must include windows-x64, mac-arm64 and mac-x64 exactly once.');
 return release;
}

function releaseBody(release){
 const url=`https://github.com/${REPO}`;
 const notes=`<!-- prism:notes:en -->\n${release.notes.en.map(note=>'- '+note).join('\n')}\n<!-- /prism:notes:en -->`;
 const zhNotes=`<!-- prism:notes:zh -->\n${release.notes.zh.map(note=>'- '+note).join('\n')}\n<!-- /prism:notes:zh -->`;
 if(!release.distribution?.length){
  return `[English](#english) · [简体中文](#简体中文)\n\n## English\n\n### Prism v${release.version}\n\n${release.date}\n\n${notes}\n\n**Update:** Open **Check for updates**, review the changes, then choose **Download and prepare**. Select **Update and restart** when ready. You can close the panel and keep using your current version.\n\n**New installation:** Follow the [installation instructions](${url}#readme). This release uses the source installation; no standalone installer is attached.\n\n**Verification:** The updater checks the downloaded Git revision against the published tag and verifies the package version before building.\n\n## 简体中文\n\n### 棱镜v${release.version}\n\n${release.date}\n\n${zhNotes}\n\n**更新方式：**打开“检查更新”，阅读更新内容，再选择“下载并准备”。方便时点击“更新并重启”；也可以关闭面板，继续使用当前版本。\n\n**首次安装：**参照[安装说明](${url}#readme)。本次发布使用源码安装方式，未附独立安装包。\n\n**版本校验：**更新器核对下载的 Git 提交与正式标签，并在构建前校验软件版本号。\n`;
 }
 const common=`**Official CLI sign-in:** Prism does not include third-party CLIs, accounts or private Taichu materials. Install the official Codex, Claude Code and/or Grok CLI separately, then sign in to each with a supported subscription.`;
 const zhCommon=`**官方CLI登录：**Prism不包含第三方CLI、账号或太初私密资料。请另行安装Codex、Claude Code和／或Grok官方CLI，并分别使用支持的订阅账号登录。`;
 const assetUrl=name=>`https://github.com/${REPO}/releases/download/v${release.version}/${name}`;
 const enInstall=`**New installation:**\n- [Windows x64 installer](${assetUrl('Prism-Setup.exe')}) (Prism-Setup.exe). Double-click to install; Git and Node.js are not required. Windows may show an “Unknown publisher” warning because the installer is unsigned.\n- [Mac Apple silicon](${assetUrl('Prism-arm64.dmg')}) · [Mac Intel](${assetUrl('Prism-x64.dmg')}). Open the matching disk image and drag Prism to Applications. These builds have an ad-hoc signature but no Apple Developer ID signature or notarization; macOS may block the first launch. If you choose to open the app, allow it in System Settings → Privacy & Security.\n\n**Updates:** Windows users can use the in-app update controls. Mac updates are manual: download the matching disk image, open it, and drag the app into Applications. The app does not install Mac updates automatically.`;
 const zhInstall=`**首次安装：**\n- [Windows 64位安装包](${assetUrl('Prism-Setup.exe')})（Prism-Setup.exe），双击安装，无需Git或Node.js。安装包尚未签名，Windows可能显示“未知发布者”提示。\n- [Mac Apple芯片版](${assetUrl('Prism-arm64.dmg')}) · [Mac Intel版](${assetUrl('Prism-x64.dmg')})。打开对应芯片的DMG，将Prism拖入Applications文件夹。Mac版本有ad-hoc签名，但尚无Apple Developer ID签名和公证；macOS首次打开时可能会阻止启动。若你确认要打开，可在“系统设置 → 隐私与安全性”中允许。\n\n**更新方式：**Windows用户可使用应用内更新操作。Mac更新需手动完成：下载对应的DMG、打开并将应用拖入Applications。应用不会自动安装Mac更新。`;
 return `[English](#english) · [简体中文](#简体中文)\n\n## English\n\n### Prism v${release.version}\n\n${release.date}\n\n${notes}\n\n**Update:** Windows users can open **Check for updates**, review the changes, then choose **Download and prepare**. Select **Update and restart** when ready; closing the panel keeps the current version.\n\n${enInstall}\n\n${common}\n\n**Installer integrity:** GitHub's release asset name, size, and SHA-256 digest are verified against the local installer; the updater checks the downloaded installer size and digest before use.

**Source build:** Source updates separately verify the downloaded Git revision against the published tag and check the package version before building.\n\n## 简体中文\n\n### 棱镜v${release.version}\n\n${release.date}\n\n${zhNotes}\n\n**更新方式：**Windows用户可打开“检查更新”，阅读更新内容，再选择“下载并准备”。方便时点击“更新并重启”；关闭面板可继续使用当前版本。\n\n${zhInstall}\n\n${zhCommon}\n\n**安装包完整性：**发布前核对GitHub安装包的名称、大小和SHA-256摘要与本地文件一致；更新器使用前会再次校验安装包大小和摘要。

**源码构建：**源码更新另行核对下载的Git提交与正式标签，并在构建前校验软件版本号。\n`;
}

async function findReleaseByTag(api,tag){
 const direct=await api('releases/tags/'+encodeURIComponent(tag));
 if(direct)return direct;
 const matches=[];
 for(let page=1;page<=1000;page++){
  const batch=await api(`releases?per_page=100&page=${page}`);
  if(!Array.isArray(batch))throw Error('GitHub release listing returned an invalid response.');
  matches.push(...batch.filter(item=>item.tag_name===tag));
  if(batch.length<100)break;
  if(page===1000)throw Error('GitHub release listing exceeded the pagination limit.');
 }
 if(matches.length>1)throw Error('GitHub has multiple releases for this tag. Resolve the duplicate releases before retrying.');
 return matches[0]||null;
}
async function hashAsset(definition){
 const file=path.join(root,definition.file),before=fs.statSync(file);
 if(!before.isFile()||before.size<=0||before.size>definition.maxSize)throw Error(`Installer asset has an invalid size: ${definition.name}`);
 const hash=crypto.createHash('sha256');
 for await(const chunk of fs.createReadStream(file))hash.update(chunk);
 const after=fs.statSync(file);
 if(after.size!==before.size||after.mtimeMs!==before.mtimeMs)throw Error(`Installer asset changed while hashing: ${definition.name}`);
 return {...definition,file,size:before.size,sha256:hash.digest('hex')};
}
async function localAssets(release){
 if(!release.distribution?.length)return [];
 return Promise.all(assetDefinitions.map(async definition=>{
  if(!release.distribution.includes(definition.distribution))throw Error(`Missing distribution entry: ${definition.distribution}`);
  return hashAsset(definition);
 }));
}
function verifyReleaseAssets(release,assets,complete){
 const actual=release.assets||[],byName=new Map();
 for(const asset of actual){
  if(byName.has(asset.name))throw Error(`GitHub release has duplicate asset: ${asset.name}`);
  byName.set(asset.name,asset);
 }
 const expectedNames=new Set(assets.map(asset=>asset.name));
 for(const asset of actual)if(!expectedNames.has(asset.name))throw Error(`GitHub release has an unexpected asset: ${asset.name}`);
 for(const expected of assets){
  const actualAsset=byName.get(expected.name);
  if(!actualAsset)continue;
  if(actualAsset.size!==expected.size||actualAsset.digest!==`sha256:${expected.sha256}`||actualAsset.state!=='uploaded')throw Error(`GitHub asset does not match the local file: ${expected.name}`);
 }
 if(complete&&actual.length!==assets.length)throw Error('GitHub release does not contain exactly the expected installer assets.');
 return byName;
}
function git(args){return cp.execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}}).trim();}

async function publishRelease(){
 const release=checkRelease(),tag='v'+release.version,body=releaseBody(release),assets=await localAssets(release);
 if(git(['status','--porcelain']))throw Error('Commit all release changes before publishing.');
 const head=git(['rev-parse','HEAD']),remote='https://github.com/'+REPO+'.git';
 if(git(['ls-remote',remote,'refs/heads/main']).split(/\s/)[0]!==head)throw Error('Push the verified release commit to main before publishing.');
 const localTag=git(['tag','--list',tag]);
 if(localTag&&git(['rev-parse',tag+'^{}'])!==head)throw Error('The local tag points to a different commit.');
 const remoteTag=git(['ls-remote',remote,`refs/tags/${tag}^{}`]).split(/\s/)[0];
 if(remoteTag&&remoteTag!==head)throw Error('The remote tag points to a different commit. Never move or overwrite a release tag.');
 const credentials=cp.spawnSync('git',['credential','fill'],{cwd:root,input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
 if(credentials.status!==0)throw Error('GitHub credentials are unavailable.');
 const token=credentials.stdout.split(/\r?\n/).find(line=>line.startsWith('password='))?.slice(9);
 if(!token)throw Error('GitHub credentials are unavailable.');
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','User-Agent':'Prism-release'};
 const api=async(endpoint,options={})=>{
  const response=await fetch(`https://api.github.com/repos/${REPO}/${endpoint}`,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(60000)});
  if(response.status===404)return null;
  if(!response.ok)throw Error('GitHub release request failed: HTTP '+response.status);
  if(response.status===204)return null;
  return response.json();
 };
 const upload=async(releaseInfo,asset)=>{
  const base=(releaseInfo.upload_url||'').replace(/\{\?.*$/,'');
  if(!base)throw Error('GitHub did not provide an asset upload URL.');
  const url=base+'?name='+encodeURIComponent(asset.name);
  const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/octet-stream','Content-Length':String(asset.size),'User-Agent':'Prism-release'},body:fs.createReadStream(asset.file),duplex:'half',signal:AbortSignal.timeout(10*60*1000)});
  if(!response.ok)throw Error(`GitHub asset upload failed for ${asset.name}: HTTP ${response.status}`);
  const uploaded=await response.json();
  if(uploaded.name!==asset.name||uploaded.size!==asset.size||uploaded.digest!==`sha256:${asset.sha256}`)throw Error(`GitHub asset upload response did not match the local file: ${asset.name}`);
 };
 const verifyTag=()=>git(['ls-remote',remote,`refs/tags/${tag}^{}`]).split(/\s/)[0]===head;
 const existing=await findReleaseByTag(api,tag);
 if(existing){
  if(existing.body!==body||!verifyTag())throw Error('This version already exists with different content or tag target. Never move or overwrite a published tag.');
  if(!existing.draft){
   if(existing.prerelease)throw Error('This version already exists as a prerelease. Publish a new version instead.');
   verifyReleaseAssets(existing,assets,true);
   return {published:true,existing:true,version:release.version,url:existing.html_url};
  }
 }else{
  const latest=await api('releases/latest');
  if(latest&&compareVersions(release.version,latest.tag_name.replace(/^v/,''))<=0)throw Error('The version must increase beyond the latest published release.');
 }
 if(!localTag)git(['tag','-a',tag,'-m','Prism '+tag]);
 if(!remoteTag)git(['push',remote,'refs/tags/'+tag]);
 let draft=existing;
 if(!draft){
  draft=await api('releases',{method:'POST',body:JSON.stringify({tag_name:tag,target_commitish:head,name:'Prism '+tag,draft:true,prerelease:false,body})});
  if(!draft?.id||!draft.draft||draft.body!==body)throw Error('Draft release creation was not confirmed. Inspect GitHub before retrying.');
 }
 verifyReleaseAssets(draft,assets,false);
 const present=new Set((draft.assets||[]).map(asset=>asset.name));
 for(const asset of assets)if(!present.has(asset.name))await upload(draft,asset);
 draft=await api('releases/'+draft.id);
 if(!draft||draft.body!==body||!draft.draft||!verifyTag())throw Error('Draft release verification failed before publication.');
 verifyReleaseAssets(draft,assets,true);
 const published=await api('releases/'+draft.id,{method:'PATCH',body:JSON.stringify({draft:false,prerelease:false,make_latest:'true'})});
 if(!published?.id||published.draft||published.prerelease||published.body!==body)throw Error('Release publication was not confirmed. Inspect GitHub before retrying.');
 const verified=await api('releases/tags/'+tag);
 if(!verified||verified.draft||verified.prerelease||verified.body!==body||!verifyTag())throw Error('Published release tag or body verification failed.');
 verifyReleaseAssets(verified,assets,true);
 const latest=await api('releases/latest');
 if(latest?.tag_name!==tag)throw Error('The published release is not GitHub’s latest release.');
 return {published:true,version:release.version,url:published.html_url};
}

if(require.main===module){
 const action=process.argv[2]||'check';
 Promise.resolve().then(()=>action==='check'?{valid:true,version:checkRelease().version}:action==='publish'?publishRelease():Promise.reject(Error('Use check or publish.'))).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={checkRelease,releaseBody,localAssets,verifyReleaseAssets,findReleaseByTag};
