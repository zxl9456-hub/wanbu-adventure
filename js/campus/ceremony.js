import * as THREE from 'three';
const V=THREE.Vector3;
export const CEREMONY_STAGES=['全球枢纽 · 同心连接','万步联动 · 脚步成光','创新网络 · 灵感有声','多品牌共创 · 一起向前','绿色园区 · 生生不息','运动场馆 · 活力点亮'];
export class CampusCeremony{
 constructor(world){
  this.world=world;this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x10272c);this.scene.environment=world.scene.environment;this.scene.environmentIntensity=.1;
  this.camera=new THREE.OrthographicCamera(-32,32,22,-22,.1,300);this.model=world.architecture.clone(true);this.model.position.set(0,0,0);this.model.rotation.set(0,0,0);this.model.scale.setScalar(1);
  const box=new THREE.Box3().setFromObject(this.model),sz=box.getSize(new V()),center=box.getCenter(new V()),scale=52/Math.max(sz.x,sz.z);this.model.scale.setScalar(scale);this.model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);this.scene.add(this.model);this.progress={value:0};
  this.model.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;o.material=(Array.isArray(o.material)?o.material:[o.material]).map(src=>{const m=src.clone();m.clippingPlanes=[];m.transparent=false;m.opacity=1;m.color.multiplyScalar(.55);if(m.emissive)m.emissive.set(0);m.emissiveIntensity=0;const glass=/glass|curtain|shadowbox/i.test(m.name+' '+o.name);if(glass){m.color.set(0x263e41);m.metalness=.5;m.roughness=.3;}m.onBeforeCompile=shader=>{
   shader.uniforms.lightProgress=this.progress;shader.vertexShader='varying vec3 ceremonyPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nceremonyPosition=(modelMatrix*vec4(position,1.)).xyz;');
   shader.fragmentShader='uniform float lightProgress; varying vec3 ceremonyPosition;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>\nfloat lit=smoothstep(ceremonyPosition.x-1.,ceremonyPosition.x+1.,lightProgress*64.-32.);\n${glass?'float row=step(.24,fract(ceremonyPosition.y*1.65));float col=step(.16,fract((ceremonyPosition.x+ceremonyPosition.z)*2.1));totalEmissiveRadiance+=vec3(1.,.64,.22)*lit*row*col*.9;':'totalEmissiveRadiance+=vec3(.34,.23,.10)*lit*.08;'}`);
  };m.customProgramCacheKey=()=>glass?'ceremony-glass-v39':'ceremony-surface-v39';m.needsUpdate=true;return m;});if(o.material.length===1)o.material=o.material[0];});
  this.scene.add(new THREE.HemisphereLight(0xb7dbec,0x314a34,.75));const sun=new THREE.DirectionalLight(0xffd7a2,1.2);sun.position.set(-25,50,25);this.scene.add(sun);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(47,96),new THREE.MeshStandardMaterial({color:0x213f3c,metalness:.4,roughness:.55}));floor.rotation.x=-Math.PI/2;floor.position.y=-.25;this.scene.add(floor);
  this.route=new THREE.Group();this.scene.add(this.route);this.dots=[];
  const points=[];for(let i=0;i<=120;i++){const a=i/120*Math.PI*2;points.push(new V(Math.cos(a)*29,.12,Math.sin(a)*23));}
  const curve=new THREE.CatmullRomCurve3(points),material=new THREE.MeshBasicMaterial({color:0xb3e1bb,transparent:true,opacity:.15,toneMapped:false});this.path=new THREE.Mesh(new THREE.TubeGeometry(curve,160,.06,5,false),material);this.route.add(this.path);
  for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2,p=new V(Math.cos(a)*29,.28,Math.sin(a)*23),m=new THREE.Mesh(new THREE.SphereGeometry(.3,12,8),new THREE.MeshBasicMaterial({color:0x52645c,toneMapped:false}));m.position.copy(p);this.route.add(m);this.dots.push(m);}
  this.particles=new THREE.Points(new THREE.BufferGeometry().setFromPoints(Array.from({length:90},(_,i)=>new V(Math.sin(i*2.4)*31,3+(i%13)*.9,Math.cos(i*1.8)*25))),new THREE.PointsMaterial({color:0xf7dba4,size:.09,transparent:true,opacity:.7,depthWrite:false}));this.scene.add(this.particles);
 }
 render(time){
  const t=Math.min(1,time/12);this.progress.value=t;this.path.material.opacity=.15+t*.75;this.dots.forEach((m,i)=>{const lit=time>i*2;m.material.color.set(lit?0xffdda0:0x52645c);m.scale.setScalar(lit?1.2:1);});this.particles.rotation.y=time*.013;
  const aspect=innerWidth/innerHeight,height=Math.max(55,82/aspect);this.camera.left=-height*aspect/2;this.camera.right=height*aspect/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.updateProjectionMatrix();
  const angle=.62+Math.min(time,15)*.018;this.camera.position.set(Math.sin(angle)*72,48,Math.cos(angle)*72);this.camera.lookAt(0,3,0);
  const w=this.world,pass=w.composer.passes[0],old={scene:pass.scene,camera:pass.camera,dof:w.dof.enabled,bloom:w.bloom.strength,threshold:w.bloom.threshold};pass.scene=this.scene;pass.camera=this.camera;w.dof.enabled=false;w.bloom.strength=.22;w.bloom.threshold=1.05;w.composer.render();Object.assign(pass,{scene:old.scene,camera:old.camera});w.dof.enabled=old.dof;w.bloom.strength=old.bloom;w.bloom.threshold=old.threshold;
 }
}
