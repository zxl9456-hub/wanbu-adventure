import {ARRIVAL_ROOM} from '../arrival/content.js';
import {CIRCUIT_ROOMS} from '../circuit/content.js';
import {ROOMS} from '../metroid/map.js';

export {CAMPUS_SAVE as SAVE_KEY} from './campaign.js';
export const CHAPTERS=[
 {id:'roots',number:'01',title:'同心，向世界',short:'全球枢纽',room:'hub',place:'大堂 · 火炬柱',verb:'在火炬柱旁连接晋江、厦门和上海',fact:'一个总部、两个中心：晋江总部、厦门营运中心与上海中心协同。上海中心承担全球化战略枢纽、创新中心与多品牌集群基地的角色。'},
 {id:'walk',number:'02',title:'让每一步相连',short:'万步联动',room:'lab',place:'水平连廊 → 垂直中庭 → 空中花园',verb:'踩亮三处足迹，走过水平与垂直的连接',fact:'“健康工作，万步联动（10K Connectivity）”把健步道、水平连廊和垂直中庭连成运动网络，让工作与运动融入日常。'},
 {id:'innovation',number:'03',title:'灵感，有了回响',short:'创新网络',room:'core',place:'5F会议中心 · 运动实验台',verb:'采集运动信号，找齐密室 A N T A，取得回声项圈',fact:'全球研发网络覆盖中国、美国、日本、韩国及欧洲。上海中心汇集数字化、研发与国际化人才，让创新在交流中发生。'},
 {id:'brands',number:'04',title:'一起，走得更远',short:'多品牌共创',room:'gallery',place:'员工办公区 · 四品牌接力',verb:'邀请 ANTA、FILA、DESCENTE、KOLON，完成三段全楼接力',fact:'安踏、斐乐、迪桑特、可隆等品牌在此集聚。“单聚焦、多品牌、全球化”与“品牌＋零售”模式，连接多品牌协同和零售运营。'},
 {id:'green',number:'05',title:'把活力，还给自然',short:'绿色园区',room:'garden',place:'空中花园 · 循环装置',verb:'接通绿色能源，旋转管道让水流抵达花园',fact:'绿色能源与水资源利用融入园区设计。空中花园、运动空间和多元餐饮共同支持健康工作。这里的循环装置是对理念的游戏化表达。'}
];
export const BRANDS=['ANTA','FILA','DESCENTE','KOLON'];
export const SITES=[['jinjiang','晋江总部','品牌的来处'],['xiamen','厦门营运中心','协同运营'],['shanghai','上海中心','连接全球']];
export const WALK_POINTS=[['walk-link','lab',13,2,'水平连廊'],['walk-up','atrium',23,5.3,'垂直中庭'],['walk-garden','garden',8,0,'空中花园']];
export const SAMPLES=[['sample-1','core',24,1.9,'发现'],['sample-2','core',16,3.8,'验证'],['sample-3','core',8,5.7,'共创']];
const station=(id,x,y,label,kind)=>({id,x,y,label,type:'campus',kind});
const route=(id,x,y,label,room,toX=3,toY=0)=>({id,x,y,label,type:'route',room,toX,toY});
const copy=(id,items,extra={})=>({...ROOMS[id],enemies:[],chips:[],items,gate:null,wall:null,trial:null,relay:null,heart:null,...extra});
export const CAMPUS_ROOMS={
 hub:copy('hub',[station('shoe-shop',8,0,'运动装备 · 金币购买 / 免费试穿','shoe-shop'),station('roots',18,0,'点亮三地连接台 · 按 F 后点击三张卡片','roots'),station('torch',24,0,'点亮万步之光','finale'),route('gym',11,2.3,'前往健身中心','energy'),{...route('hub-garden',15,2.3,'已开启的花园捷径','garden'),requires:'shortcut'},station('lobby-story',4,0,'阅读：以火炬为魂','lobby')],{subtitle:'以火炬为魂，以足迹为线'}),
 lab:copy('lab',[{...route('archive',3,5,'前往足迹档案','archive'),requires:'doubleJump'},{...route('to-atrium',31,0,'双点同步后前往中庭','atrium'),requires:'relayOpen'},station('dash-kit',22,2.2,'领取脉冲冲刺','dash-kit'),station('echo-help',27.8,0,'查看回声同步提示','echo-help')],{subtitle:'跳上展台取得冲刺 · 返回这里与回声协作',gate:{x:6,y:0},relay:{flag:'relayOpen',pads:[{x:25.7,y:0},{x:30,y:0}],hold:1.1}}),
 core:copy('core',[station('innovation',11.5,5.7,'研发终端 · ANTA 科技密室','innovation'),station('research',4,0,'阅读：全球研发网络','research')],{subtitle:'发现 · 验证 · 共创'}),
 atrium:copy('atrium',[route('garden-top',29,7.3,'前往空中花园','garden')],{subtitle:'二段跳跃 · 在空中再迈出一步',platforms:[ROOMS.atrium.platforms[0],{id:'p1',left:11,right:17,y:2},{id:'p2',left:20,right:26,y:5.3},{id:'top',left:25,right:34,y:7.3}]}),
 garden:copy('garden',[station('power',13,0,'接通绿色能源','power'),station('water',22,0,'调节水循环','water'),route('to-gallery',28,7,'前往共创办公区','gallery'),station('garden-hub',3,0,'供能后开启大堂捷径','shortcut'),route('garden-atrium',10,0,'返回垂直中庭','atrium',29,7.3),station('venue-gate',30,0,'足迹币 · 解锁运动场馆','venue'),station('city',18,0,'阅读：与城市共生','city')],{subtitle:'自然连接 · 健康工作，万步联动',platforms:[ROOMS.garden.platforms[0],{id:'terrace-1',left:4,right:10,y:3},{id:'terrace-2',left:14,right:20,y:5},{id:'terrace-3',left:24,right:32,y:7}]}),
 gallery:copy('gallery',[...BRANDS.map((b,i)=>station('brand-'+i,[6,12,20,27][i],0,'接力 · '+b,'brand')),route('gallery-back',3,0,'返回空中花园','garden',28,7),station('retail',16,0,'阅读：品牌＋零售','retail')],{subtitle:'单聚焦 · 多品牌 · 全球化',platforms:[ROOMS.gallery.platforms[0]]}),
 energy:copy('energy',[route('gym-back',3,0,'返回大堂','hub',11,2.3),station('sports-entry',16,0,'第02章 · 云端步道','sports'),station('wellbeing',25,0,'阅读：运动与日常','wellbeing')],{subtitle:'健康工作 · 幸福生活'}),
 archive:copy('archive',[route('archive-back',3,0,'返回水平连廊','lab',3,5),station('portal-entry',11,2.2,'第04章 · 足迹穿梭','portal'),station('footprints',6,0,'阅读：600双鞋的起点','footprints')],{subtitle:'从晋江出发 · 走向更大的世界'}),
 arena:copy('arena',[station('guardian',4,0,'开启疾风猎豹训练','guardian'),station('sport',16,0,'阅读：专业运动空间','sport'),route('arena-back',29,0,'返回空中花园','garden',29,0)],{subtitle:'最后的火种 · 跃过冲锋，爪击破敌',platforms:[ROOMS.arena.platforms[0]]})
 ,arrival:ARRIVAL_ROOM,...CIRCUIT_ROOMS
};
export const STORIES={
 lobby:['以火炬为魂，以足迹为线','上海安踏中心由5栋建筑组成，总建筑面积约14.5万平方米。火炬般的结构柱与金色世界地图，是大堂的空间意象。小步带着试跑邀请来到这里。点点托它连接光影世界的五类能量，收集五枚万步印章，让回家的路亮起来。'],
 research:['把灵感连接起来','全球研发网络覆盖中国、美国、日本、韩国及欧洲。会议中心的数字展示与开放交流空间，是这次运动信号实验的叙事起点。带上小步采集的三个信号，让科技密室回应你的发现。'],
 city:['园区，也是城市的一部分','滨河绿地和下沉广场连接园区与城市；“安踏体育主题公园”属于未来规划。FILA HOUSE 将运动、酒店与意式美学相结合。公共空间、员工设施与酒店服务各有不同的使用范围。'],
 retail:['从产品，走向生态','“品牌＋零售”把多品牌协同和零售运营经验连接起来。产品出海 → 品牌出海 → 模式出海 → 生态出海，串起不断向前的全球化足迹。四品牌接力将协作变成一次可参与的体验。'],
 wellbeing:['在日常中积蓄活力','员工运动空间包括专业篮球场、国际化健身中心与恒温泳池，餐饮、露台与绿植则提供休息和交流的场所。完成步道挑战，把活力带回连廊。'],
 footprints:['600双鞋，向前的起点','一楼电梯厅以600双鞋翻转墙和发光足迹讲述品牌的创业起点。从晋江到上海，从中国到世界，脚步是贯穿这段旅程的线索。'],
 sport:['把专业运动带入工作日常','四层通高的室内篮球场，以专业木地板、环形看台与光之穹顶形成运动空间。与机械猎豹交锋，找准破绽发动能量爪击。胜利后沿右侧返回花园，完成最后的点亮旅程。']
};
