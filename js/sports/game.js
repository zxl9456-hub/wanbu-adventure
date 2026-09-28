import {ShoeKit} from '../equipment/state.js';
import {AdventureSession} from '../adventure/session.js';
import * as THREE from 'three';
import {PixelCorgi} from '../character.js';
import {AudioEngine} from '../audio.js';
import {SoundControls} from '../sound-controls.js';
import {SportsPhysics,PHYSICS} from './physics.js';
import {SportsWorld,BASE_Y} from './world.js';
import {STAGES,COLLECTIBLES,FINISH_X,COURSE_VERSION} from './course.js';
const $=id=>document.getElementById(id),SAVE='wanbu-sports-save-v1',BEST='wanbu-sports-best-v1';
const read=key=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
const write=(key,v)=>{try{localStorage.setItem(key,JSON.stringify(v));}catch{}};
const timeText=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
class SportsCorgi extends PixelCorgi{
 constructor(world,gltf){super(world,gltf);this.sprite.scale.set(3.4,3.4,1);this.shadow=this.root.children.find(o=>o.isMesh);world.scene.add(this.shadow);this.landing=0;}
 updateSports(dt,p){
  this.root.position.set(p.x,BASE_Y+p.y,0);this.pivot.rotation.y=p.facing*Math.PI/2;this.facing=this.pivot.rotation.y;
  const clip=p.finished?'Celebrate':!p.grounded?(p.vy>0?'Jump':'Fall'):this.landing>0?'Land':Math.abs(p.vx)>.2?(p.dashTimer?'Run':'Walk'):'Idle';
  this.play(clip);this.landing=Math.max(0,this.landing-dt);this.mixer.update(dt*(clip==='Walk'?1.85:clip==='Run'?2:1));
  this.sprite.scale.y=3.4*(this.landing>0?.95:!p.grounded?1.035:1);
  this.root.visible=!p.deathTimer||Math.floor(p.deathTimer*18)%2===0;
  const ground=this.world.floorBelow(p.x,p.y);this.shadow.visible=ground!==null&&!p.deathTimer;
  if(ground!==null){this.shadow.position.set(p.x,BASE_Y+ground+.035,0);const height=p.y-ground;this.shadow.scale.setScalar(Math.max(.45,1-height*.09));this.shadow.material.opacity=Math.max(.12,1-height*.18);}
  this.lastRender+=dt;if(this.lastRender>1/24){this.lastRender=0;this.render();}
 }
}
export class SportsGame{
 constructor(world,corgi,audio){
  this.session=new AdventureSession('sports',SAVE);this.bestKey=this.session.campus?this.session.key+'-best':BEST;this.world=world;this.audio=audio;this.keys=new Set();this.holds=new Set();this.joy=new THREE.Vector2();this.ui=this;this.active=false;this.paused=false;this.accumulator=0;this.stage=-1;this.lastSave=0;
  this.physics=new SportsPhysics((event,data)=>this.event(event,data));if(this.session.campus)this.physics.shoes=new ShoeKit(this.session.shoes,Infinity);world.setupCourse(this.physics);this.character=new SportsCorgi(world,corgi);world.resetCamera(this.physics);this.character.updateSports(.01,this.physics);
  this.dialog=$('dialog');this.soundControls=new SoundControls(audio,this);
  const openSound=this.soundControls.open.bind(this.soundControls),closeSound=this.soundControls.close.bind(this.soundControls);
  this.soundControls.open=()=>{this.clearInput();openSound();};this.soundControls.close=(focus=true)=>{this.clearInput();closeSound(focus);};
  if(this.physics.shoes?.equipped==='c202'){this.shoeStatus=document.createElement('p');this.shoeStatus.id='shoe-course-status';this.shoeStatus.style.cssText='position:fixed;right:18px;top:78px;background:#17372de8;color:#ffdb86;padding:8px 12px;border-radius:16px;font-size:11px;pointer-events:none';this.shoeStatus.textContent='逐光疾跑 · 地面提速，空中稳定';document.body.append(this.shoeStatus);}
  this.bind();this.updateHUD();this.refreshEntry();
 }
 refreshEntry(){const save=this.session.load();$('continue').hidden=!(save?.version===COURSE_VERSION);const best=read(this.bestKey);$('best-intro').textContent=best?`个人最佳 ${timeText(best.time)} · 足迹 ${best.coins}/36`:'36 枚足迹 · 3 枚隐藏徽章 · 2 个检查点';}
 clearInput(){this.keys.clear();this.holds.clear();this.joy.set(0,0);this.physics.jumpBuffer=0;for(const b of document.querySelectorAll('.held'))b.classList.remove('held');}
 start(resume=false){
  if(!this.session.valid())return;if(this.session.campus)resume=true;const save=resume?this.session.load():null;this.physics.reset(save?.version===COURSE_VERSION?save:null);this.active=true;this.paused=false;this.stage=-1;this.accumulator=0;this.lastSave=this.physics.time;
  this.clearInput();this.world.resetCamera(this.physics);this.audio.start();this.audio.setState(false);document.body.classList.add('playing');$('intro').hidden=true;$('hud').hidden=false;
  $('pause').disabled=false;this.dialog.close();this.world.canvas.focus();this.updateHUD();this.toast(this.physics.shoes?.equipped==='c202'?'逐光疾跑已穿戴 · 同向奔跑蓄能，最高提速 25%':resume?'已回到最近检查点':'长按空格跳得更高 · 方向键控制落点',4.5);if(this.session.completed){this.physics.finished=true;this.physics.x=FINISH_X;this.physics.y=this.world.floorBelow(FINISH_X,100)||0;this.result();}else this.save();
 }
 save(){if(this.active&&!this.physics.finished)this.session.save({version:COURSE_VERSION,...this.physics.snapshot()});}
 entry(){this.save();this.clearInput();this.soundControls.close(false);this.dialog.close();this.active=false;this.paused=false;document.body.classList.remove('playing');$('intro').hidden=false;$('hud').hidden=true;$('pause').disabled=true;this.refreshEntry();$('start').focus();}
 bind(){
  $('start').onclick=()=>this.start();$('continue').onclick=()=>this.start(true);$('home').onclick=()=>this.active?this.pause(true):null;
  $('pause').onclick=()=>this.physics.finished?this.result():this.pause();$('help').onclick=()=>this.help();$('dialog-close').onclick=()=>this.closeDialog();
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.closeDialog();});
  $('focus-mode').onclick=()=>{this.world.dof.enabled=!this.world.dof.enabled;try{localStorage.setItem('wanbu-dof',this.world.dof.enabled?'on':'off');}catch{}this.syncFocus();};this.syncFocus();
  const jumping=['Space','ArrowUp','KeyW'];
  addEventListener('keydown',e=>{
   if(e.code==='Escape'){e.preventDefault();if(this.soundControls.opened){this.soundControls.close();return;}if(this.dialog.open){this.closeDialog();return;}if(this.active)this.pause();return;}
   if(document.activeElement?.matches('input,select,textarea,button:not([data-hold]),a'))return;
   if(!this.active||this.paused||this.soundControls.opened||this.dialog.open||this.physics.finished)return;
   if(['ArrowLeft','ArrowRight','KeyA','KeyD',...jumping,'ShiftLeft','ShiftRight','KeyR'].includes(e.code))e.preventDefault();
   this.keys.add(e.code);if(e.repeat)return;
   if(jumping.includes(e.code))this.physics.jump();if(e.code.startsWith('Shift'))this.physics.dash();if(e.code==='KeyR')this.physics.retry();
  });
  addEventListener('keyup',e=>this.keys.delete(e.code));
  for(const b of document.querySelectorAll('[data-hold]')){
   const release=e=>{this.holds.delete(b.dataset.hold);b.classList.remove('held');};
   b.addEventListener('pointerdown',e=>{if(!this.active||this.paused)return;e.preventDefault();b.setPointerCapture(e.pointerId);this.holds.add(b.dataset.hold);b.classList.add('held');if(b.dataset.hold==='jump')this.physics.jump();if(b.dataset.hold==='dash')this.physics.dash();});
   b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
   b.addEventListener('keydown',e=>{if(!['Enter','Space'].includes(e.code)||e.repeat)return;e.preventDefault();e.stopPropagation();if(!this.active||this.paused)return;this.holds.add(b.dataset.hold);b.classList.add('held');if(b.dataset.hold==='jump')this.physics.jump();if(b.dataset.hold==='dash')this.physics.dash();});
   b.addEventListener('keyup',e=>{if(['Enter','Space'].includes(e.code)){e.preventDefault();e.stopPropagation();release();}});b.addEventListener('blur',release);
  }
  addEventListener('blur',()=>{this.clearInput();if(this.active&&!this.physics.finished&&!this.dialog.open&&!this.soundControls.opened)this.pause(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.save();this.clearInput();if(this.active&&!this.physics.finished)this.pause(true);}});
  addEventListener('pagehide',()=>this.save());
  // Keep keyboard navigation inside the nonmodal sound panel while it pauses play.
  document.addEventListener('keydown',e=>{if(e.key!=='Tab'||!this.soundControls.opened)return;const items=[...$('sound-panel').querySelectorAll('button,input')].filter(el=>!el.classList.contains('hidden'));const i=items.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&i===items.length-1){e.preventDefault();items[0].focus();}});
 }
 syncFocus(){$('focus-mode').setAttribute('aria-pressed',String(this.world.dof.enabled));$('focus-mode').setAttribute('aria-label',this.world.dof.enabled?'关闭景深':'开启景深');}
 showDialog(content){this.wasPaused=this.paused;this.paused=true;this.clearInput();$('dialog-content').innerHTML=content;this.session.decorate($('dialog-content'),this.physics.finished);if(!this.dialog.open)this.dialog.showModal();}
 closeDialog(){this.dialog.close();this.paused=false;this.clearInput();if(this.active)this.world.canvas.focus();else $('start').focus();}
 pause(force=false){
  if(!this.active||this.physics.finished)return;if(this.dialog.open&&!force){this.closeDialog();return;}
  this.showDialog(`<p class="dialog-label">运动闯关</p><h2>歇一歇，再出发。</h2><p>进度已保存在本机。继续时，从此刻接着跑。</p><div class="dialog-actions"><button class="primary" id="resume-play">继续闯关 <span>→</span></button><button class="secondary" id="retry-checkpoint">回到检查点</button><button class="text-button" id="back-entry">返回入口</button></div><p class="fine">退出页面后，可从最近检查点继续。</p>`);
  this.save();$('resume-play').onclick=()=>this.closeDialog();$('retry-checkpoint').onclick=()=>{this.closeDialog();this.physics.retry();};$('back-entry').onclick=()=>this.entry();
 }
 help(){
  this.showDialog(`<p class="dialog-label">运动闯关 · 操作指南</p><h2>让每一步，连起来。</h2><div class="help-list"><p><kbd>← → / A D</kbd><span>向左、向右跑动</span></p><p><kbd>空格 / ↑ / W</kbd><span>跳跃 · 长按跳得更高</span></p><p><kbd>Shift</kbd><span>向前冲刺 · 空中也可使用一次</span></p><p><kbd>R</kbd><span>回到最近检查点</span></p><p><kbd>Esc</kbd><span>暂停 / 返回游戏</span></p></div><p>跟随青色足迹；金色徽章藏在高处。升降台会带你上行，琥珀色光栏需要跃过或等待熄灭。平台可从下方跃上。</p><p class="fine">沿健步道起跑，跃上垂直中庭，在空中花园完成冲线。</p><button class="primary" id="help-done">明白了 <span>→</span></button>`);
  $('help-done').onclick=()=>this.closeDialog();
 }
 event(event,data){
  const p=this.physics;
  if(event==='jump'){this.audio.jump();this.world.burst(p.x,p.y,0xd7f6ee,5);}
  if(event==='land'){this.character.landing=.22;this.audio.land(data.impact);if(data.impact>7)this.world.burst(p.x,p.y,0xf4d5a3,5);}
  if(event==='dash'){this.audio.dash();this.world.burst(p.x,p.y);}
  if(event==='collect'){this.audio.collect();this.world.burst(data.x,data.y-.6,data.kind==='medal'?0xffd77a:0x9feaff,data.kind==='medal'?22:7);if(data.kind==='medal')this.toast('发现一枚隐藏运动徽章');}
  if(event==='fall'){this.audio.fail();this.toast('再来一次 · 从最近检查点出发',2.5);}
  if(event==='respawn'){this.clearInput();this.world.resetCamera(p);this.save();}
  if(event==='checkpoint'){this.audio.success();this.world.burst(p.x,p.y,0x9feaff,24);this.save();this.toast(data.label+'已点亮 · 进度已保存');}
  if(event==='finish'){this.audio.complete();this.world.burst(p.x,p.y,0xffda85,38);this.finish();}
 }
 toast(text,seconds=3.5){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),seconds*1000);}
 get counts(){return {coins:COLLECTIBLES.filter(c=>c.kind==='paw'&&this.physics.collected.has(c.id)).length,medals:COLLECTIBLES.filter(c=>c.kind==='medal'&&this.physics.collected.has(c.id)).length};}
 finish(){
  this.clearInput();const p=this.physics,{coins,medals}=this.counts,best=read(this.bestKey);this.newBest=!best||p.time<best.time;
  if(this.newBest)write(this.bestKey,{time:p.time,coins,medals});if(this.session.campus)this.session.save({version:COURSE_VERSION,...p.snapshot(),finished:true,finishX:p.x});else try{localStorage.removeItem(SAVE);}catch{}
  this.finishDelay=1.1;
 }
 result(){
  const p=this.physics,{coins,medals}=this.counts,stars=1+Number(coins>=28)+Number(medals===3);
  this.showDialog(`<p class="dialog-label">空中连廊 · 挑战完成</p><h2>${stars===3?'每一步，都闪闪发光。':'永不止步，冲线成功！'}</h2><div class="result-stars" aria-label="${stars} 星评价">${[1,2,3].map(i=>`<span class="${i<=stars?'lit':''}">★</span>`).join('')}</div><div class="result-stats"><div><b>${timeText(p.time)}</b><span>${this.newBest?'新的个人最佳':'通关用时'}</span></div><div><b>${coins}<small>/36</small></b><span>能量足迹</span></div><div><b>${medals}<small>/3</small></b><span>隐藏徽章</span></div><div><b>${p.retries}</b><span>重试次数</span></div></div><p class="result-message">水平连廊、垂直中庭、空中花园，<br>你用运动连接了上海安踏中心。</p><p class="fine">星级目标：完成闯关 · 收集 28 枚足迹 · 找齐 3 枚徽章</p><div class="dialog-actions"><button class="primary" id="play-again">再挑战一次 <span>→</span></button><button class="secondary" id="result-entry">返回入口</button><a class="primary" href="./lab.html">下一关 · ANTA 科技密室 →</a><a class="text-button" href="./explore.html">去园区自由探索 ↗</a></div>`);
  if(this.session.campus)$('play-again').textContent='查看主线去向 →';$('play-again').onclick=()=>{if(this.session.campus){this.showDialog('<h2>继续这段冒险</h2><p>步道徽记已经保存。返回园区继续解锁连廊。</p>');}else this.start();};$('result-entry').onclick=()=>this.entry();
 }
 updateHUD(){
  if(this.shoeStatus){this.shoeStatus.hidden=!this.active;this.shoeStatus.textContent='逐光疾跑 · '+this.physics.shoes.status;}
  const p=this.physics,{coins,medals}=this.counts,stage=Math.max(0,STAGES.findLastIndex(s=>p.x>=s.x));
  $('coin-count').textContent=String(coins).padStart(2,'0');$('medal-count').textContent=medals;$('timer').textContent=timeText(p.time);
  $('route-fill').style.width=Math.min(100,Math.max(0,p.x/FINISH_X*100))+'%';$('dash-meter').style.transform=`scaleX(${1-p.dashCooldown/PHYSICS.dashCooldown})`;$('dash-action').classList.toggle('cooling',p.dashCooldown>0);
  $('checkpoint-count').textContent=`检查点 ${p.checkpoint} / 2`;
  if(stage!==this.stage){this.stage=stage;$('stage-title').textContent=`${String(stage+1).padStart(2,'0')} · ${STAGES[stage].name}`;$('stage-tip').textContent=STAGES[stage].tip;this.audio.setChapter(stage+1);
   document.querySelectorAll('.route-stop').forEach((el,i)=>el.classList.toggle('active',i<=stage));if(this.active&&stage)this.toast(STAGES[stage].news,5);
  }
 }
 update(dt){
  this.audio.setState(this.active&&this.paused&&!this.soundControls.opened);const p=this.physics;
  if(this.active&&!this.paused&&this.session.valid()){
   const left=this.keys.has('ArrowLeft')||this.keys.has('KeyA')||this.holds.has('left'),right=this.keys.has('ArrowRight')||this.keys.has('KeyD')||this.holds.has('right');
   const jumpHeld=['Space','ArrowUp','KeyW'].some(k=>this.keys.has(k))||this.holds.has('jump');
   this.accumulator+=Math.min(.05,dt);while(this.accumulator>=1/120){p.step(1/120,{axis:Number(right)-Number(left),jumpHeld});this.accumulator-=1/120;}
   if(p.grounded&&Math.abs(p.vx)>.6)this.audio.step(p.time,false,!!p.dashTimer);
   if(p.time-this.lastSave>4){this.save();this.lastSave=p.time;}
   if(this.finishDelay){this.finishDelay-=dt;if(this.finishDelay<=0){this.finishDelay=0;this.result();}}
  }else this.accumulator=0;
  const visualDT=this.paused?0:dt;this.character.updateSports(visualDT,p);this.world.update(visualDT,p);this.updateHUD();
 }
}
const canvas=$('world');
try{
 const world=new SportsWorld(canvas),audio=new AudioEngine({scene:'sports'});let game,last=performance.now(),fpsTime=0,frames=0;
 function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;if(game)game.update(dt);else world.update(dt);world.render();frames++;fpsTime+=dt;if(fpsTime>=2){if(window.__sports)window.__sports.fps=Math.round(frames/fpsTime);frames=0;fpsTime=0;}}
 requestAnimationFrame(frame);
 const {corgi}=await world.load((fraction,label)=>{$('load-fill').style.width=fraction*100+'%';$('load-label').textContent=label;$('load-percent').textContent=Math.round(fraction*100)+'%';});
 game=new SportsGame(world,corgi,audio);$('start').disabled=false;$('start-label').textContent='开始闯关';$('loading').classList.add('loaded');game.session.mount();
 window.__sports={game,physics:game.physics,world,ready:true};
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();game.pause(true);$('load-error').hidden=false;});
}catch(error){console.error(error);$('load-label').textContent='场景载入失败，请重试';$('load-error').hidden=false;$('load-error-message').textContent='建筑或运动素材暂时未能载入。';}
