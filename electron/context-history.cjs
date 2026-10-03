const fs=require('node:fs/promises'),path=require('node:path');
const files=new Map();
async function findSession(root,id){
 const key=root+'|'+id;if(files.has(key))return files.get(key);
 const stack=[root];let visited=0;
 while(stack.length&&visited++<2000){const dir=stack.pop();let entries;try{entries=await fs.readdir(dir,{withFileTypes:true});}catch{continue;}
  for(const entry of entries){if(entry.isFile()&&entry.name.endsWith('-'+id+'.jsonl')){const file=path.join(dir,entry.name);files.set(key,file);return file;}if(entry.isDirectory())stack.push(path.join(dir,entry.name));}
 }
 return null;
}
async function codexHistory(profile,id){
 if(profile?.provider!=='Codex'||typeof profile.home!=='string'||! /^[a-f0-9-]{36}$/i.test(id||''))return null;
 const file=await findSession(path.join(profile.home,'sessions'),id);if(!file)return null;
 let handle;try{handle=await fs.open(file,'r');const stat=await handle.stat(),bytes=Math.min(stat.size,4*1024*1024),start=stat.size-bytes,buffer=Buffer.alloc(bytes);await handle.read(buffer,0,bytes,start);
  const lines=buffer.toString('utf8').split('\n');if(start)lines.shift();
  for(let i=lines.length-1;i>=0;i--){if(!lines[i].includes('token_count'))continue;let record;try{record=JSON.parse(lines[i]);}catch{continue;}const info=record.payload?.type==='token_count'&&record.payload.info;if(!info?.last_token_usage)continue;
   const last=info.last_token_usage;const value=require('./context-usage.cjs').codexContext({tokenUsage:{last:{totalTokens:last.total_tokens,inputTokens:last.input_tokens,outputTokens:last.output_tokens,cachedInputTokens:last.cached_input_tokens,reasoningOutputTokens:last.reasoning_output_tokens},modelContextWindow:info.model_context_window}});
   return {...value,sessionId:id,source:'codex-session-history',checkedAt:record.timestamp||stat.mtime.toISOString()};
  }
 }catch{return null;}finally{await handle?.close();}return null;
}
module.exports={codexHistory};
