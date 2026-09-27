export const SAVE_KEY='wanbu-portal-v1';
export const PIECES={rise:{label:'上行',a:1,b:2},level:{label:'跨步',a:2,b:2},climb:{label:'跃升',a:2,b:4}};
export const DEFAULT_ORDER=['level','climb','rise'];
export const SPOTS={screen1:-11.2,lamp:3.4,screen2:6.2,exit:15.2};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class PortalState{
 constructor(saved){
  this.route=!!saved?.route;this.lamp=this.route&&!!saved?.lamp;this.echoSolved=this.lamp&&!!saved?.echoSolved;this.completed=this.echoSolved&&!!saved?.completed;
  this.order=Array.isArray(saved?.order)&&saved.order.length===3&&new Set(saved.order).size===3&&saved.order.every(x=>Object.hasOwn(PIECES,x))?[...saved.order]:[...DEFAULT_ORDER];
  if(this.route)this.order=['rise','level','climb'];
  this.angle=this.lamp?1:0;this.collected=new Set(Array.isArray(saved?.collected)?saved.collected.filter(x=>[0,1,2].includes(x)):[]);
  this.elapsed=Number.isFinite(saved?.elapsed)?Math.max(0,saved.elapsed):0;this.retries=Number.isFinite(saved?.retries)?Math.max(0,saved.retries):0;
  this.mode='gallery';this.player={x:this.echoSolved?12.5:this.lamp?4.2:this.route?-8:-13.6,y:this.echoSolved?4:this.lamp?1.5:0,vy:0,grounded:true,facing:1};
  this.events=[];this.echoTime=0;this.recordTime=0;this.recording=false;this.moving=false;this.autoTarget=null;this.jumpBuffer=0;this.coyote=0;this.returnX=-11.2;
 }
 emit(type,text=''){this.events.push({type,text});}
 save(){return {version:1,route:this.route,lamp:this.lamp,echoSolved:this.echoSolved,completed:this.completed,order:[...this.order],angle:this.angle,collected:[...this.collected],elapsed:this.elapsed,retries:this.retries};}
 connected(){let h=1;for(const id of this.order){const p=PIECES[id];if(p.a!==h)return false;h=p.b;}return h===4;}
 swap(a,b){if(this.mode!=='screen1'||this.route||a===b||![a,b].every(v=>Number.isInteger(v)&&v>=0&&v<3))return false;[this.order[a],this.order[b]]=[this.order[b],this.order[a]];this.player.x=.9;this.player.y=1;this.player.vy=0;this.player.grounded=true;this.emit('tile',this.connected()?'接口已接通，带小步走到右侧开关。':'面板已交换。观察两侧接口的高度。');return true;}
 floor(x){
  if(this.mode==='gallery'){
   if(x>=-16.6&&x<=-4)return 0;
   if(this.route&&x>-4&&x<0)return (x+4)*.375;
   if(x>=0&&x<=8)return 1.5;
   if(this.echoSolved&&x>8&&x<12)return 1.5+(x-8)*.625;
   if(x>=12&&x<=17.2)return 4;
   return null;
  }
  if(x<0||x>24)return null;
  if(this.mode==='screen1'){
   if(x<3)return 1;if(x>=18)return 4;
   const i=Math.min(2,Math.floor((x-3)/5)),p=PIECES[this.order[i]],u=(x-3-i*5)/5;if(this.order[i]==='level'&&u>.40&&u<.63)return null;return p.a+(p.b-p.a)*u;
  }
  if(x<=6)return 1;if(x<12)return this.lamp?1+(x-6)*.5:null;return 4;
 }
 near(id){return this.mode==='gallery'&&Math.abs(this.player.x-SPOTS[id])<1.75;}
 enter(which){
  if(which==='screen1'&&!this.near('screen1')||which==='screen2'&&!this.near('screen2'))return false;
  this.returnX=SPOTS[which];this.mode=which;this.autoTarget=null;this.player={x:.9,y:1,vy:0,grounded:true,facing:1};this.echoTime=0;this.recording=false;this.recordTime=0;
  this.emit('enter',which==='screen1'?'交换三块面板，连接金色入口与开关。':'沿光影台阶上行，在圆盘上按 E 留下回声。');return true;
 }
 leave(){if(this.mode==='gallery')return;this.mode='gallery';this.player={x:this.returnX,y:this.returnX<0?0:1.5,vy:0,grounded:true,facing:1};this.autoTarget=null;this.echoTime=0;this.recordTime=0;this.recording=false;this.emit('leave');}
 setAngle(v){if(!this.near('lamp')||!Number.isInteger(v)||v<0||v>2||this.lamp)return false;this.angle=v;this.emit('tile','投影已转动。观察台阶是否连续抵达上层。');return true;}
 lockLamp(){if(!this.near('lamp'))return false;if(this.angle===1){this.lamp=true;this.emit('lamp','投影对齐！上层屏幕中的台阶已形成。');return true;}this.emit('fail','台阶还没有接到上层，换个角度再观察。');return false;}
 startEcho(){
  if(this.mode!=='screen2'||this.echoSolved)return false;
  if(Math.abs(this.player.x-14)>.9||!this.player.grounded){this.emit('fail','先站到上层的回声圆盘，再按 E。');return false;}
  this.recording=true;this.recordTime=0;this.echoTime=0;this.emit('record','保持站在圆盘上 2 秒，录制你的位置。');return true;
 }
 gateOpen(){return this.echoSolved||this.echoTime>0||this.mode==='screen2'&&Math.abs(this.player.x-14)<.9&&this.player.grounded;}
 interact(){
  if(this.mode==='gallery'){
   if(this.near('screen1'))return this.enter('screen1');
   if(this.near('lamp')){this.emit('projector');return true;}
   if(this.near('screen2'))return this.enter('screen2');
   if(this.near('exit')&&this.echoSolved)return this.finish();
   this.emit('hint','靠近发光足迹或装置再操作。');return false;
  }
  if(this.mode==='screen1'&&this.player.x>21.2&&this.player.grounded){
   if(!this.connected()){this.emit('fail','仍有接口没有连接，先调整面板。');return false;}
   this.route=true;this.emit('route','第一段连廊已展开！退出屏幕，走向投影装置。');return true;
  }
  if(this.mode==='screen2'&&this.player.x>21.2&&this.player.grounded&&this.lamp){
   this.echoSolved=true;this.emit('echoSolved','回声联动成功！最后一段连廊已接通。');return true;
  }
  this.emit('hint',this.mode==='screen1'?'走到屏幕右侧的金色开关，按 F 激活。':'在圆盘录制回声，穿过光门后按 F 激活开关。');return false;
 }
 finish(){if(!this.echoSolved||!this.near('exit'))return false;if(!this.completed){this.completed=true;this.emit('complete','足迹成路，灵感相连。');}return true;}
 retry(){this.retries++;this.autoTarget=null;this.echoTime=0;this.recordTime=0;this.recording=false;this.jumpBuffer=0;
  if(this.mode==='gallery'){this.player.x=this.echoSolved?12.5:this.route?1:-13.6;this.player.y=this.echoSolved?4:this.route?1.5:0;}else{this.player.x=.9;this.player.y=1;}
  this.player.vy=0;this.player.grounded=true;this.emit('retry','回到当前阶段起点，已完成的机关和足迹保留。');
 }
 step(dt,input={}){
  dt=clamp(dt,0,1/30);if(!this.completed)this.elapsed+=dt;
  this.echoTime=Math.max(0,this.echoTime-dt);const p=this.player;
  if(this.recording){if(Math.abs(p.x-14)>.9||!p.grounded){this.recording=false;this.recordTime=0;this.emit('fail','录制中断。站稳后可重新录制。');}else{this.recordTime+=dt;if(this.recordTime>=2){this.recording=false;this.echoTime=10;this.emit('echo','回声会保持 10 秒，穿过右侧光门！');}}}
  if(input.jump)this.jumpBuffer=.13;else this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
  this.coyote=p.grounded?.1:Math.max(0,this.coyote-dt);
  if(this.jumpBuffer>0&&this.coyote>0){p.vy=7.6;p.grounded=false;this.coyote=0;this.jumpBuffer=0;this.emit('jump');}
  let dir=clamp(input.axis||0,-1,1);if(dir)this.autoTarget=null;
  if(this.autoTarget!==null){const diff=this.autoTarget-p.x;if(Math.abs(diff)<.08)this.autoTarget=null;else dir=Math.sign(diff);}
  const speed=this.mode==='gallery'?4.6:4.25,nx=clamp(p.x+dir*speed*dt,this.mode==='gallery'?-17:-.5,this.mode==='gallery'?18:24.5);
  const height=this.floor(nx),oldHeight=this.floor(p.x);
  let blocked=false;
  if(this.mode==='screen2'&&!this.gateOpen()&&p.x<19.15&&nx>=19.15){blocked=true;if(dir)this.emitOnceGate=true;}
  if(height!==null&&height>p.y+.18&&(!p.grounded||oldHeight===null||Math.abs(height-oldHeight)>.18))blocked=true;
  if(!blocked){p.x=nx;if(dir)p.facing=dir;}
  this.moving=!!dir&&!blocked;
  if(this.autoTarget!==null&&this.mode==='gallery'&&height===null&&p.grounded){p.x-=dir*speed*dt;this.autoTarget=null;this.moving=false;this.emit('hint','这段通路还没有展开，先完成发光装置。');}
  const floor=this.floor(p.x);
  if(p.grounded&&floor!==null&&Math.abs(p.y-floor)<.2)p.y=floor;
  else p.grounded=false;
  if(!p.grounded){const prev=p.y;p.vy-=20*dt;p.y+=p.vy*dt;if(floor!==null&&p.vy<=0&&prev>=floor-.2&&p.y<=floor){p.y=floor;p.vy=0;p.grounded=true;this.emit('land');}}
  if(p.y< -4)this.retry();
  const coins=this.mode==='screen1'?[[0,6,3],[1,16,5.0]]:this.mode==='screen2'?[[2,10,4.7]]:[];
  for(const [id,x,y]of coins)if(!this.collected.has(id)&&Math.abs(p.x-x)<.65&&Math.abs(p.y+.6-y)<.8){this.collected.add(id);this.emit('collect','发现一枚隐藏足迹 · '+this.collected.size+' / 3');}
 }
}
