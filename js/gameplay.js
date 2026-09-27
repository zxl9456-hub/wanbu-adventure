import * as THREE from 'three';
import {toWorld,COLORS} from './world.js';
import {Navigation} from './navigation.js';
import {PixelCorgi} from './character.js';
import {Effects} from './effects.js';
export class Game{
 constructor(world,corgi,audio,ui){
  this.world=world;this.audio=audio;this.ui=ui;this.nav=new Navigation(world);this.character=new PixelCorgi(world,corgi);this.ghost=new PixelCorgi(world,corgi,{echo:true});this.ghost.visible=false;this.effects=new Effects(world);this.position=toWorld(352,20.5,0);this.direction=new THREE.Vector3(.6,0,1).normalize();this.velocity=new THREE.Vector3();this.keys=new Set();this.joy=new THREE.Vector2();this.path=[];this.guidePath=[];this.active=false;this.paused=false;this.chapter=0;this.step=0;this.score=0;this.time=0;this.retries=0;this.dashTime=0;this.dashCooldown=0;this.recording=false;this.record=[];this.recordTime=0;this.echoTime=0;this.echoData=[];this.echoPlaying=false;this.echoUnlocked=false;this.padCharge=0;this.gateIndex=0;this.invincible=0;this.collected=new Set();this.finished=false;this.checkpoint=this.position.clone();this.saveClock=0;this.guideClock=0;
  this.points={start:toWorld(352,20.5),stair:toWorld(351.5,28.5),top:toWorld(345,47,6),a:toWorld(345,47,6),b:toWorld(330,49,6),garden:toWorld(318,70,6),global:toWorld(350,49,6)};
  const story=[[352,23],[354,25],[352,28]];this.story=story.map((p,i)=>this.effects.collectible(toWorld(p[0],p[1],world.staticHeight(...p,0)),`start-${i}`,true));
  const extras=[[346,21,0],[358,23,0],[341,25,0],[345,48,6],[339,50,6],[333,52,6],[326,49,6],[329,57,6],[323,64,6],[317,70,6],[309,73,6],[348,48,6]];
  this.extras=extras.map((p,i)=>this.effects.collectible(toWorld(...p),`extra-${i}`));
  this.padA=this.effects.ring(this.points.a,'A · 记录足迹',COLORS.cyan,1.3);this.padB=this.effects.ring(this.points.b,'B · 同步联动',COLORS.cyan,1.3);this.padA.group.visible=this.padB.group.visible=false;
  this.gatePoints=[[328,55],[325,61],[321,66]].map(p=>toWorld(p[0],p[1],world.staticHeight(...p,1)));
  this.gates=this.gatePoints.map((p,i)=>{let r=this.effects.ring(p,`0${i+1} · 节奏光门`,COLORS.gold,1.25);let g=this.effects.createGate(p,-.3-i*.25);r.group.visible=g.group.visible=false;return{...g,ring:r,passed:false}});
  this.finishRing=this.effects.ring(this.points.garden,'花园 · 创新成果',COLORS.mint,1.5);this.finishRing.group.visible=false;
  this.globe=this.effects.globe(this.points.global);this.globe.group.visible=true;
  this.npcTopics=[['五栋建筑，一座运动场','园区的整体造型取意体育竞技场，总建筑面积约 14.5 万平方米。五栋楼通过连廊与中庭连接，把走动、交流和运动融入工作日常。'],['在路上，遇见灵感','健康工作，万步联动。健步道、水平连廊与垂直中庭构成立体循环网络，让不同团队在走动中自然相遇。'],['不同品牌，共同向前','这里是全球化战略枢纽、创新中心和多品牌集群大本营。数字化、产品研发、全球零售与国际人才在这里协作。'],['给身体和灵感充电','立体庭院与空中花园把自然带进工作场景。绿色能源、水资源利用与共享空间，一起连接健康的日常。']];
  this.waterLabel=this.effects.label('水纹庭 · 轻触水面',COLORS.mint);this.waterLabel.position.set(0,.75,-2.15);this.waterLabel.scale.set(6,1.17,1);world.pond.group.add(this.waterLabel);
  this.bindInputs();this.character.render();this.ghost.render();this.ui.bind(this);
 }
 bindInputs(){
  addEventListener('keydown',e=>{if(this.ui.soundControls?.opened){if(e.code==='Escape'){e.preventDefault();this.ui.soundControls.close();}return;}if(e.code!=='Escape'&&e.target.closest?.('input,button,[contenteditable]'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Shift','e','E','f','F','Escape'].includes(e.key))e.preventDefault();if(e.repeat)return;this.keys.add(e.code);if(e.code==='Escape')this.ui.pause();if(e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='Space')this.dash();if(e.code==='KeyE')this.echo();if(e.code==='KeyF')this.interact();});
  addEventListener('keyup',e=>this.keys.delete(e.code));addEventListener('blur',()=>{this.keys.clear();this.joy.set(0,0);if(this.active&&!this.paused&&!this.finished)this.ui.pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.active&&!this.paused&&!this.finished)this.ui.pause(true);});
  const canvas=this.world.canvas;canvas.addEventListener('pointerdown',e=>{if(!this.active||this.paused||e.button!==0)return;const mouse=new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),ray=new THREE.Raycaster();ray.setFromCamera(mouse,this.world.camera);if(this.world.pond?.pointer(ray)){this.audio.water(1,mouse.x*.6);return;}if(e.pointerType==='touch')return;const hits=ray.intersectObject(this.world.building,true);const hit=hits.find(h=>h.point.y<7.12&&h.point.y>-.2&&h.face&&h.face.normal.clone().transformDirection(h.object.matrixWorld).y>.55);if(!hit)return;const route=this.nav.path(this.position,hit.point);if(route.length){this.path=route;this.effects.burst(hit.point,COLORS.mint,5);}else this.ui.toast('沿发光步道前进，或用方向键移动');});
 }
 start(resume=false,timed=false){
  if(resume){try{this.restore(JSON.parse(localStorage.getItem('wanbu-save-v1')))}catch{}}
  this.audio.start();this.active=true;this.paused=false;this.world.playing=true;this.timed=timed;this.ui.start();this.refresh();this.updateGuide();this.ui.toast(this.chapter===0?'欢迎，小步。跟着金色能量出发吧。':'旅程继续，沿着足迹前行。');this.world.canvas.focus();
 }
 dash(){if(!this.active||this.paused||this.dashCooldown>0)return;this.dashTime=.34;this.dashCooldown=1.65;this.audio.dash();this.effects.burst(this.position,COLORS.cyan,9);}
 echo(){
  if(!this.active||this.paused)return;if(!this.echoUnlocked){this.ui.toast('收集入口的三枚金色能量，解锁足迹回声');return;}
  if(this.recording){if(this.recordTime<.65){this.ui.toast('再记录片刻，让回声记住这段足迹');return;}this.releaseEcho();}
  else{this.record=[];this.recordTime=0;this.recording=true;this.echoPlaying=false;this.ghost.visible=false;this.audio.echo();this.ui.toast('记录开始 · 再按 E 回放，最多 6 秒');}
 }
 releaseEcho(){this.recording=false;this.echoData=this.record.map(s=>({...s,p:s.p.clone(),d:s.d.clone()}));this.echoDuration=this.recordTime;this.echoTime=0;this.echoPlaying=true;this.ghost.visible=true;this.audio.echo(true);this.effects.burst(this.position,COLORS.cyan,12);this.ui.toast('足迹回声已释放 · 回声会在终点停留 4 秒');}
 interact(){
  if(!this.active||this.paused)return;
  if(this.chapter===2&&this.gateIndex===3&&this.near(this.points.garden,2.6)){this.chapter=3;this.step=0;this.score=8000;this.checkpoint.copy(this.points.garden);this.finishRing.group.visible=false;this.globe.group.visible=true;this.audio.success();this.ui.toast('创新成果已收集 · 返回连廊连接全球', '+3000');this.refresh();return;}
  if(this.chapter===3&&this.near(this.points.global,3.3)){this.complete();return;}
  if(this.chapter===1&&this.near(this.points.a,2.4)){this.ui.showHelp('echo');return;}
  if(this.chapter===2&&this.near(this.points.garden,2.6)&&this.gateIndex<3){this.ui.toast('先按顺序完成三道节奏光门');return;}
  const npc=this.nearbyNPC();if(npc>=0){this.audio.ui();const [title,body]=this.npcTopics[npc];this.ui.modal(`<h2 id="modal-title">${title}</h2><p>${body}</p><p class="facts">园区伙伴 · 分享园区生活的灵感</p><button id="npc-done" class="primary">继续出发 <span>↗</span></button>`);document.querySelector('#npc-done').onclick=()=>this.ui.close();}
 }
 nearbyNPC(){return this.world.people.findIndex(p=>this.near(p.position,2.3));}
 near(p,r=1.25,actor=this.position){return Math.hypot(p.x-actor.x,p.z-actor.z)<r&&Math.abs(p.y-actor.y)<1.15;}
 move(dt){
  let x=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0)+this.joy.x;
  let y=(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)-(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-this.joy.y;
  let desired=new THREE.Vector3();if(Math.abs(x)+Math.abs(y)>.05){this.path=[];const forward=this.world.camera.getWorldDirection(new THREE.Vector3());forward.y=0;forward.normalize();const right=new THREE.Vector3(-forward.z,0,forward.x);desired.addScaledVector(right,x).addScaledVector(forward,y).clampLength(0,1);}
  else if(this.path.length){let target=this.path[0],dist=Math.hypot(target.x-this.position.x,target.z-this.position.z);if(dist<.35){this.path.shift();}else desired.copy(target).sub(this.position).setY(0).normalize();}
  if(this.dashTime>0&&desired.lengthSq()<.01)desired.copy(this.direction);if(desired.lengthSq()>.01)this.direction.copy(desired).normalize();
  let speed=this.dashTime>0?11.5:4.6;this.velocity.lerp(desired.multiplyScalar(speed),1-Math.exp(-dt*18));const next=this.position.clone().addScaledVector(this.velocity,dt);let h=this.nav.height(next,this.position.y);
  if(h!==null){this.position.copy(next);this.position.y=THREE.MathUtils.damp(this.position.y,h,28,dt);}else{
   let a=new THREE.Vector3(next.x,this.position.y,this.position.z),b=new THREE.Vector3(this.position.x,this.position.y,next.z),ha=this.nav.height(a,this.position.y),hb=this.nav.height(b,this.position.y);
   if(ha!==null){this.position.x=a.x;this.position.y=ha;}else if(hb!==null){this.position.z=b.z;this.position.y=hb;}else this.velocity.multiplyScalar(.1);
  }
  this.moving=this.velocity.length()>.3;if(this.moving){this.effects.footprints(this.position,this.direction,this.time);this.audio.step(this.time,this.world.pond.contains(this.position,.95),this.dashTime>0);}
 }
 update(dt){
  const visualDt=this.paused?0:dt;
  if(!this.active){this.character.update(dt,this.position,this.direction,false);this.effects.update(dt);return;}
  if(this.paused){return;}
  if(!this.finished)this.time+=dt;this.dashTime=Math.max(0,this.dashTime-dt);this.dashCooldown=Math.max(0,this.dashCooldown-dt);this.invincible=Math.max(0,this.invincible-dt);
  this.move(dt);
  if(this.recording){this.recordTime+=dt;this.record.push({t:this.recordTime,p:this.position.clone(),d:this.direction.clone(),moving:this.moving,dash:this.dashTime>0});if(this.recordTime>=6)this.releaseEcho();}
  if(this.echoPlaying){this.echoTime+=dt;const a=this.echoData;let sample=a[Math.min(a.length-1,Math.floor(this.echoTime/this.echoDuration*a.length))];if(sample){this.ghost.update(dt,sample.p,sample.d,this.echoTime<this.echoDuration&&sample.moving,sample.dash&&this.echoTime<this.echoDuration);}if(this.echoTime>this.echoDuration+4){this.echoPlaying=false;this.ghost.visible=false;}}
  this.character.update(dt,this.position,this.direction,this.moving,this.dashTime>0);if(this.finished)this.character.play('Celebrate');
  this.effects.update(dt);this.updateObjectives(dt);this.ui.update();
  this.saveClock+=dt;if(this.saveClock>3){this.saveClock=0;this.save();}
  this.guideClock+=dt;if(this.guideClock>2){this.guideClock=0;this.updateGuide();}
 }
 updateObjectives(dt){
  for(const s of this.extras)if(!s.collected&&this.near(s.base,1.1)){s.collected=true;s.group.visible=false;this.collected.add(s.id);this.audio.collect();this.effects.burst(s.base,COLORS.mint,10);this.ui.toast(`园区记忆 ${this.collected.size} / 12`);}
  if(this.chapter===0){for(const s of this.story)if(!s.collected&&this.near(s.base,1.3)){s.collected=true;s.group.visible=false;this.step++;this.score=this.step*500;this.audio.collect();this.effects.burst(s.base,COLORS.gold,20);this.refresh();}if(this.step===3){this.chapter=1;this.step=0;this.score=2000;this.echoUnlocked=true;this.padA.group.visible=this.padB.group.visible=true;this.ui.toast('足迹回声已解锁 · 沿标志性楼梯登上二层', '+500');this.audio.success();this.refresh();}}
  if(this.chapter===1){
   if(this.step===0&&this.position.y>5.5&&this.near(this.points.a,4)){this.step=1;this.checkpoint.copy(this.points.a);this.ui.toast('在 A 点记录数秒，回放后前往 B 点');this.refresh();}
   const g=this.echoPlaying?this.ghost.root.position:null;const pa=this.near(this.points.a,1.45),pb=this.near(this.points.b,1.45),ga=g&&this.near(this.points.a,1.45,g),gb=g&&this.near(this.points.b,1.45,g);
   this.effects.activate(this.padA,pa||ga);this.effects.activate(this.padB,pb||gb);const sync=(pa&&gb)||(pb&&ga);this.padCharge=sync?Math.min(1.2,this.padCharge+dt):Math.max(0,this.padCharge-dt*2);
   if(this.padCharge>=1.2){this.chapter=2;this.step=0;this.score=5000;this.padA.label.visible=this.padB.label.visible=false;this.checkpoint.copy(this.points.b);this.gates.forEach(g=>g.group.visible=g.ring.group.visible=true);this.finishRing.group.visible=true;this.audio.success();this.ui.toast('连廊同步完成 · 前往空中花园', '+3000');this.effects.burst(this.position,COLORS.gold,40);this.refresh();}
  }
  if(this.chapter===2){this.gates.forEach((g,i)=>{g.open=(this.time+i*.75)%3.6<1.35;g.material.color.set(g.open?COLORS.mint:0xf3a789);g.sheet.material.opacity=g.open?.015:.2;g.ring.dot.material.color.set(g.passed?COLORS.gold:g.open?COLORS.mint:0xf3a789);if(i===this.gateIndex&&this.near(this.gatePoints[i],1.1)&&this.invincible<=0){if(g.open||this.dashTime>0){g.passed=true;this.gateIndex++;g.sheet.visible=false;g.ring.label.visible=false;this.effects.activate(g.ring);this.audio.gate(this.gateIndex);this.effects.burst(this.position,COLORS.gold,20);this.ui.toast(`节奏光门 ${this.gateIndex} / 3`);this.refresh();}else{this.retries++;this.position.copy(this.checkpoint);this.velocity.set(0,0,0);this.path=[];this.invincible=1.2;this.audio.fail();this.ui.toast('光门未开放 · 等待青色信号，或冲刺穿过');}}});}
 }
 target(){if(this.chapter===0)return this.story.find(s=>!s.collected)?.base||this.points.stair;if(this.chapter===1)return this.step===0?this.points.a:(this.recording||this.echoPlaying?this.points.b:this.points.a);if(this.chapter===2)return this.gatePoints[this.gateIndex]||this.points.garden;if(this.chapter===3&&!this.finished)return this.points.global;return null;}
 updateGuide(){const t=this.target();this.guidePath=t?this.nav.path(this.position,t):[];this.effects.route(this.guidePath);}
 refresh(){this.audio.setChapter(this.chapter);this.ui.quest();this.updateGuide();this.save();}
 complete(){if(this.finished)return;this.finished=true;this.score=10000;this.chapter=4;this.globe.mat.opacity=.8;this.audio.complete();this.effects.burst(this.points.global,COLORS.gold,90);this.ui.toast('万步联动完成 · 从上海，连接世界');const best=Number(localStorage.getItem('wanbu-best')||Infinity);if(this.time<best)localStorage.setItem('wanbu-best',this.time.toFixed(2));localStorage.removeItem('wanbu-save-v1');setTimeout(()=>this.ui.finish(),1800);this.refresh();}
 save(){if(!this.active||this.finished)return;try{localStorage.setItem('wanbu-save-v1',JSON.stringify({chapter:this.chapter,step:this.step,score:this.score,time:this.time,retries:this.retries,position:this.position.toArray(),collected:[...this.collected],story:this.story.map(s=>s.collected),gateIndex:this.gateIndex}));}catch{}}
 restore(s){if(!s||s.chapter>3)return;this.chapter=s.chapter;this.step=s.step;this.score=s.score;this.time=s.time;this.retries=s.retries;this.position.fromArray(s.position);this.checkpoint.copy(this.position);this.collected=new Set(s.collected);this.extras.forEach(v=>{v.collected=this.collected.has(v.id);v.group.visible=!v.collected});this.story.forEach((v,i)=>{v.collected=!!s.story[i];v.group.visible=!v.collected});this.echoUnlocked=this.chapter>0;this.padA.group.visible=this.padB.group.visible=this.chapter>0;this.gateIndex=s.gateIndex;this.gates.forEach((g,i)=>{g.group.visible=g.ring.group.visible=this.chapter>=2;g.passed=i<this.gateIndex;g.sheet.visible=!g.passed;g.ring.label.visible=!g.passed;if(g.passed)this.effects.activate(g.ring)});this.finishRing.group.visible=this.chapter===2;this.globe.group.visible=true;}
}
