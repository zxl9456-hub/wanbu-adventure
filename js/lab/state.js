export const SAVE='wanbu-lab-save-v1';
export const IDS=['light','bridge','test','echo'];
export const LETTERS={light:'A',bridge:'N',test:'T',echo:'A'};
export const LIGHT_ANGLES=[-60,-30,0,30,60,90];
export const LIGHT_TARGET=[1,3,5];
export const STATIONS=[
 {id:'light',name:'光影构形',sub:'01 / INNOVATION',x:-7,z:-4,tip:'转动三枚光学构件，让投影与 A 轮廓重合。',source:'上海中心汇聚数字化与产品研发等业务。镜筒内的微光象征持续探索的创新灵感。',hints:['屏幕上的细线是目标，亮杆是你可以转动的构件。','两条斜边向顶部靠拢，横杆保持水平。','左杆 −30°，右杆 30°，横杆 90°；再校准投影。']},
 {id:'bridge',name:'连廊联动',sub:'02 / CONNECTIVITY',x:-7,z:4,tip:'转动两座 L 形连廊，让三个感应节点首尾相接。',source:'水平连廊与垂直中庭串联「健康工作，万步联动」的立体循环空间。建筑沙盘中的路线，也需要彼此接通。',hints:['白色短线是固定步道。连廊两端需要接上它们。','左桥需连向左侧与上方；右桥需连向上方与右侧。','左桥转至「上 + 左」，右桥转至「上 + 右」，启动巡游验证。']},
 {id:'test',name:'跃动试验',sub:'03 / RESEARCH',x:7,z:-4,tip:'调整弹力和落点，让测试投影越过光标并落稳。',source:'专业运动空间与全球研发网络，让探索与运动相遇。测试台内的微光，来自一次次观察与验证。',hints:['绿色横线是目标高度，青色台面是安全落点。','先看轨迹：低弹力够不到高度，高弹力会飞过台面。','选择中弹力、远端落点，观察一次完整的起跳和落地。']},
 {id:'echo',name:'回声协作',sub:'04 / CO-CREATION',x:7,z:4,tip:'留下左侧足迹回声，再与右侧感应点同步两秒。',source:'安踏、斐乐、迪桑特、可隆等团队在上海中心集聚。跨团队协作如同相互回应的足迹，共同点亮下一步。',hints:['走到左侧圆盘，记录小步的足迹。','回声替你留在左盘；让小步走到右盘。','点击「走到左盘」→「记录回声」→「走到右盘」，停留两秒。']}
];
export const VIEWS=[{id:'front',name:'正面'},{id:'rear',name:'背面'},{id:'low',name:'低处'},{id:'top',name:'俯看'}];
export const SECRETS={
 light:{asset:'lens-cache',view:'rear',name:'镜筒背面的检修夹层',action:'旋开镜筒检修环',position:[0,.69,-2.46],rotation:Math.PI,scale:.7,tip:'光线照得到的地方，并不是它藏身的地方。',hints:['镜筒正面是投影，真正的接缝藏在另一面。','切换到「背面」，再用斜光扫描圆形基座。','镜筒背面有一道细金属环。点击它，或按「检查接缝」。']},
 bridge:{asset:'plinth-cache',view:'rear',name:'沙盘底座的夹层抽屉',action:'拉开底座暗格',position:[-1.2,.70,-2.02],rotation:Math.PI,scale:1,tip:'看过建筑的高处，别忘了托住它的底座。',hints:['这枚字母没有藏在建筑里。','到沙盘背面看一看，底座有一段不连续的接缝。','切换到「背面」，斜光扫过底座，检查凹入的把手。']},
 test:{asset:'service-cache',view:'low',name:'测试台下方的维护舱',action:'掀开隐藏维护舱',position:[.55,.62,1.84],rotation:0,scale:.77,tip:'测试总是向上跃起，秘密却在视线下方。',hints:['这一次，先别盯着起跳的小步。','台面的下方留有一块独立的维护面板。','切换到「低处」，斜光扫描前沿，检查三条细刻线之间的锁扣。']},
 echo:{asset:'iris-cache',view:'top',name:'发射器中心的光阑',action:'展开中央光阑',position:[0,1.07,0],rotation:0,scale:1,tip:'回声来自中心，中心却不一定是实心的。',hints:['观察全息小步脚下的圆形发射器。','从上方看，中央的叶片与外侧圆环并不连在一起。','切换到「俯看」，检查发射器中心四片交错的光阑。']}
};
const int=(x,n,f=0)=>Number.isInteger(x)&&x>=0&&x<n?x:f;
export class LabState{
 constructor(raw={}){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
  this.solved=new Set((Array.isArray(raw.solved)?raw.solved:[]).filter(x=>IDS.includes(x)));
  this.collected=new Set((Array.isArray(raw.collected)?raw.collected:[]).filter(x=>this.solved.has(x)));
  const valid=key=>(Array.isArray(raw[key])?raw[key]:[]).filter(x=>IDS.includes(x));
  this.discovered=new Set([...valid('discovered'),...this.solved]);
  this.released=new Set([...valid('released').filter(x=>this.solved.has(x)),...this.collected,...((!raw.version||raw.version<2)?this.solved:[])]);
  this.cabinets=Object.fromEntries(IDS.map(id=>[id,this.released.has(id)?1:0]));
  this.searchHints=Object.fromEntries(IDS.map(id=>[id,int(raw.searchHints?.[id],4)]));

  this.light=Array.from({length:3},(_,i)=>int(raw.light?.[i],6,[4,0,2][i]));this.bridges=[int(raw.bridges?.[0],4),int(raw.bridges?.[1],4,2)];
  this.power=int(raw.power,3);this.landing=int(raw.landing,3);this.inserted=!!raw.inserted&&this.collected.size===4;this.door=this.inserted?1:0;this.completed=!!raw.completed&&this.inserted;this.lightingTime=this.inserted?8:0;
  this.hints=Object.fromEntries(IDS.map(id=>[id,int(raw.hints?.[id],4)]));this.time=Math.max(0,Math.min(Number(raw.time)||0,1e6));
 }
 tick(dt){dt=Math.max(0,Number.isFinite(dt)?dt:0);for(const id of IDS)if(this.released.has(id))this.cabinets[id]=Math.min(1,this.cabinets[id]+dt/1.6);if(this.inserted){this.lightingTime=Math.min(8,this.lightingTime+dt);this.door=this.lightingTime>=8?1:Math.max(0,(this.lightingTime-6.4)/1.6);}this.time+=dt;}
 get illuminated(){return this.inserted&&this.lightingTime>=8;}
 discover(id,view){if(!IDS.includes(id)||SECRETS[id].view!==view||this.discovered.has(id))return false;this.discovered.add(id);return true;}
 release(id){if(!this.solved.has(id)||this.released.has(id))return false;this.released.add(id);return true;}
 awaken(id){
  if(!IDS.includes(id)||this.collected.has(id)||this.released.has(id))return false;
  this.discovered.add(id);this.solved.add(id);this.released.add(id);
  // The glowing object is the lock. Exhibition demonstrations align as it opens.
  if(id==='light')this.light=[...LIGHT_TARGET];if(id==='bridge')this.bridges=[3,0];
  if(id==='test'){this.power=1;this.landing=2;}
  return true;
 }
 skipIllumination(){if(!this.inserted)return false;this.lightingTime=8;this.door=1;return true;}

