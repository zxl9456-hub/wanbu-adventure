import {SHOES} from '../equipment/state.js';
import {createShoeTrial} from '../equipment/trial.js';
import {showShoeShop} from '../equipment/shop.js';
import {CIRCUIT_ROOMS,UPGRADES,PARTNERS} from '../circuit/content.js';
import {PROLOGUE,CHAPTER_STORY,keepsakes,rememberedRoutes} from './lore.js';
import {CLAW} from './combat.js';
import {CEREMONY_STAGES} from './ceremony.js';
import {CAMPUS_LAB_SAVE,ACTIVITIES,activityURL,completedActivity,adventureChapters} from './campaign.js';
import {CampusState,waterConnected} from './state.js';
import {CampusWorld} from './world.js';
import {SAVE_KEY,CHAPTERS,CAMPUS_ROOMS,SITES,WALK_POINTS,SAMPLES,BRANDS,STORIES} from './content.js';
import {AudioEngine} from '../audio.js';
const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
export class CampusGame{
 constructor(world,{persistent=true}={}){
  this.world=world;this.persistent=persistent;let saved;if(persistent)try{saved=JSON.parse(localStorage.getItem(SAVE_KEY));}catch{}
  this.state=new CampusState(saved);this.returned=[];this.pendingReturn=new URLSearchParams(location.search).get('resume')==='world';
  if(persistent)for(const id of Object.keys(ACTIVITIES))try{const proof=JSON.parse(localStorage.getItem(ACTIVITIES[id].key));if(this.state.acceptActivity(id,proof))this.returned.push(id);if(this.state.activeChallenge===id&&completedActivity(id,proof,this.state.runId))this.state.activeChallenge=null;}catch{}
  this.labReturned=this.returned.includes('lab');this.keys=new Set();this.holds=new Map();this.queued={};this.active=false;this.paused=false;this.clock=0;this.uiClock=0;this.toastTime=0;this.knownStamps=new Set(this.state.stamps);
  this.audio=new AudioEngine({scene:'explore'});this.bind();this.refresh();this.state.drain();
  $('start').disabled=false;const pending=this.state.activeChallenge;$('start').textContent=pending&&!this.pendingReturn?'继续第 '+ACTIVITIES[pending].number+' 章 · '+ACTIVITIES[pending].title+' →':saved?'继续万步冒险 →':'和小步一起出发 →';$('loading').textContent='九章连续冒险 · 检查点自动保存';if(pending&&!this.pendingReturn){const b=el('button','secondary','先回园区');b.onclick=()=>{this.pendingReturn=true;$('start').click();};$('start').after(b);}if(this.pendingReturn)queueMicrotask(()=>$('start').click());
 }
 playable(){return this.active&&!this.cinematic&&!this.paused&&!document.hidden;}
 clear(){this.keys.clear();this.holds.clear();this.queued={};this.tapUntil=0;this.tapJumpUntil=0;this.state.attackQueued=false;}
 bind(){
  $('ceremony-skip').onclick=()=>this.endCeremony();
  $('start').onclick=()=>{if(this.state.activeChallenge&&!this.pendingReturn){location.href=activityURL(this.state.activeChallenge);return;}if(this.pendingReturn)this.state.activeChallenge=null;this.active=true;$('intro').hidden=true;$('hud').hidden=false;for(const id of ['passport-button','map-button','menu'])$(id).disabled=false;this.audio.start();this.world.canvas.focus();this.toast(this.state.stamps.length||this.state.visited.size>1?'进度已恢复 · '+this.state.objective():'欢迎，小步。追着金币向右跑，跳过障碍，在大楼门口按 F。');if(this.returned.length){const c=ACTIVITIES[this.returned.at(-1)];this.modal('已带回'+c.reward,c.next,[['继续冒险',()=>this.resume(),true],['查看九章路线',()=>this.adventure()]]);this.returned=[];}else if(!this.state.storySeen)this.prologue();this.save();};
  $('equipment-button').onclick=()=>this.shoeShop();$('trial-exit').onclick=()=>this.endShoeTrial();
  $('interact').onclick=()=>this.interact();$('passport-button').onclick=()=>this.passport();$('map-button').onclick=()=>this.map();$('menu').onclick=()=>this.menu();$('guide-button').onclick=()=>this.map();
  $('close-dialog').onclick=()=>this.resume();$('dialog').addEventListener('cancel',e=>{e.preventDefault();this.resume();});
  $('echo').onclick=()=>{if(this.playable())this.queued.echoPressed=true;};
  $('attack').onclick=()=>{if(this.playable())this.queued.attackPressed=true;};
  $('dash').onclick=()=>{if(this.playable())this.queued.dashPressed=true;};
  $('sound').onclick=()=>{this.audio.toggle();if(this.active)this.audio.start();this.soundLabel();};this.soundLabel();
  document.querySelectorAll('[data-hold]').forEach(b=>{
   b.onpointerdown=e=>{e.preventDefault();if(!this.playable())return;b.setPointerCapture(e.pointerId);this.holds.set(e.pointerId,b.dataset.hold);if(b.dataset.hold==='jump')this.queued.jumpPressed=true;};
   const release=e=>this.holds.delete(e.pointerId);b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;
   b.onclick=e=>{if(e.detail===0&&this.playable()){if(b.dataset.hold==='jump'){this.queued.jumpPressed=true;this.tapJumpUntil=performance.now()+400;}else{this.tapMove=b.dataset.hold==='right'?1:-1;this.tapUntil=performance.now()+260;}}};
  });
  addEventListener('keydown',e=>{
   if(this.cinematic){if(e.code==='Escape')this.endCeremony();return;}
   if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
   if(e.code==='Escape'&&this.active){e.preventDefault();this.paused?this.resume():this.menu();return;}
   if(!this.active||e.repeat)return;
   if(e.code==='KeyM'){e.preventDefault();this.map();return;}if(e.code==='KeyP'){e.preventDefault();this.passport();return;}
   if(!this.playable())return;
   if(['ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW','Space','ShiftLeft','ShiftRight','KeyF','KeyE','KeyJ'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}
   if(['Space','ArrowUp','KeyW'].includes(e.code))this.queued.jumpPressed=true;
   if(e.code.startsWith('Shift'))this.queued.dashPressed=true;
   if(e.code==='KeyJ')this.queued.attackPressed=true;
   if(e.code==='KeyF')this.interact();if(e.code==='KeyE')this.queued.echoPressed=true;
  });
  addEventListener('keyup',e=>this.keys.delete(e.code));addEventListener('blur',()=>{this.clear();if(this.active&&!this.paused)this.menu();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.clear();this.save();if(this.active&&!this.paused)this.menu();}});addEventListener('pagehide',()=>this.save());
  this.world.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.save();this.clear();this.paused=true;$('error-message').textContent='图形上下文中断，进度已保存。重新载入即可继续。';$('error').hidden=false;});
 }
 soundLabel(){$('sound').setAttribute('aria-label',this.audio.enabled?'关闭声音':'开启声音');$('sound').setAttribute('aria-pressed',String(this.audio.enabled));$('sound').textContent=this.audio.enabled?'♪':'♫';}
 input(){const held=x=>[...this.holds.values()].includes(x);return {...this.queued,move:performance.now()<(this.tapUntil||0)?this.tapMove:(this.keys.has('KeyD')||this.keys.has('ArrowRight')||held('right')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')||held('left')?1:0),jumpHeld:performance.now()<(this.tapJumpUntil||0)||this.keys.has('Space')||this.keys.has('KeyW')||this.keys.has('ArrowUp')||held('jump')};}
 interact(){if(!this.playable())return;this.state.interact();this.events();this.checkStamps();this.refresh();if(!this.paused)this.world.canvas.focus();}
 save(){if(this.shoeTrial||!this.persistent||!this.active)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.state.save()));$('save-state').textContent='探索进度已保存在本机';}catch{$('save-state').textContent='当前浏览器无法保存，旅程仍可继续';}}
 toast(text){$('toast').textContent=text;$('toast').classList.add('show');this.toastTime=5;}
 modal(title,text,actions=[],kind=''){
  this.clear();this.paused=true;$('dialog').className=kind;$('dialog-body').replaceChildren();
  const heading=el('h2','',title);heading.id='dialog-title';$('dialog-body').append(heading,el('p','',text));
  const body=el('div','modal-content'),row=el('div','modal-actions');$('dialog-body').append(body,row);
  actions.forEach(([label,fn,primary])=>{const b=el('button',primary?'primary':'',label);b.onclick=fn;row.append(b);});
  if(!$('dialog').open)$('dialog').showModal();$('dialog').scrollTop=0;this.audio.setState(true,document.hidden);return body;
 }
 resume(){$('dialog').close();this.clear();this.paused=false;this.audio.setState(false,document.hidden);this.world.canvas.focus();}
 guide(room){if(!this.state.guide(room)){this.toast('从花园开启环线捷径后，可快速回访已经发现的区域。');return;}this.events();this.resume();this.save();this.refresh();this.toast('回访 '+this.state.room.name+' · '+this.state.objective());}
 target(){return this.state.mission;}
 enterLab(){this.enterActivity('lab');}
 enterActivity(id){
  if(!this.state.challengeAllowed(id)){this.toast('入口尚未回应 · '+this.state.objective());return;}
  const c=ACTIVITIES[id],copy={sports:'沿连廊、中庭和花园跑跳。通过两个检查点，抵达终点，取得步道徽记。',lab:'寻找四处呼吸微光，打开器物，收集 A / N / T / A。集齐后走出光门，带回回声项圈。',portal:'在足迹档案里拼接面板，亲自跑过屏幕路线，校准投影，用回声打开最后的光路。',relay:'与四位伙伴完成连廊妙传、中庭接应、午间决胜球。共创核心会为运动馆供能。'};
  const body=this.modal('第 '+c.number+' 章 · '+c.title,copy[id],[['稍后出发',()=>this.resume()]]);
  const a=el('a','primary lab-entry','进入'+c.title+' →');a.href=activityURL(id);a.onclick=e=>{if(!this.persistent||!this.state.beginChallenge(id)){e.preventDefault();this.toast('请从正式冒险进入本章。');return;}this.save();};body.append(a);
 }
 prologue(index=0){const [title,text]=PROLOGUE[index];const finish=()=>{this.state.storySeen=true;this.save();this.resume();this.toast(this.state.roomId==='arrival'?'点点：向右收集金币，长按跳跃越过矮栏，再从大楼门口进入。':'点点：先向右走，到三个建筑模型旁按 F。');};const body=this.modal(title,text,[[index<2?'接着听 →':'带上护照，出发 →',index<2?()=>this.prologue(index+1):finish,true],...(index<2?[['先开始探索',finish]]:[])]);body.prepend(el('p','eyebrow','万步之光 · 序章 '+(index+1)+' / 3'));}
 adventure(){const chapters=adventureChapters(this.state),next=chapters.find(c=>!c.done);const body=this.modal('小步的旅程日志',`已完成 ${chapters.filter(c=>c.done).length} / 9 章。帮助点点连接五座建筑的光路，让回家的路亮起来。`,[['继续冒险',()=>this.resume(),true],['查看园区地图',()=>this.map()],['重读序章',()=>this.prologue()]]);const list=el('div','journey-list');for(const c of chapters){const row=el('article','journey-step'+(c.done?' done':'')+(c.id===next?.id?' current':''));row.append(el('span','',c.done?'✓':c.number),el('b','',c.title),el('small','',c.description+(c.done?' · '+CHAPTER_STORY[c.id][2]:c.id===next?.id?' · '+CHAPTER_STORY[c.id][1]:'')));list.append(row);}body.append(list);}
 refresh(){
  const s=this.state,t=this.target(),c=CHAPTERS.find(c=>c.id===t.chapter),chapters=adventureChapters(s),next=chapters.find(c=>!c.done);if($('journey-progress'))$('journey-progress').textContent=`主线 ${chapters.filter(c=>c.done).length} / 9 章 · ${next?'下一章 '+next.number+' '+next.title:'九章冒险已完成'}`;
  if($('guide-voice'))$('guide-voice').textContent='点点：'+CHAPTER_STORY[next?.id||'finale'][s.finished?2:1];
  $('coin-count').textContent=s.totalCoins;if($('wallet-count'))$('wallet-count').textContent='可用 '+s.availableCoins;this.refreshCircuit();$('venue-status').textContent=s.guardianWon?'✓ 运动馆已点亮':s.venueUnlocked?'✓ 运动馆已解锁':'运动馆：60 足迹币 + 花园供能 + 共创核心';
  const guardian=s.guardian;$('boss-hud').hidden=s.roomId!=='arena';$('hud').classList.toggle('in-training',s.roomId==='arena');
  $('boss-phase').textContent=guardian.hint;$('boss-cores').textContent=`HP ${guardian.hp} / ${guardian.maxHP} · ${guardian.variant}`;$('boss-hearts').textContent='♥'.repeat(guardian.hearts)+'♡'.repeat(3-guardian.hearts);$('boss-timer').textContent=['windup','stunned'].includes(guardian.phase)?Math.max(0,guardian.timer).toFixed(1)+' s':'';
  $('boss-progress').max=guardian.maxHP;$('boss-progress').value=guardian.hp;$('boss-progress').setAttribute('aria-valuetext',`生命值 ${guardian.hp} / ${guardian.maxHP}`);
  const cooldown=Math.max(0,s.player.attackCooldown),locked=!s.clawUnlocked,unavailable=s.roomId==='arena'&&['failed','defeated','won'].includes(guardian.phase);
  $('attack').disabled=locked||cooldown>0||unavailable;$('attack').style.setProperty('--charge',`${(1-cooldown/CLAW.cooldown)*100}%`);$('attack-label').textContent=locked?'未解锁':cooldown>0?cooldown.toFixed(1)+'s':'爪击';$('attack').title=locked?'在健身中心训练台领取能量爪击':'J 能量爪击 · 面向目标 · 冷却 0.7 秒';$('attack').setAttribute('aria-label',locked?'能量爪击未解锁':cooldown>0?'能量爪击冷却中':'能量爪击 J');
  $('place').textContent=s.room.name;$('place-sub').textContent=s.room.subtitle;
  $('chapter-number').textContent=s.finished?'JOURNEY COMPLETE':'CHAPTER '+next.number+' / 09';
  $('chapter-title').textContent=s.finished?'世界，因相遇而连接':next.title;
  $('objective').textContent=s.finished?'全馆已点亮。可回到运动馆挑战随机节奏，或在菜单重看点亮庆典。':s.objective();
  $('direction').textContent=t.room===s.roomId?`${Math.abs(t.x-s.player.x)<1.5?(t.y>s.player.y+.8?'↑':'●'):t.x>s.player.x?'→':'←'} ${t.label}${t.y>s.player.y+.8?' · 上层展台':''}`:'下一站 · '+CAMPUS_ROOMS[t.room].name;
  $('guide-button').hidden=t.room===s.roomId||s.finished;$('guide-button').textContent='查看相连路线 ↗';$('stamp-count').textContent=s.stamps.length+' / 5';
  $('dash').disabled=!s.progress.dash;$('echo').disabled=!s.progress.echoCollar;
  $('ability-status').textContent=`${s.progress.dash?'✓':'○'} 冲刺  ·  ${s.progress.doubleJump?'✓':'○'} 二段跳  ·  ${s.progress.echoCollar?'✓':'○'} 回声  ·  ${s.clawUnlocked?'✓':'○'} 爪击`;
  $('jump-help').textContent=s.progress.doubleJump?'空中松开再按，可二段跳':'长按跳跃，跳得更高';
  const echo=s.echo;const pad=s.room.relay;
  $('echo-status').hidden=!s.progress.echoCollar||s.roomId==='arena';
  $('echo-status').textContent=echo.phase==='record'?`● 正在记录 ${echo.remaining.toFixed(1)}s · 再按 E 留下回声`:echo.phase==='replay'?`回声 ${echo.remaining.toFixed(1)}s${pad&&!s.progress.relayOpen?' · 双点同步 '+s.relay.hold.toFixed(1)+' / 1.1s':''}`:s.progress.relayOpen?'✓ 双点通道已打开 · E 可再次记录':'E 记录 → 停留片刻 → E 释放 → 前往另一圆盘';
  $('echo').firstChild.textContent=echo.phase==='record'?'释放 ':'回声 ';
  this.refreshArrival();this.refreshShoes();
  const item=s.nearby();$('interact').hidden=!item||this.paused;if(item)$('interaction-label').textContent=item.label;
  if(this.dotsKey!==s.stamps.join('/')){this.dotsKey=s.stamps.join('/');$('chapter-dots').replaceChildren();for(const chapter of CHAPTERS){const b=el('button',s.stamps.includes(chapter.id)?'done':'',s.stamps.includes(chapter.id)?'✓':chapter.number);b.setAttribute('aria-label',chapter.title+(s.stamps.includes(chapter.id)?'，已完成':'，查看任务'));b.onclick=()=>this.chapter(chapter);$('chapter-dots').append(b);}}
 }
 chapter(c){const done=this.state.stamps.includes(c.id);this.modal((done?'✓ ':'')+c.title,c.verb+'。'+c.fact,[['查看探索路线',()=>this.map(),true],['继续探索',()=>this.resume()]]);}
 map(){
  const s=this.state,body=this.modal('中心探索图',s.progress.shortcut?'环线捷径已开启。可快速回访已发现区域；未发现的支路仍需亲自探索。':'沿连廊逐步探索。取得能力后回访旧区域，打开通往中庭的路线；花园供能后可开启大堂捷径。',[['返回场景',()=>this.resume(),true]]);
  const chart=el('div','route-chart');const points={arrival:[660,275],core:[120,275],lab:[120,160],archive:[120,45],hub:[300,160],energy:[300,275],atrium:[480,160],garden:[480,45],gallery:[660,45],arena:[660,160],pool:[120,390],court:[300,390],cafe:[480,390]};
  const links=[['arrival','hub',true],['hub','lab',s.canEnter('lab')],['lab','core',s.progress.gate],['lab','archive',s.progress.doubleJump],['hub','energy',s.sites.size===3],['hub','atrium',s.canEnter('atrium')],['lab','atrium',s.canEnter('atrium')],['atrium','garden',s.canEnter('garden')],['garden','gallery',s.canEnter('gallery')],['garden','arena',s.canEnter('arena')],['garden','hub',s.progress.shortcut],['energy','pool',s.circuit.target],['pool','court',s.circuit.poolCrossed],['court','cafe',s.circuit.launcherWon],['cafe','energy',s.circuit.shortcut]];
  let svg='<svg viewBox="0 0 780 450" role="img" aria-label="连廊、研发区、中庭和花园组成的环线路线图">';
  for(const [a,b,open]of links){const [x,y]=points[a],[u,v]=points[b];const route=a==='lab'&&b==='atrium'?`M${x} ${y}V220H${u}V${v}`:`M${x} ${y}L${u} ${v}`;svg+=`<path d="${route}" stroke="${open?'#accca4':'#697e74'}" stroke-width="2" fill="none" ${open?'':'stroke-dasharray="5 6"'}/>`;}
  for(const [id,[x,y]]of Object.entries(points)){const seen=s.visited.has(id),current=id===s.roomId;svg+=`<rect x="${x-68}" y="${y-19}" width="136" height="38" rx="6" fill="${current?'#dac18f':seen?'#345547':'#20372f'}" stroke="${seen?'#b4c69b':'#718175'}"/><text x="${x}" y="${y+5}" text-anchor="middle" fill="${current?'#203b30':'#e3e8d3'}" font-size="12">${current?'● ':seen?'✓ ':'◇ '}${CAMPUS_ROOMS[id].name}</text>`;}
  chart.innerHTML=svg+'</svg>';body.append(chart,el('p','map-legend','实线：能力已满足  ·  虚线：需要解锁  ·  ◇ 尚未发现'));
  const grid=el('div','map-grid');
  for(const id of ['arrival','hub','lab','core','atrium','garden','gallery','archive','energy','pool','court','cafe','arena']){const r=CAMPUS_ROOMS[id],seen=s.visited.has(id),can=s.progress.shortcut&&seen&&s.canEnter(id)&&!s.guardian.active;const button=el('button','map-tile'+(id===s.roomId?' current':'')+(id===this.target().room?' goal':''));button.append(el('span','',id===s.roomId?'● 当前区域':can?'↗ 快速回访':seen?'✓ 已探索 · 捷径待开启':'◇ 尚未发现'),el('b','',r.name),el('small','',!s.canEnter(id)?s.lockedRoute(id):r.subtitle));button.disabled=!can;button.onclick=()=>this.guide(id);grid.append(button);}body.append(grid);const notes=rememberedRoutes(s);if(notes.length){body.append(el('h3','','记下的岔路'));for(const n of notes)body.append(el('p','route-memory',n.title+' · '+n.text));}
 }
 stampCards(){const grid=el('div','chapter-grid');for(const c of CHAPTERS){const done=this.state.stamps.includes(c.id),card=el('div','stamp-card'+(done?' done':''));card.append(el('span','',done?'✓':c.number),el('b','',c.short),el('small','',done?'已收入护照':'等待相遇'));grid.append(card);}return grid;}
 passport(){
  const body=this.modal('小步的万步护照',`${this.state.stamps.length} / 5 枚印章 · 每一枚都来自一次亲自参与的发现。`,[['继续探索',()=>this.resume(),true],['园区导览',()=>this.map()]]);body.append(this.stampCards(),el('h3','','小步的行囊'));const pack=el('div','keepsake-grid');for(const k of keepsakes(this.state)){const card=el('article',k.owned?'owned':'');card.append(el('b','',(k.owned?'✓ ':'○ ')+k.title),el('small','',k.owned?k.text:'继续冒险后获得'));pack.append(card);}body.append(pack);
  const circuit=this.state.circuit,record=el('div','keepsake-grid');body.append(el('h3','','体育回路纪念册'));
  for(const [owned,title,text]of [[circuit.done,'体育回路',circuit.done?'训练、补给与近路已经相连':'沿着泳池、训练馆与餐厅继续探索'],[circuit.medal,'回访奖牌',circuit.medal?'带着二段跳回到健身中心，在高台找到的纪念':'健身中心高处的金色奖牌，等待学会二段跳后回访'],[!!circuit.partner,'同行伙伴',circuit.partner?PARTNERS[circuit.partner].title:'在能量餐厅邀请一位伙伴'],...Object.entries(UPGRADES).map(([id,u])=>[circuit.purchases.includes(id),u.title,circuit.purchases.includes(id)?u.text:'在能量餐厅用足迹币建设'])]){const card=el('article',owned?'owned':'');card.append(el('b','',(owned?'✓ ':'○ ')+title),el('small','',text));record.append(card);}body.append(record);
  const list=el('div','fact-list');for(const c of CHAPTERS){const a=el('article');a.append(el('h3','',c.number+'  '+c.title),el('p','',this.state.stamps.includes(c.id)?c.fact:c.verb));list.append(a);}body.append(list);
 }
 roots(){
  const body=this.modal('一个总部，两个中心。','直接点击下方三张卡片，每点一张就会亮起一个节点。三个都变成 ✓ 后，健身中心开放。没有先后顺序。',[['回到场景',()=>this.resume(),true]]),grid=el('div','site-grid');
  const status=el('div','status-line');const buttons=[];
  const render=()=>{SITES.forEach((s,i)=>{const done=this.state.sites.has(s[0]);buttons[i].disabled=done;buttons[i].classList.toggle('done',done);buttons[i].setAttribute('aria-pressed',String(done));buttons[i].firstChild.textContent=done?'✓':String(i+1).padStart(2,'0');});status.textContent=`已连接 ${this.state.sites.size} / 3 · 晋江总部 ↔ 厦门营运中心 ↔ 上海中心`;};
  SITES.forEach(s=>{const b=el('button','site-card');b.setAttribute('aria-label','连接'+s[1]);b.append(el('span',''),el('b','',s[1]),el('small','',s[2]));b.onclick=()=>{if(this.state.connect(s[0]))this.audio.gate();this.events();render();this.checkStamps({silent:true});};buttons.push(b);grid.append(b);});body.append(grid,status);const next=el('button','primary','三地已连接 · 前往健身中心 →');next.onclick=()=>{if(this.state.sites.size===3){this.state.enter('energy',4,0);this.events();this.resume();this.save();}};body.append(next);const oldRender=render;const sync=()=>{oldRender();next.hidden=this.state.sites.size!==3;};buttons.forEach(b=>{const fn=b.onclick;b.onclick=()=>{fn();sync();};});sync();
 }
 water(){
  const body=this.modal('让水流，重新相连。','旋转三段管道，将左下方的水源引到右上方花园。直管可水平贯通，弯管需要对齐两端。',[['回到花园',()=>this.resume(),true]],'water-dialog');
  const diagram=el('div'),row=el('div','pipe-controls'),status=el('div','water-status');status.setAttribute('role','status');body.append(diagram,row,status);
  const render=()=>{
   const connected=waterConnected(this.state.turns),color=connected?'#a9e5df':'#8fa49a',positions=[[105,160],[215,160],[215,60]],ports=[[1,3],[0,1],[0,1]],unit=[[0,-37],[37,0],[0,37],[-37,0]];
   let svg='<svg class="water-diagram" viewBox="0 0 350 225" role="img" aria-label="水管路径：水源从左下进入一号直管，经二号弯管向上，再经三号弯管向右抵达花园"><g fill="none" stroke="#526f64" stroke-width="12" stroke-linecap="round"><path d="M30 160H105M105 160H215V60H316"/></g>';
   positions.forEach(([x,y],i)=>{const ends=ports[i].map(d=>unit[(d+this.state.turns[i])%4]);svg+=`<rect x="${x-41}" y="${y-41}" width="82" height="82" rx="9" fill="#274a3f" stroke="#829875"/><path d="M${x+ends[0][0]} ${y+ends[0][1]}L${x} ${y}L${x+ends[1][0]} ${y+ends[1][1]}" fill="none" stroke="${color}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="12" fill="#e3cb95"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="12" fill="#294134">${i+1}</text>`;});
   svg+='<g font-size="11" fill="#eadab3" text-anchor="middle"><text x="30" y="192">水源</text><text x="312" y="42">花园</text></g></svg>';diagram.innerHTML=svg;
   status.textContent=(connected?'✓ 水路已贯通':'○ 水路尚未接通')+' · '+(this.state.power?'✓ 绿色能源已接通':'请回场景接通左侧绿色能源');
   [...row.children].forEach((b,i)=>{b.disabled=this.state.stamps.includes('green');b.setAttribute('aria-label',`旋转${i+1}号管道，当前${this.state.turns[i]*90}度`);});
  };
  [1,2,3].forEach((n,i)=>{const b=el('button','',n+' 号 ↻');b.onclick=()=>{this.state.rotate(i);this.events();this.audio.cue('ui');render();this.checkStamps();};row.append(b);});render();
 }
 story(kind){const [title,text]=STORIES[kind]||STORIES.lobby;this.modal(title,text,[['继续探索',()=>this.resume(),true]]);}
 checkStamps({silent=false}={}){
  if(this.shoeTrial)return;
  for(const id of this.state.stamps){if(this.knownStamps.has(id))continue;this.knownStamps.add(id);this.save();this.audio.success();const c=CHAPTERS.find(c=>c.id===id);this.world.burst(this.state.player.x,this.state.player.y+1,0xffd697);
   if(silent){this.toast('三地连接完成 · 全球枢纽印章 +15 足迹币');continue;}
   const body=this.modal('印章已收入护照 · '+c.short,'足迹币 +15 · '+c.fact,[['继续旅程',()=>this.resume(),true],['查看万步护照',()=>this.passport()]]);body.append(this.stampCards());
  }
 }
 guardianIntro(){
  const s=this.state,body=this.modal(s.guardianWon?'再追一次疾风':'训练守护者 · 疾风机械猎豹',s.guardianWon?'自由训练会随机调整每轮预警时长与冲刺速度。完成奖励只领取一次；已点亮的场馆会保留。':'疾风守卫看守着最后的火种，小步要用运动与勇气通过试炼。地面亮起橙色预警时，准备跳过冲刺。猎豹撞到两端缓冲器后，核心会露出 3.2 秒。靠近并面向猎豹，按 J 发动能量爪击；普通命中 15 点，核心露出时 30 点，冷却 0.7 秒。清空 180 点生命值即可击败它。三颗训练心耗尽可立即重试，金币与印章保留。',[[s.guardianWon?'开始随机训练':'开始疾风训练',()=>{this.resume();this.state.startGuardian();this.events();this.refresh();},true],['稍后挑战',()=>this.resume()]]);
  const img=el('img','guardian-portrait');img.src='./assets/guardian/gale-guardian-preview.png';img.alt='象牙白装甲、金色关节与薄荷绿能量核心的机械猎豹';body.append(img);
 }
 beginCeremony(){this.clear();this.toastTime=0;$('toast').classList.remove('show');$('dialog').close();this.paused=true;this.cinematic=true;this.filmTime=0;this.world.ceremonyTime=0;$('ceremony').hidden=false;$('hud').hidden=true;document.querySelector('.topbar').hidden=true;this.audio.complete();$('ceremony-skip').focus();}
 updateCeremony(dt){if(!this.cinematic)return;if(!document.hidden)this.filmTime=Math.min(15,this.filmTime+dt);this.world.ceremonyTime=this.filmTime;$('ceremony-caption').textContent=CEREMONY_STAGES[Math.min(5,Math.floor(this.filmTime/2))];$('ceremony-meter').value=Math.min(6,Math.floor(this.filmTime/2)+1);$('ceremony-skip').textContent=this.filmTime>=15?'继续在园区漫游':'结束镜头，继续漫游';}
 endCeremony(){if(!this.cinematic)return;this.cinematic=false;delete this.world.ceremonyTime;$('ceremony').hidden=true;$('hud').hidden=false;document.querySelector('.topbar').hidden=false;this.finale();}
 finale(){
  this.audio.complete();const body=this.modal('每一步，都连接更大的世界。','五座建筑终于亮起同一片光。点点说：「不是最快的那一步，是每一次愿意连接的脚步，让我们走到了这里。」回家的光门在火炬旁亮起。小步合上盖满印章的护照，决定记住这一路遇见的伙伴。',[['留在园区漫游',()=>this.resume(),true],['回看万步护照',()=>this.passport()],['重看点亮庆典',()=>this.beginCeremony()]]);
  body.append(this.stampCards());const route=el('div','finish-route');['产品出海','品牌出海','模式出海','生态出海'].forEach(t=>route.append(el('span','',t)));body.append(route,el('p','muted','公共空间愿景：滨河绿地与下沉广场向城市开放；安踏体育主题公园承载着面向未来的运动愿景。'));
 }
 menu(){
  if(this.shoeTrial){this.modal('试穿暂停','试穿不消耗金币，也不会改变主线进度。',[['继续试穿',()=>this.resume(),true],['结束试穿',()=>this.endShoeTrial()]]);return;}
  const body=this.modal('在这里，稍作停留。','进度自动保存在当前浏览器。跌落会回到最近的安全落脚点。冲刺、二段跳和回声需要沿主线获得；开启花园捷径后可回访已探索区域。',[['继续旅程',()=>this.resume(),true],['故事与九章日志',()=>this.adventure()],['万步护照',()=>this.passport()],['运动装备 · 金币商店',()=>this.shoeShop()],['逐光启程',()=>this.arrivalGuide()],['体育回路导览',()=>this.circuitGuide()],['操作帮助',()=>this.help()],['重新开始',()=>this.confirmReset()]]);
  if(this.state.guardian.active){const b=el('button','','退出本次训练');b.onclick=()=>{this.state.retreatGuardian();this.events();this.resume();};body.append(b);}if(this.state.finished){const b=el('button','','重看点亮庆典');b.onclick=()=>this.beginCeremony();body.append(b);}body.append(el('p','muted','跟随发光足迹，亲自连接每一个空间。故事、机关与训练装置共同构成小步的冒险。'));

 }
 help(){this.modal('小步的探索手册','A / D 或方向键左右移动；空格跳跃，空中松开后再按一次可二段跳；Shift 向前冲刺；F 与近处装置互动。在健身中心领取爪击后，按 J（触屏点「爪击」）发动能量爪击，冷却 0.7 秒。面向并靠近 Boss 攻击；核心露出时伤害翻倍，空中也可攻击。E 记录足迹，再按 E 释放回声；停在第一个圆盘记录后，让小步走到另一圆盘。冲刺、二段跳、回声按主线逐步解锁。P 打开护照，M 打开地图，Esc 暂停。触屏长按方向与跳跃按钮可以组合操作。踩中发光圆环可收集足迹或运动信号；消息牌与装置需要靠近后互动。',[['知道了，出发',()=>this.resume(),true]]);}
 confirmReset(){this.modal('重新走一遍同心之旅？','这会重置当前主线的金币、场馆、Boss、能力、印章、地图与四个主线关卡的检查点。v3.7 和各独立模式的存档保留。',[['保留旅程',()=>this.menu(),true],['重新出发',()=>{this.state=new CampusState();if(this.persistent)try{for(const a of Object.values(ACTIVITIES)){localStorage.removeItem(a.key);localStorage.removeItem(a.key+'-best');}}catch{}this.knownStamps.clear();this.dotsKey=null;this.world.currentRoom=null;this.save();this.resume();this.refresh();this.prologue();}]]);}
 events(){for(const e of this.state.drain()){
  if(this.shoeTrial&&['save','circuit-effect','circuit-failed','ability'].includes(e.type))continue;
  if(e.type==='equipment'){this.audio.collect();this.toast(e.text);continue;}
  if(e.type==='save')this.save();
  else if(e.type==='room'){this.clear();this.refresh();}
  else if(e.type==='jump'||e.type==='double-jump')this.audio.cue('jump');
  else if(e.type==='land')this.audio.cue('land');
  else if(e.type==='dash'||e.type==='claw-attack')this.audio.dash();
  else if(e.type==='circuit-partner')this.circuitPartners();
  else if(e.type==='circuit-shop')this.circuitShop();
  else if(e.type==='circuit-effect'){this.audio.success();this.toast(e.text);this.world.burst(e.x,e.y,0xf1ce8e);}
  else if(e.type==='circuit-damage'||e.type==='circuit-reflect'){this.audio.collect();this.world.burst(e.x,e.y,0x9effd5);}
  else if(e.type==='circuit-shot')this.audio.cue('throw');
  else if(e.type==='circuit-rush')this.audio.dash();
  else if(e.type==='circuit-hit'){this.audio.cue('land');this.toast('训练心剩余 '+e.hearts+' · 看清预警，失败可立即重试');}
  else if(e.type==='circuit-failed')this.modal('再来一球，找到自己的节奏','已完成的训练、金币、水位和能力全部保留。跳过冲线机，等它停下再爪击；面向发球机，把来球打回去。',[['立即重试',()=>{this.resume();this.state.circuit.retry(this.state);this.events();},true],['回到池边',()=>{this.state.enter('pool',31,0);this.events();this.resume();this.save();}]]);
  else if(e.type==='hint')this.toast(e.text);
  else if(e.type==='locked')this.toast(e.message);
  else if(e.type==='ability'){this.audio.success();this.modal('能力已获得 · '+e.name,e.text,[['试试新能力',()=>this.resume(),true]]);}
  else if(e.type==='enter-lab')this.enterLab();
  else if(e.type==='enter-activity')this.enterActivity(e.id);
  else if(e.type==='chapter-complete')this.modal('已带回'+e.reward,e.next,[['继续冒险',()=>this.resume(),true]]);
  else if(e.type==='gate'){this.audio.gate();this.toast('冲刺光幕已打开 · 沿左侧通道前往研发展台。');}
  else if(e.type==='echo-record'){this.audio.echo(false);this.toast('正在记录 · 留在圆盘片刻，再按 E 释放。');}
  else if(e.type==='echo-replay'){this.audio.echo(true);this.toast('回声已留下 · 小步前往另一个感应圆盘。');}
  else if(e.type==='relay-open'){this.audio.gate();this.modal('双点同步 · 新路线已打开','回声与小步共同接通了水平连廊。向右走到中庭入口，使用二段跳向更高处探索。',[['前往中庭',()=>this.resume(),true]]);}
  else if(e.type==='shortcut-open'){this.audio.gate();this.toast('花园 ↔ 大堂捷径已开启 · 地图开放已发现区域的快速回访。');}
  else if(e.type==='discovery'){this.audio.collect();this.world.burst(this.state.player.x,this.state.player.y+1);this.toast(e.walk?`足迹已点亮 · ${e.title} · ${this.state.walks.size}/3`:`运动信号已采集 · ${e.title} · ${this.state.samples.size}/3`);}
  else if(e.type==='pass'){this.audio.cue('throw');this.toast(e.index===3?'四位伙伴已就位 · 再次按 F，进入全楼开赛':`${BRANDS[e.index]} 已接力 · 下一棒 ${BRANDS[e.index+1]}`);}
  else if(e.type==='power'){this.audio.gate();this.toast(waterConnected(this.state.turns)?'循环装置已启动，花园恢复活力。':'绿色能源已接通 · 前往右侧调节水循环。');}
  else if(e.type==='coin'){this.audio.collect();this.world.burst(this.state.player.x,this.state.player.y+1,0xffd697);}
  else if(e.type==='venue-unlocked'){this.audio.gate();this.modal('运动场馆已解锁','伙伴们把共创核心交给小步，花园能源已接通，足迹币也已达标。金币无需扣除。已获得「能量爪击」：按 J 或点击爪击按钮，向前方发动攻击。再次与门口终端互动，进入场馆挑战疾风机械猎豹。',[['进入场馆',()=>{this.state.enter('arena',4,0);this.events();this.resume();this.save();},true],['继续探索',()=>this.resume()]]);}
  else if(e.type==='guardian-intro')this.guardianIntro();
  else if(e.type==='guardian-start')this.toast('跳过冲刺 → 面向并靠近猎豹 → J 爪击 · 核心露出时伤害 ×2');
  else if(e.type==='guardian-dash')this.audio.dash();
  else if(e.type==='guardian-damaged'){this.world.combatView.damage(e,this.state);this.world.burst(e.x,e.y,e.critical?0xffd28e:0x9cfbea);if(this.audio.ready('claw-hit')){this.audio.tone(e.critical?620:360,.12,'triangle',0,.18,180);this.audio.hiss(.08,.08);}}
  else if(e.type==='guardian-defeated'){this.audio.success();this.toast('Boss 生命值归零 · 能量消散，运动馆点亮');}
  else if(e.type==='guardian-hit'){this.audio.cue('land');this.toast(`被训练脉冲碰到 · 剩余 ${e.hearts} 颗训练心`);}
  else if(e.type==='guardian-failed')this.modal('再试一次，找准跃起时机','收集的金币、印章与已解锁场馆全部保留。靠近冲刺线路中部，看到猎豹接近再跳起。',[['立即重试',()=>{this.resume();this.state.startGuardian();this.events();},true],['回到花园',()=>{this.state.enter('garden',29,0);this.resume();this.save();}]]);
  else if(e.type==='guardian-win'){this.audio.success();this.modal('疾风机械猎豹已击败','守卫散成光粒，最后一枚疾风火种落在小步的项圈上。「试炼完成，带它回到火炬吧。」首次击败获得 30 足迹币，运动馆已点亮。回到花园，开启大堂捷径，再去点亮整座园区。',[['回到花园',()=>{this.state.enter('garden',29,0);this.events();this.resume();this.save();},true],['留在场馆',()=>this.resume()]]);}
  else if(e.type==='finale')this.beginCeremony();
  else if(e.type==='story')this.story(e.kind);
  else if(e.type==='station'){if(e.kind==='echo-help')this.modal('一只小步，两个足迹。',this.state.progress.echoCollar?'站上 01 圆盘，按 E 开始记录。在盘上停留至少半秒，再按 E 释放；回声留在这里，让小步走到 02 圆盘。两者同时站稳 1.1 秒即可开门。':'先从左侧进入研发区。找出科技密室的四枚 A N T A 字母，走出光门取得回声项圈，再返回这里。',[['继续探索',()=>this.resume(),true]]);else if(e.kind==='shoe-shop')this.shoeShop();else if(e.kind==='roots')this.roots();else if(e.kind==='water')this.water();else if(e.kind==='relay')this.enterActivity('relay');else this.story(e.kind);}
 }}
 refreshCircuit(){
  const s=this.state,c=s.circuit,visible=!!CIRCUIT_ROOMS[s.roomId],node=$('circuit-status');if(!node)return;node.hidden=!visible;$('hud').classList.toggle('in-circuit',visible);$('hud').classList.toggle('circuit-fight',s.roomId==='court');
  const text=s.roomId==='court'?c.status:s.roomId==='energy'&&!c.run?'跑台充能 '+Math.round(c.runTime/1.1*100)+'%':s.roomId==='energy'&&c.done?(c.medal?'✓ 回访奖牌已收入护照':'回访挑战 ↑ 高处奖牌需要二段跳'):s.roomId==='pool'?(c.poolSwitch?'水位 '+Math.round(c.water*100)+'% · 跳向右岸':'球在左岸 · 面向右方按 J 击球'):s.roomId==='cafe'?(c.partner?PARTNERS[c.partner].title+' 已同行':'补给后，邀请伙伴一起出发'):c.objective()[4];
  node.textContent=(s.roomId==='court'?'♥'.repeat(c.hearts)+'♡'.repeat(c.maxHearts-c.hearts)+(c.fighting?' · 核心 '+c.enemy.hp+'/'+c.enemy.maxHP:'')+' · ':'')+text;
 }
 refreshShoes(){const s=this.state;$('hud').classList.toggle('shoe-trial',!!this.shoeTrial);for(const id of ['passport-button','map-button'])$(id).disabled=!this.active||!!this.shoeTrial;if(this.shoeTrial){$('chapter-title').textContent='装备试跑场';$('objective').textContent=s.shoes.item.text;$('direction').textContent='跳过来袭的冲线机，停顿时靠近按 J';$('save-state').textContent='试穿不保存 · 主线金币与进度保留';}const button=$('equipment-button');button.textContent=(s.shoes.item?s.shoes.item.name:'运动装备')+' ◇';button.disabled=!!this.shoeTrial||s.guardian.active||s.circuit.fighting;$('equipment-status').textContent=s.shoes.status;$('equipment-status').hidden=!s.shoes.item;$('trial-banner').hidden=!this.shoeTrial;if(this.shoeTrial)$('trial-info').textContent='免费试穿 · '+s.shoes.item.name+' · '+Math.ceil(this.shoeTrial.remaining)+'s · A/D 移动 · 空格跳跃 · J 反击';}
 shoeShop(){if(this.shoeTrial||this.state.guardian.active||this.state.circuit.fighting){this.toast('先完成当前训练，再切换装备');return;}showShoeShop(this);}
 startShoeTrial(id){if(this.shoeTrial||this.state.guardian.active||this.state.circuit.fighting)return;const trial=createShoeTrial(id);if(!trial)return;this.save();this.shoeTrial={original:this.state,remaining:30};this.state=trial;this.world.currentRoom=null;this.resume();this.refresh();this.toast('30 秒免费试穿 · 先观察橙色预警，来袭时跳跃；停顿后按 J 反击');}
 endShoeTrial(){if(!this.shoeTrial)return;this.state=this.shoeTrial.original;this.shoeTrial=null;this.world.currentRoom=null;this.clear();this.refresh();this.save();this.toast('试穿结束 · 金币和主线进度保持不变');this.shoeShop();}
 circuitPartners(){const c=this.state.circuit,body=this.modal('一起运动，各有节奏','选择一位同行伙伴。回到这里可以随时更换。',[['继续冒险',()=>this.resume(),true]]);for(const [id,p]of Object.entries(PARTNERS)){const b=el('button','circuit-choice',(c.partner===id?'✓ ':'')+p.title+' · '+p.text);b.onclick=()=>{if(c.choosePartner(id,this.state)){this.events();this.refresh();this.resume();}};body.append(b);}}
 circuitShop(){const s=this.state,c=s.circuit,body=this.modal('把足迹变成温暖的地方',`可用 ${s.availableCoins} 足迹币 · 累计建设 ${s.totalCoins}。购买设施不会减少主楼的建设进度。`,[['继续探索',()=>this.resume(),true]]);for(const [id,p]of Object.entries(UPGRADES)){const bought=c.purchases.includes(id),b=el('button','circuit-choice',(bought?'✓ 已建成 · ':p.cost+' 足迹币 · ')+p.title+' — '+p.text);b.disabled=bought||s.availableCoins<p.cost;b.onclick=()=>{if(c.purchase(id,s)){this.events();this.refresh();this.circuitShop();}};body.append(b);}}
 arrivalGuide(){const body=this.modal('从大楼门口，开始冒险','追着金币向右跑：跳过矮栏和水渠缺口，顶一下金色方块还能获得奖励。训练球可以跳过，也可以从上方踩落。至少收集 8 枚金币，在发光大门旁按 F 进入大堂。',[['前往门前步道',()=>{if(this.state.guardian.active||this.state.circuit.fighting){this.toast('先完成正在进行的训练');return;}this.state.enter('arrival',3,0);this.events();this.resume();this.save();},true],['继续旅程',()=>this.resume()]]);}
 refreshArrival(){const s=this.state,on=s.roomId==='arrival';$('hud').classList.toggle('in-arrival',on);$('hud').classList.toggle('in-lobby',s.roomId==='hub');$('coin-count').parentElement.lastChild.textContent=on?' / 29 金币':' 累计足迹币';if(!on)return;$('chapter-title').textContent='逐光启程';$('chapter-number').textContent='01 / START AT THE CENTRE';$('journey-progress').textContent='跳跃 · 收集 · 找到大楼入口';$('coin-count').textContent=s.arrival.coins.size;$('wallet-count').textContent='入楼目标 8 枚';$('jump-help').textContent='按住跳得更远 · 从上方踩落训练球';}
 circuitGuide(){const s=this.state,body=this.modal('体育回路 · 一次动作，许多答案','健身中心 → 恒温泳池 → 篮球训练馆 → 能量餐厅 → 健身近路。先用 J 击球开路，再用同一个动作反弹来球。带着二段跳回来，找高处的奖牌。',[['查看地图',()=>this.map(),true],['继续冒险',()=>this.resume()]]);if(s.sites.size===3&&!s.guardian.active&&!s.circuit.fighting){const b=el('button','primary','前往健身中心');b.onclick=()=>{s.enter('energy',4,0);this.events();this.resume();this.save();};body.append(b);}else body.append(el('p','','先连接大堂三地节点，或完成正在进行的训练。'));}
 update(dt){
  this.updateCeremony(dt);
  if(this.playable()){this.state.update(dt,this.input());this.queued={};this.events();if(this.shoeTrial){this.shoeTrial.remaining-=dt;const c=this.state.circuit;if(c.phase==='failed'||c.phase==='intermission'){c.hearts=3;c.startPhase('runner',this.state);this.state.player.x=18;this.state.claw=null;}if(this.shoeTrial.remaining<=0)this.endShoeTrial();}else this.checkStamps();this.clock+=dt;if(this.clock>5){this.clock=0;this.save();}}
  this.uiClock+=dt;if(this.uiClock>.1){this.refresh();this.uiClock=0;}this.toastTime-=dt;if(this.toastTime<=0)$('toast').classList.remove('show');
  this.world.arrivalOverview=!this.active&&this.state.roomId==='arrival';this.world.updateExpedition(Math.min(dt,.05),this.state);
 }
}
if(document.body.dataset.qa!=='true')try{
 const world=new CampusWorld($('world'));await world.load(p=>$('loading').textContent=`场景准备中 · ${Math.round(p*100)}%`);const game=new CampusGame(world);world.updateExpedition(0,game.state);
 let last=performance.now();function frame(now){const dt=Math.min((now-last)/1000,.06);last=now;game.update(dt);requestAnimationFrame(frame);}requestAnimationFrame(frame);
 // Read-only diagnostics for inspection; gameplay state changes only through the UI.
 window.campusDiagnostics=()=>({ready:world.ready,room:game.state.roomId,stamps:game.state.stamps,finished:game.state.finished,circuit:game.state.circuit.snapshot(),circuitCombat:{phase:game.state.circuit.phase,hearts:game.state.circuit.hearts,enemy:game.state.circuit.enemy,shots:game.state.circuit.shots.length},wallet:game.state.availableCoins,abilities:{dash:game.state.progress.dash,doubleJump:game.state.progress.doubleJump,echo:game.state.progress.echoCollar},relayOpen:game.state.progress.relayOpen,shortcut:game.state.progress.shortcut,visited:[...game.state.visited],position:{x:game.state.player.x,y:game.state.player.y},coins:game.state.totalCoins,venueUnlocked:game.state.venueUnlocked,guardian:{phase:game.state.guardian.phase,hp:game.state.guardian.hp,won:game.state.guardianWon},ceremony:game.cinematic,meshes:world.modelAudit?.meshes,drawCalls:world.renderer.info.render.calls});
}catch(error){console.error(error);$('error-message').textContent=error.message;$('error').hidden=false;}
