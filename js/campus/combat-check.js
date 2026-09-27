// Visible developer fixture: real input + physics, with held frames for visual inspection.
// This page never reads or writes campaign storage.
import {CampusGame} from './game.js';
import {CampusWorld} from './world.js';
import {CampusState} from './state.js';
import {SITES,WALK_POINTS,SAMPLES} from './content.js';
import {guardianStep} from './route-check.js';
const $=id=>document.getElementById(id),world=new CampusWorld($('world'));await world.load();
const game=new CampusGame(world,{persistent:false});let mode='idle';
$('combat-prepare').disabled=false;$('combat-status').textContent='独立输入检查 · 不读写主线存档';
$('combat-hide').onclick=()=>$('combat-qa').hidden=true;
$('combat-prepare').onclick=()=>{
 game.state=new CampusState({runId:'combat-qa',sportsDone:true,portalDone:true,teamDone:true,sites:SITES.map(s=>s[0]),walks:WALK_POINTS.map(s=>s[0]),samples:SAMPLES.map(s=>s[0]),dash:true,gate:true,doubleJump:true,innovation:true,relayOpen:true,brandStep:4,power:true,turns:[0,3,1],venueUnlocked:true,resume:{room:'arena',x:4,y:0}});
 game.knownStamps=new Set(game.state.stamps);game.active=true;game.resume();$('intro').hidden=true;$('hud').hidden=false;for(const id of ['passport-button','map-button','menu'])$(id).disabled=false;
 game.state.startGuardian();game.events();mode='approach';$('combat-continue').disabled=true;$('combat-status').textContent='实际跳跃与行走，正在靠近露出的核心…';
};
$('combat-continue').onclick=()=>{mode=mode==='defeat-frame'?'finish':'fight';game.resume();$('combat-continue').disabled=true;};
let last=performance.now();function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;const s=game.state,g=s.guardian,p=s.player;
 if(mode==='approach'){
  for(let i=0;i<4;i++){if(g.phase==='stunned'&&Math.abs(g.x-p.x)<=3.15){mode='input';game.clear();$('combat-status').textContent='已靠近核心：按键盘 J，或点下方「爪击」，检查真实命中。';break;}guardianStep(s);}
 }else if(mode==='input'&&game.queued.attackPressed||mode==='swing'){
  mode='swing';s.update(dt,game.input());game.queued={};if(g.hp<g.maxHP){mode='hit-frame';$('combat-status').textContent=`真实输入命中：HP ${g.hp}/${g.maxHP}，伤害 −30；此帧已定格，可检查爪光、数字和血条。`;$('combat-continue').disabled=false;}
 }else if(mode==='fight'||mode==='finish'){
  for(let i=0;i<2;i++){guardianStep(s);if(mode==='fight'&&g.phase==='defeated'&&g.defeatTime>.45){mode='defeat-frame';$('combat-status').textContent='HP 归零，消散动画定格；继续检查奖励与结算。';$('combat-continue').disabled=false;break;}if(g.phase==='won'){mode='done';$('combat-status').textContent=`通过 · HP 0/${g.maxHP} · 剩余训练心 ${g.hearts} · 场馆点亮 · ${s.totalCoins} 足迹币`;break;}}
 }
 game.events();game.refresh();$('save-state').textContent=['hit-frame','defeat-frame','input'].includes(mode)?'战斗验证定格 · 独立测试，不写主线存档':'独立战斗验证 · 不写主线存档';
 game.toastTime-=dt;if(game.toastTime<=0)$('toast').classList.remove('show');world.updateExpedition(dt,s);requestAnimationFrame(frame);
}requestAnimationFrame(frame);
