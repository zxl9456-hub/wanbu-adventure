import {planterTree,deckDetails} from '../model-quality.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {World} from '../world.js';
import {dressArchitecture,addGardenDetails} from '../art-direction.js';
import {loadBrand,replaceModelBranding,logoPlate} from '../brand.js';
import {HAZARDS,CHECKPOINTS,COLLECTIBLES,hazardActive,hazardPhase,FINISH_X} from './course.js';
export const BASE_Y=12;
const V=THREE.Vector3;
const glow=(color)=>new THREE.MeshBasicMaterial({color,toneMapped:false});
function box(w,h,d,mat,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
export function roundedDeck(w,d,h,material){
 const s=new THREE.Shape(),r=.24,x=-w/2,y=-d/2;
 s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+d-r);s.quadraticCurveTo(x+w,y+d,x+w-r,y+d);s.lineTo(x+r,y+d);s.quadraticCurveTo(x,y+d,x,y+d-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
 const geo=new THREE.ExtrudeGeometry(s,{depth:h-.08,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.045,bevelThickness:.04,curveSegments:8});geo.rotateX(-Math.PI/2);
 const m=new THREE.Mesh(geo,material);m.position.y=-h+.04;m.receiveShadow=true;m.castShadow=true;return m;
}
export class SportsWorld extends World{
 constructor(canvas){
  super(canvas);this.scene.background.set(0xcccec2);this.scene.fog=new THREE.FogExp2(0xc8c6b5,.0035);this.cutaway.constant=1000;this.frontCut.constant=1000;
  this.cameraOffset.set(0,14,34);this.viewWidth=43;this.lookAt.set(8,BASE_Y+3,0);this.camera.position.copy(this.lookAt).add(this.cameraOffset);this.camera.lookAt(this.lookAt);
  this.renderer.toneMappingExposure=.95;this.sun.intensity=4.2;
  for(const o of this.scene.children)if(o.isMesh&&o.geometry.type==='PlaneGeometry')o.position.y=-17;
  this.bloom.strength=.27;this.bloom.threshold=1.3;this.dof.blurScale=.62;this.resize();
  this.platformMeshes=new Map();this.pickups=new Map();this.hazardMeshes=new Map();this.checkpointMeshes=[];this.bursts=[];this.rails=[];
  this.stone=new THREE.MeshStandardMaterial({color:0xcfc4b2,roughness:.76,metalness:.04});
  this.stone.onBeforeCompile=s=>{s.vertexShader='varying vec3 tileWorld;varying vec3 tileNormal;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ntileWorld=(modelMatrix*vec4(transformed,1.)).xyz;tileNormal=normalize(mat3(modelMatrix)*objectNormal);');s.fragmentShader='varying vec3 tileWorld;varying vec3 tileNormal;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 tile=tileWorld.xz/vec2(1.5,.8);tile.x+=mod(floor(tile.y),2.)*.5;vec2 edge=min(fract(tile),1.-fract(tile));float seam=smoothstep(.008,.023,min(edge.x,edge.y));
    float grain=fract(sin(dot(floor(tileWorld.xz*95.+tileWorld.y*13.),vec2(127.1,311.7)))*43758.5453);
    diffuseColor.rgb*=.96+grain*.07;if(tileNormal.y>.8)diffuseColor.rgb*=mix(.78,1.,seam);`);};
  this.steel=new THREE.MeshStandardMaterial({color:0x30484c,metalness:.72,roughness:.31});this.trim=new THREE.MeshStandardMaterial({color:0xb6a184,metalness:.7,roughness:.26});
  this.glass=new THREE.MeshStandardMaterial({color:0x83b8bd,transparent:true,opacity:.25,depthWrite:false,metalness:.35,roughness:.18,side:THREE.DoubleSide});
  this.cyan=glow(new THREE.Color(1.0,2.6,3.1));this.warm=glow(new THREE.Color(2.8,1.7,.62));this.amber=glow(new THREE.Color(2.8,.65,.22));
 }
 resize(){
  if(!this.composer)return;const w=document.documentElement.clientWidth,h=document.documentElement.clientHeight;
  this.renderer.setSize(w,h,false);this.composer.setSize(w,h);this.viewWidth=w<700?22:h<500?36:43;
  this.setFrustum(this.viewWidth/(w/h));
 }
 async load(report=()=>{}){
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),textures=new THREE.TextureLoader();let completed=0;
  const done=(label)=>{report(++completed/5,label);};
  const [building,corgi,tree,paw]=await Promise.all([
   loader.loadAsync('./assets/anta-centre.glb').then(g=>{done('上海安踏中心已载入');return g;}),
   loader.loadAsync('./assets/corgi-sports.glb').then(g=>{done('小步的运动动作已载入');return g;}),
   textures.loadAsync('./assets/golden-planter.png').then(t=>{done('空中花园已载入');return t;}),
   textures.loadAsync('./assets/sports-energy-paw.png').then(t=>{done('运动能量已载入');return t;}),loadBrand(this).then(()=>done('品牌标识已载入'))
  ]);
  for(const t of[tree,paw]){t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;}
  this.treeTexture=tree;this.pawTexture=paw;this.building=building.scene;this.building.name='用户原始上海安踏中心建筑';
  dressArchitecture(this);this.scene.add(this.building);replaceModelBranding(this);addGardenDetails(this);
  // Move the entire supplied architectural ensemble together, preserving its proportions.
  this.architecture=new THREE.Group();this.architecture.name='上海中心 · 原模型景观';this.scene.add(this.architecture);
  this.architecture.add(this.building,this.brandArchitecture,this.gardenShrubs,this.artProps);this.architecture.position.set(-24,-2,-65);
  this.building.traverse(o=>{if(o.isMesh){
   // Background flags otherwise overlap the actual start marker in the side-on camera.
   if(/Layer_(08|09|10|11|12|13|14|15|16|17|18)_/.test(o.name))o.visible=false;
   const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){
    const before=m.onBeforeCompile,cache=m.customProgramCacheKey.bind(m);m.onBeforeCompile=s=>{before(s);s.uniforms.sportsOffset={value:this.architecture.position};s.vertexShader='uniform vec3 sportsOffset;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('artWorld=(modelMatrix*vec4(transformed,1.)).xyz;','artWorld=(modelMatrix*vec4(transformed,1.)).xyz-sportsOffset;');s.fragmentShader=s.fragmentShader.replace('interior*.025+lamp*.26','interior*.14+lamp*1.25');};m.customProgramCacheKey=()=>cache()+'-sports-interior';
   }
  }});
  const pmrem=new THREE.PMREMGenerator(this.renderer);this.scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;this.scene.environmentIntensity=.17;pmrem.dispose();
  this.foreground=new THREE.Group();this.camera.add(this.foreground);this.scene.add(this.camera);
  for(let i=0;i<2;i++){const sprite=this.tree(0,0,0,1);this.foreground.add(sprite);sprite.material.color.set(0x7f914c);}
  return {corgi};
 }
 tree(x,y,z,height=4){return planterTree(x,y,z,height);}
 gardenBed(group,width){
  group.add(box(width-.7,.32,.48,this.stone,0,.13,-1.98));
  const shape=new THREE.Shape();shape.moveTo(0,-.12);shape.quadraticCurveTo(.075,0,0,.12);shape.quadraticCurveTo(-.075,0,0,-.12);
  const count=Math.floor(width*90),leaves=new THREE.InstancedMesh(new THREE.ShapeGeometry(shape,3),new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:.86}),count),dummy=new THREE.Object3D();
  const rand=n=>{const k=Math.sin(n*127.17+width*13.7)*43758.54;return k-Math.floor(k);};
  for(let i=0;i<count;i++){const r=rand(i+1),s=rand(i+200),v=rand(i+1000);dummy.position.set((r-.5)*(width-.7),.3+s*.58,-1.98+(v-.5)*.7);dummy.rotation.set(-s*2,r*10,v*8);dummy.scale.setScalar(.7+v*.8);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,new THREE.Color().setHSL(.17+v*.11,.45+s*.27,.13+r*.20));}
  leaves.castShadow=true;leaves.receiveShadow=true;group.add(leaves);
 }
 text(text,w=4,h=.8,color='#eff6e8',bg=null){
  const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);const ctx=c.getContext('2d');
  if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);}ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${c.height*.58}px "PingFang SC",Arial`;ctx.fillStyle=color;ctx.fillText(text,512,c.height*.53,960);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.05,toneMapped:false,depthWrite:true}));return plane;
 }
 setupCourse(physics){
  this.modelsRefined=false;
  this.physics=physics;
  for(const p of physics.platforms){
   const w=p.right-p.left,g=new THREE.Group();g.name='跑道 · '+p.id;g.position.set((p.left+p.right)/2,BASE_Y+p.y,0);this.scene.add(g);this.platformMeshes.set(p.id,g);
   g.add(roundedDeck(w,3.65,p.motion?.55:.85,p.motion?this.steel:this.stone));deckDetails(g,w,3.65);
   g.add(box(w-.3,.055,.055,p.motion?this.cyan:this.warm,0,-.08,1.9));
   g.add(box(w-.3,.055,.055,p.motion?this.cyan:this.warm,0,-.08,-1.9));
   if(!p.motion){
    this.gardenBed(g,w);
    g.add(box(w-.4,.1,.09,this.trim,0,1.13,-1.5));g.add(box(w-.4,.045,.06,this.trim,0,.14,-1.5));
    const glass=box(w-.5,.93,.022,this.glass,0,.65,-1.5);glass.castShadow=false;g.add(glass);
    for(let x=-w/2+.3;x<=w/2-.25;x+=2.2)g.add(box(.038,1.08,.055,this.trim,x,.64,-1.5));
    // Architectural columns end below the play space, keeping every gap readable.
    for(const x of[-w*.31,w*.31]){g.add(box(.48,32,.58,this.stone,x,-16.8,-.8));g.add(box(.8,.18,.8,this.trim,x,-1.1,-.8));}
    for(const x of[-w/2+1.4,w/2-1.3])if(w>7)g.add(this.tree(x,0,-2.15,3.2+(p.id==='finish'?1:.3)));
    // Restrained path inlays point right without covering the landing edge.
    for(let x=-w/2+1.8;x<w/2-1;x+=3.1){const path=box(.35,.012,.05,this.cyan,x,.028,.35);path.castShadow=false;g.add(path);}
   }else{
    for(const x of[-w/2+.15,w/2-.15]){g.add(box(.06,.8,.06,this.cyan,x,.4,-1.6));g.add(box(.16,.6,3.9,this.trim,x,-.25,0));}
    const arrow=this.text('›  ›  ›',w*.65,.45,'#92efff');arrow.position.set(0,-.24,1.92);g.add(arrow);
    if(p.motion.axis==='y')for(const x of[p.baseLeft+.1,p.baseRight-.1]){
     const line=box(.035,8,.035,this.cyan,x,BASE_Y+2,-1.7);this.scene.add(line);this.rails.push(line);
     this.scene.add(box(.14,8,.16,this.steel,x,BASE_Y+2,-1.8));
    }
   }
  }
  for(const c of COLLECTIBLES){
   const mat=new THREE.SpriteMaterial({map:this.pawTexture,transparent:true,alphaTest:.12,depthWrite:true,toneMapped:false,color:c.kind==='medal'?0xffdb72:0xffffff});
   const sprite=new THREE.Sprite(mat);sprite.scale.setScalar(c.kind==='medal'?1.35:.88);sprite.position.set(c.x,BASE_Y+c.y,.05);this.scene.add(sprite);
   let ring;if(c.kind==='medal'){ring=new THREE.Mesh(new THREE.TorusGeometry(.77,.024,6,48),this.warm);ring.position.copy(sprite.position);ring.quaternion.copy(this.camera.quaternion);this.scene.add(ring);}
   this.pickups.set(c.id,{sprite,ring,c});
  }
  for(const h of HAZARDS){
   const g=new THREE.Group();g.position.set(h.x,BASE_Y+h.y,0);g.name=h.period?'节奏光栏':'运动跨栏';this.scene.add(g);
   for(const z of[-1.2,1.2]){g.add(box(.11,h.h,.11,this.steel,0,h.h/2,z));g.add(box(.32,.1,.45,this.trim,0,.05,z));}
   const beam=box(.35,.16,2.5,this.amber,0,h.h-.08,0);g.add(beam);
   const curtain=box(.3,h.h,2.4,new THREE.MeshBasicMaterial({color:0xff9259,transparent:true,opacity:.18,depthWrite:true}),0,h.h/2,0);curtain.castShadow=false;g.add(curtain);
   let progress;if(h.period){progress=box(.05,.045,2.4,this.cyan,0,.035,0);g.add(progress);const sign=this.text('节奏光栏',2.3,.5,'#ffcc9f');sign.position.set(0,h.h+.5,-.8);g.add(sign);}
   this.hazardMeshes.set(h.id,{g,beam,curtain,progress,h});
  }
  for(const c of CHECKPOINTS){
   const g=new THREE.Group();g.position.set(c.x,BASE_Y+c.y,-.3);this.scene.add(g);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(1.0,.032,6,48),this.cyan);ring.rotation.x=-Math.PI/2;ring.position.y=.035;g.add(ring);
   const pole=box(.035,2.9,.035,this.trim,-1,1.45,-1.2);g.add(pole);
   const label=this.text(c.id?'CHECKPOINT':'START',2.4,.5);label.position.set(0,2.75,-1.2);g.add(label);
   this.checkpointMeshes.push({g,ring,c});
  }
  for(const [x,y,text] of[[7,0,'健步道 · 万步联动'],[64,1.6,'垂直中庭'],[113,5.7,'空中花园']]){
   const sign=this.text(text,4.2,.65,'#f8e8cb','#23393d');sign.position.set(x,BASE_Y+y+2.4,-2.2);this.scene.add(sign);
  }
  const introLogo=logoPlate(this,2.8);introLogo.position.set(-1,BASE_Y+2.4,-1.9);this.scene.add(introLogo);
  this.goal=new THREE.Group();this.goal.position.set(FINISH_X,BASE_Y+6.4,0);this.scene.add(this.goal);
  for(const z of[-1.6,1.6]){this.goal.add(box(.32,4.5,.28,this.steel,0,2.25,z));this.goal.add(box(.05,4.5,.06,this.cyan,.19,2.25,z));}
  this.goal.add(box(.35,.3,3.8,this.steel,0,4.45,0));this.goal.add(box(.05,.06,3.8,this.cyan,.2,4.3,0));
  const goalRing=new THREE.Mesh(new THREE.TorusGeometry(1.7,.035,6,80),this.warm);goalRing.rotation.x=-Math.PI/2;goalRing.position.y=.035;this.goal.add(goalRing);
  const finish=this.text('FINISH',3.5,.8,'#eaffff');finish.position.set(.5,4.8,0);this.goal.add(finish);
  const sign=logoPlate(this,3.2);sign.position.set(FINISH_X+4,BASE_Y+9.6,-2);this.scene.add(sign);
  this.addGlobe(FINISH_X+5,BASE_Y+12,-3);
 }
 addGlobe(x,y,z){
  this.globe=new THREE.Group();this.globe.position.set(x,y,z);this.scene.add(this.globe);
  const globe=new THREE.Mesh(new THREE.SphereGeometry(1.65,24,16),new THREE.MeshBasicMaterial({color:0x47c7ff,wireframe:true,transparent:true,opacity:.14,toneMapped:false}));this.globe.add(globe);
  fetch('./assets/land-dots.json').then(r=>r.json()).then(data=>{
   const pts=[];for(const [lon,lat] of data){const la=lat*Math.PI/180,lo=lon*Math.PI/180;pts.push(1.7*Math.cos(la)*Math.cos(lo),1.7*Math.sin(la),1.7*Math.cos(la)*Math.sin(lo));}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));this.globe.add(new THREE.Points(g,new THREE.PointsMaterial({size:.06,color:0x9fefff,toneMapped:false,transparent:true,opacity:.95})));
  }).catch(()=>{});
 }
 burst(x,y,color=0x9aebff,count=14){
  for(let i=0;i<count;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:this.pawTexture,color,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));s.position.set(x,BASE_Y+y+.6,.4);s.scale.setScalar(.13+Math.random()*.16);this.scene.add(s);const angle=i/count*Math.PI*2;this.bursts.push({s,v:new V(Math.cos(angle)*(1+Math.random()*2),Math.sin(angle)*2+1,.1),life:.65,total:.65});}
 }
 resetCamera(p){const narrow=innerWidth<700;this.lookAt.set(Math.max(narrow?5.5:8,p.x+(narrow?3.5:5)),BASE_Y+p.y+3,0);this.camera.position.copy(this.lookAt).add(this.cameraOffset);this.camera.lookAt(this.lookAt);}
 update(dt,p){
  if(!p){this.dof.update(dt,this.lookAt,false,this.renderer.getPixelRatio());return;}
  this.tick+=dt;this.grade.uniforms.time.value=this.tick;
  // Distant architecture scrolls at a slower rate, like the rear layer of an HD2D stage.
  this.architecture.position.x=-24+p.x*.8;
  for(const platform of p.platforms){const g=this.platformMeshes.get(platform.id);if(g)g.position.set((platform.left+platform.right)/2,BASE_Y+platform.y,0);}
  for(const {sprite,ring,c} of this.pickups.values()){const visible=!p.collected.has(c.id);sprite.visible=visible;if(ring)ring.visible=visible;sprite.position.y=BASE_Y+c.y+Math.sin(this.tick*2.8+c.x)*.07;if(ring){ring.position.copy(sprite.position);ring.rotation.z=this.tick*.4;}}
  for(const {g,beam,curtain,progress,h} of this.hazardMeshes.values()){
   const active=hazardActive(h,p.time);beam.visible=active;curtain.visible=active;if(progress){progress.scale.z=1-hazardPhase(h,p.time);progress.material=active?this.amber:this.cyan;}
  }
  for(const {ring,c} of this.checkpointMeshes){ring.material=c.id<=p.checkpoint?this.cyan:this.warm;}
  for(let i=this.bursts.length-1;i>=0;i--){const b=this.bursts[i];b.life-=dt;b.s.position.addScaledVector(b.v,dt);b.v.y-=4*dt;b.s.material.opacity=Math.max(0,b.life/b.total);if(b.life<=0){this.scene.remove(b.s);b.s.material.dispose();this.bursts.splice(i,1);}}
  if(this.globe)this.globe.rotation.y=this.tick*.2;
  const floor=this.floorBelow(p.x,p.y),targetY=BASE_Y+(p.grounded?p.y:floor??Math.max(0,p.y-1.8))+3;
  this.lookAt.x=THREE.MathUtils.damp(this.lookAt.x,Math.max(innerWidth<700?5.5:8,Math.min(181,p.x+(p.facing<0?2:innerWidth<700?3.5:5))),5,dt);
  this.lookAt.y=THREE.MathUtils.damp(this.lookAt.y,targetY,3.5,dt);this.camera.position.copy(this.lookAt).add(this.cameraOffset);this.camera.lookAt(this.lookAt);
  this.sun.position.set(this.lookAt.x-22,BASE_Y+40,22);this.sun.target.position.set(this.lookAt.x,BASE_Y,0);this.sun.target.updateMatrixWorld();
  Object.assign(this.sun.shadow.camera,{left:-29,right:29,top:30,bottom:-28});this.sun.shadow.camera.updateProjectionMatrix();
  if(this.foreground){const h=this.viewHeight;const a=this.foreground.children[0],b=this.foreground.children[1];a.position.set(this.camera.left-2,-h*.64,-9);a.scale.set(14,14,1);b.position.set(this.camera.right+3,-h*.64,-10);b.scale.set(17,17,1);}
  this.dof.update(dt,new V(p.x,BASE_Y+p.y+.75,0),true,this.renderer.getPixelRatio());this.dof.uniforms.focusBand.value=5.5;this.dof.uniforms.farFalloff.value=65;this.dof.uniforms.nearFalloff.value=16;
 }
 floorBelow(x,y){let height=null;for(const p of this.physics?.platforms||[])if(x>=p.left&&x<=p.right&&p.y<=y+.05)height=Math.max(height??-100,p.y);return height;}
}
