import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Shared, offline art library. Visual geometry never changes collision surfaces.
const geometries=new Map(), finished=new WeakSet();
export function softBox(w,h,d,r=Math.min(.065,Math.min(w,h,d)*.16)){
 const key=[w,h,d,r].join('/');if(geometries.has(key))return geometries.get(key);
 const g=new THREE.BoxGeometry(1,1,1,3,3,3),p=g.attributes.position,n=g.attributes.normal;
 const half=[w/2,h/2,d/2],v=new THREE.Vector3(),q=new THREE.Vector3();
 for(let i=0;i<p.count;i++){
  const a=[p.getX(i),p.getY(i),p.getZ(i)].map((t,k)=>Math.abs(t)>.49?Math.sign(t)*half[k]:Math.sign(t)*(half[k]-r));
  v.set(...a);q.set(...a.map((t,k)=>THREE.MathUtils.clamp(t,-half[k]+r,half[k]-r)));
  const normal=v.clone().sub(q).normalize();v.copy(q).addScaledVector(normal,r);p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);
 }
 g.computeBoundingBox();g.computeBoundingSphere();g.name='Precision bevel';g.type='PrecisionBoxGeometry';geometries.set(key,g);return g;
}
export function finishMaterial(m,kind='auto'){
 if(!m?.isMeshStandardMaterial||finished.has(m))return;finished.add(m);
 const name=m.name.toLowerCase();
 if(kind==='auto')kind=/green|grass|shrub|foliage/.test(name)?'leaf':/wood/.test(name)?'wood':/glass|optical/.test(name)||(m.transparent&&m.opacity<.5)?'glass':/metal|alumin|alloy|champagne|graphite/.test(name)||m.metalness>.35?'metal':/corgi/.test(name)?'fur':'stone';
 m.userData.finish=kind;if(kind==='metal'){m.roughness=THREE.MathUtils.clamp(m.roughness,.28,.45);m.envMapIntensity=Math.max(m.envMapIntensity,.65);}if(kind==='stone'&&/ceramic|porcelain/.test(name))m.roughness=.46;
 if(kind==='glass'){m.roughness=Math.min(m.roughness,.2);return;}
 if(kind==='leaf'){m.roughness=.88;return;}
 if(kind==='fur'){m.roughness=.92;m.metalness=0;return;}
 const old=m.onBeforeCompile,cache=m.customProgramCacheKey.bind(m),previous=cache();
 m.customProgramCacheKey=()=>previous+'-precision-36-'+kind;
 m.onBeforeCompile=(s,r)=>{
  old.call(m,s,r);
  s.vertexShader='varying vec3 finishPosition;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfinishPosition=position;');
  s.fragmentShader=`varying vec3 finishPosition;
   float finishHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float finishNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(finishHash(i),finishHash(i+vec3(1,0,0)),f.x),mix(finishHash(i+vec3(0,1,0)),finishHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(finishHash(i+vec3(0,0,1)),finishHash(i+vec3(1,0,1)),f.x),mix(finishHash(i+vec3(0,1,1)),finishHash(i+vec3(1)),f.x),f.y),f.z);}
  `+s.fragmentShader;
  const detail=kind==='metal'?'finishNoise(finishPosition*vec3(4.,220.,4.))':kind==='wood'?'finishNoise(finishPosition*vec3(5.,5.,95.))':'finishNoise(finishPosition*84.)';
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nfloat finishGrain=${detail};diffuseColor.rgb*=.965+.055*finishGrain;`);
  s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(finishGrain-.5)*.075,.12,1.);`);
 };
 m.needsUpdate=true;
}
export function refineModels(root){
 const stats={meshes:0,beveled:0,materials:0};const materials=new Set();
 root.traverse(o=>{
  if(!o.isMesh)return;stats.meshes++;
  for(const m of Array.isArray(o.material)?o.material:[o.material]){finishMaterial(m);materials.add(m);if(m.map)m.map.anisotropy=4;}
  if(o.geometry?.type==='BoxGeometry'&&!o.userData.keepSharp){
   const {width:w,height:h,depth:d}=o.geometry.parameters;
   if(Math.min(w,h,d)>.09&&!o.material?.isMeshBasicMaterial){o.geometry=softBox(w,h,d);stats.beveled++;}
  }
 });stats.materials=materials.size;root.userData.modelQuality=stats;return stats;
}
const palette={stone:0xd4c9b5,soil:0x302f24,bark:0x675343,metal:0x938772};
let plantTemplates;
function buildPlantTemplates(){
 const leafShape=new THREE.Shape();leafShape.moveTo(0,-.11);leafShape.quadraticCurveTo(.075,-.02,0,.13);leafShape.quadraticCurveTo(-.07,-.01,0,-.11);
 const leaf=new THREE.ShapeGeometry(leafShape,6);leaf.rotateX(-Math.PI/2);
 const stone=new THREE.MeshStandardMaterial({color:palette.stone,roughness:.64}),bark=new THREE.MeshStandardMaterial({color:palette.bark,roughness:.94}),leaves=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.84,side:THREE.DoubleSide}),metal=new THREE.MeshStandardMaterial({color:palette.metal,roughness:.32,metalness:.65}),soil=new THREE.MeshStandardMaterial({color:palette.soil,roughness:1});
 leaves.name='Olive foliage';stone.name='Planter ceramic';bark.name='Bark wood';metal.name='Planter metal';[stone,bark,metal].forEach(m=>finishMaterial(m));
 return Array.from({length:3},(_,variant)=>{
  const g=new THREE.Group();g.name='Olive / sculpted canopy '+variant;const scaledMesh=(geo,mat)=>{const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
  const pot=scaledMesh(new THREE.LatheGeometry([new THREE.Vector2(.11,0),new THREE.Vector2(.113,.012),new THREE.Vector2(.134,.17),new THREE.Vector2(.142,.178),new THREE.Vector2(.142,.19),new THREE.Vector2(.131,.19),new THREE.Vector2(.128,.177)],40),stone);pot.position.y=.01;
  const rim=scaledMesh(new THREE.TorusGeometry(.137,.009,4,24),metal);rim.rotation.x=Math.PI/2;rim.position.y=.20;
  const earth=scaledMesh(new THREE.CircleGeometry(.128,20),soil);earth.rotation.x=-Math.PI/2;earth.position.y=.19;
  const branches=[],foliage=[],dummy=new THREE.Object3D(),a=new THREE.Vector3(),b=new THREE.Vector3(),dir=new THREE.Vector3(),color=new THREE.Color();
  const rand=k=>{const f=Math.sin(k*73.73+variant*231.3)*43147.2;return f-Math.floor(f);};
  const branch=(start,end,r1,r2)=>{a.set(...start);b.set(...end);dir.subVectors(b,a);const geo=new THREE.CylinderGeometry(r2,r1,dir.length(),7);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize()));geo.translate(...a.add(b).multiplyScalar(.5).toArray());branches.push(geo);};
  branch([0,.18,0],[.025,.72,0],.022,.008);
  for(let j=0;j<8;j++){
   const ang=j*2.399+variant,cy=.52+rand(j+10)*.30,rad=.12+rand(j+20)*.12,cx=Math.cos(ang)*rad,cz=Math.sin(ang)*rad;
   branch([.02,.37+j*.035,0],[cx,cy,cz],.01,.0025);
   for(let k=0;k<55;k++){
    const i=j*55+k,theta=rand(i+30)*Math.PI*2,rr=Math.sqrt(rand(i+1000))*.13,yy=(rand(i+2000)-.5)*.17;
    dummy.position.set(cx+Math.cos(theta)*rr,cy+yy,cz+Math.sin(theta)*rr);dummy.rotation.set(rand(i+9)*2.8,rand(i+71)*6.28,rand(i+41));dummy.scale.set(.32,.32,.32);dummy.updateMatrix();const geo=leaf.clone().applyMatrix4(dummy.matrix);
    color.setHSL(.20+rand(i+800)*.085,.38+rand(i+500)*.22,.105+rand(i+201)*.115);
    const cols=[];for(let n=0;n<geo.attributes.position.count;n++)cols.push(color.r,color.g,color.b);geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));foliage.push(geo);
   }
  }
  scaledMesh(mergeGeometries(branches),bark);scaledMesh(mergeGeometries(foliage),leaves);[...branches,...foliage].forEach(x=>x.dispose());
  return g;
 });
}
export function planterTree(x,y,z,height=4){
 plantTemplates??=buildPlantTemplates();const index=Math.abs(Math.round(x*7+z*11))%3;const root=plantTemplates[index].clone(true);
 // Legacy callers tint foreground plants through .material.
 root.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;}});const foliage=root.children.at(-1);root.material=foliage.material;
 root.position.set(x,y,z);root.scale.setScalar(height);root.rotation.y=(x*17+z*13)%6.28;return root;
}

