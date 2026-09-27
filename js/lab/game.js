import {AdventureSession} from '../adventure/session.js';
import {CAMPUS_SAVE,CAMPUS_LAB_SAVE,labUnlocked} from '../campus/campaign.js';
import * as THREE from 'three';
import {saveJourney} from '../journey.js';
import {LabWorld} from './world.js';
import {PixelCorgi} from '../character.js';
import {AudioEngine} from '../audio.js';
import {SoundControls} from '../sound-controls.js';
import {LabState,SAVE,STATIONS,IDS,LETTERS,CLUES} from './state.js';
const $=id=>document.getElementById(id),V=THREE.Vector3;
export class LabGame{
 constructor(world,corgi,audio){
  this.session=new AdventureSession('lab',SAVE);this.world=world;this.audio=audio;this.campus=this.session.campus;let campaign=null;if(this.campus)try{campaign=JSON.parse(localStorage.getItem(CAMPUS_SAVE));}catch{}
  this.campaignId=campaign?.runId;this.lockedCampaign=this.session.locked;this.saveKey=this.session.key;this.returnURL=this.campus?this.session.returnURL:'./metroid.html?from=lab';
  let raw={};try{raw=JSON.parse(localStorage.getItem(this.saveKey)||'{}');if(this.campus&&raw?.campaign!==this.campaignId)raw={};if(!raw||typeof raw!=='object')raw={};}catch{}this.state=new LabState(raw);if(this.state.completed&&!this.campus)saveJourney({echoCollar:true});
  this.player=new PixelCorgi(world,corgi);this.player.sprite.scale.set(2.8,2.8,1);this.pos=new V(0,0,3.6);this.direction=new V(1,0,1);this.keys=new Set();this.holds=new Map();this.joy=new THREE.Vector2();this.path=[];this.active=false;this.paused=false;this.detail=null;this.runtime={echoTime:0,echoHold:0,testTime:0,testRunning:false,bridgeProgress:0,bridgeRunning:false,scanTime:0,igniting:false};this.message='';this.ui={pause:()=>this.menu()};this.saveTimer=0;this.toastTimer=0;
  this.soundControls=new SoundControls(audio,this);const open=this.soundControls.open.bind(this.soundControls),close=this.soundControls.close.bind(this.soundControls);this.soundControls.open=()=>{this.clearInput();open();};this.soundControls.close=(f)=>{close(f);this.clearInput();};
  this.bind();this.inventory();this.makeHotspots();if(this.campus){const home=document.querySelector('.topbar a');if(home){home.href=this.returnURL;home.setAttribute('aria-label','返回回声开路主线');}document.querySelector('#intro a[href="./portal.html"]')?.remove();}const returnLink=document.createElement('a');returnLink.href=this.returnURL;returnLink.className='secondary';returnLink.textContent=this.campus?'返回回声开路主线 →':'返回主世界 · 连廊之心 →';returnLink.style.marginTop='14px';$('start').parentElement.append(returnLink);$('start').disabled=false;$('start').textContent=this.state.completed?'重访科技展厅 →':this.state.solved.size?'继续探索 →':'进入科技展厅 →';$('loading').textContent=this.campus?'主线密室 · 找齐 A N T A 后走出光门，带回回声项圈':'展厅已就绪 · 可自由选择探索顺序';if(this.lockedCampaign){$('start').disabled=true;$('loading').textContent='先返回主线，收集三个运动信号并启动研发展台。';}this.session.mount();
 }
 bind(){
  $('skip-lighting').onclick=()=>this.state.skipIllumination();$('start').onclick=()=>this.start();$('menu').onclick=()=>this.menu();$('back').onclick=()=>this.back();$('sniff').onclick=()=>this.sniff();$('clue-point').onclick=()=>this.discover();$('letter-point').onclick=()=>this.take();$('next-area').onclick=()=>this.enter('door');$('interact').onclick=()=>this.interact();$('hint').onclick=()=>this.hint();$('reset-puzzle').onclick=()=>this.resetPuzzle();$('close-dialog').onclick=()=>this.closeDialog();$('dialog').addEventListener('cancel',e=>{e.preventDefault();this.closeDialog();});
  addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='Escape'){e.preventDefault();if(this.soundControls.opened)this.soundControls.close();else if($('dialog').open)this.closeDialog();else if(this.detail)this.back();else this.menu();return;}
   if(!this.active||this.paused||this.runtime.igniting)return;if(e.code==='KeyF'&&!e.repeat){e.preventDefault();this.interact();return;}if(!this.detail&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);this.path=[];this.afterWalk=null;}});
  addEventListener('keyup',e=>this.keys.delete(e.code));addEventListener('blur',()=>{this.clearInput();if(this.active&&!this.paused)this.menu();});document.addEventListener('visibilitychange',()=>{this.clearInput();if(document.hidden&&this.active)this.save();});
  document.querySelectorAll('[data-move]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();if(this.paused||!this.active||this.detail||this.runtime.igniting)return;b.setPointerCapture(e.pointerId);this.holds.set(e.pointerId,b.dataset.move);this.path=[];this.afterWalk=null;};b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>this.holds.delete(e.pointerId);});
  let down=null;this.world.canvas.onpointerdown=e=>{down={x:e.clientX,y:e.clientY};};this.world.canvas.onpointerup=e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>9)return;down=null;if(!this.active||this.paused||this.runtime.igniting||this.world.transition)return;
   const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),this.world.camera);
   if(this.detail){const id=this.detail;if(id==='door')return;if(!this.state.released.has(id)&&this.world.secretHit(ray,id))this.discover();else if(ray.intersectObject(this.world.letters[id],true).length)this.take();return;}
   const hits=ray.intersectObjects([...Object.values(this.world.objects),this.world.exit],true);if(hits.length){const mesh=hits[0].object;for(const s of STATIONS){let o=mesh;while(o){if(o===this.world.objects[s.id]){this.goStation(s.id);return;}o=o.parent;}}let o=mesh;while(o){if(o===this.world.exit){this.enter('door');return;}o=o.parent;}}
   const p=this.world.floorAt(e.clientX,e.clientY);if(p)this.walkTo(p);
  };
  this.world.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.save();this.paused=true;$('error-message').textContent='图形显示中断，刷新即可恢复已收集的字母。';$('load-error').hidden=false;});
 }
 clearInput(){this.keys.clear();this.holds.clear();this.joy.set(0,0);}
 start(){if(!this.session.valid())return;this.active=true;this.paused=false;document.body.classList.add('playing');$('intro').hidden=true;$('room-hud').hidden=false;$('hotspots').hidden=false;this.audio.start();this.audio.setChapter(2);this.world.canvas.focus();this.toast('先找一处呼吸的光点。点击展台走近，再点击微光打开暗格。');if(this.state.collected.size===4&&!this.state.inserted)this.insert();else if(this.state.completed)this.toast('回声项圈已获得，欢迎回来探索。');}
 save(){try{if(!this.session.save(this.state.snapshot()))throw new Error('save unavailable');}catch{if(!this.storageWarned){this.storageWarned=true;this.toast('浏览器暂时无法保存，请保持当前页面继续探索。');}}}
 inventory(){
  $('inventory').innerHTML=STATIONS.map(s=>`<span class="${this.state.collected.has(s.id)?'found':''}" aria-label="${s.name}字母 ${LETTERS[s.id]}，${this.state.collected.has(s.id)?'已收集':'未收集'}">${LETTERS[s.id]}</span>`).join('');$('count').textContent=`${this.state.collected.size} / 4`;
  $('objective').textContent=this.state.illuminated?'展厅已点亮 · 带小步走进光门。':this.state.inserted?'ANTA 联动启动 · 四条光路正在汇合。':'找出四处呼吸微光，打开暗格，收集 A / N / T / A。';
 }
 makeHotspots(){const container=$('hotspots');container.innerHTML='';for(const s of [...STATIONS,{id:'door',name:'ANTA 出口'}]){const b=document.createElement('button');b.className='hotspot';b.dataset.station=s.id;b.innerHTML=`<em>${s.id==='door'?'◇':'✧'}</em>${s.name} ›`;b.onclick=()=>s.id==='door'?this.enter('door'):this.goStation(s.id);container.append(b);}}
 nearest(){const remaining=STATIONS.filter(s=>!this.state.collected.has(s.id));return (remaining.length?remaining:STATIONS).slice().sort((a,b)=>Math.hypot(a.x-this.pos.x,a.z-this.pos.z)-Math.hypot(b.x-this.pos.x,b.z-this.pos.z))[0];}
 sniff(){if(!this.active||this.paused||this.runtime.igniting||this.world.transition)return;if(this.state.collected.size===4){this.enter('door');return;}const s=this.detail?STATIONS.find(s=>s.id===this.detail):this.nearest();if(!s)return;this.runtime.scanTime=7;this.runtime.sniffId=s.id;this.audio.ui();this.toast(CLUES[s.id].hint);if(this.detail){this.message=CLUES[s.id].hint;this.renderDetail();}else this.world.guideTo(s.id);}
 interact(){if(this.paused||!this.active||this.runtime.igniting||this.runtime.collectTime>0||this.world.transition)return;if(this.detail){if(this.detail==='door'){this.act(this.state.inserted?'exit':'insert');return;}if(!this.state.released.has(this.detail))this.discover();else this.take();return;}if(this.pos.z< -5.3&&Math.abs(this.pos.x)<3.3)this.enter('door');else this.goStation(this.nearest().id);}

 walkable(x,z){if(x< -11.7||x>11.7||z>9.2||z<(this.state.door===1&&Math.abs(x)<1.8?-10.5:-7.6))return false;for(const s of STATIONS){const dx=x-s.x,dz=z-s.z;if(Math.abs(dx)<2.92&&Math.abs(dz)<2.35)return false;}return true;}
 walkTo(target,done){
  // Small grid path search makes point-and-click walk around exhibits instead of into them.
  const step=.55,toCell=p=>[Math.round(p.x/step),Math.round(p.z/step)],key=(x,z)=>x+','+z;const start=toCell(this.pos),raw=toCell(target);let goal=null,dist=Infinity;
  for(let x=-21;x<=21;x++)for(let z=-19;z<=16;z++)if(this.walkable(x*step,z*step)){const d=(x-raw[0])**2+(z-raw[1])**2;if(d<dist){dist=d;goal=[x,z];}}
  if(!goal)return;const queue=[start],came=new Map([[key(...start),null]]);let found=null;
  for(let i=0;i<queue.length;i++){const p=queue[i];if(p[0]===goal[0]&&p[1]===goal[1]){found=p;break;}for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+dx,p[1]+dz],k=key(...n);if(!came.has(k)&&this.walkable(n[0]*step,n[1]*step)){came.set(k,p);queue.push(n);}}}
  this.path=[];if(found){let p=found;while(p&&key(...p)!==key(...start)){this.path.unshift(new V(p[0]*step,0,p[1]*step));p=came.get(key(...p));}if(this.walkable(target.x,target.z))this.path.push(target.clone().setY(0));this.afterWalk=done;}else this.toast('从中央通道绕到展台前方。');
 }
 goStation(id){if(this.paused||!this.active||this.runtime.igniting)return;const s=STATIONS.find(s=>s.id===id);this.clearInput();this.walkTo(new V(s.x,0,s.z+3.25),()=>this.enter(id));this.toast('小步正在走向'+s.name);}
 enter(id){if(!this.active||this.paused||this.runtime.igniting||this.world.transition)return;this.path=[];this.afterWalk=null;this.clearInput();this.detail=id;this.world.inspectView='front';this.runtime.scanTime=0;this.runtime.sniffId=null;document.body.classList.add('in-detail');$('detail').hidden=false;this.world.savedCamera={position:this.world.camera.position.clone(),target:this.world.lookAt.clone(),height:this.world.viewHeight};this.world.frame(id);this.audio.ui();this.message='';this.renderDetail();$('back').focus();}
 back(){if(!this.detail)return;this.clearInput();this.detail=null;document.body.classList.remove('in-detail');$('detail').hidden=true;this.world.frame(null);if(this.world.savedCamera){this.world.goalPos.copy(this.world.savedCamera.position);this.world.goalTarget.copy(this.world.savedCamera.target);this.world.goalHeight=this.world.savedCamera.height;}this.runtime.testRunning=false;this.runtime.bridgeRunning=false;this.runtime.bridgeProgress=0;this.runtime.scanTime=0;this.world.canvas.focus();this.save();}
 renderDetail(){
  const id=this.detail;if(!id)return;const st=this.state,s=STATIONS.find(s=>s.id===id),clue=CLUES[id],found=st.released.has(id),taken=st.collected.has(id);
  $('detail-sub').textContent=id==='door'?'THE NEXT CHAPTER':s.sub;$('detail-title').textContent=id==='door'?'四枚字母，一扇光门':found?clue.name:s.name;
  $('detail-tip').textContent=id==='door'?'集齐四枚 ANTA，光门就会开启下一段旅程。':taken?'这处微光已经化作你的足迹。':found?'暗格正在展开，待字母升起后点击收集。':'在器物边缘找一束呼吸的微光，点击它。';
  $('source-text').textContent=s?.source||'万步联动：让每一次发现，连接新的空间。';$('hint').hidden=id==='door'||taken;$('reset-puzzle').hidden=true;$('inspection-controls').replaceChildren();
  $('hint-text').textContent=this.runtime.sniffId===id&&this.runtime.scanTime>0?clue.hint:'';
  $('inspection-phase').hidden=id==='door';$('inspection-phase').innerHTML=id==='door'?'':['发现微光','展开暗格','收集字母'].map((label,i)=>`<span class="${[st.discovered.has(id),st.cabinets[id]>=1,taken][i]?'complete':''}">${i+1} · ${label}</span>`).join('');
  let html='';
  if(id==='door')html=st.inserted?'<p>ANTA 已归位。走进光门，前往下一个地方。</p><button class="primary" data-action="exit">走进光门 →</button>':`<p>已找到 ${st.collected.size} / 4 枚。两枚 A 来自不同的暗格。</p><button class="primary" data-action="insert" ${st.collected.size<4?'disabled':''}>嵌入 ANTA · 开启光门</button><button class="secondary" data-action="back">继续寻找微光</button>`;
  else if(taken)html='<div class="clue-complete">✓ 字母已收入背包</div><button class="primary" data-action="back">寻找下一处微光 →</button>';
  else if(found)html=`<button class="primary" data-action="collect" ${st.cabinets[id]<1?'disabled':''}>${st.cabinets[id]<1?'暗格正在打开…':'收集字母 '+LETTERS[id]+'  ·  F'}</button>`;
  else html='<p class="clue-instruction"><span>✧</span> 画面中亮起的小物件，就是线索。<br>点微光，或按 F 唤醒它。</p>';
  $('puzzle-controls').innerHTML=html;$('puzzle-controls').querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>this.act(b.dataset.action));
  this.status();
 }
 act(action){if(this.paused||this.runtime.igniting||this.runtime.collectTime>0||this.world.transition)return;
  if(action==='back')this.back();else if(action==='collect')this.take();else if(action==='insert')this.insert();else if(action==='exit'){if(this.state.door<1){this.toast('光门正在滑开，请稍等。');return;}this.back();this.walkTo(new V(0,0,-10),()=>this.finish());}
 }
 discover(){const id=this.detail;if(!CLUES[id]||this.world.transition||this.paused||this.runtime.igniting||this.runtime.collectTime>0)return;
  if(this.state.awaken(id)){this.audio.gate();this.message='微光回应了你，暗格正在展开。';this.runtime.sniffId=null;this.runtime.scanTime=0;this.world.inspect('cache');this.save();this.renderDetail();this.toast(CLUES[id].action);}
 }
 take(){if(this.paused||this.runtime.igniting||this.world.transition||this.runtime.collectTime>0)return;const id=this.detail;if(this.state.collect(id)){
  this.audio.collect();this.flyLetter(id);this.runtime.collectTime=.8;this.toast('找到 '+LETTERS[id]+' · '+this.state.collected.size+' / 4');this.save();this.inventory();this.renderDetail();
 }}
 flyLetter(id){const point=this.world.project(this.world.letters[id].getWorldPosition(new V())),slot=$('inventory').children[IDS.indexOf(id)].getBoundingClientRect(),letter=document.createElement('span');letter.className='flying-letter';letter.textContent=LETTERS[id];document.body.append(letter);const animation=letter.animate([{left:point.x+'px',top:point.y+'px',transform:'translate(-50%,-50%) scale(1)'},{left:slot.x+slot.width/2+'px',top:slot.y+slot.height/2+'px',transform:'translate(-50%,-50%) scale(.48)'}],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?120:720,easing:'cubic-bezier(.2,.7,.25,1)',fill:'forwards'});animation.onfinish=()=>letter.remove();}
 insert(){if(this.state.insert())this.ignite();}
 ignite(){this.back();this.clearInput();this.path=[];this.afterWalk=null;this.runtime.igniting=true;this.runtime.echoTime=0;this.world.frame(null);this.audio.gate();this.save();this.inventory();$('illumination').hidden=false;document.body.classList.add('igniting');$('toast').classList.remove('show');this.toastTimer=0;}
 hint(){this.sniff();}
 resetPuzzle(){}
 status(){
  const st=this.state,id=this.detail,blocked=!this.active||this.paused||this.runtime.igniting||this.world.transition>0||this.runtime.collectTime>0;
  $('next-area').hidden=!st.illuminated||!!id||this.runtime.igniting;$('sniff').hidden=st.illuminated;
  $('clue-point').hidden=blocked||!CLUES[id]||st.released.has(id);$('letter-point').hidden=blocked||!CLUES[id]||!st.released.has(id)||st.cabinets[id]<1||st.collected.has(id);
  if(CLUES[id]){const b=st.released.has(id)?$('letter-point'):$('clue-point');b.setAttribute('aria-label',st.released.has(id)?'收集字母 '+LETTERS[id]:CLUES[id].action);const target=st.released.has(id)?this.world.letters[id]:this.world.secretTargets[id];const point=this.world.project(target.getWorldPosition(new V()));b.style.left=point.x+'px';b.style.top=point.y+'px';$('letter-point').textContent='';}
  if(!id)return;let text=this.message;if(CLUES[id]){$('inspection-phase').querySelectorAll('span').forEach((span,i)=>span.classList.toggle('complete',[st.discovered.has(id),st.cabinets[id]>=1,st.collected.has(id)][i]));if(st.released.has(id)&&st.cabinets[id]>=1&&!st.collected.has(id))$('detail-tip').textContent='暗格已展开。点击悬浮字母，把它收入 ANTA 背包。';}
  if(id!=='door'){if(st.collected.has(id))text='✓ 字母已保存，继续寻找下一处微光。';else if(st.released.has(id)){text=st.cabinets[id]<1?'听，锁扣松开了。等待暗格完全展开…':'字母出现了！点击发光字母，或按 F 收集。';const b=$('puzzle-controls').querySelector('[data-action="collect"]');if(b&&st.cabinets[id]>=1){b.disabled=false;b.textContent='收集字母 '+LETTERS[id]+'  ·  F';}}else text='先点击画面中的呼吸微光。需要帮助时，点「嗅闻提示」。';}
  if($('puzzle-status').textContent!==text)$('puzzle-status').textContent=text;
 }
 toast(t){$('toast').textContent=t;$('toast').classList.add('show');this.toastTimer=3.8;}
 menu(){if(!this.active)return;if($('dialog').open){this.closeDialog();return;}this.clearInput();this.paused=true;$('dialog-body').innerHTML=`<h2>让灵感歇一会。</h2><p>进度已自动保存。WASD / 方向键移动，点击地面行走；点击展台探索，Esc 返回。在器物边缘找呼吸微光，点击后暗格会展开；点击浮起的字母收集。嗅闻会指向未找到的线索。集齐四枚，光门自动开启。</p><button id="resume" class="primary">继续探索 →</button><a id="return-to-world" class="secondary" href="./metroid.html?from=lab">返回主世界 · 5F会议中心 →</a><button id="dof-toggle" class="secondary">${this.world.dof.enabled?'关闭':'开启'}景深</button><a class="secondary" href="./portal.html">试玩 · 足迹穿梭 →</a><a class="secondary" href="./relay.html">第三关 · 全楼开赛 →</a><a class="secondary" href="./index.html">返回运动闯关</a>${this.state.illuminated?'<button id="replay-lighting" class="secondary">重看全厅点亮</button>':''}<button id="replay-lab" class="secondary">重新挑战本关</button>`;this.campaignLinks();$('dialog').showModal();$('resume').onclick=()=>this.closeDialog();$('dof-toggle').onclick=()=>{this.world.dof.enabled=!this.world.dof.enabled;localStorage.setItem('wanbu-dof',this.world.dof.enabled?'on':'off');$('dof-toggle').textContent=(this.world.dof.enabled?'关闭':'开启')+'景深';};$('replay-lab').onclick=()=>this.confirmReplay();if($('replay-lighting'))$('replay-lighting').onclick=()=>{this.closeDialog();this.state.lightingTime=0;this.state.door=0;this.ignite();};this.save();}
 campaignLinks(){if(!this.campus)return;for(const link of $('dialog-body').querySelectorAll('a[href]'))if(['./portal.html','./relay.html','./index.html','./explore.html'].includes(link.getAttribute('href')))link.remove();for(const link of $('dialog-body').querySelectorAll('#return-to-world')){link.href=this.returnURL;link.textContent=this.state.completed?'带着回声项圈返回主线 →':'返回主线 · 研发终端 →';}this.session.decorate($('dialog-body'),this.state.completed);}
 confirmReplay(){$('dialog-body').innerHTML='<h2>重新挑战科技密室？</h2><p>本关的字母与机关将复位。运动关记录和已经获得的回声项圈保留。</p><button id="reset-confirm" class="primary">重新开始本关</button><button id="reset-cancel" class="secondary">保留进度</button>';$('reset-cancel').onclick=()=>this.closeDialog();$('reset-confirm').onclick=()=>{this.state=new LabState();this.pos.set(0,0,6);this.path=[];this.runtime={echoTime:0,echoHold:0,testTime:0,testRunning:false,bridgeProgress:0,bridgeRunning:false,scanTime:0,igniting:false};document.body.classList.remove('igniting');$('illumination').hidden=true;this.save();this.inventory();this.closeDialog();this.back();};}
 closeDialog(){if(!$('dialog').open)return;$('dialog').close();this.paused=false;this.clearInput();this.world.canvas.focus();}
 finish(){if(!this.state.completed&&!this.state.finish())return;this.save();if(!this.campus)saveJourney({echoCollar:true});this.paused=true;this.audio.complete();$('dialog-body').innerHTML='<div class="reward" aria-hidden="true">◎</div><h2>联动，由你开启。</h2><p>ANTA 四枚字母已集齐。四处微光连成一条新路线，展厅的光门已经打开。</p><p><b>获得奖励：全息回声项圈</b><br>奖励已接入主世界。按 E 记录并释放回声，与伙伴同步两个感应点，开启水平连廊的新路线。</p><a id="return-to-world" class="primary" href="./relay.html">进入下一站 · 全楼开赛 →</a><a class="secondary" href="./portal.html">探索足迹穿梭展区 →</a><button id="revisit" class="secondary">重返展厅</button><a class="secondary" href="./index.html">挑战空中连廊</a><a class="secondary" href="./explore.html">回到上海中心园区</a>';this.campaignLinks();$('dialog').showModal();$('revisit').onclick=()=>{this.pos.set(0,0,5);this.path=[];this.closeDialog();};}
 update(dt){
  const playing=this.active&&!this.paused&&!document.hidden&&this.session.valid();this.audio.setState(this.active&&this.paused&&!this.soundControls.opened,document.hidden);const r=this.runtime;
  if(playing){this.state.tick(dt);r.scanTime=Math.max(0,r.scanTime-dt);if(r.collectTime>0){r.collectTime=Math.max(0,r.collectTime-dt);if(r.collectTime===0){if(this.state.collected.size===4)this.insert();else this.back();}}
   if(r.igniting){const t=this.state.lightingTime;$('lighting-stage').textContent=t<1.2?'四枚字母归位':t<3.7?'创新 · 联动 · 研发 · 协作':t<6.4?'光路汇合 · 中央全息装置启动':'全厅点亮 · 开启下一段旅程';$('lighting-fill').style.width=(t/8*100)+'%';if(this.state.illuminated){r.igniting=false;$('illumination').hidden=true;document.body.classList.remove('igniting');this.audio.success();this.inventory();this.save();this.toast('ANTA 已点亮整个展厅 · 光门已开启');}}
   let dx=0,dz=0;const pressed=(codes,hold)=>codes.some(k=>this.keys.has(k))||[...this.holds.values()].includes(hold);
   if(!this.detail&&!r.igniting){dx=(pressed(['KeyD','ArrowRight'],'right')?1:0)-(pressed(['KeyA','ArrowLeft'],'left')?1:0);dz=(pressed(['KeyS','ArrowDown'],'down')?1:0)-(pressed(['KeyW','ArrowUp'],'up')?1:0);}
   let desired=new V(dx,0,dz);if(this.path.length){const delta=this.path[0].clone().sub(this.pos);if(delta.length()<.12){this.path.shift();if(!this.path.length){const fn=this.afterWalk;this.afterWalk=null;fn?.();}}else desired.copy(delta).normalize();}
   const moving=desired.lengthSq()>.01&&!this.world.transition;this.moving=moving;if(moving){desired.normalize();this.direction.copy(desired);const speed=4.2*dt;const nx=this.pos.x+desired.x*speed,nz=this.pos.z+desired.z*speed;if(this.walkable(nx,this.pos.z))this.pos.x=nx;if(this.walkable(this.pos.x,nz))this.pos.z=nz;this.audio.step(this.world.tick,false,false);}
   if(!this.state.completed&&this.state.door===1&&this.pos.z< -9.55&&Math.abs(this.pos.x)<1.6)this.finish();
   this.saveTimer+=dt;if(this.saveTimer>5){this.saveTimer=0;this.save();}
  }else this.moving=false;
  this.world.updateLab(dt,this.state,r);document.body.classList.toggle('camera-moving',this.world.transition>0);this.player.visible=!this.detail||this.world.inspectView==='front';this.player.update(dt,this.pos,this.direction,this.moving);this.status();
  if(!this.detail){for(const b of $('hotspots').children){const id=b.dataset.station,s=STATIONS.find(s=>s.id===id);const p=this.world.project(id==='door'?new V(0,5.9,-8.7):new V(s.x,3.75,s.z));b.style.left=p.x+'px';b.style.top=p.y+'px';b.classList.toggle('done',this.state.collected.has(id));b.classList.toggle('sniffing',this.runtime.sniffId===id&&this.runtime.scanTime>0);b.setAttribute('aria-label',id==='door'?'ANTA 出口':(this.state.collected.has(id)?'已找到字母 · ':'观察 ')+s.name);}}
  if(this.toastTimer>0){this.toastTimer-=dt;if(this.toastTimer<=0)$('toast').classList.remove('show');}
  this.world.render();
 }
}
(async()=>{try{const world=new LabWorld($('world')),audio=new AudioEngine({scene:'lab'});const {corgi}=await world.load((p,t)=>$('loading').textContent=t+' · '+Math.round(p*100)+'%');const game=new LabGame(world,corgi,audio);window.__lab={game,world,state:game.state,ready:true};let last=performance.now();const frame=t=>{const dt=Math.max(0,Math.min(.05,(t-last)/1000));last=t;game.update(dt);requestAnimationFrame(frame);};requestAnimationFrame(frame);}catch(e){console.error(e);$('error-message').textContent=e.message;$('load-error').hidden=false;}})();
