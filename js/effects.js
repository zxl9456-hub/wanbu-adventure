import * as THREE from 'three';
import {COLORS,toWorld} from './world.js';
import {logoPlate} from './brand.js';
export class Effects{
 constructor(world){this.world=world;this.group=new THREE.Group();world.fx.add(this.group);this.rings=[];this.sparks=[];this.particles=[];this.trail=[];this.time=0;this.lastPrint=0;
  this.pawTexture=this.makePaw();this.trailMaterial=new THREE.MeshBasicMaterial({map:this.pawTexture,color:new THREE.Color(.35,1.7,2.3),transparent:true,opacity:.9,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});this.trailGeometry=new THREE.PlaneGeometry(.47,.47);
  this.guide=new THREE.Group();this.group.add(this.guide);
 }
 makePaw(){const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');c.fillStyle='#ffffff';c.beginPath();c.ellipse(63,83,27,23,0,0,Math.PI*2);c.fill();for(const [x,y,r]of[[28,49,-.5],[52,30,-.15],[79,31,.15],[101,51,.5]]){c.beginPath();c.ellipse(x,y,11,15,r,0,Math.PI*2);c.fill();}const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;return tex;}
 ring(pos,label,color=COLORS.cyan,radius=1.2){
  const group=new THREE.Group();group.position.copy(pos);group.position.y+=.065;this.group.add(group);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(radius+.18,radius+.25,.11,64),new THREE.MeshStandardMaterial({color:0x233b40,roughness:.32,metalness:.62}));base.position.y=-.035;base.receiveShadow=true;group.add(base);
  const mat=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(2.4),transparent:true,opacity:.95,side:THREE.DoubleSide,toneMapped:false,depthWrite:false});
  const ring=new THREE.Mesh(new THREE.RingGeometry(radius-.045,radius+.025,80),mat);ring.rotation.x=-Math.PI/2;ring.position.y=.06;group.add(ring);
  const inner=new THREE.Mesh(new THREE.RingGeometry(radius*.76,radius*.80,80),mat.clone());inner.rotation.x=-Math.PI/2;inner.position.y=.065;group.add(inner);
  const dot=new THREE.Mesh(new THREE.PlaneGeometry(radius*1.04,radius*1.04),new THREE.MeshBasicMaterial({map:this.pawTexture,color:new THREE.Color(color).multiplyScalar(2.4),transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));dot.rotation.x=-Math.PI/2;dot.position.y=.08;group.add(dot);
  const labelSprite=this.label(label,color);labelSprite.position.y=2.25;group.add(labelSprite);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(radius*.8,radius*.78,.48,64,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.045,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));beam.position.y=.28;group.add(beam);
  for(let i=0;i<12;i++){const tick=new THREE.Mesh(new THREE.BoxGeometry(.025,.014,.09),mat);const a=i/12*Math.PI*2;tick.position.set(Math.cos(a)*(radius+.12),.065,Math.sin(a)*(radius+.12));tick.rotation.y=-a+Math.PI/2;group.add(tick);}
  const obj={group,ring,inner,dot,label:labelSprite,beam,active:false,color,radius};this.rings.push(obj);return obj;
 }
 label(text,color=0xb7fff0){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=100;const c=canvas.getContext('2d');c.font='500 25px "PingFang SC",sans-serif';c.textAlign='center';c.fillStyle='rgba(9,34,40,.76)';let w=Math.max(80,c.measureText(text).width+40);c.beginPath();c.roundRect(256-w/2,18,w,58,5);c.fill();c.fillStyle='#'+new THREE.Color(color).getHexString();c.fillText(text,256,56);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));s.scale.set(8,1.56,1);return s;}
 activate(ring,active=true){ring.active=active;const c=active?COLORS.gold:ring.color;[ring.ring,ring.inner,ring.dot].forEach(o=>o.material.color.set(c).multiplyScalar(2.4));ring.beam.material.opacity=active?.13:.045;}
 collectible(pos,id,story=false){const g=new THREE.Group();g.position.copy(pos);g.position.y+=1;this.group.add(g);const material=new THREE.MeshStandardMaterial({color:story?0xffd08a:0x9fffdf,emissive:story?0xffad52:0x57edc0,emissiveIntensity:1.8,metalness:.1,roughness:.25});const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(story?.38:.22),material);g.add(mesh);const halo=new THREE.Mesh(new THREE.RingGeometry(story?.62:.42,story?.64:.44,40),new THREE.MeshBasicMaterial({color:story?COLORS.gold:COLORS.mint,transparent:true,opacity:.55,toneMapped:false,side:THREE.DoubleSide}));halo.rotation.x=Math.PI/2;halo.position.y=-.72;g.add(halo);let v={id,group:g,mesh,base:pos.clone(),story,collected:false};this.sparks.push(v);return v;}
 burst(pos,color=COLORS.mint,n=18){for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.055,.055,.055),new THREE.MeshBasicMaterial({color,transparent:true,toneMapped:false,depthWrite:false}));m.position.copy(pos).add(new THREE.Vector3(0,.6,0));this.group.add(m);this.particles.push({m,v:new THREE.Vector3((Math.random()-.5)*3,Math.random()*2+.6,(Math.random()-.5)*3),life:.7+Math.random()*.5,max:1.2})}}
 footprints(pos,dir,time,color=COLORS.cyan){if(time-this.lastPrint<.16)return;this.lastPrint=time;const right=new THREE.Vector3(dir.z,0,-dir.x);for(let side of [-1,1]){const m=new THREE.Mesh(this.trailGeometry,this.trailMaterial.clone());m.material.color.set(color).multiplyScalar(2.4);m.position.copy(pos).addScaledVector(right,side*.22);m.position.y+=.075;m.rotation.x=-Math.PI/2;m.scale.set(.9,.9,1);this.group.add(m);this.trail.push({m,life:2.6});}}
 route(points){while(this.guide.children.length){const o=this.guide.children[0];this.guide.remove(o);o.geometry?.dispose();o.material?.dispose();}if(!points.length)return;for(let i=2;i<points.length;i+=6){const material=new THREE.MeshBasicMaterial({map:this.pawTexture,color:new THREE.Color(.32,1.6,2.2),transparent:true,opacity:.84,depthWrite:false,toneMapped:false});const m=new THREE.Mesh(new THREE.PlaneGeometry(.48,.48),material);m.rotation.x=-Math.PI/2;m.position.copy(points[i]);m.position.y+=.14;this.guide.add(m);}}
 createGate(pos,angle=0){
  const g=new THREE.Group();g.position.copy(pos);g.rotation.y=angle;const mat=new THREE.MeshBasicMaterial({color:new THREE.Color(.4,1.8,2.5),transparent:true,opacity:.95,toneMapped:false});
  for(const x of[-1.8,1.8]){const post=new THREE.Mesh(new THREE.BoxGeometry(.075,2.7,.09),mat);post.position.set(x,1.35,0);g.add(post);}
  const beam=new THREE.Mesh(new THREE.BoxGeometry(3.6,.075,.09),mat);beam.position.y=2.7;g.add(beam);
  const sheet=new THREE.Mesh(new THREE.PlaneGeometry(3.5,2.6),new THREE.MeshBasicMaterial({color:0x81dbff,transparent:true,opacity:.09,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));sheet.position.y=1.35;g.add(sheet);
  const badge=logoPlate(this.world,1.05,{name:'ANTA · rhythm gate'});badge.position.set(0,2.7,.06);g.add(badge);
  const title=this.label('KEEP MOVING',0xc2f7ff);title.position.y=2.06;title.scale.set(2.8,.55,1);g.add(title);
  const ticks=new THREE.Group();for(let y=.25;y<2.1;y+=.25)for(const x of[-1.6,1.6]){const square=new THREE.Mesh(new THREE.PlaneGeometry(.11,.11),mat);square.position.set(x,y,.025);ticks.add(square);}g.add(ticks);
  this.group.add(g);return{group:g,material:mat,sheet,open:false};
 }
 globe(pos){
  const g=new THREE.Group();g.position.copy(pos);this.group.add(g);
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.45,.85,12),new THREE.MeshStandardMaterial({color:0x23353a,metalness:.65,roughness:.32}));plinth.position.y=.43;plinth.castShadow=true;plinth.receiveShadow=true;g.add(plinth);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(2.13,.055,8,80),new THREE.MeshBasicMaterial({color:new THREE.Color(2.7,1.6,.55),toneMapped:false}));rim.rotation.x=Math.PI/2;rim.position.y=.87;g.add(rim);
  const orb=new THREE.Group();orb.position.y=3.5;g.add(orb);
  const mat=new THREE.MeshBasicMaterial({color:0x12569e,transparent:true,opacity:.20,depthWrite:false,toneMapped:false});orb.add(new THREE.Mesh(new THREE.SphereGeometry(1.85,36,18),mat));
  const gridMat=new THREE.LineBasicMaterial({color:0x3eb4ff,transparent:true,opacity:.32,toneMapped:false});for(let axis=0;axis<2;axis++)for(let j=0;j<6;j++){const pts=[];const a=j*Math.PI/6;for(let i=0;i<=100;i++){const t=i/100*Math.PI*2;pts.push(axis===0?new THREE.Vector3(Math.cos(t)*Math.sin(a)*1.86,Math.cos(a)*1.86,Math.sin(t)*Math.sin(a)*1.86):new THREE.Vector3(Math.sin(t)*Math.cos(a)*1.86,Math.cos(t)*1.86,Math.sin(t)*Math.sin(a)*1.86));}orb.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gridMat));}
  const vertices=[];for(const[lon,lat]of this.world.landDots||[]){const la=lat*Math.PI/180,lo=lon*Math.PI/180;vertices.push(-1.87*Math.cos(la)*Math.cos(lo),1.87*Math.sin(la),1.87*Math.cos(la)*Math.sin(lo));}
  const dots=new THREE.BufferGeometry();dots.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));orb.add(new THREE.Points(dots,new THREE.PointsMaterial({color:new THREE.Color(.5,1.7,4.),size:.052,toneMapped:false,transparent:true,opacity:.95})));
  const haze=new THREE.Mesh(new THREE.CylinderGeometry(1.5,.25,2.4,48,1,true),new THREE.MeshBasicMaterial({color:0x4eacff,transparent:true,opacity:.045,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));haze.position.y=1.95;g.add(haze);
  for(const a of[0,Math.PI/3]){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.97,.012,4,100),new THREE.MeshBasicMaterial({color:new THREE.Color(.35,1.2,2.6),transparent:true,opacity:.65,toneMapped:false}));ring.rotation.set(Math.PI/2,a,.2);orb.add(ring);}
  const badge=logoPlate(this.world,.96,{name:'ANTA · globe plinth'});badge.position.set(0,.45,2.25);g.add(badge);
  const label=this.label('全球联动 · 上海',COLORS.cyan);label.position.y=6;g.add(label);
  this.globeObject={group:g,orb,mat};return this.globeObject;
 }
 update(dt){this.time+=dt;this.rings.forEach(r=>{r.inner.rotation.z=this.time*.3;r.dot.scale.setScalar(1+Math.sin(this.time*3)*.12);r.label.position.y=2.25+Math.sin(this.time*1.7)*.07;});for(const s of this.sparks){if(s.collected)continue;s.group.position.y=s.base.y+1+Math.sin(this.time*2+s.id.length)*.13;s.mesh.rotation.y+=dt*.9;s.mesh.rotation.z+=dt*.35;}for(let a of [this.trail,this.particles])for(let i=a.length-1;i>=0;i--){const p=a[i];p.life-=dt;if(p.v){p.v.y-=dt*2;p.m.position.addScaledVector(p.v,dt);}p.m.material.opacity=Math.max(0,p.life/(p.max||2.6))*.7;if(p.life<=0){this.group.remove(p.m);p.m.material.dispose();if(p.v)p.m.geometry.dispose();a.splice(i,1);}}if(this.globeObject){this.globeObject.orb.rotation.y+=dt*.16;this.globeObject.orb.position.y=3.5+Math.sin(this.time)*.12;}}
}
