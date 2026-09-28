import {Vector2,Vector3,NearestFilter,NearestMipmapNearestFilter,PCFSoftShadowMap} from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {PIXEL_KEY,PIXEL_MODES,pixelSettings,pixelSize} from './config.js';
// A shared 48-colour ramp: ink, slate, foliage, warm masonry, amber and cyan.
const colours=['172638','22384a','304d5c','446779','6595a0','92b7bc','c0d3cc','e5ebe0',
 '243a38','345047','486951','62895b','84a669','aabc83','cdd3a0','eee4bd',
 '393a49','505569','77788a','a4a0a0','c0b5a1','d8c8ad','ead9b8','fff0d4',
 '593f36','80513e','ab6e46','cc975b','edba69','ffdc8c','ffe9b0','fff6dc',
 '264d61','397f8b','63b7b2','9be0c8','d0f5df','743f50','ae5261','e07973','45444a','64605a','858076','a5a08f','b8b8aa','f1e9d2','e59248','f4bd75'];
export function createPixelPass(){
 return new ShaderPass({uniforms:{tDiffuse:{value:null},texel:{value:new Vector2(1,1)},palette:{value:colours.map(h=>new Vector3(...[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)))},time:{value:0}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 texel;uniform vec3 palette[48];varying vec2 vUv;
 float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
 void main(){
  vec3 c=texture2D(tDiffuse,vUv).rgb;
  float l=luma(c),nearL=min(luma(texture2D(tDiffuse,vUv+vec2(texel.x,0.)).rgb),luma(texture2D(tDiffuse,vUv+vec2(0.,texel.y)).rgb));
  c*=1.-smoothstep(.2,.6,l-nearL)*.12;
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
 world.dof.enabled=false;world.bloom.enabled=false;world.renderer.shadowMap.type=PCFSoftShadowMap;
 // Dynamic rooms can add textures after initial loading. No normals or geometry are rewritten.
 if(!world.pixelTextures||world.pixelRoom!==world.currentRoom){world.pixelTextures=pixelMaterials(world.scene,world.pixelTextures);world.pixelRoom=world.currentRoom;}
}
