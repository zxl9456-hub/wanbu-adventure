// Render UI portraits on a pixel grid as well as the WebGL world.
// Original source images are preserved; only this page's presentation is changed.
const watched=new WeakSet();
function watch(img){
 if(watched.has(img))return;watched.add(img);
 const paint=()=>{
  if(img.dataset.pixelPortrait||!img.naturalWidth)return;
  const source=img.currentSrc||img.src;
  if(new URL(source,location.href).origin!==location.origin)return;
  const canvas=document.createElement('canvas'),width=img.naturalWidth>500?144:48;
  canvas.width=Math.min(width,img.naturalWidth);canvas.height=Math.max(1,Math.round(img.naturalHeight*canvas.width/img.naturalWidth));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  for(let i=0;i<pixels.data.length;i+=4){for(let j=0;j<3;j++)pixels.data[i+j]=Math.round(pixels.data[i+j]/32)*32;}
  ctx.putImageData(pixels,0,0);img.dataset.pixelPortrait='true';img.src=canvas.toDataURL();
 };
 if(img.complete)paint();else img.addEventListener('load',paint,{once:true});
}
function scan(root){if(root instanceof HTMLImageElement)watch(root);root.querySelectorAll?.('img').forEach(watch);}
if(typeof document!=='undefined'){scan(document);
new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)scan(n);}).observe(document.body,{childList:true,subtree:true});

}
