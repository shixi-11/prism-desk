const fs=require('node:fs'),path=require('node:path');
function interfaceState(app){
 try{
    const root=process.env.PRISM_TEST_DATA||path.join(require('./update-bootstrap.cjs').installation(path.resolve(__dirname,'..')),'.local');
    const data=JSON.parse(fs.readFileSync(path.join(root,'app-validation','interfaces.json'),'utf8'));
  const item=data.apps?.[app.name];
  if(!item||item.path!==app.path||item.mtimeMs!==fs.statSync(app.path).mtimeMs)return null;
  const age=Date.now()-Date.parse(data.checkedAt);
  if(app.name==='Voicebox'&&(age<0||age>120000))return {...item,level:'discovered',detail:'曾确认本机服务响应；连接检查已过期，请重新检测。'};
  return item;
 }catch{return null;}
}
module.exports={interfaceState};
