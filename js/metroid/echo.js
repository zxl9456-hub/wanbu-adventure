export const RECORD_SECONDS=3,HOLD_SECONDS=6;
const pose=p=>({x:p.x,y:p.y,facing:p.facing,grounded:p.grounded,vx:p.vx,vy:p.vy,dashing:p.dashTime>0});
export class FootstepEcho{
 constructor(){this.clear();}
 clear(){this.phase='idle';this.frames=[];this.elapsed=0;this.pose=null;this.cursor=0;}
 start(player){this.clear();this.phase='record';this.frames=[{t:0,...pose(player)}];}
 release(){
  if(this.phase!=='record'||this.elapsed<.25)return false;
  this.phase='replay';this.elapsed=0;this.cursor=0;this.pose={...this.frames[0]};return true;
 }
 get recorded(){return this.frames.at(-1)?.t||0;}
 get remaining(){return this.phase==='record'?RECORD_SECONDS-this.elapsed:this.phase==='replay'?Math.max(0,this.recorded+HOLD_SECONDS-this.elapsed):0;}
 tick(dt,player){
  if(this.phase==='idle')return;this.elapsed+=dt;
  if(this.phase==='record'){
   this.frames.push({t:this.elapsed,...pose(player)});
   if(this.elapsed>=RECORD_SECONDS)this.release();return;
  }
  if(this.elapsed>=this.recorded+HOLD_SECONDS){this.clear();return;}
  while(this.cursor<this.frames.length-1&&this.frames[this.cursor+1].t<=this.elapsed)this.cursor++;
  const a=this.frames[this.cursor],b=this.frames[this.cursor+1]||a,t=b.t>a.t?Math.max(0,Math.min(1,(this.elapsed-a.t)/(b.t-a.t))):0;
  this.pose={...a,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  if(this.elapsed>=this.recorded){this.pose.vx=0;this.pose.vy=0;this.pose.dashing=false;}
 }
}
