const clamp = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
const TRACKS = ['keep-moving', 'keep-moving-drive'];
const LOOP_SECONDS=128*60/140;
const SFX=['jump','land','dash','throw','catch','bounce','whistle','collect','ui','success','complete','fail','echo','gate','step'];

export class AudioEngine {
 constructor({scene='explore'}={}) {
  this.scene=scene;this.sfxBuffers={};this.sfxLoadState='idle';this.sampleEvents={};
  let saved; try { saved = JSON.parse(localStorage.getItem('wanbu-audio-v1')); } catch {}
  this.enabled = saved?.enabled !== false;
  this.musicVolume = clamp(saved?.music, .65); this.sfxVolume = clamp(saved?.sfx, .7);
  this.ctx = null; this.started = false; this.sources = []; this.lastStep = -1; this.lastWater = -1;
  this.chapter = 0; this.paused = false; this.hidden = document.hidden; this.loadState = 'idle'; this.events = {};
  this.onchange = () => {};
  // Fetch before the first gesture; the audio context is created only after interaction.
  this.preload();this.preloadSfx();
  const unlock = () => { if (this.started && this.ctx?.state !== 'running') this.start(); };
  document.addEventListener('pointerdown', unlock, {passive:true});
  document.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => this.setState(this.paused, document.hidden));
 }
 preload() {
  if (!this.filesPromise) this.filesPromise = Promise.all(TRACKS.map(async name => {
   const response = await fetch(new URL(`../assets/audio/${name}.m4a`, import.meta.url));
   if (!response.ok) throw new Error(`Music unavailable: ${response.status}`);
   return response.arrayBuffer();
  })).then(files => {this.files = files; return files;}).catch(() => {
   this.filesPromise = null; this.loadState = 'error'; this.onchange(); return null;
  });
  return this.filesPromise;
 }
 preloadSfx() {
  if(!this.sfxFilesPromise)this.sfxFilesPromise=Promise.all(SFX.map(async name=>{
   try{const r=await fetch(new URL(`../assets/audio/sfx/${name}.wav`,import.meta.url));if(!r.ok)throw Error(r.status);return [name,await r.arrayBuffer()];}catch{return [name,null];}
  }));return this.sfxFilesPromise;
 }
 async loadSfx(){
  if(this.sfxLoadState==='ready')return;if(this.sfxLoading)return this.sfxLoading;
  this.sfxLoading=(async()=>{this.sfxLoadState='loading';const files=await this.preloadSfx();await Promise.all(files.map(async([name,file])=>{if(!file||this.sfxBuffers[name])return;try{this.sfxBuffers[name]=await this.ctx.decodeAudioData(file.slice(0));}catch{}}));this.sfxLoadState=Object.keys(this.sfxBuffers).length===SFX.length?'ready':'partial';if(this.sfxLoadState==='partial')this.sfxFilesPromise=null;})();
  try{await this.sfxLoading;}finally{this.sfxLoading=null;}
 }
 init() {
  if (this.ctx) return true;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) {this.loadState = 'unsupported'; this.onchange(); return false;}
  this.ctx = new Context();
  this.master = this.ctx.createGain(); this.master.gain.value = 0;
  this.limiter = this.ctx.createDynamicsCompressor(); this.limiter.threshold.value = -12;
  this.limiter.knee.value = 12; this.limiter.ratio.value = 4; this.limiter.attack.value = .006; this.limiter.release.value = .2;
  this.master.connect(this.limiter).connect(this.ctx.destination);
  this.musicGain = this.ctx.createGain(); this.sfxGain = this.ctx.createGain();
  this.musicDuck=this.ctx.createGain();this.musicDuck.gain.value=1;
  this.musicGain.connect(this.musicDuck).connect(this.master); this.sfxGain.connect(this.master);
  this.pulseGain = this.ctx.createGain(); this.pulseGain.connect(this.musicGain);
  this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
  const samples = this.noise.getChannelData(0); for (let i=0; i<samples.length; i++) samples[i] = Math.random()*2-1;
  this.ctx.onstatechange = () => this.onchange(); this.applyMix(true); return true;
 }
 async start() {
  this.started = true;
  if (!this.init()) return;
  // Resume synchronously in the start/touch handler, before any fetch or decode await.
  try { await this.ctx.resume(); } catch {this.onchange(); return;}
  this.applyMix();
  const effects=this.loadSfx();
  if (this.sources.length) return effects;
  if (this.loading) return this.loading;
  this.loading = (async () => {
   this.loadState = 'loading'; this.onchange();
   try {
    const files = this.files || await this.preload(); if (!files) throw new Error('No score');
    const buffers = await Promise.all(files.map(file => this.ctx.decodeAudioData(file.slice(0))));
    const when = this.ctx.currentTime + .08;this.startedAt=when;
    const loopDuration=Math.min(LOOP_SECONDS,...buffers.map(b=>b.duration));
    this.sources = buffers.map((buffer, i) => {
     const source = this.ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
     source.loopStart = 0; source.loopEnd = loopDuration;
     source.connect(i ? this.pulseGain : this.musicGain); source.start(when); return source;
    });
    this.loadState = 'ready'; this.onchange();
   } catch {this.loadState = 'error'; this.onchange();}
   finally {this.loading = null;}
  })();
  return this.loading;
 }
 ramp(param, value, seconds=.15) {
  const now = this.ctx.currentTime;
  param.cancelScheduledValues(now); param.setValueAtTime(param.value, now); param.linearRampToValueAtTime(value, now+seconds);
 }
 applyMix(immediate=false) {
  if (!this.ctx) return;
  const values = [[this.master.gain, this.enabled&&!this.hidden ? .85 : 0],
   [this.musicGain.gain, this.musicVolume*(this.paused ? .22 : 1)],
   [this.sfxGain.gain, this.sfxVolume], [this.pulseGain.gain, ([.58,.74,.88,1,.80][this.chapter]??.72)*(this.scene==='lab'?.63:this.scene==='explore'?.78:1)]];
  for (const [param, value] of values) immediate ? param.value=value : this.ramp(param,value,param===this.pulseGain.gain?1.4:.18);
 }
 setState(paused, hidden=document.hidden) {
  if (this.paused===paused && this.hidden===hidden) return;
  this.paused = paused; this.hidden = hidden; this.applyMix(); this.onchange();
 }
 setChapter(chapter) {if (this.chapter!==chapter) {this.chapter=chapter; this.applyMix();}}
 save() {try {localStorage.setItem('wanbu-audio-v1', JSON.stringify({enabled:this.enabled,music:this.musicVolume,sfx:this.sfxVolume}));} catch {}}
 setVolume(bus, value) {this[bus==='music'?'musicVolume':'sfxVolume']=clamp(Number(value),.6); this.applyMix(); this.save(); this.onchange();}
 toggle() {this.enabled=!this.enabled; if(this.started)this.start(); this.applyMix(); this.save(); this.onchange(); return this.enabled;}
 get status() {
  if (this.loadState==='unsupported') return '此浏览器不支持音频';
  if (!this.enabled) return '已静音';
  if (!this.started) return '开启旅程后播放';
  if (this.ctx?.state!=='running') return '轻触游戏画面开启声音';
  if (this.loadState==='error') return '音乐未载入 · 点击重试';
  if (this.loadState!=='ready') return '正在准备配乐…';
  return this.paused ? '暂停时轻声播放' : '正在播放 · 逐光加速 / 140 BPM';
 }
 ready(event) {
  if (!this.enabled || this.hidden || !this.ctx || this.ctx.state!=='running' || this.sfxVolume===0) return false;
  this.events[event]=(this.events[event]||0)+1; return true;
 }
 tone(f, duration=.2, type='sine', delay=0, volume=.15, end=f, pan=0) {
  const t=this.ctx.currentTime+delay, osc=this.ctx.createOscillator(), gain=this.ctx.createGain(), stereo=this.ctx.createStereoPanner();
  osc.type=type; osc.frequency.setValueAtTime(f,t); osc.frequency.exponentialRampToValueAtTime(Math.max(30,end),t+duration);
  gain.gain.setValueAtTime(0,t); gain.gain.linearRampToValueAtTime(volume,t+.008); gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  stereo.pan.value=pan; osc.connect(gain).connect(stereo).connect(this.sfxGain);
  osc.onended=()=>{osc.disconnect();gain.disconnect();stereo.disconnect();}; osc.start(t); osc.stop(t+duration+.02);
 }
 hiss(duration, volume, frequency=1500, end=frequency, pan=0, delay=0) {
  const t=this.ctx.currentTime+delay, source=this.ctx.createBufferSource(), filter=this.ctx.createBiquadFilter(), gain=this.ctx.createGain(), stereo=this.ctx.createStereoPanner();
  source.buffer=this.noise; filter.type='bandpass'; filter.Q.value=.65;
  filter.frequency.setValueAtTime(frequency,t);filter.frequency.exponentialRampToValueAtTime(end,t+duration);
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  stereo.pan.value=pan;source.connect(filter).connect(gain).connect(stereo).connect(this.sfxGain);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();stereo.disconnect();};source.start(t,Math.random()*.4);source.stop(t+duration+.02);
 }
 sample(name,{gain=1,rate=1,pan=0}={}){
  const buffer=this.sfxBuffers[name];if(!buffer)return false;
  const source=this.ctx.createBufferSource(),level=this.ctx.createGain(),stereo=this.ctx.createStereoPanner();source.buffer=buffer;source.playbackRate.value=rate;level.gain.value=gain;stereo.pan.value=pan;
  source.connect(level).connect(stereo).connect(this.sfxGain);source.onended=()=>{source.disconnect();level.disconnect();stereo.disconnect();};source.start();this.sampleEvents[name]=(this.sampleEvents[name]||0)+1;return true;
 }
 duck(level=.72,duration=.4,hold=.08){
  if(!this.ctx)return;const p=this.musicDuck.gain,t=this.ctx.currentTime;p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);p.linearRampToValueAtTime(level,t+.025);p.setValueAtTime(level,t+Math.max(.03,hold));p.linearRampToValueAtTime(1,t+Math.max(duration,hold+.05));
 }
 ui(){if(!this.ready('ui'))return;if(this.sample('ui',{gain:.13}))return;this.tone(1174,.07,'sine',0,.07,1568);}
 jump(){if(!this.ready('jump'))return;if(this.sample('jump',{gain:.5,rate:1+(Math.random()-.5)*.035}))return;this.tone(230,.22,'triangle',0,.15,780);this.hiss(.1,.08,700,3500);}
 land(impact=10){if(!this.ready('land'))return;const gain=Math.max(.16,Math.min(.64,impact*.042));if(this.sample('land',{gain,rate:.98+Math.random()*.04}))return;this.tone(110,.13,'sine',0,gain*.3,45);this.hiss(.07,gain*.28,1700,500);}
 cue(name){
  if(name==='jump'){this.jump();return;}if(name==='land'){this.land();return;}
  const gain={throw:.48,catch:.54,bounce:.35,whistle:.30}[name];if(gain===undefined||!this.ready(name))return;
  if(name==='whistle')this.duck(.6,.48,.25);if(name==='catch')this.duck(.84,.22);
  if(this.sample(name,{gain,rate:name==='bounce'?.97+Math.random()*.06:1,pan:name==='throw'?.12:0}))return;
  if(name==='whistle'){this.tone(1600,.12,'sine',0,.07,1850);this.tone(1850,.13,'sine',.16,.06,1600);}
  else if(name==='throw'){this.hiss(.15,.2,600,4500);this.tone(330,.13,'sine',0,.08,900);}
  else this.tone(name==='catch'?165:170,.16,'sine',0,.18,58);
 }
 collect(){if(!this.ready('collect'))return;this.duck(.8,.38);if(this.sample('collect',{gain:.46}))return;[587,880,1174].forEach((f,i)=>this.tone(f,.25,'triangle',i*.06,.13/(i+1),f,(i-1)*.2));}
 success(){if(!this.ready('success'))return;this.duck(.58,.9,.25);if(this.sample('success',{gain:.64}))return;[587,698,880,1174].forEach((f,i)=>this.tone(f,.6,'triangle',i*.1,.13,f,(i-1.5)*.2));}
 complete(){if(!this.ready('complete'))return;this.duck(.35,2.6,.85);if(this.sample('complete',{gain:.8}))return;[587,698,880,1174,1046,880,1174].forEach((f,i)=>this.tone(f,.8,'triangle',i*.16,.14,f,(i%3-1)*.3));}
 echo(release=false){if(!this.ready(release?'echo-release':'echo-record'))return;if(this.sample('echo',{gain:.53,rate:release?1:.89}))return;[0,.13,.26].forEach((d,i)=>this.tone(587,.4,'sine',d,.16/(i+1),1174,(i-1)*.5));this.hiss(.3,.1,600,4000);}
 dash(){if(!this.ready('dash'))return;this.duck(.83,.3);if(this.sample('dash',{gain:.7}))return;this.hiss(.29,.36,400,6000,-.2);this.tone(125,.24,'sine',0,.18,38);}
 gate(index=1){if(!this.ready('gate'))return;this.duck(.7,.6);if(this.sample('gate',{gain:.6,rate:[1,1.5,2][Math.max(0,Math.min(2,index-1))]}))return;this.tone(587,.35,'triangle',0,.15,1174);this.hiss(.25,.15,800,5000);}
 fail(){if(!this.ready('fail'))return;if(this.sample('fail',{gain:.34}))return;this.tone(294,.16,'triangle',0,.12,146);this.tone(220,.22,'sine',.12,.12,110);}
 water(intensity=1, pan=0) {
  if(!this.ctx||this.ctx.currentTime-this.lastWater<.09||!this.ready('water'))return;this.lastWater=this.ctx.currentTime;
  this.hiss(.3,.27*intensity,1300,450,pan);[0,.045,.105].forEach((d,i)=>this.tone(550+i*230,.15,'sine',d,.09*intensity,220+i*140,pan));
 }
 step(time, water=false, running=false) {
  if(!this.ctx||this.ctx.currentTime-this.lastStep<(running?.16:.28))return;
  this.lastStep=this.ctx.currentTime;
  if(water){this.water(running?.8:.5,(this.events.water%2?1:-1)*.12);return;}
  if(!this.ready('step'))return;const pan=(this.events.step%2?1:-1)*.13;
  if(this.sample('step',{gain:running?.14:.09,rate:.92+Math.random()*.16,pan}))return;
  this.hiss(.075,running?.14:.10,1100+Math.random()*500,450,pan);this.tone(160+Math.random()*35,.065,'sine',0,.11,75,pan);
 }
}
