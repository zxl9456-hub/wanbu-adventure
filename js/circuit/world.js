import * as THREE from 'three';
import {roundedDeck} from '../sports/world.js';
import {CIRCUIT_ROOMS,trainingBall} from './content.js';
const material=(color,metalness=.15,roughness=.55)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const glow=color=>new THREE.MeshBasicMaterial({color,toneMapped:false});
function cylinder(w,parent,x,y,z,r,h,m,r2=r){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r2,h,32),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function label(w,parent,text,x,y,width=5,color='#e9efe6',z=-2.5){const mesh=w.label(text,width,.4,color,parent);mesh.position.set(x,y,z);return mesh;}
function ring(w,parent,r,x,y,z,m){const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,.035,8,48),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
// A small kit of shared architectural parts, with physics-defined walkable surfaces.
// No generated branding: names remain editable text in the scene.
export function makeCircuitRoom(w,id,r){
 const root=new THREE.Group();root.visible=false;w.scene.add(root);
 const v={root,pickups:[],interact:new Map(),caches:[],decor:[],floorMeshes:new Map(),gates:[]};w.roomViews[id]=v;
 const ivory=material(0xe7e1ce),slate=material(0x253c3c),wood=material(0xb38c60,.05,.72),mint=glow(0x9bdfca),gold=material(0xe6bf7f,.7,.28),red=material(0xd65243,.3,.42),glass=new THREE.MeshPhysicalMaterial({color:0x92d8d3,transparent:true,opacity:.2,roughness:.15,metalness:.2,depthWrite:false});
 v.mats={ivory,slate,wood,mint,gold,red,glass};
 for(const p of r.platforms){const g=new THREE.Group();g.position.set((p.left+p.right)/2,p.y,0);root.add(g);const width=p.right-p.left;g.add(roundedDeck(width,4,.48,id==='court'?wood:ivory));w.box(width-.15,.055,.055,mint,0,-.12,2.05,g);w.box(width-.15,.08,.1,slate,0,-.4,2,g);v.floorMeshes.set(p.id,g);if(p.id.startsWith('raft')){for(const x of[-width*.3,width*.3])cylinder(w,g,x,-.42,0,.3,.4,slate);for(const z of[-1.1,1.1])w.box(width-.2,.045,.08,gold,0,.035,z,g);}else if(width<10){for(const x of[-width/2+.3,width/2-.3])w.box(.12,1.1,.1,slate,x,.5,-1.8,g);w.box(width, .055,.07,gold,0,1.05,-1.8,g);}}
 // Window frames and fine ceiling ribs retain the centre's flowing architecture.
 const back=id==='pool'?material(0x265761,.22,.4):id==='cafe'?material(0x4b5144):slate;
 w.box(40,11,.3,back,18,4.8,-6,root);
 for(let x=0;x<=36;x+=6){w.box(.2,10,.35,ivory,x,4.5,-5.7,root);w.box(5.6,6,.09,glass,x+3,5.2,-5.75,root);w.box(5.65,.055,.075,mint,x+3,8.3,-5.55,root);}
 for(let y=1;y<=9;y+=4)w.box(38,.15,.45,ivory,18,y,-5.3,root);
 for(let x=1;x<36;x+=3)w.box(.13,.18,9,id==='cafe'?wood:ivory,x,10,-1.5,root);
 label(w,root,{energy:'MOVE / 运动，让灵感发生',pool:'FLOW / 每一步，都有落点',court:'PLAY / 把同一个动作再用一次',cafe:'TOGETHER / 补给，也补充灵感'}[id],18,9.2,16,'#eeddb8',-5.2);
 for(const i of r.items){const g=new THREE.Group();g.position.set(i.x,i.y,0);root.add(g);v.interact.set(i.id,g);if(i.type==='route'||i.kind==='shortcut'||i.kind==='return-cafe'){
   for(const x of[-1.1,1.1])w.box(.14,3.2,.35,ivory,x,1.6,-1.2,g);
   w.box(2.35,.16,.45,slate,0,3.25,-1.2,g);w.ring(.9,.03,mint,0,.075,0,g);
   label(w,g,i.label,0,3.75,4.1,'#e9ddc2',-1.1);
   const curtain=w.box(1.95,2.95,.035,new THREE.MeshBasicMaterial({color:0xe6bb7e,transparent:true,opacity:.17,depthWrite:false}),0,1.55,-1.1,g);v.gates.push({curtain,id:i.id});
  }else if(i.kind==='kit'){
   cylinder(w,g,0,.4,-.6,.55,.8,slate);ring(w,g,.43,0,1.4,-.5,mint);label(w,g,'F / 能量爪击',0,2.5,3,'#f4dbb4',-.7);
  }else if(i.kind==='practice'){
   cylinder(w,g,0,.25,-1.2,.32,.5,slate);label(w,g,'F / 反弹加练',0,2.7,3.8,'#f4dbb4',-1.2);
  }else if(i.kind==='sports'){
   cylinder(w,g,0,.45,-1.2,.38,.9,slate);w.box(.85,.55,.12,mint,0,1.15,-1.2,g);label(w,g,'云端步道 · F',0,2.25,3.4,'#f4dbb4',-1.2);
  }
 }
 if(id==='energy'){
  w.box(7,.1,2.9,slate,10.5,.02,0,root);for(const z of[-1.5,1.5])w.box(7,.14,.16,red,10.5,.02,z,root);
  v.belt=[];for(let i=0;i<10;i++)v.belt.push(w.box(.1,.025,2.7,mint,7+i*.7,.085,0,root));
  label(w,root,'01 跑台充能 →',10.5,1.05,5.5,'#a8e5cc',-2.5);label(w,root,'02 球的左侧 · J',20,2.5,4.5,'#eed4a6');
  v.charge=w.box(6,.11,.06,mint,10.5,.25,1.65,root);
  for(const x of[4,29]){const rack=new THREE.Group();rack.position.set(x,0,-4);root.add(rack);for(const xx of[-1,1])w.box(.1,2.1,.1,ivory,xx,1,0,rack);for(const y of[.6,1.3,2]){w.box(2.2,.09,.6,slate,0,y,0,rack);for(const xx of[-.65,0,.65]){const dumb=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.55,12),slate);dumb.rotation.z=Math.PI/2;dumb.position.set(xx,y+.2,0);rack.add(dumb);}}}
  v.medal=new THREE.Group();v.medal.position.set(17.5,6.6,.25);root.add(v.medal);const coin=cylinder(w,v.medal,0,0,0,.46,.1,gold);coin.rotation.x=Math.PI/2;ring(w,v.medal,.51,0,0,.03,mint);label(w,root,'高处的回访奖牌',17.5,7.7,5,'#f4d9a5',.1);
  const spring=new THREE.Group();spring.position.set(13.25,3.65,0);spring.add(roundedDeck(2.5,4,.45,red));root.add(spring);v.spring=spring;spring.visible=false;
 }
 if(id==='pool'){
  w.box(19.2,.3,8,material(0x5399a7,.2,.38),18.5,-3.5,.25,root);
  for(const z of[-3.6,4.2])w.box(19.3,3.5,.24,z>0?new THREE.MeshPhysicalMaterial({color:0x88cdd8,transparent:true,opacity:.23,metalness:.1,roughness:.2,depthWrite:false}):material(0x639fa9,.1,.48),18.5,-1.7,z,root);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(19,7.5,1,1),new THREE.MeshPhysicalMaterial({color:0x3ba8bc,emissive:0x155b6d,emissiveIntensity:.25,metalness:.35,roughness:.16,transparent:true,opacity:.64,depthWrite:false}));water.rotation.x=-Math.PI/2;water.position.set(18.5,-2.4,.25);root.add(water);v.water=water;
  v.ripples=[];for(let i=0;i<13;i++){const line=w.box(2.5,.012,.045,glow(0xa4e8df),10.5+(i%5)*3.5,-2.38,-2.6+Math.floor(i/5)*2.4,root);v.ripples.push(line);}
  for(const z of[-2.7,2.9])for(let x=10;x<28;x+=.9){const ball=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),x%3<1.5?red:ivory);ball.position.set(x,-.1,z);root.add(ball);}
  for(const x of[7,30]){for(const z of[-1.7,1.7]){const rail=new THREE.Mesh(new THREE.TorusGeometry(.38,.04,8,24,Math.PI),gold);rail.position.set(x,.6,z);root.add(rail);}label(w,root,x===7?'击球启动水位':'训练馆 →',x,2.7,4,'#d3ede5');}
  label(w,root,'恒温泳池 · 水循环实验',19,6.9,12,'#d0f0e9',-5.1);
 }
 if(id==='court'){
  const paint=glow(0xf4e2b8);for(const z of[-1.75,1.75])w.box(32,.015,.04,paint,18,.02,z,root);w.box(.04,.015,3.5,paint,18,.02,0,root);const circle=ring(w,root,2,18,.04,0,paint);circle.rotation.x=Math.PI/2;
  for(let x=1;x<36;x+=.7)w.box(.012,.01,4,material(0x886c4c),x,.018,0,root);
  for(const x of[5,31]){w.box(.13,6,.13,ivory,x,3,-3.8,root);w.box(3.5,2.3,.18,ivory,x,6,-3.7,root);w.box(1.6,1.1,.03,slate,x,5.8,-3.58,root);const hoop=ring(w,root,.6,x,4.75,-2.9,red);hoop.rotation.x=Math.PI/2;for(let i=0;i<12;i++){const a=i/12*Math.PI*2;w.box(.015,.65,.015,ivory,x+Math.cos(a)*.46,4.4,-2.9+Math.sin(a)*.46,root);}}
  for(let i=0;i<3;i++){w.box(20,.3,1.3,slate,18,.35+i*.5,-4-i*.8,root);for(let x=10;x<28;x+=1.3)w.box(.8,.14,.7,i%2?ivory:red,x,.6+i*.5,-4-i*.8,root);}
  const gate=w.box(.1,5,4,new THREE.MeshBasicMaterial({color:0x91dece,transparent:true,opacity:.25,depthWrite:false}),9,2.5,0,root);v.courtGate=gate;
  label(w,root,'J 反弹来球 / 护盾弱点',25,8.1,9,'#f2d29b',-5.1);
 }
 if(id==='cafe'){
  const ceiling=new THREE.Group();ceiling.position.set(17,8,-1);root.add(ceiling);for(let i=0;i<9;i++){const hoop=new THREE.Mesh(new THREE.TorusGeometry(2.6+i*.4,.065,8,64),wood);hoop.rotation.x=Math.PI/2;ceiling.add(hoop);}cylinder(w,ceiling,0,.03,0,2.3,.055,glow(0xefe6c6));
  w.box(7,1.25,2.3,wood,8,.62,-2.2,root);w.box(7.2,.14,2.5,ivory,8,1.28,-2.2,root);
  for(let i=0;i<5;i++){cylinder(w,root,5.5+i*1.15,1.4,-1.5,.34,.055,ivory);const food=new THREE.Mesh(new THREE.SphereGeometry(.21,12,8),material(i%2?0xdfaa5f:0x81aa73));food.scale.y=.4;food.position.set(5.5+i*1.15,1.48,-1.5);root.add(food);}
  label(w,root,'F 免费补给',8,2.8,4,'#f2deaf',-1.5);
  for(const x of[17,25,31]){cylinder(w,root,x,.8,-3.5,.12,1.6,slate);cylinder(w,root,x,1.65,-3.5,1.4,.15,wood);for(const side of[-1,1]){w.box(.8,.18,.8,wood,x+side*1.6,.75,-3.4,root);w.box(.8,.9,.1,wood,x+side*1.6,1.15,-3.85,root);}}
  label(w,root,'F 邀请伙伴',16,3.1,4.5,'#dfedd3',-1.2);label(w,root,'F 建设设施',23,3.1,4.5,'#edcf97',-1.2);
  v.restCorner=new THREE.Group();root.add(v.restCorner);w.box(4,.35,1.5,wood,26,.35,2.3,v.restCorner);for(const x of[24.3,27.7])w.box(.18,1,.8,ivory,x,.5,2.3,v.restCorner);cylinder(w,v.restCorner,26,2.5,2.3,.6,.07,glow(0xffd797));v.restCorner.visible=false;
 }
 const spawn=trainingBall[id];if(spawn){const ball=new THREE.Mesh(new THREE.SphereGeometry(.28,24,16),gold);ball.position.set(spawn.x,spawn.y,.5);root.add(ball);v.ball=ball;const target=new THREE.Group();target.position.set(spawn.target,1.1,.5);root.add(target);ring(w,target,.5,0,0,0,mint);ring(w,target,.32,0,0,.025,gold);w.box(.07,1,.07,slate,0,-.7,0,target);v.target=target;}
}
function robot(w,color){
 const g=new THREE.Group(),shell=material(color,.5,.3),dark=material(0x1e3638,.35,.45),trim=material(0xe1d6bd,.6,.35);
 g.add(roundedDeck(1.85,1.45,.4,dark));w.box(1.35,.72,1.15,shell,0,.62,0,g);w.box(1.1,.15,1.05,trim,0,1.03,0,g);
 for(const x of[-.7,.7])for(const z of[-.75,.75]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.18,20),dark);wheel.rotation.x=Math.PI/2;wheel.position.set(x,.05,z);g.add(wheel);}
 const head=new THREE.Group();head.position.set(0,1.08,0);g.add(head);const lens=new THREE.Mesh(new THREE.SphereGeometry(.33,24,16),glow(0x99eddd));lens.position.set(-.48,.28,.08);head.add(lens);w.box(.55,.5,.7,trim,0,.24,0,head);
 const core=new THREE.Mesh(new THREE.OctahedronGeometry(.29,1),glow(0xffd493));core.position.set(.82,.65,.65);g.add(core);
 const shield=ring(w,g,.95,0,.75,.85,glow(0x99eddd));
 const bar=w.box(1.8,.1,.05,glow(0xffd493),0,2.15,.5,g);
 return {root:g,head,core,shield,bar};
}
export class CircuitView{
 constructor(w){this.w=w;this.shots=[];this.runner=robot(w,0xd96a50);this.launcher=robot(w,0x529891);w.roomViews.court.root.add(this.runner.root,this.launcher.root);this.warning=w.box(18,.018,3.7,new THREE.MeshBasicMaterial({color:0xe98b4a,transparent:true,opacity:.35,depthWrite:false}),20,.035,0,w.roomViews.court.root);
  this.chevrons=new THREE.Group();w.roomViews.court.root.add(this.chevrons);this.chevrons.position.set(20,.075,0);const shape=new THREE.Shape();shape.moveTo(-.55,-.35);shape.lineTo(.05,-.35);shape.lineTo(.65,0);shape.lineTo(.05,.35);shape.lineTo(-.55,.35);shape.lineTo(.05,0);shape.closePath();for(let i=0;i<6;i++){const arrow=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0xffa25d,side:THREE.DoubleSide,toneMapped:false}));arrow.rotation.x=-Math.PI/2;arrow.position.set(-7.5+i*3,0,.4);this.chevrons.add(arrow);}
  this.partner=new THREE.Sprite(new THREE.SpriteMaterial({map:w.partnerTexture.clone(),transparent:true,alphaTest:.15,depthWrite:false,toneMapped:false}));this.partner.material.map.repeat.set(.25,1/3);this.partner.material.map.offset.set(0,2/3);this.partner.center.set(.5,.13);this.partner.scale.set(2.7,2.7,1);w.scene.add(this.partner);
  for(const [i,name]of ['ANTA · 阿跑','MAIA ACTIVE · 小麦'].entries()){const g=new THREE.Group();g.position.set(15+i*3,0,-2);w.roomViews.cafe.root.add(g);const t=w.partnerTexture.clone();t.repeat.set(.25,1/3);t.offset.set(i*.25,2/3);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,alphaTest:.1}));s.scale.set(2.3,2.3,1);s.position.y=1.3;g.add(s);label(w,g,name,0,3,3.7,'#e9deb6',0);}
  this.aim=w.box(1,.035,.035,glow(0xc1efdf),0,1.1,.7,w.scene);
 }
 update(state){
  const c=state.circuit,w=this.w,t=c.time;for(const [id,v]of Object.entries(w.roomViews)){if(!CIRCUIT_ROOMS[id])continue;
   const practice=v.interact.get('practice');if(practice)practice.visible=c.launcherWon;
   for(const p of c.rooms[id].platforms){const mesh=v.floorMeshes.get(p.id);if(mesh)mesh.position.y=p.y;}
   for(const gate of v.gates){const open=gate.id==='pool-entry'?c.target:gate.id==='court-entry'?c.poolCrossed:gate.id==='cafe-entry'?c.launcherWon:['gym-cafe','circuit-shortcut'].includes(gate.id)?c.shortcut:true;gate.curtain.visible=!open;}
   if(v.ball){const shown=id==='energy'?c.run&&!c.target:id==='pool'?!c.poolSwitch:!c.courtGate;v.ball.visible=shown&&!(state.roomId===id&&c.shots.length);v.ball.rotation.z=t;v.target.children[0].material.color.set(shown?0xf1ce8e:0x8be3c4);}
  }
  const gym=w.roomViews.energy;gym.belt.forEach((mesh,i)=>mesh.position.x=7+(i*.7+t*2.2)%7);gym.charge.scale.x=Math.max(.01,c.runTime/1.1);gym.medal.visible=!c.medal;gym.medal.rotation.y=Math.sin(t)*.25;gym.medal.position.y=6.6+Math.sin(t*2)*.12;gym.spring.visible=c.purchases.includes('springDeck');
  const pool=w.roomViews.pool;pool.water.position.y=-3.25+c.water*3.25;pool.ripples.forEach((mesh,i)=>{mesh.position.y=pool.water.position.y+.015;mesh.scale.x=.65+Math.sin(t*1.6+i)*.25;mesh.position.x=10.5+(i%5)*3.5+Math.sin(t+i)*.3;});
  w.roomViews.cafe.restCorner.visible=c.purchases.includes('restCorner');w.roomViews.court.courtGate.visible=!c.courtGate;
  const e=c.enemy,runner=c.phase==='runner';this.runner.root.visible=runner;this.launcher.root.visible=c.phase==='launcher'||c.phase==='intermission';const active=runner?this.runner:this.launcher;active.root.position.set(e.x,0,.7);active.root.rotation.y=runner&&e.face>0?Math.PI:0;active.head.rotation.z=e.state==='windup'?Math.sin(t*8)*.08:0;active.core.rotation.y=t*2;active.shield.visible=!runner;active.bar.scale.x=Math.max(.02,e.hp/e.maxHP);this.warning.visible=runner&&e.state==='windup';this.warning.material.opacity=.26+Math.sin(t*14)*.12;this.chevrons.visible=this.warning.visible;this.chevrons.rotation.y=e.face>0?0:Math.PI;
  while(this.shots.length<c.shots.length){const m=new THREE.Mesh(new THREE.SphereGeometry(.28,20,12),glow(0xffd194));w.scene.add(m);this.shots.push(m);}
  this.shots.forEach((m,i)=>{const b=c.shots[i];m.visible=!!b;if(b){m.position.set(b.x,b.y,1);m.material.color.set(b.owner==='player'?0xa2f4d1:0xffbc73);}});
  const follow=!!c.partner&&!!CIRCUIT_ROOMS[state.roomId]&&state.roomId!=='cafe';this.partner.visible=follow;if(follow){this.partner.position.set(state.player.x-state.player.facing*2.1,Math.max(0,state.player.y)+.2,-1);this.partner.material.map.offset.x=c.partner==='ANTA'?0:.25;}
  const spawn=trainingBall[state.roomId],returning=state.roomId==='court'&&c.phase==='launcher';this.aim.visible=c.partner==='ANTA'&&(returning||!!spawn&&(state.roomId==='energy'?!c.target:state.roomId==='pool'?!c.poolSwitch:!c.courtGate));if(this.aim.visible){const left=returning?state.player.x:spawn.x,right=returning?29:spawn.target;this.aim.position.set((left+right)/2,1.1,.7);this.aim.scale.x=Math.max(.1,right-left);}
 }
}
