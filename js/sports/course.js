export const COURSE_VERSION=1;
export const FINISH_X=188;
export const STAGES=[
 {name:'连廊起跑',short:'连廊起跑',x:0,tip:'追随足迹，跃过连廊间隙。',news:'环绕每层的健步道与水平连廊，让运动连接日常。'},
 {name:'垂直跃升',short:'垂直跃升',x:59,tip:'登上升降台，等它上升后再起跳。',news:'多层水平连廊与垂直中庭，共同组成互联互通的立体空间。'},
 {name:'花园冲线',short:'花园冲线',x:120,tip:'观察光栏节奏，向空中花园冲线。',news:'立体庭院与空中花园，让运动、休憩与自然在这里相遇。'}
];
const defs=[
 ['start',-6,13,0],['p1',16,25,.6],['p2',29,38,1.3],['cp1',42,58,.2],
 ['p4',61,67,1.6],['lift',70,76,2.7,{axis:'y',amplitude:2.1,period:5.6,phase:-Math.PI/2}],
 ['p6',80,90,5.2],['p7',93,100,6.7],['cp2',103,119,5.7],
 ['p9',122,130,6.7],['shuttle',134,140,7.4,{axis:'x',amplitude:1.5,period:4.5,phase:0}],
 ['p11',146,155,6.3],['p12',159,167,7.4],['finish',170,196,6.4]
];
export const CHECKPOINTS=[{id:0,x:1,y:0,label:'起跑点'},{id:1,x:48,y:.2,label:'连廊检查点'},{id:2,x:109,y:5.7,label:'花园检查点'}];
export const HAZARDS=[
 {id:'hurdle1',x:34,y:1.3,w:.48,h:1.05},
 {id:'hurdle2',x:86,y:5.2,w:.48,h:1.0},
 {id:'pulse1',x:126,y:6.7,w:.32,h:1.7,period:3.4,closed:1.6,phase:.5},
 {id:'pulse2',x:162,y:7.4,w:.32,h:1.7,period:3.4,closed:1.6,phase:1.9},
 {id:'hurdle3',x:176,y:6.4,w:.48,h:1.05},
 {id:'hurdle4',x:182.5,y:6.4,w:.48,h:1.05}
];
const coins=[
 [5,.85],[8,.85],[11,.85],[14.5,3.3],[18,1.45],[22,1.45],
 [27,3.9],[31,2.15],[34,3.6],[37,2.15],[40,4.5],[45,1.05],
 [53,1.05],[56,1.05],[59.5,3.6],[64,2.45],[69,4.8],[74,4.8],
 [78.5,7.4],[82,6.05],[86,7.5],[91,7.6],[96,7.55],[101.5,9.9],
 [106,6.55],[113,6.55],[119.5,8.6],[124,7.55],[131.5,9.5],[138,8.6],
 [144,10.4],[149,7.15],[157,9.7],[164,8.25],[176,8.7],[182.5,8.7]
];
export const COLLECTIBLES=[...coins.map(([x,y],i)=>({id:'c'+i,x,y,kind:'paw'})),
 {id:'m0',x:23,y:3.85,kind:'medal'}, {id:'m1',x:97,y:9.85,kind:'medal'}, {id:'m2',x:151,y:9.5,kind:'medal'}];
export function createPlatforms(){return defs.map(([id,left,right,y,motion])=>({id,left,right,y,baseLeft:left,baseRight:right,baseY:y,motion,dx:0,dy:0}));}
export function updatePlatforms(platforms,time){
 for(const p of platforms){const oldX=p.left,oldY=p.y;const offset=p.motion?Math.sin(time/p.motion.period*Math.PI*2+p.motion.phase)*p.motion.amplitude:0;
  p.left=p.baseLeft+(p.motion?.axis==='x'?offset:0);p.right=p.baseRight+(p.motion?.axis==='x'?offset:0);p.y=p.baseY+(p.motion?.axis==='y'?offset:0);p.dx=p.left-oldX;p.dy=p.y-oldY;
 }
}
export function hazardPhase(h,time){return h.period?((time+h.phase)%h.period)/h.period:0;}
export function hazardActive(h,time){return !h.period||hazardPhase(h,time)<h.closed/h.period;}
