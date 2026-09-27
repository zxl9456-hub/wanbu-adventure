import {BRANDS,CHAPTERS,PHYS,HOOP,REFLECTORS,RINGS,VERSION,createPlatforms,movingX,onBeat} from './course.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const approach=(v,t,d)=>v<t?Math.min(v+d,t):Math.max(v-d,t);
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
export function ballistic(from,to,duration){return {vx:(to.x-from.x)/duration,vy:(to.y-from.y+.5*PHYS.ballGravity*duration*duration)/duration};}
export function segmentDistance(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(px-ax-t*dx,py-ay-t*dy);}
/** One physical ball and a fixed-step simulation, independent of rendering and UI. */
export class RelaySimulation{
 constructor(onEvent=()=>{}){this.onEvent=onEvent;this.reset();}
 emit(type,data={}){this.onEvent(type,data);}
 reset(save=null){
  this.time=clamp(finite(save?.time),0,1e6);this.stage=clamp(Number.isInteger(save?.stage)?save.stage:0,0,2);this.finished=!!save?.finished&&this.stage===2;
  this.visited=new Set((Array.isArray(save?.visited)?save.visited:[]).filter(id=>BRANDS.includes(id)));if(this.stage>=1)this.visited.add('ANTA');if(this.stage>=2)this.visited.add('FILA');
  this.rings=new Set((Array.isArray(save?.rings)?save.rings:[]).filter(id=>RINGS.some(r=>r.id===id)));this.passes=Math.max(0,Math.floor(finite(save?.passes)));this.retries=Math.max(0,Math.floor(finite(save?.retries)));this.bestCombo=Math.max(0,Math.floor(finite(save?.bestCombo)));this.combo=0;this.precise=0;this.platforms=createPlatforms();
  this.npcs=BRANDS.map((id,i)=>({id,index:i,x:[17,44,99,110][i],y:i===0?2:0,walking:false,wait:true,cheer:0,facing:-1}));
  this.x=CHAPTERS[this.stage].spawn;this.y=0;this.vx=0;this.vy=0;this.facing=1;this.grounded=true;this.groundId=['first-ground','atrium-ground','court'][this.stage];this.coyote=.1;this.jumpBuffer=0;this.dashTime=0;this.dashCooldown=0;this.airDashed=false;this.landing=0;
  this.phase=['first-pass','lift-pass','court-pass'][this.stage];this.angle=this.stage===1?36:42;this.power=this.stage===1?10:this.stage===2?13:14;this.aimDir=1;this.target=2;this.echo=null;this.liftY=0;this.headPending=false;this.shotGood=false;this.shotCount=0;this.hasShortcut=false;
  this.ball={owner:'player',lastHolder:'player',x:this.x+.7,y:this.y+1.25,vx:0,vy:0,age:0,bounces:0,shot:false,returnDelay:0};
  if(this.stage===2&&this.visited.has('DESCENTE')&&this.visited.has('KOLON'))this.phase='shot-ready';
  if(this.finished){for(const b of BRANDS)this.visited.add(b);this.phase='complete';this.ball.owner='hoop';this.ball.x=HOOP.x;this.ball.y=HOOP.y-1;}
 }
 snapshot(){return {version:VERSION,stage:this.stage,visited:[...this.visited],rings:[...this.rings],passes:this.passes,retries:this.retries,bestCombo:this.bestCombo,time:this.time,finished:this.finished};}
 jump(){if(!this.finished)this.jumpBuffer=.16;}
 dash(){if(this.finished||this.dashCooldown>0||(!this.grounded&&this.airDashed))return false;this.dashTime=.22;this.dashCooldown=1.1;this.airDashed=!this.grounded;this.emit('dash');return true;}
 restartStage(){const snapshot=this.snapshot();this.reset({...snapshot,finished:false});this.retries++;this.emit('checkpoint',{stage:this.stage,retry:true});}
 targetNPC(){if(this.stage===0)return this.npcs[0];if(this.stage===1)return this.npcs[1];return this.npcs[this.target];}
 setTarget(i){if(i===2||i===3){this.target=i;this.emit('target',{name:BRANDS[i]});}}
 recordEcho(){if(this.stage!==1){this.emit('notice',{text:'回声项圈将在中庭的联动圆盘使用。'});return false;}if(Math.abs(this.x-41)>1.2||this.y>.2){this.emit('notice',{text:'先站到中庭 41 米处的回声圆盘，再按 E。'});return false;}this.echo={x:41,y:0};this.emit('echo');return true;}
 launch(owner,vx,vy,shot=false,target=null){const b=this.ball;if(b.owner!==owner)return false;const pos=this.holder(owner);b.x=pos.x+(owner==='player'?.7*Math.sign(vx||1):0);b.y=pos.y+(owner==='player'?1.25:1.2);b.owner=null;b.lastHolder=owner;b.target=target;b.vx=vx;b.vy=vy;b.age=0;b.bounces=0;b.shot=shot;b.returnDelay=0;this.passes++;this.emit('throw',{owner,x:b.x,y:b.y,shot});return true;}
 holder(id){return id==='player'?this:this.npcs.find(n=>n.id===id)||this;}
 playerThrow(){if(this.finished||this.ball.owner!=='player')return false;
  if(this.stage===2&&this.phase==='shot-ready'&&this.x>=116&&this.x<=123){
   if(!this.grounded&&!this.headPending){this.emit('notice',{text:'回到助跑圈站稳，等节奏亮青再跃起顶球。'});return false;}
   if(this.headPending)return false;this.shotGood=onBeat(this.time);this.headPending=true;this.jump();this.vx=0;this.shotCount++;this.emit('head-ready',{good:this.shotGood});return true;
  }
  const a=this.angle*Math.PI/180;return this.launch('player',Math.cos(a)*this.power*this.aimDir,Math.sin(a)*this.power);
 }
 whistle(){
  if(this.finished)return;const b=this.ball;
  if(this.stage===0&&b.owner==='ANTA'){const n=this.npcs[0];if(n.x<28.8){n.wait=!n.wait;this.emit('notice',{text:n.wait?'伙伴在原地等候。':'伙伴出发了！去下层 29 米接应圈接球。'});}else{this.returnFromNPC(n,{x:29,y:1.1});}return;}
  if(this.stage===1&&b.owner==='FILA'){const n=this.npcs[1];if(n.x<61.8){n.wait=!n.wait;this.emit('notice',{text:n.wait?'伙伴停下等你。':this.echo?'伙伴开始乘台上行。':'伙伴出发；在回声圆盘留下分身，升降台才会启动。'});}else{
    if(this.x<66||this.y<4.9){this.emit('notice',{text:'先跳到上层青色移动接应台，再吹哨接球。'});return;}
    this.returnFromNPC(n,{x:movingX(this.time+1.25),y:7.05},1.25);
   }return;}
  if(this.stage===2&&BRANDS.includes(b.owner)){
   const n=this.holder(b.owner),other=this.npcs[n.index===2?3:2];
   if(!this.visited.has(other.id)){const from={x:n.x,y:n.y+1.2};const v=ballistic(from,{x:other.x,y:other.y+1.2},1.2);this.launch(n.id,v.vx,v.vy,false,other.id);this.emit('notice',{text:n.id+' → '+other.id+' · 团队助攻'});}
   else{if(this.x<115||this.x>123){this.emit('notice',{text:'到 118 米的金色助跑圈，吹哨接回最后一棒。'});return;}this.returnFromNPC(n,{x:this.x,y:this.y+1.05},1.25);}
   return;
  }
  this.emit('notice',{text:b.owner==='player'?'先把球传给接应伙伴。':'伙伴正在看球，准备接应。'});
 }
 returnFromNPC(n,target,duration=1.1){const from={x:n.x,y:n.y+1.2},v=ballistic(from,target,duration);this.launch(n.id,v.vx,v.vy,false,'player');this.emit('notice',{text:'球来了！站进发光接应圈。'});}
 catchBall(owner){const b=this.ball;if(b.owner!==null)return;const from=b.lastHolder;b.owner=owner;b.vx=b.vy=0;b.shot=false;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);
  if(owner!=='player'){const n=this.holder(owner);n.cheer=.7;n.wait=true;this.visited.add(owner);if(owner==='ANTA')this.phase='courier';if(owner==='FILA')this.phase='lift-courier';this.emit('catch',{owner,from,combo:this.combo});}
  else{if(this.stage===0&&from==='ANTA'){this.phase='first-done';this.emit('notice',{text:'接力成功！带球穿过右侧联动门。'});}if(this.stage===1&&from==='FILA'){this.phase='lift-done';this.hasShortcut=this.groundId==='catch-lift';this.emit('notice',{text:'上下层已接通！带球去右侧篮球场。'});}if(this.stage===2&&this.visited.has('DESCENTE')&&this.visited.has('KOLON')){this.phase='shot-ready';this.emit('notice',{text:'助攻到位！到 118 米，节奏亮青时按 F 跃起顶球。'});}this.emit('catch',{owner,from,combo:this.combo});}
 }
 recoverBall(reason='球被缓冲装置接住了，再来一次。'){
  const b=this.ball;this.retries++;this.combo=0;b.owner=b.lastHolder==='player'?'player':b.lastHolder;b.vx=b.vy=0;b.age=0;b.bounces=0;b.returnDelay=0;b.shot=false;this.headPending=false;
  if(b.owner==='player'&&this.stage===2&&this.phase==='shot-ready'){this.x=118;this.y=0;this.vx=this.vy=0;this.grounded=true;this.groundId='court';}
  this.emit('recover',{text:reason});
 }
 nextStage(){if(this.stage>=2)return;const snapshot=this.snapshot();this.reset({...snapshot,stage:this.stage+1});this.emit('checkpoint',{stage:this.stage});}
 updatePlatforms(dt){for(const p of this.platforms){const oldX=p.left,oldY=p.y;if(p.id==='lift')p.y=this.liftY;if(p.id==='catch-lift'){p.left=movingX(this.time)-3;p.right=p.left+6;}p.dx=p.left-oldX;p.dy=p.y-oldY;}}
 updateNPCs(dt){
  const a=this.npcs[0],f=this.npcs[1];for(const n of this.npcs){n.walking=false;n.cheer=Math.max(0,n.cheer-dt);}
  if(this.ball.owner==='ANTA'&&!a.wait&&a.x<29){a.x=Math.min(29,a.x+3.1*dt);a.walking=true;a.facing=1;}
  if(a.x>=29&&this.stage===0&&this.ball.owner==='ANTA'&&Math.abs(this.x-29)<2.2&&this.y<1.1)this.returnFromNPC(a,{x:29,y:1.05});
  const liftOccupied=f.x>=49.5&&f.x<=51.3&&this.visited.has('FILA');
  if(this.echo&&liftOccupied&&this.liftY<6)this.liftY=Math.min(6,this.liftY+1.65*dt);
  if(this.stage===1&&this.visited.has('FILA')){
   if(f.x<50&&!f.wait){f.x=Math.min(50,f.x+2.7*dt);f.walking=true;f.facing=1;}
   else if(f.x<=50.1&&this.liftY<6)f.y=this.liftY;
   else if(this.liftY>=6){f.y=6;if(!f.wait&&f.x<62){f.x=Math.min(62,f.x+2.8*dt);f.walking=true;f.facing=1;}}
  }
 }
 step(dt,{axis=0,jumpHeld=false}={}){
  if(this.finished)return;this.time+=dt;this.landing=Math.max(0,this.landing-dt);this.updateNPCs(dt);this.updatePlatforms(dt);this.dashCooldown=Math.max(0,this.dashCooldown-dt);this.dashTime=Math.max(0,this.dashTime-dt);
  if(axis)this.facing=Math.sign(axis);
  if(this.grounded){const g=this.platforms.find(p=>p.id===this.groundId);if(g){this.x+=g.dx;this.y=g.y;}this.coyote=.12;this.airDashed=false;}else this.coyote=Math.max(0,this.coyote-dt);
  let jumped=false;if(this.jumpBuffer>0&&this.coyote>0){this.vy=PHYS.jump;this.grounded=false;this.groundId=null;this.coyote=0;this.jumpBuffer=0;jumped=true;this.emit('jump');}
  this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);const oldY=this.y,wasGrounded=this.grounded,standing=this.groundId;
  this.vx=this.headPending?0:this.dashTime?this.facing*PHYS.dash:approach(this.vx,axis*PHYS.speed,(this.grounded?46:30)*dt);
  const min=CHAPTERS[this.stage].x-2;let max=CHAPTERS[this.stage].end;
  if(this.stage===0&&this.phase!=='first-done')max=31.5;if(this.stage===1&&this.phase!=='lift-done')max=77.5;
  this.x=clamp(this.x+this.vx*dt,min,max+1);
  if(!jumpHeld&&!this.headPending&&this.vy>5)this.vy=5;this.vy-=PHYS.gravity*dt;this.y+=this.vy*dt;
  this.grounded=false;this.groundId=null;let land=null;
  if(wasGrounded&&!jumped){const p=this.platforms.find(p=>p.id===standing);if(p&&this.x+.38>=p.left&&this.x-.38<=p.right)land=p;}
  for(const p of this.platforms){if(p.type==='lift')continue;if(this.x+.38<p.left||this.x-.38>p.right)continue;if(this.vy<=p.dy/dt+.01&&oldY>=p.y-p.dy-.025&&this.y<=p.y+.02&&(!land||p.y>land.y))land=p;}
  if(land){this.y=land.y;this.vy=0;this.grounded=true;this.groundId=land.id;if(!wasGrounded){this.landing=.18;this.emit('land');}}
  if(this.y<-5){this.x=CHAPTERS[this.stage].spawn;this.y=0;this.vx=this.vy=0;this.grounded=true;this.groundId=['first-ground','atrium-ground','court'][this.stage];this.retries++;this.headPending=false;this.emit('fall');}
  if(this.headPending&&this.y>.85&&this.ball.owner==='player'){
   const from={x:this.x+.7,y:this.y+1.25},to={x:HOOP.x+(this.shotGood?0:1.6),y:HOOP.y};const v=ballistic(from,to,1.25);this.launch('player',v.vx,v.vy,true);this.headPending=false;
  }
  this.stepBall(dt);
  if(this.stage===0&&this.phase==='first-done'&&this.ball.owner==='player'&&this.x>=32.4)this.nextStage();
  if(this.stage===1&&this.phase==='lift-done'&&this.ball.owner==='player'&&this.x>=78.3)this.nextStage();
 }
 stepBall(dt){const b=this.ball;if(b.owner){if(b.owner==='hoop')return;const h=this.holder(b.owner);b.x=h.x+(b.owner==='player'?1.05*this.facing:0);b.y=h.y+(b.owner==='player'?1.1:1.35);return;}
  const ox=b.x,oy=b.y;b.age+=dt;b.vy-=PHYS.ballGravity*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
  for(const r of REFLECTORS){if(r.stage!==this.stage||b.shot)continue;if((ox-r.x)*(b.x-r.x)<=0&&b.y>r.y&&b.y<r.y+r.h){b.x=r.x+Math.sign(ox-r.x)*.015;b.vx*=-.88;b.bounces++;this.emit('bounce');}}
  if(this.stage===2&&b.shot&&b.vy<0&&oy>=HOOP.y&&b.y<=HOOP.y){const k=(oy-HOOP.y)/(oy-b.y),crossX=ox+(b.x-ox)*k;if(Math.abs(crossX-HOOP.x)<HOOP.r-.1&&BRANDS.every(id=>this.visited.has(id))){this.finished=true;this.phase='complete';b.owner='hoop';b.x=HOOP.x;b.y=HOOP.y-.7;this.emit('finish',{good:this.shotGood});return;}}
  for(const ring of RINGS){if(!this.rings.has(ring.id)&&segmentDistance(ring.x,ring.y,ox,oy,b.x,b.y)<.65){this.rings.add(ring.id);this.emit('ring',{id:ring.id});}}
  if(b.age>.16){
   const pNear=segmentDistance(this.x,this.y+1.05,ox,oy,b.x,b.y)<1.06;
   if(pNear&&b.lastHolder!=='player'&&(!b.target||b.target==='player')){this.catchBall('player');return;}
   const candidates=this.stage===0?[this.npcs[0]]:this.stage===1?[this.npcs[1]]:[this.npcs[2],this.npcs[3]];
   for(const n of candidates)if(n.id!==b.lastHolder&&(!b.target||b.target===n.id)&&segmentDistance(n.x,n.y+1.2,ox,oy,b.x,b.y)<1.02){this.catchBall(n.id);return;}
  }
  if(b.y<-.4||b.age>6||b.x<CHAPTERS[this.stage].x-5||b.x>CHAPTERS[this.stage].end+6){this.recoverBall(b.shot?'节奏稍有偏差，球已回到助跑圈。':'传球偏了，联动球已回到上一位持球者。');return;}
  // Small, damped floor bounces leave time for a moving player to make a rescue catch.
  for(const p of this.platforms){if(b.x<p.left||b.x>p.right||p.id==='upper-run'||p.id==='upper-gallery')continue;if(b.vy<0&&oy>=p.y+.32&&b.y<p.y+.32){b.y=p.y+.33;b.vy=Math.abs(b.vy)*.52;b.vx*=.86;b.bounces++;this.emit('bounce');if(b.bounces>=3)this.recoverBall();break;}}
 }
 predictedPoints(){
  if(this.ball.owner!=='player')return [];const angle=this.angle*Math.PI/180;let x=this.x+.7*this.aimDir,y=this.y+1.25,vx=this.power*Math.cos(angle)*this.aimDir,vy=this.power*Math.sin(angle);const points=[{x,y}],dt=1/120;
  const candidates=this.stage===0?[this.npcs[0]]:this.stage===1?[this.npcs[1]]:[this.npcs[2],this.npcs[3]];
  for(let i=1;i<=252;i++){const ox=x,oy=y;vy-=PHYS.ballGravity*dt;x+=vx*dt;y+=vy*dt;for(const r of REFLECTORS)if(r.stage===this.stage&&(ox-r.x)*(x-r.x)<=0&&y>r.y&&y<r.y+r.h){x=r.x+Math.sign(ox-r.x)*.015;vx*=-.88;}
   if(i%6===0)points.push({x,y});if(y<.3||i>20&&candidates.some(n=>segmentDistance(n.x,n.y+1.2,ox,oy,x,y)<1.02))break;
  }return points;
 }
}
