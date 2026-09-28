import {droneTexture} from '../drone-model.js';
import {deckDetails,craftBench} from '../model-quality.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {PortalWorld} from '../portal/world.js';
import {SportsWorld,roundedDeck} from '../sports/world.js';
import {PixelCorgi} from '../character.js';
import {loadBrand} from '../brand.js';
import {ROOMS} from './map.js';
import {InteractivePond} from '../interactive-water.js';
const V=THREE.Vector3;
export class MetroidWorld extends PortalWorld{
 constructor(canvas,{rooms=ROOMS}={}){
  super(canvas);this.rooms=rooms;this.roomViews={};this.currentRoom=null;this.stone=this.ivory;this.treeTexture=null;this.scene.background.set(0xc6cfc4);
  this.renderer.setPixelRatio(1);this.renderer.toneMappingExposure=.88;this.sun.intensity=3.8;this.bloom.strength=.19;this.dof.blurScale=.9;this.dof.enabled=true;
  this.cameraOffset.set(0,5.8,32);this.particles=[];this.enemyViews=new Map();this.waveViews=[];this.flash=0;this.telemetry=[];this.telemetryClock=0;
 }
 async load(report=()=>{}){
  const gl=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),tl=new THREE.TextureLoader();let n=0;const done=x=>{report(++n/9);return x;};
  const [dog,building,tree,paw,drone,bench,projector,interior]=await Promise.all([
   gl.loadAsync('./assets/corgi-sports.glb').then(done),gl.loadAsync('./assets/lab/anta-centre-mini.glb').then(done),tl.loadAsync('./assets/golden-planter.png').then(done),tl.loadAsync('./assets/sports-energy-paw.png').then(done),tl.loadAsync('./assets/metroid/training-drone.png').then(done),gl.loadAsync('./assets/lab/test-bench.glb').then(done),gl.loadAsync('./assets/lab/light-projector.glb').then(done),tl.loadAsync('./assets/metroid/office-interior.png').then(done),loadBrand(this).then(done)
  ]);
  for(const t of[tree,paw,drone]){t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;}drone.magFilter=THREE.NearestFilter;this.tree=this.treeTexture=tree;this.pawTexture=paw;this.droneTexture=drone;this.benchModel=bench.scene;this.projectorModel=projector.scene;
  interior.colorSpace=THREE.SRGBColorSpace;interior.wrapS=interior.wrapT=THREE.RepeatWrapping;interior.anisotropy=8;this.interiorTexture=interior;
  this.building=building.scene;this.dressBuilding();this.architecture.position.set(16,-14.5,-60);this.architecture.scale.multiplyScalar(.95);this.architecture.rotation.y=.45;this.enrichWindows();this.glass.opacity=.12;
  const pm=new THREE.PMREMGenerator(this.renderer);this.scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;this.scene.environmentIntensity=.26;pm.dispose();
  for(const [id,r]of Object.entries(this.rooms))this.makeRoom(id,r);
  this.dog=new PixelCorgi(this,dog);this.dog.sprite.scale.set(3.5,3.5,1);this.dog.render();
  this.echoDog=new PixelCorgi(this,dog,{echo:true});this.echoDog.sprite.scale.set(3.5,3.5,1);this.echoDog.render();this.echoDog.visible=false;
  this.echoHalo=this.ring(1.15,.045,this.cyan,0,.05,0);this.echoHalo.visible=false;
  const traceGeometry=new THREE.BufferGeometry();traceGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(400*3),3));traceGeometry.setDrawRange(0,0);
  this.echoTrace=new THREE.Line(traceGeometry,new THREE.LineBasicMaterial({color:0x9bedd5,transparent:true,opacity:.5,toneMapped:false,depthWrite:false}));this.echoTrace.frustumCulled=false;this.scene.add(this.echoTrace);
  this.pond=new InteractivePond(this);this.pond.center.set(17,-.45,5.1);this.pond.group.position.copy(this.pond.center);this.pond.plane.constant=-(this.pond.center.y+.145);this.roomViews.garden.root.add(this.pond.group);this.pondClock=0;for(const x of[15.1,18.9])this.box(.18,.27,4.1,this.metal,x,-.64,3.15,this.roomViews.garden.root);
  this.makeEffects();this.makeForeground();this.ready=true;
 }
 enrichWindows(){
  const floorHeight=4.5*this.architecture.scale.x;
  this.building.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!/glass|curtain/.test((m.name+' '+o.name).toLowerCase())||m.transparent)continue;
   m.onBeforeCompile=s=>{s.uniforms.officeTexture={value:this.interiorTexture};s.uniforms.officeFloor={value:floorHeight};s.vertexShader='varying vec3 officePosition;varying vec3 officeNormal;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nofficePosition=(modelMatrix*vec4(position,1.)).xyz;officeNormal=normalize(mat3(modelMatrix)*objectNormal);');s.fragmentShader='varying vec3 officePosition;varying vec3 officeNormal;uniform sampler2D officeTexture;uniform float officeFloor;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat along=abs(officeNormal.x)>abs(officeNormal.z)?officePosition.z:officePosition.x;vec3 office=texture2D(officeTexture,vec2(along/(officeFloor*4.2),(officePosition.y+14.5)/officeFloor)).rgb;diffuseColor.rgb=office*.6;');s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=office*.65;');};m.customProgramCacheKey=()=> 'metroid-lit-offices';m.needsUpdate=true;
  }});
 }
 sprite(texture,size,parent,color=0xffffff){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.12,depthWrite:true,toneMapped:false,color}));s.scale.set(size,size,1);parent.add(s);return s;}
 gardenBed(group,width){SportsWorld.prototype.gardenBed.call(this,group,width);group.children.at(-1).material.color.set(0x93ab72);}
 prop(model,width,x,y,z,parent){const g=model.clone(true),box=new THREE.Box3().setFromObject(g),sz=box.getSize(new V()),c=box.getCenter(new V()),s=width/sz.x;g.position.set(-c.x*s,-box.min.y*s,-c.z*s);g.scale.setScalar(s);const wrapper=new THREE.Group();wrapper.add(g);wrapper.position.set(x,y,z);parent.add(wrapper);return wrapper;}
 makeRoom(id,r){
  const root=new THREE.Group();root.visible=false;this.scene.add(root);const v={root,pickups:[],interact:new Map(),caches:[],decor:[]};this.roomViews[id]=v;
  // Real three-dimensional terrace geometry shares the game's collision edges.
  for(const p of r.platforms){
   const w=p.right-p.left,g=new THREE.Group();g.position.set((p.left+p.right)/2,p.y,0);root.add(g);g.add(roundedDeck(w,4.2,.8,this.ivory));deckDetails(g,w);
   this.box(w-.25,.045,.045,this.gold,0,-.07,2.16,g);this.box(w-.25,.04,.045,this.cyan,0,-.63,2.13,g);
   this.box(w-.3,.055,.055,this.metal,0,1.0,-1.72,g);this.box(w-.35,.86,.025,this.glass,0,.53,-1.72,g);
   for(let x=-w/2+.3;x<w/2;x+=2.1)this.box(.035,.96,.055,this.metal,x,.48,-1.73,g);
   if(w>5){this.gardenBed(g,w);for(const x of[-w/2+1.3,w/2-1.3]){const t=SportsWorld.prototype.tree.call(this,x,0,-2.2,r.theme==='garden'?4.2:3.2);g.add(t);}}
   for(const x of[-w*.32,w*.32]){this.box(.4,7,.55,this.ivory,x,-4.1,-1,g);this.box(.68,.15,.7,this.metal,x,-1.1,-1,g);}
   for(let x=-w/2+1.7;x<w/2-1;x+=2.8){this.box(.34,.015,.06,this.cyan,x,.028,.55,g);}
  }
  this.backdrop(r,root);
  for(const i of r.items){
   const g=new THREE.Group();g.position.set(i.x,i.y,0);root.add(g);v.interact.set(i.id,g);
   if(i.type==='bench'){craftBench(g);
    for(const x of[-.95,.95])this.box(.15,.6,.6,this.dark,x,.3,-.35,g);
    this.box(2.65,.2,.9,this.ivory,0,.66,-.35,g);this.box(2.55,.12,.12,this.cyan,0,.71,.15,g);this.box(2.65,.8,.16,this.dark,0,1.13,-.77,g);this.box(2.48,.055,.05,this.cyan,0,1.5,-.67,g);
    const label=this.label('恢复点',2.2,.4,'#b9f7f8',g);label.position.set(0,2.55,-.55);
    const s=this.sprite(this.pawTexture,.65,g);s.position.set(0,1.97,-.55);
   }else if(i.type==='ability'||i.type==='double-jump'){
    this.prop(this.benchModel,3.9,0,0,-.7,g);const s=this.sprite(this.pawTexture,1.2,g);s.position.set(0,2.15,.1);v.ability=s;v.abilityKey=i.type==='double-jump'?'doubleJump':'dash';const ring=new THREE.Mesh(new THREE.TorusGeometry(.83,.035,8,48),this.cyan);ring.position.copy(s.position);g.add(ring);v.moduleRing=ring;
    const label=this.label(i.type==='double-jump'?'回弹二段跳':'脉冲冲刺',2.7,.45,'#c9fbff',g);label.position.set(0,3.3,-.4);
   }else if(i.type.includes('lift')||i.type.includes('shortcut')){
    this.box(2.7,.13,2.7,this.dark,0,.02,0,g);this.ring(1.1,.04,this.cyan,0,.105,0,g);
    for(const x of[-1.2,1.2]){this.box(.09,3.3,.11,this.metal,x,1.65,-1.05,g);this.box(.035,3.1,.04,this.cyan,x,1.65,-.97,g);}
    this.box(2.5,.15,.15,this.dark,0,3.3,-1.05,g);const label=this.label(i.type.includes('shortcut')?'大堂捷径':'花园升降台',3,.45,'#bff6fa',g);label.position.set(0,3.8,-1.05);
   }else if(i.type==='tech-room'||i.type==='echo-route'||i.type==='echo-back'){
    const gate=new THREE.Group();gate.position.z=-.75;g.add(gate);
    for(const x of[-1.25,1.25]){this.box(.17,3.1,.42,this.ivory,x,1.55,0,gate);this.box(.04,2.9,.05,this.cyan,x,1.55,.24,gate);}
    this.box(2.7,.2,.5,this.dark,0,3.15,0,gate);this.ring(1.1,.045,this.gold,0,.05,0,g);
    const material=new THREE.MeshBasicMaterial({color:0x7ed9cd,transparent:true,opacity:.25,toneMapped:false,side:THREE.DoubleSide,depthWrite:false});
    const curtain=this.box(2.3,2.95,.035,material,0,1.5,.08,gate);curtain.castShadow=false;v.portalDoors??=[];v.portalDoors.push({curtain,type:i.type,gate});
    for(let k=0;k<9;k++)this.box(.035,.035,.03,this.cyan,-.8+k*.2,.6+(k%3)*.27,.14,gate);
    const label=this.label(i.type==='tech-room'?'ANTA 科技密室':i.type==='echo-back'?'← 水平连廊':'空中花园 ↗',3.9,.42,'#d4f4e3',g);label.position.set(0,3.85,-.68);
    const sub=this.label(i.type==='tech-room'?'发现 · 解锁 · 回声项圈':'双点同步 / ECHO LINK',3.6,.28,'#c8d8bd',g);sub.position.set(0,3.45,-.64);
   }else if(i.type==='route'){
    this.box(2.6,.1,2.4,this.dark,0,.02,0,g);this.ring(1,.025,this.cyan,0,.10,0,g);
    this.box(.1,2.6,.1,this.metal,-1.25,1.3,-.9,g);this.box(.08,2.4,.06,this.cyan,-1.24,1.3,-.83,g);
    this.box(2.6,.15,.18,this.dark,0,2.65,-.9,g);const label=this.label(i.label.replace('前往','').replace('返回','← '),3.4,.42,'#d3f2e2',g);label.position.set(0,3.2,-.8);
    if(i.requires==='doubleJump'){const sub=this.label('回弹模块 ↑↑',2.6,.32,'#ebc58c',g);sub.position.set(0,3.8,-.8);}
   }else if(i.type==='cache'){
    this.box(2.7,.55,1.65,this.ivory,0,.27,-.25,g);this.box(2.4,1.25,1.35,this.glass,0,1.16,-.25,g);
    this.box(2.7,.13,1.65,this.dark,0,1.86,-.25,g);this.box(2.45,.055,.06,this.gold,0,1.91,.62,g);
    const module=new THREE.Mesh(new THREE.OctahedronGeometry(.45),new THREE.MeshStandardMaterial({color:i.gear==='echo'?0xf2c178:0xb4b9fc,emissive:0x594536,emissiveIntensity:.3,metalness:.6,roughness:.25}));module.position.set(0,1.25,-.15);g.add(module);v.caches.push({module,id:i.gear});
    const label=this.label('共创模块 / FIELD KIT',3.2,.33,'#e9dcc3',g);label.position.set(0,2.55,-.2);
   }else if(i.type==='note'){
    this.box(.09,1.1,.09,this.metal,0,.55,-.7,g);this.box(1.1,.85,.10,this.dark,0,1.4,-.7,g);const label=this.label('中心档案',.96,.22,'#c9f5f9',g);label.position.set(0,1.48,-.63);this.box(.8,.025,.015,this.cyan,0,1.15,-.63,g);
   }else if(i.type==='finish'){
    this.prop(this.projectorModel,2.8,0,0,-1,g);this.ring(2.2,.045,this.gold,0,.03,0,g);
    const sphere=new THREE.Mesh(new THREE.SphereGeometry(1.7,24,16),new THREE.MeshBasicMaterial({color:0x75efff,wireframe:true,transparent:true,opacity:.3,toneMapped:false}));sphere.position.set(0,4,-1.1);g.add(sphere);v.globe=sphere;
    const label=this.label('扎根中国 · 赋能全球',5,.48,'#dbffff',g);label.position.set(0,6.2,-1.1);
   }
  }
  for(const c of r.chips){const s=this.sprite(this.pawTexture,.7,root);s.position.set(c.x,c.y,.1);v.pickups.push({s,c});}
  if(r.heart){const s=this.sprite(this.pawTexture,1.1,root,0xffb578);s.position.set(r.heart.x,r.heart.y,0);v.heart=s;const t=this.label('体力 +1',2,.4,'#ffd6a6',root);t.position.set(r.heart.x,r.heart.y+1,0);v.heartLabel=t;}
  if(r.gate){
   const g=new THREE.Group();g.position.set(r.gate.x,0,0);root.add(g);v.gate=g;
   for(const x of[-.4,.4]){this.box(.2,5.4,.75,this.dark,x,2.7,-.1,g);this.box(.065,5.2,.08,this.cyan,x,2.7,.32,g);}this.box(1.1,.16,.85,this.metal,0,5.35,-.1,g);
   const curtain=new THREE.Mesh(new THREE.PlaneGeometry(.65,5.15),new THREE.MeshBasicMaterial({color:0x8cf3ff,transparent:true,opacity:.45,side:THREE.DoubleSide,toneMapped:false}));curtain.position.set(0,2.66,.37);g.add(curtain);v.curtain=curtain;
   for(let y=.4;y<5.3;y+=.45)this.box(.6,.03,.04,this.cyan,0,y,.4,g);
   const label=this.label('需要冲刺',3,.4,'#bff7fb',g);label.position.set(0,5.95,.1);v.gateLabel=label;
  }
  if(r.wall){
   const g=new THREE.Group();g.position.set(r.wall.x,0,0);root.add(g);v.wall=g;
   this.box(.7,r.wall.height,3.5,this.ivory,0,r.wall.height/2,0,g);
   this.box(.75,r.wall.height,.1,this.dark,0,r.wall.height/2,1.8,g);
   const points=[new V(-.15,0,1.87),new V(.16,1.0,1.87),new V(-.19,1.8,1.87),new V(.21,2.7,1.87),new V(-.05,4,1.87),new V(.2,5.2,1.87),new V(-.2,6.5,1.87),new V(.1,8,1.87)];
   g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xffd491,toneMapped:false})));
   const label=this.label('异常回声 · J',3,.45,'#ffd99c',g);label.position.set(-1.3,3.4,1.9);v.wallLabel=label;
  }
  if(r.trial){
   const seal=new THREE.Group();root.add(seal);seal.position.set(6,0,0);v.seal=seal;
   const sealMaterial=new THREE.MeshBasicMaterial({color:0xffb759,transparent:true,opacity:.7,toneMapped:false});for(let y=.2;y<6;y+=.4)this.box(.16,.05,4,sealMaterial,0,y,0,seal);
   const label=this.label('训练进行中',3.5,.45,'#ffd59e',seal);label.position.set(0,5.7,.2);seal.visible=false;
  }
  if(r.relay)this.makeRelay(r,v);
  if(id==='hub')this.makeNetwork(v);
  // Readable directional signage sits behind the character plane.
  const left=r.exits.left?'← '+this.rooms[r.exits.left.room].name:'';
  const right=r.exits.right?this.rooms[r.exits.right.room].name+' →':'';
  if(left){const t=this.label(left,4.4,.48,'#c8f4f2',root);t.position.set(2.7,2.7,-2.4);}
  if(right){const t=this.label(right,4.4,.48,'#c8f4f2',root);t.position.set(r.width-3.6,2.7,-2.4);}
 }
 makeRelay(room,view){
  const root=view.root;view.pads=[];
  room.relay.pads.forEach((p,i)=>{
   const g=new THREE.Group();g.position.set(p.x,p.y,.5);root.add(g);
   const base=new THREE.Mesh(new THREE.CylinderGeometry(1.17,1.24,.075,48),this.dark);base.position.y=.028;g.add(base);
   const material=new THREE.MeshBasicMaterial({color:0xa98f63,toneMapped:false});
   const ring=this.ring(1.07,.085,material,0,.082,0,g);this.ring(.84,.018,material,0,.083,0,g);
   const paw=this.sprite(this.pawTexture,.63,g);paw.position.set(0,.21,.25);paw.material.color.set(0xffd59b);paw.material.depthWrite=false;
   const label=this.label('0'+(i+1)+' / '+(i===0?'记录足迹':'同步落点'),2.7,.37,'#fff0d4',g);label.position.set(0,1.05,-1.12);
   const beam=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,2.5,32,1,true),new THREE.MeshBasicMaterial({color:0x8df7da,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));beam.position.y=1.25;g.add(beam);
   view.pads.push({g,ring,paw,beam});
  });
  const [a,b]=room.relay.pads,points=[new V(a.x,a.y-.2,2.19),new V(a.x,a.y-1.2,2.19),new V(b.x,b.y-1.2,2.19),new V(b.x,b.y-.2,2.19)];
  const cable=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x718b80,transparent:true,opacity:.55,toneMapped:false}));root.add(cable);view.cable=cable;
  view.flow=[];for(let i=0;i<9;i++){const bead=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),this.cyan);root.add(bead);view.flow.push(bead);}
 }
 makeNetwork(view){
  const root=view.root;this.box(10.8,4.7,.25,this.dark,17.3,5.2,-5.9,root);
  const heading=this.label('万步联动 / CONNECTIVITY',9.8,.5,'#d5f3df',root);heading.position.set(17.3,6.9,-5.7);
  const labels=[['大堂',13.8,4.5],['水平连廊',17.3,5.4],['空中花园',20.8,4.5]];view.network=[];
  const path=new THREE.Line(new THREE.BufferGeometry().setFromPoints(labels.map(([,x,y])=>new V(x,y,-5.68))),new THREE.LineBasicMaterial({color:0x7b9a8a}));root.add(path);view.networkPath=path;
  for(const [label,x,y]of labels){const dot=new THREE.Mesh(new THREE.CircleGeometry(.16,20),new THREE.MeshBasicMaterial({color:0x68867d,toneMapped:false}));dot.position.set(x,y,-5.6);root.add(dot);view.network.push(dot);const t=this.label(label,2.8,.32,'#c5ddce',root);t.position.set(x,y-.48,-5.6);}
  const sub=this.label('每一次协作，让下一步相连。',8,.32,'#d8c79f',root);sub.position.set(17.3,3.55,-5.6);
 }
 updateEcho(dt,state,view){
  const e=state.echo,pose=e.pose;this.echoDog.visible=!!pose;this.echoHalo.visible=e.phase!=='idle';
  if(pose){
   this.echoDog.root.position.set(pose.x,pose.y,1);this.echoDog.pivot.rotation.y=pose.facing*Math.PI/2;
   this.echoDog.play(!pose.grounded?(pose.vy>0?'Jump':'Fall'):Math.abs(pose.vx)>.4?'Run':'Idle');this.echoDog.mixer.update(dt*1.4);this.echoDog.lastRender+=dt;
   if(this.echoDog.lastRender>.06){this.echoDog.lastRender=0;this.echoDog.render();}
   this.echoDog.sprite.material.opacity=Math.min(.76,e.remaining*.45);
  }
  const anchor=pose||state.player;this.echoHalo.position.set(anchor.x,anchor.y+.085,.5);this.echoHalo.scale.setScalar(1+Math.sin(this.tick*4)*.045);
  this.echoHalo.material=e.phase==='record'?this.gold:this.cyan;
  const position=this.echoTrace.geometry.attributes.position;
  for(let i=0;i<e.frames.length;i++){const p=e.frames[i];position.setXYZ(i,p.x,p.y+.18,1.2);}position.needsUpdate=true;
  this.echoTrace.geometry.setDrawRange(0,e.frames.length);this.echoTrace.visible=e.phase!=='idle';
  if(view.pads){
   const done=state.progress[state.room.relay.flag];
   view.pads.forEach((p,i)=>{const on=done||state.relay.active[i];p.ring.material.color.set(on?0xb6ffe1:0xb4976c);p.paw.material.color.set(on?0x94ffeb:0xffcc8e);p.beam.material.opacity=on?.038+Math.sin(this.tick*4)*.012:0;});
   view.cable.material.color.set(done?0xaaf1ce:0x799589);view.cable.material.opacity=done?.9:.5;
   const [a,b]=state.room.relay.pads;view.flow.forEach((bead,i)=>{const t=(this.tick*.14+i/9)%1;bead.visible=done;bead.position.set(a.x+(b.x-a.x)*t,a.y-1.2+(b.y-a.y)*t,2.21);});
  }
  for(const portal of view.portalDoors||[]){const open=portal.type==='tech-room'?state.progress.dash:state.progress.relayOpen;portal.curtain.scale.x=THREE.MathUtils.damp(portal.curtain.scale.x,open?.035:1,7,dt);portal.curtain.material.opacity=open?.12:.22+Math.sin(this.tick*2)*.04;}
  if(view.network){view.network.forEach((o,i)=>o.material.color.set(i===0||i===1&&state.progress.relayOpen||i===2&&state.progress.gardenOnline?0xb1f2d4:0x637f76));view.networkPath.material.color.set(state.progress.loopComplete?0xb9f5d3:0x77968a);}
  if(state.roomId==='garden'){
   this.pondClock+=dt;
   if(state.progress.gardenOnline&&(!view.wasOnline||this.pondClock>2.6)){this.pond.field.disturb(Math.sin(this.tick)*.9,Math.cos(this.tick)*.5,.045,.6);this.pondClock=0;}
   view.wasOnline=state.progress.gardenOnline;this.pond.update(dt,null);
  }
 }
 backdrop(r,root){
  const windowMat=new THREE.MeshStandardMaterial({color:r.theme==='lab'?0x23484e:0x2b3835,metalness:.36,roughness:.25});
  const warmWindow=new THREE.MeshStandardMaterial({map:this.interiorTexture,color:0xdac4a5,emissiveMap:this.interiorTexture,emissive:0xffffff,emissiveIntensity:.75,roughness:.48,metalness:.05});
  // Occupied floors and curved balcony ribbons put the foreground platforms inside the centre.
  for(const [x,w,top,z] of[[-2,17,8,-10],[30,17,11,-11],[16,46,-4,-7]]){
   this.box(w,8,5,windowMat,x,top-4,z-2.7,root);
   for(const yy of[top,top-4.1]){
    const face=new THREE.Mesh(new THREE.PlaneGeometry(w,3.6),warmWindow);face.position.set(x,yy-2.3,z+.05);root.add(face);
    const g=new THREE.Group();g.position.set(x,yy,z-.2);root.add(g);g.add(roundedDeck(w+1,6,.62,this.ivory));this.box(w,.045,.05,this.gold,0,-.07,3.06,g);
    const bed=new THREE.Group();bed.position.z=3.6;g.add(bed);this.gardenBed(bed,w);
    for(let xx=-w/2+1;xx<w/2;xx+=5.8){const t=SportsWorld.prototype.tree.call(this,xx,0,1.4,3.0+Math.abs(Math.sin(xx))*1.4);g.add(t);}
   }
  }
  if(r.theme==='lab'){
   root.userData.screens=[];
   for(let x=5;x<30;x+=9){
    this.box(5.9,3.9,.18,this.dark,x,3.5,-5.8,root);this.box(5.5,.045,.04,this.cyan,x,5.15,-5.67,root);
    const cv=document.createElement('canvas');cv.width=900;cv.height=570;const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(5.6,3.56),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));panel.position.set(x,3.45,-5.67);root.add(panel);root.userData.screens.push({cv,tex,index:root.userData.screens.length});
   }
  }
  if(r.theme==='energy'){
   this.box(12.4,8.4,.45,this.dark,16,4.4,-6.1,root);this.box(12,.05,.06,this.cyan,16,8.5,-5.84,root);
   const plinth=new THREE.Group();plinth.position.set(16,0,-5);root.add(plinth);plinth.add(roundedDeck(9,4,.9,this.dark));
   for(let i=0;i<3;i++){const rotor=new THREE.Mesh(new THREE.TorusGeometry(2.1+i*.5,.075,8,64),new THREE.MeshStandardMaterial({color:0xa7d5ae,emissive:0x478d6e,emissiveIntensity:.8,metalness:.65,roughness:.2}));rotor.position.set(0,4,0);rotor.rotation.y=i*.7;plinth.add(rotor);this.roomViews.energy.decor.push(rotor);}
   const sphere=new THREE.Mesh(new THREE.IcosahedronGeometry(1.2,1),new THREE.MeshStandardMaterial({color:0xd4f3ba,emissive:0x356c45,emissiveIntensity:.5,wireframe:true}));sphere.position.set(0,4,0);plinth.add(sphere);
   const label=this.label('运动训练 / FITNESS CENTRE',9,.66,'#daf0bf',root);label.position.set(16,8.2,-5);
   const sub=this.label('运动回能  →  脉冲释放  →  再次出发',8,.4,'#bedfcd',root);sub.position.set(16,1.5,-4.8);
  }
  if(r.theme==='archive'){
   const shoeShape=new THREE.Shape();shoeShape.moveTo(-.36,0);shoeShape.lineTo(.37,0);shoeShape.quadraticCurveTo(.45,.1,.31,.16);shoeShape.lineTo(.06,.21);shoeShape.lineTo(-.12,.38);shoeShape.lineTo(-.28,.34);shoeShape.lineTo(-.3,.20);shoeShape.lineTo(-.38,.17);shoeShape.closePath();
   const shoeGeometry=new THREE.ExtrudeGeometry(shoeShape,{depth:.24,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.025});
   for(let k=0;k<3;k++){
    const x=8+k*8;this.box(6.8,5.5,.9,this.dark,x,3.2,-5.5,root);
    for(let row=0;row<4;row++){
     this.box(6.5,.08,1.25,this.ivory,x,1.1+row*1.25,-5,root);
     for(let col=0;col<6;col++){
      const shoe=new THREE.Mesh(shoeGeometry,col%2?this.ivory:this.gold);shoe.position.set(x-2.5+col,1.15+row*1.25,-4.85);root.add(shoe);this.box(.79,.045,.32,this.ivory,x-2.5+col,1.15+row*1.25,-4.73,root);
     }
    }
    this.box(6.7,5.4,.04,this.glass,x,3.5,-4.3,root);
   }
   this.box(14,1,.25,this.dark,16,7.05,-4.5,root);
   const label=this.label('600 双鞋 · 每一步，都有起点',12,.76,'#f2e6c4',root);label.position.set(16,7.1,-4.2);
  }
  if(r.theme==='gallery'){
   for(const [j,name]of ['ANTA','FILA','DESCENTE','KOLON SPORT'].entries()){
    const x=4+j*8;this.box(6.3,4.7,.3,this.dark,x,5.3,-5.4,root);
    this.box(6,.04,.05,j%2?this.gold:this.cyan,x,7.45,-5.2,root);
    const label=this.label(name,5.5,.65,'#e1eee5',root);label.position.set(x,6.2,-5.1);
    const sub=this.label('多品牌 · 同一座中心',5.4,.32,'#a5c5bc',root);sub.position.set(x,4.85,-5.1);
   }
  }
  if(r.theme==='garden')for(let x=2;x<32;x+=3){const t=SportsWorld.prototype.tree.call(this,x,.1,-4,4+(x%3));root.add(t);}
 }
 updateTelemetry(dt,state,view){
  this.telemetryClock+=dt;if(this.telemetryClock<.085&&view.root.userData.screens?.[0]?.ready)return;this.telemetryClock=0;this.telemetry.push({speed:Math.abs(state.player.vx),height:state.player.y});if(this.telemetry.length>100)this.telemetry.shift();
  for(const screen of view.root.userData.screens||[]){
   const c=screen.cv.getContext('2d'),index=screen.index;c.fillStyle='#112b30';c.fillRect(0,0,900,570);c.strokeStyle='#245056';c.lineWidth=1;
   for(let x=50;x<900;x+=70){c.beginPath();c.moveTo(x,115);c.lineTo(x,495);c.stroke();}for(let y=145;y<520;y+=70){c.beginPath();c.moveTo(45,y);c.lineTo(860,y);c.stroke();}
   c.fillStyle='#c1f2ef';c.font='500 29px "PingFang SC",Arial';c.fillText(['运动轨迹 / MOTION LAB','脉冲模块 / R&D','全球研发 / CONNECTED'][index],44,64);c.fillStyle='#67b4bd';c.font='20px Arial';c.fillText('ANTA SHANGHAI CENTRE',45,538);
   if(index===0){
    c.strokeStyle='#7bdceb';c.lineWidth=3;c.beginPath();this.telemetry.forEach((v,i)=>{const x=52+i*7.95,y=455-Math.min(8,Math.max(0,v.height))*36;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();
    c.fillStyle='#e4f4df';c.font='500 45px Arial';c.fillText(`${Math.abs(state.player.vx).toFixed(1)}  m/s`,55,180);c.font='20px "PingFang SC"';c.fillText('小步 · 实时速度与跳跃高度',55,218);
   }else if(index===1){
    c.strokeStyle='#92eaf3';c.lineWidth=3;for(let i=0;i<3;i++){c.beginPath();c.arc(440,310,80+i*32,this.tick*.35+i,this.tick*.35+i+4.8);c.stroke();}c.drawImage(this.pawTexture.image,386,256,108,108);c.fillStyle='#d2efe7';c.font='24px "PingFang SC"';c.fillText(state.progress.dash?'模块已加载 · 返回大堂突破光幕':'测试目标 · 取得脉冲冲刺',260,494);
   }else{
    const points=[[95,300,'中国'],[295,205,'美国'],[470,318,'日本'],[642,227,'韩国'],[796,351,'欧洲']];c.strokeStyle='#72b6bd';c.lineWidth=2;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
    for(const[x,y,name]of points){c.fillStyle='#9deaf0';c.beginPath();c.arc(x,y,8+Math.sin(this.tick*2+x)*2,0,Math.PI*2);c.fill();c.fillStyle='#d3eee8';c.font='24px "PingFang SC"';c.textAlign='center';c.fillText(name,x,y+45);}c.textAlign='left';c.font='21px "PingFang SC"';c.fillText(state.progress.gardenOnline?'花园循环已启动 · 大堂捷径供能':state.progress.relayOpen?'回声连廊已接通 · 前往空中花园':state.progress.echoCollar?'回声项圈已同步 · 返回连廊开路':'创新协同 · 让运动连接世界',150,465);
   }
   screen.tex.needsUpdate=true;screen.ready=true;
  }
 }
 makeEffects(){
  this.slash=new THREE.Mesh(new THREE.RingGeometry(1.1,1.85,40,1,-.9,1.8),new THREE.MeshBasicMaterial({color:0xb4faff,transparent:true,opacity:.8,side:THREE.DoubleSide,toneMapped:false,depthWrite:false}));this.scene.add(this.slash);this.slash.visible=false;
  this.warning=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0xffb251,transparent:true,opacity:.35,depthWrite:false,toneMapped:false}));this.warning.rotation.x=-Math.PI/2;this.scene.add(this.warning);this.warning.visible=false;
  this.ghosts=[];for(let i=0;i<5;i++){const s=this.sprite(this.dog.rt.texture,3.5,this.scene,0x7defff);s.center.copy(this.dog.sprite.center);s.material.depthWrite=false;s.material.opacity=0;s.visible=false;this.ghosts.push(s);}
 }
 makeForeground(){this.foreground=new THREE.Group();this.camera.add(this.foreground);this.scene.add(this.camera);for(let i=0;i<3;i++){const s=SportsWorld.prototype.tree.call(this,0,0,0,12);s.material.color.set(0x98a068);this.foreground.add(s);}}
 switchRoom(state){
  for(const [id,v]of Object.entries(this.roomViews))v.root.visible=id===state.roomId;
  for(const s of this.enemyViews.values()){for(const o of s.userData.parts||[]){this.scene.remove(o);o.geometry.dispose();o.material.dispose();}this.scene.remove(s);s.material.dispose();}this.enemyViews.clear();
  for(const e of[...state.enemies,...(state.boss?[state.boss]:[])]){const boss=e===state.boss,s=this.sprite(droneTexture(this,boss?'guardian':e.kind||'scout'),boss?4.1:2.3,this.scene);s.userData.entity=e;s.userData.parts=[];
   if(!boss){
    const bar=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.065),new THREE.MeshBasicMaterial({color:0xd4eee5,toneMapped:false}));this.scene.add(bar);s.userData.bar=bar;s.userData.parts.push(bar);
    if(e.kind==='shield'){const shield=new THREE.Mesh(new THREE.TorusGeometry(1.06,.055,6,32,Math.PI),new THREE.MeshBasicMaterial({color:0x98dfff,toneMapped:false,transparent:true,opacity:.8}));this.scene.add(shield);s.userData.shield=shield;s.userData.parts.push(shield);}
    if(e.kind==='sentry'){const aim=new THREE.Mesh(new THREE.PlaneGeometry(12,.035),new THREE.MeshBasicMaterial({color:0xffc17b,toneMapped:false,transparent:true,opacity:.7}));this.scene.add(aim);s.userData.aim=aim;s.userData.parts.push(aim);}
   }
   this.enemyViews.set(e,s);}
  this.currentRoom=state.roomId;this.currentRevision=state.roomRevision;this.lookAt.set(state.player.x,4,0);this.camera.position.copy(this.lookAt).add(this.cameraOffset);
 }
 burst(x,y,color=0x94efff){for(let i=0;i<10;i++){const s=this.sprite(this.pawTexture,.16+Math.random()*.12,this.scene,color);s.position.set(x,y,.5);const angle=i/10*Math.PI*2;this.particles.push({s,v:new V(Math.cos(angle)*(2+Math.random()*2),Math.sin(angle)*3,0),life:.5});}}
 updateExpedition(dt,state){
  if(!this.ready)return;const switching=this.currentRoom!==state.roomId||this.currentRevision!==state.roomRevision;if(switching)this.switchRoom(state);
  this.tick+=dt;this.grade.uniforms.time.value=this.tick;const p=state.player,v=this.roomViews[state.roomId];this.updateTelemetry(dt,state,v);this.updateEcho(dt,state,v);
  // Original rig is rendered into a low-resolution sprite; foot position is the physics origin.
  this.dog.root.position.set(p.x,p.y,.95);this.dog.facing=THREE.MathUtils.damp(this.dog.facing,p.facing*Math.PI/2,20,dt);this.dog.pivot.rotation.y=this.dog.facing;
  this.dog.play(!p.grounded?(p.vy>0?'Jump':'Fall'):p.attackTime>0?'Land':p.dashTime>0?'Run':Math.abs(p.vx)>.4?'Run':'Idle');this.dog.mixer.update(dt*(Math.abs(p.vx)>1?1.4:1));this.dog.lastRender+=dt;if(this.dog.lastRender>.055){this.dog.lastRender=0;this.dog.render();}
  this.dog.sprite.material.opacity=p.invulnerable>0?(Math.sin(this.tick*40)>.0?.35:1):1;this.dog.visible=state.deathTimer<=0;
  this.slash.visible=p.attackTime>0;this.slash.position.set(p.x,p.y+.75,1.4);this.slash.rotation.z=p.attackDirection==='down'?-Math.PI/2:p.facing>0?0:Math.PI;this.slash.material.opacity=Math.min(.95,p.attackTime*8);
  for(let i=0;i<this.ghosts.length;i++){const s=this.ghosts[i];s.visible=p.dashTime>0;s.position.set(p.x-p.facing*(i+1)*.45,p.y,.9-i*.02);s.material.opacity=.32*(1-i/5);}
  for(const [e,s]of this.enemyViews){s.visible=e.hp>0;s.position.set(e.x,e.y+(e===state.boss?1.15:1.03)+Math.sin(this.tick*3+e.x)*.05,.9);s.material.rotation=e.state==='rush'?e.direction*-.12:0;s.material.color.set(e.invulnerable>0?0xffffff:e.state==='charge'?0xffb369:0xffffff);s.material.opacity=e.invulnerable>0?.6:1;
   if(e.kind==='sentry'&&e.state!=='charge')s.material.color.set(0xc6caff);else if(e.kind==='shield'&&e.state!=='charge')s.material.color.set(0xbfe6ed);
   const {bar,shield,aim}=s.userData;
   if(bar){bar.visible=e.hp>0;bar.position.set(e.x,e.y+2.1,1.1);bar.scale.x=Math.max(0,e.hp/e.maxHP);}
   if(shield){shield.visible=e.hp>0&&e.state!=='recover';shield.position.set(e.x,e.y+.95,1.15);shield.rotation.z=e.direction>0?-Math.PI/2:Math.PI/2;}
   if(aim){aim.visible=e.hp>0&&e.state==='charge';aim.position.set(e.x+(e.aimX||0)*6,e.y+1+(e.aimY||0)*6,.4);aim.rotation.z=Math.atan2(e.aimY||0,e.aimX||1);aim.material.opacity=.3+Math.sin(this.tick*18)*.2;}
  }
  const b=state.boss;this.warning.visible=!!(b?.active&&b.hp>0&&(b.state==='charge'||b.state==='leap'));
  if(this.warning.visible){const x=b.state==='leap'?b.targetX:(b.x+p.x)/2;this.warning.position.set(x,.035,0);this.warning.scale.set(b.state==='leap'?3:Math.max(2,Math.abs(b.x-p.x)),2.4,1);this.warning.material.opacity=.2+.13*Math.sin(this.tick*18);}
  while(this.waveViews.length<state.projectiles.length){const m=new THREE.Mesh(new THREE.TorusGeometry(.55,.045,6,32),this.gold);this.scene.add(m);this.waveViews.push(m);}
  this.waveViews.forEach((m,i)=>{const q=state.projectiles[i];m.visible=!!q;if(q){m.position.set(q.x,q.y,.8);m.rotation.z=this.tick*4;m.scale.setScalar(q.owner==='player'?.55:q.kind==='bolt'?.4:1);m.material=q.owner==='player'?this.cyan:this.gold;}});
  for(const {s,c}of v.pickups){s.visible=!state.chips.has(c.id);s.position.y=c.y+Math.sin(this.tick*3+c.x)*.08;}
  if(v.heart){v.heart.visible=v.heartLabel.visible=!state.progress.heart;v.heart.position.y=state.room.heart.y+Math.sin(this.tick*2)*.13;}
  if(v.ability){v.ability.visible=v.moduleRing.visible=!state.progress[v.abilityKey];v.moduleRing.rotation.z=this.tick*.7;}
  if(v.gate){v.gate.visible=!state.progress.gate;v.curtain.material.opacity=.34+Math.sin(this.tick*3)*.1;}
  if(v.wall){v.wall.visible=!state.progress[state.room.wall.id];v.wallLabel.material.opacity=.7+Math.sin(this.tick*3)*.25;}
  if(v.seal)v.seal.visible=state.trialActive;
  for(const cache of v.caches){cache.module.visible=!state.modules.has(cache.id);cache.module.rotation.y=this.tick*.6;cache.module.position.y=1.25+Math.sin(this.tick*2)*.09;}
  v.decor.forEach((o,i)=>{o.rotation.y=this.tick*.25+i*.6;o.rotation.x=Math.sin(this.tick*.2+i)*.35;});
  if(v.globe){v.globe.rotation.y=this.tick*.16;v.globe.material.opacity=state.progress.boss?.6:.2;}
  for(let i=this.particles.length-1;i>=0;i--){const a=this.particles[i];a.life-=dt;a.s.position.addScaledVector(a.v,dt);a.s.material.opacity=Math.max(0,a.life*2);if(a.life<=0){this.scene.remove(a.s);a.s.material.dispose();this.particles.splice(i,1);}}
  const aspect=innerWidth/innerHeight,portrait=aspect<1,width=portrait?(state.cameraSpan||18):Math.max(30,Math.min(38,aspect*20));this.setFrustum(width/aspect);
  const half=width/2-2,targetX=THREE.MathUtils.clamp(state.cameraAnchor??p.x+p.facing*2.2,Math.min(half,state.room.width/2),Math.max(half,state.room.width-half));
  const targetY=portrait?p.y+2.5:Math.max(3.4,p.y+2.0);const k=dt===0||switching?1:1-Math.exp(-dt*6);this.lookAt.x=THREE.MathUtils.lerp(this.lookAt.x,targetX,k);this.lookAt.y=THREE.MathUtils.lerp(this.lookAt.y,targetY,k);this.camera.position.copy(this.lookAt).add(this.cameraOffset);this.camera.lookAt(this.lookAt);
  this.architecture.position.x=16+(this.lookAt.x-16)*.65;this.sun.position.set(this.lookAt.x-17,35,20);this.sun.target.position.set(this.lookAt.x,2,0);this.sun.target.updateMatrixWorld();
  this.foreground.children.forEach((s,i)=>{s.position.set(i===0?this.camera.left-1:i===1?this.camera.right+1:this.camera.left+1,i===2?this.camera.top+4:this.camera.bottom-4,-11);s.scale.setScalar(i===2?11:13);s.visible=!portrait;});
  if(dt===0||switching){this.camera.updateMatrixWorld();this.dof.focusDistance=-new V(p.x,p.y+1,0).applyMatrix4(this.camera.matrixWorldInverse).z;}
  this.dof.update(dt,new V(p.x,p.y+1,0),true,this.renderer.getPixelRatio());this.dof.uniforms.focusBand.value=4.2;this.dof.uniforms.farFalloff.value=29;this.dof.uniforms.nearFalloff.value=10;
  this.render();
 }
}
