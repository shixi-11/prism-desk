const {randomUUID}=require('node:crypto');
const {claudeInput}=require('./attachments.cjs');
class ClaudeInput {
 constructor(proc){this.proc=proc;this.pending=new Map();this.closed=false;proc.once('close',()=>this.fail(Error('Claude 输入连接已结束，请核对消息是否送达。')));proc.stdin.on('error',error=>this.fail(error));}
 fail(error){this.closed=true;for(const entry of this.pending.values()){clearTimeout(entry.timer);entry.reject(error);}this.pending.clear();}
 write(text,images=[],ack=false){
  if(this.closed||this.proc.stdin.destroyed||this.proc.stdin.writableEnded)return ack?Promise.resolve(false):false;
  const message=JSON.parse(claudeInput(text,images));message.uuid=randomUUID();
  let response; if(ack)response=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.fail(Error('Claude 尚未确认接收补充消息，请核对记录后重试。'));this.proc.stdin.end();},1800000);this.pending.set(message.uuid,{resolve,reject,timer});});
  try{this.proc.stdin.write(JSON.stringify(message)+'\n');}catch(error){this.fail(error);if(!ack)throw error;}
  return ack?response:true;
 }
 receive(message){
  if(message.type==='user'&&this.pending.has(message.uuid)){const entry=this.pending.get(message.uuid);this.pending.delete(message.uuid);clearTimeout(entry.timer);entry.resolve(true);}
  if(message.type==='result'){
   if(message.is_error)this.fail(Error('Claude 执行失败，补充消息未确认，请核对记录。'));
   if(!this.pending.size){this.closed=true;this.proc.stdin.end();}
  }
 }
}
module.exports={ClaudeInput};
