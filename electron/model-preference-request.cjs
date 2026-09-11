const fs=require('node:fs');
function apply(store,profiles,file){
 if(!fs.existsSync(file))return 0;
 const request=JSON.parse(fs.readFileSync(file,'utf8'));if(request.applied)return 0;
 if(request.model!=='gpt-6-astra'||request.effort!=='low'||!Array.isArray(request.profileIds))throw Error('Invalid model preference request');
 const ids=profiles.filter(p=>p.provider==='Codex'&&request.profileIds.includes(p.id)).map(p=>p.id);let count=0;
 for(const task of [...store.list(),...store.list('archived')]){
  task.modelSettings={...task.modelSettings};for(const id of ids)task.modelSettings[id]={...task.modelSettings[id],model:request.model,effort:request.effort};
  store.save(task);count++;
 }
 require('./atomic-file.cjs').atomic(file,{...request,applied:true});return count;
}
module.exports={apply};
