import {deckDetails} from '../model-quality.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {SportsWorld,roundedDeck,BASE_Y} from '../sports/world.js';
import {dressArchitecture,addGardenDetails} from '../art-direction.js';
import {loadBrand,replaceModelBranding,logoPlate} from '../brand.js';
import {PixelCorgi} from '../character.js';
import {BRANDS,HOOP,RINGS,REFLECTORS,onBeat} from './course.js';
export {BASE_Y};
const V=THREE.Vector3;
const box=(w,h,d,m,x,y,z)=>{const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);a.position.set(x,y,z);a.castShadow=a.receiveShadow=true;return a;};
export class RelayCorgi extends PixelCorgi{
 constructor(world,gltf,options){super(world,gltf,options);this.sprite.scale.set(3.1,3.1,1);this.shadow=this.root.children[1];}
 animate(dt,p){this.root.position.set(p.x,BASE_Y+p.y,0);this.pivot.rotation.y=p.facing*Math.PI/2;this.play(p.finished?'Celebrate':!p.grounded?(p.vy>0?'Jump':'Fall'):p.landing?'Land':Math.abs(p.vx)>.1?(p.dashTime?'Run':'Walk'):'Idle');this.mixer.update(dt*(Math.abs(p.vx)>.1?1.6:1));this.lastRender+=dt;if(this.lastRender>1/24){this.render();this.lastRender=0;}this.shadow.visible=p.grounded;}
}
export class RelayWorld extends SportsWorld{
 constructor(canvas){super(canvas);this.cameraOffset.set(0,12,32);this.renderer.toneMappingExposure=.98;this.bloom.strength=.23;this.dof.blurScale=1.1;this.npcSprites=[];this.markers=[];this.cameraReady=false;this.scene.fog.density=.002;for(const rt of[this.composer.renderTarget1,this.composer.renderTarget2])rt.samples=4;}
 resize(){super.resize();if(this.composer){const aspect=innerWidth/innerHeight;this.viewWidth=aspect<.8?18.5:innerHeight<500?38:40;this.setFrustum(this.viewWidth/aspect);}}
 async load(report=()=>{}){
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),tl=new THREE.TextureLoader();let n=0;const names=['relay-hoop','relay-lift','relay-reflector','relay-node','relay-ball'];
  const complete=t=>v=>{report(++n/11,t);return v;};
  const all=await Promise.all([
   loader.loadAsync('./assets/lab/anta-centre-mini.glb').then(complete('上海中心建筑就绪')),
   loader.loadAsync('./assets/corgi-sports.glb').then(complete('小步的运动动作就绪')),
   tl.loadAsync('./assets/golden-planter.png').then(complete('空中花园就绪')),
   tl.loadAsync('./assets/sports-energy-paw.png').then(complete('足迹光效就绪')),
   tl.loadAsync('./assets/relay/team-atlas.png').then(complete('四位接力伙伴就绪')),
   ...names.map(name=>loader.loadAsync('./assets/relay/'+name+'.glb').then(complete('精密接力装置就绪'))),loadBrand(this).then(complete('安踏标识就绪'))
  ]);
  this.building=all[0].scene;this.treeTexture=all[2];this.pawTexture=all[3];this.teamTexture=all[4];for(const t of[this.treeTexture,this.pawTexture,this.teamTexture])t.colorSpace=THREE.SRGBColorSpace;
  this.teamTexture.magFilter=this.teamTexture.minFilter=THREE.NearestFilter;this.teamTexture.generateMipmaps=false;
  this.props=Object.fromEntries(names.map((name,i)=>[name,all[5+i].scene]));
  dressArchitecture(this);replaceModelBranding(this);addGardenDetails(this);const bounds=new THREE.Box3().setFromObject(this.building),size=bounds.getSize(new V()),center=bounds.getCenter(new V());
  this.architecture=new THREE.Group();const shift=new V(center.x,bounds.min.y,center.z);this.building.position.sub(shift);this.brandArchitecture.position.sub(shift);this.gardenShrubs.position.sub(shift);this.artProps.position.sub(shift);this.architecture.add(this.building,this.brandArchitecture,this.gardenShrubs,this.artProps);this.architecture.scale.setScalar(.45);this.architecture.rotation.y=.6;this.architecture.position.set(32,-5,-57);this.scene.add(this.architecture);
  this.building.traverse(o=>{if(o.isMesh){o.castShadow=false;for(const m of(Array.isArray(o.material)?o.material:[o.material])){const before=m.onBeforeCompile,cache=m.customProgramCacheKey.bind(m);m.onBeforeCompile=shader=>{before(shader);shader.fragmentShader=shader.fragmentShader.replace('interior*.025+lamp*.26','interior*.14+lamp*1.2');};m.customProgramCacheKey=()=>cache()+'-relay-warm';}if(/Layer_(08|09|10|11|12|13|14|15|16|17|18)_/.test(o.name))o.visible=false;}});
  const pmrem=new THREE.PMREMGenerator(this.renderer);this.scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;this.scene.environmentIntensity=.22;pmrem.dispose();
  this.foreground=new THREE.Group();this.camera.add(this.foreground);this.scene.add(this.camera);for(let i=0;i<3;i++){const t=this.tree(0,0,0,1);t.material.color.set(0x859653);this.foreground.add(t);}
  return {corgi:all[1]};
 }
 prop(name,x,y,z=0){const g=this.props[name].clone(true);g.position.set(x,BASE_Y+y,z);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.name.includes('glass')){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.35;o.material.depthWrite=false;}}});this.scene.add(g);return g;}
 label(text,x,y,width=3.5,color='#eef7f5'){const m=this.text(text,width,.56,color,'#284145');m.position.set(x,BASE_Y+y,-1.15);this.scene.add(m);return m;}
 marker(x,y,label,gold=false){const node=this.prop('relay-node',x,y,0);node.scale.setScalar(.85);this.label(label,x,y+.55,3.6,gold?'#ffe4a4':'#b6f8ff');this.markers.push(node);return node;}
 setupCourse(sim){
  this.modelsRefined=false;
  this.physics=sim;this.platformMeshes.clear();
  for(const p of sim.platforms){const w=p.right-p.left;let g;
   if(p.type==='lift'||p.type==='moving'){g=this.props['relay-lift'].clone(true);g.scale.x=w/4;}else{
    g=new THREE.Group();g.add(roundedDeck(w,p.type==='wood'?6:3.9,.65,this.stone));deckDetails(g,w,p.type==='wood'?6:3.9);g.add(box(w-.2,.05,.06,this.warm,0,-.08,1.99));
    if(p.type==='wood'){const c=document.createElement('canvas');c.width=2048;c.height=256;const ct=c.getContext('2d');ct.fillStyle='#ae8157';ct.fillRect(0,0,2048,256);for(let i=0;i<128;i++){ct.fillStyle=i%3?'#b68b60':'#bd946c';ct.fillRect(i*16+1,0,14,256);}ct.strokeStyle='#e9dec4';ct.lineWidth=3;ct.strokeRect(20,20,2008,216);ct.beginPath();ct.arc(1630,128,99,0,Math.PI*2);ct.stroke();ct.strokeRect(1770,54,238,148);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const floor=new THREE.Mesh(new THREE.PlaneGeometry(w,5.9),new THREE.MeshStandardMaterial({map:tex,roughness:.66}));floor.rotation.x=-Math.PI/2;floor.position.y=.009;g.add(floor);}
    if(w>5){this.gardenBed(g,w);g.add(box(w-.4,.07,.06,this.trim,0,1.1,-1.7));g.add(box(w-.4,.88,.025,this.glass,0,.64,-1.7));for(let x=-w/2+.3;x<w/2;x+=2.2)g.add(box(.035,1.05,.045,this.trim,x,.6,-1.7));
     for(let x=-w/2+1;x<w/2;x+=2.7)g.add(this.tree(x,0,-2.9,1.65));
     for(let x=-w/2+2;x<w/2;x+=9){g.add(this.tree(x,0,-2.4,3.4));g.add(box(.46,18,.6,this.stone,x,-9.6,-1.3));}
    }
   }
   if(p.id==='upper-run'){g.traverse(o=>{if(o.material){o.material=o.material.clone();o.material.transparent=true;o.material.userData.baseOpacity=o.material.opacity;}});}
   g.position.set((p.left+p.right)/2,BASE_Y+p.y,0);g.name='接力步道 '+p.id;this.scene.add(g);this.platformMeshes.set(p.id,g);
  }
  for(const x of[48.5,51.5]){this.scene.add(box(.08,7.2,.1,this.steel,x,BASE_Y+3,-1.6));this.scene.add(box(.025,7.2,.03,this.cyan,x,BASE_Y+3,-1.52));}
  for(const [x,y,label]of[[6,0,'发球圈 · 42° / 14'],[29,0,'接应圈'],[41,0,'回声联动 · E'],[71,6,'移动接应台'],[88,0,'助攻起点']])this.marker(x,y,label);
  this.marker(118,0,'跃起顶球',true);this.hoop=this.prop('relay-hoop',HOOP.x,0,0);this.hoop.rotation.y=.55;this.label('KEEP MOVING',131,5.4,5,'#fff2d2');
  for(const r of REFLECTORS){const g=this.prop('relay-reflector',r.x,r.y-1.1,0);g.scale.z=.8;g.rotation.y=.65;this.label('反弹板',r.x,r.y+r.h+.6,2.7);}
  this.ringMeshes=RINGS.map(r=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(.65,.038,8,48),this.warm);ring.position.set(r.x,BASE_Y+r.y,0);this.scene.add(ring);return {r,ring};});
  for(const [x,y,title]of[[5,4.5,'水平连廊 · 团队相遇'],[43,9,'垂直中庭 · 上下联动'],[93,5,'午间球场 · 一起开赛']]){this.label(title,x,y,7,'#fff3dc');const logo=logoPlate(this,3.4);logo.position.set(x+4.5,BASE_Y+y+2,-3);this.scene.add(logo);}
  for(const n of sim.npcs){const tex=this.teamTexture.clone();tex.needsUpdate=true;tex.repeat.set(.25,1/3);tex.offset.set(n.index*.25,2/3);const mat=new THREE.SpriteMaterial({map:tex,transparent:true,alphaTest:.15,depthWrite:true,toneMapped:false});const sprite=new THREE.Sprite(mat);sprite.center.set(.5,.13);sprite.scale.set(2.75,2.75,1);this.scene.add(sprite);const name=this.label(n.id,n.x,n.y+2.55,n.id==='DESCENTE'?3.1:2.1);const halo=new THREE.Mesh(new THREE.TorusGeometry(.85,.027,8,48),this.cyan);halo.rotation.x=-Math.PI/2;this.scene.add(halo);this.npcSprites.push({sprite,tex,name,halo});}
  this.ball=this.prop('relay-ball',sim.ball.x,sim.ball.y,0);this.ballLight=new THREE.PointLight(0x87eeff,2,4,2);this.scene.add(this.ballLight);
  this.trail=Array.from({length:43},()=>{const p=new THREE.Mesh(new THREE.SphereGeometry(.06,6,4),this.cyan);this.scene.add(p);return p;});
  this.beatRing=new THREE.Mesh(new THREE.TorusGeometry(1.4,.055,8,64),this.warm);this.beatRing.rotation.x=-Math.PI/2;this.beatRing.position.set(118,BASE_Y+.28,0);this.scene.add(this.beatRing);
  for(const [x,y]of[[32,0],[78,6]]){for(const z of[-1.6,1.6])this.scene.add(box(.15,3.4,.15,this.steel,x,BASE_Y+y+1.7,z));this.scene.add(box(.12,.12,3.35,this.cyan,x,BASE_Y+y+3.4,0));this.label('下一棒 →',x,y+4,3);}
  this.addGlobe(135,BASE_Y+7,-4);
 }
 resetCamera(p){this.lookAt.set(Math.max(10,p.x+6),BASE_Y+p.y+3,0);this.camera.position.copy(this.lookAt).add(this.cameraOffset);this.camera.lookAt(this.lookAt);this.cameraReady=true;}
 update(dt,p){if(!p)return;this.tick+=dt;this.grade.uniforms.time.value=this.tick;this.architecture.position.x=32+p.x*.72;
  for(const plat of p.platforms){const g=this.platformMeshes.get(plat.id);g.position.x=(plat.left+plat.right)/2;g.position.y=BASE_Y+plat.y;}
  for(const n of p.npcs){const {sprite,tex,name,halo}=this.npcSprites[n.index];const row=p.finished||n.cheer>0?2:n.walking?1:0;tex.offset.y=(2-row)/3;tex.repeat.x=n.facing>0&&row!==2?-.25:.25;tex.offset.x=(n.index+(tex.repeat.x<0?1:0))*.25;sprite.position.set(n.x,BASE_Y+n.y+(n.walking?Math.abs(Math.sin(this.tick*13))*.07:0),0);name.position.set(n.x,BASE_Y+n.y+2.4,-.3);halo.position.set(n.x,BASE_Y+n.y+.03,0);halo.material=p.visited.has(n.id)?this.warm:this.cyan;}
  this.ball.position.set(p.ball.x,BASE_Y+p.ball.y,0);this.ball.rotation.z-=dt*(p.ball.owner?1.2:p.ball.vx);this.ball.rotation.x+=dt*1.1;this.ballLight.position.copy(this.ball.position);
  const overhead=this.platformMeshes.get('upper-run');const under=p.stage===0&&p.x>13&&p.x<31&&p.y<1.25;overhead.traverse(o=>{if(o.material){const base=o.material.userData.baseOpacity??1;o.material.opacity=THREE.MathUtils.damp(o.material.opacity,base*(under?.18:1),12,dt);o.material.depthWrite=!under&&base>.6;}});
  const points=p.finished||(p.stage===2&&p.phase==='shot-ready'&&p.x>=116&&p.x<=123)?[]:p.predictedPoints();this.trail.forEach((m,i)=>{m.visible=!!points[i];if(points[i])m.position.set(points[i].x,BASE_Y+points[i].y,.02);});
  for(const {r,ring}of this.ringMeshes){ring.visible=!p.rings.has(r.id);ring.rotation.y=Math.sin(this.tick*.8)*.15;}
  this.beatRing.material=onBeat(p.time)?this.cyan:this.warm;this.beatRing.scale.setScalar(1+Math.sin(this.tick*3)*.03);
  for(let i=this.bursts.length-1;i>=0;i--){const b=this.bursts[i];b.life-=dt;b.s.position.addScaledVector(b.v,dt);b.v.y-=4*dt;b.s.material.opacity=Math.max(0,b.life/b.total);if(b.life<=0){this.scene.remove(b.s);b.s.material.dispose();this.bursts.splice(i,1);}}
  if(this.globe)this.globe.rotation.y=this.tick*.2;
  let cx=p.x+6;if(!p.ball.owner)cx=THREE.MathUtils.clamp((p.x+p.ball.x)/2+2,p.x+2,p.x+9);if(p.finished)cx=126;
  const floor=this.floorBelow(p.x,p.y),cy=BASE_Y+(p.grounded?p.y:floor??Math.max(0,p.y-2))+3;
  this.lookAt.x=THREE.MathUtils.damp(this.lookAt.x,Math.max(10,cx),4,dt);this.lookAt.y=THREE.MathUtils.damp(this.lookAt.y,cy,3.5,dt);this.camera.position.copy(this.lookAt).add(this.cameraOffset);this.camera.lookAt(this.lookAt);
  this.sun.position.set(this.lookAt.x-22,BASE_Y+40,22);this.sun.target.position.set(this.lookAt.x,BASE_Y,0);this.sun.target.updateMatrixWorld();Object.assign(this.sun.shadow.camera,{left:-28,right:28,top:29,bottom:-28});this.sun.shadow.camera.updateProjectionMatrix();
  const h=this.viewHeight,[a,b,c]=this.foreground.children;a.position.set(this.camera.left-4,-h*.62,-9);a.scale.set(16,16,1);b.position.set(this.camera.right+3,-h*.68,-10);b.scale.set(18,18,1);c.position.set(this.camera.right+4,h*.3,-9);c.scale.set(14,14,1);
  this.dof.update(dt,new V(p.x,BASE_Y+p.y+.8,0),true,this.renderer.getPixelRatio());this.dof.uniforms.focusBand.value=6;this.dof.uniforms.farFalloff.value=55;this.dof.uniforms.nearFalloff.value=17;
 }
}
