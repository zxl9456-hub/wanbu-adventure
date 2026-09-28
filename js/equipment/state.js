export const SHOES={
 pg7:{id:'pg7',model:'PG7 Travel 3',name:'缓冲行者',cost:15,color:0xa2e7ce,tag:'安心探索',text:'每段训练或 Boss 挑战，抵挡一次碰撞伤害。',detail:'护盾触发后短暂无敌；下一段训练或重试时恢复。',source:'https://sea.anta.com/products/anta-pg7-travel-3-men'},
 c202:{id:'c202',model:'C202 7',name:'逐光疾跑',cost:25,color:0xffcc65,tag:'跑酷提速',text:'同向奔跑 1.5 秒，地面最高提速 25%，留下金色足迹。',detail:'停止或转向后退回普通速度；起跳后使用稳定空速，方便控制落点。',source:'https://anta.com/products/mens-anta-c202-7'},
 kai3:{id:'kai3',model:'KAI 3',name:'幻影变向',cost:40,color:0xc3acff,tag:'闪避反击',text:'贴近冲锋或来球跃过，获得 5 秒反击窗口。',detail:'下一次爪击伤害 +50%；冲线机受到 2 格伤害。挥空也消耗。',source:'https://anta.com/collections/anta-kyrie-irving-collection'}
};
export class ShoeKit{
 constructor(raw={},budget=0){
  if(!raw||typeof raw!=='object')raw={};this.owned=[];
  for(const id of new Set(Array.isArray(raw.owned)?raw.owned:[]))if(Object.hasOwn(SHOES,id)&&budget>=SHOES[id].cost){this.owned.push(id);budget-=SHOES[id].cost;}
  this.equipped=this.owned.includes(raw.equipped)?raw.equipped:null;this.resetEncounter();
 }
 get item(){return SHOES[this.equipped];}
 get spent(){return this.owned.reduce((sum,id)=>sum+SHOES[id].cost,0);}
 get speedMultiplier(){return this.equipped==='c202'?1+.25*this.charge/1.5:1;}
 resetMotion(){this.charge=0;this.direction=0;this.counterTime=0;this.flash=0;}
 resetEncounter(){this.resetMotion();this.shieldUsed=false;this.dodged=new WeakSet();}
 snapshot(){return {owned:[...this.owned],equipped:this.equipped};}
 buy(id,state){if(state.nearby()?.kind!=='shoe-shop'||state.guardian.active||state.circuit.fighting||!Object.hasOwn(SHOES,id)||this.owned.includes(id)||state.availableCoins<SHOES[id].cost)return false;this.owned.push(id);this.equip(id,state);return true;}
 equip(id,state){if(state.guardian.active||state.circuit.fighting||id!==null&&!this.owned.includes(id))return false;this.equipped=id;this.resetMotion();state.emit('equipment',{text:id?SHOES[id].name+' 已穿戴':'已换回普通运动鞋'});state.emit('save');return true;}
 tick(dt,player,input={}){this.counterTime=Math.max(0,this.counterTime-dt);this.flash=Math.max(0,this.flash-dt);const direction=Math.sign(input.move||0),moving=direction&&direction===Math.sign(player.vx)&&Math.abs(player.vx)>1;
  if(this.equipped==='c202'&&moving&&direction===this.direction)this.charge=Math.min(1.5,this.charge+dt);else this.charge=Math.max(0,this.charge-dt*4);
  this.direction=direction;
 }
 absorb(state){if(this.equipped!=='pg7'||this.shieldUsed)return false;this.shieldUsed=true;this.flash=.6;state.emit('equipment',{text:'缓冲护盾 · 抵挡了一次碰撞'});return true;}
 dodge(player,threat,state){if(this.equipped!=='kai3'||!threat||this.dodged.has(threat)||Math.abs(player.x-threat.x)>1.75||player.y<1.65||player.y>3.3||player.grounded)return false;this.dodged.add(threat);this.counterTime=5;this.flash=.6;state.emit('equipment',{text:'精准跃避！5 秒内按 J 发动强化爪击'});return true;}
 consumeCounter(){const boosted=this.equipped==='kai3'&&this.counterTime>0;this.counterTime=0;return boosted;}
 get status(){return !this.item?'普通运动鞋 · 收集金币，试试新装备':this.equipped==='pg7'?(this.shieldUsed?'护盾已消耗 · 下段训练恢复':'护盾就绪 · 抵挡一次碰撞'):this.equipped==='c202'?'疾跑蓄能 '+Math.round(this.charge/1.5*100)+'% · 地面速度 +'+Math.round((this.speedMultiplier-1)*100)+'%':this.counterTime>0?'反击窗口 '+this.counterTime.toFixed(1)+'s · J 强化爪击':'跃过贴近的冲锋 · 蓄积反击';}
}
