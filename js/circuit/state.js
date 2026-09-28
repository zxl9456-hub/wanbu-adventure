import {CIRCUIT_ROOMS,CIRCUIT_REWARDS,trainingBall,PARTNERS,UPGRADES} from './content.js';
import {CLAW} from '../campus/combat.js';
const near=(a,b,r)=>Math.abs(a-b)<r;
const flags=['claw','run','target','poolSwitch','poolCrossed','courtGate','runnerWon','launcherWon','rested','shortcut','medal'];
// All visual mechanisms read this fixed-step controller. Saves hold earned milestones,
// never projectiles or a half-finished attack; re-entry safely restarts that encounter.
export class CircuitState{
 constructor(raw={}){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
  flags.forEach(k=>this[k]=raw[k]===true);
  for(const [key,requires] of [['run','claw'],['target','run'],['poolSwitch','target'],['poolCrossed','poolSwitch'],['courtGate','poolCrossed'],['runnerWon','courtGate'],['launcherWon','runnerWon'],['rested','launcherWon'],['shortcut','rested'],['medal','launcherWon']])this[key]&&=this[requires];
  this.partner=this.rested&&Object.hasOwn(PARTNERS,raw.partner)?raw.partner:null;this.shortcut&&=!!this.partner;
  this.runTime=this.run?1.1:0;this.water=this.poolSwitch?1:0;this.hearts=3+(this.partner==='MAIA'?1:0);this.invulnerable=0;
  this.purchases=[];this.rooms=Object.fromEntries(Object.entries(CIRCUIT_ROOMS).map(([id,r])=>[id,{...r,platforms:r.platforms.map(p=>({...p}))}]));
  this.updateWater(0);this.time=0;this.shots=[];this.room=null;this.resetEncounter();
 }
 get done(){return this.shortcut;}
 get rebound(){return this.launcherWon;}
 get earned(){return Object.entries(CIRCUIT_REWARDS).reduce((sum,[key,value])=>sum+(this[key]?value:0),0);}
 get maxHearts(){return this.partner==='MAIA'?4:3;}
 get fighting(){return this.room==='court'&&['runner','launcher'].includes(this.phase);}
 get spent(){return this.purchases.reduce((sum,id)=>sum+UPGRADES[id].cost,0);}
 restorePurchases(raw,total){let available=total;for(const id of new Set(Array.isArray(raw)?raw:[])){if(Object.hasOwn(UPGRADES,id)&&available>=UPGRADES[id].cost){this.purchases.push(id);available-=UPGRADES[id].cost;}}this.syncPlatforms();}
 syncPlatforms(){const f=this.rooms.energy.platforms;if(this.purchases.includes('springDeck')&&!f.some(p=>p.id==='springDeck'))f.push({id:'springDeck',left:12,right:14.5,y:3.65});}
 snapshot(){return {...Object.fromEntries(flags.map(k=>[k,this[k]])),partner:this.partner,purchases:[...this.purchases]};}
 resetEncounter(){this.phase='idle';this.phaseTime=0;this.enemy={x:29,y:0,hp:3,maxHP:3,state:'windup',timer:1.5,face:-1,lastHit:0};this.shots=[];this.invulnerable=0;this.ballCooldown=0;this.lastBallHit=-1;}
 onEnter(id,state){this.room=id;this.resetEncounter();if(id==='cafe'&&this.purchases.includes('restCorner'))this.hearts=this.maxHearts;if(id==='court')this.hearts=this.maxHearts;if(id==='pool'&&this.poolSwitch){this.water=1;this.updateWater(0);}this.poolSafe=this.poolCrossed?{x:30,y:0}:{x:3,y:0};}
 emit(state,text,x,y){state.emit('circuit-effect',{text,x:x??state.player.x,y:y??state.player.y+1});state.emit('save');}
 award(key,state,text){if(this[key])return false;this[key]=true;this.emit(state,text);return true;}
 canEnter(id){return id==='pool'?this.target:id==='court'?this.poolCrossed:id==='cafe'?this.launcherWon:true;}
 gateHint(id){return id==='pool'?'先在跑台充能，再面向训练球按 J 击中右侧靶心。':id==='court'?'先击球启动水位，再亲自越过浮台抵达对岸。':'先完成冲线机与发球机的两段训练。';}
 objective(){
  if(!this.claw)return ['energy',5,0,'爪击项圈','走到训练台按 F 领取爪击，再在跑台上向右奔跑充能'];
  if(!this.run)return ['energy',10,0,'跑台充能','在发光跑台上向右奔跑，让轨道蓄满能量'];
  if(!this.target)return ['energy',18.5,0,'击球靶','站到训练球左侧，面向右方按 J，把球击入靶心'];
  if(!this.poolSwitch)return ['pool',4,0,'水位靶','前往泳池，在球左侧按 J 击中水位靶，让浮台升起'];
  if(!this.poolCrossed)return ['pool',30,0,'泳池对岸','沿三块浮台跳向右岸；落水会回到池边'];
  if(!this.courtGate)return ['court',4,0,'球路开关','前往训练馆，用相同的击球动作打开入场光门'];
  if(!this.runnerWon)return ['court',17,0,'冲线机','进入光门 · 看清箭头，跳过冲锋，在停顿时靠近按 J'];
  if(!this.launcherWon)return ['court',19,0,'发球机','面向右方，看球接近时按 J 反弹，打掉发球机的护盾'];
  if(!this.rested)return ['cafe',8,0,'餐厅补给','前往能量餐厅，按 F 免费补给'];
  if(!this.partner)return ['cafe',16,0,'运动伙伴','邀请一位伙伴同行；可随时回到餐厅更换'];
  if(!this.shortcut)return ['cafe',32,0,'健身近路','在餐厅右端开启近路，返回健身中心'];
  return ['energy',17.5,5.65,'回访奖牌','二段跳登上健身中心高台，取得开场看见的奖牌'];
 }
 interact(kind,state){
  if(kind==='practice'){if(!this.launcherWon||this.fighting)return;this.hearts=this.maxHearts;this.startPhase('launcher',state);return;}
  if(kind==='kit'){if(this.award('claw',state,'能量爪击已装备 · J 攻击，也能击出训练球'))state.emit('ability',{name:'能量爪击',text:'在跑台上向右奔跑充能，再站到训练球左侧按 J。一次动作，既能开路，也能反击。'});return;}
  if(kind==='meal'){this.hearts=this.maxHearts;this.award('rested',state,'热乎的补给已准备好 · 邀请一位伙伴一起出发');state.emit('hint',{text:'训练心已恢复 · 每次用餐都免费'});return;}
  if(kind==='partner'){if(!this.rested){state.emit('hint',{text:'先在左侧餐台补给，再邀请伙伴。'});return;}state.emit('circuit-partner');return;}
  if(kind==='shop'){state.emit('circuit-shop');return;}
  if(kind==='shortcut'){if(!this.rested||!this.partner){state.emit('hint',{text:'先在餐厅补给，并邀请一位运动伙伴。'});return;}this.award('shortcut',state,'体育回路已接通 · 带着二段跳回访高处奖牌');state.enter('energy',29,0);state.emit('save');return;}
  if(kind==='return-cafe'){if(this.shortcut){state.enter('cafe',31,0);state.emit('save');}else state.emit('hint',{text:'这条近路需要从餐厅一侧开启。'});}
 }
 choosePartner(id,state){if(state.roomId!=='cafe'||state.nearby()?.kind!=='partner'||!this.rested||!Object.hasOwn(PARTNERS,id))return false;this.partner=id;this.hearts=this.maxHearts;this.emit(state,PARTNERS[id].title+' 加入同行');return true;}
 purchase(id,state){if(state.roomId!=='cafe'||state.nearby()?.kind!=='shop'||!Object.hasOwn(UPGRADES,id)||this.purchases.includes(id)||state.availableCoins<UPGRADES[id].cost)return false;this.purchases.push(id);this.syncPlatforms();this.emit(state,UPGRADES[id].title+' 已建好 · 累计建设进度保持不变');return true;}
 updateWater(dt){this.water=Math.min(1,this.water+(this.poolSwitch?dt*.6:0));for(const p of this.rooms.pool.platforms)if(p.id.startsWith('raft'))p.y=({ 'raft-1':-3,'raft-2':-2.2,'raft-3':-2.7}[p.id])+3.25*this.water;}
 beforeStep(dt,state){
  const p=state.player,raft=this.room==='pool'&&p.grounded?this.rooms.pool.platforms.find(f=>f.id.startsWith('raft')&&near(f.y,p.y,.05)&&p.x>f.left-.4&&p.x<f.right+.4):null,old=raft?.y;this.updateWater(dt);if(raft)p.y+=raft.y-old;
 }
 hitInFront(state,x,y,extra=0){const a=state.claw,p=state.player;if(!a||a.elapsed<CLAW.windup||a.elapsed>CLAW.activeUntil)return false;const d=(x-p.x)*a.facing;return d>=-.4&&d<CLAW.reach+extra&&Math.abs(p.y+1.1-y)<1.2;}
 startPhase(name,state){state.shoes?.resetEncounter();this.phase=name;this.enemy={x:29,y:0,hp:name==='runner'?3:2,maxHP:name==='runner'?3:2,state:'windup',timer:1.5,face:-1,lastHit:0};this.shots=[];state.emit('hint',{text:name==='runner'?'冲线机：跳过地面冲锋，在它停下时爪击。':'发球机：护盾挡住爪击；面向右边，J 把飞来的球打回去。'});}
 hurt(state){if(this.invulnerable>0||this.phase==='failed')return;if(state.shoes?.absorb(state)){this.invulnerable=1.5;state.player.invulnerable=1.5;return;}this.hearts--;this.invulnerable=1.5;state.player.invulnerable=1.5;state.emit('circuit-hit',{hearts:this.hearts});if(this.hearts<=0){this.phase='failed';this.shots=[];state.emit('circuit-failed');}}
 retry(state){if(state.roomId!=='court')return false;this.onEnter('court',state);Object.assign(state.player,{x:12,y:0,vx:0,vy:0,grounded:true,attackCooldown:0});state.claw=null;state.safePoint={x:12,y:0};state.emit('save');return true;}
 tick(dt,state){
  this.time+=dt;this.invulnerable=Math.max(0,this.invulnerable-dt);this.ballCooldown=Math.max(0,this.ballCooldown-dt);const p=state.player,room=state.roomId;
  if(room==='energy'&&this.claw&&!this.run&&p.grounded&&p.y===0&&p.x>=7&&p.x<=14&&state.input.move>0){this.runTime=Math.min(1.1,this.runTime+dt);p.x-=dt*2.2;if(this.runTime>=1.1)this.award('run',state,'跑台已充能 · 站在右侧训练球左边，按 J 击球');}
  const spawn=trainingBall[room],enabled=room==='energy'?this.run&&!this.target:room==='pool'?!this.poolSwitch:room==='court'?!this.courtGate:false;
  if(spawn&&enabled&&!this.shots.length&&this.ballCooldown<=0&&this.hitInFront(state,spawn.x,spawn.y)&&state.claw.id!==this.lastBallHit){this.lastBallHit=state.claw.id;this.shots.push({x:spawn.x,y:spawn.y,vx:state.claw.facing*12,owner:'player',kind:'switch',life:3});this.ballCooldown=.6;state.emit('circuit-shot');}
  if(room==='pool'){
   if(p.grounded&&p.x<8.4)this.poolSafe={x:Math.max(2,p.x),y:0};
   if(p.grounded&&p.x>28.3){this.poolSafe={x:30,y:0};if(this.poolSwitch)this.award('poolCrossed',state,'水路已通过 · +10 足迹币，右侧训练馆开放');}
   if(p.y< -1.4&&p.x>9&&p.x<28){Object.assign(p,this.poolSafe,{vx:0,vy:0,grounded:true,airJump:false,dashTime:0});state.safePoint={...this.poolSafe};state.falls++;state.emit('hint',{text:'回到池边 · 水位和已获奖励保留，长按跳跃越过浮台'});}
  }
  if(room==='court'){
   if(!this.courtGate&&p.x>8.9){p.x=8.9;p.vx=Math.min(0,p.vx);}
   if(this.courtGate&&!this.launcherWon&&p.x>11&&this.phase==='idle')this.startPhase(this.runnerWon?'launcher':'runner',state);
   if(this.fighting||this.phase==='failed'){p.x=Math.max(11,Math.min(32,p.x));}
   const e=this.enemy;
   if(this.fighting){e.timer-=dt;
    if(this.phase==='runner'){
     if(e.state==='windup'&&e.timer<=0){e.state='rush';e.threat={x:e.x};state.emit('circuit-rush');}
     if(e.state==='rush'){e.x+=e.face*11*dt;e.threat.x=e.x;state.shoes?.dodge(p,e.threat,state);if(Math.abs(e.x-p.x)<1.15&&p.y<1.55)this.hurt(state);if(e.x<=12||e.x>=29){e.x=Math.max(12,Math.min(29,e.x));e.state='recover';e.timer=2.8;}}
     if(e.state==='recover'&&this.hitInFront(state,e.x,1.1)&&state.claw.id!==e.lastHit){e.lastHit=state.claw.id;e.hp=Math.max(0,e.hp-(state.claw.boosted?2:1));state.emit('circuit-damage',{x:e.x,y:1.8});if(e.hp===0){this.award('runnerWon',state,'冲线机已击败 · 接下来，把训练球打回发球机');this.phase='intermission';this.phaseTime=2;}}
     if(e.state==='recover'&&e.timer<=0){e.face=e.x>20?-1:1;e.state='windup';e.timer=1.4;}
    }else if(e.timer<=0){this.shots.push({x:28.4,y:1.1,vx:-7,owner:'enemy',kind:'return',life:5});e.state='windup';e.timer=2.8;state.emit('circuit-shot');}
   }
   if(this.phase==='intermission'){this.phaseTime-=dt;if(this.phaseTime<=0){this.startPhase('launcher',state);p.invulnerable=1.5;this.invulnerable=1.5;}}
  }
  for(const b of this.shots){
   const prev=b.x;b.life-=dt;if(b.owner==='enemy')state.shoes?.dodge(p,b,state);
   if(b.owner==='enemy'&&this.hitInFront(state,b.x,b.y,this.partner==='MAIA'?.5:0)&&p.facing>0){b.owner='player';b.vx=14;state.emit('circuit-reflect',{x:b.x,y:b.y});}
   b.x+=b.vx*dt;
   if(b.kind==='switch'&&spawn&&b.vx>0&&prev<=spawn.target&&b.x>=spawn.target){b.life=0;const key={energy:'target',pool:'poolSwitch',court:'courtGate'}[room];this.award(key,state,{energy:'靶心点亮！恒温泳池的门已打开',pool:'水循环已启动 · 等浮台升起，沿落脚点向右跳',court:'光门已打开 · 向右进入训练跑道'}[room]);}
   if(b.kind==='return'&&b.owner==='player'&&prev<=29&&b.x>=29&&this.phase==='launcher'){b.life=0;this.enemy.hp--;state.emit('circuit-damage',{x:29,y:1.8});if(this.enemy.hp<=0){this.award('launcherWon',state,'反弹命中！发球机解除护盾，餐厅开放');this.phase='won';state.progress.doubleJump=true;state.emit('ability',{name:'回弹二段跳',text:'空中松开跳跃，再按一次可以跃得更高。先到右侧餐厅补给，再开近路回访健身中心高处的奖牌。'});state.emit('save');}}
   if(b.owner==='enemy'&&near(b.x,p.x,.8)&&Math.abs(b.y-(p.y+.8))<1){b.life=0;this.hurt(state);}
   if(b.x<0||b.x>36)b.life=0;
  }
  this.shots=this.shots.filter(b=>b.life>0);
  if(room==='energy'&&this.rebound&&!this.medal&&near(p.x,17.5,.9)&&near(p.y,5.65,.12)&&p.grounded)this.award('medal',state,'回访奖牌已获得 · 新能力让旧地方有了新的答案');
 }
 get status(){if(this.phase==='failed')return '训练暂停 · 可以立即重试';if(this.phase==='runner')return this.enemy.state==='windup'?'地面冲锋预警 · 准备跳跃':this.enemy.state==='rush'?'跳过冲锋！':'核心露出 · 靠近并面向守卫，按 J';if(this.phase==='launcher')return '护盾开启 · 面向右方，J 反弹来球';if(this.phase==='intermission')return '第一段完成 · 发球机正在准备';return this.launcherWon?'训练完成 · 右侧餐厅已开放':'击球打开光门，向右进入训练';}
}