export function craftBench(parent){
 const frame=new THREE.MeshStandardMaterial({color:0x243e40,metalness:.72,roughness:.29}),wood=new THREE.MeshStandardMaterial({color:0x927052,roughness:.65,metalness:0});wood.name='Oiled ash wood';finishMaterial(wood);finishMaterial(frame);
 for(let i=0;i<6;i++){const slat=new THREE.Mesh(softBox(2.62,.075,.115,.025),wood);slat.position.set(0,.74,-.69+i*.135);slat.castShadow=true;parent.add(slat);}
 for(const x of[-1.11,1.11]){const arm=new THREE.Mesh(new THREE.TorusGeometry(.27,.035,6,20,Math.PI),frame);arm.rotation.y=Math.PI/2;arm.position.set(x,.91,-.33);parent.add(arm);}
}

// Layered panels respect each platform's exact upper collision plane.
export function deckDetails(parent,width,depth=4.2){
 const trim=new THREE.MeshStandardMaterial({color:0x7f8c83,metalness:.65,roughness:.35}),stone=new THREE.MeshStandardMaterial({color:0xc4b9a4,roughness:.7});finishMaterial(trim);finishMaterial(stone);
 const panelCount=Math.max(1,Math.floor(width/2.4)),panelWidth=(width-.4)/panelCount;
 const inst=new THREE.InstancedMesh(softBox(panelWidth-.065,.37,.06,.018),stone,panelCount),bolt=new THREE.InstancedMesh(new THREE.CylinderGeometry(.035,.035,.025,8),trim,panelCount*2),o=new THREE.Object3D();
 for(let i=0;i<panelCount;i++){const x=-width/2+.2+panelWidth*(i+.5);o.position.set(x,-.33,depth/2+.012);o.rotation.set(0,0,0);o.updateMatrix();inst.setMatrixAt(i,o.matrix);for(let k=0;k<2;k++){o.position.set(x+(k?1:-1)*(panelWidth/2-.14),-.33,depth/2+.058);o.rotation.x=Math.PI/2;o.updateMatrix();bolt.setMatrixAt(i*2+k,o.matrix);}}
 inst.castShadow=inst.receiveShadow=true;parent.add(inst,bolt);
}
