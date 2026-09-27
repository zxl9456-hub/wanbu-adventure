// Rewards are derived from unique discoveries; no mutable balance to duplicate on reload.
export const VENUE_COST=60;
export const STAMP_REWARD=15;
export const GUARDIAN_REWARD=30;
export const COINS=[
 ['lobby-1','hub',8,1],['lobby-2','hub',13,1],['lobby-balcony','hub',16,3.3],
 ['link-1','lab',28,1],['link-2','lab',22,3.2],['link-3','lab',13,3],['link-secret','lab',3,6],
 ['research-1','core',24,2.9],['research-2','core',16,4.8],['research-3','core',8,6.7],
 ['atrium-1','atrium',7,1],['atrium-2','atrium',14,3],['atrium-3','atrium',23,6.3],['atrium-4','atrium',29,8.3],
 ['garden-1','garden',6,1],['garden-2','garden',17,1],['garden-3','garden',7,4],['garden-4','garden',17,6],['garden-5','garden',28,8],
 ['brand-1','gallery',8,1],['brand-2','gallery',18,1],['brand-3','gallery',25,1],
 ['archive-secret','archive',11,3.2],['gym-secret','energy',24,3.2]
].map(([id,room,x,y])=>({id,room,x,y,value:2}));
export function restoreCoins(raw){return new Set((Array.isArray(raw)?raw:[]).filter(id=>COINS.some(c=>c.id===id)));}
export function coinTotal(state){return [...(state.coins||[])].reduce((n,id)=>n+(COINS.find(c=>c.id===id)?.value||0),0)+(state.arrival?.earned||0)+(state.circuit?.earned||0)+state.stamps.length*STAMP_REWARD+(state.guardianWon?GUARDIAN_REWARD:0);}
