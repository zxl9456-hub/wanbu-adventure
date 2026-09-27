import {registerAdventureTools} from './agent-tools.js';
import {World} from './world.js';
import {Game} from './gameplay.js';
import {UI} from './ui.js';
import {AudioEngine} from './audio.js';
const canvas=document.querySelector('#world');
try{
 const world=new World(canvas),audio=new AudioEngine(),ui=new UI(audio);let game,last=performance.now(),frames=0,elapsed=0;
 function animate(now){requestAnimationFrame(animate);const dt=Math.min(.05,(now-last)/1000);last=now;audio.setState(!!game?.paused&&!ui.soundControls?.opened);game?.update(dt);world.update(game?.paused?0:dt,game?.position);world.render();frames++;elapsed+=dt;if(elapsed>2){if(window.__wanbu)window.__wanbu.fps=Math.round(frames/elapsed);frames=0;elapsed=0;}}
 requestAnimationFrame(animate);
 const {corgi}=await world.load((p,label)=>{document.querySelector('#load-fill').style.width=p*100+'%';document.querySelector('#load-percent').textContent=Math.round(p*100)+'%';document.querySelector('#load-label').textContent=label;});
 game=new Game(world,corgi,audio,ui);const start=document.querySelector('#start');start.disabled=false;start.querySelector('span').textContent='开启旅程';document.querySelector('#load-label').textContent='园区已就绪 · 开始你的联动冒险';start.onclick=()=>game.start();let saved;try{saved=JSON.parse(localStorage.getItem('wanbu-save-v1'));}catch{}if(saved){document.querySelector('#continue').classList.remove('hidden');document.querySelector('#continue').onclick=()=>game.start(true);}
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();game.paused=true;document.querySelector('#fatal').classList.remove('hidden');document.querySelector('#fatal-message').textContent='图形连接已中断，你的进度已保存。请重新加载。';});
 window.__wanbu={world,game,player:game.character,ready:true};registerAdventureTools(game);if(localStorage.getItem('wanbu-autostart')){localStorage.removeItem('wanbu-autostart');game.start(false,true);}
}catch(e){console.error(e);document.querySelector('#fatal').classList.remove('hidden');document.querySelector('#fatal-message').textContent='游戏资源未能完整载入。请检查网络后重新加载。';}
