const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
(async()=>{
 if(!['win32','darwin'].includes(process.platform)||!['x64','arm64'].includes(process.arch)||(process.platform==='win32'&&process.arch!=='x64'))throw Error('Build on Windows x64, macOS arm64 or macOS x64.');
 require('./release.cjs').checkRelease();
 process.env.PATH=path.join(root,'node_modules','.bin')+path.delimiter+process.env.PATH;
 if(process.platform==='win32'){
  const runtime=path.join(root,'.local','installer-runtime');fs.mkdirSync(runtime,{recursive:true});
  cp.execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts/build-host.ps1'),'-OutputDirectory',runtime],{cwd:root,stdio:'inherit',windowsHide:true});
 }
 await require('electron-builder').build({projectDir:root,config:require('../electron-builder.cjs'),publish:'never',effectiveOptionComputed:async options=>{
  // Change NSIS display text without changing the stable product/bundle install identity.
  if(process.platform==='win32'&&Array.isArray(options)&&options[0]?.APP_ID==='org.prismdesk.desktop')options[0].PRODUCT_NAME='$(prismName)';
  return false;
 }});
 console.log(JSON.stringify({installer:path.join(root,'.local/installer',process.platform==='win32'?'Prism-Setup.exe':`Prism-${process.arch}.dmg`),version:require('../package.json').version}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
