import {createPlatforms,updatePlatforms,HAZARDS,hazardActive,CHECKPOINTS,FINISH_X,COLLECTIBLES} from './course.js';
export const PHYSICS={gravity:27,jump:12.2,speed:7,dashSpeed:15,dashDuration:.22,dashCooldown:1.15,radius:.48,height:1.05};
const approach=(v,to,amount)=>v<to?Math.min(v+amount,to):Math.max(v-amount,to);
/** Simulation has no renderer or DOM. Every jump and moving-platform contact uses a fixed step. */
export class SportsPhysics{
 constructor(onEvent=()=>{}){this.onEvent=onEvent;this.platforms=createPlatforms();this.reset();}
 reset(save=null){
  this.time=Number.isFinite(save?.time)?Math.max(0,save.time):0;this.checkpoint=Number.isInteger(save?.checkpoint)?Math.max(0,Math.min(2,save.checkpoint)):0;
  this.collected=new Set((save?.collected||[]).filter(id=>COLLECTIBLES.some(c=>c.id===id)));this.retries=Math.max(0,Math.floor(save?.retries||0));
  this.shoes?.resetMotion();this.finished=false;this.deathTimer=0;this.jumpBuffer=0;this.coyote=0;this.dashTimer=0;this.dashCooldown=0;this.airDashed=false;this.facing=1;
  updatePlatforms(this.platforms,this.time);this.placeAtCheckpoint();
 }
 placeAtCheckpoint(){const c=CHECKPOINTS[this.checkpoint];this.shoes?.resetMotion();this.x=c.x;this.y=c.y;this.vx=0;this.vy=0;this.grounded=true;this.groundId=['start','cp1','cp2'][this.checkpoint];this.coyote=.12;this.dashTimer=0;this.dashCooldown=0;this.airDashed=false;this.invulnerable=.65;this.jumpBuffer=0;}
 jump(){if(!this.finished&&!this.deathTimer)this.jumpBuffer=.16;}
 dash(){if(this.finished||this.deathTimer||this.dashCooldown>0||(!this.grounded&&this.airDashed))return false;this.dashTimer=PHYSICS.dashDuration;this.dashCooldown=PHYSICS.dashCooldown;this.airDashed=!this.grounded;this.onEvent('dash');return true;}
 retry(){if(this.deathTimer||this.finished)return;this.retries++;this.deathTimer=.58;this.vx=0;this.vy=0;this.jumpBuffer=0;this.onEvent('fall');}
 snapshot(){return {checkpoint:this.checkpoint,time:this.time,collected:[...this.collected],retries:this.retries};}
 step(dt,{axis=0,jumpHeld=false}={}){
  if(this.finished)return;
  this.shoes?.tick(dt,this,{move:axis});this.time+=dt;updatePlatforms(this.platforms,this.time);
  if(this.deathTimer){this.deathTimer=Math.max(0,this.deathTimer-dt);if(!this.deathTimer){this.placeAtCheckpoint();this.onEvent('respawn');}return;}
  this.invulnerable=Math.max(0,this.invulnerable-dt);this.dashCooldown=Math.max(0,this.dashCooldown-dt);this.dashTimer=Math.max(0,this.dashTimer-dt);
  if(axis)this.facing=Math.sign(axis);
  if(this.grounded){const ground=this.platforms.find(p=>p.id===this.groundId);if(ground){this.x+=ground.dx;this.y=ground.y;}this.coyote=.12;this.airDashed=false;}else this.coyote=Math.max(0,this.coyote-dt);
  if(this.jumpBuffer>0&&this.coyote>0){this.vy=PHYSICS.jump;this.grounded=false;this.groundId=null;this.coyote=0;this.jumpBuffer=0;this.onEvent('jump');}
  this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
  const oldX=this.x,oldY=this.y;
  this.vx=this.dashTimer?this.facing*PHYSICS.dashSpeed:approach(this.vx,axis*PHYSICS.speed*(this.grounded?(this.shoes?.speedMultiplier||1):1),(this.grounded?44:27)*dt);
  this.x=Math.max(-4,Math.min(190,this.x+this.vx*dt));
  if(!jumpHeld&&this.vy>4.6)this.vy=4.6;
  this.vy-=PHYSICS.gravity*dt;this.y+=this.vy*dt;
  const wasGrounded=this.grounded,standingId=this.groundId;this.grounded=false;this.groundId=null;
  // Moving platforms are one-way tops: crossing from above is tested relative to their motion.
  let landing=null;
  if(wasGrounded){const support=this.platforms.find(p=>p.id===standingId);if(support&&this.x+PHYSICS.radius>=support.left&&this.x-PHYSICS.radius<=support.right)landing=support;}
  for(const p of this.platforms){
   if(this.x+PHYSICS.radius<p.left||this.x-PHYSICS.radius>p.right)continue;
   if(this.vy<=p.dy/dt+.01&&oldY>=p.y-p.dy-.035&&this.y<=p.y+.015){if(!landing||p.y>landing.y)landing=p;}
  }
  if(landing){this.y=landing.y;const impact=-this.vy;this.vy=0;this.grounded=true;this.groundId=landing.id;if(!wasGrounded){this.onEvent('land',{impact});this.airDashed=false;}}
  if(this.y<-7){this.retry();return;}
  if(!this.invulnerable)for(const h of HAZARDS){
   if(hazardActive(h,this.time)&&this.x+PHYSICS.radius>h.x-h.w/2&&this.x-PHYSICS.radius<h.x+h.w/2&&this.y<h.y+h.h-.08&&this.y+PHYSICS.height>h.y+.1){this.retry();return;}
  }
  // Swept segment collection prevents a dash skipping narrow pickups.
  for(const c of COLLECTIBLES){
   if(this.collected.has(c.id))continue;
   const ax=oldX,ay=oldY+.65,bx=this.x,by=this.y+.65,dx=bx-ax,dy=by-ay;
   const t=Math.max(0,Math.min(1,((c.x-ax)*dx+(c.y-ay)*dy)/(dx*dx+dy*dy||1)));
   if(Math.hypot(ax+t*dx-c.x,ay+t*dy-c.y)<(c.kind==='medal'?.78:.86)){this.collected.add(c.id);this.onEvent('collect',c);}
  }
  for(const c of CHECKPOINTS)if(c.id>this.checkpoint&&this.grounded&&Math.abs(this.x-c.x)<1.3&&Math.abs(this.y-c.y)<.1){this.checkpoint=c.id;this.onEvent('checkpoint',c);}
  if(this.x>=FINISH_X&&this.grounded){this.finished=true;this.vx=0;this.onEvent('finish');}
 }
}
