import * as THREE from 'three';
import {CLAW,DEFEAT_TIME} from './combat.js';
// Effects read the simulation clock, so pausing freezes attack and damage feedback.
export class CombatView{
 constructor(world){
  this.world=world;this.slash=new THREE.Group();world.scene.add(this.slash);this.numbers=[];
  for(let i=0;i<3;i++){
   const material=new THREE.MeshBasicMaterial({color:i===1?0xf2fff0:0x8ff9dc,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
   const arc=new THREE.Mesh(new THREE.RingGeometry(1.6-i*.26,1.72-i*.26,32,1,-1.13,2.26),material);arc.position.set(.75+i*.18,(i-1)*.24,0);this.slash.add(arc);
  }
  this.energy=new THREE.Group();world.roomViews.arena.root.add(this.energy);
  const geometry=new THREE.OctahedronGeometry(.13,0);
  for(let i=0;i<32;i++){const m=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:i%3?0xa6ffe2:0xffd48f,transparent:true,depthWrite:false,toneMapped:false}));m.userData={angle:i*2.399,seed:(i%7)/7};this.energy.add(m);}
 }
 damage(event,state){
  const label=document.createElement('span');label.className='combat-damage'+(event.critical?' critical':'');label.setAttribute('aria-hidden','true');label.textContent=event.critical?'弱点 −'+event.damage:'−'+event.damage;this.world.canvas.parentElement.append(label);
  this.numbers.push({label,born:state.time,x:event.x,y:event.y+1.5,point:new THREE.Vector3()});
 }
 update(state){
  this.world.camera.updateMatrixWorld();
  const p=state.player,a=state.claw,g=state.guardian;
  this.slash.visible=!!a&&a.elapsed<CLAW.duration&&a.elapsed>0;
  if(this.slash.visible){const t=a.elapsed/CLAW.duration;this.slash.position.set(p.x,p.y+1.15,2);this.slash.scale.set(a.facing,1,1);this.slash.rotation.z=(.28-t*.55)*a.facing;for(const m of this.slash.children){m.material.opacity=Math.sin(t*Math.PI)*.92;m.scale.setScalar(.7+t*.6);}}
  for(let i=this.numbers.length-1;i>=0;i--){const n=this.numbers[i],t=(state.time-n.born)/.9;n.point.set(n.x,n.y+t*1.5,1).project(this.world.camera);n.label.style.transform=`translate(-50%,-50%) translate(${(n.point.x*.5+.5)*this.world.canvas.clientWidth}px,${(-n.point.y*.5+.5)*this.world.canvas.clientHeight}px)`;n.label.style.opacity=Math.max(0,1-t);n.label.hidden=state.roomId!=='arena';if(t>=1||t<0){n.label.remove();this.numbers.splice(i,1);}}
  this.energy.visible=g.phase==='defeated';
  if(this.energy.visible){const t=g.defeatTime/DEFEAT_TIME;this.energy.position.set(g.x,1.5,.6);for(const m of this.energy.children){const {angle,seed}=m.userData,r=.5+t*(2+seed*3);m.position.set(Math.cos(angle)*r,Math.sin(angle)*r*.5+t*2,Math.sin(angle*2)*r*.4);m.rotation.set(t*5+angle,t*3,angle);m.scale.setScalar((1-t)*(1+seed*2));m.material.opacity=1-t;}}
 }
}
