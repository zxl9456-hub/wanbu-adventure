import './pixel/ui-images.js';
import {createPixelPass,loadPixelSettings,resizePixelWorld,setPixelMode,preparePixelFrame} from './pixel/look.js';
import {PIXEL_MODES} from './pixel/config.js';
import {refineModels,planterTree} from './model-quality.js';
import {dressArchitecture,addGardenDetails,buildCutawayCaps} from './art-direction.js';
import {loadBrand,replaceModelBranding} from './brand.js';
import {InteractivePond} from './interactive-water.js';
import {AdventureDepthOfField} from './depth-of-field.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
export const V=THREE.Vector3;
export const COLORS={mint:0x83eeff,cyan:0x65ddff,gold:0xffd264};
export const toWorld=(x,y,h=0)=>new V(x-300,h,60-y);
export class World{
 constructor(canvas){
  this.pixelOptions=loadPixelSettings();this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance',alpha:false});
  this.renderer.setPixelRatio(1);this.renderer.localClippingEnabled=true;this.cutaway=new THREE.Plane(new V(0,-1,0),90);this.frontCut=new THREE.Plane(new V(-.35,0,-.937),1000);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.82;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xbfc7b4);this.scene.fog=new THREE.FogExp2(0xc5b69a,.0018);
  this.camera=new THREE.OrthographicCamera(-100,100,60,-60,.1,1200);this.camera.position.set(160,140,210);this.lookAt=new V(3,18,-19);this.camera.lookAt(this.lookAt);this.viewHeight=152;this.cameraOffset=new V(14,22,38);this.cutawayEnabled=true;this.sightFocus=new V();this.sightDirection=new V();this.sightActive={value:0};
  this.scene.add(new THREE.HemisphereLight(0xabc5df,0x323828,.62));
  this.sun=new THREE.DirectionalLight(0xffd197,3.7);this.sun.position.set(-45,55,38);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-80,right:80,top:80,bottom:-80,near:1,far:270});this.sun.shadow.bias=-.0004;this.sun.shadow.normalBias=.06;this.scene.add(this.sun);this.scene.add(this.sun.target);
  const fill=new THREE.DirectionalLight(0xb2d2f2,.22);fill.position.set(70,40,-60);this.scene.add(fill);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(1500,1500),new THREE.MeshStandardMaterial({color:0x71766a,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=-1.1;ground.receiveShadow=true;this.scene.add(ground);
  this.composer=new EffectComposer(this.renderer);for(const rt of[this.composer.renderTarget1,this.composer.renderTarget2])rt.depthTexture=new THREE.DepthTexture(1,1);this.composer.addPass(new RenderPass(this.scene,this.camera));this.dof=new AdventureDepthOfField(this.camera);this.dof.enabled=localStorage.getItem('wanbu-dof')!=='off';this.composer.addPass(this.dof);this.bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.19,.38,1.6);this.bloom.enabled=true;this.composer.addPass(this.bloom);
  this.composer.addPass(new OutputPass());
  this.grade=createPixelPass();this.composer.addPass(this.grade);
  this.dof.enabled=false;this.bloom.enabled=false;
  this.fx=new THREE.Group();this.scene.add(this.fx);this.tick=0;this.playing=false;this.resize();addEventListener('resize',()=>this.resize());
 }
 resize(){let w=document.documentElement.clientWidth,h=document.documentElement.clientHeight;resizePixelWorld(this,w,h);this.setFrustum(this.viewHeight);}
 setFrustum(height){this.viewHeight=height;const aspect=innerWidth/innerHeight;this.camera.left=-height*aspect/2;this.camera.right=height*aspect/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.updateProjectionMatrix();}
 async load(onProgress){
  let done=0;const report=(label)=>{done++;onProgress(done/3,label);};const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const [building,corgi,nav]=await Promise.all([
   loader.loadAsync('./assets/anta-centre.glb').then(g=>{report('建筑已就绪');return g}),
   loader.loadAsync('./assets/corgi-animated.glb').then(g=>{report('小步已就绪');return g}),
   fetch('./assets/navigation.json').then(r=>{if(!r.ok)throw new Error('导航数据加载失败');return r.json()}).then(n=>{report('路线已就绪');return n}),
   loadBrand(this)
  ]);
  this.building=building.scene;this.building.name='Original ANTA Centre — optimized source geometry';
  dressArchitecture(this);
  replaceModelBranding(this);
  const pmrem=new THREE.PMREMGenerator(this.renderer);this.scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;this.scene.environmentIntensity=.10;pmrem.dispose();this.scene.add(this.building);this.corgi=corgi;this.nav=nav;this.landDots=await fetch('./assets/land-dots.json').then(r=>r.json());await this.addLife();addGardenDetails(this);buildCutawayCaps(this);this.pond=new InteractivePond(this);this.modelsRefined=false;return {corgi,nav};
 }

 async addLife(){
  const loader=new THREE.TextureLoader();const [tree,employee]=await Promise.all([loader.loadAsync('./assets/golden-planter.png'),loader.loadAsync('./assets/office-employee.png')]);
  for(const tex of[tree,employee]){tex.colorSpace=THREE.SRGBColorSpace;tex.magFilter=tex===tree?THREE.LinearFilter:THREE.NearestFilter;tex.anisotropy=4;}
  this.people=[];this.foliage=[];
  this.foreground=new THREE.Group();this.camera.add(this.foreground);this.scene.add(this.camera);
  for(let i=0;i<3;i++){const mat=new THREE.SpriteMaterial({map:tree,transparent:true,alphaTest:.15,depthWrite:true,toneMapped:false,color:i===2?0x7d9454:0xa3b178});const leaf=new THREE.Sprite(mat);leaf.center.set(.5,0);this.foreground.add(leaf);}
  const sprite=(tex,x,y,h,height,ratio)=>{if(tex===tree){const pos=toWorld(x,y,h),o=planterTree(pos.x,pos.y,pos.z,height);this.scene.add(o);return o;}const m=new THREE.SpriteMaterial({map:tex,transparent:true,alphaTest:.12,depthWrite:true,toneMapped:false});const o=new THREE.Sprite(m);o.center.set(.5,.02);o.scale.set(height*ratio,height,1);o.position.copy(toWorld(x,y,h));this.scene.add(o);return o;};
  for(const [x,y,h,size]of[[339,31,0,4.5],[362,37,0,5],[337,53,6,4.8],[329,52,6,4.5],[321,62,6,4.2],[352,54,6,4.8],[344,21,0,4.5],[359,26,0,4.8],[339,26,0,5],[365,32,0,5.5],[343,47,6,4.5],[339,52,6,4.8],[333,46,6,4.5],[330,58,6,4.6],[324,66,6,5],[315,72,6,5],[309,71,6,4.8],[350,51,6,4.5]])this.foliage.push(sprite(tree,x,y,h,size,1));
  for(const [x,y,h]of[[357,21,0],[348,46,6],[336,49,6],[316,69,6]])this.people.push(sprite(employee,x,y,h,2.25,2/3));
 }
 update(dt,player){
  this.tick+=dt;this.grade.uniforms.time.value=this.tick;this.pond?.update(dt,this.playing?player:null);
  if(this.playing&&player){
   this.sightActive.value=1;this.sightFocus.copy(player).y+=.9;this.sightDirection.copy(this.cameraOffset).normalize();
   for(const tree of this.foliage){const delta=tree.position.clone().add(new V(0,1.6,0)).sub(this.sightFocus),along=delta.dot(this.sightDirection),across=delta.addScaledVector(this.sightDirection,-along).length();const opacity=THREE.MathUtils.damp(tree.material.opacity,along>.7&&across<2.3?.18:1,10,dt);tree.traverse(o=>{if(o.isMesh){o.material.opacity=opacity;o.material.depthWrite=opacity>.98;}});}
   this.cutaway.constant=THREE.MathUtils.damp(this.cutaway.constant,this.cutawayEnabled?player.y+2.8:90,5,dt);const direction=this.cameraOffset.clone().setY(0).normalize();this.frontCut.normal.copy(direction).negate();this.frontCut.constant=direction.dot(player)-1.;this.capPlane.copy(this.frontCut).negate();this.sectionCap.position.y=this.cutaway.constant+.015;this.sectionCap.visible=true;this.capFocus.copy(player).addScaledVector(this.cameraOffset,(this.cutaway.constant-player.y)/this.cameraOffset.y);
   const target=player.clone().add(new V(0,.7,0));this.lookAt.lerp(target,1-Math.exp(-dt*4));
   const desired=this.lookAt.clone().add(this.cameraOffset);this.camera.position.lerp(desired,1-Math.exp(-dt*3));this.camera.lookAt(this.lookAt);
   this.setFrustum(THREE.MathUtils.lerp(this.viewHeight,innerWidth<700?31:27,1-Math.exp(-dt*2.5)));
   this.sun.position.copy(player).add(new V(-45,55,38));this.sun.target.position.copy(player);this.sun.target.updateMatrixWorld();
   const foliage=this.foreground.children;foliage[0].scale.set(18,18,1);foliage[0].position.set(this.camera.left-1,-this.viewHeight*.72,-18);
   foliage[1].scale.set(23,23,1);foliage[1].position.set(this.camera.right+2,-this.viewHeight*.80,-17);
   foliage[2].scale.set(29,29,1);foliage[2].position.set(this.camera.right+12,-this.viewHeight*.15,-19);this.foreground.visible=true;
   if(this.sun.shadow.camera.right!==45){Object.assign(this.sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45});this.sun.shadow.camera.updateProjectionMatrix();}
  }else{
   this.sightActive.value=0;if(this.foreground)this.foreground.visible=false;if(this.sectionCap)this.sectionCap.visible=false;this.camera.position.set(153+Math.sin(this.tick*.06)*12,125,190+Math.cos(this.tick*.06)*8);this.lookAt.set(8,19,-19);this.camera.lookAt(this.lookAt);
  }
  const focus=this.playing&&player?player.clone().add(new V(0,1,0)):this.lookAt;this.dof.update(dt,focus,this.playing,this.renderer.getPixelRatio());
 }
 setPixelMode(mode){return setPixelMode(this,mode);}
 cyclePixelMode(){const modes=Object.keys(PIXEL_MODES);return this.setPixelMode(modes[(modes.indexOf(this.pixelOptions.mode)+1)%modes.length]);}
 get pixelLabel(){return PIXEL_MODES[this.pixelOptions.mode].name;}
 render(){preparePixelFrame(this);if(!this.modelsRefined){this.modelAudit=refineModels(this.scene);this.modelsRefined=true;}this.composer.render();}
 project(v){const p=v.clone().project(this.camera);return {x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight};}
 groundHeight(pos,reference=0){const n=this.nav;const sx=pos.x+300,sy=60-pos.z;const i=Math.round((sx-n.x)/n.step),j=Math.round((sy-n.y)/n.step);if(i<0||j<0||i>=n.nx||j>=n.ny)return null;const hs=n.levels.map(l=>l[j][i]).filter(v=>v!==null&&v<=reference+.65&&v>=reference-.8);return hs.length?Math.max(...hs):null;}
 staticHeight(sx,sy,level=1){const n=this.nav;let i=Math.round((sx-n.x)/n.step),j=Math.round((sy-n.y)/n.step);return n.levels[level]?.[j]?.[i]??0;}
}
