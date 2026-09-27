import * as THREE from 'three';
import {brandPanel} from './brand.js';

/** Golden-hour material pass over the supplied architectural geometry. */
export function dressArchitecture(world) {
 const clipped=[world.cutaway,world.frontCut];
 world.building.traverse(mesh=>{
  if(!mesh.isMesh)return;
  mesh.castShadow=true;mesh.receiveShadow=true;
  const originals=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const materials=originals.map(original=>{
   const m=original.clone(), name=m.name.toLowerCase(), object=mesh.name.toLowerCase();
   const outerShell=/grc|curtain|^glass ·|ribbon/i.test(name+' '+object);m.clippingPlanes=outerShell?clipped:[world.cutaway];m.clipIntersection=outerShell;m.clipShadows=true;
   m.envMapIntensity=.38;m.metalness=.05;m.roughness=.7;
   if(m.emissive)m.emissiveIntensity=0;
   let kind=/floors|stairs|paving|cladding|grey|escalator/i.test(object)?'stone':'facade';
   if(/glass|curtain/.test(name)){
    const railing=/rail/.test(name);kind=railing?'railing':'window';
    m.color.set(railing?0x669eaa:0x203236);m.roughness=railing?.17:.24;m.metalness=railing?.25:.48;m.envMapIntensity=railing?.6:1.0;
    m.transparent=railing;m.opacity=railing?.34:1;m.depthWrite=!railing;m.side=THREE.DoubleSide;
    if('transmission' in m)m.transmission=0;
    mesh.castShadow=!railing;
   }else if(/green|grass|shurb|shrub|lawn/.test(name+' '+object)){
    kind='foliage';m.color.set(0x446832);m.roughness=.95;m.metalness=0;
   }else if(/^light( |$)/.test(name)){
    kind='light';m.color.set(0xffdda1);m.emissive.set(0xffbe65);m.emissiveIntensity=3.2;mesh.castShadow=false;
   }else if(/wood/.test(name)){kind='wood';m.color.set(0x986337);m.roughness=.75;
   }else if(/mullion|dark metal|shadow box|division|main/.test(name)&&!/ribbon/.test(object)){
    kind='metal';m.color.set(0x263130);m.metalness=.65;m.roughness=.3;
   }else if(/grc|ribbon|white|slab|stone|columns|soffit|plaster|terrazzo/.test(name+' '+object)){
    if(/grc|ribbon|column|soffit/.test(name+' '+object))kind='facade';
    m.color.set(/soffit/.test(name)?0x897e6f:/columns/.test(name)?0xa79b88:0xc9c0ae);m.roughness=.66;
   }else if(m.color.b>m.color.r*1.45&&m.color.b>m.color.g*1.25){kind='track';m.color.set(0x373367);m.roughness=.92;
   }else if(/paint|red/.test(name+' '+object)){m.color.set(0xae2526);kind='metal';
   }else{m.color.multiplyScalar(.82);}
   if(['stone','window','wood','foliage','track','facade'].includes(kind))architecturalShader(m,kind);
   addSightlineCut(m,world);m.userData.artKind=kind;return m;
  });
  mesh.material=Array.isArray(mesh.material)?materials:materials[0];
 });
}

