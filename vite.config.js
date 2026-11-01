import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export default defineConfig({ base: './', build: { outDir: 'dist' },plugins:[{
 name:'preview-theme-csp',
 transformIndexHtml(html){
  // HTML parsing normalizes script newlines, including on Windows checkouts.
  const script=readFileSync(new URL('./src/preview-theme-frame.js',import.meta.url),'utf8').replace(/\r\n?/g,'\n');
  const hash=createHash('sha256').update(script).digest('base64');
  if(!html.includes("script-src 'self';"))throw Error('Host script policy changed; review the preview theme hash allowance.');
  return html.replace("script-src 'self';",`script-src 'self' 'sha256-${hash}';`);
 }
}] });
