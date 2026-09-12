export function localPathText(value){
 if(typeof value!=='string')return null;
 const text=value.trim();if(!text||/[\r\n]/.test(text))return null;
 return /^(?:\/?[a-z]:[\\/]|file:\/\/\/|\/(?!\/))/i.test(text)?text:null;
}
