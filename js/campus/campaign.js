// One adventure run; challenge checkpoints are isolated from the standalone activities.
export const CAMPUS_SAVE='wanbu-campus-v2';
export const CAMPUS_LAB_SAVE='wanbu-campus-lab-v1';
export const LAB_IDS=['light','bridge','test','echo'];
export const ACTIVITIES={
 sports:{key:'wanbu-campus-sports-v1',file:'sports.html',number:'02',title:'云端步道',reward:'步道徽记',next:'回到健身中心，沿大堂左侧进入连廊，领取脉冲冲刺。',room:'energy',x:16,y:0},
 lab:{key:CAMPUS_LAB_SAVE,file:'lab.html',number:'03',title:'ANTA 微光密室',reward:'回声项圈',next:'回到水平连廊，登上左侧高台，进入足迹档案。',room:'core',x:11.5,y:5.7},
 portal:{key:'wanbu-campus-portal-v1',file:'portal.html',number:'04',title:'足迹穿梭',reward:'光路连接器',next:'返回连廊，用回声同步两个圆盘，打开中庭通道。',room:'archive',x:11,y:2.2},
 relay:{key:'wanbu-campus-relay-v1',file:'relay.html',number:'07',title:'全楼开赛',reward:'共创核心',next:'回到花园，用足迹币解锁运动馆，迎战疾风机械猎豹。',room:'gallery',x:27,y:0}
};
export const activityURL=id=>'./'+ACTIVITIES[id].file+'?from=campus';
export function labUnlocked(save){return typeof save?.runId==='string'&&save?.dash===true&&save?.doubleJump===true&&['sample-1','sample-2','sample-3'].every(id=>save.samples?.includes(id));}
export function activityUnlocked(id,s){
 if(typeof s?.runId!=='string')return false;
 if(id==='sports')return ['jinjiang','xiamen','shanghai'].every(x=>s.sites?.includes(x));
 if(id==='lab')return labUnlocked(s);
 if(id==='portal')return labUnlocked(s)&&s.innovation===true;
 if(id==='relay')return s.portalDone===true&&s.relayOpen===true&&s.power===true&&s.brandStep===4&&Array.isArray(s.turns)&&[0,2].includes(s.turns[0])&&s.turns[1]===3&&s.turns[2]===1;
 return false;
}
export function completedLab(raw,runId){return !!raw&&raw.campaign===runId&&raw.completed===true&&raw.inserted===true&&['discovered','solved','released','collected'].every(key=>LAB_IDS.every(id=>Array.isArray(raw[key])&&raw[key].includes(id)));}
export function completedActivity(id,raw,runId){
 if(id==='lab')return completedLab(raw,runId);
 if(!raw||raw.campaign!==runId)return false;
 if(id==='sports')return raw.finished===true&&raw.checkpoint===2&&Number.isFinite(raw.finishX)&&raw.finishX>=188&&Number.isFinite(raw.time)&&raw.time>0;
 if(id==='portal')return ['route','lamp','echoSolved','completed'].every(k=>raw[k]===true);
 if(id==='relay')return raw.finished===true&&raw.stage===2&&['ANTA','FILA','DESCENTE','KOLON'].every(b=>raw.visited?.includes(b))&&Number.isInteger(raw.passes)&&raw.passes>=6;
 return false;
}
export function adventureChapters(s){return [
 ['roots','同心启程',s.sites.size===3,'连接大堂三个协同节点'],
 ['sports','体育回路',s.sportsDone&&s.circuit.done,'跑台、泳池、训练、餐厅 · 完成云端步道'],
 ['lab','ANTA 微光密室',s.innovation,'研发终端 · 找齐四枚字母'],
 ['portal','足迹穿梭',s.portalDone,'足迹档案 · 拼路、投影、回声'],
 ['walk','中庭向上',s.walks.size===3&&s.progress.relayOpen,'双点同步 · 二段跳登上花园'],
 ['green','花园复苏',s.stamps.includes('green'),'接通能源与水循环'],
 ['relay','全楼开赛',s.teamDone,'四位伙伴 · 三段完整接力'],
 ['boss','迎战疾风',s.guardianWon,'解锁运动馆 · 爪击击败猎豹'],
 ['finale','万步之光',s.finished,'开启环线 · 返回大堂点亮全馆']
 ].map(([id,title,done,description],i)=>({id,title,done,description,number:String(i+1).padStart(2,'0')}));}
