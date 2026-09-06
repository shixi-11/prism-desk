const prism_test_grok_first = require('./script-utils.cjs').testProfile('PRISM_TEST_GROK_FIRST', 'Grok');
const fs=require('node:fs');const path=require('node:path');
const {spawnCLI,profileFor}=require('../electron/core.cjs');
const root=path.resolve(__dirname,'..','.local','grok-probe');fs.mkdirSync(root,{recursive:true});
const proc=spawnCLI(profileFor(prism_test_grok_first),['agent','--no-leader','stdio'],root);
let buf=''; const pending=new Map();let id=0;
proc.stdout.setEncoding('utf8');proc.stdout.on('data',d=>{buf+=d;let n;while((n=buf.indexOf('\n'))>=0){const line=buf.slice(0,n);buf=buf.slice(n+1);try{const m=JSON.parse(line); if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}else console.log(JSON.stringify(m).slice(0,2000));}catch{}}});
proc.stderr.on('data',()=>{});proc.on('error',e=>console.error(e.message));
function call(method,params){return new Promise(resolve=>{const n=++id;pending.set(n,resolve);proc.stdin.write(JSON.stringify({jsonrpc:'2.0',id:n,method,params})+'\n');});}
const timer=setTimeout(()=>{proc.kill();console.error('probe timed out');},25000);
(async()=>{try{console.log(JSON.stringify(await call('initialize',{protocolVersion:1,clientCapabilities:{fs:{readTextFile:false,writeTextFile:false},terminal:false},clientInfo:{name:'prism',version:'0.1.0'}})));console.log(JSON.stringify(await call('session/new',{cwd:root,mcpServers:[]})));}finally{clearTimeout(timer);proc.stdin.end();}})();
