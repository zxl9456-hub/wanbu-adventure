import {ARRIVAL_COINS,HURDLES,BLOCKS,BUMPERS,CHECKPOINTS} from './content.js';
const subset=(raw,valid)=>new Set((Array.isArray(raw)?raw:[]).filter(x=>valid.includes(x)));
export class ArrivalState{
 constructor(raw={},legacy=false){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
  this.coins=subset(raw.coins,ARRIVAL_COINS.map(c=>c.id));this.blocks=subset(raw.blocks,BLOCKS.map(b=>b.id));this.defeated=subset(raw.defeated,BUMPERS.map(b=>b.id));
  this.checkpoint=Number.isInteger(raw.checkpoint)?Math.max(0,Math.min(3,raw.checkpoint)):0;
  this.legacy=legacy||raw.legacy===true;this.done=this.legacy||raw.done===true&&this.coins.size>=8;this.clock=0;this.old={x:3,y:0,vy:0};this.bumps=0;
 }
 get earned(){return this.coins.size+this.blocks.size*3+this.defeated.size*3;}
 get ready(){return this.coins.size>=8||this.done;}
 snapshot(){return {legacy:this.legacy,coins:[...this.coins],blocks:[...this.blocks],defeated:[...this.defeated],checkpoint:this.checkpoint,done:this.done};}
 bumperX(b){return (b.left+b.right)/2+Math.sin(this.clock*1.45+(b.id==='ball-2'?1.8:0))*(b.right-b.left)/2;}
 before(state){this.old={x:state.player.x,y:state.player.y,vy:state.player.vy};}
 recover(state,text='回到最近的足迹旗 · 已收集的金币保留'){
  const p=state.player;Object.assign(p,{x:CHECKPOINTS[this.checkpoint],y:0,vx:0,vy:0,grounded:true,airJump:false,airDash:false,dashTime:0,invulnerable:1.3});state.safePoint={x:p.x,y:0};state.recovering=false;state.emit('hint',{text});state.emit('save');
 }
 tick(dt,state){
  if(state.roomId!=='arrival')return;this.clock+=dt;const p=state.player;
  // Solid sides: a grounded player cannot walk through the decorative hurdle mesh.
  for(const h of HURDLES)if(p.y<h.h-.02&&this.old.y<h.h-.02&&p.x+.43>h.x&&p.x-.43<h.x+h.w){p.x=this.old.x<h.x?h.x-.43:h.x+h.w+.43;p.vx=0;}
  // Head bumps use the actual player trajectory; each bonus block pays once.
  for(const b of BLOCKS)if(p.vy>0&&Math.abs(p.x-b.x)<.95&&this.old.y+1.5<=b.y-.35&&p.y+1.5>=b.y-.35){p.y=b.y-.35-1.5;p.vy=-1;if(!this.blocks.has(b.id)){this.blocks.add(b.id);state.emit('coin',{value:3});state.emit('arrival-block',{x:b.x,y:b.y});state.emit('save');}}
  for(const c of ARRIVAL_COINS)if(!this.coins.has(c.id)&&Math.abs(p.x-c.x)<.82&&Math.abs(p.y+1-c.y)<1.05){this.coins.add(c.id);state.emit('coin',{value:1});state.emit('save');}
  for(const b of BUMPERS){if(this.defeated.has(b.id))continue;const x=this.bumperX(b);if(Math.abs(p.x-x)<.9){
   if(p.vy<=0&&this.old.y>=1.05&&p.y<=1.18){this.defeated.add(b.id);p.y=1.18;p.vy=9;p.grounded=false;state.emit('coin',{value:3});state.emit('arrival-stomp',{x,y:1});state.emit('save');}
   else if(p.y<1.1&&p.invulnerable<=0){this.bumps++;this.recover(state,'碰到训练球了 · 跳过它，或从上方踩落');return;}
  }}
  if(p.y<-2.5){state.falls++;this.recover(state);return;}
  CHECKPOINTS.forEach((x,i)=>{if(i>this.checkpoint&&p.y>=-.2&&p.y<4.5&&p.x>=x&&p.x<x+2){this.checkpoint=i;state.emit('hint',{text:'足迹旗已点亮 · 从这里继续'});state.emit('save');}});
 }
 enter(state){if(!this.ready){state.emit('hint',{text:`再找 ${8-this.coins.size} 枚金币，点亮大楼入口`});return false;}this.done=true;state.enter('hub',8,0);state.emit('hint',{text:'欢迎来到上海安踏中心 · 到三地模型旁按 F，连接下一段冒险'});state.emit('save');return true;}
 objective(state){if(this.ready)return {chapter:'roots',room:'arrival',x:99,y:0,label:'大楼发光入口',text:'继续向右，跳过障碍，在大楼门口按 F 进入大堂'};const next=ARRIVAL_COINS.find(c=>!this.coins.has(c.id)&&c.x>state.player.x-.8)||ARRIVAL_COINS.find(c=>!this.coins.has(c.id));return {chapter:'roots',room:'arrival',x:next?.x||99,y:0,label:'收集金币',text:`收集 8 枚金币点亮入口 · ${this.coins.size} / 8；按住跳跃越过矮栏和缺口`};}
}
