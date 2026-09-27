import {planterTree} from '../model-quality.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {World} from '../world.js';
import {PixelCorgi} from '../character.js';
import {loadBrand,logoPlate,replaceModelBranding} from '../brand.js';
import {drawBoard} from './board.js';
const V=THREE.Vector3,basic=c=>new THREE.MeshBasicMaterial({color:c,toneMapped:false});
export class PortalWorld extends World{
 constructor(canvas){
  super(canvas);this.scene.children.filter(o=>o.isMesh).forEach(o=>this.scene.remove(o));this.scene.fog=null;this.scene.background.set(0xa7b5ac);this.cutaway.constant=1000;this.frontCut.constant=1000;
  this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.toneMappingExposure=.91;this.sun.position.set(-18,30,20);this.sun.intensity=3.8;this.sun.color.set(0xffd397);Object.assign(this.sun.shadow.camera,{left:-30,right:30,top:25,bottom:-25,far:110});this.sun.shadow.camera.updateProjectionMatrix();this.sun.shadow.normalBias=.025;
  for(const rt of [this.composer.renderTarget1,this.composer.renderTarget2])rt.samples=4;
  this.camera.far=240;this.camera.updateProjectionMatrix();this.bloom.strength=.18;this.bloom.threshold=1.4;this.dof.blurScale=.75;
  this.ivory=new THREE.MeshStandardMaterial({color:0xd6cbb6,roughness:.52,metalness:.04});this.dark=new THREE.MeshStandardMaterial({color:0x17363b,roughness:.32,metalness:.55});this.metal=new THREE.MeshStandardMaterial({color:0xb1b9b4,roughness:.26,metalness:.7});
  this.ivory.onBeforeCompile=s=>{s.vertexShader='varying vec3 stonePos;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstonePos=(modelMatrix*vec4(position,1.)).xyz;');s.fragmentShader='varying vec3 stonePos;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nvec2 st=stonePos.xz*.65;vec2 edge=min(fract(st),1.-fract(st));float grain=fract(sin(dot(floor(stonePos.xz*180.),vec2(12.9898,78.233)))*43758.5453);diffuseColor.rgb*=mix(.86,1.,smoothstep(.002,.016,min(edge.x,edge.y)))*(.96+.065*grain);');};
  this.gold=basic(new THREE.Color(1.6,1.05,.35));this.cyan=basic(new THREE.Color(.27,1.1,1.4));this.glass=new THREE.MeshStandardMaterial({color:0x94dde1,roughness:.14,metalness:.22,transparent:true,opacity:.17,depthWrite:false,side:THREE.DoubleSide});
  this.boards={};this.targets={};this.bridgeAmount=[0,0];this.posTarget=new V();this.goalLook=new V();this.goalCam=new V();this.dogCanvas=document.createElement('canvas');this.dogCanvas.width=this.dogCanvas.height=112;this.pixelData=new Uint8Array(112*112*4);this.dogImage=this.dogCanvas.getContext('2d').createImageData(112,112);this.boardClock=0;this.ready=false;
 }
 box(w,h,d,mat,x,y,z,parent=this.scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 ring(r,width,mat,x,y,z,parent=this.scene){const m=new THREE.Mesh(new THREE.RingGeometry(r-width,r,64),mat);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);parent.add(m);return m;}
 label(text,w,h,color='#b8e7e8',parent=this.scene){const cv=document.createElement('canvas');cv.width=1024;cv.height=Math.round(1024*h/w);const c=cv.getContext('2d');c.fillStyle=color;c.font=`600 ${cv.height*.66}px "PingFang SC",Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,512,cv.height*.52,995);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true,alphaTest:.1,toneMapped:false,side:THREE.DoubleSide}));parent.add(m);return m;}
 async load(report){
  const gl=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),tl=new THREE.TextureLoader();let n=0;const done=()=>report(++n/6);
  const [corgi,building,projector,tree,paw]=await Promise.all([gl.loadAsync('./assets/corgi-sports.glb').then(x=>{done();return x;}),gl.loadAsync('./assets/lab/anta-centre-mini.glb').then(x=>{done();return x;}),gl.loadAsync('./assets/lab/light-projector.glb').then(x=>{done();return x;}),tl.loadAsync('./assets/golden-planter.png').then(x=>{done();return x;}),tl.loadAsync('./assets/sports-energy-paw.png').then(x=>{done();return x;}),loadBrand(this).then(done)]);
  this.tree=tree;tree.colorSpace=THREE.SRGBColorSpace;paw.colorSpace=THREE.SRGBColorSpace;this.pawTexture=paw;this.building=building.scene;
  this.dressBuilding();
  const pm=new THREE.PMREMGenerator(this.renderer);this.scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;this.scene.environmentIntensity=.26;pm.dispose();
  this.makeScene(projector.scene);this.dog=new PixelCorgi(this,corgi);this.dog.sprite.scale.set(3.9,3.9,1);this.dog.render();this.captureDog();this.ready=true;this.updatePortal(0,{mode:'gallery',player:{x:-13.6,y:0,facing:1},route:false,lamp:false,echoSolved:false,collected:new Set(),order:['level','climb','rise'],gateOpen:()=>false},false);return corgi;
 }
 dressBuilding(){
  this.building.traverse(o=>{if(!o.isMesh)return;const ms=(Array.isArray(o.material)?o.material:[o.material]).map(orig=>{const m=orig.clone(),s=(m.name+' '+o.name).toLowerCase();m.roughness=.55;m.metalness=.08;if(m.emissive)m.emissiveIntensity=0;
   if(/glass|curtain/.test(s)){m.color.set(0x253a3c);m.roughness=.23;m.metalness=.4;m.transparent=/rail/.test(s);m.opacity=m.transparent?.3:1;m.depthWrite=!m.transparent;if('transmission'in m)m.transmission=0;
    if(!m.transparent)m.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 facadePos;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfacadePos=(modelMatrix*vec4(position,1.)).xyz;');shader.fragmentShader='varying vec3 facadePos;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nvec2 cell=vec2((facadePos.x+facadePos.z*.37)*.82,facadePos.y*.45);float seed=fract(sin(dot(floor(cell),vec2(127.1,311.7)))*43758.5453);vec2 edge=min(fract(cell),1.-fract(cell));float lit=step(.57,seed)*smoothstep(.03,.10,min(edge.x,edge.y));totalEmissiveRadiance+=vec3(.62,.32,.105)*lit;');};
   }
   else if(/green|grass|shurb|shrub|lawn/.test(s))m.color.set(0x4d6536);
   else if(/^light( |$)/.test(m.name.toLowerCase())){m.color.set(0xffd49b);m.emissive.set(0xffb452);m.emissiveIntensity=1.8;}
   else if(/mullion|dark metal|shadow box|division/.test(s))m.color.set(0x213438);
   else if(/grc|ribbon|white|slab|stone|columns|soffit|plaster|terrazzo/.test(s))m.color.set(0xd1c4ae);return m;});o.material=Array.isArray(o.material)?ms:ms[0];o.castShadow=false;o.receiveShadow=true;});
  replaceModelBranding(this);const bounds=new THREE.Box3().setFromObject(this.building),size=bounds.getSize(new V()),center=bounds.getCenter(new V());
  const group=new THREE.Group();group.add(this.building,this.brandArchitecture);this.building.position.sub(new V(center.x,bounds.min.y,center.z));this.brandArchitecture.position.sub(new V(center.x,bounds.min.y,center.z));group.scale.setScalar(65/Math.max(size.x,size.z));group.position.set(3,-7,-32);this.scene.add(group);this.architecture=group;
 }
 terrace(a,b,height){
  const sh=new THREE.Shape();sh.moveTo(a,3.8);sh.lineTo(b,3.8);sh.lineTo(b,-3.8);sh.quadraticCurveTo((a+b)/2,-6,a,-4.3);sh.closePath();const geo=new THREE.ExtrudeGeometry(sh,{depth:.65,bevelEnabled:true,bevelThickness:.08,bevelSize:.08,bevelSegments:2,steps:1});geo.rotateX(-Math.PI/2);const floor=new THREE.Mesh(geo,this.ivory);floor.position.y=height-.7;floor.receiveShadow=true;floor.castShadow=true;this.scene.add(floor);
  for(let x=a+.5;x<b;x+=1.5){this.box(.055,.92,.07,this.metal,x,height+.5,4.1);this.box(1.44,.78,.025,this.glass,x+.71,height+.48,4.1);}
  this.box(b-a,.055,.07,this.gold,(a+b)/2,height+.99,4.1);this.box(b-a,.045,.06,this.cyan,(a+b)/2,height+.07,4.05);
  for(let x=a+1;x<b-.5;x+=1.3){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.35,.35),new THREE.MeshBasicMaterial({map:this.pawTexture,transparent:true,alphaTest:.1,color:0x9decf8,toneMapped:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,height+.025,2.15);this.scene.add(mesh);}
  // Stone joints stay below the playable silhouette.
  for(let x=Math.ceil(a);x<b;x+=2)this.box(.012,.01,7.8,new THREE.MeshStandardMaterial({color:0x978d7d,roughness:1}),x,height+.012,0);
 }
 bridge(a,b,low,high){const g=new THREE.Group(),len=Math.hypot(b-a,high-low);g.position.set((a+b)/2,(low+high)/2-.10,2.1);g.rotation.z=Math.atan2(high-low,b-a);this.scene.add(g);this.box(len,.18,2.8,this.glass,0,0,0,g);this.box(len,.06,.05,this.cyan,0,.12,1.38,g);this.box(len,.06,.05,this.cyan,0,.12,-1.38,g);for(let i=0;i<9;i++)this.box(.025,.02,2.8,this.cyan,-len/2+len*i/8,.12,0,g);g.userData.baseY=g.position.y;return g;}
 screen(name,x,y,z,w=7.5,h=4.1){
  const g=new THREE.Group();g.position.set(x,y,z);this.scene.add(g);this.box(w+.28,h+.28,.34,this.metal,0,0,0,g);this.box(w+.10,h+.1,.38,this.dark,0,0,.03,g);this.box(w,.025,.08,this.cyan,0,h/2,.26,g);this.box(w,.025,.08,this.cyan,0,-h/2,.26,g);
  const cv=document.createElement('canvas');cv.width=1008;cv.height=420;const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;tx.minFilter=THREE.LinearFilter;tx.anisotropy=4;
  const face=new THREE.Mesh(new THREE.PlaneGeometry(w-.14,h-.14),new THREE.MeshBasicMaterial({map:tx,toneMapped:false}));face.position.z=.245;g.add(face);this.boards[name]={cv,tx,group:g};
  for(const xx of[-w*.35,w*.35])this.box(.20,1.15,.75,this.metal,xx,-h/2-.55,0,g);
  this.targets[name]=new V(x,y+.1,z);return g;
 }
 plant(x,y,z,size){const p=planterTree(x,y,z,size);this.scene.add(p);return p;}
 makeScene(projector){
  // Lower occupied floors anchor the playable terraces in the campus architecture.
  const windowMat=new THREE.MeshStandardMaterial({color:0x253536,roughness:.23,metalness:.47});
  const warmWindow=new THREE.MeshStandardMaterial({color:0xaa8250,emissive:0xffb757,emissiveIntensity:.42,roughness:.45});
  for(const [a,b,top]of[[-17,-4,0],[0,8,1.5],[12,18,4]]){
   this.box(b-a-1,5,6.8,windowMat,(a+b)/2,top-3.1,-.2);
   for(let x=a+.65;x<b-.5;x+=1.05){this.box(.045,4.6,.12,this.metal,x,top-3.0,3.24);if(Math.floor(x*3)%3===0)this.box(.85,2.0,.03,warmWindow,x+.45,top-2.9,3.29);}
   this.box(b-a+.2,.36,7.9,this.ivory,(a+b)/2,top-4.9,.3);this.box(b-a,.045,.09,this.gold,(a+b)/2,top-4.66,4.22);
  }
  this.terrace(-23,23,-6.4);
  for(let x=-21;x<23;x+=3.1)this.plant(x,-6.4,5.8,3.0);
  const turf=new THREE.MeshStandardMaterial({color:0x526d3b,roughness:1});this.box(42,.1,2,turf,0,-6.35,6.7);
  this.terrace(-17,-4,0);this.terrace(0,8,1.5);this.terrace(12,18,4);this.bridges=[this.bridge(-4,0,0,1.5),this.bridge(8,12,1.5,4)];
  this.screen('screen1',-11.2,3.4,-.35,8.4,4.2);this.screen('screen2',6.1,4.8,-1.3,4.5,4.1);
  projector.scale.setScalar(.6);projector.position.set(3.4,1.5,.1);projector.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});this.scene.add(projector);this.projector=projector;
  this.ring(1,.045,this.gold,3.4,1.54,1.4);this.ring(.66,.05,this.cyan,-11.2,.04,2.3);this.ring(.62,.045,this.cyan,6.2,1.54,2.3);
  const cone=new THREE.Mesh(new THREE.ConeGeometry(1.2,3.0,30,1,true),new THREE.MeshBasicMaterial({color:0x73e6f0,transparent:true,opacity:.06,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));cone.position.set(4.1,3.6,-.1);cone.rotation.z=-.9;this.scene.add(cone);this.beam=cone;
  this.shadowSteps=[];for(let i=0;i<6;i++){const m=this.box(.37,.11,.75,this.cyan,4.4+i*.26,2.2+i*.3,-.2-i*.12);this.shadowSteps.push(m);}
  for(const [name,x,y,z]of[['01   连路',-11.2,5.85,-.15],['02   投影',3.4,4.15,.3],['03   回声',6.2,7.3,-1.0]]){const t=this.label(name,3,.3);t.position.set(x,y,z);}
  const logo=logoPlate(this,2.4);logo.position.set(-15.5,.8,3.6);this.scene.add(logo);
  this.exitGroup=new THREE.Group();this.exitGroup.position.set(15.2,4,1.7);this.scene.add(this.exitGroup);this.ring(1.65,.1,this.gold,0,.05,0,this.exitGroup);this.ring(1.85,.025,this.gold,0,.06,0,this.exitGroup);this.box(.1,3.1,.1,this.cyan,-1.4,1.55,-.45,this.exitGroup);this.box(.1,3.1,.1,this.cyan,1.4,1.55,-.45,this.exitGroup);this.box(2.9,.09,.1,this.cyan,0,3.08,-.45,this.exitGroup);const cap=this.label('KEEP MOVING',2.2,.3);cap.position.set(15.2,7.6,1.1);
  this.exitLight=new THREE.PointLight(0x8befff,0,6);this.exitLight.position.set(15.2,5,2);this.scene.add(this.exitLight);
  for(const [x,y,z,s]of[[-16,0,-2.3,3],[-5.3,0,-2.4,3.2],[.6,1.5,-2.5,3.5],[7.5,1.5,-3,3.3],[13,4,-2.4,3.2],[17,4,-1.9,3.8],[-16,0,4.5,3],[.6,1.5,4.2,2.6],[16.8,4,4,3.1]])this.plant(x,y,z,s);
  for(const [a,b,y]of[[-15.5,-5.5,0],[1,7,1.5],[13,17,4]]){this.box(b-a,.45,.66,this.ivory,(a+b)/2,y+.20,-3.05);for(let x=a;x<b;x+=1.3)this.plant(x,y+.35,-3.05,1.8);}
  this.foregroundPlants=[this.plant(-19,-4,13,13),this.plant(20,-2,13,15)];
  const globe=new THREE.Group();globe.position.set(16.2,10,-12);this.scene.add(globe);const wire=new THREE.Mesh(new THREE.SphereGeometry(1.7,18,12),new THREE.MeshBasicMaterial({color:0x9df5ff,wireframe:true,transparent:true,opacity:.38,toneMapped:false}));globe.add(wire);this.globe=globe;
 }
 captureDog(){this.renderer.readRenderTargetPixels(this.dog.rt,0,0,112,112,this.pixelData);if(!this.srgbLut)this.srgbLut=Uint8Array.from({length:256},(_,i)=>Math.round(255*(i/255<=.0031308?12.92*i/255:1.055*(i/255)**(1/2.4)-.055)));for(let y=0;y<112;y++)for(let x=0;x<448;x++){const v=this.pixelData[(111-y)*448+x];this.dogImage.data[y*448+x]=x%4===3?v:this.srgbLut[v];}this.dogCanvas.getContext('2d').putImageData(this.dogImage,0,0);}
 updatePortal(dt,state,active){
  if(!this.ready)return;this.tick+=dt;this.grade.uniforms.time.value=this.tick;const p=state.player,inside=state.mode!=='gallery';
  this.dog.update(dt,new V(p.x,p.y,2.3),new V(p.facing,0,0),state.moving);this.dog.visible=!inside;this.boardClock+=dt;
  if(this.boardClock>.07||dt===0){this.boardClock=0;this.captureDog();for(const [mode,b]of Object.entries(this.boards)){drawBoard(b.cv,state,mode,this.dogCanvas,this.tick);b.tx.needsUpdate=true;}}
  for(let i=0;i<2;i++){this.bridgeAmount[i]=THREE.MathUtils.damp(this.bridgeAmount[i],(i?state.echoSolved:state.route)?1:0,5,dt);this.bridges[i].position.y=this.bridges[i].userData.baseY-(1-this.bridgeAmount[i])*2;this.bridges[i].visible=this.bridgeAmount[i]>.015;}
  const angle=state.angle||0;this.beam.rotation.z=THREE.MathUtils.damp(this.beam.rotation.z,-.8+(angle-1)*.5,8,dt);this.beam.material.opacity=state.lamp?.12:.04;this.shadowSteps.forEach((m,i)=>{m.material=state.lamp?this.cyan:this.metal;m.position.y=2.2+i*(angle===1?.3:angle===0?.13:.52);});this.exitLight.intensity=state.echoSolved?4:0;
  const mobile=innerWidth<760,aspect=innerWidth/innerHeight;
  let height;
  if(inside){const target=this.targets[state.mode];this.goalLook.copy(target);this.goalCam.copy(target).add(new V(0,2,17));height=mobile?20:16;}
  else if(mobile&&active){this.goalLook.set(THREE.MathUtils.clamp(p.x,-11,12),p.y+1.5,0);this.goalCam.copy(this.goalLook).add(new V(4,15,23));height=Math.max(21,15/aspect);}
  else{this.goalLook.set(.6,2.5,-1);this.goalCam.copy(this.goalLook).add(new V(5,23,33));height=Math.max(23,43/aspect);}
  const k=dt===0?1:1-Math.exp(-dt*5);this.lookAt.lerp(this.goalLook,k);this.camera.position.lerp(this.goalCam,k);this.setFrustum(THREE.MathUtils.lerp(this.viewHeight,height,k));this.camera.lookAt(this.lookAt);
  this.foregroundPlants.forEach(o=>o.visible=!inside&&!mobile);this.globe.rotation.y=this.tick*.12;this.dof.update(dt,inside?this.targets[state.mode]:new V(p.x,p.y+1,2.3),true,this.renderer.getPixelRatio());this.dof.uniforms.focusBand.value=inside?4:4.8;this.dof.uniforms.farFalloff.value=19;this.dof.uniforms.nearFalloff.value=7;
  this.render();
 }
}
