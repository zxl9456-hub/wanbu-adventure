import * as THREE from 'three';

// Transparent cutout of the supplied reference; shared by every in-game ANTA mark.
export const BRAND_LOGO_URL='./assets/anta-logo-transparent.png';
export async function loadBrand(world){
 const source=await new THREE.TextureLoader().loadAsync(BRAND_LOGO_URL),image=source.image;
 // Browser canvas resolves the reference PNG's embedded color profile to sRGB, matching
 // the HTML image. Direct WebGL upload would interpret the wide-gamut pixels incorrectly.
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 canvas.getContext('2d',{colorSpace:'srgb'}).drawImage(image,0,0);source.dispose();
 const texture=new THREE.CanvasTexture(canvas);texture.userData={brandSource:BRAND_LOGO_URL,logoAspect:image.width/image.height};
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,world.renderer.capabilities.getMaxAnisotropy());
 world.brandLogoImage=image;world.brandLogoTexture=texture;world.brandLogoAspect=image.width/image.height;
}

function drawLogo(world,ctx,x,y,width,height){
 const image=world.brandLogoImage,scale=Math.min(width/image.width,height/image.height);
 const w=image.width*scale,h=image.height*scale;ctx.drawImage(image,x+(width-w)/2,y+(height-h)/2,w,h);
 return {width:w,height:h};
}

function panelTexture(world,width,height,{layout='logo',title='',subtitle=''}={}){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*height/width);
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 let rect;
 if(layout==='banner'){
  rect=drawLogo(world,ctx,w*.04,h*.035,w*.92,h*.43);
  ctx.fillStyle='#f3ebdc';ctx.textAlign='left';ctx.font=`700 ${w*.115}px Arial`;
  ['KEEP','MOVING.'].forEach((text,i)=>ctx.fillText(text,w*.12,h*.66+i*w*.15));
  ctx.font=`500 ${w*.044}px Arial`;ctx.fillText('SHANGHAI CENTRE',w*.12,h*.93);
 }else if(layout==='wayfinding'){
  rect=drawLogo(world,ctx,w*.02,h*.035,w*.39,h*.93);
  ctx.fillStyle='#d9ddd8';ctx.fillRect(w*.43,h*.2,1.5,h*.6);
  ctx.fillStyle='#f3ebdc';ctx.textAlign='left';ctx.font=`600 ${h*.17}px "PingFang SC",sans-serif`;ctx.fillText(title,w*.48,h*.47);
  ctx.font=`500 ${h*.077}px Arial`;ctx.fillText(subtitle,w*.48,h*.67);
 }else{
  rect=drawLogo(world,ctx,0,0,w,subtitle?h*.8:h);
  if(subtitle){ctx.fillStyle='#202726';ctx.textAlign='center';ctx.font=`600 ${h*.085}px Arial`;ctx.fillText(subtitle,w/2,h*.93);}
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=world.brandLogoTexture.anisotropy;
 texture.userData={brandSource:BRAND_LOGO_URL,logoAspect:rect.width/rect.height};return texture;
}

export function brandPanel(world,width,height,options={}){
 const group=new THREE.Group();group.name=options.name||'ANTA · supplied logo';group.userData.brandSource=BRAND_LOGO_URL;
 const texture=options.layout||options.subtitle?panelTexture(world,width,height,options):world.brandLogoTexture;
 const clippingPlanes=options.architectural?[world.cutaway]:[];
 // No backing box: alpha cutouts also leave the scene depth and shadows clear of rectangles.
 const material=new THREE.MeshBasicMaterial({map:texture,color:0xffffff,transparent:true,alphaTest:.08,depthWrite:true,toneMapped:false,fog:false,clippingPlanes});
 for(const side of [1,-1]){const face=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);face.position.z=side*.006;face.rotation.y=side===1?0:Math.PI;face.castShadow=false;group.add(face);}
 return group;
}

export function logoPlate(world,width,options={}){return brandPanel(world,width,width/world.brandLogoAspect,options);}

