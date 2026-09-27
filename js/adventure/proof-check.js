// QA-only controllers: traverse the shipped physics and puzzle rules with real inputs.
import {SportsPhysics} from '../sports/physics.js';
import {PortalState,SPOTS} from '../portal/state.js';
import {RelaySimulation} from '../relay/simulation.js';
import {onBeat,BRANDS} from '../relay/course.js';
const dt=1/120;
const assert=(ok,message='Activity input route failed')=>{if(!ok)throw Error(message);};
assert.equal=(a,b,message)=>assert(a===b,message);
export function runSports(runId,stopCheckpoint=null){const p=new SportsPhysics();
let jumpAt={start:11.6,p1:23.6,p2:31.5,cp1:56.6,p4:65.5,lift:74.7,p6:83.5,p7:98.4,cp2:117.6,p9:123.5,shuttle:139.4,p11:153.6,p12:160,finish:173.5};
let failures=0,lastRetry=0;
for(let i=0;i<120*150&&!p.finished;i++){
 let axis=1,held=true;
 if(p.grounded){
  const ground=p.platforms.find(x=>x.id===p.groundId);
  let threshold=jumpAt[p.groundId]??ground.right-1.1;
  if(p.groundId==='p2'&&p.x>35.5)threshold=37;
  if(p.groundId==='p6'&&p.x>87.5)threshold=88.1;
  if(p.groundId==='p9'&&p.x>127.7)threshold=129;
  if(p.groundId==='p12'&&p.x>164.8)threshold=165.8;
  if(p.groundId==='finish'&&p.x>179)threshold=180;
  if(p.groundId==='finish'&&p.x>186)threshold=999;
  if(p.groundId==='lift'){
   if(p.x>73.8&&p.y<3.8){axis=p.x>74.15?-1:p.x<73.75?1:0;threshold=999;}
   else threshold=74.8;
  }
  if(p.groundId==='p4'&&p.x>64.3){const lift=p.platforms.find(p=>p.id==='lift');if(lift.y>3.2&&lift.dy>0){axis=p.x>64.9?-1:0;threshold=999;}}
  if(p.groundId==='shuttle')threshold=ground.right-1.1;
  if(p.x>=threshold){p.jump();if(p.groundId==='shuttle')p.dash();}
 }
 p.step(dt,{axis,jumpHeld:held});
 if(stopCheckpoint!==null&&p.checkpoint>=stopCheckpoint)break;
 if(p.retries>lastRetry){failures++;lastRetry=p.retries;if(failures>3)break;}
}

assert(stopCheckpoint!==null?p.checkpoint===stopCheckpoint:p.finished);assert.equal(p.retries,0);return {version:1,...p.snapshot(),finished:p.finished,finishX:p.x,campaign:runId};}

const wait=(s,seconds)=>{for(let t=0;t<seconds;t+=dt)s.step(dt);};
const walk=(s,target,{jumpAt=null,limit=12}={})=>{let jumped=false;for(let t=0;t<limit;t+=dt){if(Math.abs(s.player.x-target)<.055)return;const axis=Math.sign(target-s.player.x),jump=jumpAt!==null&&!jumped&&s.player.x>=jumpAt;if(jump)jumped=true;s.step(dt,{axis,jump});}throw Error(`Walk blocked: ${s.mode} ${s.player.x},${s.player.y} -> ${target}`);};
function route(s){walk(s,SPOTS.screen1);assert(s.enter('screen1'));assert(s.swap(0,2));assert(s.swap(1,2));assert(s.connected());walk(s,22,{jumpAt:9.45});wait(s,.5);assert(s.interact());assert(s.route);s.leave();}
function lamp(s){walk(s,SPOTS.lamp);assert(!s.lockLamp());assert(!s.lamp);assert(s.setAngle(1));assert(s.lockLamp());walk(s,SPOTS.screen2);assert(s.enter('screen2'));}

