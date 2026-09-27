import {ROOMS,STEP,GRAVITY,JUMP,SPEED,RADIUS} from './map.js';
import {MODULES,ENEMIES} from './catalog.js';
import {FootstepEcho} from './echo.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), approach=(v,t,d)=>v<t?Math.min(t,v+d):Math.max(t,v-d);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class Expedition{
 constructor(saved={}){
  if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};
  this.progress=Object.fromEntries(['dash','gate','shortcut','heart','boss','complete','doubleJump','energyTrial','galleryTrial','archiveWall','echoCollar','relaySeen','relayOpen','gardenOnline','loopComplete'].map(k=>[k,saved[k]===true]));
  this.echo=new FootstepEcho();this.relay={hold:0,active:[false,false]};
  const validSet=(value,valid)=>new Set((Array.isArray(value)?value:[]).filter(x=>valid(x)));
  this.modules=validSet(saved.modules,x=>Object.hasOwn(MODULES,x));this.modules.add('stride');
  this.equipment=this.modules.has(saved.equipment)?saved.equipment:null;
  this.encounters=validSet(saved.encounters,x=>Object.hasOwn(ENEMIES,x));
  this.defeated=validSet(saved.defeated,x=>Object.values(ROOMS).some(r=>r.enemies.some(e=>e.id===x)));
  this.rests=validSet(saved.rests,x=>Object.hasOwn(ROOMS,x)&&ROOMS[x].items.some(i=>i.type==='bench'));this.rests.add('hub');
  this.energy=Number.isFinite(saved.energy)?clamp(saved.energy,0,100):60;this.roomRevision=0;

  this.visited=new Set((Array.isArray(saved.visited)?saved.visited:[]).filter(x=>Object.hasOwn(ROOMS,x)));this.visited.add('hub');
  this.chips=new Set((Array.isArray(saved.chips)?saved.chips:[]).filter(x=>Object.values(ROOMS).some(r=>r.chips.some(c=>c.id===x))));
  this.notes=new Set((Array.isArray(saved.notes)?saved.notes:[]).filter(x=>Object.hasOwn(ROOMS,x)));
  this.checkpoint=saved.checkpoint==='garden'&&(this.progress.dash||this.progress.echoCollar||this.rests.has('garden'))?'garden':'hub';this.rests.add(this.checkpoint);
  this.events=[];this.time=0;this.accumulator=0;this.deaths=Number.isInteger(saved.deaths)?Math.max(0,saved.deaths):0;this.hitstop=0;this.deathTimer=0;this.attackId=0;this.input={};
  this.player={x:8,y:0,vx:0,vy:0,facing:1,grounded:true,coyote:0,jumpBuffer:0,dashTime:0,dashCooldown:0,airDash:false,attackTime:0,attackCooldown:0,attackDirection:'front',invulnerable:0,hurtTime:0,hp:this.maxHP,airJump:false,pulseCooldown:0,healCooldown:0};
  this.enter(this.checkpoint,8,0);
  const resume=saved.resume;
  if(saved.version>=3&&resume&&this.visited.has(resume.room)&&ROOMS[resume.room]?.platforms.some(f=>Math.abs(f.y-resume.y)<.02&&resume.x>=f.left+.5&&resume.x<=f.right-.5)){
   this.enter(resume.room,resume.x,resume.y);this.player.hp=Number.isInteger(resume.hp)?clamp(resume.hp,1,this.maxHP):this.maxHP;
  }
  this.events=[];
 }
 get maxHP(){return this.progress.heart?6:5;}
 get speed(){return SPEED*(this.equipment==='stride'?1.15:1);}
 get pulseCost(){return this.equipment==='echo'?15:25;}
 get room(){return ROOMS[this.roomId];}
 emit(type,data={}){this.events.push({type,...data});}
 drain(){return this.events.splice(0);}
 safeResume(){
  if(this.deathTimer)return {room:this.checkpoint,x:8,y:0,hp:this.maxHP};
  if(this.boss?.active&&!this.progress.boss||this.trialActive)return {room:this.roomId,x:3,y:0,hp:this.player.hp};
  const p=this.player,floors=this.room.platforms;
  const floor=floors.filter(f=>p.x>=f.left+.5&&p.x<=f.right-.5&&f.y<=p.y+.05).sort((a,b)=>b.y-a.y)[0]||floors.reduce((a,b)=>Math.abs(clamp(p.x,a.left+.5,a.right-.5)-p.x)<Math.abs(clamp(p.x,b.left+.5,b.right-.5)-p.x)?a:b);
  return {room:this.roomId,x:clamp(p.x,floor.left+.5,floor.right-.5),y:floor.y,hp:p.hp};
 }
 syncJourney(journey){
  for(const k of ['echoCollar','relaySeen','relayOpen','gardenOnline','loopComplete'])if(journey?.[k]===true)this.progress[k]=true;
 }
 useEcho(){
  if(this.deathTimer||this.player.hurtTime>0)return;
  if(!this.progress.echoCollar){this.emit('locked',{message:'回声项圈藏在5F会议中心的科技密室。找到 A N T A，点亮展厅后领取。'});return;}
  if(this.echo.phase==='record'){if(this.echo.release())this.emit('echo-replay');return;}
  this.echo.start(this.player);this.emit('echo-record');
 }
 updateEcho(dt){
  if(this.deathTimer)return;
  const phase=this.echo.phase;this.echo.tick(dt,this.player);
  if(phase==='record'&&this.echo.phase==='replay')this.emit('echo-replay');
  if(this.roomId==='lab'&&!this.progress.relaySeen&&this.player.x>24){this.progress.relaySeen=true;this.emit('relay-discovered');this.emit('save');}
  const relay=this.room.relay;if(!relay)return;
  const on=(actor,pad)=>!!actor&&actor.grounded&&Math.abs(actor.x-pad.x)<1.05&&Math.abs(actor.y-pad.y)<.16;
  this.relay.active=relay.pads.map(pad=>on(this.player,pad)||on(this.echo.pose,pad));
  if(this.progress[relay.flag])return;
  const [a,b]=relay.pads,cooperating=(on(this.player,a)&&on(this.echo.pose,b))||(on(this.player,b)&&on(this.echo.pose,a));
  this.relay.hold=cooperating?Math.min(relay.hold,this.relay.hold+dt):0;
  if(this.relay.hold>=relay.hold){
   this.progress[relay.flag]=true;this.energy=100;
   this.emit(relay.flag==='relayOpen'?'relay-open':'garden-online');this.emit('save');
  }
 }
 save(){return {version:3,resume:this.safeResume(),energy:this.energy,modules:[...this.modules],equipment:this.equipment,encounters:[...this.encounters],defeated:[...this.defeated],rests:[...this.rests],...this.progress,checkpoint:this.checkpoint,visited:[...this.visited],chips:[...this.chips],notes:[...this.notes],deaths:this.deaths};}
 enter(id,x,y){
  if(!Object.hasOwn(this.rooms||ROOMS,id))return;this.roomRevision++;this.trialActive=false;this.wallHit=0;
  this.echo.clear();this.relay={hold:0,active:[false,false]};this.roomId=id;this.visited.add(id);this.wallHP=this.progress[this.room.wall?.id]?0:(this.room.wall?.hp||0);Object.assign(this.player,{x,y,vx:0,vy:0,grounded:true,coyote:.12,jumpBuffer:0,dashTime:0,airDash:false,airJump:false,attackTime:0,attackCooldown:0,hurtTime:0});
  this.enemies=this.room.enemies.map(e=>({...e,kind:e.kind||'runner',hp:this.defeated.has(e.id)||this.progress[this.room.trial]?0:e.hp,maxHP:e.hp,direction:-1,state:'patrol',timer:1,invulnerable:0,attackHit:0}));
  this.projectiles=[];this.boss=id==='arena'&&!this.progress.boss?{x:25,y:.65,hp:12,maxHP:12,state:'idle',timer:0,pattern:0,direction:-1,invulnerable:0,attackHit:0,active:false}:null;
  this.emit('room',{id});this.emit('save');
 }
 update(dt,input={}){
  this.input=input;if(input.jumpPressed)this.player.jumpBuffer=.15;
  if(input.echoPressed)this.useEcho();if(input.dashPressed)this.dash();if(input.pulsePressed)this.pulse();if(input.healPressed)this.heal();if(input.interactPressed)this.interact();
  this.accumulator+=Math.min(.08,Math.max(0,dt));
  while(this.accumulator>=STEP){this.step(STEP);this.accumulator-=STEP;}
 }
 dash(){
  const p=this.player;if(this.deathTimer||p.hurtTime>0)return;
  if(!this.progress.dash){this.emit('locked',{message:'穿过左侧水平连廊，在5F会议中心寻找冲刺模块。'});return;}
  if(p.dashCooldown>0||p.airDash)return;
  if(this.input.move)p.facing=Math.sign(this.input.move);
  p.dashTime=.23;p.dashCooldown=.65;p.airDash=!p.grounded;p.invulnerable=Math.max(p.invulnerable,.24);p.vy=0;this.emit('dash');
 }
 attack(){
  const p=this.player;if(p.attackCooldown>0||p.dashTime>0||p.hurtTime>0||this.deathTimer)return;
  p.attackTime=.19;p.attackCooldown=.34;p.attackDirection=this.input.down&&!p.grounded?'down':'front';this.attackId++;this.emit('attack',{direction:p.attackDirection});
 }
 step(dt){
  this.time+=dt;
  if(this.deathTimer>0){this.deathTimer-=dt;if(this.deathTimer<=0)this.respawn();return;}
  if(this.hitstop>0){this.hitstop-=dt;return;}
  const p=this.player,inp=this.input;
  for(const k of ['jumpBuffer','dashCooldown','attackCooldown','attackTime','invulnerable','hurtTime','pulseCooldown','healCooldown'])p[k]=Math.max(0,p[k]-dt);
  if(inp.attack)this.attack();
  p.coyote=p.grounded?.12:Math.max(0,p.coyote-dt);
  if(p.jumpBuffer>0&&p.hurtTime===0){
   if(p.coyote>0){p.vy=JUMP;p.grounded=false;p.coyote=0;p.jumpBuffer=0;this.emit('jump');}
   else if(this.progress.doubleJump&&!p.airJump){p.vy=JUMP;p.airJump=true;p.jumpBuffer=0;this.emit('double-jump',{x:p.x,y:p.y});}
  }
  if(!inp.jumpHeld&&p.vy>5&&p.dashTime<=0)p.vy=5;
  const oldX=p.x,oldY=p.y;
  if(p.dashTime>0){p.dashTime=Math.max(0,p.dashTime-dt);p.vx=p.facing*19;p.vy=0;}
  else{if(p.hurtTime===0)p.vx=approach(p.vx,(inp.move||0)*this.speed,(p.grounded?60:35)*dt);p.vy-=GRAVITY*dt;}
  if(inp.move&&p.hurtTime===0&&p.dashTime===0)p.facing=Math.sign(inp.move);
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.grounded=false;
  for(const floor of this.room.platforms){
   if(p.x+RADIUS>floor.left&&p.x-RADIUS<floor.right&&p.vy<=0&&oldY>=floor.y-.025&&p.y<=floor.y){
    p.y=floor.y;if(!p.grounded&&p.vy< -4)this.emit('land',{impact:-p.vy});p.vy=0;p.grounded=true;p.airDash=false;p.airJump=false;
   }
  }
  // The high light curtain cannot be jumped over; only an earned dash can cross.
  const gate=this.room.gate;
  if(gate&&!this.progress.gate&&Math.min(oldX,p.x)-RADIUS<gate.x&&Math.max(oldX,p.x)+RADIUS>gate.x){
   if(this.progress.dash&&p.dashTime>0){this.progress.gate=true;this.emit('gate');this.emit('save');}
   else{p.x=oldX<gate.x?gate.x-RADIUS:gate.x+RADIUS;p.vx=0;}
  }
  this.updateWall(oldX);
  if(this.room.trial&&!this.progress[this.room.trial]&&!this.trialActive&&p.x>8){this.trialActive=true;this.emit('trial-start');}
  const sealed=(this.boss?.active&&!this.progress.boss)||this.trialActive;
  if(this.trialActive&&p.x<6){p.x=6;p.vx=Math.max(0,p.vx);}

  if(p.x<-.6){const e=this.room.exits.left;if(e&&!sealed){this.enter(e.room,e.x,e.y);return;}p.x=-.6;p.vx=Math.max(0,p.vx);}
  if(p.x>this.room.width+.6){const e=this.room.exits.right;if(e&&!sealed){this.enter(e.room,e.x,e.y);return;}p.x=this.room.width+.6;p.vx=Math.min(0,p.vx);}
  if(p.y< -5){this.hurt(1,p.facing,true);if(!this.deathTimer){const nearest=this.room.platforms.reduce((a,b)=>Math.abs((a.left+a.right)/2-p.x)<Math.abs((b.left+b.right)/2-p.x)?a:b);p.x=clamp(p.x,nearest.left+.8,nearest.right-.8);p.y=nearest.y;p.vx=p.vy=0;p.invulnerable=1.5;}return;}
  for(const chip of this.room.chips)if(!this.chips.has(chip.id)&&distance({x:p.x,y:p.y+.8},chip)<1){this.chips.add(chip.id);this.emit('collect',{x:chip.x,y:chip.y});this.emit('save');}
  if(this.room.heart&&!this.progress.heart&&distance({x:p.x,y:p.y+.8},this.room.heart)<1){this.progress.heart=true;p.hp=this.maxHP;this.emit('heart');this.emit('save');}
  this.updateEnemies(dt);this.updateBoss(dt);this.updateProjectiles(dt);this.updateEcho(dt);
  if(this.trialActive&&this.enemies.every(e=>e.hp<=0)){this.trialActive=false;this.progress[this.room.trial]=true;this.player.hp=this.maxHP;this.energy=100;this.emit('trial-complete');this.emit('save');}

 }
 updateEnemies(dt){
  const p=this.player;
  for(const e of this.enemies){if(e.hp<=0)continue;e.invulnerable=Math.max(0,e.invulnerable-dt);e.timer-=dt;
   if(Math.abs(p.x-e.x)<12)this.encounters.add(e.kind);
   if(e.kind==='sentry'){
    if(e.state==='patrol'&&Math.abs(p.x-e.x)<14){e.state='charge';e.timer=.85;e.direction=Math.sign(p.x-e.x)||1;const dx=p.x-e.x,dy=p.y+.75-(e.y+1),length=Math.hypot(dx,dy)||1;e.aimX=dx/length;e.aimY=dy/length;}
    else if(e.state==='charge'&&e.timer<=0){this.projectiles.push({x:e.x,y:e.y+1,vx:e.aimX*7,vy:e.aimY*7,life:3,owner:'enemy',kind:'bolt'});e.state='recover';e.timer=1.65;this.emit('wave');}
    else if(e.state==='recover'&&e.timer<=0)e.state='patrol';
   }else if(e.state==='patrol'){
    e.x+=e.direction*1.6*dt;if(e.x<e.min||e.x>e.max){e.x=clamp(e.x,e.min,e.max);e.direction*=-1;}
    if(Math.abs(p.x-e.x)<4.5&&Math.abs(p.y-e.y)<1.3){e.state='charge';e.timer=.65;e.direction=Math.sign(p.x-e.x)||1;}
   }else if(e.state==='charge'&&e.timer<=0){e.state='rush';e.timer=.55;}
   else if(e.state==='rush'){e.x=clamp(e.x+e.direction*6*dt,e.min,e.max);if(e.timer<=0){e.state='recover';e.timer=1.1;}}
   else if(e.state==='recover'&&e.timer<=0){e.state='patrol';}
   this.hitEnemy(e,dt);if(e.hp>0&&Math.abs(e.x-p.x)<.88&&Math.abs(e.y-p.y)<1.1)this.hurt(1,Math.sign(p.x-e.x)||-p.facing);
  }
 }
 hitEnemy(e){
  const p=this.player;if(p.attackTime<=0||e.attackHit===this.attackId||e.invulnerable>0)return;
  const dx=e.x-p.x,dy=e.y-p.y;
  const hit=p.attackDirection==='down'?Math.abs(dx)<1.25&&dy<.1&&dy> -2.3:dx*p.facing>-.25&&dx*p.facing<2.5&&Math.abs(dy)<1.5;
  if(!hit)return;
  e.attackHit=this.attackId;
  if(e.kind==='shield'&&p.attackDirection!=='down'&&Math.sign(p.x-e.x)===e.direction&&e.state!=='recover'){this.emit('blocked',{x:e.x,y:e.y+1});return;}
  e.hp--;e.invulnerable=.13;this.hitstop=.045;this.energy=clamp(this.energy+12,0,100);
  if(p.attackDirection==='down'){p.vy=10.5;p.airDash=false;}else{p.vx=-p.facing*2;e.x=clamp(e.x+p.facing*.35,e.min??4,e.max??32);}
  this.emit('hit',{x:e.x,y:e.y+1});
  if(e.hp<=0)this.onDefeat(e);
 }
 updateBoss(dt){
  const b=this.boss,p=this.player;if(!b||b.hp<=0)return;
  b.invulnerable=Math.max(0,b.invulnerable-dt);
  if(!b.active){if(p.x>8){b.active=true;b.state='charge';b.timer=1.25;this.emit('boss-start');}else return;}
  b.timer-=dt;
  if(b.state==='charge'&&b.timer<=0){
   b.direction=Math.sign(p.x-b.x)||-1;
   if(b.pattern%3===0){b.state='rush';b.timer=.8;}
   else if(b.pattern%3===1){b.state='wave';b.timer=.85;b.shots=0;}
   else{b.state='leap';b.timer=.85;b.startX=b.x;b.targetX=clamp(p.x,5,31);}
  }else if(b.state==='rush'){b.x=clamp(b.x+b.direction*13*dt,3,33);if(b.timer<=0){b.state='recover';b.timer=1.45;}}
  else if(b.state==='wave'){if(b.shots===0||(b.shots===1&&b.timer<.34)){this.spawnWave(b.x,b.direction);b.shots++;}if(b.timer<=0){b.state='recover';b.timer=1.25;}}
  else if(b.state==='leap'){const t=clamp(1-b.timer/.85,0,1);b.x=b.startX+(b.targetX-b.startX)*t;b.y=.65+Math.sin(t*Math.PI)*5;if(b.timer<=0){b.y=.65;this.spawnWave(b.x,-1);this.spawnWave(b.x,1);b.state='recover';b.timer=1.6;this.emit('slam');}}
  else if(b.state==='recover'&&b.timer<=0){b.pattern++;b.state='charge';b.timer=b.hp<=6?.65:.95;}
  this.hitEnemy(b);if(b.hp>0&&Math.abs(p.x-b.x)<1.45&&Math.abs(p.y-b.y)<1.65)this.hurt(1,Math.sign(p.x-b.x)||1);
 }
 spawnWave(x,dir){this.projectiles.push({x,y:.48,vx:dir*8.5,life:5});this.emit('wave');}
 updateProjectiles(dt){
  for(const shot of this.projectiles){
   shot.x+=shot.vx*dt;shot.y+=(shot.vy||0)*dt;shot.life-=dt;if(shot.life<=0)continue;
   if(this.room.wall&&!this.progress[this.room.wall.id]&&Math.abs(shot.x-this.room.wall.x)<.6){shot.life=0;continue;}
   if(shot.owner==='player'){
    for(const e of [...this.enemies,...(this.boss?.active?[this.boss]:[])]){
     if(e.hp<=0||Math.abs(shot.x-e.x)>1||Math.abs(shot.y-(e.y+.85))>1.1)continue;
     shot.life=0;if(e.kind==='shield'&&Math.sign(shot.x-e.x)===e.direction&&e.state!=='recover'){this.emit('blocked',{x:e.x,y:e.y+1});break;}
     if(e.invulnerable<=0){e.hp--;e.invulnerable=.13;this.emit('hit',{x:e.x,y:e.y+1});if(e.hp<=0)this.onDefeat(e);}break;
    }
   }else if(Math.abs(shot.x-this.player.x)<.68&&(shot.kind==='bolt'?Math.abs(shot.y-(this.player.y+.75))<.72:this.player.y<1.15&&this.player.y>-.5)){this.hurt(1,Math.sign(shot.vx));shot.life=0;}
  }
  this.projectiles=this.projectiles.filter(s=>s.life>0&&s.x>-2&&s.x<this.room.width+2);
 }
 onDefeat(e){
  this.emit('defeat',{x:e.x,y:e.y});this.energy=clamp(this.energy+8,0,100);
  if(e===this.boss){this.progress.boss=true;this.projectiles=[];this.player.hp=this.maxHP;this.emit('boss-defeated');}
  else this.defeated.add(e.id);
  this.emit('save');
 }
 pulse(){
  const p=this.player;if(this.deathTimer||p.hurtTime>0||p.pulseCooldown>0)return;
  if(!this.progress.dash){this.emit('locked',{message:'先在5F会议中心取得脉冲模块，解锁远程脉冲。'});return;}
  if(this.energy<this.pulseCost){this.emit('locked',{message:'能量不足。用 J 命中训练机回能，或在长椅休息。'});return;}
  this.energy-=this.pulseCost;p.pulseCooldown=.45;this.projectiles.push({x:p.x+p.facing*.6,y:p.y+.8,vx:p.facing*16,life:1.3,owner:'player',kind:'pulse'});this.emit('pulse');
 }
 heal(){
  const p=this.player;if(this.deathTimer||p.hurtTime>0||p.healCooldown>0)return;
  if(p.hp>=this.maxHP){this.emit('locked',{message:'体力已满，能量已保留。'});return;}
  if(this.energy<40){this.emit('locked',{message:'修复需要 40 能量。近战命中回能，长椅可完全恢复。'});return;}
  this.energy-=40;p.hp=Math.min(this.maxHP,p.hp+2);p.healCooldown=4;this.emit('heal');this.emit('save');
 }
 equip(id){if(id!==null&&!this.modules.has(id))return false;this.equipment=id;this.emit('save');return true;}
 travel(id){
  if(!this.nearby()||this.nearby().type!=='bench'||!this.rests.has(id)||id===this.roomId||this.deathTimer)return false;
  const bench=ROOMS[id]?.items.find(i=>i.type==='bench');if(!bench)return false;
  this.enter(id,bench.x,bench.y);this.emit('travel');return true;
 }
 updateWall(oldX){
  const w=this.room.wall,p=this.player;if(!w||this.progress[w.id])return;
  if(p.y<w.y+w.height&&Math.min(oldX,p.x)-RADIUS<w.x&&Math.max(oldX,p.x)+RADIUS>w.x){p.x=oldX<w.x?w.x-RADIUS-.2:w.x+RADIUS+.2;p.vx=0;}
  if(p.attackTime>0&&this.wallHit!==this.attackId&&Math.abs(p.x-w.x)<2.6&&Math.sign(w.x-p.x)===p.facing&&p.y<w.y+w.height){
   this.wallHit=this.attackId;this.wallHP--;this.emit('hit',{x:w.x,y:p.y+1});
   if(this.wallHP<=0){this.progress[w.id]=true;this.emit('wall-broken');this.emit('save');}
  }
 }

 hurt(amount,dir,fall=false){
  const p=this.player;if(this.deathTimer||(!fall&&p.invulnerable>0))return;
  p.hp=Math.max(0,p.hp-amount);p.invulnerable=this.equipment==='guard'?1.65:1.25;p.hurtTime=.23;p.dashTime=0;p.attackTime=0;p.vx=dir*6;p.vy=5;this.emit('hurt');
  if(p.hp===0){this.echo.clear();this.relay.hold=0;this.deathTimer=.8;this.deaths++;this.emit('death');}
 }
 respawn(){this.defeated.clear();this.energy=60;this.enter(this.checkpoint,8,0);this.player.hp=this.maxHP;this.player.invulnerable=1.2;this.emit('respawn');}
 nearby(){
  if(this.deathTimer)return null;
  return this.room.items.filter(i=>Math.abs(i.x-this.player.x)<1.8&&Math.abs(i.y-this.player.y)<1.25).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0]||null;
 }
 interact(){
  const i=this.nearby();if(!i)return;
  if(i.type==='bench'){this.checkpoint=this.roomId;this.rests.add(this.roomId);this.defeated.clear();this.energy=100;this.player.hp=this.maxHP;this.enter(this.roomId,i.x,i.y);this.player.invulnerable=1.5;this.emit('rest');}
  else if(i.type==='tech-room'){
   if(!this.progress.dash){this.emit('locked',{message:'先完成展示台训练，取得左侧的脉冲冲刺模块。'});return;}
   this.echo.clear();this.emit('enter-lab');
  }else if(i.type==='echo-route'){
   if(!this.progress.relayOpen){this.progress.relaySeen=true;this.emit('relay-help');}
   else this.enter('garden',22,0);
  }else if(i.type==='echo-back'){
   if(this.progress.relayOpen)this.enter('lab',17,0);else this.emit('locked',{message:'需要从水平连廊同步两个感应点，开启这条路线。'});
  }else if(i.type==='route'){
   if(this.trialActive){this.emit('locked',{message:'训练区暂时封闭。击败全部训练机即可重新开启。'});return;}
   if(i.requires&&!this.progress[i.requires]){this.emit('locked',{message:i.requires==='doubleJump'?'需要回弹二段跳。到大堂二层的国际化健身中心完成试炼。':'需要脉冲模块。先探索左侧水平连廊。'});return;}
   this.enter(i.room,i.toX,i.toY);
  }else if(i.type==='double-jump'){
   if(!this.progress.energyTrial){this.emit('locked',{message:'先完成能源试炼：清除盾卫与上层哨机。'});return;}
   if(this.progress.doubleJump){this.emit('locked',{message:'回弹模块已取得。返回水平连廊左上方，寻找1楼电梯厅入口。'});return;}
   this.progress.doubleJump=true;this.emit('ability-jump');
  }else if(i.type==='cache'){
   if(i.requires&&!this.progress[i.requires]){this.emit('locked',{message:'先完成本区域挑战，才能开启展柜。'});return;}
   if(this.modules.has(i.gear)){this.emit('locked',{message:'装备已收集。按 I 打开背包，自由切换试验模块。'});return;}
   this.modules.add(i.gear);this.emit('module',{id:i.gear});
  }
  else if(i.type==='note'){this.notes.add(this.roomId);this.emit('note',{title:this.room.name,text:this.room.fact});}
  else if(i.type==='ability'){
   if(this.progress.dash){this.emit('locked',{message:'模块已取得。返回大堂，用 Shift 冲过光幕。'});return;}
   if(this.enemies.some(e=>e.hp>0)){this.emit('locked',{message:'先用 J 脉冲爪完成上层训练机测试。'});return;}
   this.progress.dash=true;this.player.hp=this.maxHP;this.emit('ability');
  }else if(i.type==='lift')this.enter('garden',12,0);
  else if(i.type==='back-lift')this.enter('atrium',29,6);
  else if(i.type==='shortcut'){
   if(!this.progress.shortcut){
    if(!this.progress.gardenOnline){this.emit('locked',{message:'捷径尚未供能。用回声同步花园高低两处感应点，恢复循环装置。'});return;}
    this.progress.shortcut=true;this.emit('shortcut');
   }else{this.enter('hub',15,2.3);if(this.progress.relayOpen&&this.progress.gardenOnline&&!this.progress.loopComplete){this.progress.loopComplete=true;this.emit('loop-complete');}}
  }else if(i.type==='shortcut-return'){
   if(this.progress.shortcut)this.enter('garden',3,0);else this.emit('locked',{message:'升降台尚未供能。可从空中花园一侧开启。'});
  }else if(i.type==='finish'){
   if(!this.progress.boss){this.emit('locked',{message:'先完成联动守卫试炼，再点亮信标。'});return;}
   this.progress.complete=true;this.emit('complete');
  }
  this.emit('save');
 }
 objective(){
  const p=this.progress,id=this.roomId;
  if(id==='energy')return p.doubleJump?'返回水平连廊 · 二段跳登上左侧高台':p.energyTrial?'前往右端 · F 取得回弹二段跳':'盾卫怕背击和下击 · 哨机瞄准后及时移动';
  if(id==='archive')return p.archiveWall?'右侧展柜 · F 领取回响线圈':'寻找发光裂纹 · J 连击三次打开隔墙';
  if(id==='gallery')return p.galleryTrial?'前往右侧 · F 领取缓冲护片':'完成共创试炼 · 留意三种训练机的差异';
  if(!p.dash)return id==='core'?'登上展示台 · 取得冲刺模块':'向左探索 · 寻找水平连廊';
  if(id==='core'&&!p.echoCollar)return '展示台右侧 · F 进入科技密室，寻找回声项圈';
  if(id==='lab'&&!p.echoCollar)return '左行前往5F会议中心 · 密室中寻找 A N T A';
  if(id==='hub'&&!p.echoCollar&&p.relaySeen)return '回访5F会议中心 · 密室中寻找回声项圈';
  if(id==='hub'&&p.echoCollar&&!p.relayOpen)return '带着回声项圈向左回访水平连廊 · 同步双感应点';
  if(id==='lab'&&!p.relayOpen)return '在右侧 01 盘记录回声 · 跃至左侧 02 盘同步';
  if(id==='lab'&&p.relayOpen&&!p.gardenOnline)return '中央光门 · F 前往空中花园';
  if(id==='garden'&&!p.gardenOnline)return p.echoCollar?'在低台记录回声 · 跃上最高平台，恢复循环供能':'回访5F会议中心科技密室 · 取得回声项圈';
  if(id==='garden'&&p.gardenOnline&&!p.loopComplete)return '花园已供能 · 从左侧升降台返回大堂，完成环线';
  if(p.complete)return '继续探索 · 收集装备与隐藏足迹';
  if(id==='arena')return p.boss?'走近信标 · F 点亮全球联动':'观察橙色预警 · 闪避后反击';
  if(!p.gate&&!p.relayOpen)return '返回大堂 · Shift 冲过光幕';
  if(!this.visited.has('garden'))return '穿越垂直中庭 · 抵达空中花园';
  return '花园休息存档 · 向右挑战联动守卫';
 }
}
