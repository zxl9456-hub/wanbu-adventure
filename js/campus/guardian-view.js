import {DEFEAT_TIME} from './combat.js';
import * as THREE from 'three';
const HIT_COLOR=new THREE.Color(0xa4ffdf);
export class GuardianView{
 constructor(world,gltf){
  this.world=world;this.root=new THREE.Group();world.roomViews.arena.root.add(this.root);this.model=gltf.scene;
  const bounds=new THREE.Box3().setFromObject(this.model),size=bounds.getSize(new THREE.Vector3());this.model.scale.setScalar(5.25/size.x);this.root.add(this.model);
  this.materials=[];this.model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;for(const m of [o.material].flat()){if(!this.materials.some(v=>v.m===m))this.materials.push({m,color:m.emissive.clone(),intensity:m.emissiveIntensity});}}});
  this.mixer=new THREE.AnimationMixer(this.model);this.actions=Object.fromEntries(gltf.animations.map(c=>[c.name,this.mixer.clipAction(c)]));this.clip=null;
  this.core=new THREE.Mesh(new THREE.TorusGeometry(.46,.065,8,32),new THREE.MeshBasicMaterial({color:0xa7ffe0,toneMapped:false}));this.core.position.set(.7,2.3,.7);world.roomViews.arena.root.add(this.core);
  this.telegraph=new THREE.Mesh(new THREE.PlaneGeometry(22,2.7),new THREE.MeshBasicMaterial({color:0xfda06e,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide}));this.telegraph.rotation.x=-Math.PI/2;this.telegraph.position.set(18,.045,0);world.roomViews.arena.root.add(this.telegraph);
  this.pads=[];for(const x of [7,29]){const g=new THREE.Group();g.position.set(x,0,-1);world.roomViews.arena.root.add(g);world.box(2.8,.28,1.4,world.warm,0,.14,0,g);world.box(2.6,.8,.4,world.dark,0,.64,-.5,g);const lamp=world.box(2.3,.11,.1,new THREE.MeshBasicMaterial({color:0xe8c78a}),0,.8,-.25,g);world.textAt('缓冲器',0,1.75,-1,2.3,g);this.pads.push(lamp);}
  // Court surface shares the real floor collider; markings stay cosmetic.
  const court=world.roomViews.arena.root,wood=new THREE.MeshStandardMaterial({color:0xb99566,roughness:.72,metalness:.05});world.box(31,.025,3.3,wood,18,.017,0,court);
  const line=new THREE.MeshBasicMaterial({color:0xece0bb});for(const z of [-1.45,1.45])world.box(29,.01,.035,line,18,.035,z,court);for(const x of [3.5,18,32.5])world.box(.035,.01,2.9,line,x,.035,0,court);world.ring(1.15,.025,line,18,.04,0,court);
  world.textAt('GALE / 疾风训练',18,7.2,-3,9,world.roomViews.arena.root);
  world.textAt('跃过冲刺  →  近身 J 爪击  →  弱点伤害 ×2',18,6.45,-3,10,world.roomViews.arena.root,'#dde7c9');
 }
 update(dt,state){const g=state.guardian;this.root.position.set(g.x,0,.05);this.root.rotation.y=g.face<0?Math.PI:0;
  const name=({dash:'Run',windup:'Charge',stunned:'Stunned',recover:'Stunned',defeated:'Stunned',won:'Stunned'})[g.phase]||'Idle';
  if(name!==this.clip){this.actions[this.clip]?.fadeOut(.15);this.actions[name]?.reset().fadeIn(.15).play();this.clip=name;}const elapsed=this.lastState===state?Math.max(0,Math.min(.08,state.time-this.lastTime)):0;this.lastState=state;this.lastTime=state.time;this.mixer.update(elapsed);
  const fade=g.phase==='defeated'?Math.max(0,1-g.defeatTime/DEFEAT_TIME):1;this.root.visible=g.phase!=='won';
  for(const {m,color,intensity} of this.materials){const fading=fade<1;if(m.transparent!==fading){m.transparent=fading;m.needsUpdate=true;}m.opacity=fade;m.depthWrite=!fading;m.emissive.copy(g.hitFlash>0?HIT_COLOR:color);m.emissiveIntensity=g.hitFlash>0?.38:intensity;}
  this.root.position.y=g.phase==='defeated'?g.defeatTime*.45:0;
  this.core.position.set(g.x+.65*g.face,2.3,.9);this.core.visible=g.phase==='stunned';this.core.rotation.z=state.time*2;this.core.scale.setScalar(1+Math.sin(state.time*8)*.12);
  this.telegraph.visible=g.phase==='windup'||g.phase==='dash';this.telegraph.material.opacity=g.phase==='windup'?.16+Math.sin(this.world.tick*7)**2*.13:.08;
  this.pads.forEach((m,i)=>m.material.color.set(g.phase==='stunned'&&i===(g.x<18?0:1)?0xa7ffe0:0xe8c78a));
 }
}
