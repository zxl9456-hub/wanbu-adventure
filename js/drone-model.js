import * as THREE from 'three';
import {softBox,finishMaterial} from './model-quality.js';

/** A reusable mechanical model; the game renders each variant as a pixel actor. */
export function createDroneModel(kind='scout'){
 const root=new THREE.Group();root.name='Training drone / '+kind;
 const boss=kind==='guardian',sentry=kind==='sentry';
 const shell=new THREE.MeshStandardMaterial({color:boss?0xbaa080:0xd3d8cb,roughness:.38,metalness:.28});
 const dark=new THREE.MeshStandardMaterial({color:0x18373e,roughness:.28,metalness:.72});
 const alloy=new THREE.MeshStandardMaterial({color:0x8faaa9,roughness:.3,metalness:.82});
 const lens=new THREE.MeshStandardMaterial({color:boss?0xffc16a:sentry?0xa9b0ff:0x98f5ed,emissive:boss?0xff8826:sentry?0x8475ed:0x45d9e6,emissiveIntensity:1.7,roughness:.15,metalness:.2});
 [shell,dark,alloy].forEach(m=>finishMaterial(m));
 const add=(geo,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);root.add(m);return m;};
 const body=add(new THREE.SphereGeometry(.56,24,16),shell,0,.14,0);body.scale.set(1.15,.79,.8);
 add(softBox(.86,.27,.12,.06),dark,0,.13,.43);
 const eye=add(new THREE.SphereGeometry(.17,20,12),lens,0,.14,.52);eye.scale.set(1,.62,.45);
 const rim=add(new THREE.TorusGeometry(.21,.025,6,32),alloy,0,.14,.51);rim.scale.y=.75;
 for(const x of[-.48,.48]){
  add(softBox(.22,.46,.42,.05),dark,x,-.2,0);add(softBox(.17,.23,.32,.04),shell,x,-.27,.03);
  add(new THREE.CylinderGeometry(.11,.08,.11,16),lens,x,-.47,0);
  const wing=add(softBox(.38,.10,.34,.035),alloy,x*1.5,.04,-.02);wing.rotation.z=x>0?-.16:.16;
  for(let i=0;i<3;i++)add(softBox(.026,.09,.026,.006),dark,x+(.065-i*.065),.21,.43);
 }
 add(new THREE.CylinderGeometry(.014,.02,.28,8),alloy,.27,.64,-.1);add(new THREE.SphereGeometry(.044,12,8),lens,.27,.80,-.1);
 for(let i=0;i<4;i++)add(softBox(.09,.018,.18,.006),alloy,-.2+i*.13,.56,-.1);
 const belt=add(new THREE.TorusGeometry(.51,.035,6,40),alloy,0,.05,0);belt.rotation.x=Math.PI/2;belt.scale.x=1.25;
 if(kind==='shield')for(const x of[-.87,.87]){const shield=add(softBox(.20,.77,.4,.06),shell,x,0,.1);shield.rotation.z=x>0?-.18:.18;add(softBox(.035,.59,.025,.008),lens,x,.02,.32);}
 if(sentry){add(softBox(.27,.23,.68,.035),dark,0,-.11,.65);add(new THREE.TorusGeometry(.095,.024,6,20),lens,0,-.11,1.01);}
 if(boss){for(const x of[-.93,.93]){add(softBox(.43,.6,.58,.08),shell,x,.02,0);add(new THREE.SphereGeometry(.14,16,12),lens,x,.06,.35);}const crown=add(new THREE.TorusGeometry(.81,.035,6,48),lens,0,.22,-.19);crown.rotation.x=.25;}
 return root;
}
const targets=new WeakMap();
export function droneTexture(world,kind){
 let cache=targets.get(world);if(!cache){cache=new Map();targets.set(world,cache);}if(cache.has(kind))return cache.get(kind).texture;
 const scene=new THREE.Scene();scene.add(createDroneModel(kind));scene.add(new THREE.HemisphereLight(0xe6f6ef,0x314959,2.1));
 const key=new THREE.DirectionalLight(0xffdec0,3.4);key.position.set(-3,5,5);scene.add(key);const rim=new THREE.DirectionalLight(0x89c9eb,2);rim.position.set(3,1,-3);scene.add(rim);
 const camera=new THREE.OrthographicCamera(-1.35,1.35,1.35,-1.35,.1,20);camera.position.set(1.25,.85,5);camera.lookAt(0,.14,0);
 const rt=new THREE.WebGLRenderTarget(112,112,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
 const r=world.renderer,previous=r.getRenderTarget(),color=r.getClearColor(new THREE.Color()),alpha=r.getClearAlpha();r.setRenderTarget(rt);r.setClearColor(0,0);r.clear();r.render(scene,camera);r.setRenderTarget(previous);r.setClearColor(color,alpha);
 // RenderTarget owns the cached texture for the world's lifetime.
 const disposed=new Set();scene.traverse(o=>{if(!o.isMesh)return;for(const item of[o.geometry,...(Array.isArray(o.material)?o.material:[o.material])])if(!disposed.has(item)){if(item.type!=='PrecisionBoxGeometry')item.dispose();disposed.add(item);}});
 cache.set(kind,rt);return rt.texture;
}
