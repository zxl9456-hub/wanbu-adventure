import * as THREE from 'three';
import {Expedition} from './state.js';
import {ROOMS,LINKS,SAVE_KEY,TOTAL_CHIPS} from './map.js';
import {MODULES,ENEMIES} from './catalog.js';
import {loadJourney,saveJourney,resetJourneyRoute,JOURNEY_KEY} from '../journey.js';
import {MetroidWorld} from './world.js';
import {AudioEngine} from '../audio.js';
import {SoundControls} from '../sound-controls.js';
const $=id=>document.getElementById(id),heart='<path d="M12 21C8 17 2 13 2 7a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 6-6 10-10 14Z"/>';
class MetroidGame{
 constructor(world){
  this.world=world;let saved={};try{saved=JSON.parse(localStorage.getItem(SAVE_KEY))||{};}catch{}
  this.state=new Expedition(saved);const journey=loadJourney();this.state.syncJourney(journey);this.returnedFromLab=journey.labReturn;
  if(journey.labReturn){this.state.enter('core',11.5,5.7);saveJourney({labReturn:false});this.state.drain();history.replaceState(null,'',location.pathname);}
  this.saveClock=0;this.audio=new AudioEngine({scene:'sports'});this.keys=new Set();this.holds=new Map();this.tapUntil={};this.joy=new THREE.Vector2();this.queued={};this.active=false;this.paused=false;this.toastTimer=0;this.flashTimer=0;this.healthKey='';this.lastRoom='';this.ui={pause:()=>this.pause()};this.soundControls=new SoundControls(this.audio,this);this.bind();this.refresh();
  $('start').disabled=false;$('start').textContent=saved.visited?'继续探索 →':'开始探索 →';$('loading').textContent='A D 移动 · 空格跳跃 · J 脉冲爪 · F 互动';
 }
 clear(){this.keys.clear();this.holds.clear();this.tapUntil={};this.queued={};this.joy.set(0,0);}
 canPlay(){return this.active&&!this.paused&&!document.hidden;}
 bind(){
  let pointerStart=null;this.world.canvas.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};});this.world.canvas.addEventListener('pointerup',e=>{if(!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>8)return;pointerStart=null;if(!this.canPlay()||this.state.roomId!=='garden')return;const rect=this.world.canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),this.world.camera);this.world.pond.pointer(ray);});
  $('start').onclick=()=>{this.active=true;this.paused=false;$('intro').hidden=true;$('play-hud').hidden=false;this.audio.start();this.world.canvas.focus();this.toast(this.returnedFromLab?(this.state.progress.echoCollar?'回声项圈已接入！向右返回水平连廊，按 E 记录足迹。':'已返回5F会议中心，科技密室进度已保留。'):this.state.progress.dash?'进度已恢复。'+this.state.objective():'先向左探索水平连廊。长按空格跳得更高，J 可攻击训练机。');};
  $('interact').onclick=()=>{if(this.canPlay()){this.state.interact();this.events();this.world.canvas.focus();}};
  $('kit-button').onclick=()=>this.inventory();$('echo-button').onclick=()=>{if(this.canPlay())this.queued.echo=true;};
  $('pulse').onclick=()=>{if(this.canPlay())this.queued.pulse=true;};$('heal').onclick=()=>{if(this.canPlay())this.queued.heal=true;};
  $('dash').onclick=()=>{if(this.canPlay())this.queued.dash=true;};
  document.querySelectorAll('[data-hold]').forEach(b=>{
   b.onpointerdown=e=>{e.preventDefault();if(!this.canPlay())return;const action=b.dataset.hold;b.setPointerCapture(e.pointerId);this.holds.set(e.pointerId,action);this.tapUntil[action]=performance.now()+(action==='jump'?500:160);if(action==='jump')this.queued.jump=true;};
   const up=e=>this.holds.delete(e.pointerId);b.onpointerup=up;b.onpointercancel=up;b.onlostpointercapture=up;
  });
  $('map-button').onclick=()=>this.map();$('map-close').onclick=$('map-resume').onclick=()=>this.resume();$('map-dialog').addEventListener('cancel',e=>{e.preventDefault();this.resume();});
  $('menu').onclick=()=>this.pause();$('close-dialog').onclick=()=>this.resume();$('dialog').addEventListener('cancel',e=>{e.preventDefault();this.resume();});$('sound').addEventListener('click',()=>this.clear(),true);
  addEventListener('keydown',e=>{
   if(e.code==='Escape'){e.preventDefault();if(this.soundControls.opened)this.soundControls.close();else if(this.paused)this.resume();else this.pause();return;}
   if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
   if(e.code==='KeyM'&&this.active&&!e.repeat){e.preventDefault();if($('map-dialog').open)this.resume();else this.map();return;}
   if(e.code==='KeyI'&&this.active&&!e.repeat){e.preventDefault();if(this.paused&&$('dialog').dataset.page==='kit')this.resume();else this.inventory();return;}
   if(!this.canPlay())return;
   if(['KeyA','KeyD','ArrowLeft','ArrowRight','Space','KeyW','ArrowUp','KeyS','ArrowDown','KeyJ','KeyK','KeyQ','KeyF','KeyE','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
   this.keys.add(e.code);if(e.repeat)return;
   if(['Space','KeyW','ArrowUp'].includes(e.code))this.queued.jump=true;
   if(['ShiftLeft','ShiftRight'].includes(e.code))this.queued.dash=true;
   if(e.code==='KeyE')this.queued.echo=true;if(e.code==='KeyK')this.queued.pulse=true;if(e.code==='KeyQ')this.queued.heal=true;
   if(e.code==='KeyF'){this.state.interact();this.events();}
  });
  addEventListener('keyup',e=>this.keys.delete(e.code));addEventListener('blur',()=>{this.clear();if(this.active&&!this.paused)this.pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.clear();this.save();if(this.active&&!this.paused)this.pause();}});addEventListener('pagehide',()=>this.save());addEventListener('storage',e=>{if(e.key===JOURNEY_KEY||e.key==='wanbu-reward-echo-collar')this.state.syncJourney(loadJourney());});addEventListener('pageshow',e=>{this.state.syncJourney(loadJourney());if(e.persisted&&loadJourney().labReturn){saveJourney({labReturn:false});this.returnedFromLab=true;this.toast(this.state.progress.echoCollar?'回声项圈已接入 · 返回水平连廊开启新路':'科技密室进度已保留，可随时继续探索');}});
 }
 held(action){return [...this.holds.values()].includes(action)||(this.tapUntil[action]||0)>performance.now();}
 input(){return{move:(this.keys.has('KeyD')||this.keys.has('ArrowRight')||this.held('right')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')||this.held('left')?1:0),echoPressed:!!this.queued.echo,jumpPressed:!!this.queued.jump,jumpHeld:this.keys.has('Space')||this.keys.has('KeyW')||this.keys.has('ArrowUp')||this.held('jump'),dashPressed:!!this.queued.dash,pulsePressed:!!this.queued.pulse,healPressed:!!this.queued.heal,attack:this.keys.has('KeyJ')||this.held('attack'),down:this.keys.has('KeyS')||this.keys.has('ArrowDown')};}
 save(){saveJourney(this.state.progress);try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.state.save()));}catch{this.toast('浏览器未允许保存；本次旅程仍可继续。');}}
 enterLab(){
  this.clear();this.paused=true;this.state.echo.clear();this.save();saveJourney({labReturn:true});location.href='./lab.html?from=metroid';
 }
 renderJourney(target){
  const p=this.state.progress;
  const steps=[['发现机关','水平连廊',p.relaySeen],['取得项圈','5F会议中心 · 科技密室',p.echoCollar],['回声开路','水平连廊 → 空中花园',p.relayOpen],['循环供能','空中花园',p.gardenOnline],['返回大堂','捷径闭环',p.loopComplete]];
  target.innerHTML='<div class="journey-heading"><span>10K CONNECTIVITY</span><b>回声环线</b></div><ol class="journey-steps">'+steps.map(([name,place,done],i)=>`<li class="${done?'done':''}"><span>${done?'✓':String(i+1).padStart(2,'0')}</span><div><b>${name}</b><small>${place}</small></div></li>`).join('')+'</ol>';
 }
 journey(){
  const p=this.state.progress;
  const text=!p.echoCollar?'先穿过水平连廊，在5F会议中心取得冲刺，进入同一展示台右侧的科技密室。找到 A N T A，点亮展厅并穿过光门，带着回声项圈回来。':!p.relayOpen?'先站在水平连廊右侧的 01 感应盘，按 E 记录；站定片刻再按 E 释放。回声会重演动作，最后停留 6 秒。让小步跳到左侧高台的 02 盘，同时站稳，开启中央花园光门。':!p.gardenOnline?'空中花园里，在较低的 01 感应盘留下回声，让小步跳上最高平台的 02 盘。同步后循环水与地面光路会启动，再去左侧升降台开启大堂捷径。':!p.loopComplete?'花园已经恢复供能。去最左侧升降台，按 F 开启捷径，再按 F 返回大堂，完成第一次探索环线。':'连廊、花园与大堂已相互连接。回声项圈可以在所有区域使用；继续探索二段跳、隐藏装备和室内篮球场的联动试炼。';
  this.modal('让发现，变成新的路。',text,[['继续探索',()=>this.resume(),true],['查看地图',()=>this.map()]]);
  const tracker=document.createElement('div');tracker.className='journey-card';this.renderJourney(tracker);$('dialog-body').insertBefore(tracker,$('dialog-body').lastElementChild);
 }
 refreshEcho(){
  const s=this.state,e=s.echo,p=s.progress,button=$('echo-button'),hud=$('echo-hud');
  button.classList.toggle('locked',!p.echoCollar);button.classList.toggle('recording',e.phase==='record');
  $('echo-action').textContent=e.phase==='record'?'释放回声':e.phase==='replay'?'重新记录':'足迹回声';
  button.setAttribute('aria-label',p.echoCollar?(e.phase==='record'?'释放回声':'记录足迹回声'):'回声项圈尚未获得');
  const relay=s.room.relay;hud.hidden=!this.active||this.paused||(!relay&&e.phase==='idle');
  $('echo-status').textContent=e.phase==='record'?`记录中 ${e.remaining.toFixed(1)}s · 再按 E 释放`:e.phase==='replay'?`回声 ${e.remaining.toFixed(1)}s · 本体前往另一盘`:!p.echoCollar?'密室奖励 · 全息回声项圈':relay&&p[relay.flag]?'同步完成 · 路线永久开启':'站在 01 盘 · E 记录 / 再按 E 释放';
  $('echo-progress').value=e.phase==='record'?(3-e.remaining)/3:e.phase==='replay'?e.remaining/(e.recorded+6):0;
  $('relay-status').hidden=!relay;
  if(relay){$('relay-title').textContent=relay.title;$('relay-progress').value=p[relay.flag]?1:s.relay.hold/relay.hold;document.querySelectorAll('[data-relay-pad]').forEach((el,i)=>{const on=p[relay.flag]||s.relay.active[i];el.classList.toggle('active',on);el.textContent=String(i+1).padStart(2,'0')+' '+(on?'已响应':'待同步');});}
 }
 toast(message){$('toast').textContent=message;$('toast').classList.add('show');this.toastTimer=5;}
 modal(title,text,actions){$('dialog').classList.remove('kit-dialog');$('dialog').dataset.page='';this.clear();this.paused=true;if($('map-dialog').open)$('map-dialog').close();$('dialog-body').replaceChildren();const h=document.createElement('h2');h.id='dialog-title';h.textContent=title;const p=document.createElement('p');p.textContent=text;$('dialog-body').append(h,p);const row=document.createElement('div');row.className='modal-actions';for(const [label,fn,primary]of actions){const b=document.createElement('button');b.textContent=label;if(primary)b.className='primary';b.onclick=fn;row.append(b);}$('dialog-body').append(row);if(!$('dialog').open)$('dialog').showModal();}
 pause(){if(!this.active)return;this.soundControls.close(false);this.modal('稍作休息','探索进度会保留。回到长椅休息可以恢复体力，并设定下一次返回的位置。',[
   ['继续探索',()=>this.resume(),true],['查看地图',()=>this.map()],['装备背包',()=>this.inventory()],['回声环线',()=>this.journey()],['操作说明',()=>this.help()],['重新开始',()=>this.confirmReset()]
  ]);const a=document.createElement('a');a.href='./portal.html';a.textContent='前往足迹穿梭实验室 ↗';a.style.display='inline-block';a.style.marginTop='26px';$('dialog-body').append(a);}
 help(){this.modal('小步的运动技巧','训练机橙色蓄力时准备闪避，出招后有短暂的反击窗口。空中冲刺每次落地恢复；空中按住 S 再按 J，下击命中可以回弹。', [['继续探索',()=>this.resume(),true]]);const d=document.createElement('div');d.className='control-guide';d.innerHTML='<span><kbd>A D</kbd>左右移动</span><span><kbd>空格</kbd>长按高跳</span><span><kbd>J</kbd>脉冲爪攻击</span><span><kbd>Shift</kbd>解锁后冲刺</span><span><kbd>F</kbd>休息 / 互动</span><span><kbd>K</kbd>远程脉冲</span><span><kbd>Q</kbd>40 能量修复 2 体力</span><span><kbd>I</kbd>背包 / 图鉴</span><span><kbd>M</kbd>地图 / 传送</span><span><kbd>E</kbd>记录 / 释放足迹回声</span>';$('dialog-body').insertBefore(d,$('dialog-body').lastElementChild);}
 confirmReset(){this.modal('重新开始这段探索？','将清除本次探索的地图、捷径与运动能力。科技密室的机关进度和已获得的回声项圈会保留。', [['保留进度',()=>this.pause(),true],['重新出发',()=>{this.state=new Expedition();this.state.syncJourney(resetJourneyRoute());this.healthKey='';this.lastRoom='';this.world.currentRoom=null;this.save();this.resume();this.toast('新的旅程开始了。向左探索水平连廊。');}]]);}
 resume(){if($('dialog').open)$('dialog').close();if($('map-dialog').open)$('map-dialog').close();this.clear();this.paused=false;this.world.canvas.focus();}
 map(){
  if(!this.active)return;this.soundControls.close(false);this.clear();this.paused=true;if($('dialog').open)$('dialog').close();const s=this.state;
  $('dialog').dataset.page='';
  $('map-progress').textContent=`已探索 ${s.visited.size} / ${Object.keys(ROOMS).length} 个区域 · 隐藏足迹 ${s.chips.size} / ${TOTAL_CHIPS}${s.progress.shortcut?' · 大堂捷径已开启':''}`;
  const coords=Object.fromEntries(Object.entries(ROOMS).map(([id,r])=>[id,[90+r.map[0]*160,55+r.map[1]*110]]));
  const known=id=>s.visited.has(id)||LINKS.some(([a,b])=>(a===id&&s.visited.has(b))||(b===id&&s.visited.has(a)));
  let svg='<svg viewBox="0 0 660 325" role="img" aria-label="九区域探索地图，青色为当前房间，虚线为未开启的能力门或捷径">';
  for(const [a,b]of LINKS){if(!known(a)||!known(b))continue;const[x1,y1]=coords[a],[x2,y2]=coords[b],shortcut=a==='hub'&&b==='garden',locked=a==='lab'&&b==='garden'?!s.progress.relayOpen:shortcut?!s.progress.shortcut:a==='hub'&&b==='atrium'?!s.progress.gate:b==='energy'?!s.progress.dash:b==='archive'?!s.progress.doubleJump:false;svg+=`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${locked?'#7a9994':'#91bbb1'}" stroke-width="${a==='lab'&&b==='garden'?3:shortcut?1.2:2}" ${locked?'stroke-dasharray="5 5"':''}/>`;}
  for(const [id,r]of Object.entries(ROOMS)){if(!known(id))continue;const[x,y]=coords[id],here=id===s.roomId,visited=s.visited.has(id);svg+=`<rect x="${x-63}" y="${y-27}" width="126" height="54" rx="4" fill="${here?'#bdeee4':visited?'#305851':'#183a3f'}" stroke="${here?'#e0fff0':'#658a80'}"/><text x="${x}" y="${y-2}" style="fill:${here?'#173d3f':'#e2f4e9'}">${visited?r.name:'未探索区域'}</text><text class="map-small" x="${x}" y="${y+16}" style="fill:${here?'#41685f':'#aec9bd'}">${here?'小步在这里':id==='lab'&&s.progress.relaySeen?(s.progress.relayOpen?'回声连廊 ✓':'回访 · 双点机关'):id==='core'?(s.progress.echoCollar?'科技密室 ✓':'密室 · 回声项圈'):id==='garden'&&s.progress.gardenOnline?'循环供能 ✓':s.rests.has(id)?'长椅 · 可休息':id==='archive'&&!s.progress.doubleJump?'需要二段跳':id==='energy'&&!s.progress.doubleJump?'奖励 · 二段跳':visited?'已探索':'发现新路线'}</text>`;}
  svg+='</svg>';$('map-content').innerHTML=svg;this.renderJourney($('map-journey'));$('map-fact').textContent=s.room.fact;
  const travel=$('map-travel');travel.replaceChildren();const hint=document.createElement('p');hint.textContent=s.nearby()?.type==='bench'?'长椅传送 · 选择已激活的恢复点':'靠近长椅时，可以在地图中传送到已激活的恢复点。';travel.append(hint);
  if(s.nearby()?.type==='bench')for(const id of s.rests){const button=document.createElement('button');button.textContent=ROOMS[id].name+(id===s.roomId?' · 当前位置':' ↗');button.disabled=id===s.roomId;button.onclick=()=>{if(s.travel(id)){this.events();this.resume();}};travel.append(button);}
  if(!$('map-dialog').open)$('map-dialog').showModal();$('map-content').scrollLeft=Math.max(0,(coords[s.roomId][0]-200));
 }
 inventory(tab='modules'){
  if(!this.active)return;this.soundControls.close(false);const s=this.state;
  this.modal('小步的探索背包','',[]);$('dialog').classList.add('kit-dialog');$('dialog').dataset.page='kit';const body=$('dialog-body');body.replaceChildren();
  const heading=document.createElement('div');heading.className='kit-heading';heading.innerHTML='<span>ANTA CENTRE / FIELD KIT</span><h2 id="dialog-title">探索背包</h2><p>带上适合自己的装备，走得更远。</p>';body.append(heading);
  const tabs=document.createElement('div');tabs.className='kit-tabs';tabs.setAttribute('role','tablist');for(const [id,label] of [['modules','试验模块'],['guide','训练图鉴']]){const b=document.createElement('button');b.textContent=label;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(tab===id));b.onclick=()=>this.inventory(id);tabs.append(b);}body.append(tabs);
  const layout=document.createElement('div');layout.className='kit-layout';body.append(layout);
  const status=document.createElement('aside');status.className='kit-status';status.innerHTML=`<img src="./assets/sports-energy-paw.png" alt=""><h3>小步</h3><p>上海中心探索员</p><dl><div><dt>体力</dt><dd>${s.player.hp} / ${s.maxHP}</dd></div><div><dt>能量</dt><dd>${Math.floor(s.energy)} / 100</dd></div><div><dt>地面速度</dt><dd>${s.speed.toFixed(1)} m/s</dd></div><div><dt>远程耗能</dt><dd>${s.pulseCost}</dd></div></dl><div class="ability-list"><div class="ability-chip ${s.progress.dash?'earned':''}">脉冲冲刺 ${s.progress.dash?'✓':'待解锁'}</div><div class="ability-chip ${s.progress.doubleJump?'earned':''}">回弹二段跳 ${s.progress.doubleJump?'✓':'待解锁'}</div><div class="ability-chip ${s.progress.echoCollar?'earned':''}">回声项圈 ${s.progress.echoCollar?'✓ · E':'科技密室解锁'}</div></div>`;layout.append(status);
  const list=document.createElement('div');list.className='kit-list';layout.append(list);
  if(tab==='modules'){
   const caption=document.createElement('p');caption.className='kit-caption';caption.textContent='试验插槽 · 一次装备一个模块，即刻生效';list.append(caption);
   for(const [id,m] of Object.entries(MODULES)){
    const owned=s.modules.has(id),equipped=s.equipment===id,card=document.createElement('article');card.className='module-card'+(equipped?' equipped':'')+(!owned?' undiscovered':'');
    card.innerHTML=`<div class="module-mark" style="--module-color:${m.color}">${m.mark}</div><div class="module-copy"><h3>${owned?m.name:'未发现模块'}</h3><strong>${owned?m.effect:m.source}</strong><p>${owned?m.description:'探索这条支路，找到新的装备。'}</p></div>`;
    const button=document.createElement('button');button.textContent=equipped?'卸下':owned?'装备':'待探索';button.disabled=!owned;button.setAttribute('aria-label',equipped?'卸下'+m.name:owned?'装备'+m.name:'尚未发现'+m.name);button.onclick=()=>{s.equip(equipped?null:id);this.events();this.audio.cue('ui');this.inventory();const buttons=[...$('dialog').querySelectorAll('.module-card button')];buttons[Object.keys(MODULES).indexOf(id)].focus();};card.append(button);list.append(card);
   }
  }else{
   for(const [id,e] of Object.entries(ENEMIES)){const seen=s.encounters.has(id),card=document.createElement('article');card.className='guide-card';card.innerHTML=`<span>${id==='shield'?'◇':id==='sentry'?'◎':'››'}</span><div><h3>${seen?e.name:'未遇见的训练机'}</h3><p>${seen?e.tip:'继续探索，遇见后自动记录观察笔记。'}</p></div>`;list.append(card);}
   const tip=document.createElement('p');tip.className='kit-caption';tip.textContent='近战每次命中回收 12 能量；击败训练机额外回收 8。Q 消耗 40 能量修复 2 点体力，冷却 4 秒。';list.append(tip);
  }
  const footer=document.createElement('footer');footer.className='kit-footer';footer.innerHTML=`<span>${s.visited.size} / ${Object.keys(ROOMS).length} 区域 · ${s.chips.size} / ${TOTAL_CHIPS} 足迹 · ${s.modules.size} / 3 模块</span>`;const close=document.createElement('button');close.className='primary';close.textContent='返回冒险';close.onclick=()=>this.resume();footer.append(close);body.append(footer);
 }
 events(){
  for(const e of this.state.drain()){
   if(e.type==='save')this.save();
   else if(e.type==='enter-lab')this.enterLab();
   else if(e.type==='echo-record'){this.audio.ui();this.toast('记录中 · 最多 3 秒 · 再按 E 释放回声');}
   else if(e.type==='echo-replay'){this.audio.gate();this.world.burst(this.state.player.x,this.state.player.y+1);this.toast('回声会在终点停留 6 秒 · 小步去另一盘同步');}
   else if(e.type==='relay-discovered')this.toast('发现双感应机关 · 已标记地图 · 先到5F会议中心寻找回声项圈');
   else if(e.type==='relay-help')this.journey();
   else if(e.type==='relay-open'){this.audio.success();this.world.burst(17,2);this.toast('双点同步成功！中央光门已开启 · F 前往空中花园');}
   else if(e.type==='garden-online'){this.audio.success();this.world.burst(28,6);this.toast('花园已供能 · 左侧大堂捷径可以开启了');}
   else if(e.type==='loop-complete'){this.audio.complete();this.modal('万步联动 · 第一条环线完成','你把密室中的发现，带回了连廊与花园。回声协作开启新路，循环装置为捷径供能，现在可以从大堂自由往返。前往室内篮球场，继续完成联动试炼。',[['继续探索',()=>this.resume(),true],['查看已连通的路线',()=>this.map()]]);}
   else if(e.type==='jump')this.audio.jump();else if(e.type==='land')this.audio.land(e.impact);
   else if(e.type==='dash')this.audio.dash();else if(e.type==='attack')this.audio.cue('throw');
   else if(e.type==='double-jump'){this.audio.jump();this.world.burst(e.x,e.y,0xb4f3ae);}
   else if(e.type==='pulse')this.audio.cue('throw');
   else if(e.type==='heal'){this.audio.success();this.world.burst(this.state.player.x,this.state.player.y+1,0xa9f4ad);this.toast('修复 +2 体力 · 消耗 40 能量');}
   else if(e.type==='blocked'){this.audio.cue('bounce');this.world.burst(e.x,e.y,0xffba6e);this.toast('护盾挡住了正面攻击 · 绕后，或空中 S + J 下击');}
   else if(e.type==='trial-start'){this.audio.cue('whistle');this.toast('训练区已封闭 · 完成全部训练机测试后开启');}
   else if(e.type==='trial-complete'){this.audio.success();this.toast('试炼完成 · 体力与能量已恢复 · 去右端领取奖励');}
   else if(e.type==='wall-broken'){this.audio.gate();this.toast('发现隐藏空间！前往右侧开启展柜。');}
   else if(e.type==='travel'){this.audio.gate();this.toast('长椅传送完成 · 按 F 可在这里恢复并存档');}
   else if(e.type==='module'){this.audio.success();this.modal('获得「'+MODULES[e.id].name+'」',MODULES[e.id].description,[['打开背包装备',()=>this.inventory(),true],['继续探索',()=>this.resume()]]);}
   else if(e.type==='ability-jump'){this.audio.success();this.modal('获得「回弹二段跳」','在空中松开并再次按空格，完成第二次跳跃。返回水平连廊左侧，登上原本够不到的五米高台，进入1楼电梯厅。',[['探索新的高度',()=>this.resume(),true]]);}
   else if(e.type==='hit'){this.audio.cue('bounce');this.world.burst(e.x,e.y);}
   else if(e.type==='defeat'){this.audio.collect();this.world.burst(e.x,e.y+1,0xffd299);}
   else if(e.type==='collect'){this.audio.collect();this.world.burst(e.x,e.y);}
   else if(e.type==='hurt'){this.audio.fail();$('damage-flash').classList.add('on');this.flashTimer=.2;}
   else if(e.type==='death')this.toast('小步需要休息一下……正在返回恢复点。');
   else if(e.type==='respawn')this.toast('已回到恢复点。能力、捷径和已收集的足迹都已保留。');
   else if(e.type==='room'){$('room-flash').classList.add('on');setTimeout(()=>$('room-flash').classList.remove('on'),180);this.clear();}
   else if(e.type==='locked')this.toast(e.message);
   else if(e.type==='rest'){this.audio.success();this.toast('体力已恢复 · 这里已设为恢复点 · 进度已保存');}
   else if(e.type==='note')this.modal(e.title,e.text,[['继续探索',()=>this.resume(),true]]);
   else if(e.type==='ability'){this.audio.success();this.modal('获得「脉冲冲刺」','按 Shift 向前冲刺，短暂穿过训练攻击。K 可发射远程脉冲，J 命中可回能。同一展示台右侧是 ANTA 科技密室入口。进入密室寻找四枚字母，获得回声项圈，再返回水平连廊开启新路。',[['带着新能力出发',()=>this.resume(),true]]);}
   else if(e.type==='gate'){this.audio.gate();this.toast('光幕已穿越 · 垂直中庭路线开启');}
   else if(e.type==='shortcut'){this.audio.gate();this.toast('大堂捷径已开启！再次按 F，可直接返回大堂。');}
   else if(e.type==='heart'){this.audio.success();this.toast('发现花园奖励 · 最大体力永久 +1');}
   else if(e.type==='boss-start'){this.audio.cue('whistle');this.toast('联动守卫启动 · 橙色预警后闪避，停顿时反击');}
   else if(e.type==='wave'||e.type==='slam')this.audio.cue('bounce');
   else if(e.type==='boss-defeated'){this.audio.success();this.toast('联动试炼完成！走近右侧信标，按 F 点亮。');}
   else if(e.type==='complete'){this.audio.complete();this.modal('让每一步，连接更大的世界。',`全球联动信标已点亮。你已探索 ${this.state.visited.size} 个区域，收集 ${this.state.chips.size} / ${TOTAL_CHIPS} 枚隐藏足迹。研发带来新能力，连廊打开新路线，花园为下一次出发恢复能量。`,[['继续自由探索',()=>this.resume(),true],['查看探索地图',()=>this.map()]]);}
  }
 }
 refresh(){
  const s=this.state,p=s.player,key=p.hp+':'+s.maxHP;if(key!==this.healthKey){this.healthKey=key;$('health').innerHTML=Array.from({length:s.maxHP},(_,i)=>`<svg viewBox="0 0 24 24" class="${i>=p.hp?'empty':''}" aria-hidden="true">${heart}</svg>`).join('');$('health').setAttribute('aria-label',`体力 ${p.hp} / ${s.maxHP}`);}
  if(this.lastRoom!==s.roomId){this.lastRoom=s.roomId;$('room-name').textContent=s.room.name;$('room-subtitle').textContent=s.room.subtitle;}
  $('objective').textContent=s.objective();$('sample-count').textContent=`足迹 ${s.chips.size} / ${TOTAL_CHIPS}`;$('ability-label').textContent=s.progress.dash?(p.dashCooldown>0?'冲刺 · 冷却中':'冲刺 · 已就绪'):'冲刺 · 尚未解锁';$('dash').classList.toggle('locked',!s.progress.dash);$('dash').setAttribute('aria-label',s.progress.dash?'脉冲冲刺':'冲刺尚未解锁，前往5F会议中心取得');
  $('energy').value=s.energy;$('energy-value').textContent=Math.floor(s.energy);$('pulse').classList.toggle('locked',!s.progress.dash||s.energy<s.pulseCost);$('pulse').title=`消耗 ${s.pulseCost} 能量`;$('heal').classList.toggle('locked',s.energy<40||p.hp>=s.maxHP||p.healCooldown>0);$('heal').title='消耗 40 能量恢复 2 体力';
  this.refreshEcho();const item=s.nearby();$('interact').hidden=!item||this.paused;if(item){let label=item.label;if(item.type==='shortcut'&&s.progress.shortcut)label='乘捷径返回大堂';if(item.type==='ability'&&s.progress.dash)label='查看冲刺模块';if(item.type==='echo-route'&&s.progress.relayOpen)label='穿过回声连廊 · 前往空中花园';if(item.type==='shortcut'&&!s.progress.shortcut&&s.progress.gardenOnline)label='开启返回大堂的捷径';$('interact').querySelector('span').textContent=label;}
  const b=s.boss;$('boss-hud').hidden=!b?.active||b.hp<=0;if(b){$('boss-health').value=b.hp;$('boss-state').textContent=b.state==='charge'?'蓄力预警':b.state==='recover'?'反击时机':b.state==='leap'?'注意落点':b.state==='rush'?'冲撞':'跃过光环';}
 }
 update(dt){
  if(this.canPlay()){this.state.update(dt,this.input());this.saveClock+=dt;if(this.saveClock>4){this.saveClock=0;this.save();}this.queued={};this.events();if(this.state.player.grounded&&Math.abs(this.state.player.vx)>1)this.audio.step(this.state.time,false,true);}else this.clear();
  if(this.toastTimer>0){this.toastTimer-=dt;if(this.toastTimer<=0)$('toast').classList.remove('show');}if(this.flashTimer>0){this.flashTimer-=dt;if(this.flashTimer<=0)$('damage-flash').classList.remove('on');}
  this.audio.setState(this.paused||!this.active,document.hidden);this.audio.chapter=this.state.boss?.active?2:this.state.progress.dash?1:0;this.refresh();this.world.updateExpedition(this.paused?0:dt,this.state);
 }
}
try{
 const world=new MetroidWorld($('world'));await world.load(p=>{$('loading').textContent=`正在载入上海中心与小步 ${Math.round(p*100)}%`;});const game=new MetroidGame(world);window.__metroid={game,world,get state(){return game.state;},ready:true};world.updateExpedition(0,game.state);let last=performance.now();
 const frame=now=>{const dt=Math.min(.06,(now-last)/1000);last=now;game.update(dt);requestAnimationFrame(frame);};requestAnimationFrame(frame);
}catch(error){console.error(error);$('error').hidden=false;$('error-message').textContent=error.message||'请刷新页面再试一次。';}
