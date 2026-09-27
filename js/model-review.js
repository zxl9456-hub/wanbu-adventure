import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {refineModels,planterTree,deckDetails,craftBench,softBox} from './model-quality.js';
import {createDroneModel} from './drone-model.js';
const $=id=>document.getElementById(id);
const assets=[['立体橄榄树','tree'],['巡游训练机','scout'],['盾卫训练机','shield'],['哨戒训练机','sentry'],['联动守卫','guardian'],['连廊模块','deck'],['小步 · 运动角色','corgi-sports.glb'],['小步 · 园区角色','corgi-animated.glb'],['上海安踏中心','anta-centre.glb'],['建筑沙盘','lab/anta-centre-mini.glb'],['光影投影仪','lab/light-projector.glb'],['连廊沙盘展台','lab/bridge-table.glb'],['跃动试验台','lab/test-bench.glb'],['回声协作站','lab/echo-station.glb'],['标本展柜','lab/specimen-cabinet.glb'],['科技密室光门','lab/anta-door.glb'],['镜筒暗舱','lab/secrets/lens-cache.glb'],['底座暗舱','lab/secrets/plinth-cache.glb'],['维护暗舱','lab/secrets/service-cache.glb'],['虹膜暗舱','lab/secrets/iris-cache.glb'],['联动球','relay/relay-ball.glb'],['接力篮架','relay/relay-hoop.glb'],['接力升降台','relay/relay-lift.glb'],['感应节点','relay/relay-node.glb'],['反弹板','relay/relay-reflector.glb']];
$('asset').innerHTML=assets.map(([name],i)=>`<option value="${i}">${String(i+1).padStart(2,'0')}　${name}</option>`).join('');
const renderer=new THREE.WebGLRenderer({canvas:$('preview'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x173236);scene.fog=new THREE.Fog(0x173236,22,50);const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.45;pm.dispose();
scene.add(new THREE.HemisphereLight(0xcfe9e3,0x47534a,2.1));const sun=new THREE.DirectionalLight(0xffe4bd,4);sun.position.set(-5,8,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.015;Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6});scene.add(sun);const rim=new THREE.DirectionalLight(0x9ddced,2);rim.position.set(4,4,-4);scene.add(rim);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x264348,roughness:.72}));floor.rotation.x=-Math.PI/2;floor.position.y=-.16;floor.receiveShadow=true;scene.add(floor);
const stage=new THREE.Mesh(new THREE.CylinderGeometry(3.0,3.1,.14,80),new THREE.MeshStandardMaterial({color:0x314d4e,roughness:.44,metalness:.22}));stage.position.y=-.08;stage.receiveShadow=true;scene.add(stage);
const ring=new THREE.Mesh(new THREE.TorusGeometry(2.96,.012,6,100),new THREE.MeshBasicMaterial({color:0xbecdb3}));ring.rotation.x=-Math.PI/2;ring.position.y=.012;scene.add(ring);
const camera=new THREE.PerspectiveCamera(34,1,.1,120);let yaw=.5,pitch=.25,distance=11,auto=true,wire=false,finish=true,model=null,mixer=null,revision=0;const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);let baseMaterials=[];
function disposeModel(root){
 const seen=new Set(),release=resource=>{if(resource&&!seen.has(resource)){resource.dispose();seen.add(resource);}};
 root.traverse(o=>{if(!o.isMesh)return;
  if(!root.userData.retainGeometry&&o.geometry.type!=='PrecisionBoxGeometry')release(o.geometry);
  const versions=o.userData.reviewMaterials?Object.values(o.userData.reviewMaterials).flat():[o.material].flat();
  for(const material of versions){if(!root.userData.procedural)for(const value of Object.values(material))if(value?.isTexture)release(value);release(material);}
 });
}
async function load(index){
 const seq=++revision;const [name,path]=assets[index];$('status').textContent='正在载入…';$('name').textContent=name;$('counter').textContent=`${String(index+1).padStart(2,'0')} / ${assets.length}`;
 let loaded,clips=[];try{
 if(path==='tree'){loaded=planterTree(0,0,0,4);loaded.userData.procedural=true;}
 else if(path==='deck'){loaded=new THREE.Group();loaded.userData.procedural=true;const mat=new THREE.MeshStandardMaterial({color:0xd4c9b5,roughness:.65});const deck=new THREE.Mesh(softBox(5,.6,3.4),mat);deck.position.y=-.3;loaded.add(deck);deckDetails(loaded,5,3.4);craftBench(loaded);loaded.add(planterTree(1.55,0,-.5,2.2));}
 else if(!path.endsWith('.glb')){loaded=createDroneModel(path);loaded.userData.procedural=true;}
 else{const gltf=await loader.loadAsync('./assets/'+path);loaded=gltf.scene;clips=gltf.animations;}
 if(seq!==revision){disposeModel(loaded);return;}
 if(model){scene.remove(model);mixer?.stopAllAction();disposeModel(model);}baseMaterials=[];
 loaded.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;const original=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();baseMaterials.push([o,original]);o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}});
 const b=new THREE.Box3().setFromObject(loaded),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3()),scale=4.5/Math.max(size.x,size.y,size.z);loaded.position.sub(new THREE.Vector3(center.x,b.min.y,center.z));model=new THREE.Group();model.userData.procedural=loaded.userData.procedural;model.userData.retainGeometry=path==='tree'||path==='deck';model.add(loaded);model.scale.setScalar(scale);scene.add(model);refineModels(model);mixer=clips.length?new THREE.AnimationMixer(loaded):null;if(mixer)mixer.clipAction(clips.find(c=>c.name==='Idle')||clips[0]).play();
 for(const [o,original] of baseMaterials)o.userData.reviewMaterials={original,refined:o.material};applyOptions();yaw=.5;pitch=.25;distance=11;
 let vertices=0,triangles=0;loaded.traverse(o=>{if(o.isMesh){vertices+=o.geometry.attributes.position.count;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});$('status').textContent=`已载入 · ${Math.round(triangles).toLocaleString()} 三角面${clips.length?' · '+clips.length+' 组动画':''}`;
 }catch(e){$('status').textContent='载入失败：'+e.message;console.error(e);}
}
function applyOptions(){if(!model)return;for(const [o]of baseMaterials){const materials=o.userData.reviewMaterials;o.material=finish?materials.refined:materials.original;for(const m of Array.isArray(o.material)?o.material:[o.material])m.wireframe=wire;}}
$('asset').onchange=()=>load(Number($('asset').value));$('finish').onclick=()=>{finish=!finish;$('finish').setAttribute('aria-pressed',finish);$('finish').textContent='精修材质 · '+(finish?'开启':'关闭');applyOptions();};$('rotate').onclick=()=>{auto=!auto;$('rotate').setAttribute('aria-pressed',auto);$('rotate').textContent='自动环绕 · '+(auto?'开启':'关闭');};$('wire').onclick=()=>{wire=!wire;$('wire').setAttribute('aria-pressed',wire);applyOptions();};
let dragging=false,lastX,lastY;$('preview').onpointerdown=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;$('preview').setPointerCapture(e.pointerId);};$('preview').onpointerup=()=>dragging=false;$('preview').onpointercancel=()=>dragging=false;$('preview').onpointermove=e=>{if(!dragging)return;yaw-=(e.clientX-lastX)*.008;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastY)*.006,-.12,1.15);lastX=e.clientX;lastY=e.clientY;};$('preview').addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.009,5,24);},{passive:false});
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();const clock=new THREE.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(.05,clock.getDelta());if(auto&&!dragging)yaw+=dt*.18;mixer?.update(dt);const framedDistance=distance*Math.max(1,.85/camera.aspect);camera.position.set(Math.sin(yaw)*framedDistance,1.9+Math.sin(pitch)*framedDistance,Math.cos(yaw)*framedDistance);camera.lookAt(innerWidth>800?-.9:0,innerWidth<650?2.9:1.9,0);renderer.render(scene,camera);});load(0);
