export function hasNewRelease(state){
 const version=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
 if(!version.test(state?.version)||!version.test(state?.release?.version))return false;
 const current=state.version.split('.').map(Number),latest=state.release.version.split('.').map(Number);
 for(let i=0;i<3;i++)if(latest[i]!==current[i])return latest[i]>current[i];
 return false;
}
