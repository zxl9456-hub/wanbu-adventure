import {CHAPTER_STORY} from '../campus/lore.js';
import {ACTIVITIES,CAMPUS_SAVE,activityUnlocked,completedActivity} from '../campus/campaign.js';
export class AdventureSession{
 constructor(id,standaloneKey,{storage=globalThis.localStorage,search=globalThis.location?.search||''}={}){
  this.id=id;this.config=ACTIVITIES[id];this.storage=storage;this.campus=new URLSearchParams(search).get('from')==='campus';this.key=this.campus?this.config.key:standaloneKey;
  const master=this.read(CAMPUS_SAVE);this.runId=master?.runId;this.shoes=master?.shoes;this.locked=this.campus&&(!activityUnlocked(id,master)||master.activeChallenge!==id);
  const data=this.read(this.key);this.saved=this.campus?(data?.campaign===this.runId?data:null):data;
  this.returnURL='./campus.html?resume=world&from='+id;
 }
 load(){const raw=this.read(this.key);return this.campus&&raw?.campaign!==this.runId?null:raw;}
 read(key){try{return JSON.parse(this.storage.getItem(key));}catch{return null;}}
 valid(){return !this.campus||!this.locked&&this.read(CAMPUS_SAVE)?.runId===this.runId;}
 save(data){if(!this.valid())return false;if(this.campus&&this.completed&&!completedActivity(this.id,{...data,campaign:this.runId},this.runId))return true;try{this.storage.setItem(this.key,JSON.stringify({...data,...(this.campus?{campaign:this.runId}:{})}));return true;}catch{return false;}}
 get completed(){return this.campus&&completedActivity(this.id,this.read(this.key),this.runId);}
 mount(){
  if(!this.campus)return;
  document.body.classList.add('in-adventure');const c=this.config;
  for(const a of document.querySelectorAll('header a.brand[href]')){a.href=this.returnURL;a.setAttribute('aria-label','返回万步冒险主线');}
  const brand=document.querySelector('.brand small,.topbar a small');if(brand)brand.textContent=`第 ${c.number} 章 · ${c.title}`;
  const intro=document.querySelector('.intro-copy')||document.querySelector('#intro>div')||document.querySelector('#intro');if(intro)intro.classList.add('adventure-intro-copy');if(intro&&!intro.querySelector('.adventure-note')){const note=document.createElement('p');note.className='adventure-note';note.textContent=`万步奇遇 · 第 ${c.number} / 09 章\n${CHAPTER_STORY[this.id][1]}\n完成本章，带回${c.reward}。`;intro.prepend(note);this.decorate(intro);}
  if(this.locked)this.showLock();
  addEventListener('storage',e=>{if(e.key===CAMPUS_SAVE&&!this.valid()){this.locked=true;this.showLock();}});
 }
 showLock(){if(document.getElementById('adventure-locked'))return;const panel=document.createElement('section');panel.id='adventure-locked';panel.innerHTML='<h1>回到旅程，再继续出发。</h1><p>请从园区中的关卡入口进入。本章进度会与这次冒险对应。</p><a class="primary" href="./campus.html?resume=world">回到冒险主线 →</a>';document.body.append(panel);for(const id of ['start','continue']){const b=document.getElementById(id);if(b)b.disabled=true;}}
 decorate(root,complete=false){
  if(!this.campus||!root)return;
  for(const a of root.querySelectorAll('a[href]'))if(!a.classList.contains('adventure-return'))a.remove();
  let link=root.querySelector('.adventure-return');if(!link){link=document.createElement('a');link.className='adventure-return';root.append(link);}link.href=this.returnURL;link.textContent=complete?'带回'+this.config.reward+' · 继续主线 →':'暂回园区 · 保留本章进度';link.classList.toggle('primary',complete);link.classList.toggle('secondary',!complete);
  if(complete){let note=root.querySelector('.adventure-next');if(!note){note=document.createElement('p');note.className='adventure-next';root.prepend(note);}note.textContent='下一步：'+this.config.next;root.prepend(link);}
 }
}
