function renameProject(settings,cwd,name){
 if(typeof cwd!=='string'||!cwd.trim()||typeof name!=='string'||!name.trim()||name.trim().length>100)throw Error('Invalid project name');
 const key=cwd.replaceAll('\\','/').replace(/\/$/,'').toLowerCase();
 return {...settings,projectNames:{...settings.projectNames,[key]:name.trim()}};
}
module.exports={renameProject};
