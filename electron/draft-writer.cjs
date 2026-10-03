const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function encode(value){const text=JSON.stringify(value);if(!value||typeof value!=='object'||Array.isArray(value)||text.length>4*1024*1024)throw Error('草稿过大');return text;}
class DraftWriter {
 constructor(){this.generations=new Map();}
 next(file){const generation=(this.generations.get(file)||0)+1;this.generations.set(file,generation);return generation;}
 async save(file,value){
  const text=encode(value),generation=this.next(file),temp=file+'.'+crypto.randomUUID()+'.tmp';
  await fs.promises.mkdir(path.dirname(file),{recursive:true});
  try{await fs.promises.writeFile(temp,text,{flag:'wx'});if(this.generations.get(file)===generation)fs.renameSync(temp,file);}
  finally{await fs.promises.rm(temp,{force:true});}
  return true;
 }
 flush(file,value){const text=encode(value);this.next(file);require('./update-bootstrap.cjs').write(file,JSON.parse(text));return true;}
}
module.exports={DraftWriter};