function architecturalShader(material,kind) {
 material.customProgramCacheKey=()=>`golden-diorama-${kind}-3`;
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 artWorld; varying vec3 artNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nartWorld=(modelMatrix*vec4(transformed,1.)).xyz;artNormal=normalize(mat3(modelMatrix)*objectNormal);');
  shader.fragmentShader=`varying vec3 artWorld;varying vec3 artNormal;
   float artHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float artNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(artHash(i),artHash(i+vec2(1,0)),f.x),mix(artHash(i+vec2(0,1)),artHash(i+vec2(1)),f.x),f.y);}
   `+shader.fragmentShader;
  let detail='';
  if(kind==='stone')detail=`
   float grain=artNoise(artWorld.xz*75.+artWorld.y*7.);diffuseColor.rgb*=.94+grain*.10;
   if(artNormal.y>.65){vec2 tile=artWorld.xz/vec2(1.25,.65);tile.x+=mod(floor(tile.y),2.)*.5;vec2 uv=fract(tile);vec2 fw=fwidth(tile)*1.25;vec2 edge=smoothstep(vec2(.006),vec2(.006)+fw,min(uv,1.-uv));float grout=edge.x*edge.y;diffuseColor.rgb*=mix(.76,.94+.10*artHash(floor(tile)),grout);}
   else{float streak=artNoise(vec2(artWorld.x+artWorld.z,artWorld.y*.18)*2.);diffuseColor.rgb*=.92+streak*.1;}
  `;
  if(kind==='facade')detail='diffuseColor.rgb*=.96+.04*artNoise(artWorld.xz*50.+artWorld.y);';
  if(kind==='wood')detail='diffuseColor.rgb*=.76+.24*artNoise(vec2(artWorld.x*3.,artWorld.z*65.));';
  if(kind==='foliage')detail='diffuseColor.rgb*=.6+.65*artNoise(artWorld.xz*12.+artWorld.y);';
  if(kind==='track')detail='diffuseColor.rgb*=.91+.12*artNoise(artWorld.xz*110.);';
  if(kind==='window'){
   detail=`
    float along=abs(artNormal.x)>abs(artNormal.z)?artWorld.z:artWorld.x;
    vec2 room=vec2(along/2.6,(artWorld.y<6.?(artWorld.y-.3)/6.:(artWorld.y-6.)/4.5+1.));vec2 pane=fract(room);float seed=artHash(floor(room));
    float frame=smoothstep(.014,.025,min(pane.x,1.-pane.x))*smoothstep(.025,.04,min(pane.y,1.-pane.y));
    float warm=step(.50,seed)*frame;
    float blind=.92+.08*sin(artWorld.y*21.);
    diffuseColor.rgb=mix(diffuseColor.rgb*.34,diffuseColor.rgb*(.55+artNoise(room*3.)*.4),frame);
    diffuseColor.rgb+=vec3(.055,.026,.008)*warm*blind;
   `;
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float along2=abs(artNormal.x)>abs(artNormal.z)?artWorld.z:artWorld.x;
    vec2 r2=vec2(along2/2.6,(artWorld.y<6.?(artWorld.y-.3)/6.:(artWorld.y-6.)/4.5+1.));vec2 p2=fract(r2);float lit=step(.50,artHash(floor(r2)));
    float interior=smoothstep(.045,.10,p2.x)*smoothstep(.045,.10,1.-p2.x)*smoothstep(.03,.09,p2.y)*smoothstep(.03,.13,1.-p2.y);
    float lamp=exp(-pow((p2.y-.18)*42.,2.))*smoothstep(.15,.24,p2.x)*smoothstep(.15,.24,1.-p2.x);
    totalEmissiveRadiance+=vec3(1.,.49,.16)*lit*(interior*.025+lamp*.26);
   `);
  }
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+detail);
 };
}

export function addGardenDetails(world) {
 const scene=world.scene;world.building.updateMatrixWorld(true);
 const leafShape=new THREE.Shape();leafShape.moveTo(0,-.17);leafShape.quadraticCurveTo(.13,-.01,0,.17);leafShape.quadraticCurveTo(-.13,.01,0,-.17);
 const geometry=new THREE.ShapeGeometry(leafShape,3),material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.82,metalness:0,side:THREE.DoubleSide});
 const positions=[];const p=new THREE.Vector3(),normal=new THREE.Vector3();
 // Grow shrubs on the model's existing green surfaces, preserving the paths.
 world.building.traverse(o=>{
  if(!o.isMesh||!/green|grass|shurb|shrub/i.test(o.name))return;
  const attr=o.geometry.attributes.position, norm=o.geometry.attributes.normal;if(!attr)return;
  const stride=Math.max(1,Math.floor(attr.count/240));
  for(let i=0;i<attr.count;i+=stride){p.fromBufferAttribute(attr,i).applyMatrix4(o.matrixWorld);if(norm)normal.fromBufferAttribute(norm,i).transformDirection(o.matrixWorld);
   if(p.x<4||p.x>77||p.z< -36||p.z>52||p.y<-.1||p.y>30||(norm&&normal.y<.55))continue;
   if(positions.some(q=>q.distanceToSquared(p)<.7))continue;positions.push(p.clone());if(positions.length>420)break;
  }
 });
 const shrubs=new THREE.InstancedMesh(geometry,material,positions.length*90);const dummy=new THREE.Object3D();let index=0;
 for(const q of positions)for(let k=0;k<90;k++){
  const seed=Math.sin(index*27.3)*.5+.5,angle=k*2.399963,rad=.55*Math.sqrt((k+.5)/90);
  dummy.position.copy(q).add(new THREE.Vector3(Math.cos(angle)*rad,.16+(.25+seed*.46)*Math.sqrt(1-rad/.85),Math.sin(angle)*rad));
  dummy.scale.setScalar(.7+seed*.6);dummy.rotation.set(-.6-seed*.9,index*1.7,Math.sin(index)*.8);dummy.updateMatrix();shrubs.setMatrixAt(index,dummy.matrix);shrubs.setColorAt(index,new THREE.Color().setHSL(.19+seed*.075,.48+seed*.16,.12+seed*.12));index++;
 }
 shrubs.castShadow=true;shrubs.receiveShadow=true;scene.add(shrubs);world.gardenShrubs=shrubs;
 const signs=new THREE.Group();scene.add(signs);
 function sign(text,subtitle,position,width,height,rotation=0,red=false){
  const cv=document.createElement('canvas');cv.width=1024;cv.height=256;const ctx=cv.getContext('2d');ctx.fillStyle=red?'#ba2927':'#172929';ctx.fillRect(0,0,1024,256);
  ctx.fillStyle='#f9f0d8';ctx.textAlign='center';ctx.font='italic 900 116px Arial';ctx.fillText(text,512,133);ctx.font='500 30px Arial';ctx.letterSpacing='5px';ctx.fillText(subtitle,512,207);
  const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.MeshStandardMaterial({map:tex,roughness:.48,metalness:.18,emissive:0xffe5ba,emissiveMap:tex,emissiveIntensity:.25});
  const panel=new THREE.Mesh(new THREE.BoxGeometry(width,height,.12),mat);panel.position.copy(position);panel.rotation.y=rotation;panel.castShadow=true;signs.add(panel);return panel;
 }
 const facade=brandPanel(world,6.8,1.7,{layout:'wayfinding',title:'上海安踏中心',subtitle:'SHANGHAI CENTRE',name:'ANTA · terrace sign'});facade.position.set(44,10.6,8);facade.rotation.y=.12;signs.add(facade);
 sign('KEEP MOVING.','SPORTS FOR A BETTER WORLD',new THREE.Vector3(39,2.6,18.4),7,1.65,-.1);
 for(const [x,z,h] of [[58,31,0],[37,8,6],[22,-8,6]]){
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,4.2,8),new THREE.MeshStandardMaterial({color:0xa9ad9f,metalness:.65,roughness:.3}));pole.position.set(x,h+2.1,z);signs.add(pole);
  const banner=brandPanel(world,1.05,1.8,{layout:'banner',name:'ANTA · garden banner'});banner.position.set(x+.53,h+3,z);signs.add(banner);
 }
 // Warm pools of light along the playable terrace; emissive fixtures remain inexpensive.
 const glowMat=new THREE.MeshBasicMaterial({color:new THREE.Color(3.2,1.7,.55),toneMapped:false});
 for(const [x,z,h] of [[43,30,0],[57,31,0],[39,14,6],[33,10,6],[29,1,6],[19,-9,6]]){
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.07,.11,.7,8),new THREE.MeshStandardMaterial({color:0x36413a,metalness:.5,roughness:.4}));body.position.set(x,h+.35,z);signs.add(body);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.14,10,6),glowMat);bulb.position.set(x,h+.77,z);signs.add(bulb);
 }
 world.artProps=signs;
}

/** Close the front cutaway with the original building's floor footprint. */
export function buildCutawayCaps(world) {
 const vertices=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3();
 world.building.traverse(o=>{
  if(!o.isMesh||!/floors/i.test(o.name))return;
  const pos=o.geometry.attributes.position,ind=o.geometry.index;
  for(let i=0;i<(ind?ind.count:pos.count);i+=3){
   a.fromBufferAttribute(pos,ind?ind.getX(i):i).applyMatrix4(o.matrixWorld);b.fromBufferAttribute(pos,ind?ind.getX(i+1):i+1).applyMatrix4(o.matrixWorld);c.fromBufferAttribute(pos,ind?ind.getX(i+2):i+2).applyMatrix4(o.matrixWorld);
   if(Math.abs(a.y-10.5)>.12||Math.abs(b.y-10.5)>.12||Math.abs(c.y-10.5)>.12)continue;
   ab.subVectors(b,a);ac.subVectors(c,a);if(ab.cross(ac).normalize().y<.8)continue;
   vertices.push(a.x,0,a.z,b.x,0,b.z,c.x,0,c.z);
  }
 });
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
 world.capPlane=new THREE.Plane();const mat=new THREE.MeshStandardMaterial({color:0x958871,roughness:.9,metalness:0,side:THREE.DoubleSide,clippingPlanes:[world.capPlane]});
 world.capFocus=new THREE.Vector3();
 mat.onBeforeCompile=shader=>{shader.uniforms.capFocus={value:world.capFocus};shader.vertexShader='varying vec3 capWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ncapWorld=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 capWorld;uniform vec3 capFocus;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(distance(capWorld.xz,capFocus.xz)<8.)discard;');};mat.customProgramCacheKey=()=>'section-clear-sightline-1';
 const cap=new THREE.Mesh(geo,mat);cap.receiveShadow=true;cap.name='Architectural section cap';world.scene.add(cap);world.sectionCap=cap;
}

// Fade the obstructing facade out of the player's immediate viewing cone.
function addSightlineCut(material,world){
 const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
 material.customProgramCacheKey=()=>cache()+'-sightline';
 material.onBeforeCompile=shader=>{compile(shader);shader.uniforms.sightFocus={value:world.sightFocus};shader.uniforms.sightDirection={value:world.sightDirection};shader.uniforms.sightActive=world.sightActive;
 shader.vertexShader='varying vec3 sightWorld;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nsightWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
 shader.fragmentShader='varying vec3 sightWorld;uniform vec3 sightFocus,sightDirection;uniform float sightActive;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
  vec3 sightDelta=sightWorld-sightFocus;float sightAlong=dot(sightDelta,sightDirection);float sightAcross=length(sightDelta-sightDirection*sightAlong);
  if(sightActive>.5&&sightAlong>.6&&sightAcross<3.2&&sightWorld.y>sightFocus.y-.78)discard;
 `);
 };
}
