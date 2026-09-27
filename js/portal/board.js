import {PIECES} from './state.js';
const PALETTE={bg:'#082e3a',grid:'#174552',line:'#78efff',gold:'#ffd682',muted:'#80a6ad'};
export function drawBoard(canvas,state,mode,dog,clock=0){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,X=x=>x/24*w,Y=y=>h-y/10*h;
 c.clearRect(0,0,w,h);const grad=c.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#07303b');grad.addColorStop(1,'#102b36');c.fillStyle=grad;c.fillRect(0,0,w,h);
 c.strokeStyle=PALETTE.grid;c.lineWidth=1;for(let x=0;x<=24;x++){c.beginPath();c.moveTo(X(x),0);c.lineTo(X(x),h);c.stroke();}for(let y=0;y<=10;y++){c.beginPath();c.moveTo(0,Y(y));c.lineTo(w,Y(y));c.stroke();}
 c.fillStyle='#8aaeb5';c.font='500 15px "PingFang SC",sans-serif';c.fillText(mode==='screen1'?'01 / CONNECT THE PATH':'02 / LEAVE AN ECHO',24,32);
 function path(points,{color=PALETTE.line,fill=true,dash=false}={}){
  c.save();c.setLineDash(dash?[7,8]:[]);c.strokeStyle=color;c.shadowColor=color;c.shadowBlur=dash?0:12;c.lineWidth=5;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(X(x),Y(y)):c.moveTo(X(x),Y(y)));c.stroke();c.shadowBlur=0;
  if(fill){c.fillStyle='#77d6df18';c.lineTo(X(points.at(-1)[0]),h);c.lineTo(X(points[0][0]),h);c.closePath();c.fill();}c.restore();
 }
 const coin=(x,y,id)=>{if(state.collected.has(id))return;c.save();c.translate(X(x),Y(y)+Math.sin(clock*2+id)*4);c.fillStyle=PALETTE.gold;c.shadowColor=PALETTE.gold;c.shadowBlur=12;c.beginPath();c.ellipse(0,2,8,6,0,0,Math.PI*2);c.fill();for(const [a,b]of[[-9,-7],[-3,-12],[4,-12],[10,-7]]){c.beginPath();c.ellipse(a,b,3,4,0,0,Math.PI*2);c.fill();}c.restore();};
 if(mode==='screen1'){
  path([[0,1],[3,1]],{color:PALETTE.gold});path([[18,4],[24,4]],{color:PALETTE.gold});
  state.order.forEach((id,i)=>{const p=PIECES[id],x=3+i*5;
   c.fillStyle=i===state.selected?'#7cecff18':'#b5e9ef07';c.fillRect(X(x)+7,65,X(5)-14,h-110);
   c.strokeStyle=i===state.selected?PALETTE.gold:'#4e8190';c.lineWidth=1;c.strokeRect(X(x)+7,65,X(5)-14,h-110);
   if(id==='level'){path([[x,p.a],[x+2,p.a]]);path([[x+3.15,p.a],[x+5,p.b]]);c.fillStyle='#acc8cc';c.font='500 13px "PingFang SC",sans-serif';c.textAlign='center';c.fillText('跳跃',X(x+2.6),Y(p.a)-22);c.textAlign='left';}else path([[x,p.a],[x+5,p.b]]);c.fillStyle='#cbe8e9';c.textAlign='center';c.font='600 17px "PingFang SC",sans-serif';c.fillText(p.label,X(x+2.5),94);c.textAlign='left';
   for(const [xx,yy]of[[x,p.a],[x+5,p.b]]){c.fillStyle=PALETTE.gold;c.beginPath();c.arc(X(xx),Y(yy),5,0,Math.PI*2);c.fill();}
  });coin(6,3,0);coin(16,5,1);
 }else{
  path([[0,1],[6,1]],{color:PALETTE.gold});
  path([[6,1],[12,4]],{color:state.lamp?PALETTE.line:'#597179',dash:!state.lamp,fill:state.lamp});
  if(state.lamp){c.fillStyle='#b6f6fc35';for(let i=0;i<8;i++)c.fillRect(X(6+i*.75),Y(1+(i+1)*.375),X(.7),8);}
  else{c.fillStyle='#fbd18c';c.font='500 19px "PingFang SC",sans-serif';c.fillText('返回展厅，校准投影灯',X(6),Y(4.8));}
  path([[12,4],[24,4]]);
  const open=state.gateOpen();c.strokeStyle=open?'#77e6d070':'#ffb16e';c.lineWidth=6;c.setLineDash(open?[6,14]:[]);c.beginPath();c.moveTo(X(19.15),Y(4));c.lineTo(X(19.15),Y(8));c.stroke();c.setLineDash([]);
  c.fillStyle=PALETTE.gold;c.fillRect(X(13.3),Y(4)+3,X(1.4),7);c.font='600 17px "PingFang SC",sans-serif';c.fillText('E · 回声圆盘',X(12.8),Y(3.2));
  if(state.recording){c.fillStyle='#f7d695';c.fillText('录制 '+state.recordTime.toFixed(1)+' / 2 秒',X(12.3),Y(7.8));}
  if(state.echoTime>0){drawDog(14,4,true);c.fillStyle='#a0f6ff';c.font='600 18px monospace';c.fillText(state.echoTime.toFixed(1)+'s',X(13.5),Y(7.4));}coin(10,4.7,2);
 }
 const done=mode==='screen1'?state.route:state.echoSolved;
 c.save();c.translate(X(22.3),Y(4.8));c.strokeStyle=done?'#82f1d2':PALETTE.gold;c.shadowColor=c.strokeStyle;c.shadowBlur=16;c.lineWidth=3;c.beginPath();c.arc(0,0,18+Math.sin(clock*2)*2,0,Math.PI*2);c.stroke();c.font='700 20px sans-serif';c.fillStyle=c.strokeStyle;c.textAlign='center';c.fillText(done?'✓':'F',0,7);c.restore();
 if(state.mode===mode)drawDog(state.player.x,state.player.y,false);
 function drawDog(x,y,echo){
  c.save();c.imageSmoothingEnabled=false;const size=96,xx=X(x)-size/2,yy=Y(y)-size*.73;
  if(dog){c.globalAlpha=echo?.5:1;if(echo)c.filter='brightness(1.6) sepia(.8) hue-rotate(120deg) saturate(2)';c.drawImage(dog,xx,yy,size,size);}else{c.fillStyle='#f6c270';c.fillRect(X(x)-12,Y(y)-24,24,20);}
  c.restore();
 }
}
