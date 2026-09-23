const scheme='prism';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function taskLink(id){if(typeof id!=='string'||!uuid.test(id))throw Error('Invalid task ID');return scheme+'://task/'+id;}
function taskId(value){if(typeof value!=='string'||!/^prism:\/\/task\/[a-f0-9-]+$/i.test(value))return null;try{const u=new URL(value),id=u.pathname.slice(1);return uuid.test(id)?id.toLowerCase():null;}catch{return null;}}
function fromArgs(args){return args.map(taskId).find(Boolean)||null;}
module.exports={scheme,taskLink,taskId,fromArgs};
