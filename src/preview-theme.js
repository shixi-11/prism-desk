import themeScript from './preview-theme-frame.js?raw';

export function previewTheme(){
 const root=document.documentElement,style=getComputedStyle(root);
 return {...Object.fromEntries(Object.entries({background:'--surface',color:'--text',accent:'--accent',border:'--line'}).map(([key,name])=>[key,style.getPropertyValue(name).trim()])),scheme:root.dataset.theme==='light'?'light':'dark'};
}

export function htmlPreviewDocument(text,theme){
 const doc=new DOMParser().parseFromString(text,'text/html');
 const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';
 policy.content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:";
 doc.head.prepend(policy);
 const style=doc.createElement('style');
 style.textContent=`:root{${Object.entries(theme).map(([key,value])=>'--prism-preview-'+key+':'+value+';').join('')}color-scheme:var(--prism-preview-scheme);scrollbar-color:var(--prism-preview-accent) var(--prism-preview-background)}
html,body{background-color:var(--prism-preview-background)!important;color:var(--prism-preview-color)!important}
a:any-link{color:var(--prism-preview-accent)!important}hr{border-color:var(--prism-preview-border)!important}`;
 doc.head.append(style);
 for(const element of [doc.documentElement,doc.body]){
  element.style.setProperty('background-color','var(--prism-preview-background)','important');
  element.style.setProperty('color','var(--prism-preview-color)','important');
 }
 const script=doc.createElement('script');script.textContent=themeScript.replace(/\r\n?/g,'\n');doc.head.append(script);
 return (doc.doctype?new XMLSerializer().serializeToString(doc.doctype):'')+doc.documentElement.outerHTML;
}
