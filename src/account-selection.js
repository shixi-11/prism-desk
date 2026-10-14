// A native select must never silently display its first option for a missing value.
export function accountTarget(profiles,requested){
 return profiles.some(profile=>profile.id===requested)?requested:profiles.find(profile=>!profile.disabled)?.id||'';
}
