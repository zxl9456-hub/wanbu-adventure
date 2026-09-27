import {planterTree} from '../model-quality.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {World} from '../world.js';
import {loadBrand,logoPlate,replaceModelBranding} from '../brand.js';
import {PixelCorgi} from '../character.js';
import {STATIONS,SECRETS,CLUES,LIGHT_ANGLES,LIGHT_TARGET,LETTERS,launchSample} from './state.js';
const V=THREE.Vector3;
const basic=c=>new THREE.MeshBasicMaterial({color:c,toneMapped:false});
export class LabWorld extends World{
 constructor(canvas){
  super(canvas);this.renderer.shadowMap.type=THREE.PCFShadowMap;this.scene.background.set(0xc5c5af);this.scene.fog=null;this.scene.children.filter(o=>o.isMesh).forEach(o=>this.scene.remove(o));
  this.renderer.toneMappingExposure=.87;this.cutaway.constant=1000;this.frontCut.constant=1000;this.renderer.info.autoReset=false;for(const rt of [this.composer.renderTarget1,this.composer.renderTarget2])rt.samples=4;this.sun.intensity=3.6;this.sun.color.set(0xffcf8c);this.scene.children.filter(o=>o.isHemisphereLight).forEach(o=>o.intensity=.42);this.sun.position.set(-12,22,8);Object.assign(this.sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:85});this.sun.shadow.camera.updateProjectionMatrix();this.sun.shadow.normalBias=.025;
  this.camera.near=.1;this.camera.far=220;this.camera.updateProjectionMatrix();this.bloom.strength=.13;this.bloom.threshold=1.35;this.dof.blurScale=.8;
  this.ivory=new THREE.MeshStandardMaterial({color:0xddd6c4,roughness:.46,metalness:.08});this.dark=new THREE.MeshStandardMaterial({color:0x23383d,roughness:.3,metalness:.5});this.silver=new THREE.MeshStandardMaterial({color:0xa9b6b2,roughness:.28,metalness:.75});this.cyan=basic(new THREE.Color(.25,1.05,1.3));this.gold=basic(new THREE.Color(1.9,1.3,.5));
  this.glass=new THREE.MeshStandardMaterial({color:0x89bdc4,roughness:.12,metalness:.3,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide});
  this.inspectView='front';this.secretTargets={};this.circuitLines=[];this.energyLights=[];this.objects={};this.cabinets={};this.letters={};this.picks=[];this.rotors=[];this.bridgeRotors=[];this.labels=[];this.detail=null;this.transition=0;this.savedCamera=null;this.goalPos=new V(0,19,27);this.goalTarget=new V(0,1,0);this.resize();
 }
 resize(){if(!this.composer)return;super.resize();if(this.goalPos){this.frame(this.detail,true);this.savedCamera=null;}}
 box(w,h,d,mat,x,y,z,parent=this.scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 ring(r,width,mat,x,y,z,parent=this.scene){const m=new THREE.Mesh(new THREE.RingGeometry(r-width,r,80),mat);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);parent.add(m);return m;}
 line(points,mat,parent=this.scene,width=.025){for(let i=1;i<points.length;i++){const a=new V(...points[i-1]),b=new V(...points[i]),v=b.clone().sub(a);const m=new THREE.Mesh(new THREE.CylinderGeometry(width,width,v.length(),10),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new V(0,1,0),v.normalize());parent.add(m);}}
 text(text,w,h,color='#dceff0',parent=this.scene){const cv=document.createElement('canvas');cv.width=1024;cv.height=Math.round(1024*h/w);const c=cv.getContext('2d');c.fillStyle=color;c.font=`600 ${cv.height*.62}px "PingFang SC", Arial`;c.textAlign='center';c.textBaseline='middle';if(parent===this.coreHologram){c.strokeStyle='#123d4b';c.lineWidth=cv.height*.055;c.lineJoin='round';c.strokeText(text,512,cv.height*.51,990);}c.fillText(text,512,cv.height*.51,990);const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.12,depthWrite:true,toneMapped:false,side:THREE.DoubleSide}));parent.add(m);return m;}
 async load(report){
  let n=0;const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),tl=new THREE.TextureLoader(),names=['bridge-table','light-projector','test-bench','echo-station','anta-door'];
  const all=await Promise.all([...names.map(name=>loader.loadAsync('./assets/lab/refined/'+name+'.glb').then(g=>{report(++n/13,'精密展台就绪');return g;})),loader.loadAsync('./assets/corgi-sports.glb').then(g=>{report(++n/13,'小步已就绪');return g;}),loader.loadAsync('./assets/lab/anta-centre-mini.glb').then(g=>{report(++n/13,'建筑沙盘就绪');return g;}),tl.loadAsync('./assets/golden-planter.png').then(t=>{report(++n/13,'空中花园就绪');return t;}),loadBrand(this).then(()=>report(++n/13,'品牌标识就绪')),...STATIONS.map(s=>loader.loadAsync('./assets/lab/refined/secrets/'+SECRETS[s.id].asset+'.glb').then(g=>{report(++n/13,'隐藏机构就绪');return g;}))]);
  const assets=Object.fromEntries(names.map((n,i)=>[n,all[i]]));this.corgi=all[5];this.building=all[6].scene;this.tree=all[7];this.secretAssets=Object.fromEntries(STATIONS.map((s,i)=>[s.id,all[9+i]]));this.tree.colorSpace=THREE.SRGBColorSpace;
  const pmrem=new THREE.PMREMGenerator(this.renderer);this.scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;this.scene.environmentIntensity=.5;pmrem.dispose();
  const existing=new Set(this.scene.children);this.shell();this.shellGroup=new THREE.Group();for(const child of [...this.scene.children])if(!existing.has(child))this.shellGroup.add(child);this.scene.add(this.shellGroup);
  for(const s of STATIONS){
   const group=new THREE.Group();group.position.set(s.x,0,s.z);this.scene.add(group);this.objects[s.id]=group;
   const key={light:'light-projector',bridge:'bridge-table',test:'test-bench',echo:'echo-station'}[s.id];const g=assets[key].scene;group.add(g);this.prepare(g);if(s.id==='bridge')g.traverse(o=>{if(o.name.includes('Glass_edge_support'))o.material=this.glass;});
   const spec=CLUES[s.id],asset=this.secretAssets[s.id],cabinet=asset.scene;cabinet.scale.setScalar(spec.scale);cabinet.position.set(...spec.position);cabinet.rotation.y=spec.rotation;group.add(cabinet);this.prepare(cabinet);
   let letter;cabinet.traverse(o=>{if(o.name.startsWith('HiddenLetter'))letter=o;});if(!letter)throw new Error('隐藏机构缺少字母节点：'+s.id);letter.visible=false;this.letters[s.id]=letter;
   const mixer=new THREE.AnimationMixer(cabinet);for(const clip of asset.animations){const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();}
   this.cabinets[s.id]={model:cabinet,mixer,clips:asset.animations,duration:Math.max(...asset.animations.map(c=>c.duration)),letter};
   const glint=new THREE.Mesh(new THREE.TorusGeometry(s.id==='echo'?.62:.39,.032,8,48),new THREE.MeshBasicMaterial({color:CLUES[s.id].color,transparent:true,opacity:.8,toneMapped:false,depthWrite:false}));
   glint.position.set(0,.04,s.id==='echo'?0:.43);if(s.id==='echo'){glint.rotation.x=-Math.PI/2;glint.position.y=.11;}cabinet.add(glint);this.secretTargets[s.id]=glint;const mote=new THREE.Mesh(new THREE.OctahedronGeometry(.085,0),new THREE.MeshBasicMaterial({color:CLUES[s.id].color,toneMapped:false}));mote.position.set(0,s.id==='echo'?.2:.05,s.id==='echo'?0:.55);cabinet.add(mote);glint.userData.mote=mote;this.cabinets[s.id].letterBase=letter.position.clone();
   const label=this.text(s.name,3.1,.34,'#c7e5e7',group);label.position.set(0,.77,s.id==='light'?2.4: s.id==='echo'?2.27:1.93);
   const screen=this.box(1.15,.65,.09,new THREE.MeshStandardMaterial({color:0x102d37,roughness:.8,metalness:0}),1.2,1.4,2.1,group);screen.rotation.x=-.4;const cap=this.text(s.sub,1.02,.17,'#89d9e5',screen);cap.position.set(0,.1,.055);const rule=this.text('EXPLORE  →',.91,.16,'#ffffff',screen);rule.position.set(0,-.12,.055);
   const brand=logoPlate(this,.82);brand.position.set(-1.7,.7,s.id==='light'?2.25:s.id==='echo'?2.05:1.94);group.add(brand);
   this.labels.push({id:s.id,point:new V(s.x,3.75,s.z)});
  }
  const fixturesBefore=new Set(this.scene.children);this.makeLight();this.dressMiniature();this.makeBridge();this.makeTest();this.makeEcho();
  this.exit=assets['anta-door'].scene;this.exit.position.set(0,0,-8.7);this.scene.add(this.exit);this.prepare(this.exit);this.exit.traverse(o=>{if(o.name.includes('Door_inset'))o.material=this.glass;});this.exitMixer=new THREE.AnimationMixer(this.exit);this.exitClip=assets['anta-door'].animations[0];for(const clip of assets['anta-door'].animations)this.exitMixer.clipAction(clip).play();
  this.doorLetters=STATIONS.map((s,i)=>{const t=this.text(LETTERS[s.id],.67,.75,'#637d7e');t.position.set((i-1.5)*1.05,5.05,-8.73);this.box(.92,.94,.14,this.ivory,(i-1.5)*1.05,5.05,-8.87);return t;});
  const logo=logoPlate(this,1.4);logo.position.set(0,3.2,-8.44);this.scene.add(logo);this.exitLogo=logo;
  const cv=document.createElement('canvas');cv.width=128;cv.height=256;const ctx=cv.getContext('2d'),glow=ctx.createRadialGradient(64,140,10,64,128,160);glow.addColorStop(0,'#cefdfa');glow.addColorStop(.45,'#68cbd5');glow.addColorStop(1,'#214956');ctx.fillStyle=glow;ctx.fillRect(0,0,128,256);const portalTexture=new THREE.CanvasTexture(cv);portalTexture.colorSpace=THREE.SRGBColorSpace;this.exitPortal=new THREE.Mesh(new THREE.PlaneGeometry(3.12,4.25),new THREE.MeshBasicMaterial({map:portalTexture,toneMapped:false}));this.exitPortal.position.set(0,2.26,-8.8);this.scene.add(this.exitPortal);
  const exitCaption=this.text('KEEP MOVING',2.85,.29,'#8cd7df');exitCaption.position.set(0,.25,-8.39);
  this.galleryFixtures=this.scene.children.filter(o=>!fixturesBefore.has(o)&&![this.backdrop,this.exit,this.sample.root,this.hologram.root,this.echo.root,this.exitLogo,this.exitPortal,...this.doorLetters].includes(o));this.makeCircuit();this.makeAtmosphere();this.frame(null,true);this.camera.position.copy(this.goalPos);this.lookAt.copy(this.goalTarget);this.camera.lookAt(this.lookAt);this.setFrustum(this.goalHeight);
  return {corgi:this.corgi};
 }
 prepare(g){g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){if(m.emissiveIntensity>1)m.emissiveIntensity=.42;}}});}
 shell(){
  const floor=this.ivory.clone();floor.color.set(0x536967);floor.roughness=.64;floor.metalness=.18;floor.onBeforeCompile=s=>{s.vertexShader='varying vec3 floorPos;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloorPos=(modelMatrix*vec4(position,1.)).xyz;');s.fragmentShader='varying vec3 floorPos;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  vec2 uv=floorPos.xz*.52;float seam=min(min(fract(uv.x),1.-fract(uv.x)),min(fract(uv.y),1.-fract(uv.y)));float grain=fract(sin(dot(floor(floorPos.xz*160.),vec2(12.9898,78.233)))*43758.5453);diffuseColor.rgb*=mix(.86,1.,smoothstep(.001,.008,seam))*(.96+.07*grain);`);};
  this.box(27,.55,22,floor,0,-.3,0);this.box(27,.12,22.05,this.dark,0,-.57,0);this.box(27,.055,22.06,this.gold,0,-.45,0);
  this.ring(4.3,.028,this.cyan,0,.012,1);this.ring(4.4,.015,this.silver,0,.013,1);
  this.box(27,1.3,.4,this.ivory,0,.65,-10);this.box(5.8,5.7,.5,this.ivory,0,2.9,-9.3);
  for(const x of [-10,-6.5,6.5,10]){this.box(3.3,4.7,.10,this.glass,x,3.6,-10);for(const dx of [-1.7,1.7])this.box(.11,6.2,.2,this.dark,x+dx,3.1,-10);this.box(3.4,.1,.22,this.dark,x,5.5,-10);}
  this.box(27,.23,.5,this.ivory,0,6.5,-10);this.box(27,.035,.1,this.gold,0,6.36,-9.74);
  for(const x of [-13.3,13.3]){this.box(.35,1.4,17,this.ivory,x,.7,-1.5);this.box(.05,.06,17,this.silver,x,1.44,-1.5);}
  for(const x of [-11,-7.4,7.4,11])this.plant(x,-8.7,3.4);
  for(const x of [-11.4,11.4]){this.plant(x,3.6,3.7);this.plant(x,8.5,4.1);}
  for(const x of [-6,6]){this.box(7,.68,1.25,this.ivory,x,.1,10.1);for(const dx of [-2,0,2])this.plant(x+dx,10.35,2.4);}for(const x of [-12.5,12.5])for(const z of [-6,-2,2,6]){this.box(.12,.7,.12,this.dark,x,.35,z);this.box(.18,.07,.18,this.gold,x,.74,z);}
  this.foregroundPlants=[this.plant(-14,13,10),this.plant(14,13,10)];
  const caption=this.text('SPORTS FOR A BETTER WORLD',5,.34,'#c7e6e4');caption.position.set(0,6,-8.99);
  const pts=[];for(let i=0;i<9;i++)pts.push([0,.02,8.5-i*.7]);for(const p of pts){this.ring(.07,.04,this.cyan,...p);}
 }
 plant(x,z,size){const p=planterTree(x,0,z,size);this.scene.add(p);return p;}
 dressMiniature(){
  this.building.traverse(o=>{if(!o.isMesh)return;const originals=Array.isArray(o.material)?o.material:[o.material];const mats=originals.map(orig=>{const m=orig.clone(),name=(m.name+' '+o.name).toLowerCase();m.metalness=.06;m.roughness=.65;m.envMapIntensity=.35;if(m.emissive)m.emissiveIntensity=0;
   if(/glass|curtain/.test(name)){m.color.set(0x21383c);m.transparent=/rail/.test(name);m.opacity=m.transparent?.35:1;m.depthWrite=!m.transparent;m.roughness=.26;m.metalness=.32;if('transmission'in m)m.transmission=0;}
   else if(/green|grass|shurb|shrub|lawn/.test(name)){m.color.set(0x466739);m.roughness=.9;}
   else if(/^light( |$)/.test(m.name.toLowerCase())){m.color.set(0xffd59b);m.emissive.set(0xffba59);m.emissiveIntensity=1.8;}
   else if(/wood/.test(name))m.color.set(0xa8784c);
   else if(/mullion|dark metal|shadow box|division/.test(name)){m.color.set(0x263538);m.metalness=.5;}
   else if(/grc|ribbon|white|slab|stone|columns|soffit|plaster|terrazzo/.test(name))m.color.set(0xc9bea5);
   return m;});o.material=Array.isArray(o.material)?mats:mats[0];o.castShadow=true;o.receiveShadow=true;});
  replaceModelBranding(this);
 }
 makeLight(){const g=this.objects.light;
  const centers=[[-.5,2.66,-.80],[.5,2.66,-.80],[0,2.39,-.80]];
  for(let i=0;i<3;i++){const p=new THREE.Group();p.position.set(...centers[i]);g.add(p);this.rotors.push(p);const len=i===2?1.16:2.02;this.box(.095,len,.13,this.cyan,0,0,0,p);for(const y of [-len/2,len/2])this.box(.2,.13,.2,this.silver,0,y,0,p);
   const ghost=new THREE.Group();ghost.position.set(...centers[i]);ghost.position.z=-.86;ghost.rotation.z=LIGHT_ANGLES[LIGHT_TARGET[i]]*Math.PI/180;g.add(ghost);this.box(.025,len,.012,basic(0xb3ad89),0,0,0,ghost);
  }
  const legend=this.text('ALIGN THE LIGHT',2.5,.2,'#90dfe9',g);legend.position.set(0,3.72,-.85);
 }
 makeBridge(){
  const g=this.objects.bridge;this.building.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(this.building),size=b.getSize(new V()),center=b.getCenter(new V());
  const mini=new THREE.Group();const scale=3.45/Math.max(size.x,size.z);mini.scale.setScalar(scale);mini.add(this.building,this.brandArchitecture);this.brandArchitecture.position.sub(new V(center.x,b.min.y,center.z));this.building.position.sub(new V(center.x,b.min.y,center.z));mini.position.set(0,1.31,-.62);g.add(mini);
  this.building.traverse(o=>{if(o.isMesh){if(['White_R1232','Red_R1233'].includes(o.name)||/^Layer_1[56]_/.test(o.name))o.visible=false;const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){m.envMapIntensity=.4;}}});
  // Same original building model also supplies the view beyond the gallery windows.
  const backdrop=mini.clone(true);backdrop.scale.setScalar(55/Math.max(size.x,size.z));backdrop.position.set(0,-1,-29);this.scene.add(backdrop);this.backdrop=backdrop;backdrop.traverse(o=>{if(o.isMesh)o.castShadow=false;});
  this.bridgeBoard=new THREE.Group();this.bridgeBoard.position.set(0,1.48,1.17);this.bridgeBoard.scale.set(.84,1,.33);g.add(this.bridgeBoard);this.box(4.95,.07,2.9,this.dark,0,0,0,this.bridgeBoard);
  const y=.08;this.line([[-2,y,1],[-1,y,1]],this.gold,this.bridgeBoard,.045);this.line([[-1,y,0],[-1,y,-1],[1,y,-1],[1,y,0]],this.gold,this.bridgeBoard,.045);this.line([[1,y,1],[2,y,1]],this.gold,this.bridgeBoard,.045);
  for(const x of [-1,1]){const p=new THREE.Group();p.position.set(x,y,1);this.bridgeBoard.add(p);this.line([[0,0,-1],[0,0,0],[1,0,0]],this.cyan,p,.075);this.ring(.19,.035,this.cyan,0,.01,0,p);this.bridgeRotors.push(p);}
  for(const [x,z]of[[-2,1],[0,-1],[2,1]])this.ring(.19,.075,this.gold,x,y+.02,z,this.bridgeBoard);
  this.bridgeDot=new THREE.Mesh(new THREE.SphereGeometry(.16,12,8),this.cyan);this.bridgeDot.position.set(-2,y+.2,1);this.bridgeBoard.add(this.bridgeDot);
 }
 makeTest(){const g=this.objects.test;this.sample=new PixelCorgi(this,this.corgi,{echo:true});this.sample.sprite.scale.set(1.3,1.3,1);this.sample.root.position.set(5.05,1.65,-3.65);this.landing=new THREE.Group();g.add(this.landing);this.box(1,.13,1.1,this.cyan,0,2.31,.35,this.landing);for(const z of [-.08,.78])this.box(.05,1,.05,this.silver,0,1.8,z,this.landing);
  this.line([[-2.2,3.05,.9],[2.5,3.05,.9]],basic(0x8cd9a5),g,.02);const target=this.text('目标高度',1.5,.24,'#94d6a2',g);target.position.set(.3,3.35,.95);
  this.trail=[];for(let i=0;i<26;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.034,6,6),this.cyan);g.add(p);this.trail.push(p);}
 }
 makeEcho(){const g=this.objects.echo;this.hologram=new PixelCorgi(this,this.corgi,{echo:true});this.hologram.sprite.scale.set(2.8,2.8,1);this.hologram.root.position.set(7,1.1,4);this.echo=new PixelCorgi(this,this.corgi,{echo:true});this.echo.sprite.scale.set(2.7,2.7,1);this.echo.visible=false;this.bridgeDog=new THREE.Sprite(new THREE.SpriteMaterial({map:this.hologram.rt.texture,transparent:true,alphaTest:.15,depthWrite:true,toneMapped:false}));this.bridgeDog.scale.set(.7,.7,1);this.bridgeDog.center.set(.5,.22);this.bridgeDog.position.y=.07;this.bridgeDot.add(this.bridgeDog);
  this.pads=[new V(4.7,0,7.1),new V(8.9,0,7.1)];this.pads.forEach((p,i)=>{this.ring(.86,.065,this.cyan,p.x,.07,p.z);this.ring(.95,.02,this.silver,p.x,.055,p.z);this.box(1.5,.06,1.5,this.dark,p.x,.015,p.z);const t=this.text(i?'02':'01',.5,.35,'#9beff0');t.position.copy(p).y=.08;t.rotation.x=-Math.PI/2;});
 }
 inspect(view){this.inspectView=view;this.frame(this.detail);}
 frame(id,instant=false){
  const aspect=innerWidth/innerHeight,mobile=innerWidth<760;this.detail=id;this.transition=instant?0:.7;
  if(!id){this.inspectView='front';this.goalHeight=Math.max(17.8,(mobile?23:30)/aspect);this.goalTarget.set(0,mobile?-2:2.1,0);this.goalPos.copy(this.goalTarget).add(new V(0,18,27));return;}
  const station=STATIONS.find(s=>s.id===id),view=this.inspectView||'front';let point,offset,width;
  if(id==='door'){point=new V(0,2.3,-8.5);offset=new V(0,9,14);width=7.5;}
  else if(view==='cache'){
   const spec=CLUES[id];this.cabinets[id].model.updateWorldMatrix(true,true);point=this.cabinets[id].model.localToWorld(new V(id==='light'?.35:0,0,id==='bridge'?.55:0));
   offset=id==='echo'?new V(0,9,3.4):new V(0,3,7).applyAxisAngle(new V(0,1,0),spec.rotation);width=id==='light'?3.4:id==='bridge'?3.6:3.2;
  }else{
   point=new V(station.x,1.45,station.z+(id==='echo'?1:0));width=id==='echo'?9:8.8;
   offset={front:new V(0,9,14),rear:new V(1,5,-12),low:new V(0,2.9,13),top:new V(0,16,2.5)}[view]||new V(0,9,14);
  }
  this.goalHeight=mobile?Math.max(width/aspect,view==='cache'?6:12):Math.max(width/(aspect*.61),view==='cache'?4:8.7);
  const forward=offset.clone().normalize().negate(),right=new V().crossVectors(forward,new V(0,1,0)).normalize(),up=new V().crossVectors(right,forward).normalize();
  this.goalTarget.copy(point).addScaledVector(mobile?up:right,this.goalHeight*(mobile?-.22:aspect*.19));this.goalPos.copy(this.goalTarget).add(offset);
 }
 makeCircuit(){
  for(const [i,s] of STATIONS.entries()){
   const curve=new THREE.CatmullRomCurve3([new V(s.x,.045,s.z),new V(s.x*.48,.045,s.z),new V(s.x*.24,.045,1),new V(0,.045,1)]);
   const material=new THREE.MeshBasicMaterial({color:0x7ba2a3,transparent:true,opacity:.26,toneMapped:false});const path=new THREE.Mesh(new THREE.TubeGeometry(curve,32,.037,6,false),material);this.scene.add(path);
   const pulse=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),this.cyan);this.scene.add(pulse);pulse.visible=false;this.circuitLines.push({id:s.id,curve,path,pulse});
   const lamp=new THREE.PointLight(0x87eaff,0,12,2);lamp.position.set(s.x,3.7,s.z);this.scene.add(lamp);this.energyLights.push(lamp);
   const arch=new THREE.Group();this.scene.add(arch);arch.position.set(s.x,0,s.z-2.65);
   for(const x of [-2.6,2.6]){this.box(.09,4.6,.09,this.silver,x,2.3,0,arch);this.box(.045,4.4,.03,material,x,2.3,.07,arch);}this.box(5.3,.07,.08,this.silver,0,4.6,0,arch);this.box(5.15,.035,.035,material,0,4.6,.06,arch);
   this.circuitLines[i].arch=arch;
  }
  this.coreHologram=new THREE.Group();this.scene.add(this.coreHologram);this.coreHologram.position.set(0,2.1,1);this.coreHologram.visible=false;
  const material=new THREE.MeshBasicMaterial({color:0x7de8f4,wireframe:true,transparent:true,opacity:.85,toneMapped:false});this.coreHologram.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.35,2),material));this.coreHologram.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.30,2),new THREE.MeshBasicMaterial({color:0x164455,transparent:true,opacity:.82,depthWrite:false}))); 
  for(let i=0;i<3;i++){const orbit=new THREE.Mesh(new THREE.TorusGeometry(1.7+i*.22,.018,6,80),this.cyan);orbit.rotation.set(i*.7,i*.85,0);this.coreHologram.add(orbit);}
  this.ignitionLetters=STATIONS.map((s,i)=>{const letter=this.text(LETTERS[s.id],.65,.85,'#d1fcff',this.coreHologram);letter.position.set((i-1.5)*.65,-.12,1.5);return letter;});
 }
 secretHit(ray,id){const target=this.secretTargets[id];return !!target&&target.visible&&ray.intersectObjects([target,target.userData.mote],true).length>0;}
 updateLab(dt,state,run={}){
  const macro=this.detail&&this.inspectView==='cache',isolated=!!this.detail&&this.detail!=='door',searching=this.detail&&this.detail!=='door'&&!state.discovered.has(this.detail);
  for(const o of this.galleryFixtures)o.visible=!isolated;this.shellGroup.visible=true;this.shellGroup.children.forEach((o,i)=>o.visible=!isolated||i<3);this.exit.visible=!isolated;if(this.backdrop)this.backdrop.visible=!isolated&&innerWidth>=760;
  for(const [id,group]of Object.entries(this.objects)){group.visible=!isolated||id===this.detail;for(const child of group.children)child.visible=!macro||child===this.cabinets[id].model;}
  this.sample.visible=!macro&&(!isolated||this.detail==='test');this.hologram.visible=!macro&&state.collected.has('echo')&&(!isolated||this.detail==='echo');this.echo.visible=!macro&&!!run.echoTime;
  this.renderer.info.reset();for(const p of this.foregroundPlants)p.visible=!this.detail&&innerWidth>=760;this.tick+=dt;this.transition=Math.max(0,this.transition-dt);const k=1-Math.exp(-dt*6);this.lookAt.lerp(this.goalTarget,k);this.camera.position.lerp(this.goalPos,k);this.setFrustum(THREE.MathUtils.lerp(this.viewHeight,this.goalHeight,k));this.camera.lookAt(this.lookAt);
  const focus=macro?this.cabinets[this.detail].model.getWorldPosition(new V()):this.detail?new V(STATIONS.find(s=>s.id===this.detail)?.x||0,2,STATIONS.find(s=>s.id===this.detail)?.z||-8):new V(0,1,1);
  this.dof.update(dt,focus,true,this.renderer.getPixelRatio());Object.assign(this.dof.uniforms.focusBand,{value:this.detail?4.5:6.2});this.dof.uniforms.nearFalloff.value=7;this.dof.uniforms.farFalloff.value=16;
  this.rotors.forEach((p,i)=>p.rotation.z=THREE.MathUtils.damp(p.rotation.z,LIGHT_ANGLES[state.light[i]]*Math.PI/180,12,dt));
  this.bridgeBoard.position.y=1.48;this.bridgeBoard.position.z=THREE.MathUtils.damp(this.bridgeBoard.position.z,1.17,5,dt);this.bridgeBoard.scale.z=THREE.MathUtils.damp(this.bridgeBoard.scale.z,.33,5,dt);
  this.bridgeRotors.forEach((p,i)=>p.rotation.y=THREE.MathUtils.damp(p.rotation.y,-state.bridges[i]*Math.PI/2,12,dt));
  this.landing.position.x=-1.95+[1.2,2.1,3.1][state.landing];
  const trajectory=launchSample(state.power,state.landing,run.testTime||0),tp=run.testRunning?trajectory:{x:0,y:0};this.sample.update(dt,new V(5.05+tp.x,1.65+Math.max(0,tp.y),-3.65),new V(1,0,0),!!run.testRunning);
  this.trail.forEach((p,i)=>{const a=launchSample(state.power,state.landing,i*.045);p.position.set(-1.95+a.x,1.65+a.y,.35);p.visible=a.y>=0&&a.x<5.4;});
  this.hologram.update(dt,new V(7,2.1,4),new V(.7,0,1),false);this.echo.visible=!macro&&!!run.echoTime;if(this.echo.visible)this.echo.update(dt,this.pads[0],new V(1,0,0),false);
  this.bridgeDot.position.copy(this.bridgePosition(run.bridgeProgress||0));this.bridgeDog.visible=!!run.bridgeRunning;
  for(const s of STATIONS){
   const c=this.cabinets[s.id];c.mixer.setTime(Math.min(.999999,state.cabinets[s.id])*c.duration);c.letter.visible=state.released.has(s.id)&&state.cabinets[s.id]>=1&&!state.collected.has(s.id);if(c.letter.visible){c.letter.position.copy(c.letterBase);c.letter.position.y+=.13+Math.sin(state.time*2)*.05;}
   const glint=this.secretTargets[s.id];glint.visible=!state.released.has(s.id);glint.userData.mote.visible=glint.visible;glint.userData.mote.rotation.y=state.time;glint.scale.setScalar(1+Math.sin(state.time*2+s.x)*.035);
   glint.material.opacity=.4+Math.sin(state.time*2.6+s.x)**2*.5;glint.userData.mote.scale.setScalar(run.scanTime>0&&run.sniffId===s.id?1.65:1);
  }
  const lit=state.inserted?THREE.MathUtils.smoothstep(state.lightingTime,1.2,7.5):0;
  this.scene.background.set(macro?0x203e43:0x1b343a);this.renderer.toneMappingExposure=macro?.93:.95+lit*.06;this.sun.intensity=macro?1.7:2.15+lit*.65;this.sun.color.set(0xffdda9);this.bloom.strength=macro?.12:.14+lit*.1;this.bloom.threshold=1.4;
  this.scene.children.filter(o=>o.isHemisphereLight).forEach(o=>o.intensity=.6+lit*.2);
  this.circuitLines.forEach((c,i)=>{
   const connected=state.collected.has(c.id),power=state.inserted?THREE.MathUtils.smoothstep(state.lightingTime,i*.85+1,i*.85+2.4):0;
   c.path.visible=c.arch.visible=!isolated;c.path.material.opacity=.18+(connected?.2:0)+power*.62;c.path.material.color.set(power>.1?0x349eae:connected?0xcab274:0x799695);
   c.pulse.visible=!isolated&&connected;c.pulse.position.copy(c.curve.getPoint(((this.tick*(state.inserted?.42:.16)+i*.21)%1+1)%1));this.energyLights[i].intensity=(isolated&&this.detail!==c.id)?0:2.4+power*5+(run.sniffId===c.id&&run.scanTime>0?3:0);
  });
  this.coreHologram.visible=!this.detail&&state.inserted;this.coreHologram.scale.setScalar(Math.max(.01,THREE.MathUtils.smoothstep(state.lightingTime,3.7,6.5)));this.coreHologram.children[0].rotation.y=this.tick*.15;
  if(this.exitClip)this.exitMixer.setTime(Math.min(.999999,state.door)*this.exitClip.duration);this.exitLogo.visible=!isolated&&state.door<.3;this.exitPortal.visible=!isolated&&state.door>.05;
  this.updateAtmosphere(state,run,isolated,macro);
  this.doorLetters.forEach((t,i)=>{t.visible=!isolated;t.material.color.set(state.collected.has(STATIONS[i].id)?0x8befff:0x557273);});

 }
 makeAtmosphere(){
  this.guideId=null;this.guideDots=[];const geometry=new THREE.SphereGeometry(.055,8,6),material=new THREE.MeshBasicMaterial({color:0xb4f6da,transparent:true,opacity:.85,toneMapped:false});
  for(let i=0;i<20;i++){const dot=new THREE.Mesh(geometry,material);dot.visible=false;this.scene.add(dot);this.guideDots.push(dot);}
  this.accentFixtures=new THREE.Group();this.scene.add(this.accentFixtures);
  const brass=new THREE.MeshStandardMaterial({color:0xb99d68,metalness:.78,roughness:.3}),stone=new THREE.MeshStandardMaterial({color:0x425458,metalness:.12,roughness:.72});
  for(const s of STATIONS){
   const frame=new THREE.Group();frame.position.set(s.x,0,s.z-2.6);this.accentFixtures.add(frame);
   this.box(5.5,4.9,.11,stone,0,2.48,0,frame);for(let i=-8;i<=8;i++)this.box(.025,4.55,.055,brass,i*.31,2.5,.09,frame);
   this.box(5.5,.1,.6,this.dark,0,4.97,0,frame);this.box(5.15,.025,.18,new THREE.MeshBasicMaterial({color:0xffe0a6}),0,4.91,.14,frame);
   const word=this.text(s.sub,4.5,.27,'#deccaa',frame);word.position.set(0,4.5,.16);
   const light=new THREE.PointLight(0xffddb4,5,8,2);light.position.set(0,4,.6);frame.add(light);frame.userData.station=s.id;
  }
  this.focusLight=new THREE.PointLight(0xd9fff5,0,7,2);this.scene.add(this.focusLight);
  this.dust=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:0xc4f5e3,size:.026,transparent:true,opacity:.45,depthWrite:false}));
  const points=[];for(let i=0;i<90;i++){points.push(Math.sin(i*23.17)*12,.8+(i%19)*.22,Math.cos(i*13.4)*9);}this.dust.geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));this.scene.add(this.dust);
 }
 guideTo(id){this.guideId=id;}
 updateAtmosphere(state,run,isolated,macro){
  this.accentFixtures.children.forEach(frame=>frame.visible=!isolated||frame.userData.station===this.detail);this.accentFixtures.visible=!macro;
  this.guideDots.forEach((dot,i)=>{dot.visible=!this.detail&&run.scanTime>0&&this.guideId;const s=STATIONS.find(s=>s.id===this.guideId);if(!s)return;const t=(i/20+state.time*.12)%1;dot.position.set(s.x*t,.10+Math.sin(t*Math.PI)*.12,3.6+(s.z-3.6)*t);dot.scale.setScalar(.7+Math.sin(t*Math.PI));});
  this.focusLight.intensity=macro?6:0;if(macro)this.focusLight.position.copy(this.cabinets[this.detail].model.getWorldPosition(new V())).add(new V(-1,2,2));this.dust.visible=!macro;this.dust.rotation.y=state.time*.006;
 }
 bridgePosition(t){const path=[[-2,1],[-1,1],[-1,-1],[1,-1],[1,1],[2,1]],lens=[1,2,2,2,1];let n=t*8;for(let i=0;i<5;i++){if(n<=lens[i]){const a=path[i],b=path[i+1],k=n/lens[i];return new V(a[0]+(b[0]-a[0])*k,.28,a[1]+(b[1]-a[1])*k);}n-=lens[i];}return new V(2,.28,1);}
 floorAt(clientX,clientY){const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(clientX/innerWidth*2-1,1-clientY/innerHeight*2),this.camera);return ray.ray.intersectPlane(new THREE.Plane(new V(0,1,0),0),new V());}
}
