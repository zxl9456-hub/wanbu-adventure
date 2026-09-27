const floor=(id,left,right,y=0)=>({id,left,right,y});
const item=(id,x,label,kind,y=0)=>({id,x,y,label,kind,type:'circuit'});
const door=(id,x,label,room,toX=3,toY=0)=>({id,x,y:0,label,room,toX,toY,type:'route'});
const room=(name,subtitle,platforms,items)=>({name,subtitle,theme:'circuit',width:36,map:[1,2],platforms,items,exits:{},enemies:[],chips:[],gate:null,wall:null,trial:null,relay:null,heart:null});
export const CIRCUIT_ROOMS={
 energy:room('国际化健身中心','体育回路 01 · 跑台充能，击球开路',[
  floor('floor',-2,38),floor('l',5,11,2.2),floor('r',21,27,2.2),floor('medal',15,20,5.65)
 ],[door('gym-back',3,'返回大堂','hub',11,2.3),item('claw-kit',5,'领取能量爪击','kit'),item('sports-entry',16,'云端步道 · 完整跑酷','sports'),door('pool-entry',33,'进入恒温泳池','pool'),item('gym-cafe',29,'餐厅近路','return-cafe')]),
 pool:room('恒温泳池','体育回路 02 · 击球升水，跃过浮台',[
  floor('west',-2,9),floor('raft-1',11,15,-3),floor('raft-2',17,21,-2.2),floor('raft-3',23,26,-2.7),floor('east',28,38)
 ],[door('pool-back',2,'返回健身中心','energy',32),door('court-entry',34,'进入篮球训练馆','court')]),
 court:room('篮球训练馆','体育回路 03 · 跳过冲锋，反弹破盾',[floor('floor',-2,38)],
 [door('court-back',2,'返回泳池','pool',33),item('practice',18,'反弹加练 · 不重复奖励','practice'),door('cafe-entry',34,'前往能量餐厅','cafe')]),
 cafe:room('能量餐厅','体育回路 04 · 补给、相遇、再出发',[floor('floor',-2,38)],
 [door('cafe-back',2,'返回训练馆','court',33),item('meal',8,'免费补给 · 恢复训练心','meal'),item('partner',16,'邀请运动伙伴','partner'),item('shop',23,'建设休息设施','shop'),item('circuit-shortcut',32,'开启健身中心近路','shortcut')])
};
export const UPGRADES={
 restCorner:{title:'暖光休息角',cost:12,text:'餐厅增加暖光座位；以后进入餐厅自动恢复训练心。'},
 springDeck:{title:'回访踏台',cost:18,text:'健身中心增加一块中途踏台，让回访高处奖牌更轻松。'}
};
export const PARTNERS={ANTA:{title:'ANTA · 阿跑',text:'一起看准球路：显示完整击球与反弹方向。'},MAIA:{title:'MAIA ACTIVE · 小麦',text:'按自己的节奏前进：训练心上限增加一颗。'}};
export const CIRCUIT_REWARDS={target:5,poolCrossed:10,runnerWon:8,launcherWon:12,shortcut:10,medal:5};
export const trainingBall={energy:{x:20,y:1.1,target:27},pool:{x:5.5,y:1.1,target:8.5},court:{x:5,y:1.1,target:8.4}};
