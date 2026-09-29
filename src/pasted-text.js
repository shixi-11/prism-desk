export const isLongPaste=text=>typeof text==='string'&&(text.length>=1000||text.split(/\r?\n/).length>=15);
export const pastedTitle=text=>text.split(/\r?\n/).map(line=>line.trim()).find(Boolean)?.slice(0,80)||'';
export function messageText(text,cards=[]){return [...cards.map(card=>card.text),text].filter(value=>value.length).join('\n\n');}
export function pasteCard(text){return {id:crypto.randomUUID(),text,title:pastedTitle(text)};}
