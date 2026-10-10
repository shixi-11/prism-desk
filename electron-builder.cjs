module.exports={
 // Keep the physical bundle/install name for upgrades; localize public names separately.
 appId:'org.prismdesk.desktop',productName:'Prism Desk',executableName:'Prism',
 directories:{output:'.local/installer'},electronDist:'node_modules/electron/dist',
 asar:false,npmRebuild:false,
 files:['package.json','dist/**/*','electron/**/*','src/assets/prism.ico','src/assets/prism-icon.png','src/locales/*.json','scripts/gemini-login.cjs','LICENSE','NOTICE'],
 win:{target:[{target:'nsis',arch:['x64']}],icon:'src/assets/prism.ico',artifactName:'Prism-Setup.exe',signAndEditExecutable:false,extraFiles:[{from:'.local/installer-runtime/PrismProcess.exe',to:'resources/app/runtime/PrismProcess.exe'}]},
 afterPack:async context=>{if(context.electronPlatformName==='win32')await require('rcedit')(require('node:path').join(context.appOutDir,'Prism.exe'),{icon:require('node:path').join(__dirname,'src/assets/prism.ico'),'version-string':{ProductName:'Prism',FileDescription:'Prism',InternalName:'Prism',OriginalFilename:'Prism.exe'},'file-version':require('./package.json').version,'product-version':require('./package.json').version});await require('./scripts/localize-mac.cjs').afterPack(context);},
 mac:{target:['dmg'],icon:'src/assets/prism-icon.png',artifactName:'Prism-${arch}.dmg',identity:'-',sign:options=>require('@electron/osx-sign').signAsync({...options,identity:'-',identityValidation:false,preAutoEntitlements:false,preEmbedProvisioningProfile:false}),hardenedRuntime:true,entitlements:'scripts/entitlements.mac.plist',entitlementsInherit:'scripts/entitlements.mac.plist',category:'public.app-category.developer-tools',extendInfo:{CFBundleDisplayName:'Prism',CFBundleDevelopmentRegion:'en',CFBundleLocalizations:['en','zh-Hans','zh-Hant']}},
 nsis:{oneClick:true,perMachine:false,allowElevation:false,runAfterFinish:true,deleteAppDataOnUninstall:false,createDesktopShortcut:true,createStartMenuShortcut:true,shortcutName:'Prism',installerLanguages:['en_US','zh_CN','zh_TW'],displayLanguageSelector:true,include:'scripts/installer.nsh'},
 protocols:[{name:'Prism task links',schemes:['prism']}],
 publish:null
};
