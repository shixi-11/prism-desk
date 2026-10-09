const path=require('node:path');
function packaged(){return !!process.versions.electron&&require('electron').app.isPackaged;}
function stateRoot(){
 if(process.env.PRISM_TEST_DATA)return process.env.PRISM_TEST_DATA;
 if(packaged())return require('electron').app.getPath('userData');
 return path.join(require('./update-bootstrap.cjs').installation(path.resolve(__dirname,'..')),'.local');
}
module.exports={packaged,stateRoot};
