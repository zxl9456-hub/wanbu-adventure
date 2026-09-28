import {ShoeKit} from '../equipment/state.js';
import {ArrivalState} from '../arrival/state.js';
import {CircuitState} from '../circuit/state.js';
import {CLAW,DEFEAT_TIME} from './combat.js';
import {COINS,VENUE_COST,restoreCoins,coinTotal} from './economy.js';
import {GaleGuardian} from './guardian.js';
import {completedLab,completedActivity,activityUnlocked,ACTIVITIES} from './campaign.js';
import {Expedition} from '../metroid/state.js';
import {CAMPUS_ROOMS,CHAPTERS,SITES,WALK_POINTS,SAMPLES,BRANDS} from './content.js';
const subset=(a,keys)=>new Set((Array.isArray(a)?a:[]).filter(x=>keys.includes(x)));
const has=(ports,a,b)=>ports.includes(a)&&ports.includes(b);
// N=0, E=1, S=2, W=3. Adjacent ports must both be open; half turns
// are equivalent for the straight section, but not for elbows.
export function waterConnected(turns){
 if(!Array.isArray(turns)||turns.length!==3||turns.some(t=>!Number.isInteger(t)||t<0||t>3))return false;
 const ports=[[1,3],[0,1],[0,1]].map((p,i)=>p.map(v=>(v+turns[i])%4));
 return has(ports[0],3,1)&&has(ports[1],3,0)&&has(ports[2],2,1);
}
export class CampusState extends Expedition{
 get rooms(){return CAMPUS_ROOMS;}
 get room(){return this.circuit?.rooms[this.roomId]||CAMPUS_ROOMS[this.roomId];}
 get cameraAnchor(){return this.roomId==='court'&&this.circuit?.fighting?(this.player.x+this.circuit.enemy.x)/2:undefined;}
 get cameraSpan(){return this.roomId==='court'&&this.circuit?.fighting?Math.max(18,Math.abs(this.player.x-this.circuit.enemy.x)+6):18;}
 get clawUnlocked(){return this.venueUnlocked||this.circuit?.claw===true;}
 get availableCoins(){return this.totalCoins-(this.circuit?.spent||0)-(this.shoes?.spent||0);}
 get speed(){return super.speed*(this.player?.grounded?(this.shoes?.speedMultiplier||1):1);}
 constructor(saved={}){
  super();if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};
  this.arrival=new ArrivalState(saved.arrival,Number.isInteger(saved.version)&&saved.version<6||Array.isArray(saved.sites)&&saved.sites.some(id=>SITES.some(site=>site[0]===id)));
  this.sites=subset(saved.sites,SITES.map(s=>s[0]));
  this.circuit=new CircuitState(this.sites.size===3?saved.circuit:{});
  this.walks=subset(saved.walks,WALK_POINTS.map(p=>p[0]));
  this.samples=subset(saved.samples,SAMPLES.map(p=>p[0]));
  this.innovation=saved.innovation===true&&this.samples.size===3;
  this.brandStep=Number.isInteger(saved.brandStep)?Math.max(0,Math.min(4,saved.brandStep)):0;
  this.power=saved.power===true;this.turns=[1,1,0].map((v,i)=>Number.isInteger(saved.turns?.[i])?(saved.turns[i]%4+4)%4:v);
  this.runId=typeof saved.runId==='string'?saved.runId:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  this.storySeen=saved.storySeen===true||this.sites.size>0;
  this.sportsDone=saved.sportsDone===true&&this.sites.size===3;this.activeChallenge=Object.hasOwn(ACTIVITIES,saved.activeChallenge)?saved.activeChallenge:null;
  this.progress.dash=saved.dash===true&&this.sites.size===3;
  this.progress.gate=saved.gate===true&&this.progress.dash;
  this.progress.doubleJump=(saved.doubleJump===true&&this.samples.size===3&&this.progress.gate)||this.circuit.rebound;
  this.innovation=this.innovation&&this.progress.doubleJump;this.progress.echoCollar=this.innovation;
  this.portalDone=saved.portalDone===true&&this.innovation;
  this.teamDone=saved.teamDone===true&&this.portalDone&&this.brandStep===4&&this.power&&waterConnected(this.turns);
  this.legacyBrandStamp=(saved.legacyBrandStamp===true||saved.version<4&&this.brandStep===4)&&this.innovation&&this.power&&waterConnected(this.turns);
  this.progress.relayOpen=saved.relayOpen===true&&this.innovation;
  this.progress.shortcut=saved.shortcut===true&&this.stamps.includes('green')&&this.progress.relayOpen;
  this.coins=restoreCoins(saved.coins);this.guardianWon=false;
  this.venueUnlocked=saved.venueUnlocked===true&&this.totalCoins>=VENUE_COST&&this.stamps.includes('green')&&this.progress.relayOpen;
  this.guardianWon=saved.guardianWon===true&&this.venueUnlocked;
  this.circuit.restorePurchases(saved.circuit?.purchases,this.totalCoins);
  this.shoes=new ShoeKit(saved.shoes,this.totalCoins-this.circuit.spent);
  this.guardian=new GaleGuardian();if(this.guardianWon){this.guardian.phase='won';this.guardian.hp=0;this.guardian.defeatTime=DEFEAT_TIME;};
  this.guardianAttempts=Number.isInteger(saved.guardianAttempts)?Math.max(0,Math.min(9999,saved.guardianAttempts)):0;
  this.finished=saved.finished===true&&this.circuit.done&&this.sportsDone&&this.portalDone&&this.teamDone&&this.stamps.length===5&&this.progress.shortcut&&this.guardianWon;
  this.claw=null;this.attackQueued=false;
  this.elapsed=Number.isFinite(saved.elapsed)?Math.max(0,saved.elapsed):0;this.passTime=0;
  this.progress.boss=true;this.routeHintTime=0;this.falls=0;
  const candidate=Object.hasOwn(CAMPUS_ROOMS,saved.resume?.room)?saved.resume.room:(this.arrival.done?'hub':'arrival');
  const room=this.canEnter(candidate)?candidate:(this.arrival.done?'hub':'arrival');
  const r=saved.resume,valid=r&&this.validPosition(room,r.x,r.y);this.enter(room,valid?r.x:(room==='arrival'?3:8),valid?r.y:0);
  this.visited=subset(saved.visited,Object.keys(CAMPUS_ROOMS));this.visited.add(room);this.visited.add('hub');this.events=[];this.initialized=true;
 }
 validPosition(room,x,y){return Number.isFinite(x)&&Number.isFinite(y)&&(this.circuit?.rooms[room]||CAMPUS_ROOMS[room]).platforms.some(f=>Math.abs(f.y-y)<.02&&x>=f.left+.5&&x<=f.right-.5);}
 canEnter(id){
  if(!Object.hasOwn(CAMPUS_ROOMS,id))return false;
  if(id==='hub'||id==='arrival')return true;
  if(id==='energy')return this.sites?.size===3;
  if(['pool','court','cafe'].includes(id))return this.sites?.size===3&&this.circuit.canEnter(id);
  if(id==='lab')return this.sites?.size===3&&(this.sportsDone||this.progress.dash);
  if(id==='core')return this.progress.gate;
  if(id==='archive')return this.progress.doubleJump;
  if(id==='arena')return this.progress.relayOpen&&this.venueUnlocked===true&&this.teamDone;
  return this.portalDone&&this.progress.relayOpen&&this.progress.doubleJump;
 }
 lockedRoute(id){if(['pool','court','cafe'].includes(id))return this.circuit.gateHint(id);if(id==='lab'&&!this.sportsDone&&!this.progress.dash&&this.sites.size===3)return '先从大堂高台进入健身中心，完成云端步道跑酷。';if(['atrium','garden','gallery'].includes(id)&&this.innovation&&!this.portalDone)return '先登上连廊左侧高台，在足迹档案完成「足迹穿梭」。';if(id==='arena'&&!this.teamDone)return '先完成共创办公区的三段「全楼开赛」，带回共创核心。';if(id==='arena')return `累计 ${VENUE_COST} 足迹币并接通花园能源，可在花园右端解锁运动场馆（当前 ${this.totalCoins}）。`;return !this.sites?.size||this.sites.size<3?'先在大堂连接晋江、厦门、上海三个节点。':id==='core'?'跳上连廊展台领取冲刺，再按 Shift 穿过左侧光幕。':id==='archive'?'研发展台会解锁二段跳，届时可返回探索高处档案。':this.progress.echoCollar?'回声项圈已获得。返回水平连廊，同步 01 与 02 两个感应点。':'先完成 ANTA 密室，再返回水平连廊同步两个感应点。';}
 enter(id,x,y){
  if(this.initialized&&this.circuit?.fighting&&this.roomId==='court'&&id!=='court')return false;
  if(this.initialized&&this.guardian?.active&&this.roomId==='arena'){this.player.x=Math.max(2,Math.min(34,this.player.x));this.player.vx=0;return false;}
  if(this.initialized&&!this.canEnter(id)){
   this.player.x=Math.max(0,Math.min(this.room.width,this.player.x));this.player.vx=0;
   if(!this.routeHintTime){this.emit('hint',{text:this.lockedRoute(id)});this.routeHintTime=3;}return false;
  }
  this.shoes?.resetMotion();super.enter(id,x,y);this.claw=null;this.attackQueued=false;this.attackBuffer=0;this.player.attackTime=0;this.player.attackCooldown=0;this.enemies=[];this.boss=null;this.passTime=0;this.safePoint={x,y};this.circuit?.onEnter(id,this);return true;
 }
 hurt(damage,direction,fall){if(fall){this.recovering=true;this.falls++;this.emit('hint',{text:'回到刚才的落脚点 · 已收集的信号与能力保留。'});}}
 handleGuardianEvent(type,data){
  // Commit earned completion at lethal damage; a reload during the effect cannot lose it.
  if(type==='guardian-defeated'){this.guardianWon=true;this.emit('save');}
  if(type==='guardian-hit')this.player.invulnerable=1.7;
  this.emit(type,data);
 }
 updateEnemies(){} updateBoss(dt){if(this.roomId==='arena'&&this.guardian){const emit=(type,data)=>this.handleGuardianEvent(type,data);this.guardian.strike(this.player,this.claw,emit);this.guardian.update(dt,this.player,emit,()=>this.shoes.absorb(this));if(this.guardian.phase==='dash')this.shoes.dodge(this.player,this.guardian.threat,this);}} updateWall(){}
 update(dt,input={}){if(input.attackPressed)this.attackQueued=true;super.update(dt,input);}
 attack(){
  const p=this.player;
  if(!this.clawUnlocked||this.circuit?.phase==='failed'||p.attackCooldown>1e-6||p.dashTime>0||p.hurtTime>0||this.guardian?.phase==='defeated'||this.roomId==='arena'&&['failed','won'].includes(this.guardian.phase))return false;
  p.attackTime=CLAW.duration;p.attackCooldown=CLAW.cooldown;p.attackDirection='front';
  const facing=this.input?.move?Math.sign(this.input.move):p.facing;p.facing=facing;
  this.claw={id:++this.attackId,elapsed:0,facing,hit:false,boosted:this.shoes.consumeCounter()};this.emit('claw-attack');return true;
 }
 returnToSafeSpot(){
  if(this.guardian.active||this.circuit.fighting)return false;
  if(this.roomId==='arrival')this.arrival.recover(this);
  else{Object.assign(this.player,this.safePoint,{vx:0,vy:0,grounded:true,airJump:false,airDash:false,dashTime:0,jumpBuffer:0});this.echo.clear();this.claw=null;this.attackBuffer=0;this.emit('save');}
  return true;
 }
 get totalCoins(){return coinTotal(this);}
 nearby(){if(this.guardian?.active||this.circuit?.fighting)return null;const item=super.nearby();return item?.kind==='practice'&&!this.circuit?.launcherWon?null:item;}
 startGuardian(){if(this.roomId!=='arena'||!this.venueUnlocked||this.guardian.active)return false;this.guardian=new GaleGuardian(this.guardianWon?++this.guardianAttempts:0);this.guardian.start();this.shoes.resetEncounter();this.claw=null;this.attackQueued=false;Object.assign(this.player,{x:13,y:0,vx:0,vy:0,grounded:true,dashTime:0,attackTime:0,attackCooldown:0,invulnerable:0,facing:1});this.echo.clear();this.emit('guardian-start');this.emit('save');return true;}
 retreatGuardian(){if(!this.guardian.active)return false;this.guardian.phase=this.guardianWon?'won':'idle';if(this.guardianWon){this.guardian.hp=0;this.guardian.defeatTime=DEFEAT_TIME;}this.enter('garden',29,0);this.emit('save');return true;}
 dash(){if(!this.progress.dash){this.emit('hint',{text:'冲刺模块在水平连廊的右侧高台。先用跳跃登上展台。'});return;}super.dash();}
 acceptLab(raw){
  if(this.innovation||!this.progress.doubleJump||!completedLab(raw,this.runId))return false;
  this.innovation=true;this.progress.echoCollar=true;this.activeChallenge=null;this.enter('core',11.5,5.7);
  this.emit('ability',{name:'回声项圈',text:'返回连廊，登上左侧高台进入足迹档案。先用回声完成足迹穿梭，再同步连廊双点机关。'});this.emit('save');return true;
 }
 challengeAllowed(id){return activityUnlocked(id,this.save());}
 beginChallenge(id){if(!this.challengeAllowed(id))return false;this.activeChallenge=id;this.emit('save');return true;}
 acceptActivity(id,raw){
  if(id==='lab')return this.acceptLab(raw);
  const field={sports:'sportsDone',portal:'portalDone',relay:'teamDone'}[id];
  if(!field||this[field]||!this.challengeAllowed(id)||!completedActivity(id,raw,this.runId))return false;
  this[field]=true;this.activeChallenge=null;const c=ACTIVITIES[id];this.enter(c.room,c.x,c.y);this.emit('chapter-complete',{id,title:c.title,reward:c.reward,next:c.next});this.emit('save');return true;
 }
 get stamps(){return [this.sites?.size===3,this.walks?.size===3,this.innovation===true,this.brandStep===4&&(this.teamDone||this.legacyBrandStamp),this.power&&waterConnected(this.turns)].flatMap((ok,i)=>ok?[CHAPTERS[i].id]:[]);}
 get next(){return CHAPTERS.find(c=>!this.stamps.includes(c.id))||null;}
 get mission(){
  const goal=(chapter,room,x,y,label,text)=>({chapter,room,x,y,label,text});
  if(this.roomId==='arrival')return this.arrival.objective(this);
  if(this.sites.size<3)return goal('roots','hub',18,0,'地面三地连接台 · F','向右走到火炬左侧的连接台，按 F；在弹窗分别点亮晋江、厦门、上海三张卡片');
  if(!this.circuit.done){const [room,x,y,label,text]=this.circuit.objective();return goal('roots',room,x,y,label,text);}
  if(!this.sportsDone)return goal('roots','energy',16,0,'云端步道入口','从大堂高台进入健身中心，完成完整跑酷，取得步道徽记');
  if(!this.progress.dash)return goal('walk','lab',22,2.2,'冲刺展台','跳上水平连廊右侧高台，按 F 领取冲刺');
  if(!this.walks.has('walk-link'))return goal('walk','lab',13,2,'水平连廊足迹','跨过连廊间隙，踩亮中间高台上的足迹');
  if(!this.progress.gate)return goal('innovation','lab',6,0,'冲刺光幕','走到左侧光幕，朝左按 Shift 穿过去');
  const sample=SAMPLES.find(p=>!this.samples.has(p[0]));
  if(sample)return goal('innovation','core',sample[2],sample[3],sample[4]+'采样点','从连廊左端进入研发区，沿三层展台收集运动信号');
  if(!this.innovation)return goal('innovation','core',11.5,5.7,'ANTA 科技密室',this.progress.doubleJump?'进入科技密室：找齐四枚 A N T A，走出光门取得回声项圈':'回到顶层终端，解锁二段跳并开启 ANTA 科技密室');
  if(!this.portalDone)return goal('innovation','archive',11,2.2,'足迹穿梭入口','从水平连廊左侧高台进入足迹档案，拼接光路并与回声合作');
  if(!this.progress.relayOpen)return goal('walk','lab',25.7,0,'回声双点机关','返回连廊，在 01 盘留下回声，再站上 02 盘同步 1.1 秒');
  if(!this.walks.has('walk-up'))return goal('walk','atrium',23,5.3,'垂直中庭足迹','沿连廊右侧入口前往中庭，用二段跳登上高台');
  if(!this.walks.has('walk-garden'))return goal('walk','garden',8,0,'空中花园足迹','从中庭顶层抵达花园，踩亮第三枚足迹');
  if(!this.stamps.includes('green'))return goal('green','garden',this.power?22:13,0,this.power?'水循环装置':'绿色能源开关','接通绿色能源，旋转三段水管，为环线捷径供能');
  if(this.brandStep<4)return goal('brands','gallery',[6,12,20,27][this.brandStep],0,BRANDS[this.brandStep]+' 接力点','登上花园高处通道，依次与四位品牌伙伴接力');
  if(!this.teamDone)return goal('brands','gallery',27,0,'全楼开赛入口','四位伙伴已就位，进入三段完整接力，带回共创核心');
  if(!this.venueUnlocked)return goal('green','garden',30,0,'足迹币解锁运动馆',`累计 ${VENUE_COST} 足迹币，在花园右端解锁场馆 · 当前 ${this.totalCoins}`);
  if(!this.guardianWon)return goal(null,'arena',4,0,'疾风机械猎豹',this.guardian.active?this.guardian.hint:'进入运动场馆，用 J 能量爪击击败机械猎豹');
  if(!this.progress.shortcut)return goal('walk','garden',3,0,'大堂捷径','回到花园左端，启动已供能的捷径，让园区形成环线');
  return goal(null,'hub',24,0,'万步之光','沿花园捷径回到大堂，在火炬旁点亮万步之光');
 }
 objective(){return this.mission.text;}
 step(dt){
  this.shoes?.tick(dt,this.player,this.input);
  this.arrival?.before(this);
  this.circuit?.beforeStep(dt,this);
  if(this.attackQueued){this.attackQueued=false;this.attackBuffer=.16;}
  if(this.attackBuffer>0){if(this.attack())this.attackBuffer=0;else this.attackBuffer=Math.max(0,this.attackBuffer-dt);}
  if(this.claw)this.claw.elapsed+=dt;
  super.step(dt);
  this.circuit?.tick(dt,this);
  this.arrival?.tick(dt,this);
  if(this.recovering){Object.assign(this.player,this.safePoint,{vx:0,vy:0,grounded:true,airDash:false,airJump:false,dashTime:0});this.echo.clear();this.recovering=false;}
  if(this.player.grounded&&this.room.platforms.some(f=>Math.abs(this.player.y-f.y)<.02&&this.player.x>f.left+.65&&this.player.x<f.right-.65))this.safePoint={x:this.player.x,y:this.player.y};
  this.routeHintTime=Math.max(0,this.routeHintTime-dt);this.elapsed+=dt;this.passTime=Math.max(0,this.passTime-dt);
  for(const c of COINS){if(c.room===this.roomId&&!this.coins.has(c.id)&&Math.abs(this.player.x-c.x)<.65&&Math.abs(this.player.y+1-c.y)<1){this.coins.add(c.id);this.emit('coin',{value:c.value});this.emit('save');}}
  this.progress.gardenOnline=this.stamps.includes('green');this.progress.loopComplete=this.progress.shortcut;
  for(const [id,room,x,y,title] of [...WALK_POINTS,...SAMPLES]){
   const set=id.startsWith('walk')?this.walks:this.samples;
   if(this.roomId===room&&!set.has(id)&&Math.abs(this.player.x-x)<1&&Math.abs(this.player.y-y)<.5&&this.player.grounded){set.add(id);this.emit('discovery',{id,title,walk:id.startsWith('walk')});this.emit('save');}
  }
 }
 interact(){
  const item=this.nearby();if(!item)return;
  if(item.type==='arrival'){this.arrival.enter(this);return;}
  if(item.type==='circuit'){if(item.kind==='sports'){this.emit('enter-activity',{id:'sports'});return;}this.circuit.interact(item.kind,this);return;}
  if(item.kind==='guardian'){this.emit('guardian-intro');return;}
  if(item.kind==='venue'){if(!this.teamDone){this.emit('hint',{text:this.lockedRoute('arena')});return;}if(this.venueUnlocked){this.enter('arena',4,0);return;}if(this.totalCoins<VENUE_COST||!this.stamps.includes('green')){this.emit('hint',{text:this.lockedRoute('arena')});return;}this.venueUnlocked=true;this.emit('venue-unlocked');this.emit('save');return;}
  if(item.type==='route'){if(item.requires&&!this.progress[item.requires]){this.emit('hint',{text:item.requires==='shortcut'?'从花园一侧开启捷径后，这部升降台才能使用。':this.lockedRoute(item.room)});return;}this.enter(item.room,item.toX,item.toY);return;}
  if(item.kind==='dash-kit'){if(!this.sportsDone&&!this.progress.dash){this.emit('hint',{text:'先完成健身中心的云端步道，取得步道徽记。'});return;}if(!this.progress.dash){this.progress.dash=true;this.emit('ability',{name:'脉冲冲刺',text:'按 Shift 或点「冲刺」。试着朝左冲过连廊光幕；跳跃后也能在空中冲刺。'});this.emit('save');}else this.emit('hint',{text:'冲刺已装备 · 朝左穿过光幕，探索研发区。'});return;}
  if(item.kind==='shortcut'){if(!this.stamps.includes('green')){this.emit('hint',{text:'捷径尚未供能。先接通花园能源与水循环。'});return;}if(!this.progress.shortcut){this.progress.shortcut=true;this.emit('shortcut-open');}this.enter('hub',15,2.3);this.emit('save');return;}
  if(item.kind==='brand'){
   const index=Number(item.id.split('-')[1]);
   if(this.brandStep===4){this.emit('enter-activity',{id:'relay'});return;}
   if(this.passTime>0){this.emit('hint',{text:'让接力球先抵达伙伴身边。'});return;}
   if(index!==this.brandStep){this.emit('hint',{text:`前往 ${BRANDS[this.brandStep]} · 第 ${this.brandStep+1} 棒`});return;}
   this.brandStep++;this.passTime=.85;this.emit('pass',{index});this.emit('save');return;
  }
  if(item.kind==='innovation'){
   if(this.samples.size<3){this.emit('hint',{text:`已采集 ${this.samples.size}/3 个信号 · 跳上三层展台，踩亮圆形采样点。`});return;}
   if(!this.progress.doubleJump){this.progress.doubleJump=true;this.emit('ability',{name:'回弹二段跳',text:'空中松开跳跃键后再按一次，能跃上更高的平台。科技密室入口已解锁；再次与终端互动进入。'});this.emit('save');}
   else this.emit('enter-lab');return;
  }
  if(item.kind==='power'){
   this.power=true;this.emit('power');this.emit('save');return;
  }
  if(item.kind==='sports'||item.kind==='portal'){this.emit('enter-activity',{id:item.kind});return;}
  if(item.kind==='finale'){
   if(!this.circuit.done||!this.sportsDone||!this.portalDone||!this.teamDone){this.emit('hint',{text:'还有冒险章节等待完成 · '+this.objective()});return;}
   if(!this.guardianWon){this.emit('hint',{text:'万步之光还需要运动场馆的能量 · '+this.objective()});return;}
   if(this.stamps.length<5||!this.progress.shortcut){this.emit('hint',{text:this.stamps.length===5?'五枚印章已集齐。先回花园左侧开启大堂捷径，完成环线。':`还差 ${5-this.stamps.length} 枚印章 · ${this.objective()}`});return;}
   this.finished=true;this.emit('finale');this.emit('save');return;
  }
  this.emit('station',{kind:item.kind});
 }
 connect(id){
  if(this.nearby()?.kind!=='roots'||!SITES.some(s=>s[0]===id)||this.sites.has(id))return false;
  this.sites.add(id);this.arrival.done=true;this.emit('save');return true;
 }
 rotate(index){
  if(this.stamps.includes('green')||this.nearby()?.kind!=='water'||!Number.isInteger(index)||index<0||index>2)return false;
  this.turns[index]=(this.turns[index]+1)%4;this.emit('save');return true;
 }
 guide(room){if(this.circuit?.fighting||this.guardian?.active||!this.progress.shortcut||!this.visited.has(room)||!this.canEnter(room))return false;return this.enter(room,room==='core'?29:3,0);}
 save(){return {version:7,shoes:this.shoes.snapshot(),arrival:this.arrival.snapshot(),circuit:this.circuit.snapshot(),storySeen:this.storySeen,sportsDone:this.sportsDone,portalDone:this.portalDone,teamDone:this.teamDone,legacyBrandStamp:this.legacyBrandStamp,activeChallenge:this.activeChallenge,coins:[...this.coins],venueUnlocked:this.venueUnlocked,guardianWon:this.guardianWon,guardianAttempts:this.guardianAttempts,runId:this.runId,dash:this.progress.dash,gate:this.progress.gate,doubleJump:this.progress.doubleJump,relayOpen:this.progress.relayOpen,shortcut:this.progress.shortcut,sites:[...this.sites],walks:[...this.walks],samples:[...this.samples],innovation:this.innovation,brandStep:this.brandStep,power:this.power,turns:[...this.turns],finished:this.finished,elapsed:this.elapsed,visited:[...this.visited],resume:this.guardian.active?{room:'arena',x:4,y:0}:this.safeResume()};}
}
