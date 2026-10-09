const VERSION=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const REPO='shixi-11/prism-desk';
function compareVersions(a,b){
 if(!VERSION.test(a)||!VERSION.test(b))throw Error('Invalid release version');
 const left=a.split('.').map(Number),right=b.split('.').map(Number);
 for(let i=0;i<3;i++)if(left[i]!==right[i])return left[i]>right[i]?1:-1;
 return 0;
}
function releaseInfo(value){
 if(!value||value.draft||value.prerelease||!/^v/.test(value.tag_name)||!VERSION.test(value.tag_name.slice(1))||typeof value.body!=='string'||!value.body.trim())throw Error('正式版本信息不完整');
 const version=value.tag_name.slice(1),installers={};
 for(const [key,name] of Object.entries({'windows-x64':'Prism-Setup.exe','mac-arm64':'Prism-arm64.dmg','mac-x64':'Prism-x64.dmg'})){
  const url=`https://github.com/${REPO}/releases/download/${value.tag_name}/${name}`;
  const asset=value.assets?.find(a=>a.name===name&&a.browser_download_url===url&&Number.isSafeInteger(a.size)&&a.size>0&&a.size<500*1024**2&&/^sha256:[a-f0-9]{64}$/.test(a.digest||''));
  if(asset)installers[key]={url,size:asset.size,sha256:asset.digest.slice(7)};
 }
 return {version,tag:value.tag_name,body:value.body.slice(0,30000),publishedAt:value.published_at||null,installers,...(installers['windows-x64']?{installer:installers['windows-x64']}:{})};
}
async function latestRelease(){
 const response=await fetch(`https://api.github.com/repos/${REPO}/releases/latest`,{headers:{Accept:'application/vnd.github+json','User-Agent':'Prism-updater'},signal:AbortSignal.timeout(20000)});
 if(response.status===404)return null;
 if(!response.ok)throw Error(`版本检查失败（HTTP ${response.status}）`);
 return releaseInfo(await response.json());
}
module.exports={VERSION,REPO,compareVersions,releaseInfo,latestRelease};
