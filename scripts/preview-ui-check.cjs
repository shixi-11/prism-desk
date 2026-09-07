const {dependency}=require('./script-utils.cjs');const {_electron}=dependency('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),dir=path.join(root,'.local','preview-ui',String(Date.now()));fs.mkdirSync(dir,{recursive:true});
 const config=path.join(dir,'config.json');fs.writeFileSync(config,JSON.stringify({profiles:[{id:'codex-test',provider:'Codex',name:'个人-1',home:dir,executable:path.join(dir,'missing-cli.exe'),model:'test',write:true}],assistant:{path:'',instructions:''},skillsPath:'',apps:{}}));
 fs.writeFileSync(path.join(dir,'notes.md'),'# Preview document\n\nA saved document.');
 fs.writeFileSync(path.join(dir,'page.html'),'<h1>Static preview</h1>');
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 const content='BT /F1 24 Tf 40 240 Td (Prism PDF preview) Tj ET';objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
 let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${object}\nendobj\n`;});const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;fs.writeFileSync(path.join(dir,'sample.pdf'),pdf);
 fs.writeFileSync(path.join(dir,'pixel.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jE1sAAAAASUVORK5CYII=','base64'));
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<button onclick="this.textContent=\'Game running\'">Start game</button>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
 const app=await _electron.launch({executablePath:path.join(root,'node_modules/electron/dist/electron.exe'),args:[root],env:{...process.env,PRISM_TEST_HIDE:'1',PRISM_TEST_DATA:dir,PRISM_CONFIG:config}});
 try{
  const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log(m.text().slice(0,600));});await page.getByLabel('Switch language').waitFor();assert.equal(await page.locator('.language-control svg').count(),1);
  const task=await page.evaluate(dir=>window.prism.create({title:'Preview task',cwd:dir,profile:'codex-test'}),dir);
  fs.appendFileSync(path.join(dir,'tasks',task.id,'events.jsonl'),JSON.stringify({id:'preview-example',type:'assistant',at:new Date().toISOString(),text:'[Open document](notes.md)\n\n[Open image](pixel.png)\n\n[Open page](page.html)'})+'\n');
  await page.reload();await page.getByRole('button',{name:'Open document',exact:true}).click();
  const panel=page.getByRole('complementary',{name:'画布与预览'});await panel.getByRole('heading',{name:'Preview document'}).waitFor();
  await panel.getByRole('button',{name:'编辑',exact:true}).click();await panel.getByLabel('文件内容').fill('# Edited document');await panel.getByRole('button',{name:'保存',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.preview-panel header span')?.textContent==='notes.md');assert.equal(fs.readFileSync(path.join(dir,'notes.md'),'utf8'),'# Edited document');
  await panel.getByLabel('文件内容').fill('# Stale change');fs.writeFileSync(path.join(dir,'notes.md'),'# External change');await panel.getByRole('button',{name:'保存',exact:true}).click();await panel.getByRole('alert').filter({hasText:'文件已在外部修改'}).waitFor();assert.equal(fs.readFileSync(path.join(dir,'notes.md'),'utf8'),'# External change');
  page.once('dialog',dialog=>dialog.accept());await panel.getByLabel('关闭预览').click();
  await page.getByRole('button',{name:'Open image',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.preview-content img')?.naturalWidth===1);
  await panel.getByLabel('文件路径或网址').fill(url);await panel.getByRole('button',{name:'打开',exact:true}).click();await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].showInactive());await page.frameLocator('.preview-content iframe').getByRole('button',{name:'Start game'}).click();await page.screenshot({path:path.join(dir,'web-debug.png')});await page.frameLocator('.preview-content iframe').getByRole('button',{name:'Game running'}).waitFor();
  await panel.getByLabel('关闭预览').click();await page.getByRole('button',{name:'Open page',exact:true}).click();await page.frameLocator('.preview-content iframe').getByRole('heading',{name:'Static preview'}).waitFor();
  await page.screenshot({path:path.join(dir,'preview.png')});await panel.getByLabel('文件路径或网址').fill(path.join(dir,'sample.pdf'));await panel.getByRole('button',{name:'打开',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.preview-content iframe')?.src.startsWith('data:application/pdf'));await page.waitForTimeout(1500);await page.screenshot({path:path.join(dir,'pdf.png')});assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,dir,checks:['markdown','save','conflict','image','interactive-web','html','language-icon']}));
 }finally{await app.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
