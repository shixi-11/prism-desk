// A native select must never silently display its first option for a missing value.
export function accountTarget(profiles,requested){
 return profiles.some(profile=>profile.id===requested)?requested:profiles.find(profile=>!profile.disabled)?.id||'';
}

export function accountLabel(provider,name){
 const nickname=name.trim();
 if(nickname.toLowerCase()===provider.toLowerCase())return nickname;
 const prefix=nickname.match(/^([^\s/]+)(?:\s*\/\s*|\s+)(.+)$/);
 const label=prefix?.[1].toLowerCase()===provider.toLowerCase()?prefix[2].trim():nickname;
 return `${provider} / ${label}`;
}