 solve(id){if(!IDS.includes(id)||!this.discovered.has(id)||this.solved.has(id))return false;this.solved.add(id);return true;}
 collect(id){if(!this.solved.has(id)||!this.released.has(id)||this.cabinets[id]<1||this.collected.has(id))return false;this.collected.add(id);return true;}
 calibrate(){return this.light.every((n,i)=>n===LIGHT_TARGET[i]);}
 connected(){return this.bridges[0]===3&&this.bridges[1]===0;}
 insert(){if(this.collected.size!==4||this.inserted)return false;this.inserted=true;this.lightingTime=0;this.door=0;return true;}
 finish(){if(this.completed||!this.inserted||this.door<1)return false;this.completed=true;return true;}
 snapshot(){return {version:3,discovered:[...this.discovered],released:[...this.released],searchHints:this.searchHints,solved:[...this.solved],collected:[...this.collected],light:this.light,bridges:this.bridges,power:this.power,landing:this.landing,inserted:this.inserted,completed:this.completed,hints:this.hints,time:this.time};}
}
export function launchSample(power,landing,t){
 const vy=[3.1,5.5,8][power],vx=2.8,g=8.5,padX=[1.2,2.1,3.1][landing],padY=.7;
 const x=vx*t,y=vy*t-g*t*t/2,peak=vy*vy/(2*g),disc=vy*vy-2*g*padY;
 const landingTime=disc>=0?(vy+Math.sqrt(disc))/g:vy/g*2;
 const finalX=vx*landingTime;
 return {x,y,peak,padX,padY,landingTime,done:t>=landingTime,success:peak>=1.4&&Math.abs(finalX-padX)<=.5};
}

export const CLUES={
 light:{name:'镜筒上的星光',hint:'投影台前沿的金属镜筒，有一圈忽明忽暗的青光。',action:'旋开发光镜筒',color:0x8beadf,position:[-.85,1.16,1.94],scale:.86,rotation:0},
 bridge:{name:'沙盘下的金色缝隙',hint:'建筑沙盘的底座正面，金色把手里漏出一点光。',action:'拉开微光抽屉',color:0xffd49a,position:[0,.66,2.0],scale:1.12,rotation:0},
 test:{name:'测试台的蓝色锁扣',hint:'运动测试台前沿下方，维护面板的锁扣正在闪烁。',action:'打开蓝光维护舱',color:0x8cdcff,position:[.55,.68,1.89],scale:.91,rotation:0},
 echo:{name:'圆环中央的微光',hint:'全息台中央，四片金属叶片之间藏着一束光。',action:'展开环形光阑',color:0xc4b6ff,position:[0,1.10,0],scale:1.1,rotation:0}
};
