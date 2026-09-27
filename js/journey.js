// Shared milestones for the Three.js exploration world and its inspection rooms.
// Chapter saves keep their detailed puzzles; rewards and opened routes cross chapters.
export const JOURNEY_KEY='wanbu-journey-v1';
export const JOURNEY_FLAGS=['echoCollar','relaySeen','relayOpen','gardenOnline','loopComplete'];
function browserStorage(){try{return globalThis.localStorage;}catch{return null;}}
function read(storage,key){try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}}
export function loadJourney(storage=browserStorage()){
 const raw=read(storage,JOURNEY_KEY),s={version:1};
 for(const key of JOURNEY_FLAGS)s[key]=raw?.[key]===true;
 s.labReturn=raw?.labReturn===true;
 const lab=read(storage,'wanbu-lab-save-v1');
 const complete=Array.isArray(lab?.collected)&&Array.isArray(lab?.solved)&&lab?.completed===true&&lab?.inserted===true&&['light','bridge','test','echo'].every(id=>lab.collected?.includes?.(id)&&lab.solved?.includes?.(id));
 try{s.echoCollar ||= storage?.getItem('wanbu-reward-echo-collar')==='unlocked'||complete;}catch{}
 return s;
}
export function saveJourney(patch,storage=browserStorage()){
 const s=loadJourney(storage);
 for(const key of JOURNEY_FLAGS)if(patch?.[key]===true)s[key]=true;
 if(typeof patch?.labReturn==='boolean')s.labReturn=patch.labReturn;
 try{storage?.setItem(JOURNEY_KEY,JSON.stringify(s));if(s.echoCollar)storage?.setItem('wanbu-reward-echo-collar','unlocked');}catch{}
 return s;
}
export function resetJourneyRoute(storage=browserStorage()){
 const s=loadJourney(storage);for(const key of JOURNEY_FLAGS)if(key!=='echoCollar')s[key]=false;s.labReturn=false;
 try{storage?.setItem(JOURNEY_KEY,JSON.stringify(s));}catch{}
 return s;
}
