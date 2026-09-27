import {CampusGame} from './game.js';
import {CampusWorld} from './world.js';
import {CampusState} from './state.js';
import {RouteRunner} from './route-check.js';
const $=id=>document.getElementById(id);
const world=new CampusWorld($('world'));await world.load();const game=new CampusGame(world,{persistent:false});
$('qa-boss').disabled=false;$('qa-run').disabled=false;$('qa-lab').disabled=false;$('qa-status').textContent='就绪 · 金币 / 密室 / Boss / 全馆点亮';
let runner=null,running=false,labHandoff=false,bossHandoff=false,manual=false;
function startCheck(){
 manual=false;
 game.state=new CampusState();game.knownStamps.clear();game.dotsKey=null;game.active=true;game.resume();world.currentRoom=null;$('intro').hidden=true;$('hud').hidden=false;
 for(const id of ['passport-button','map-button','menu'])$(id).disabled=false;
 runner=new RouteRunner(game.state);running=true;$('qa-open-lab').hidden=true;$('qa-run').disabled=true;$('qa-pause').disabled=false;$('qa-pause').textContent='暂停检查';
};
$('qa-run').onclick=()=>{bossHandoff=false;labHandoff=false;startCheck();};
$('qa-lab').onclick=()=>{bossHandoff=false;labHandoff=true;startCheck();};
$('qa-boss').onclick=()=>{bossHandoff=true;labHandoff=false;startCheck();};
$('qa-open-lab').onclick=()=>{game.persistent=true;game.state.beginChallenge('lab');game.save();};
$('qa-pause').onclick=()=>{running=!running;$('qa-pause').textContent=running?'暂停检查':'继续检查';};
let last=performance.now();function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;
 try{
  game.updateCeremony(dt);
  if(running){for(let i=0;i<8&&!runner.done;i++){if(game.paused&&!game.cinematic)game.resume();if(labHandoff&&runner.task?.name==='四处微光收集与主线奖励衔接'){running=false;$('qa-open-lab').hidden=false;$('qa-pause').disabled=true;$('qa-run').disabled=false;$('qa-status').textContent='研发终端已抵达 · 可保存此端口检查进度，手动测试真实密室与回程';break;}if(bossHandoff&&runner.task?.name==='开始疾风训练'){running=false;manual=true;$('qa-panel').hidden=true;game.resume();break;}runner.advance();game.events();game.checkStamps();}
   if(running)$('qa-status').textContent=`${runner.index} / ${runner.tasks.length} · ${runner.task?.name||'完成'} · ${game.state.room.name} · 印章 ${game.state.stamps.length}/5`;
   if(runner.done){running=false;$('qa-run').disabled=false;$('qa-pause').disabled=true;$('qa-status').textContent='通过 · '+runner.tasks.length+' 步 · 9 / 9 章节 · 5 / 5 印章 · '+game.state.totalCoins+' 足迹币 · Boss HP 0 / 180 · 捷径、结局与存档恢复';$('qa-panel').hidden=true;}
  }else if((!runner||runner.done||manual)&&game.playable()){game.state.update(dt,game.input());game.queued={};game.events();game.checkStamps();}
  game.toastTime-=dt;if(game.toastTime<=0)$('toast').classList.remove('show');game.refresh();world.updateExpedition(dt,game.state);
 }catch(e){running=false;$('qa-status').textContent='失败 · '+e.message;$('qa-run').disabled=false;console.error(e);}
 requestAnimationFrame(frame);
}requestAnimationFrame(frame);
window.campusQADiagnostics=()=>({step:runner?.index,done:runner?.done,room:game.state.roomId,stamps:game.state.stamps,finished:game.state.finished,falls:game.state.falls,drawCalls:world.renderer.info.render.calls});