export function replaceModelBranding(world){
 const building=world.building;building.updateMatrixWorld(true);
 const replacements=new THREE.Group();replacements.name='Supplied ANTA identity · architectural signs';world.scene.add(replacements);
 const install=(plate,position,rotation=[0,0,0])=>{plate.position.set(...position);plate.rotation.set(...rotation);replacements.add(plate);};
 for(const name of ['White_R1232','Red_R1233']){const mesh=building.getObjectByName(name);if(mesh){mesh.visible=false;mesh.userData.brandReplacement=BRAND_LOGO_URL;}}
 install(logoPlate(world,5.05,{name:'ANTA · upper facade',architectural:true}),[45.9,25.43,30.35],[0,.23,0]);
 install(logoPlate(world,11.9,{name:'ANTA · roof',architectural:true}),[45.67,19.52,15.6],[-Math.PI/2,0,0]);

 // This source mesh also contains the Chinese centre name and KEEP MOVING sculpture.
 // Remove only the four old ANTA glyphs, identified from their separate geometry bounds.
 const entrance=building.getObjectByName('white_R849');
 if(entrance){
  const original=entrance.geometry,geometry=original.clone(),pos=geometry.attributes.position,idx=geometry.index;
  const keep=[],v=new THREE.Vector3();let removed=0;
  for(let i=0;i<idx.count;i+=3){
   let isLogo=true;
   for(let j=0;j<3;j++){v.fromBufferAttribute(pos,idx.getX(i+j)).applyMatrix4(entrance.matrixWorld);if(v.x<55.4||v.x>61.6||v.z<51.9)isLogo=false;}
   if(isLogo)removed++;else keep.push(idx.getX(i),idx.getX(i+1),idx.getX(i+2));
  }
  geometry.setIndex(keep);geometry.computeBoundingSphere();entrance.geometry=geometry;entrance.userData.replacedLogoTriangles=removed;
  install(brandPanel(world,5.9,2.5,{layout:'logo',name:'ANTA · entrance sculpture',architectural:true}),[58.48,1.275,52.7]);
 }

 // Source flags include an ANTA mark and an orange kids variant. Fit the supplied full mark
 // to each existing flag's physical UV proportions; keep the kids descriptor as plain text.
 for(const [name,subtitle]of [['Layer_15_R845',''],['Layer_16_R846','KIDS']]){
  const mesh=building.getObjectByName(name);if(!mesh)continue;
  const geometry=mesh.geometry,p=geometry.attributes.position,uv=geometry.attributes.uv,idx=geometry.index;
  let width=3,height=2;
  if(uv){
   const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
   for(let i=0;i<(idx?idx.count:p.count);i+=3){
    const ia=idx?idx.getX(i):i,ib=idx?idx.getX(i+1):i+1,ic=idx?idx.getX(i+2):i+2;
    const du1=uv.getX(ib)-uv.getX(ia),dv1=uv.getY(ib)-uv.getY(ia),du2=uv.getX(ic)-uv.getX(ia),dv2=uv.getY(ic)-uv.getY(ia),det=du1*dv2-du2*dv1;
    if(Math.abs(det)<1e-5)continue;
    a.fromBufferAttribute(p,ia).applyMatrix4(mesh.matrixWorld);b.fromBufferAttribute(p,ib).applyMatrix4(mesh.matrixWorld).sub(a);c.fromBufferAttribute(p,ic).applyMatrix4(mesh.matrixWorld).sub(a);
    width=b.clone().multiplyScalar(dv2).addScaledVector(c,-dv1).divideScalar(det).length();height=c.multiplyScalar(du1).addScaledVector(b,-du2).divideScalar(det).length();break;
   }
  }
  const map=panelTexture(world,width,height,{subtitle});map.flipY=false;
  const previous=mesh.material;mesh.material=new THREE.MeshBasicMaterial({map,color:0xffffff,transparent:true,alphaTest:.08,depthWrite:true,toneMapped:false,fog:false,side:THREE.DoubleSide,clippingPlanes:[world.cutaway]});previous.dispose();mesh.castShadow=false;mesh.userData.brandSource=BRAND_LOGO_URL;
 }
 world.brandArchitecture=replacements;
}
