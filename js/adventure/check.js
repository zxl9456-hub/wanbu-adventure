import {CampusState} from '../campus/state.js';
import {RouteRunner,solveLab} from '../campus/route-check.js';
import {ACTIVITIES,CAMPUS_SAVE,activityURL,adventureChapters} from '../campus/campaign.js';
import {runSports,runPortal,runRelay} from './proof-check.js';
const $=id=>document.getElementById(id),names={sports:'云端步道完整输入通关',lab:'四处微光收集与主线奖励衔接',portal:'足迹穿梭完整输入通关',relay:'全楼接力完整输入通关'},proofs={sports:runSports,lab:solveLab,portal:runPortal,relay:runRelay};
$('run').onclick=()=>{try{const s=new CampusState(),r=new RouteRunner(s);while(!r.done){r.advance();s.drain();}$('output').textContent=JSON.stringify({passed:true,steps:r.tasks.length,chapters:adventureChapters(s).filter(c=>c.done).length,falls:s.falls,coins:s.totalCoins,bossHP:s.guardian.hp,finished:s.finished},null,2);}catch(e){$('output').textContent='失败：'+e.message;}};
for(const [id,c]of Object.entries(ACTIVITIES)){
 const row=document.createElement('section');row.innerHTML=`<h2>第 ${c.number} 章 · ${c.title}</h2>`;
 for(const mode of ['fresh','complete',...(id==='sports'?['checkpoint']:[])]){const b=document.createElement('button');b.textContent=mode==='fresh'?'准备 '+c.title+' 入口':mode==='checkpoint'?'准备跑酷中段检查点':'准备 '+c.title+' 通关回程';b.onclick=()=>prepare(id,mode);row.append(b);}$('chapters').append(row);
}
function prepare(id,mode){try{
 if(location.port!=='4177')throw Error('请在独立的 4177 测试端口使用存档夹具');
 const s=new CampusState(),r=new RouteRunner(s);while(!r.done&&r.task.name!==names[id]){r.advance();s.drain();}if(r.done)throw Error('未找到入口');s.storySeen=true;if(!s.beginChallenge(id))throw Error('关卡尚未解锁');
 for(const c of Object.values(ACTIVITIES))localStorage.removeItem(c.key);
 localStorage.setItem(CAMPUS_SAVE,JSON.stringify(s.save()));
 if(mode!=='fresh'){const raw=mode==='checkpoint'?runSports(s.runId,1):proofs[id](s.runId);localStorage.setItem(ACTIVITIES[id].key,JSON.stringify(raw));}
 $('output').textContent=`已通过正式路线抵达 ${ACTIVITIES[id].title}。\n准备类型：${mode}；主线尚未领取本章奖励。打开关卡后检查章节标题、恢复进度、返回主线及下一目标。`;
 $('open').hidden=false;$('open').href=activityURL(id);$('open').textContent='打开 '+ACTIVITIES[id].title+' →';
}catch(e){$('output').textContent='失败：'+e.message;}}
