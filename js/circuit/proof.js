// QA driver: movement, jumps, attacks and interactions use the real controller.
// This module is never imported by the normal game entry.
export function circuitPlan(s,{medal=true,purchase=false}={}){
 const move=(x,y=0,jump=false)=>({name:`走到 ${x},${y}`,move:[x,y],jump});
 const use=name=>({name,act:()=>s.interact()});
 const wait=seconds=>({name:'等待浮台升起',wait:seconds});
 return [move(5),use('领取爪击'),move(7),move(14),move(18.5),{name:'击球打开泳池',shoot:'target'},move(33),use('进入泳池'),move(4),{name:'击球启动水位',shoot:'poolSwitch'},wait(2),move(8),move(13,.25,true),move(19,1.05,true),move(24.5,.55,true),move(30,0,true),move(34),use('进入训练馆'),move(3.7),{name:'击球打开训练光门',shoot:'courtGate'},move(17),{name:'真实闪避和反弹完成两段战斗',combat:true},move(34),use('进入餐厅'),move(8),use('免费补给'),move(16),{name:'邀请 MAIA 伙伴',act:()=>{if(!s.circuit.choosePartner('MAIA',s))throw Error('伙伴邀请失败');}},...(purchase?[move(23),{name:'购买暖光休息角',act:()=>{if(!s.circuit.purchase('restCorner',s))throw Error('设施购买失败');}}]:[]),move(32),use('打开健身近路'),...(medal?[move(24,2.2),move(17.5,5.65),{name:'检查回访奖牌',act:()=>{if(!s.circuit.medal)throw Error('奖牌没有通过实际跳跃收集');}},move(30)]:[]),move(16)];
}
export function circuitCombatInput(s){
 const c=s.circuit,p=s.player,e=c.enemy;let move=0,jumpPressed=false,attackPressed=false;
 if(c.phase==='failed')throw Error('体育回路战斗失败');
 if(c.phase==='runner'){
  if(e.state==='recover'){const d=e.x-p.x;move=Math.abs(d)>2.6||p.facing!==Math.sign(d)?Math.sign(d):0;attackPressed=Math.abs(d)<3.1&&p.attackCooldown<=0;}
  else if(e.state==='rush')jumpPressed=p.grounded&&Math.abs(e.x-p.x)<4.8&&e.face*(p.x-e.x)>0;
  else move=Math.abs(p.x-20)>.3?Math.sign(20-p.x):0;
 }else if(c.phase==='launcher'){
  move=Math.abs(p.x-19)>.2?Math.sign(19-p.x):p.facing<0?1:0;
  attackPressed=p.attackCooldown<=0&&c.shots.some(b=>b.owner==='enemy'&&b.x-p.x>1&&b.x-p.x<3.25);
 }
 return {move,jumpPressed,jumpHeld:true,attackPressed};
}
export class CircuitRunner{
 constructor(state,options){this.state=state;this.tasks=circuitPlan(state,options);this.index=0;this.frames=0;this.time=0;this.jumpCooldown=0;this.summary=[];}
 get done(){return this.index>=this.tasks.length;}
 advance(){const s=this.state,p=s.player,t=this.tasks[this.index];if(!t)return;if(++this.frames>7200)throw Error(`${t.name} 超时 @ ${s.roomId} ${p.x.toFixed(2)},${p.y.toFixed(2)} ${s.circuit.phase}`);const finish=()=>{this.summary.push(t.name);this.index++;this.frames=0;this.time=0;};
  if(t.act){t.act();finish();return;}
  if(t.wait){s.update(1/120,{});this.time+=1/120;if(this.time>=t.wait)finish();return;}
  if(t.shoot){if(s.circuit[t.shoot]){finish();return;}s.update(1/120,{move:p.facing<0?1:0,attackPressed:p.attackCooldown<=0});return;}
  if(t.combat){if(s.circuit.launcherWon){finish();return;}s.update(1/120,circuitCombatInput(s));return;}
  const [x,y]=t.move,dx=x-p.x;if(Math.abs(dx)<.3&&Math.abs(p.y-y)<.1&&p.grounded){if(Math.abs(p.vx)>.5){s.update(1/120,{});return;}finish();return;}
  this.jumpCooldown--;const needs=p.y<y-.16;const jump=p.grounded&&this.jumpCooldown<=0&&(needs||t.jump&&Math.abs(dx)>1)||!p.grounded&&s.progress.doubleJump&&!p.airJump&&p.vy<2&&needs;if(jump)this.jumpCooldown=50;
  s.update(1/120,{move:Math.abs(dx)>.07?Math.sign(dx):0,jumpPressed:jump,jumpHeld:true});
 }
}
export function runCircuit(state,options){const runner=new CircuitRunner(state,options);while(!runner.done){runner.advance();state.drain();}return runner.summary;}