export function runPortal(runId){const s=new PortalState();route(s);lamp(s);walk(s,14);assert(s.startEcho());wait(s,2.1);walk(s,22);assert(s.interact());s.leave();walk(s,SPOTS.exit);assert(s.finish());return {...s.save(),campaign:runId};}
export function runRelay(runId){

const s=new RelaySimulation();const events=[];s.onEvent=(type,data)=>events.push({type,...data});
const step=(n,input={})=>{for(let i=0;i<n;i++)s.step(dt,input);};
const until=(predicate,max=1800,input={})=>{for(let i=0;i<max&&!predicate();i++)s.step(dt,typeof input==='function'?input():input);assert(predicate(),`timed out: stage ${s.stage}, phase ${s.phase}, x=${s.x.toFixed(2)}, y=${s.y.toFixed(2)}, ball=${s.ball.owner}`);};
const steer=x=>{const d=x-s.x,brake=s.vx*s.vx/(2*(s.grounded?46:30));return Math.abs(d)>.09+(Math.sign(d)===Math.sign(s.vx)?brake:0)?Math.sign(d):0;};
const move=x=>{const stage=s.stage;until(()=>stage!==s.stage||Math.abs(s.x-x)<.18&&Math.abs(s.vx)<.6,1800,()=>({axis:steer(x),jumpHeld:true}));};
const jumpTo=x=>{s.jump();step(1,{jumpHeld:true});until(()=>s.grounded,600,()=>({axis:steer(x),jumpHeld:true}));move(x);};
assert.equal(s.recordEcho(),false);assert.equal(s.ball.owner,'player');assert.equal(s.whistle(),undefined);assert.equal(s.stage,0);
move(6);s.playerThrow();assert.equal(s.playerThrow(),false,'one physical ball cannot be thrown twice');until(()=>s.ball.owner==='ANTA');assert(s.visited.has('ANTA'));assert.equal(s.stage,0,'first catch alone cannot skip relay');s.whistle();step(120);const moving=s.npcs[0].x;s.whistle();step(60);assert.equal(s.npcs[0].x,moving,'whistle pauses partner');s.whistle();move(29);until(()=>s.phase==='first-done');move(33);assert.equal(s.stage,1);
// Out-of-range echo use is rejected; manual pass, echo switch and player platform route all required.
s.playerThrow();until(()=>s.ball.owner==='FILA');assert.equal(s.recordEcho(),false);move(41);assert(s.recordEcho());s.whistle();move(52);until(()=>s.liftY===6&&s.npcs[1].x===62);assert.equal(s.y,0,'player does not ride the partner-only lift');
jumpTo(55.5);assert.equal(s.y,1.5);jumpTo(60.5);assert.equal(s.y,3);jumpTo(65.5);assert.equal(s.y,4.5);jumpTo(71);assert.equal(s.groundId,'catch-lift');s.whistle();until(()=>s.phase==='lift-done');move(79);assert.equal(s.stage,2);
move(88);s.playerThrow();until(()=>s.ball.owner==='DESCENTE');s.whistle();until(()=>s.ball.owner==='KOLON');assert(BRANDS.every(id=>s.visited.has(id)));move(118);s.whistle();until(()=>s.phase==='shot-ready');assert.equal(s.ball.owner,'player');
// A mistimed shot has an actual miss, restores the ball, and can be retried without losing assists.
until(()=>!onBeat(s.time));s.playerThrow();until(()=>s.retries>0);assert(!s.finished);assert.equal(s.ball.owner,'player');assert.equal(s.phase,'shot-ready');assert.equal(s.x,118);
until(()=>onBeat(s.time));s.playerThrow();until(()=>s.finished);assert.equal(s.ball.owner,'hoop');assert.equal(s.stage,2);assert(events.some(e=>e.type==='ring'));assert.equal(events.filter(e=>e.type==='finish').length,1);step(100);assert.equal(events.filter(e=>e.type==='finish').length,1);

return {...s.snapshot(),campaign:runId};}
