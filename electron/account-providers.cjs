// Provider-specific login and installation details live here. A future platform
// must supply a subscription verifier and runner adapter before it is enabled.
const providers=Object.freeze({
 Codex:{provider:'Codex',executable:'codex',model:'gpt-6.1-sol',write:true,installUrl:'https://developers.openai.com/codex/cli/',loginArgs:()=>['login','-c','forced_login_method="chatgpt"'],authHosts:['auth.openai.com'],authPath:/^\/oauth\/authorize$/},
 Claude:{provider:'Claude',executable:'claude',model:'opus',write:true,manualCode:true,installUrl:'https://code.claude.com/docs/en/setup',loginArgs:p=>['auth','login','--claudeai',...(p.email?['--email',p.email]:[])],authHosts:['claude.ai','claude.com'],authPath:/^\/(?:cai\/)?oauth\/authorize$/},
 Grok:{provider:'Grok',executable:'grok',model:'grok-4.6',write:true,installUrl:'https://docs.x.ai/build/overview',loginArgs:()=>['login','--oauth'],authHosts:['auth.x.ai','accounts.x.ai'],authPath:/\/(?:authorize|auth|sign-in)(?:\/|$)/},
});
function providerFor(name,platform=process.platform){if(!Object.hasOwn(providers,name))throw Error('此平台尚未接入。');const value=providers[name];return platform==='win32'?{...value,executable:value.executable+'.exe'}:value;}
function officialLoginUrl(provider,value){try{const url=new URL(value);const adapter=providerFor(provider);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&adapter.authHosts.includes(url.hostname)&&adapter.authPath.test(url.pathname)&&url.searchParams.has('state')?url.href:null;}catch{return null;}}
function providerCatalog(platform=process.platform,env=process.env){return Object.keys(providers).map(name=>{const {provider,executable,model,write,installUrl,manualCode=false}=providerFor(name,platform);let installed=false,resolved='';try{resolved=require('./discovery.cjs').resolveExecutable({provider,executable},env,platform);installed=true;}catch{}return {provider,executable:resolved||executable,model,write,installUrl,installed,manualCode};});}
module.exports={providerFor,providerCatalog,officialLoginUrl};
