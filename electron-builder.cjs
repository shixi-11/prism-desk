module.exports={
 appId:'org.prismdesk.desktop',productName:'Prism Desk',executableName:'Prism',
 directories:{output:'.local/installer'},electronDist:'node_modules/electron/dist',
 asar:false,npmRebuild:false,
 files:['package.json','dist/**/*','electron/**/*','src/assets/prism.ico','src/assets/prism-icon.png','src/locales/*.json','scripts/gemini-login.cjs','LICENSE','NOTICE'],
 win:{target:[{target:'nsis',arch:['x64']}],icon:'src/assets/prism.ico',artifactName:'Prism-Setup.exe',signAndEditExecutable:false,extraFiles:[{from:'.local/installer-runtime/PrismProcess.exe',to:'resources/app/runtime/PrismProcess.exe'}]},
 afterPack:async context=>{if(context.electronPlatformName==='win32')await require('rcedit')(require('node:path').join(context.appOutDir,'Prism.exe'),{icon:require('node:path').join(__dirname,'src/assets/prism.ico'),'version-string':{ProductName:'Prism Desk',FileDescription:'Prism Desk',InternalName:'Prism',OriginalFilename:'Prism.exe'},'file-version':require('./package.json').version,'product-version':require('./package.json').version});},
 mac:{target:['dmg'],icon:'src/assets/prism-icon.png',artifactName:'Prism-${arch}.dmg',identity:'-',hardenedRuntime:true,entitlements:'scripts/entitlements.mac.plist',entitlementsInherit:'scripts/entitlements.mac.plist',category:'public.app-category.developer-tools'},
 nsis:{oneClick:true,perMachine:false,allowElevation:false,runAfterFinish:true,deleteAppDataOnUninstall:false,createDesktopShortcut:true,createStartMenuShortcut:true,shortcutName:'Prism Desk',installerLanguages:['en_US','zh_CN'],language:'1033',include:'scripts/installer.nsh'},
 protocols:[{name:'Prism task links',schemes:['prism']}],
 publish:null
};
