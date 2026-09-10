const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const waitBuffer=new Int32Array(new SharedArrayBuffer(4));
function createAtomicWriter(io=fs,wait=ms=>Atomics.wait(waitBuffer,0,0,ms)){
 return function atomic(file,data){
  const text=JSON.stringify(data,null,2);
  io.mkdirSync(path.dirname(file),{recursive:true});
  const temp=file+'.'+process.pid+'.'+crypto.randomUUID()+'.tmp';
  io.writeFileSync(temp,text,{flag:'wx'});
  for(let attempt=0;;attempt++){
   try{io.renameSync(temp,file);return;}
   catch(error){
    if(['EPERM','EACCES','EBUSY'].includes(error.code)&&attempt<5){wait(10*2**attempt);continue;}
    // Keep both the previous complete file and the unsaved replacement.
    error.recoveryPath=temp;
    throw error;
   }
  }
 };
}
module.exports={atomic:createAtomicWriter(),createAtomicWriter};
