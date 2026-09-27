import {HURDLES,BUMPERS} from './content.js';
export function arrivalInput(state){const p=state.player,a=state.arrival;
 const hurdle=HURDLES.some(h=>h.x+h.w>p.x+.3&&h.x-p.x<2.65&&h.x-p.x>-.5&&p.y<h.h);
 const gap=[22,46,73].some(x=>x-p.x<1.35&&x-p.x>-.5);
 const ball=BUMPERS.some(b=>!a.defeated.has(b.id)&&a.bumperX(b)-p.x<3.6&&a.bumperX(b)-p.x>-.45);
 return {move:p.x<99?1:0,jumpPressed:p.grounded&&(hurdle||gap||ball),jumpHeld:true};
}
export function runArrival(state){if(state.roomId!=='arrival')state.enter('arrival',3,0);let frames=0;while(state.roomId==='arrival'&&frames++<120*120){state.update(1/120,arrivalInput(state));state.drain();if(state.player.x>=98&&state.player.grounded){state.interact();state.drain();}}if(state.roomId!=='hub')throw Error('门前关卡无法抵达入口 '+JSON.stringify({p:state.player,coins:state.arrival.coins.size,checkpoint:state.arrival.checkpoint}));return {frames,coins:state.arrival.coins.size,earned:state.arrival.earned,falls:state.falls,bumps:state.arrival.bumps};}
