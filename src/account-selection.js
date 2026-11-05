// A native select must never silently display its first option for a missing value.
export function accountTarget(profiles,requested){
 return profiles.some(profile=>profile.id===requested)?requested:profiles.find(profile=>!profile.disabled)?.id||'';
}

export const accountOrderKey='prism-account-display-order';

export function orderedProfiles(profiles,order){
 const ranks=new Map(order.map((id,index)=>[id,index]));
 return [...profiles].sort((a,b)=>(ranks.get(a.id)??order.length)-(ranks.get(b.id)??order.length));
}

export function accountLabel(provider,name){
 const nickname=name.trim();
 if(nickname.toLowerCase()===provider.toLowerCase())return nickname;
 const prefix=nickname.match(/^([^\s/]+)(?:\s*\/\s*|\s+)(.+)$/);
 const label=prefix?.[1].toLowerCase()===provider.toLowerCase()?prefix[2].trim():nickname;
 return `${provider} / ${label}`;
}
