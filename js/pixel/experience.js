import {CAMPUS_ROOMS} from '../campus/content.js';
import {HURDLES,BUMPERS} from '../arrival/content.js';
export function routeTarget(s){
 const goal=s.mission;if(goal.room===s.roomId)return goal;
 const edges=id=>{
  const room=s.circuit?.rooms[id]||CAMPUS_ROOMS[id];if(!room)return [];
  const out=room.items.filter(i=>i.type==='route'&&(!i.requires||s.progress[i.requires])).map(i=>({...i,to:i.room}));
  for(const [side,e] of Object.entries(room.exits||{})){const to=e.room;if(to)out.push({to,x:side==='left'?.6:room.width-.6,y:e.y||0,label:'前往'+CAMPUS_ROOMS[to]?.name});}
  if(id==='garden'&&s.canEnter('arena'))out.push({to:'arena',x:30,y:0,label:'进入运动场馆'});
  if(id==='garden'&&s.stamps.includes('green'))out.push({to:'hub',x:3,y:0,label:'大堂捷径'});
  if(id==='arrival'&&s.arrival.ready)out.push({to:'hub',x:99,y:0,label:'进入大堂'});
  return out.filter(e=>s.canEnter(e.to));
 };
 const queue=[{id:s.roomId,first:null}],seen=new Set([s.roomId]);
 for(let i=0;i<queue.length;i++){const node=queue[i];for(const e of edges(node.id)){if(seen.has(e.to))continue;const first=node.first||e;if(e.to===goal.room)return {...first,room:s.roomId};seen.add(e.to);queue.push({id:e.to,first});}}
 return null;
}
export function actionHint(s){
 const p=s.player,item=s.nearby();
 if(s.guardian.active)return s.guardian.phase==='stunned'?'核心露出！靠近、面向守卫，按 J 爪击':s.guardian.phase==='windup'?'橙色预警：等守卫接近，再跳过冲刺':'跳过冲刺 · 停顿时靠近按 J';
 if(s.circuit.fighting)return s.circuit.phase==='launcher'?'面向来球，按 J 将球打回':'跳过冲线机，停顿时靠近按 J';
 if(item)return 'F 互动 · '+item.label;
 if(s.roomId==='arrival'){
  const a=s.arrival;
  if(BUMPERS.some(b=>!a.defeated.has(b.id)&&Math.abs(a.bumperX(b)-p.x)<5))return '跳过训练球，或从上方踩落它';
  if([22,46,73].some(x=>x-p.x<5&&x-p.x>-.6))return '前方是缺口 · 助跑后按住跳跃';
  if(HURDLES.some(h=>h.x-p.x<5&&h.x+h.w>p.x))return '前方矮栏 · 按住空格跳得更高';
  if(p.x<8)return 'A / D 移动 · 空格跳跃 · 追着金币向右跑';
  if(p.x>93)return a.ready?'入口已亮起 · 在大楼门口按 F':`还差 ${Math.max(0,8-a.coins.size)} 枚金币，沿步道寻找`;
  return '金色方块从下方顶一下，可获得 3 枚足迹币';
 }
 const t=routeTarget(s);if(t)return (t.y>p.y+.8?'↑ 跳上高台 · ':t.x>p.x?'→ 向右探索 · ':'← 向左探索 · ')+t.label;
 return s.objective();
}
export class CollectionChain{
 constructor(){this.clear();}
 clear(){this.count=0;this.value=0;this.remaining=0;}
 add(value){if(this.remaining<=0)this.clear();this.count++;this.value+=value;this.remaining=2.4;}
 tick(dt){this.remaining=Math.max(0,this.remaining-dt);}
 get text(){return this.count>1?`${this.count} 连收  ·  +${this.value}`:`足迹币 +${this.value}`;}
}
