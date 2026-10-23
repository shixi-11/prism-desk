function pin(task){
 if(task.modelDefaults?.Codex)return false;
 task.modelDefaults={...task.modelDefaults,Codex:require('./model-preferences.cjs').defaults('Codex')};
 const last=task.lastExecution;
 if(last?.profile&&last.model&&last.effort){
  const previous=task.modelSettings?.[last.profile]||{};
  task.modelSettings={...task.modelSettings,[last.profile]:{model:last.model,effort:last.effort,...(last.serviceTier?{serviceTier:last.serviceTier}:{}),...previous}};
 }
 return true;
}
module.exports={pin};
