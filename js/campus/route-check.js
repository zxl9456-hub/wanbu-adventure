import {runArrival} from '../arrival/proof.js';
import {runCircuit} from '../circuit/proof.js';
import {runSports,runPortal,runRelay} from '../adventure/proof-check.js';
// Deterministic end-to-end route used by both Node and the browser QA page.
// Every campus traversal uses the same input and physics as a player.
import {LabState,IDS} from '../lab/state.js';
import {SITES} from './content.js';
import {CampusState} from './state.js';
export function solveLab(runId){
 const lab=new LabState();
 for(const id of IDS){
  if(!lab.awaken(id))throw Error('微光暗格未唤醒');
  lab.tick(1.7);if(!lab.collect(id))throw Error('字母未取出');
 }
 lab.insert();lab.tick(8.1);lab.finish();return {...lab.snapshot(),campaign:runId};
}
export function campaignPlan(state){
 const move=(x,y=0,jump=false)=>({name:`${x},${y} 落脚点`,move:[x,y],jump});
 const exit=(room,direction)=>({name:'步行进入 '+room,exit:room,direction});
 const action=(name,fn)=>({name,fn});
 const interact=name=>action(name,()=>state.interact());
 const wait=seconds=>({name:`等待 ${seconds}s`,wait:seconds});
 return [
  action('门前跑跳并从大楼入口进入',()=>runArrival(state)),
  move(18),...SITES.map(([id])=>action('连接 '+id,()=>state.connect(id))),move(13,2.3),move(11,2.3),interact('进入健身中心'),move(16),
  action('体育回路完整输入通关',()=>runCircuit(state)),
  action('云端步道完整输入通关',()=>{state.beginChallenge('sports');if(!state.acceptActivity('sports',runSports(state.runId)))throw Error('跑酷回程失败');}),move(3),interact('返回大堂'),move(5),exit('lab',-1),
  move(25.5),move(22,2.2),interact('获得冲刺'),move(18.7,2.2),move(13,2,true),move(7.5,2),move(6.45),
  {name:'冲刺穿过光幕',dashTo:4.5},exit('core',-1),
  move(24,1.9),move(16,3.8),move(8,5.7),move(11.5,5.7),interact('解锁二段跳'),
  action('四处微光收集与主线奖励衔接',()=>{if(!state.acceptLab(solveLab(state.runId)))throw Error('密室回程奖励失败');}),
  move(29),exit('lab',1),move(7,0),move(10,2),move(3,5),interact('进入足迹档案'),move(11,2.2),
  action('足迹穿梭完整输入通关',()=>{state.beginChallenge('portal');if(!state.acceptActivity('portal',runPortal(state.runId)))throw Error('穿梭回程失败');}),move(3),interact('返回连廊'),move(10,2),move(13,2),move(20,2.2,true),move(23,2.2),move(26),
  action('开始记录回声',()=>state.update(1/120,{echoPressed:true})),wait(.65),action('释放回声',()=>state.update(1/120,{echoPressed:true})),move(30),wait(1.3),
  action('检查双实体同步',()=>{if(!state.progress.relayOpen)throw Error('双点未同步');}),move(31),interact('进入垂直中庭'),
  move(8),move(14,2),move(23,5.3),move(29,7.3),interact('抵达空中花园'),move(8),move(13),interact('绿色能源'),move(22),
  action('连接真实水管端口',()=>{state.rotate(0);state.rotate(1);state.rotate(1);state.rotate(2);}),
  move(8),move(7,3),move(17,5),move(28,7),interact('登高进入共创办公区'),move(6),interact('ANTA 接力'),move(12),interact('FILA 接力'),move(20),interact('DESCENTE 接力'),move(27),interact('KOLON 接力'),
  action('全楼接力完整输入通关',()=>{state.beginChallenge('relay');if(!state.acceptActivity('relay',runRelay(state.runId)))throw Error('接力回程失败');}),move(3),interact('回到花园'),move(22),move(30),interact('足迹币解锁运动馆'),interact('进入运动馆'),
  action('开始疾风训练',()=>{if(!state.startGuardian())throw Error('无法开始 Boss');}),{name:'真实跳跃与爪击击败',guardian:true},exit('garden',-1),move(3),interact('开启大堂捷径'),move(24),interact('点亮万步之光'),
  action('结局与存档恢复',()=>{const loaded=new CampusState(state.save());if(!state.finished||state.stamps.length!==5||!loaded.finished||!loaded.progress.shortcut)throw Error('结局或恢复失败');})
 ];
}
export class RouteRunner{
 constructor(state){this.state=state;this.tasks=campaignPlan(state);this.index=0;this.frames=0;this.cooldown=0;this.elapsed=0;this.summary=[];}
 get done(){return this.index>=this.tasks.length;}
 get task(){return this.tasks[this.index];}
 advance(){
  const task=this.task,s=this.state,p=s.player;if(!task)return;
  if(++this.frames>3600)throw Error(`无法抵达 ${task.name}，位于 ${s.roomId} ${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  const finish=()=>{this.summary.push(task.name);this.index++;this.frames=0;this.elapsed=0;};
  if(task.guardian){if(s.guardian.phase==='won'){finish();return;}if(s.guardian.phase==='failed')throw Error('Boss 挑战失败');guardianStep(s);return;}
  if(task.fn){if(task.name.includes('接力')&&s.passTime>0){s.update(1/120,{});return;}task.fn();finish();return;}
  if(task.wait){s.update(1/120,{});this.elapsed+=1/120;if(this.elapsed>=task.wait)finish();return;}
  if(task.exit){if(s.roomId===task.exit){finish();return;}s.update(1/120,{move:task.direction});return;}
  if(task.dashTo){if(p.x<task.dashTo){finish();return;}s.update(1/120,{move:-1,dashPressed:p.dashCooldown===0});return;}
  const [x,y]=task.move,dx=x-p.x;
  if(Math.abs(dx)<.3&&Math.abs(p.y-y)<.12&&p.grounded){if(Math.abs(p.vx)>.6){s.update(1/120,{});return;}finish();return;}
  this.cooldown--;const needJump=p.y<y-.18;
  const jump=p.grounded&&this.cooldown<=0&&(needJump||(task.jump&&Math.abs(dx)>1))||!p.grounded&&s.progress.doubleJump&&!p.airJump&&p.vy<2&&needJump;
  if(jump)this.cooldown=50;
  s.update(1/120,{move:Math.abs(dx)>.07?Math.sign(dx):0,jumpPressed:jump,jumpHeld:true});
 }
}

// Controller used only by the visible QA route. Never modifies the player or Boss directly.
export function guardianStep(state){
 const g=state.guardian,p=state.player;let move=0,jump=false,attack=false;
 if(g.phase==='stunned'){
  const dx=g.x-p.x;
  move=Math.abs(dx)>2.6||p.facing!==Math.sign(dx)?Math.sign(dx):0;
  attack=Math.abs(dx)<=3.15&&p.attackCooldown<=0;
 }else if(g.phase==='dash')jump=p.grounded&&Math.abs(g.x-p.x)<5&&g.face*(p.x-g.x)>0;
 else if(g.phase==='windup'||g.phase==='recover')move=Math.abs(p.x-18)>.3?Math.sign(18-p.x):0;
 state.update(1/120,{move,jumpPressed:jump,jumpHeld:true,attackPressed:attack});
}
