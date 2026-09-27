export const HURDLES=[{x:10,w:1.3,h:1.1},{x:36,w:1.5,h:1.4},{x:61,w:1.3,h:1.25},{x:88,w:1.5,h:1.7}];
export const BLOCKS=[{id:'gift-1',x:18,y:3.15},{id:'gift-2',x:42,y:3.15},{id:'gift-3',x:69,y:3.15}];
export const BUMPERS=[{id:'ball-1',left:29,right:34},{id:'ball-2',left:53,right:58}];
export const CHECKPOINTS=[3,28,52,80];
export const ARRIVAL_COINS=[
 [5,1],[7,1],[10.6,2.25],[14,1],[16,1],[20.5,1],[23.5,2.9],[26.5,1.2],
 [29,2.6],[32,2.6],[36.7,2.6],[40,1],[44.7,1],[48,2.9],[51,1],
 [54,2.5],[57,2.5],[61.7,2.5],[65,1],[67,1],[71.5,1],[75.3,2.9],[79,1],
 [82,1],[84,1],[88.7,2.8],[92,1],[94,1],[96,1]
].map(([x,y],i)=>({id:'front-'+i,x,y}));
export const ARRIVAL_ROOM={name:'上海安踏中心 · 门前步道',subtitle:'第 01 关 · 追着金币，向大楼出发',theme:'arrival',width:104,map:[0,1],
 platforms:[{id:'start',left:-2,right:22,y:0},{id:'middle',left:25.5,right:46,y:0},{id:'garden',left:50,right:73,y:0},{id:'door',left:77.5,right:106,y:0},...HURDLES.map((h,i)=>({id:'hurdle-'+i,left:h.x,right:h.x+h.w,y:h.h}))],
 items:[{id:'front-door',x:99,y:0,label:'进入上海安踏中心',type:'arrival'}],exits:{},enemies:[],chips:[],gate:null,wall:null,trial:null,relay:null,heart:null};
