// This exact script is hash-allowed by the host CSP. No document scripts gain
// permission, and the preview keeps its opaque sandbox origin.
(()=>{
 if(window.parent===window)return;
 window.addEventListener('message',event=>{
  if(event.source!==window.parent||event.data?.type!=='prism:preview-theme')return;
  const theme=event.data.theme;
  if(!theme||!['light','dark'].includes(theme.scheme))return;
  for(const key of ['background','color','accent','border'])if(typeof theme[key]!=='string'||!CSS.supports('color',theme[key]))return;
  for(const key of ['background','color','accent','border','scheme'])document.documentElement.style.setProperty('--prism-preview-'+key,theme[key]);
 });
})();
