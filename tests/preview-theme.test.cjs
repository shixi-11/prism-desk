const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const script=fs.readFileSync(path.join(__dirname,'../src/preview-theme-frame.js'),'utf8');
function receiver(topLevel=false){
 const parent={},changes=[],window={parent,addEventListener:(type,callback)=>{assert.equal(type,'message');window.receive=callback;}};
 if(topLevel)window.parent=window;
 vm.runInNewContext(script,{window,document:{documentElement:{style:{setProperty:(...args)=>changes.push(args)}}},CSS:{supports:(property,value)=>property==='color'&&/^#[0-9a-f]{6}$/i.test(value)}});
 return {parent,window,changes};
}
const theme={background:'#383024',color:'#e9dbc1',accent:'#c7aa7c',border:'#887153',scheme:'dark'};
test('preview theme accepts a complete palette only from its direct embedding window',()=>{
 const {parent,window,changes}=receiver();
 for(const event of [{source:{},data:{type:'prism:preview-theme',theme}},{source:parent,data:null},{source:parent,data:{type:'other',theme}},{source:parent,data:{type:'prism:preview-theme',theme:{...theme,scheme:'system'}}},{source:parent,data:{type:'prism:preview-theme',theme:{...theme,color:'url(x)'}}}])window.receive(event);
 assert.deepEqual(changes,[]);
 window.receive({source:parent,data:{type:'prism:preview-theme',theme}});
 assert.deepEqual(changes,Object.entries(theme).map(([key,value])=>['--prism-preview-'+key,value]));
 assert.equal(receiver(true).window.receive,undefined);
});
test('built host policy pins only the normalized preview script and rejects policy drift',async()=>{
 const {default:config}=await import('../vite.config.js');
 const plugin=config.plugins.find(plugin=>plugin.name==='preview-theme-csp');assert.ok(plugin);
 const hash=crypto.createHash('sha256').update(script.replace(/\r\n?/g,'\n')).digest('base64');
 const html=plugin.transformIndexHtml('<meta content="script-src \'self\'; style-src \'self\' \'unsafe-inline\';">');
 assert.ok(html.includes(`script-src 'self' 'sha256-${hash}';`));
 assert.equal(html.includes("script-src 'self' 'unsafe-inline'"),false);
 assert.throws(()=>plugin.transformIndexHtml('<meta content="script-src *">'),/policy changed/);
});
