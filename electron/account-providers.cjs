// Provider-specific login and installation details live here. A future platform
// must supply a subscription verifier and runner adapter before it is enabled.
const providers=Object.freeze({
 Codex:{provider:'Codex',executable:'codex.exe',model:'gpt-5.6-sol',write:true,installUrl:'https://developers.openai.com/codex/cli/',loginArgs:()=>['login','-c','forced_login_method="chatgpt"'],authHosts:['auth.openai.com'],authPath:/^\/oauth\/authorize$/},
 Claude:{provider:'Claude',executable:'claude.exe',model:'opus',write:true,manualCode:true,installUrl:'https://code.claude.com/docs/en/setup',loginArgs:p=>['auth','login','--claudeai',...(p.email?['--email',p.email]:[])],authHosts:['claude.ai','claude.com'],authPath:/^\/(?:cai\/)?oauth\/authorize$/},
 Grok:{provider:'Grok',executable:'grok.exe',model:'grok-4.6',write:false,installUrl:'https://docs.x.ai/build/overview',loginArgs:()=>['login','--oauth'],authHosts:['auth.x.ai','accounts.x.ai'],authPath:/\/(?:authorize|auth|sign-in)(?:\/|$)/},
});
function providerFor(name){if(!Object.hasOwn(providers,name))throw Error('此平台尚未接入。');return providers[name];}
function officialLoginUrl(provider,value){try{const url=new URL(value);const adapter=providerFor(provider);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&adapter.authHosts.includes(url.hostname)&&adapter.authPath.test(url.pathname)&&url.searchParams.has('state')?url.href:null;}catch{return null;}}
function providerCatalog(){return Object.values(providers).map(({provider,executable,model,write,installUrl,manualCode=false})=>{let installed=false,resolved='';try{resolved=require('./discovery.cjs').resolveExecutable({provider,executable});installed=true;}catch{}return {provider,executable:resolved||executable,model,write,installUrl,installed,manualCode};});}
module.exports={providerFor,providerCatalog,officialLoginUrl};
