// Display history only. Never used to authorize execution or redeem credits.
const fs=require('node:fs'),path=require('node:path');
class QuotaDisplay {
 constructor(root){this.file=path.join(root,'quota-display.json');try{this.values=JSON.parse(fs.readFileSync(this.file,'utf8'));}catch{this.values={};}}
 save(value){if(!value?.id)return;const keys=['id','email','remaining','windows','exhausted','source','status','checkedAt','resetsAt','period','resetCredits','extraUsageEnabled','authRequired','cached'];this.values[value.id]={...(this.values[value.id]?.email&&!value.authRequired?{email:this.values[value.id].email}:{}),...Object.fromEntries(keys.filter(k=>value[k]!==undefined).map(k=>[k,value[k]]))};this.flush();}
 failure(id,error){const previous=this.values[id];if(error.code!=='AUTH_REQUIRED'&&previous?.checkedAt&&Number.isFinite(previous.remaining))return {...previous,cached:true,status:error.message};return {id,authRequired:error.code==='AUTH_REQUIRED',status:error.message,remaining:null,windows:[],checkedAt:new Date().toISOString()};}
 clear(id){delete this.values[id];this.flush();}
 flush(){fs.mkdirSync(path.dirname(this.file),{recursive:true});const temp=this.file+'.tmp';fs.writeFileSync(temp,JSON.stringify(this.values));fs.renameSync(temp,this.file);}
 snapshot(profiles){return Object.fromEntries(profiles.filter(p=>this.values[p.id]&&!p.loginRequired).map(p=>[p.id,{...this.values[p.id],cached:true}]));}
}
module.exports={QuotaDisplay};
