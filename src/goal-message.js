export function goalProse(text=''){
 return text.replace(/```prism-goal\s*\n([\s\S]*?)```/g,(block,json)=>{
  try{const {goal}=JSON.parse(json);return typeof goal==='string'&&goal.trim()&&goal.length<=4000?'':block;}catch{return block;}
 }).trim();
}
