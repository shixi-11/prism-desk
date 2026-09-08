export function releaseNotes(body='',language='en'){
 const lang=language.startsWith('zh')?'zh':'en';
 const match=body.match(new RegExp(`<!-- prism:notes:${lang} -->\\s*([\\s\\S]*?)\\s*<!-- /prism:notes:${lang} -->`));
 return match?.[1]?.trim()||body;
}
