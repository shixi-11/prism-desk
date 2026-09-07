const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {fileURLToPath}=require('node:url');
const images={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml'};
const textTypes=new Set(['.md','.markdown','.txt','.json','.js','.jsx','.ts','.tsx','.css','.html','.htm','.py','.c','.cpp','.h','.rs','.go','.yaml','.yml','.toml','.xml','.csv','.log','.ps1','.sh']);
function targetPath(value,cwd){
 if(typeof value!=='string'||!value.trim())throw Error('请选择文件');
 let input=value.trim();
 if(/^https?:\/\//i.test(input)){const u=new URL(input);if(u.username||u.password)throw Error('不支持此地址');return {url:u.href};}
 if(/^file:/i.test(input))input=fileURLToPath(input);
 else {try{input=decodeURIComponent(input);}catch{}}
 if(/^\/[a-z]:[\\/]/i.test(input))input=input.slice(1);
 input=input.replace(/:\d+(?::\d+)?$/,'');
 if(/^[a-z][a-z0-9+.-]*:/i.test(input)&&!path.isAbsolute(input))throw Error('不支持此地址');
 if(input.startsWith('\\\\'))throw Error('请选择本机文件');
 return {path:path.resolve(cwd,input)};
}
async function readPreview(value,cwd){
 const target=targetPath(value,cwd);if(target.url)return {kind:'web',url:target.url,name:target.url};
 const file=await fs.realpath(target.path),stat=await fs.stat(file),ext=path.extname(file).toLowerCase();
 if(!stat.isFile())throw Error('请选择文件');
 if(!images[ext]&&ext!=='.pdf'&&!textTypes.has(ext))throw Error('暂不支持预览此格式');
 if(stat.size>(images[ext]||ext==='.pdf'?20:2)*1024*1024)throw Error('文件过大，请在本机应用中打开');
 const bytes=await fs.readFile(file);const base={path:file,name:path.basename(file),version:crypto.createHash('sha256').update(bytes).digest('hex')};
 if(images[ext]||ext==='.pdf')return {...base,kind:ext==='.pdf'?'pdf':'image',data:`data:${images[ext]||'application/pdf'};base64,${bytes.toString('base64')}`};
 return {...base,kind:['.md','.markdown'].includes(ext)?'markdown':['.html','.htm'].includes(ext)?'html':'text',text:bytes.toString('utf8')};
}
async function savePreview(file,text,version){
 if(typeof text!=='string'||Buffer.byteLength(text)>2*1024*1024)throw Error('文件过大，请在本机应用中打开');
 const current=await readPreview(file,path.dirname(file));
 if(!['markdown','html','text'].includes(current.kind))throw Error('暂不支持编辑此格式');
 if(current.version!==version)throw Error('文件已在外部修改，请刷新后再编辑');
 await fs.writeFile(current.path,text,'utf8');return readPreview(current.path,path.dirname(current.path));
}
module.exports={targetPath,readPreview,savePreview};
