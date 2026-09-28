import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {SHOES} from './state.js';
export async function makeEquipmentWorld(world){
 const root=world.roomViews.hub.root,group=new THREE.Group();group.position.set(8,0,-1.5);root.add(group);
 const dark=new THREE.MeshStandardMaterial({color:0x153d32,roughness:.5}),gold=new THREE.MeshStandardMaterial({color:0xdcc594,metalness:.5,roughness:.3}),glow=new THREE.MeshBasicMaterial({color:0xadeac9});
 world.box(4.8,1.05,1.9,dark,0,.53,0,group);world.box(4.85,.1,1.95,gold,0,1.1,0,group);world.box(4.5,.035,.03,glow,0,.9,.97,group);
 const label=world.label('小步补给站 · 金币装备',4.2,.36,'#f7e5b9',group);label.position.set(0,.6,1.02);
 const shoes=await Promise.all(Object.keys(SHOES).map(id=>new GLTFLoader().loadAsync('./assets/equipment/'+id+'.glb')));
 shoes.forEach((gltf,i)=>{const model=gltf.scene;model.scale.setScalar(.38);model.position.set((i-1)*1.5,1.17,.1);model.rotation.y=-.28;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});group.add(model);});
 const pad=world.ring(1.05,.028,glow,8,.035,.7,root);
 // Place the interaction cue on the floor in front of the architecture.
 const term=new THREE.Group();term.position.set(18,0,1.25);root.add(term);world.box(1.25,1.25,.5,dark,0,.63,0,term);world.box(1.07,.47,.04,glow,0,1.12,.27,term);
 const cue=world.label('F · 三地连接台',3.5,.34,'#eaffdc',term);cue.position.set(0,.93,.34);const dots=[];
 for(let i=0;i<3;i++){const m=new THREE.MeshBasicMaterial({color:0x547466});world.box(.23,.18,.045,m,(i-1)*.32,.64,.3,term);dots.push(m);}
 const boots=[],bootMaterial=new THREE.MeshStandardMaterial({color:0xa2e7ce,roughness:.6});
 world.dog.model.traverse(bone=>{if(bone.isBone&&/^DEF-(front_)?toe[._]?[LR]$/.test(bone.name)){const cover=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),bootMaterial);cover.name='Sport paw boot';cover.scale.set(.13,.1,.16);bone.add(cover);boots.push(cover);}});
 const halo=world.ring(.95,.035,new THREE.MeshBasicMaterial({color:0xa2e7ce,transparent:true,opacity:.7,depthWrite:false}),0,.06,0,world.scene);
 const trails=[];for(let i=0;i<14;i++){const m=new THREE.MeshBasicMaterial({color:0xffcc65,transparent:true,opacity:0,depthWrite:false});const p=new THREE.Mesh(new THREE.CircleGeometry(.13,10),m);p.rotation.x=-Math.PI/2;p.visible=false;world.scene.add(p);trails.push({p,life:0});}
 let lastStep=0,previousRoom=null;
 return {update(dt,state){const kit=state.shoes,p=state.player;boots.forEach(b=>b.visible=!!kit.item);if(kit.item)bootMaterial.color.set(kit.item.color);pad.material.color.set(state.nearby()?.kind==='shoe-shop'?0xffdf9a:0xadeac9);dots.forEach((m,i)=>m.color.set(state.sites.has(['jinjiang','xiamen','shanghai'][i])?0xffdb89:0x547466));
  halo.visible=!!kit.item&&(kit.equipped==='pg7'&&!kit.shieldUsed||kit.counterTime>0||kit.flash>0);halo.position.set(p.x,p.y+.07,.8);halo.material.color.set(kit.item?.color||0xffffff);halo.scale.setScalar(kit.flash>0?1+Math.sin(kit.flash*15)*.12:1);
  if(previousRoom!==state.roomId){trails.forEach(t=>{t.life=0;t.p.visible=false;});lastStep=0;previousRoom=state.roomId;}
  lastStep+=dt;if(kit.equipped==='c202'&&kit.charge>.2&&p.grounded&&lastStep>.1){lastStep=0;const t=trails.find(t=>t.life<=0);if(t){t.life=.8;t.p.position.set(p.x,p.y+.04,.6+Math.sin(state.time*18)*.22);t.p.visible=true;}}
  for(const t of trails){t.life-=dt;t.p.visible=t.life>0;t.p.material.opacity=Math.max(0,t.life)*.8;}
 }};
}
