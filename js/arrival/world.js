import * as THREE from 'three';
import {roundedDeck} from '../sports/world.js';
import {HURDLES,BLOCKS,BUMPERS,CHECKPOINTS,ARRIVAL_COINS} from './content.js';
const mat=(color,metalness=.08,roughness=.55)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const glow=color=>new THREE.MeshBasicMaterial({color,toneMapped:false});
export function makeArrivalRoom(w,id,r){
 const root=new THREE.Group();root.visible=false;w.scene.add(root);const v={root,pickups:[],interact:new Map(),caches:[],decor:[],coins:[],blocks:[],bumpers:[],flags:[]};w.roomViews[id]=v;
 const cream=mat(0xdccfba),edge=mat(0xf1e6cd),gold=mat(0xf4bb4c,.65,.25),dark=mat(0x173a43,.35,.25),orange=mat(0xdf6942),blue=mat(0x20355c),cyan=glow(0x98f1ed),green=mat(0x658c36),glass=new THREE.MeshPhysicalMaterial({color:0xabcace,transparent:true,opacity:.22,roughness:.2,depthWrite:false});
 v.materials={cream,edge,gold,dark,orange,cyan,green};
 w.box(135,.5,92,mat(0x465d33),51,-5,-25,root);
 // The collision-defined promenade is continuous with the real building entrance.
 for(const p of r.platforms.filter(p=>!p.id.startsWith('hurdle'))){const length=p.right-p.left,center=(p.right+p.left)/2,g=new THREE.Group();g.position.set(center,p.y,0);root.add(g);g.add(roundedDeck(length,5.6,.55,cream));w.box(length-.1,.07,.08,gold,0,-.1,2.86,g);w.box(length,.1,.11,edge,0,-.5,2.8,g);
  for(let x=p.left+.6;x<p.right;x+=2){w.box(.022,.02,5.2,edge,x,.018,0,root);const foot=new THREE.Mesh(new THREE.PlaneGeometry(.46,.55),new THREE.MeshBasicMaterial({map:w.pawTexture,transparent:true,depthWrite:false,color:0x90e9ed,toneMapped:false}));foot.rotation.x=-Math.PI/2;foot.position.set(x,.035,-.45);root.add(foot);}
  w.box(length,.88,.025,glass,center,.48,-2.7,root);w.box(length,.035,.06,gold,center,.93,-2.7,root);for(let x=p.left+.2;x<p.right;x+=3)w.box(.045,.95,.045,dark,x,.48,-2.7,root);
 }
 // A running lane and planted borders keep sport visible around the architectural model.
 w.box(110,.15,3.4,blue,52,-1.15,5.4,root);for(const z of[4.2,5.2,6.2])w.box(110,.01,.035,edge,52,-1.06,z,root);
 for(const h of HURDLES){w.box(h.w,h.h-.15,1.3,orange,h.x+h.w/2,(h.h-.15)/2,0,root);w.box(h.w+.1,.15,1.4,edge,h.x+h.w/2,h.h-.075,0,root);for(const z of[-.69,.69])w.box(h.w,.12,.02,dark,h.x+h.w/2,h.h*.5,z,root);}
 for(const b of BLOCKS){const g=new THREE.Group();g.position.set(b.x,b.y,.1);root.add(g);w.box(1.2,.7,1.1,gold,0,0,0,g);const icon=w.label('✦',.52,.48,'#fff6d3',g);icon.position.set(0,0,.56);v.blocks.push({b,g,icon,mesh:g.children[0]});}
 const coinMat=mat(0xffc847,.8,.23);coinMat.emissive.set(0x8a480b);coinMat.emissiveIntensity=.3;
 for(const c of ARRIVAL_COINS){const g=new THREE.Group();g.position.set(c.x,c.y,.5);root.add(g);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.29,.29,.11,24),coinMat);mesh.rotation.x=Math.PI/2;g.add(mesh);const rim=new THREE.Mesh(new THREE.TorusGeometry(.235,.02,6,24),glow(0xffe3a1));rim.position.z=.075;g.add(rim);v.coins.push({c,g});}
 for(const b of BUMPERS){const g=new THREE.Group();root.add(g);const body=new THREE.Mesh(new THREE.SphereGeometry(.58,24,14),orange);body.position.y=.6;g.add(body);for(const a of[0,Math.PI/2]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.585,.035,6,28),dark);ring.position.y=.6;ring.rotation.y=a;g.add(ring);}const eye=w.box(.45,.15,.08,cyan,0,.71,.53,g);v.bumpers.push({b,g,body,eye});}
 CHECKPOINTS.slice(1).forEach((x,i)=>{const g=new THREE.Group();g.position.set(x,0,-1.6);root.add(g);w.box(.065,2.4,.065,dark,0,1.2,0,g);const banner=w.box(.8,.55,.04,orange,.4,1.9,0,g);w.ring(.5,.05,cyan,0,.06,0,g);v.flags.push({g,banner,index:i+1});});
 const door=new THREE.Group();door.position.set(99,0,-.9);root.add(door);v.interact.set('front-door',door);v.door=door;
 for(const x of[-1.55,1.55]){w.box(.21,4.4,.65,edge,x,2.2,0,door);w.box(.06,4.15,.08,cyan,x,2.2,.35,door);}w.box(3.5,.25,.65,edge,0,4.4,0,door);
 const title=w.label('ANTA',2.1,.55,'#fff7df',door);title.position.set(0,3.75,.37);v.doorRing=w.ring(1.6,.11,gold,0,.04,1.3,door);w.ring(1.85,.035,cyan,0,.045,1.3,door);
 const pane=w.box(2.9,3.4,.06,new THREE.MeshBasicMaterial({color:0x7ee5e9,transparent:true,opacity:.12,depthWrite:false}),0,1.8,.05,door);v.pane=pane;
 // Dense vegetation shares geometry and materials instead of thousands of draw calls.
 const leaves=[];for(let i=0;i<1800;i++){const x=(i*2.719)%108,z=i%3===0?7.7:-4.9;leaves.push([x,-.2+(i%7)*.05,z+Math.sin(i*7)*.6]);}
 const foliage=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.2,0),green,leaves.length),temp=new THREE.Object3D();leaves.forEach(([x,y,z],i)=>{temp.position.set(x,y,z);temp.scale.set(1.6,.42,1.2);temp.rotation.set(i,i*.4,0);temp.updateMatrix();foliage.setMatrixAt(i,temp.matrix);});foliage.receiveShadow=true;root.add(foliage);
 for(let x=2;x<103;x+=9){const tree=new THREE.Sprite(new THREE.SpriteMaterial({map:w.treeTexture,transparent:true,alphaTest:.16,color:0xbbd789}));tree.center.set(.5,.1);tree.scale.set(4.5,5.5,1);tree.position.set(x,-.5,-6.2);root.add(tree);}
 return v;
}
export function attachArrivalBuilding(w,model){
 const v=w.roomViews.arrival;v.building=model;model.scale.setScalar(.55);model.position.set(51,-.7,-44);v.root.add(model);
 model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.map)m.map.anisotropy=4;}}});
 // Window occupancy and roof planting use the supplied facade and green surfaces.
 model.updateMatrixWorld(true);const plants=[];let seed=314;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 model.traverse(o=>{if(!o.isMesh)return;const names=(o.name+' '+(Array.isArray(o.material)?o.material:[o.material]).map(m=>m.name).join(' ')).toLowerCase();
  for(const m of Array.isArray(o.material)?o.material:[o.material])if(/glass/i.test(m.name)&&!/railing/i.test(m.name)){
   m.color.set(0x203c3c);m.emissive.set(0x000000);m.roughness=.28;m.metalness=.32;
   m.onBeforeCompile=shader=>{shader.uniforms.arrivalInterior={value:w.interiorTexture};shader.vertexShader='varying vec3 arrivalPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\narrivalPosition=(modelMatrix*vec4(position,1.)).xyz;');shader.fragmentShader='varying vec3 arrivalPosition;uniform sampler2D arrivalInterior;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nvec2 cell=vec2((arrivalPosition.x+arrivalPosition.z*.31)*.57,arrivalPosition.y/2.475);float lit=step(.49,fract(sin(dot(floor(cell),vec2(17.13,93.7)))*43758.54));vec2 uv=fract(cell);float edge=smoothstep(.035,.08,min(uv.x,1.-uv.x))*smoothstep(.08,.18,min(uv.y,1.-uv.y));vec3 office=texture2D(arrivalInterior,uv).rgb;totalEmissiveRadiance+=office*vec3(1.2,.77,.34)*lit*edge*.95;');};m.customProgramCacheKey=()=> 'arrival-warm-windows-v314';
  }
  if(!names.includes('grass'))return;const pos=o.geometry.attributes.position,index=o.geometry.index;if(!pos)return;const n=index?index.count:pos.count,step=Math.max(3,Math.ceil(n/900/3)*3),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3();
  for(let i=0;i+2<n;i+=step){a.fromBufferAttribute(pos,index?index.getX(i):i);b.fromBufferAttribute(pos,index?index.getX(i+1):i+1);c.fromBufferAttribute(pos,index?index.getX(i+2):i+2);normal.crossVectors(b.clone().sub(a),c.clone().sub(a)).normalize();if(Math.abs(normal.y)<.6)continue;const u=rnd(),r=rnd();a.multiplyScalar(1-u).addScaledVector(b,u*(1-r)).addScaledVector(c,u*r);o.localToWorld(a);if(a.y<2)continue;plants.push(a.clone());}
 });
 if(plants.length){const bushes=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.38,1),mat(0x678b32,0,.9),plants.length*3),dummy=new THREE.Object3D();plants.forEach((p,i)=>{for(let k=0;k<3;k++){dummy.position.copy(p).add(new THREE.Vector3((rnd()-.5)*.8,.26+k*.17,(rnd()-.5)*.8));dummy.scale.set(.7+rnd(),1+rnd(),.8+rnd());dummy.rotation.set(rnd(),rnd()*5,rnd());dummy.updateMatrix();bushes.setMatrixAt(i*3+k,dummy.matrix);bushes.setColorAt(i*3+k,new THREE.Color().setHSL(.17+rnd()*.08,.45,.25+rnd()*.16));}});v.root.add(bushes);}
 const lamp=new THREE.PointLight(0xffcc85,12,16,2);lamp.position.set(98,3,-3);v.root.add(lamp);
}
export function updateArrival(w,state){
 const v=w.roomViews.arrival,a=state.arrival;if(!v||!a)return;
 v.coins.forEach(({c,g})=>{g.visible=!a.coins.has(c.id);g.rotation.y=a.clock*2.1;g.position.y=c.y+Math.sin(a.clock*3+c.x)*.08;});
 v.blocks.forEach(({b,mesh,icon})=>{const used=a.blocks.has(b.id);mesh.material=used?v.materials.dark:v.materials.gold;icon.visible=!used;});
 v.bumpers.forEach(({b,g,body})=>{g.visible=!a.defeated.has(b.id);g.position.x=a.bumperX(b);body.rotation.z=-a.clock*3;});
 v.flags.forEach(f=>{f.banner.material=a.checkpoint>=f.index?v.materials.cyan:v.materials.orange;});
 v.doorRing.material=a.ready?v.materials.cyan:v.materials.gold;v.pane.material.opacity=a.ready?.15+Math.sin(a.clock*3)*.06:.035;
}
