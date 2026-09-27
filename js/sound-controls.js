const $ = id => document.getElementById(id);
export class SoundControls {
 constructor(audio, game) {
  this.audio=audio;this.game=game;this.opened=false;this.panel=$('sound-panel');
  $('sound').onclick=()=>this.opened?this.close():this.open();
  $('sound-close').onclick=()=>this.close();
  $('mute-audio').onclick=()=>{audio.toggle();if(audio.enabled)audio.ui();};
  $('audio-retry').onclick=()=>audio.start();
  for(const bus of ['music','sfx']) {
   $(bus+'-volume').oninput=e=>audio.setVolume(bus,Number(e.target.value)/100);
   $(bus+'-volume').onchange=()=>{if(bus==='sfx')audio.collect();};
  }
  document.addEventListener('pointerdown',e=>{if(this.opened&&!this.panel.contains(e.target)&&!$('sound').contains(e.target))this.close(false);},true);
  document.addEventListener('click',e=>{const button=e.target.closest('button');if(button&&!button.disabled&&!['dash-button','echo-button','interact-button','touch-dash','touch-echo','touch-interact','mute-audio','start','continue'].includes(button.id))audio.ui();});
  addEventListener('blur',()=>{if(this.opened){this.close(false);if(game.active)game.ui.pause(true);}});
  audio.onchange=()=>this.sync();this.sync();
 }
 open() {
  this.wasPaused=this.game.paused;this.opened=true;
  this.game.paused=true;this.game.keys.clear();this.game.joy.set(0,0);
  this.panel.classList.remove('hidden');$('sound').setAttribute('aria-expanded','true');
  if(this.audio.started)this.audio.start();this.sync();$('music-volume').focus();
 }
 close(focus=true) {
  if(!this.opened)return;this.opened=false;this.panel.classList.add('hidden');$('sound').setAttribute('aria-expanded','false');
  this.game.paused=this.wasPaused;
  if(focus){if(this.game.active&&!this.game.paused)this.game.world.canvas.focus();else $('sound').focus();}
 }
 sync() {
  const a=this.audio;
  for(const bus of ['music','sfx']){const value=Math.round(a[bus+'Volume']*100);$(bus+'-volume').value=String(value);$(bus+'-value').textContent=value+'%';}
  $('mute-audio').textContent=a.enabled?'静音':'开启声音';$('mute-audio').setAttribute('aria-pressed',String(!a.enabled));
  $('sound').setAttribute('aria-label',a.enabled?'声音设置':'声音设置，已静音');
  $('sound').innerHTML=`<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Z${a.enabled?'m4 3c3 2 3 6 0 8m3-11c5 4 5 10 0 14':'m5 4 5 6m0-6-5 6'}"/></svg>`;
  $('audio-status').textContent=a.status;
  $('audio-retry').classList.toggle('hidden',a.loadState!=='error'||!a.started);
  this.panel.classList.toggle('is-silent',!a.enabled||!a.started||a.musicVolume===0);
 }
}
