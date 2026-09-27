import {CampusWorld} from '../campus/world.js';
import {CampusGame} from '../campus/game.js';
import {CampusState} from '../campus/state.js';
import {CircuitRunner} from './proof.js';
const $=id=>document.getElementById(id);
const world=new CampusWorld($('world'));await world.load(p=>$('loading').textContent=`场景准备 ${Math.round(p*100)}%`);
const game=new CampusGame(world,{persistent:false});let runner,auto=false,completed=false,frames=0,total=0;
function reset(){const s=new CampusState();s.enter('hub',18,0);for(const id of ['jinjiang','xiamen','shanghai'])s.connect(id);s.enter('energy',3,0);s.storySeen=true;s.drain();game.state=s;game.active=true;game.paused=true;game.clear();game.refresh();runner=new CircuitRunner(s,{purchase:true});completed=false;world.currentRoom=null;$('intro').hidden=true;$('hud').hidden=false;for(const id of ['menu','passport-button','map-button'])$(id).disabled=false;$('dialog').close();}
reset();const bar=document.createElement('div');bar.id='qa-circuit';bar.style.cssText='position:absolute;z-index:20;right:12px;top:85px;max-width:340px;display:flex;gap:5px;flex-wrap:wrap;background:#17382ee8;padding:8px;border-radius:8px';
const status=document.createElement('span');status.style.cssText='width:100%;font-size:11px';bar.append(status);
function button(text,fn){const b=document.createElement('button');b.textContent=text;b.style.cssText='font-size:11px;padding:7px 10px';b.onclick=fn;bar.append(b);return b;}
function process(){runner.advance();game.state.drain();game.refresh();status.textContent=`输入验证 ${runner.index} / ${runner.tasks.length} · ${game.state.room.name}`;}
button('下一处验证',()=>{auto=false;const stops=[8,12,17,21,22,27,30,32,34,37],target=stops.find(i=>i>runner.index)||37;game.paused=true;game.clear();$('dialog').close();try{while(!runner.done&&runner.index<target)process();}catch(e){status.textContent=e.message;throw e;}});
button('自动走完整段',()=>{reset();auto=true;});
button('亲自试玩',()=>{auto=false;game.paused=false;game.resume();});
button('从头验证',()=>{auto=false;reset();});
button('隐藏检查栏',()=>bar.hidden=true);document.body.append(bar);
addEventListener('keydown',e=>{if(e.code==='F9')bar.hidden=!bar.hidden;});
let last=performance.now();function frame(now){const dt=Math.min(.06,(now-last)/1000);last=now;try{if(auto){for(let i=0;i<8&&!runner.done;i++)process();if(runner.done){auto=false;completed=true;status.textContent='PASS · 体育回路、两段战斗、消费、回访奖牌均完成';}}game.update(dt);frames++;total+=dt;bar.dataset.result=JSON.stringify({room:game.state.roomId,task:runner.index,done:runner.done,phase:game.state.circuit.phase,hearts:game.state.circuit.hearts,falls:game.state.falls,coins:game.state.totalCoins,wallet:game.state.availableCoins});}catch(e){auto=false;status.textContent=e.message;console.error(e);}requestAnimationFrame(frame);}requestAnimationFrame(frame);
window.circuitDiagnostics=()=>({room:game.state.roomId,position:{x:game.state.player.x,y:game.state.player.y},task:runner.index,totalTasks:runner.tasks.length,completed,circuit:game.state.circuit.snapshot(),phase:game.state.circuit.phase,hearts:game.state.circuit.hearts,enemyHP:game.state.circuit.enemy.hp,falls:game.state.falls,coins:game.state.totalCoins,wallet:game.state.availableCoins,frames,elapsed:total});
