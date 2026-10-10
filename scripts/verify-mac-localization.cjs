const assert=require('node:assert/strict'),path=require('node:path'),{execFileSync}=require('node:child_process');
if(process.platform!=='darwin')throw Error('Run this check on macOS.');
const bundle=path.resolve(process.argv[2]);
const script=`ObjC.import('Foundation');
function run(args){
 $.NSUserDefaults.standardUserDefaults.setObjectForKey($.NSArray.arrayWithObject(args[1]), 'AppleLanguages');
 var bundle=$.NSBundle.bundleWithPath(args[0]);
 return ObjC.unwrap(bundle.localizedInfoDictionary.objectForKey('CFBundleDisplayName'));
}`;
for(const [language,expected] of [['en','Prism'],['zh-Hans','棱镜'],['zh-Hant','棱镜']]){
 execFileSync('/usr/bin/plutil',['-lint',path.join(bundle,'Contents','Resources',language+'.lproj','InfoPlist.strings')],{stdio:'inherit'});
 const actual=execFileSync('/usr/bin/osascript',['-l','JavaScript','-e',script,bundle,language],{encoding:'utf8'}).trim();
 assert.equal(actual,expected,'Foundation must resolve the localized macOS bundle name');
}
console.log('Verified English and Chinese macOS bundle names.');
