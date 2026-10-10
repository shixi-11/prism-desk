const fs=require('node:fs'),path=require('node:path');
const {isSupportedLanguage}=require('./localization.cjs');
function language(value){
 if(isSupportedLanguage(value))return value;
 const locale=String(value||'').replace(/_/g,'-').toLowerCase();
 if(locale.startsWith('zh'))return /(?:tw|hk|hant)/.test(locale)?'zh-TW':'zh';
 const base=locale.split('-')[0];return isSupportedLanguage(base)?base:'en';
}
function name(lang){return language(lang).startsWith('zh')?'棱镜':'Prism';}
function settings(saved={}, {locale='en',installDirectory}={}){
 if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};
 if(isSupportedLanguage(saved.language))return saved;
 let selected;
 if(installDirectory){try{selected={'1033':'en','2052':'zh','1028':'zh-TW'}[fs.readFileSync(path.join(installDirectory,'prism-install-language.txt'),'utf8').trim()];}catch{}}
 return {...saved,language:selected||language(locale)};
}
module.exports={language,name,settings};
