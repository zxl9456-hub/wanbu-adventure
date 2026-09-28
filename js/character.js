import * as THREE from 'three';
import {finishMaterial} from './model-quality.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
export class PixelCorgi{
 constructor(world,gltf,{echo=false}={}){
  this.world=world;this.echo=echo;this.root=new THREE.Group();this.world.scene.add(this.root);
  this.renderScene=new THREE.Scene();this.model=clone(gltf.scene);this.renderScene.add(this.model);
  const box=new THREE.Box3().setFromObject(this.model);const size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());
  this.model.position.set(-center.x,-box.min.y,-center.z);this.pivot=new THREE.Group();this.renderScene.remove(this.model);this.pivot.add(this.model);this.renderScene.add(this.pivot);
  this.model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.material=o.material.clone();finishMaterial(o.material,'fur');if(echo){o.material.color.set(0x50f7ec);o.material.emissive=new THREE.Color(0x19aeba);o.material.emissiveIntensity=1.1;o.material.roughness=1;}}});
  this.renderScene.add(new THREE.HemisphereLight(0xfffff2,0x5b6572,1.5));const sun=new THREE.DirectionalLight(0xffe2ba,2);sun.position.set(-3,5,4);this.renderScene.add(sun);const rim=new THREE.DirectionalLight(0xa8e6e3,.85);rim.position.set(3,3,-4);this.renderScene.add(rim);
  this.camera=new THREE.OrthographicCamera(-1.45,1.45,1.45,-1.45,.1,25);this.camera.position.set(0,2.8,7);this.camera.lookAt(0,.7,0);
  this.rt=new THREE.WebGLRenderTarget(112,112,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,format:THREE.RGBAFormat});
  const material=new THREE.SpriteMaterial({map:this.rt.texture,transparent:true,alphaTest:.15,depthWrite:true,toneMapped:false,color:echo?0x9ffff5:0xffffff,opacity:echo?.7:1});
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec2 pixel=vec2(1./112.);float border=0.;
   border=max(border,texture2D(map,vMapUv+vec2(pixel.x,0.)).a);border=max(border,texture2D(map,vMapUv-vec2(pixel.x,0.)).a);
   border=max(border,texture2D(map,vMapUv+vec2(0.,pixel.y)).a);border=max(border,texture2D(map,vMapUv-vec2(0.,pixel.y)).a);
   if(diffuseColor.a<.15&&border>.35){diffuseColor=vec4(${echo?'vec3(.38,1.,1.)':'vec3(.012,.008,.004)'},${echo?'.8':'1.'});}
   else{diffuseColor.rgb=floor(diffuseColor.rgb*18.+.5)/18.;${echo?'diffuseColor.rgb*=.8+.2*sin(vMapUv.y*225.);':''}}
  `);};material.customProgramCacheKey=()=>echo?'pixel-echo-v36':'pixel-corgi-v36';
  this.sprite=new THREE.Sprite(material);this.sprite.scale.set(3.8,3.8,1);this.sprite.center.set(.5,.27);this.root.add(this.sprite);
  const cv=document.createElement('canvas');cv.width=cv.height=64;const ctx=cv.getContext('2d');ctx.fillStyle=echo?'rgba(99,183,178,.28)':'rgba(23,38,56,.28)';ctx.fillRect(8,20,48,24);ctx.fillRect(16,12,32,40);ctx.fillStyle=echo?'rgba(155,224,200,.32)':'rgba(23,38,56,.32)';ctx.fillRect(16,20,32,24);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false,toneMapped:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;this.root.add(shadow);
  this.mixer=new THREE.AnimationMixer(this.model);this.actions={};gltf.animations.forEach(clip=>{this.actions[clip.name]=this.mixer.clipAction(clip)});this.current=null;this.play('Idle');this.facing=0;this.lastRender=0;
 }
 play(name){let action=this.actions[name]||Object.values(this.actions)[0];if(action===this.current)return;this.current?.fadeOut(.15);action?.reset().fadeIn(.15).play();this.current=action;}
 update(dt,pos,direction,moving,dashing=false){this.root.position.copy(pos);if(direction.lengthSq()>.01)this.facing=THREE.MathUtils.damp(this.facing,Math.atan2(direction.x,direction.z),12,dt);this.pivot.rotation.y=this.facing;this.play(dashing?'Run':moving?'Walk':'Idle');this.mixer.update(dt*(dashing?1.9:moving?1.6:1));this.lastRender+=dt;if(this.lastRender>1/16){this.lastRender=0;this.render();}}
 render(){const r=this.world.renderer;const old=r.getRenderTarget(),color=r.getClearColor(new THREE.Color()),alpha=r.getClearAlpha(),tone=r.toneMapping;r.setRenderTarget(this.rt);r.setClearColor(0x000000,0);r.toneMapping=THREE.NoToneMapping;r.clear();r.render(this.renderScene,this.camera);r.setRenderTarget(old);r.setClearColor(color,alpha);r.toneMapping=tone;}
 set visible(v){this.root.visible=v;}get visible(){return this.root.visible;}
}
