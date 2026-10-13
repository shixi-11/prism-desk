const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
test('native source launcher opens the app without shortcut arguments and preserves explicit paths and task links',{skip:process.platform!=='win32'},async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'Prism 中文 launcher '));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const runtime=path.join(root,'runtime'),desktop=path.join(runtime,'desktop');fs.mkdirSync(desktop,{recursive:true});
 fs.mkdirSync(path.join(root,'electron'));fs.writeFileSync(path.join(root,'electron','main.cjs'),'// fixture');
 const compiler=path.join(process.env.WINDIR,'Microsoft.NET','Framework64','v4.0.30319','csc.exe');
 const launcher=path.join(runtime,'PrismLauncher.exe'),capture=path.join(root,'capture.cs');
 const output=path.join(desktop,'arguments.txt');
 fs.writeFileSync(capture,'using System;using System.IO;class Capture{static void Main(string[] args){File.WriteAllLines(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"arguments.txt"),args);}}');
 for(const [source,target] of [[path.resolve(__dirname,'../scripts/PrismLauncher.cs'),launcher],[capture,path.join(desktop,'Prism.exe')]])cp.execFileSync(compiler,['/nologo','/target:winexe','/out:'+target,source],{windowsHide:true,timeout:30000});
 async function launch(args){
  if(fs.existsSync(output))fs.unlinkSync(output);
  cp.execFileSync(launcher,args,{windowsHide:true,timeout:10000,cwd:os.tmpdir()});
  const deadline=Date.now()+5000;while(!fs.existsSync(output)&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,50));
  return fs.readFileSync(output,'utf8').replace(/^\uFEFF/,'').trimEnd().split(/\r?\n/);
 }
 assert.deepEqual(await launch([]),[root,'--user-data-dir='+path.join(root,'.local','desktop-runtime')]);
 const data='--user-data-dir='+path.join(root,'个人 data')+'\\',link='prism://task/example?title="中文 & spaces"';
 assert.deepEqual(await launch([root,data,link]),[root,data,link]);
});
