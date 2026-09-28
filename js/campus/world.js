import {makeEquipmentWorld} from '../equipment/world.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {makeArrivalRoom,attachArrivalBuilding,updateArrival} from '../arrival/world.js';
import {CIRCUIT_ROOMS} from '../circuit/content.js';
import {makeCircuitRoom,CircuitView} from '../circuit/world.js';
import {CombatView} from './combat-view.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GuardianView} from './guardian-view.js';
import {CampusCeremony} from './ceremony.js';
import {COINS} from './economy.js';
import * as THREE from 'three';
import {MetroidWorld} from '../metroid/world.js';
import {CAMPUS_ROOMS,SITES,WALK_POINTS,SAMPLES,BRANDS} from './content.js';
import {waterConnected} from './state.js';
const V=THREE.Vector3;
const mat=(color,metalness=.3,roughness=.38)=>new THREE.MeshStandardMaterial({color,metalness,roughness});

export class CampusWorld extends MetroidWorld{
 constructor(canvas){super(canvas,{rooms:CAMPUS_ROOMS});this.markers=[];this.siteLights=[];this.brandPods=[];this.valves=[];this.liveMaterials=[];}
 makeRoom(id,r){if(id==='arrival')return makeArrivalRoom(this,id,r);if(CIRCUIT_ROOMS[id])return makeCircuitRoom(this,id,r);return super.makeRoom(id,r);}
 label(text,width,height,color,parent){
  const mesh=super.label(text,width,height,color,parent),cv=document.createElement('canvas');cv.height=160;cv.width=Math.min(4096,Math.max(256,Math.ceil(160*width/height)));const ctx=cv.getContext('2d');ctx.font='600 108px "PingFang SC","Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color||'#e9f1e3';ctx.fillText(text,cv.width/2,cv.height*.52,cv.width-20);const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;mesh.material.map.dispose();mesh.material.map=texture;mesh.material.depthWrite=false;mesh.userData.campusLabel=text;return mesh;
 }
 makeNetwork(){} // The story mode replaces the original ability-route diagram with the strategic hub.
 async load(report){
  await super.load(report);
  this.partnerTexture=await new THREE.TextureLoader().loadAsync('./assets/relay/team-atlas.png');this.partnerTexture.colorSpace=THREE.SRGBColorSpace;this.partnerTexture.magFilter=THREE.NearestFilter;
  this.warm=mat(0xc9a777,.78,.28);this.green=mat(0x718c6d,.16,.5);this.cream=mat(0xe8dfc9,.2,.62);
  this.makeTorch();this.makeGarden();this.makePartners();this.makeResearch();this.makeAbilityRoute();
  for(const [id,room,x,y,title] of [...WALK_POINTS,...SAMPLES]){
   const g=new THREE.Group();g.position.set(x,y,0);this.roomViews[room].root.add(g);
   const material=new THREE.MeshBasicMaterial({color:id.startsWith('walk')?0xf5ce86:0x94dce6,toneMapped:false});
   const ring=this.ring(.85,.045,material,0,.07,.3,g);this.ring(.64,.012,material,0,.07,.3,g);
   const s=this.sprite(this.pawTexture,.6,g);s.position.set(0,.34,.4);
   const t=this.label(title,2,.32,'#fff5d8',g);t.position.set(0,1.7,-.45);
   this.markers.push({id,ring,s,t,y});
  }
  for(const [room,r]of Object.entries(CAMPUS_ROOMS))for(const item of r.items){
   if(item.type!=='campus'||['shoe-shop','roots','finale','brand','power','water','innovation','dash-kit','venue','guardian'].includes(item.kind))continue;
   const g=this.roomViews[room].interact.get(item.id);
   this.box(.12,1.05,.14,this.warm,0,.55,-.65,g);this.box(1.35,.88,.15,this.cream,0,1.36,-.65,g);
   const t=this.label(item.label.replace('阅读：',''),2.5,.34,'#f6e3c0',g);t.position.set(0,2.28,-.65);
   const icon=this.label('i',.4,.4,'#8ee4db',g);icon.position.set(0,1.4,-.54);
  }
  attachArrivalBuilding(this,(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('./assets/arrival/anta-campus.glb')).scene);
  this.roomViews.hub.root.traverse(o=>{if(o.userData.campusLabel)o.visible=false;});
  this.equipmentView=await makeEquipmentWorld(this);
  this.guardianView=new GuardianView(this,await new GLTFLoader().loadAsync('./assets/guardian/gale-guardian.glb'));
  this.circuitView=new CircuitView(this);this.combatView=new CombatView(this);this.makeCoinTrail();this.makeVenueGate();this.ceremony=new CampusCeremony(this);this.modelsRefined=false;
 }
 makeCoinTrail(){
  this.coinViews=[];const gold=new THREE.MeshStandardMaterial({color:0xf4d594,metalness:.78,roughness:.28,emissive:0xa86818,emissiveIntensity:.23});
  for(const coin of COINS){const g=new THREE.Group();g.position.set(coin.x,coin.y,.4);this.roomViews[coin.room].root.add(g);const body=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.095,20),gold);body.rotation.x=Math.PI/2;g.add(body);const rim=new THREE.Mesh(new THREE.TorusGeometry(.25,.025,6,20),this.warm);rim.position.z=.06;g.add(rim);const paw=this.sprite(this.pawTexture,.34,g);paw.position.z=.085;this.coinViews.push({id:coin.id,g,y:coin.y});}
  this.venueLights=[];for(const [room,key]of [['hub','roots'],['lab','walk'],['core','innovation'],['gallery','brands'],['garden','green'],['arena','guardian']]){const m=new THREE.MeshBasicMaterial({color:0x5c766b});this.box(6,.09,.1,m,18,5.7,-3,this.roomViews[room].root);this.venueLights.push({m,key});}
 }
 makeVenueGate(){
  const root=this.roomViews.garden.root,g=new THREE.Group();g.position.set(32,0,-.2);root.add(g);
  for(const x of[-.4,.4]){this.box(.18,4.1,.6,this.cream,x,2.05,0,g);this.box(.06,3.8,.08,this.warm,x,2.05,.34,g);}
  this.venueBarrier=this.box(.64,3.8,.035,new THREE.MeshBasicMaterial({color:0xe9c282,transparent:true,opacity:.35,depthWrite:false}),0,2.1,.2,g);
  this.textAt('运动场馆 / 60 足迹币',-1,5.3,-.2,5,g);this.textAt('累计解锁 · 无需扣除',-1,4.65,-.2,4,g,'#d4e4c4');
  const term=this.roomViews.arena.interact.get('guardian');this.box(1.1,1.3,.8,this.cream,0,.65,-.5,term);this.box(.85,.4,.08,this.dark,0,1.25,-.05,term);this.textAt('F 开始 / 重试',0,2.35,0,3.5,term);
 }
 makeAbilityRoute(){
  const kit=this.roomViews.lab.interact.get('dash-kit');
  this.box(1.85,.3,1.5,this.cream,0,.15,-.45,kit);
  this.box(1.7,.055,1.4,this.warm,0,.33,-.45,kit);
  const glass=new THREE.MeshPhysicalMaterial({color:0x96d7c7,metalness:.12,roughness:.14,transparent:true,opacity:.18,depthWrite:false});
  const shell=new THREE.Mesh(new THREE.CylinderGeometry(.73,.73,1.9,32,1,true),glass);shell.position.set(0,1.3,-.45);kit.add(shell);
  for(const y of[.38,2.28])this.ring(.73,.045,this.warm,0,y,-.45,kit);
  this.dashCrystal=new THREE.Mesh(new THREE.OctahedronGeometry(.46,0),new THREE.MeshStandardMaterial({color:0xc7f2da,emissive:0x559c85,emissiveIntensity:.6,metalness:.55,roughness:.25}));this.dashCrystal.position.set(0,1.35,-.45);kit.add(this.dashCrystal);
  this.textAt('01 / 脉冲冲刺',0,3.1,-.45,3.8,kit);
  this.textAt('Shift · 越过光幕',0,2.65,-.45,3.4,kit,'#b5e5d1');
  const door=new THREE.Group();door.position.set(11.5,5.7,-1.6);this.roomViews.core.root.add(door);
  for(const x of[-1.55,1.55]){this.box(.19,3.9,.42,this.cream,x,1.95,0,door);this.box(.05,3.65,.08,this.warm,x,1.95,.25,door);}
  this.box(3.3,.22,.5,this.cream,0,4.05,0,door);
  this.labCurtain=new THREE.Mesh(new THREE.PlaneGeometry(2.9,3.75),new THREE.MeshBasicMaterial({color:0x8ddece,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide}));this.labCurtain.position.set(0,2,.1);door.add(this.labCurtain);
  this.textAt('A  N  T  A',0,4.8,0,4.3,door);
  this.textAt('寻找四枚字母 · 回声从这里开始',0,4.35,0,5,door,'#d3dab7');
  this.labLetters=[];for(let i=0;i<4;i++){const g=new THREE.Mesh(new THREE.CircleGeometry(.095,20),new THREE.MeshBasicMaterial({color:0x617c6c}));g.position.set((i-1.5)*.46,3.65,.16);door.add(g);this.labLetters.push(g);}
  const gate=new THREE.Group();gate.position.set(32,0,-.4);this.roomViews.hub.root.add(gate);this.hubBarrier=gate;
  for(const x of[-.4,.4])this.box(.12,4.2,.4,this.cream,x,2.1,0,gate);
  const curtain=new THREE.Mesh(new THREE.PlaneGeometry(.7,4),new THREE.MeshBasicMaterial({color:0xe4bc80,transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false}));curtain.position.set(0,2.1,.25);gate.add(curtain);
  this.textAt('回声双点同步后开放',-1.5,4.8,0,4.8,gate);
  const route=this.roomViews.hub.interact.get('hub-garden');this.textAt('花园侧供能开启',0,3.85,-.75,3.8,route,'#dec894');
 }
 tube(points,radius,material,parent){const curve=new THREE.CatmullRomCurve3(points.map(p=>new V(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,32,radius,8,false),material);mesh.castShadow=true;parent.add(mesh);return mesh;}
 textAt(text,x,y,z,width,parent,color='#f1dfba'){const t=this.label(text,width,.42,color,parent);t.position.set(x,y,z);return t;}
 makeTorch(){
  const root=this.roomViews.hub.root,g=new THREE.Group();g.position.set(24,0,-2.7);root.add(g);
  const stone=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.55,.42,48),this.cream);stone.position.y=.2;g.add(stone);
  for(let k=0;k<7;k++){
   const points=[];for(let j=0;j<=12;j++){const y=.4+j*.48,a=k*Math.PI*2/7+j*.11,r=.4+Math.pow(j/12,3)*1.28;points.push([Math.cos(a)*r,y,Math.sin(a)*r]);}
   this.tube(points,.105,this.warm,g);
  }
  const flameMat=new THREE.MeshStandardMaterial({color:0xffd491,emissive:0xffb649,emissiveIntensity:.12,roughness:.27,metalness:.25});
  const flame=new THREE.Mesh(new THREE.IcosahedronGeometry(.64,2),flameMat);flame.scale.set(.7,1.65,.7);flame.position.set(0,6.15,0);g.add(flame);this.flame=flame;
  this.torchLight=new THREE.PointLight(0xffc074,0,13,2);this.torchLight.position.set(24,5,-1);root.add(this.torchLight);
  this.textAt('万步之光',0,7.9,0,4,g);this.textAt('五枚印章 · 点亮同一束光',0,7.3,0,5,g,'#e3e8d4');
  // Three architectural miniatures are a symbolic collaboration network, not a site plan.
  const network=new THREE.Group();network.position.set(15.6,2.3,-2.5);root.add(network);
  this.box(9.5,.45,2.7,this.cream,0,.35,0,network);this.box(9.3,.045,2.6,this.warm,0,.6,0,network);
  for(let i=0;i<3;i++){
   const x=-3.1+i*3.1,light=new THREE.MeshBasicMaterial({color:0x59706b,toneMapped:false});
   for(let j=0;j<3;j++){
    const h=1.5+(i+j)%3*.38;this.box(.64,h,.85,this.cream,x+(j-1)*.7,.65+h/2,-.15,network);
    for(let y=.9;y<h+.5;y+=.3)this.box(.53,.055,.018,light,x+(j-1)*.7,y,.292,network);
   }
   this.ring(.92,.035,light,x,.69,.2,network);this.siteLights.push(light);
   this.textAt(SITES[i][1],x,3.15,.1,2.9,network);
  }
  this.sitePath=this.tube([[-3.1,.72,1],[0,.72,1.15],[3.1,.72,1]],.025,new THREE.MeshBasicMaterial({color:0xb99761,toneMapped:false}),network);
  this.textAt('一个总部 · 两个中心',0,4.6,-.2,8,network);
  this.textAt('扎根中国  /  赋能全球',0,4,-.2,7,network,'#d6e6d6');
  const globe=new THREE.Group();globe.position.set(5,4.5,-4.9);root.add(globe);
  const goldLine=new THREE.MeshBasicMaterial({color:0xc3a16a,transparent:true,opacity:.5,toneMapped:false});
  for(let i=0;i<5;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(2.35,.018,6,72),goldLine);r.rotation.y=i*Math.PI/5;globe.add(r);}
  for(const y of[-1.6,-.8,0,.8,1.6]){const r=new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(2.35**2-y*y),.018,6,72),goldLine);r.rotation.x=Math.PI/2;r.position.y=y;globe.add(r);}
  this.textAt('从中国，走向世界',0,-3,.1,5,globe);
 }
 makeResearch(){
  const root=this.roomViews.core.root,g=this.roomViews.core.interact.get('innovation');
  this.prop(this.benchModel,3.6,0,0,-.5,g);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.75,.035,8,48),this.cyan);ring.position.set(0,2,-.45);g.add(ring);this.researchRing=ring;
  this.textAt('汇聚运动信号',0,3.1,-.45,3.6,g,'#c6f0e5');
  const points=[['中国',4,9],['美国',10,10],['日本',16,9.6],['韩国',22,9.4],['欧洲',28,8.9]];
  const gold=new THREE.MeshBasicMaterial({color:0xb8bd8c,transparent:true,opacity:.8});
  this.tube(points.map(([,x,y])=>[x,y,-5.3]),.022,gold,root);
  for(const [text,x,y]of points){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),gold);mesh.position.set(x,y,-5.3);root.add(mesh);this.textAt(text,x,y+.55,-5.3,2.2,root);}
 }
 makePartners(){
  const root=this.roomViews.gallery.root,colors=[0xd05246,0x465d83,0x769bad,0x829a65];
  BRANDS.forEach((b,i)=>{
   const g=this.roomViews.gallery.interact.get('brand-'+i),material=mat(colors[i],.32,.32);
   this.box(2.1,.45,1.7,this.cream,0,.23,-.8,g);
   this.box(1.9,.05,1.5,material,0,.48,-.8,g);
   const texture=this.partnerTexture.clone();texture.repeat.set(.25,1/3);texture.offset.set(i*.25,2/3);texture.needsUpdate=true;
   const partner=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.15,depthWrite:true,toneMapped:false}));partner.center.set(.5,.13);partner.scale.set(2.8,2.8,1);partner.position.set(0,.8,-.7);g.add(partner);
   const ring=this.ring(.85,.04,new THREE.MeshBasicMaterial({color:0x697972}),0,.5,-.8,g);
   this.textAt(String(i+1).padStart(2,'0')+'  '+b,0,3.6,-.7,3.8,g);this.brandPods.push({ring,partner,texture,x:[6,12,20,27][i]});
  });
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.31,24,16),mat(0xd89f63,.15,.56));root.add(ball);this.storyBall=ball;
  const seamMaterial=mat(0x5a4836,.1,.7);for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.313,.012,6,40),seamMaterial);ring.rotation.set(i===1?Math.PI/2:0,i===2?Math.PI/2:0,0);ball.add(ring);}
  this.textAt('共创接力 · 每一棒都有自己的力量',16,7.6,-3.5,13,root);
 }
 makeGarden(){
  const root=this.roomViews.garden.root,waterMat=mat(0x79b8bc,.6,.25),powerMat=mat(0xc3a263,.75,.3);
  const pg=this.roomViews.garden.interact.get('power');
  this.box(1.8,1.55,1.1,this.cream,0,.78,-.9,pg);this.box(1.5,.7,.06,this.dark,0,1.09,-.3,pg);
  this.powerLamp=new THREE.Mesh(new THREE.CircleGeometry(.22,32),new THREE.MeshBasicMaterial({color:0x6a7066}));this.powerLamp.position.set(0,1.1,-.25);pg.add(this.powerLamp);
  this.textAt('绿色能源',0,2.5,-.5,2.8,pg);
  const g=this.roomViews.garden.interact.get('water');g.position.z=-1.65;
  this.box(4.3,3,.26,this.cream,0,1.6,-.42,g);
  const positions=[[-1.15,1],[.35,1],[.35,2.5]];
  positions.forEach(([x,y],i)=>{
   const tile=new THREE.Group();tile.position.set(x,y,-.16);g.add(tile);
   this.box(1.2,1.2,.13,this.dark,0,0,-.1,tile);
   const pipe=new THREE.Group();tile.add(pipe);
   if(i===0)this.tube([[-.6,0,0],[0,0,0],[.6,0,0]],.07,waterMat,pipe);
   else this.tube([[0,.6,0],[0,.14,0],[.14,0,0],[.6,0,0]],.07,waterMat,pipe);
   const valve=new THREE.Mesh(new THREE.TorusGeometry(.2,.025,7,24),powerMat);valve.position.z=.08;tile.add(valve);this.valves.push(pipe);
  });
  this.tube([[-2.1,1,-.16],[-1.75,1,-.16]],.075,waterMat,g);
  this.tube([[.95,2.5,-.16],[1.65,2.5,-.16],[1.65,.2,-.16]],.075,waterMat,g);
  this.textAt('水资源循环',0,3.65,-.2,3.7,g);
  this.tube([[13,-.5,2.2],[17,-.5,2.2],[22,-.5,2.2]],.027,powerMat,root);
  this.waterDots=[];for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.065,8,6),new THREE.MeshBasicMaterial({color:0xb1f4ed}));root.add(m);this.waterDots.push(m);}
 }
 updateTelemetry(dt,state,view){
  if(!view.root.userData.screens)return;this.telemetryClock+=dt;if(this.telemetryClock<.35&&view.root.userData.screens[0]?.ready)return;this.telemetryClock=0;
  for(const screen of view.root.userData.screens){
   const c=screen.cv.getContext('2d');c.fillStyle='#172f32';c.fillRect(0,0,900,570);
   c.fillStyle='#adbc98';c.font='24px Arial';c.fillText('ANTA  /  INNOVATION NETWORK',48,65);
   c.fillStyle='#edf1d4';c.font='48px "PingFang SC"';c.fillText(state.roomId==='core'?'让运动，成为灵感':'健康工作，万步联动',48,155);
   c.strokeStyle='#83b6a9';c.lineWidth=3;c.beginPath();for(let x=0;x<800;x+=4){const y=305+Math.sin(x*.022+this.tick)*Math.min(65,12+Math.abs(state.player.vx)*7);x===0?c.moveTo(x+50,y):c.lineTo(x+50,y);}c.stroke();
   c.fillStyle='#ddc598';c.font='27px "PingFang SC"';c.fillText(state.roomId==='core'?`发现 · 验证 · 共创     ${state.samples.size} / 3`:'水平连廊 × 垂直中庭 × 空中花园',48,470);screen.tex.needsUpdate=true;screen.ready=true;
  }
 }
 render(){if(this.combatState){const s=this.combatState;this.slash.visible=false;this.combatView?.update(s);const front=s.roomId==='arrival';this.sun.intensity=front?3.1:3.8;this.scene.background.set(front?0xd1d7c4:0xc6cfc4);this.architecture.visible=!front;this.foreground.visible=!front;this.dof.blurScale=front?.32:.75;this.renderer.toneMappingExposure=front?.84:.88;
   if(front){const aspect=innerWidth/innerHeight,p=s.player,overview=this.arrivalOverview;const width=overview?Math.max(150,70*aspect):aspect<1?19:42;this.setFrustum(width/aspect);const focus=overview?new V(51,18,-21):new V(THREE.MathUtils.clamp(p.x+4,17,90),Math.max(3.5,p.y+2.5),-1);this.camera.position.copy(focus).add(overview?new V(11,28,65):new V(0,9.5,34));this.camera.lookAt(focus);this.camera.updateMatrixWorld();this.dof.focusDistance=-new V(p.x,p.y+1,0).applyMatrix4(this.camera.matrixWorldInverse).z;this.dof.update(0,overview?focus:new V(p.x,p.y+1,0),true,this.renderer.getPixelRatio());this.dof.uniforms.focusBand.value=overview?40:13;this.dof.uniforms.farFalloff.value=100;this.sun.position.set(focus.x-20,38,25);this.sun.target.position.set(focus.x,0,-12);this.sun.target.updateMatrixWorld();}
  }super.render();}
 updateExpedition(dt,state){
  this.combatState=state;updateArrival(this,state);
  if(this.ceremonyTime!==undefined){this.ceremony.render(this.ceremonyTime);return;}
  if(this.ready&&this.flame){
   this.equipmentView?.update(dt,state);this.circuitView.update(state);this.guardianView.update(dt,state);this.venueBarrier.visible=!state.venueUnlocked;
   for(const c of this.coinViews){c.g.visible=!state.coins.has(c.id);c.g.position.y=c.y+Math.sin(this.tick*2+c.y)*.07;c.g.rotation.y=Math.sin(this.tick*1.5)*.45;}
   for(const lamp of this.venueLights)lamp.m.color.set(state.finished||lamp.key==='guardian'&&state.guardianWon||state.stamps.includes(lamp.key)?0xffd798:0x5c766b);
   this.dashCrystal.visible=!state.progress.dash;this.dashCrystal.rotation.y+=dt;
   this.labCurtain.material.opacity=state.innovation?.08:state.progress.doubleJump?.3:.12;this.labLetters.forEach(m=>m.material.color.set(state.innovation?0xcce8a1:state.progress.doubleJump?0xdac58d:0x617c6c));
   this.hubBarrier.visible=!state.progress.relayOpen;
   this.flame.material.emissiveIntensity=state.finished?2.4:.12+state.stamps.length*.13;this.flame.rotation.y+=dt*.5;this.torchLight.intensity=state.finished?12:state.stamps.length*.5;
   this.siteLights.forEach((m,i)=>m.color.set(state.sites.has(SITES[i][0])?0xf0cc86:0x59706b));
   for(const m of this.markers){const done=state.walks.has(m.id)||state.samples.has(m.id);m.ring.material.color.set(done?0x98e0bd:m.id.startsWith('walk')?0xf5ce86:0x94dce6);m.s.visible=!done;}
   this.powerLamp.material.color.set(state.power?0xeed388:0x6a7066);
   this.valves.forEach((m,i)=>m.rotation.z=-state.turns[i]*Math.PI/2);
   this.brandPods.forEach((p,i)=>{const done=i<state.brandStep;p.ring.material.color.set(done?0xa9e8bd:0x697972);p.texture.offset.y=done?0:2/3;p.partner.position.y=.8+(done?Math.max(0,Math.sin(this.tick*4+i))*.05:0);});
   const n=state.brandStep,from=n===0?6:this.brandPods[n-1].x,to=n===4?31:this.brandPods[n].x,t=n===0?1:1-state.passTime/.85;
   this.storyBall.position.set(THREE.MathUtils.lerp(from,to,t),1.2+Math.sin(t*Math.PI)*2.2,.4);this.storyBall.rotation.z-=dt;
   this.researchRing.rotation.y+=dt*.5;
   const flowing=state.power&&waterConnected(state.turns);this.waterDots.forEach((m,i)=>{m.visible=flowing;const t=(this.tick*.18+i/10)%1;m.position.set(22-7*t,-.28,2.28);});
  }
  super.updateExpedition(dt,state);
 }
}
