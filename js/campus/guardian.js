import {CLAW,GUARDIAN_HP,EXPOSE_TIME,DEFEAT_TIME,clawTouches} from './combat.js';
// Fixed-step combat: only an actual directional claw hit can remove Boss HP.
export class GaleGuardian{
 constructor(seed=0){this.seed=seed>>>0;this.randomState=this.seed||1;this.phase='idle';this.x=28;this.face=-1;this.maxHP=GUARDIAN_HP;this.hp=this.maxHP;this.hearts=3;this.timer=0;this.invulnerable=0;this.hitFlash=0;this.defeatTime=0;this.lastStrike=-1;this.round=0;this.variant=seed?'自由训练':'初次挑战';}
 get cores(){return Math.min(3,Math.floor((this.maxHP-this.hp)/(this.maxHP/3)));}
 get fighting(){return ['windup','dash','stunned','recover'].includes(this.phase);}
 get active(){return this.fighting||this.phase==='defeated';}
 random(){this.randomState=(Math.imul(this.randomState,1664525)+1013904223)>>>0;return this.randomState/4294967296;}
 start(){this.x=28;this.hp=this.maxHP;this.hearts=3;this.round=0;this.invulnerable=0;this.hitFlash=0;this.defeatTime=0;this.lastStrike=-1;this.prepare();}
 prepare(){this.round++;this.face=this.x>18?-1:1;this.target=this.face<0?7:29;this.phase='windup';this.timer=this.seed?1.35+this.random()*.65:1.65;this.speed=this.seed?12+this.random()*4:12;}
 get hint(){return ({idle:'F 开始挑战 · J 能量爪击',windup:`${this.face<0?'←':'→'} 地面冲刺预警 · 准备跳跃`,dash:'跳过冲刺，也可在空中按 J 反击',stunned:'核心露出！面向猎豹，近距离按 J，伤害 ×2',recover:'守护者重启 · 留意下一轮预警',defeated:'HP 归零 · 能量正在消散',won:'Boss 已击败 · 运动场馆已点亮',failed:'挑战失败 · 可立即重试，金币与印章保留'})[this.phase];}
 strike(player,attack,emit){
  if(!this.fighting||attack?.id===this.lastStrike||!clawTouches(player,attack,this))return false;
  attack.hit=true;this.lastStrike=attack.id;const critical=this.phase==='stunned',damage=critical?CLAW.weakDamage:CLAW.damage;
  this.hp=Math.max(0,this.hp-damage);this.hitFlash=.17;
  emit('guardian-damaged',{damage,critical,hp:this.hp,x:this.x,y:2.2});
  if(this.hp===0){this.phase='defeated';this.timer=DEFEAT_TIME;this.defeatTime=0;emit('guardian-defeated',{x:this.x,y:1.5});}
  return true;
 }
 update(dt,p,emit){
  this.hitFlash=Math.max(0,this.hitFlash-dt);
  if(this.phase==='defeated'){this.defeatTime=Math.min(DEFEAT_TIME,this.defeatTime+dt);this.timer-=dt;if(this.timer<=0){this.phase='won';emit('guardian-win');}return;}
  if(!this.fighting)return;this.timer-=dt;this.invulnerable=Math.max(0,this.invulnerable-dt);
  if(this.phase==='windup'&&this.timer<=0){this.phase='dash';this.timer=0;emit('guardian-dash');}
  if(this.phase==='dash'){
   this.x+=this.face*this.speed*dt;
   if(Math.abs(p.x-this.x)<1.65&&p.y<1.65&&this.invulnerable===0){this.hearts--;this.invulnerable=1.7;emit('guardian-hit',{hearts:this.hearts});if(this.hearts===0){this.phase='failed';emit('guardian-failed');return;}}
   if(this.face*(this.x-this.target)>=0){this.x=this.target;this.phase='stunned';this.timer=EXPOSE_TIME;emit('guardian-stunned');}
  }else if((this.phase==='stunned'||this.phase==='recover')&&this.timer<=0)this.prepare();
 }
}
