import {CampusWorld} from '../campus/world.js';
import {CampusGame} from '../campus/game.js';
import {CampusState} from '../campus/state.js';
import {arrivalInput} from './proof.js';
const $=id=>document.getElementById(id),world=new CampusWorld($('world'));await world.load(p=>$('loading').textContent='场景准备 '+Math.round(p*100)+'%');const game=new CampusGame(world,{persistent:false});let auto=false,target=105;
function reset(){auto=false;game.state=new CampusState();game.state.storySeen=true;game.active=true;game.paused=true;game.clear();game.state.drain();world.currentRoom=null;$('intro').hidden=true;$('hud').hidden=false;$('dialog').close();for(const id of ['menu','passport-button','map-button'])$(id).disabled=false;game.refresh();}
reset();const bar=document.createElement('aside');bar.id='arrival-check';bar.style.cssText='position:absolute;z-index:30;right:12px;top:84px;max-width:350px;padding:10px;display:flex;flex-wrap:wrap;gap:5px;background:#16352de8;border-radius:8px;font-size:11px';const status=document.createElement('p');status.style.width='100%';bar.append(status);
function btn(text,fn){const b=document.createElement('button');b.textContent=text;b.style.cssText='padding:8px;font-size:11px';b.onclick=fn;bar.append(b);}
btn('楼前全景',()=>{reset();game.active=false;$('hud').hidden=true;});
btn('亲自试玩',()=>{auto=false;game.active=true;$('hud').hidden=false;game.resume();});
btn('跑到中段',()=>{reset();target=52;auto=true;});
btn('通过第一关',()=>{reset();target=105;auto=true;});
btn('隐藏检查栏',()=>bar.hidden=true);document.body.append(bar);addEventListener('keydown',e=>{if(e.code==='F9')bar.hidden=!bar.hidden;});
let last=performance.now();function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;
 if(auto){for(let i=0;i<5;i++){const s=game.state;if(s.roomId!=='arrival'||s.player.x>=target){auto=false;break;}s.update(1/120,arrivalInput(s));if(s.player.x>98&&s.player.grounded)s.interact();s.drain();}}
 game.update(dt);const s=game.state;status.textContent=s.roomId==='arrival'?`门前关卡 · 金币 ${s.arrival.coins.size} / 29 · 检查点 ${s.arrival.checkpoint} / 3`:'PASS · 已从大楼入口进入大堂';bar.dataset.result=JSON.stringify({room:s.roomId,x:+s.player.x.toFixed(2),y:+s.player.y.toFixed(2),coins:s.arrival.coins.size,earned:s.arrival.earned,blocks:s.arrival.blocks.size,checkpoint:s.arrival.checkpoint,done:s.arrival.done,falls:s.falls,bumps:s.arrival.bumps});requestAnimationFrame(frame);
}requestAnimationFrame(frame);
