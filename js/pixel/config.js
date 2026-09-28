export const PIXEL_KEY='wanbu-pixel-v1';
export const PIXEL_MODES={classic:{name:'经典像素',width:480,height:270},fine:{name:'细腻像素',width:640,height:360},bold:{name:'大颗粒像素',width:320,height:180}};
export function pixelSettings(raw={}){return {mode:Object.hasOwn(PIXEL_MODES,raw?.mode)?raw.mode:'classic'};}
export function pixelSize(width,height,mode='classic'){
 const w=Math.max(1,Math.floor(width)),h=Math.max(1,Math.floor(height)),p=PIXEL_MODES[mode]||PIXEL_MODES.classic;
 // Portrait gets a usable playfield rather than a 120px-wide landscape buffer.
 const scale=Math.max(2,Math.ceil(w<h?w/(p.width*.55):Math.max(w/p.width,h/p.height)));
 return {width:Math.ceil(w/scale),height:Math.ceil(h/scale),scale};
}

export function arrivalCameraX(x,width,portrait=false){return Math.max(width/2-3,Math.min(104-width/2+3,x+(portrait?2.2:4)));}
