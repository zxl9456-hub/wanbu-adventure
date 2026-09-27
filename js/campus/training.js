// Standalone sample, deliberately isolated from the campaign's localStorage.
import {CampusGame} from './game.js';
import {CampusWorld} from './world.js';
import {CampusState} from './state.js';
import {SITES,WALK_POINTS,SAMPLES} from './content.js';
const $=id=>document.getElementById(id);
try{
 const world=new CampusWorld($('world'));await world.load(p=>$('loading').textContent=`训练场准备中 · ${Math.round(p*100)}%`);
 const game=new CampusGame(world,{persistent:false});
 game.state=new CampusState({runId:'standalone-training',sportsDone:true,portalDone:true,teamDone:true,sites:SITES.map(s=>s[0]),walks:WALK_POINTS.map(s=>s[0]),samples:SAMPLES.map(s=>s[0]),dash:true,gate:true,doubleJump:true,innovation:true,relayOpen:true,brandStep:4,power:true,turns:[0,3,1],venueUnlocked:true,resume:{room:'arena',x:4,y:0}});
 game.confirmReset=()=>game.modal('重新开始疾风试玩？','重置本次独立训练，主线存档保留。',[['继续训练',()=>game.resume(),true],['重新开始',()=>location.reload()]]);
 game.knownStamps=new Set(game.state.stamps);game.refresh();const start=$('start').onclick;
 $('start').textContent='进入疾风训练 →';$('start').onclick=()=>{start();$('save-state').textContent='独立试玩 · 不读取或写入主线进度';game.guardianIntro();};
 let last=performance.now();function frame(now){const dt=Math.min(.06,(now-last)/1000);last=now;game.update(dt);requestAnimationFrame(frame);}requestAnimationFrame(frame);
}catch(e){console.error(e);$('error-message').textContent=e.message;$('error').hidden=false;}
