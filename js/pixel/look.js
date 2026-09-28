import {Vector2,Vector3,NearestFilter,NearestMipmapNearestFilter,PCFShadowMap} from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {PIXEL_KEY,PIXEL_MODES,pixelSettings,pixelSize} from './config.js';
// Vivid 48-colour ramps: blue shadows, emerald foliage, orange fur, gold and cyan.
// Pale stone keeps its own neutral ramp so more colour does not tint every wall.
const colours=['11224b','163c67','235579','317ca4','4db8ce','80dfec','b9ede9','effcf4',
 '123f35','16664a','238b4b','41b848','76d448','a7e864','d4f58e','f1f8bd',
 '32324c','4b5375','747e9a','a4b1c3','c4d0d4','d6e1dd','edf1df','fff7df',
 '552538','87412b','bc591f','e78429','ffb632','ffd948','ffe888','fff5c4',
 '155574','168bab','28c9dc','65f2db','b6fff0','872654','c93868','ff647e','41424e','62636c','868878','aaa993','c5cabb','f9efd4','ed7124','ffad50'];
export function createPixelPass(){
 return new ShaderPass({uniforms:{tDiffuse:{value:null},texel:{value:new Vector2(1,1)},palette:{value:colours.map(h=>new Vector3(...[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)))},time:{value:0}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 texel;uniform vec3 palette[48];varying vec2 vUv;
 float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
 void main(){
  vec3 c=texture2D(tDiffuse,vUv).rgb;
  float l=luma(c),nearL=min(luma(texture2D(tDiffuse,vUv+vec2(texel.x,0.)).rgb),luma(texture2D(tDiffuse,vUv+vec2(0.,texel.y)).rgb));
  c*=1.-smoothstep(.2,.6,l-nearL)*.12;
  // Recover chroma lost to photographic lighting before the palette lookup.
  // Whites/greys stay neutral; already vivid emissive effects retain detail.
  float chroma=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));
  float boost=1.+.95*smoothstep(.025,.16,chroma)*(1.-.35*smoothstep(.45,.9,chroma));
  c=clamp(mix(vec3(luma(c)),c,boost),0.,1.);
  vec2 p=mod(floor(gl_FragCoord.xy),2.);float d=(p.x+2.*p.y)/4.-.375;
  c=clamp(c+d*.016,0.,1.);vec3 best=palette[0];float cost=100.;
  for(int i=0;i<48;i++){vec3 delta=c-palette[i];float distance=dot(delta*delta,vec3(.9,1.2,1.));if(distance<cost){cost=distance;best=palette[i];}}
  gl_FragColor=vec4(best,1.);
 }`});
}
export function loadPixelSettings(){try{return pixelSettings(JSON.parse(localStorage.getItem(PIXEL_KEY)));}catch{return pixelSettings();}}
export function resizePixelWorld(world,w,h){
 const size=pixelSize(w,h,world.pixelOptions?.mode);world.pixelResolution=size;
 world.renderer.setPixelRatio(1);world.renderer.setSize(size.width,size.height,false);world.composer.setPixelRatio(1);world.composer.setSize(size.width,size.height);
 world.grade?.uniforms.texel.value.set(1/size.width,1/size.height);
 for(const rt of [world.composer.renderTarget1,world.composer.renderTarget2]){rt.samples=4;rt.texture.minFilter=NearestFilter;rt.texture.magFilter=NearestFilter;}
 world.canvas.style.imageRendering='pixelated';
}
export function setPixelMode(world,mode){world.pixelOptions=pixelSettings({...world.pixelOptions,mode});try{localStorage.setItem(PIXEL_KEY,JSON.stringify(world.pixelOptions));}catch{}world.resize();return PIXEL_MODES[world.pixelOptions.mode].name;}
export function pixelMaterials(scene,seen=new WeakSet()){
 scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m)continue;for(const key of ['map','emissiveMap']){const t=m[key];if(!t||seen.has(t))continue;seen.add(t);t.magFilter=NearestFilter;t.minFilter=t.generateMipmaps?NearestMipmapNearestFilter:NearestFilter;t.anisotropy=1;t.needsUpdate=true;}}});
 return seen;
}
export function preparePixelFrame(world){
 world.dof.enabled=false;world.bloom.enabled=false;world.renderer.shadowMap.type=PCFShadowMap;
 // Dynamic rooms can add textures after initial loading. No normals or geometry are rewritten.
 if(!world.pixelTextures||world.pixelRoom!==world.currentRoom){world.pixelTextures=pixelMaterials(world.scene,world.pixelTextures);world.pixelRoom=world.currentRoom;}
}
