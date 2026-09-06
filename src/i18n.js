import en from './locales/en.json';
import tw from './locales/zh-TW.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ar from './locales/ar.json';
export const languages = [{id:'zh',name:'简体中文'},{id:'zh-TW',name:'繁體中文'},{id:'en',name:'English'},{id:'ja',name:'日本語'},{id:'ko',name:'한국어'},{id:'es',name:'Español'},{id:'fr',name:'Français'},{id:'de',name:'Deutsch'},{id:'ar',name:'العربية'}];
const catalogs = {en,'zh-TW':tw,ja,ko,es,fr,de,ar};
let language='zh';
export function setLanguage(value){language=languages.some(l=>l.id===value)?value:'zh';document.documentElement.lang=language==='zh'?'zh-CN':language;document.documentElement.dir=language==='ar'?'rtl':'ltr';}
export const locale=()=>language==='zh'?'zh-CN':language;
export function tr(value,params={}){
 if(typeof value!=='string')return value;
 const dictionary=catalogs[language]||{};
 let result=dictionary[value]||value;
 if(!dictionary[value]) for(const [pattern,key] of [[/团队-(\d+)/g,'团队-{n}'],[/个人-(\d+)/g,'个人-{n}'],[/^(\d+) 张$/,'{n} 张'],[/^(\d+) 条记录$/,'{n} 条记录'],[/^(\d+) 小时$/,'{n} 小时']]) result=result.replace(pattern,(_,n)=>(dictionary[key]||key).replace('{n}',n));
 return result.replace(/\{(\w+)\}/g,(match,key)=>params[key]??match);
}
