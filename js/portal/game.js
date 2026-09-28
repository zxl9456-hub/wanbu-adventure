import {AdventureSession} from '../adventure/session.js';
import * as THREE from 'three';
import {PortalWorld} from './world.js';
import {PortalState,PIECES,SPOTS,SAVE_KEY} from './state.js';
import {drawBoard} from './board.js';
import {AudioEngine} from '../audio.js';
import {SoundControls} from '../sound-controls.js';
const $=id=>document.getElementById(id);
export class PortalGame{
 constructor(world){
  this.session=new AdventureSession('portal',SAVE_KEY);this.world=world;const saved=this.session.saved;this.state=new PortalState(saved);this.audio=new AudioEngine({scene:'lab'});this.keys=new Set();this.holds=new Map();this.joy=new THREE.Vector2();this.active=false;this.paused=false;this.selected=null;this.hintLevel=0;this.jumpQueued=false;this.accumulator=0;this.saveTimer=0;this.toastTimer=0;this.lastMode='';this.pendingSpot=null;this.ui={pause:()=>this.pause()};this.soundControls=new SoundControls(this.audio,this);
  this.bind();this.refresh();$('start').disabled=false;$('start').textContent=saved?'继续足迹之旅 →':'进入足迹展厅 →';$('loading').textContent='A D 移动 · 空格跳跃 · F 互动';this.session.mount();
 }
 clear(){this.keys.clear();this.holds.clear();this.jumpQueued=false;this.joy.set(0,0);this.pendingSpot=null;this.state.autoTarget=null;}
 bind(){
  $('start').onclick=()=>{if(!this.session.valid())return;this.active=true;$('intro').hidden=true;$('play-hud').hidden=false;this.audio.start();this.world.canvas.focus();this.refresh();this.toast(this.state.route?'已恢复进度。'+$('objective').textContent:'走近左侧大屏，按 F 进入。也可点击“进入屏幕”。');if(this.state.completed)this.complete();};
  $('interact').onclick=()=>this.interact();$('jump').onpointerdown=e=>{e.preventDefault();if(this.canPlay())this.jumpQueued=true;};$('echo').onclick=()=>{if(this.canPlay()){this.state.startEcho();this.events();}};
  $('leave-screen').onclick=()=>this.leave();$('retry').onclick=()=>{this.state.retry();this.events();};$('hint').onclick=()=>this.hint();$('clear-selection').onclick=()=>{this.selected=null;this.tiles();};
  $('board').onpointerdown=e=>{if(!this.canPlay())return;const board=$('board'),rect=board.getBoundingClientRect(),scale=Math.min(rect.width/board.width,rect.height/board.height),left=rect.left+(rect.width-board.width*scale)/2;this.state.autoTarget=Math.max(.8,Math.min(23,(e.clientX-left)/(board.width*scale)*24));};
  $('menu').onclick=()=>this.pause();$('close-dialog').onclick=()=>this.resume();$('dialog').addEventListener('cancel',e=>{e.preventDefault();this.resume();});
  $('close-projector').onclick=()=>this.closeProjector();$('lock-lamp').onclick=()=>{if(this.state.lockLamp()){this.closeProjector();}this.events();};
  document.querySelectorAll('[data-angle]').forEach(b=>b.onclick=()=>{this.state.setAngle(Number(b.dataset.angle));this.refreshAngles();this.events();});
  document.querySelectorAll('[data-hold]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();if(!this.canPlay())return;b.setPointerCapture(e.pointerId);this.holds.set(e.pointerId,b.dataset.hold);};const up=e=>this.holds.delete(e.pointerId);b.onpointerup=up;b.onpointercancel=up;b.onlostpointercapture=up;});
  document.querySelectorAll('[data-spot]').forEach(b=>b.onclick=()=>{if(!this.canPlay()||this.state.mode!=='gallery')return;const id=b.dataset.spot;if((id==='lamp'||id==='screen2')&&!this.state.route){this.toast('先进入左侧屏幕，接通第一段连廊。');return;}if(id==='exit'&&!this.state.echoSolved){this.toast('先完成回声屏幕，让最后一段连廊展开。');return;}this.closeProjector();this.pendingSpot=id;this.state.autoTarget=SPOTS[id];});
  addEventListener('keydown',e=>{
   if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
   if(e.code==='Escape'){e.preventDefault();if(this.soundControls.opened)this.soundControls.close();else if($('dialog').open)this.resume();else if(!$('projector-panel').hidden)this.closeProjector();else if(this.state.mode!=='gallery')this.leave();else this.pause();return;}
   if(!this.canPlay())return;
   if(['KeyA','KeyD','ArrowLeft','ArrowRight','Space','KeyW','ArrowUp','KeyF','KeyE','KeyR'].includes(e.code))e.preventDefault();
   if(e.repeat)return;this.keys.add(e.code);
   if(['Space','KeyW','ArrowUp'].includes(e.code))this.jumpQueued=true;
   if(e.code==='KeyF')this.interact();if(e.code==='KeyE'){this.state.startEcho();this.events();}if(e.code==='KeyR'){this.state.retry();this.events();}
  });
  addEventListener('keyup',e=>this.keys.delete(e.code));addEventListener('blur',()=>{this.clear();if(this.active&&!this.paused)this.pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){this.clear();this.save();if(this.active&&!this.paused)this.pause();}});addEventListener('pagehide',()=>this.save());
 }
 canPlay(){return this.session.valid()&&this.active&&!this.paused&&!document.hidden;}
 interact(){
  if(!this.canPlay())return;
  if(!$('projector-panel').hidden){if(this.state.lockLamp())this.closeProjector();this.events();return;}
  const s=this.state;if(s.mode==='screen1'&&s.route||s.mode==='screen2'&&s.echoSolved){this.leave();return;}
  if(s.completed&&s.near('exit')){this.complete();return;}s.interact();this.events();
 }
 leave(){this.clear();this.selected=null;this.state.leave();this.events();this.world.canvas.focus();}
 closeProjector(){$('projector-panel').hidden=true;this.clear();this.world.canvas.focus();}
 refreshAngles(){document.querySelectorAll('[data-angle]').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.angle)===this.state.angle);b.setAttribute('aria-pressed',String(Number(b.dataset.angle)===this.state.angle));});}
 tiles(){
  const s=this.state;$('tiles').innerHTML=s.order.map((id,i)=>`<button data-tile="${i}" draggable="${!s.route}" class="${this.selected===i?'selected':''}" aria-label="面板 ${i+1}，${PIECES[id].label}" aria-pressed="${this.selected===i}" ${s.route?'disabled':''}><span>0${i+1}</span>${PIECES[id].label}</button>`).join('');
  for(const b of $('tiles').children){const index=Number(b.dataset.tile);b.onclick=()=>{if(this.selected===null)this.selected=index;else{if(this.selected!==index)s.swap(this.selected,index);this.selected=null;}this.tiles();this.events();};b.ondragstart=e=>{e.dataTransfer.setData('text/plain',String(index));e.dataTransfer.effectAllowed='move';};b.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move';};b.ondrop=e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(from)){s.swap(from,index);this.selected=null;this.tiles();this.events();}};}
 }
 hint(){this.hintLevel=Math.min(3,this.hintLevel+1);const s=this.state;const hints=s.mode==='screen1'?['观察每块面板两端金色接口的高度。','入口高度为 1，出口高度为 4。中间需要先上行，再跨步。','把面板排成“上行 → 跨步 → 跃升”，然后走到右侧按 F。']:!s.lamp?['台阶投影还没有接通。','返回展厅，操作中央投影灯。','把投影灯转到 45°，锁定后再进入这块屏幕。']:['光门由圆盘控制，试着留下自己的回声。','站在上层金色圆盘，按 E 并保持 2 秒。','录制完成后向右走，10 秒内穿过光门，在终点按 F。'];this.toast(hints[this.hintLevel-1]);this.audio.ui();}
 save(){this.session.save(this.state.save());}
 toast(text){if(!text)return;$('toast').textContent=text;$('toast').classList.add('show');this.toastTimer=4;}
 events(){
  for(const e of this.state.events.splice(0)){
   if(e.text)this.toast(e.text);
   if(['route','lamp','echoSolved'].includes(e.type)){this.audio.success();this.save();}
   else if(e.type==='complete'){this.save();try{if(!this.session.campus)localStorage.setItem('wanbu-reward-path-lens','unlocked');}catch{}this.complete();}
   else if(e.type==='projector'){$('projector-panel').hidden=false;this.clear();this.refreshAngles();this.audio.ui();}
   else if(e.type==='jump')this.audio.jump();else if(e.type==='land')this.audio.land();else if(e.type==='collect'){this.audio.collect();this.save();}
   else if(e.type==='echo')this.audio.echo(false);else if(e.type==='enter'||e.type==='leave'){this.clear();this.hintLevel=0;this.audio.gate();}
   else if(e.type==='fail'||e.type==='retry')this.audio.fail();else this.audio.ui();
  }
  this.refresh();
 }
 refresh(){
  const s=this.state,inside=s.mode!=='gallery';document.body.classList.toggle('in-screen',inside);$('screen-view').hidden=!inside;$('hotspots').hidden=!this.active||inside;$('echo').hidden=s.mode!=='screen2'||s.echoSolved;
  for(const [id,done]of [['route',s.route],['lamp',s.lamp],['echo',s.echoSolved]]){$('progress-'+id).classList.toggle('done',done);$('progress-'+id).setAttribute('aria-label',({route:'连路',lamp:'投影',echo:'回声'})[id]+(done?'已完成':'未完成'));}
  if(this.lastMode!==s.mode){this.lastMode=s.mode;this.selected=null;this.tiles();$('screen-title').textContent=s.mode==='screen1'?'连接足迹':'光影中的回声';$('screen-desc').textContent=s.mode==='screen1'?'接通三块面板，再亲自走到右侧开关。':'沿光影台阶上行，留下回声，穿过光门。';}
  $('tile-controls').hidden=s.mode!=='screen1';$('collected').textContent='隐藏足迹 '+s.collected.size+' / 3';
  if(s.mode==='screen1'){$('screen-status').textContent=s.route?'连廊已展开。返回展厅，走向中央投影灯。':s.connected()?'路线已接通 · 点击屏幕行走，缺口前按空格跳跃，右侧开关按 F。':'金色接口需要等高相接 · 调整面板后，亲自走一遍。';if(s.route&&$('tiles').querySelector('button:not(:disabled)'))this.tiles();}
  else if(s.mode==='screen2')$('screen-status').textContent=s.echoSolved?'回声联动完成。返回展厅，沿最后一段连廊抵达终点。':s.recording?'正在记录位置 · 请在圆盘上保持 2 秒':s.echoTime>0?'回声保持 '+s.echoTime.toFixed(1)+' 秒 · 向右穿过光门':!s.lamp?'投影尚未接通 · 返回展厅校准中央投影灯':'上层金色圆盘按 E · 录制 2 秒后再出发';
  let label='探索附近';
  if(inside)label=(s.mode==='screen1'?s.route:s.echoSolved)?'返回展厅':s.player.x>21.2?'激活开关':'走向开关';
  else{const near=Object.entries(SPOTS).sort((a,b)=>Math.abs(s.player.x-a[1])-Math.abs(s.player.x-b[1]))[0]?.[0];if(s.near(near))label={screen1:'进入屏幕',lamp:'校准投影',screen2:'进入回声屏幕',exit:'完成挑战'}[near];}
  $('interact').innerHTML=label+' <kbd>F</kbd> ↗';
  $('objective').textContent=s.completed?'足迹成路，灵感相连。':!s.route?'走近左侧屏幕，拼接足迹路线。':!s.lamp?'连廊已展开，走向中央投影灯。':!s.echoSolved?'进入右侧屏幕，和自己的回声合作。':'沿发光连廊抵达高处终点。';
 }
 pause(){if(!this.active)return;if($('dialog').open){this.resume();return;}if(this.soundControls.opened)this.soundControls.close(false);this.clear();this.paused=true;
  $('dialog-body').innerHTML='<h2>停一拍，再出发。</h2><p>A / D 移动，空格跳跃，F 互动。屏幕内选择两块面板交换；回声圆盘按 E 录制。Esc 返回展厅，R 重试当前阶段。</p><p>进度自动保存，失误不会清除已完成的机关。</p><button id="resume" class="primary">继续探索 →</button><button id="dof-toggle">'+this.world.pixelLabel+' · 切换</button><button id="restart">重新挑战本章</button><a href="./lab.html">返回 ANTA 科技密室</a><a href="./relay.html">第三关 · 全楼开赛 →</a>';this.session.decorate($('dialog-body'),this.state.completed);$('dialog').showModal();$('resume').onclick=()=>this.resume();$('dof-toggle').onclick=()=>{$('dof-toggle').textContent=this.world.cyclePixelMode()+' · 切换';};$('restart').onclick=()=>this.confirmRestart();this.save();
 }
 resume(){if($('dialog').open)$('dialog').close();this.paused=false;this.clear();this.world.canvas.focus();}
 confirmRestart(){$('dialog-body').innerHTML='<h2>重新探索足迹展厅？</h2><p>本章机关和隐藏足迹将复位，已带回主线的能力与其他章节保持不变。</p><button id="restart-confirm" class="primary">重新开始</button><button id="restart-cancel">保留进度</button>';$('restart-cancel').onclick=()=>this.resume();$('restart-confirm').onclick=()=>{this.state=new PortalState();this.lastMode='';this.save();this.resume();$('projector-panel').hidden=true;this.refresh();};}
 complete(){this.paused=true;this.clear();this.audio.complete();const seconds=Math.floor(this.state.elapsed),time=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
  $('dialog-body').innerHTML=`<div class="reward">✧</div><h2>足迹成路，<br>灵感相连。</h2><p>你连接了屏幕内外的路径，也让过去的小步帮助现在的小步抵达终点。</p><div class="result-stats"><span><strong>${time}</strong>探索用时</span><span><strong>${this.state.collected.size} / 3</strong>隐藏足迹</span></div><p>获得：光路连接器<br>灵感来自上海中心的数字化、立体连廊与万步联动。屏幕穿梭和全息机关为游戏创作。</p><a class="primary" href="./relay.html">继续 · 全楼开赛 →</a><button id="revisit">重返足迹展厅</button><button id="restart">再次挑战</button>`;
  this.session.decorate($('dialog-body'),this.state.completed);if(!$('dialog').open)$('dialog').showModal();$('revisit').onclick=()=>this.resume();$('restart').onclick=()=>this.confirmRestart();
 }
 frame(dt){
  this.audio.setState(this.paused&&!this.soundControls.opened,document.hidden);
  if(this.canPlay()){
   const right=this.keys.has('KeyD')||this.keys.has('ArrowRight')||[...this.holds.values()].includes('right'),left=this.keys.has('KeyA')||this.keys.has('ArrowLeft')||[...this.holds.values()].includes('left');let axis=Number(right)-Number(left);if(!$('projector-panel').hidden)axis=0;
   if(axis)this.pendingSpot=null;
   this.accumulator+=dt;while(this.accumulator>=1/120){this.state.step(1/120,{axis,jump:this.jumpQueued});this.jumpQueued=false;this.accumulator-=1/120;}
   if(this.pendingSpot&&this.state.autoTarget===null){const id=this.pendingSpot;this.pendingSpot=null;if(this.state.near(id)){if(id==='screen1'||id==='screen2')this.state.enter(id);else this.state.interact();}}
   this.events();if(this.state.moving&&this.state.player.grounded)this.audio.step(this.world.tick,false,false);this.saveTimer+=dt;if(this.saveTimer>4){this.saveTimer=0;this.save();}
  }else this.accumulator=0;
  this.world.updatePortal(dt,this.state,this.active);
  if(this.state.mode!=='gallery'){const portrait=innerWidth<700&&innerHeight>550,board=$('board'),w=portrait?720:1008,h=portrait?660:innerHeight<550?200:420;if(board.width!==w||board.height!==h){board.width=w;board.height=h;}this.state.selected=this.selected;drawBoard(board,this.state,this.state.mode,this.world.dogCanvas,this.world.tick);}
  for(const b of $('hotspots').children){const id=b.dataset.spot;const v=new THREE.Vector3(SPOTS[id],id==='exit'?7.6:id==='screen1'?6.3:id==='lamp'?4.6:7.7,id==='screen2'?-1:0);const p=this.world.project(v);b.style.left=p.x+'px';b.style.top=p.y+'px';b.hidden=p.x<30||p.x>innerWidth-30||p.y<100||p.y>innerHeight-150;}
  if(this.toastTimer>0){this.toastTimer-=dt;if(this.toastTimer<=0)$('toast').classList.remove('show');}
 }
}
(async()=>{try{const world=new PortalWorld($('world'));await world.load(p=>$('loading').textContent='建筑、投影与运动伙伴就绪 · '+Math.round(p*100)+'%');const game=new PortalGame(world);window.__portal={game,world,get state(){return game.state;},ready:true};let last=performance.now();requestAnimationFrame(function frame(t){const dt=Math.min(.05,(t-last)/1000);last=t;game.frame(dt);requestAnimationFrame(frame);});}catch(e){console.error(e);$('error-message').textContent=e.message;$('error').hidden=false;}})();
