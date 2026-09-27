import {ShaderMaterial,Vector2,WebGLRenderTarget,HalfFloatType,MathUtils,Vector3} from 'three';
import {Pass,FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const depthFunctions=`
 uniform sampler2D tDepth;uniform float nearPlane,farPlane,focusDistance,focusBand,nearFalloff,farFalloff;
 float distanceAt(vec2 p){return mix(nearPlane,farPlane,texture2D(tDepth,p).x);}
 float coc(float d){float delta=d-focusDistance;return sign(delta)*smoothstep(focusBand,focusBand+(delta<0.?nearFalloff:farFalloff),abs(delta));}
`;
/** Orthographic, depth-aware lens blur. The UI is composited by the DOM afterward. */
export class AdventureDepthOfField extends Pass{
 constructor(camera){
  super();this.camera=camera;this.focusDistance=260;this.blurScale=1;
  this.uniforms={tColor:{value:null},tDepth:{value:null},texel:{value:new Vector2(1,1)},nearPlane:{value:camera.near},farPlane:{value:camera.far},focusDistance:{value:260},focusBand:{value:20},nearFalloff:{value:40},farFalloff:{value:65},maxBlur:{value:12}};
  this.blurMaterial=new ShaderMaterial({uniforms:this.uniforms,vertexShader,depthTest:false,depthWrite:false,toneMapped:false,fragmentShader:`
   varying vec2 vUv;uniform sampler2D tColor;uniform vec2 texel;uniform float maxBlur;${depthFunctions}
   void main(){float depth=distanceAt(vUv);float c=coc(depth);vec3 col=texture2D(tColor,vUv).rgb;float radius=abs(c)*maxBlur;
    if(radius<.35){gl_FragColor=vec4(col,abs(c));return;}
    vec3 sum=col;float weights=1.;
    for(int i=0;i<24;i++){float fi=float(i)+.5;float angle=fi*2.39996323;vec2 offset=vec2(cos(angle),sin(angle))*sqrt(fi/24.)*radius*texel;vec2 uv=clamp(vUv+offset,texel,vec2(1.)-texel);float sampleDepth=distanceAt(uv);float sampleCoC=coc(sampleDepth);
     float sameLayer=c>0.?smoothstep(-3.,0.,sampleDepth-depth):1.-smoothstep(0.,5.,sampleDepth-depth);
     float w=mix(.05,1.,sameLayer)*mix(.08,1.,smoothstep(.04,.4,abs(sampleCoC)));
     sum+=texture2D(tColor,uv).rgb*w;weights+=w;}
    gl_FragColor=vec4(sum/weights,abs(c));}
  `});
  this.compositeMaterial=new ShaderMaterial({uniforms:{...this.uniforms,tBlur:{value:null}},vertexShader,depthTest:false,depthWrite:false,toneMapped:false,fragmentShader:`varying vec2 vUv;uniform sampler2D tColor,tBlur;${depthFunctions}
   void main(){vec3 sharp=texture2D(tColor,vUv).rgb;vec3 blurred=texture2D(tBlur,vUv).rgb;float amount=smoothstep(.015,.14,abs(coc(distanceAt(vUv))));gl_FragColor=vec4(mix(sharp,blurred,amount),1.);}
  `});
  this.blurTarget=new WebGLRenderTarget(1,1,{type:HalfFloatType,depthBuffer:false});this.quad=new FullScreenQuad(this.blurMaterial);this.focusPoint=new Vector3();
 }
 update(dt,target,playing,dpr){
  this.camera.updateMatrixWorld();this.focusPoint.copy(target).applyMatrix4(this.camera.matrixWorldInverse);
  const distance=-this.focusPoint.z;this.focusDistance=dt>0?MathUtils.damp(this.focusDistance,distance,8,dt):this.focusDistance;
  this.uniforms.focusDistance.value=this.focusDistance;this.uniforms.nearPlane.value=this.camera.near;this.uniforms.farPlane.value=this.camera.far;
  this.uniforms.focusBand.value=playing?4.5:22;this.uniforms.nearFalloff.value=playing?15:55;this.uniforms.farFalloff.value=playing?24:85;this.uniforms.maxBlur.value=(innerWidth<700?9:12)*dpr*this.blurScale;
 }
 setSize(w,h){this.uniforms.texel.value.set(1/w,1/h);this.blurTarget.setSize(Math.max(1,Math.round(w*.5)),Math.max(1,Math.round(h*.5)));}
 render(renderer,writeBuffer,readBuffer){
  this.uniforms.tColor.value=readBuffer.texture;this.uniforms.tDepth.value=readBuffer.depthTexture;
  this.quad.material=this.blurMaterial;renderer.setRenderTarget(this.blurTarget);this.quad.render(renderer);
  this.compositeMaterial.uniforms.tBlur.value=this.blurTarget.texture;this.quad.material=this.compositeMaterial;renderer.setRenderTarget(this.renderToScreen?null:writeBuffer);this.quad.render(renderer);
 }
 dispose(){this.blurTarget.dispose();this.blurMaterial.dispose();this.compositeMaterial.dispose();this.quad.dispose();}
}
