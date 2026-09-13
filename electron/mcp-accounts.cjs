const {execFile}=require('node:child_process');
function connection(input){
 const name=String(input?.name||'').trim();if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(name))throw Error('Invalid MCP name');
 let u;try{u=new URL(input.url);}catch{throw Error('Invalid MCP URL');}
 if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search)throw Error('Use an HTTPS URL without credentials, query or fragment');
 return {name,url:u.href};
}
class McpAccounts{
 constructor({profile,environment,executable,execute=execFile}){Object.assign(this,{profile,environment,executable,execute});this.active=new Map();}
 account(id){const p=this.profile(id);if(p.provider!=='Codex'||p.disabled)throw Error('MCP connections require an enabled Codex account');return p;}
 command(p,args,timeout=20000){return new Promise((resolve,reject)=>{const proc=this.execute(this.executable(p),['mcp',...args],{env:this.environment(p),cwd:p.home,windowsHide:true,encoding:'utf8',timeout,maxBuffer:2*1024*1024},(error,stdout)=>{if(error)return reject(Error(error.killed?'MCP operation cancelled or timed out':'MCP operation failed; check the CLI connection and try again'));resolve(stdout);});const job=this.active.get(p.id);if(job)job.process=proc;});}
 async list(id){const p=this.account(id);if(this.active.has(id))return {busy:true,servers:[]};return {busy:false,servers:await this.read(p)};}
 async read(p){const rows=JSON.parse(await this.command(p,['list','--json']));if(!Array.isArray(rows))throw Error('Invalid MCP response');return rows.map(x=>({name:x.name,enabled:x.enabled!==false,auth:x.auth_status||'unknown'}));}
 async change(id,action,input){const p=this.account(id);if(this.active.has(id))throw Error('MCP operation already running');if(!['add','login'].includes(action))throw Error('Invalid MCP action');const value=action==='add'?connection(input):{name:String(input?.name||'')};if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value.name))throw Error('Invalid MCP name');this.active.set(id,{});try{const rows=await this.read(p);if(action==='add'&&rows.some(x=>x.name===value.name))throw Error('MCP name already exists; use the sign-in button');if(action==='login'&&!rows.some(x=>x.name===value.name&&x.enabled))throw Error('Add and enable the MCP connection first');await this.command(p,action==='add'?['add',value.name,'--url',value.url]:['login',value.name],180000);return {busy:false,servers:await this.read(p)};}finally{this.active.delete(id);}}
 cancel(id){this.account(id);this.active.get(id)?.process?.kill();return true;}
 close(){for(const id of this.active.keys())this.cancel(id);}
}
module.exports={McpAccounts,connection};
