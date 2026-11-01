const {dependency}=require('./script-utils.cjs');
const {_electron}=dependency('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');

(async()=>{
 const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(root,'.local','preview-theme-'));
 const output=path.join(root,'output','playwright');fs.mkdirSync(output,{recursive:true});
 const file=path.join(dir,'reading.html'),config=path.join(dir,'config.json');
 const source='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>body{margin:0;background:#faf9f6;color:#25231f;font-family:serif}main{max-width:720px;margin:auto;padding:32px}h1{font-size:25px}p{font-size:20px;line-height:1.95}a{color:#4c5c56}hr{border:0;border-top:1px solid #bdb8ae}</style><script>window.untrustedPreviewScript=true;</script></head><body style="background:white!important;color:black!important"><main><h1>文档预览</h1><input aria-label="阅读备注" value=""><a href="#end">末尾</a><hr>'+Array.from({length:80},(_,i)=>`<p>第${i+1}段：预览的底色与文字跟随当前主题，保留原有字号、行距和排版。</p>`).join('')+'<p id="end">末尾</p></main></body></html>';
 fs.writeFileSync(file,source);fs.writeFileSync(path.join(dir,'notes.md'),'# Markdown preview\n\nUnchanged formatting.');
 fs.writeFileSync(config,JSON.stringify({profiles:[{id:'preview-fixture',provider:'Codex',name:'Fixture',home:dir,executable:path.join(dir,'missing.exe'),model:'gpt-6.1-sol',write:true}],assistant:{path:'',instructions:''},skillsPath:'',apps:{}}));
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><button onclick="this.textContent=\'Running\'">Start</button>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const app=await _electron.launch({executablePath:require('electron'),args:[root],env:{...process.env,PRISM_TEST_HIDE:'1',PRISM_TEST_DATA:dir,PRISM_CONFIG:config}});
 try{
  const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const screenshot=async name=>{const capture=()=>app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG().toString('base64'));await capture();await page.waitForTimeout(250);const pixels=await capture();fs.writeFileSync(path.join(output,name),Buffer.from(pixels,'base64'));};
  await page.getByLabel('Switch language').waitFor();
  const task=await page.evaluate(async dir=>{await window.prism.language('zh');await window.prism.theme('dark');return window.prism.create({title:'Preview theme',cwd:dir,profile:'preview-fixture'});},dir);
  fs.appendFileSync(path.join(dir,'tasks',task.id,'events.jsonl'),JSON.stringify({id:'preview-theme',type:'assistant',at:new Date().toISOString(),text:'[阅读预览](reading.html)'})+'\n');
  await page.goto(page.url().split('?')[0]+'?task='+task.id);await page.getByRole('button',{name:'阅读预览',exact:true}).click();
  const panel=page.locator('.preview-panel'),frame=page.frameLocator('.preview-content iframe');
  await frame.getByRole('heading',{name:'文档预览'}).waitFor();
  const palette=()=>page.evaluate(()=>{const s=getComputedStyle(document.documentElement),probe=document.createElement('span');document.body.append(probe);const color=name=>{probe.style.color=s.getPropertyValue(name);return getComputedStyle(probe).color;};const value={background:color('--surface'),color:color('--text'),accent:color('--accent')};probe.remove();return value;});
  const checkColors=async()=>{const expected=await palette();await frame.locator('body').evaluate((body,expected)=>new Promise((resolve,reject)=>{let checks=0;const check=()=>{const s=getComputedStyle(body);if(s.backgroundColor===expected.background&&s.color===expected.color)return resolve();if(++checks>100)return reject(Error(JSON.stringify({expected,actual:{background:s.backgroundColor,color:s.color}})));setTimeout(check,20);};check();}),expected);assert.equal(await frame.locator('a').evaluate(a=>getComputedStyle(a).color),expected.accent);};
  await checkColors();
  assert.equal(await frame.locator('p').first().evaluate(p=>getComputedStyle(p).fontSize),'20px');
  assert.equal(await frame.locator('p').first().evaluate(p=>getComputedStyle(p).lineHeight),'39px');
  assert.equal(await frame.locator('html').evaluate(el=>el.ownerDocument.compatMode),'CSS1Compat');
  assert.equal(await panel.locator('iframe').getAttribute('sandbox'),'allow-scripts');
  assert.equal(await frame.locator('body').evaluate(()=>typeof window.prism),'undefined');
  assert.equal(await frame.locator('body').evaluate(()=>typeof window.untrustedPreviewScript),'undefined');
  await frame.getByLabel('阅读备注').fill('保留正在阅读的文档');
  await frame.locator('body').evaluate(()=>{window.previewDocumentIdentity='retained';window.scrollTo(0,750);});
  const scroll=await frame.locator('body').evaluate(()=>window.scrollY);assert.ok(scroll>0);
  await screenshot('preview-theme-dark.png');
  for(const theme of ['light','dark']){
   // The preview overlays the appearance toolbar. Activate its actual React
   // handler without closing (and thereby replacing) the document under test.
   await page.getByRole('button',{name:theme==='light'?'白天':'黑夜',exact:true}).dispatchEvent('click');await checkColors();
   assert.equal(await frame.getByLabel('阅读备注').inputValue(),'保留正在阅读的文档');
   assert.equal(await frame.locator('body').evaluate(()=>window.previewDocumentIdentity),'retained');
   assert.equal(await frame.locator('body').evaluate(()=>window.scrollY),scroll);
   if(theme==='light')await screenshot('preview-theme-light.png');
  }
  await frame.locator('body').evaluate(()=>window.postMessage({type:'prism:preview-theme',theme:{background:'red',color:'red',accent:'red',border:'red',scheme:'light'}},'*'));
  await checkColors();assert.equal(fs.readFileSync(file,'utf8'),source);
  await panel.getByRole('button',{name:'编辑',exact:true}).click();assert.equal(await panel.getByLabel('文件内容').inputValue(),source);
  assert.equal(await panel.getByRole('button',{name:'保存',exact:true}).isDisabled(),true);
  await panel.getByRole('button',{name:'预览',exact:true}).click();await checkColors();
  await panel.getByLabel('文件路径或网址').fill(path.join(dir,'notes.md'));await panel.getByRole('button',{name:'打开',exact:true}).click();await panel.getByRole('heading',{name:'Markdown preview'}).waitFor();
  await panel.getByLabel('文件路径或网址').fill(`http://127.0.0.1:${server.address().port}/`);await panel.getByRole('button',{name:'打开',exact:true}).click();
  await frame.getByRole('button',{name:'Start',exact:true}).dispatchEvent('click');await frame.getByRole('button',{name:'Running',exact:true}).waitFor();
  assert.equal(await panel.locator('iframe').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
  assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().some(w=>w.isVisible())),false);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,checks:['html-theme','live-theme-change','scroll-and-input-retained','source-unchanged','opaque-sandbox','spoofed-message-rejected','markdown','website-design-preserved','hidden-windows'],output}));
 }finally{await app.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
