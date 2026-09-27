/* Water simulation adapted for this finished game from Three.js Water Pro 3.5.1.
 * © 2025–2026 DRG Software Solutions LLC. Proprietary — licensed, not sold.
 * iWave kernel, separable convolution and damped leapfrog from the supplied source.
 * This adapter uses the game's existing WebGLRenderer. See WATER-PRO-LICENSE.md. */
import * as THREE from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import kernel from '../vendor/water-pro-kernel.js';
const VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const SIZE=8,RES=96,STEP=1/60;
class PondWaveField{
 constructor(renderer){
  this.renderer=renderer;this.pending=[];this.steps=0;this.injections=0;this.accumulator=0;this.asleep=true;this.remaining=0;
  const opts={type:THREE.FloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:false};
  this.current=new THREE.WebGLRenderTarget(RES,RES,opts);this.previous=this.current.clone();this.next=this.current.clone();this.scratch=this.current.clone();
  this.h=new THREE.ShaderMaterial({uniforms:{state:{value:this.current.texture},filter0:{value:kernel.filters[0]},filter1:{value:kernel.filters[1]}},vertexShader:VS,depthTest:false,depthWrite:false,toneMapped:false,fragmentShader:`
   varying vec2 vUv;uniform sampler2D state;uniform float filter0[21],filter1[21];
   void main(){vec2 s=vec2(0.);for(int i=0;i<21;i++){float h=texture2D(state,clamp(vUv+vec2(float(i-10)/96.,0.),vec2(.5/96.),vec2(1.-.5/96.))).r;s+=h*vec2(filter0[i],filter1[i]);}gl_FragColor=vec4(s,0.,1.);}
  `});
  this.v=new THREE.ShaderMaterial({uniforms:{current:{value:null},previous:{value:null},scratch:{value:null},filter0:{value:kernel.filters[0]},filter1:{value:kernel.filters[1]},weights:{value:new THREE.Vector2(...kernel.lambdas)},operatorScale:{value:kernel.scale},impulses:{value:Array.from({length:8},()=>new THREE.Vector4())},count:{value:0}},vertexShader:VS,depthTest:false,depthWrite:false,toneMapped:false,fragmentShader:`
   varying vec2 vUv;uniform sampler2D current,previous,scratch;uniform float filter0[21],filter1[21],operatorScale;uniform vec2 weights;uniform vec4 impulses[8];uniform int count;
   void main(){vec2 cur=texture2D(current,vUv).rg;float prev=texture2D(previous,vUv).r;float conv=0.;
    for(int i=0;i<21;i++){vec2 s=texture2D(scratch,clamp(vUv+vec2(0.,float(i-10)/96.),vec2(.5/96.),vec2(1.-.5/96.))).rg;conv+=dot(s,weights*vec2(filter0[i],filter1[i]));}
    float dt=1./60.;float friction=.48;float denom=1.+friction*dt;float height=((2.-friction*dt)*cur.r-prev-9.81*dt*dt*operatorScale*conv/(8./96.))/denom;
    float foam=cur.g*.966;vec2 p=(vUv-.5)*8.;
    for(int i=0;i<8;i++){if(i<count){vec4 impulse=impulses[i];float shape=1.-smoothstep(0.,impulse.w,distance(p,impulse.xy));height+=impulse.z*shape;foam=max(foam,shape*abs(impulse.z)*3.);}}
    float rim=1.-smoothstep(.78,1.,length(p/vec2(2.8,1.96)));height=clamp(height*rim,-.22,.22);gl_FragColor=vec4(height,foam*rim,0.,1.);
   }
  `});this.quad=new FullScreenQuad(this.h);this.reset();
 }
 reset(){const r=this.renderer,target=r.getRenderTarget(),color=r.getClearColor(new THREE.Color()),alpha=r.getClearAlpha();r.setClearColor(0,0);for(const rt of[this.current,this.previous,this.next,this.scratch]){r.setRenderTarget(rt);r.clear();}r.setRenderTarget(target);r.setClearColor(color,alpha);this.pending.length=0;this.asleep=true;this.remaining=0;}
 disturb(x,z,strength=.034,radius=.4){if(!Number.isFinite(x+z+strength+radius))return;if(Math.hypot(x/2.8,z/1.96)>.96)return;this.pending.push(new THREE.Vector4(x,z,strength,radius));if(this.pending.length>8)this.pending.shift();this.injections++;this.remaining=9;this.asleep=false;}
 update(dt){if(dt<=0||this.asleep)return;this.remaining-=dt;if(this.remaining<=0){this.reset();return;}this.accumulator=Math.min(this.accumulator+dt,.05);const r=this.renderer,target=r.getRenderTarget();
  while(this.accumulator>=STEP){this.accumulator-=STEP;this.h.uniforms.state.value=this.current.texture;this.quad.material=this.h;r.setRenderTarget(this.scratch);this.quad.render(r);
   const u=this.v.uniforms;u.current.value=this.current.texture;u.previous.value=this.previous.texture;u.scratch.value=this.scratch.texture;u.count.value=this.pending.length;this.pending.forEach((p,i)=>u.impulses.value[i].copy(p));this.pending.length=0;
   this.quad.material=this.v;r.setRenderTarget(this.next);this.quad.render(r);const old=this.previous;this.previous=this.current;this.current=this.next;this.next=old;this.steps++;
  }r.setRenderTarget(target);
 }
 dispose(){for(const rt of[this.current,this.previous,this.next,this.scratch])rt.dispose();this.h.dispose();this.v.dispose();this.quad.dispose();}
}
export class InteractivePond{
 constructor(world){
  this.world=world;this.center=new THREE.Vector3(59.5,0,40.5);this.field=new PondWaveField(world.renderer);this.previousPosition=null;this.footClock=0;this.time=0;this.group=new THREE.Group();this.group.position.copy(this.center);world.scene.add(this.group);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(3.05,3.05,.16,96),new THREE.MeshStandardMaterial({color:0x647d78,roughness:.65}));base.scale.z=.7;base.position.y=-.09;base.receiveShadow=true;this.group.add(base);
  const ring=new THREE.Mesh(new THREE.RingGeometry(2.8,3.05,96),new THREE.MeshStandardMaterial({color:0xbfd2c7,roughness:.55,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.scale.y=.7;ring.position.y=.13;ring.receiveShadow=true;this.group.add(ring);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(2.925,.024,6,96),new THREE.MeshBasicMaterial({color:0x8cf0d4}));rim.rotation.x=-Math.PI/2;rim.scale.y=.7;rim.position.y=.151;this.group.add(rim);
  const shader={name:'PondReflectiveWater',uniforms:{color:{value:new THREE.Color(0x246e72)},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},waveState:{value:this.field.current.texture},time:{value:0}},vertexShader:`
   uniform mat4 textureMatrix;uniform sampler2D waveState;uniform float time;varying vec2 vUv,vSim;varying vec3 vWorld;varying vec4 vReflection;
   void main(){vUv=uv;vSim=vec2(position.x,-position.y)/8.+.5;vec3 p=position;p.z+=texture2D(waveState,vSim).r*.65+sin(position.x*2.+time*.9)*sin(position.y*2.6-time*.6)*.009;vWorld=(modelMatrix*vec4(p,1.)).xyz;vReflection=textureMatrix*vec4(p,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}
  `,fragmentShader:`
   uniform sampler2D tDiffuse,waveState;uniform vec3 color;uniform float time;varying vec2 vUv,vSim;varying vec3 vWorld;varying vec4 vReflection;
   void main(){vec2 local=(vUv-.5)*2.;if(length(local)>1.)discard;
    float eps=1./96.;float hx=texture2D(waveState,vSim+vec2(eps,0.)).r-texture2D(waveState,vSim-vec2(eps,0.)).r;float hz=texture2D(waveState,vSim+vec2(0.,eps)).r-texture2D(waveState,vSim-vec2(0.,eps)).r;
    vec2 slope=vec2(hx,hz)*18.+vec2(cos(vWorld.x*2.5+time*.7),sin(vWorld.z*2.2-time*.6))*.022;vec3 normal=normalize(vec3(-slope.x,1.,-slope.y));vec3 view=normalize(cameraPosition-vWorld);float fresnel=.16+.76*pow(1.-max(dot(normal,view),0.),3.);
    vec2 reflectionUV=vReflection.xy/vReflection.w+slope*.032;vec3 reflected=texture2D(tDiffuse,clamp(reflectionUV,vec2(.001),vec2(.999))).rgb;
    vec2 tile=(local+slope*.12)*vec2(11.,8.);vec2 grid=abs(fract(tile)-.5);float grout=smoothstep(.466,.49,max(grid.x,grid.y));
    float caustic=pow(max(0.,sin((vUv.x+slope.x*.04)*49.+time*.5)*sin((vUv.y+slope.y*.04)*43.-time*.4)),8.);
    vec3 bed=mix(vec3(.09,.28,.29),vec3(.18,.44,.43),.55+.45*sin(vUv.x*2.));bed=mix(bed,vec3(.39,.64,.61),grout*.22);bed+=caustic*vec3(.08,.12,.08);
    vec3 water=mix(bed,reflected*vec3(.69,.9,.89),fresnel);vec3 sun=normalize(vec3(-.5,.9,.6));float highlight=pow(max(0.,dot(reflect(-sun,normal),view)),96.);water+=highlight*vec3(1.,.89,.65)*.6;
    float rippleLight=clamp(length(slope)*.5,0.,.4);water+=rippleLight*vec3(.13,.36,.3);water+=texture2D(waveState,vSim).g*vec3(.25,.35,.29);
    gl_FragColor=vec4(water,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }
  `};
  this.surface=new Reflector(new THREE.PlaneGeometry(5.6,3.92,72,50),{textureWidth:innerWidth<700?256:512,textureHeight:innerWidth<700?256:512,clipBias:.002,shader});this.surface.rotation.x=-Math.PI/2;this.surface.position.y=.145;this.surface.material.side=THREE.DoubleSide;this.surface.name='Interactive shallow water · game installation';this.group.add(this.surface);
  // Update the planar reflection at 15 Hz, while waves and surface normals run at 60 Hz.
  const reflect=this.surface.onBeforeRender.bind(this.surface);let last=-Infinity;
  this.surface.onBeforeRender=(...args)=>{if(this.time-last>1/15||last===-Infinity){last=this.time;reflect(...args);}};
  this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.145);this.hitPoint=new THREE.Vector3();this.clicks=0;
 }
 contains(pos,margin=1){return Math.abs(pos.y-this.center.y)<.8&&Math.hypot((pos.x-this.center.x)/2.8,(pos.z-this.center.z)/1.96)<margin;}
 pointer(ray){if(!ray.ray.intersectPlane(this.plane,this.hitPoint)||!this.contains(this.hitPoint,.94))return false;this.field.disturb(this.hitPoint.x-this.center.x,this.hitPoint.z-this.center.z,.07,.48);this.clicks++;return true;}
 update(dt,player){
  if(dt<=0){if(player)this.previousPosition=player.clone();return;}this.time+=dt;this.footClock+=dt;
  if(player){if(this.previousPosition){const distance=player.distanceTo(this.previousPosition);if(distance>.003&&distance<2&&this.contains(player,.95)&&this.footClock>.105){this.footClock=0;const speed=distance/dt;const side=new THREE.Vector3(player.z-this.previousPosition.z,0,this.previousPosition.x-player.x).normalize();for(const sign of[-1,1])this.field.disturb(player.x-this.center.x+side.x*.15*sign,player.z-this.center.z+side.z*.15*sign,Math.min(.06,.017+speed*.003),.22);}}this.previousPosition=player.clone();}
  this.field.update(dt);this.surface.material.uniforms.waveState.value=this.field.current.texture;this.surface.material.uniforms.time.value=this.time;
 }
 dispose(){this.field.dispose();this.surface.getRenderTarget().dispose();this.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.group.removeFromParent();}
}
