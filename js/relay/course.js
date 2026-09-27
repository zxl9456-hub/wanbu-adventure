export const VERSION=1;
export const SAVE='wanbu-relay-save-v1';
export const BRANDS=['ANTA','FILA','DESCENTE','KOLON'];
export const CHAPTERS=[
 {title:'连廊妙传',short:'连廊妙传',x:0,end:33,spawn:4,news:'水平连廊与环绕健步道，让不同团队在运动中相遇。',hint:'先站到 6 米处的发球圈，42° / 力度 14 传给上层伙伴；吹哨让伙伴出发，再去 29 米接应。高手路线：到 22 米，朝左用 45° / 力度 18 打板传球。'},
 {title:'中庭接应',short:'中庭接应',x:34,end:79,spawn:37,news:'水平连接，垂直贯通。一次传球，把上下两层联系起来。',hint:'先把球传给 FILA 伙伴，再在 41 米圆盘留回声，吹哨出发。沿阶梯跳到上层移动台，吹哨接球。'},
 {title:'午间决胜球',short:'午间决胜球',x:80,end:139,spawn:85,news:'运动空间、团队协作与员工幸福，在同一场接力中发生。',hint:'传给 DESCENTE 或 KOLON，吹哨让两位伙伴互传。到 118 米接回球；节奏变青时按 F 跃起顶球。'}
];
const deck=(id,left,right,y,type='stone')=>({id,left,right,y,baseY:y,dx:0,dy:0,type});
export function createPlatforms(){return [
 deck('first-ground',-4,33,0),deck('upper-run',14,30,2),
 deck('atrium-ground',34,53,0),deck('lift',48,52,0,'lift'),deck('upper-gallery',50,64,6),
 deck('step-one',54,57,1.5),deck('step-two',59,62,3),deck('step-three',64,67,4.5),deck('catch-lift',68,74,6,'moving'),deck('atrium-exit',74,80,6),
 deck('court',80,142,0,'wood')
];}
export const REFLECTORS=[{x:11,y:4.9,h:2.1,stage:0},{x:115,y:5.7,h:2.0,stage:2}];
export const HOOP={x:130,y:3.55,r:.66};
export const RINGS=[{id:'arc',x:12,y:5.7},{id:'loft',x:66,y:9.9},{id:'assist',x:104,y:4.4}];
export const PHYS={gravity:26,jump:12.1,speed:7.2,dash:13.8,ballGravity:16,ballRadius:.34};
export const rhythm=time=>(Math.sin(time*Math.PI*1.25)+1)/2;
export const onBeat=time=>rhythm(time)>.58;
export const movingX=time=>71+Math.sin(time*.9)*1.25;
