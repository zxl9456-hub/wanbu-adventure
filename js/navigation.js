import {Vector3} from 'three';
class Heap{constructor(){this.a=[]}push(v){const a=this.a;let i=a.push(v)-1;while(i){let p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p}a[i]=v}pop(){const a=this.a,first=a[0],last=a.pop();if(a.length){let i=0;while(true){let l=i*2+1,r=l+1;if(l>=a.length)break;let c=r<a.length&&a[r].f<a[l].f?r:l;if(a[c].f>=last.f)break;a[i]=a[c];i=c}a[i]=last}return first}get length(){return this.a.length}}
export class Navigation{
 constructor(world){this.world=world;this.n=world.nav;this.total=this.n.nx*this.n.ny;}
 coords(v){return [Math.round((v.x+300-this.n.x)/this.n.step),Math.round((60-v.z-this.n.y)/this.n.step)]}
 valid(i,j){const sx=this.n.x+i*this.n.step,sy=this.n.y+j*this.n.step;return i>=0&&i<this.n.nx&&j>=0&&j<this.n.ny&&sx>=305&&sx<=367&&sy>=16&&sy<=77;}
 at(i,j,level){return this.n.levels[level]?.[j]?.[i]??null}
 nearest(v){let[i,j]=this.coords(v);let best=null;for(let d=0;d<=3&&!best;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++){let x=i+dx,y=j+dy;if(!this.valid(x,y))continue;for(let l=0;l<2;l++){let h=this.at(x,y,l);if(h!==null&&Math.abs(h-v.y)<.85){let cost=dx*dx+dy*dy+Math.abs(h-v.y);if(!best||cost<best.cost)best={i:x,j:y,l,h,cost};}}}return best;}
 path(start,end){
  let s=this.nearest(start),g=this.nearest(end);if(!s||!g)return [];
  const id=(i,j,l)=>i+j*this.n.nx+l*this.total;const sid=id(s.i,s.j,s.l),gid=id(g.i,g.j,g.l);const heap=new Heap(),parents=new Map(),scores=new Map([[sid,0]]),closed=new Set();heap.push({...s,id:sid,f:0});let found=false,visits=0;
  while(heap.length&&visits++<35000){const a=heap.pop();if(closed.has(a.id))continue;if(a.id===gid){found=true;break}closed.add(a.id);
   for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])for(let l=0;l<2;l++){
    let i=a.i+dx,j=a.j+dy;if(!this.valid(i,j))continue;const h=this.at(i,j,l);if(h===null||Math.abs(h-a.h)>.65)continue;
    let k=id(i,j,l);if(closed.has(k))continue;const score=scores.get(a.id)+Math.hypot(dx,dy)+Math.abs(h-a.h)*2;if(score>=(scores.get(k)??Infinity))continue;
    parents.set(k,a.id);scores.set(k,score);heap.push({i,j,l,h,id:k,f:score+Math.hypot(g.i-i,g.j-j)+Math.abs(g.h-h)*2});
   }
  }
  if(!found)return [];
  const route=[];let k=gid;while(k!==sid){const l=k>=this.total?1:0,ix=k-l*this.total,i=ix%this.n.nx,j=Math.floor(ix/this.n.nx);route.push(new Vector3(this.n.x+i*this.n.step-300,this.at(i,j,l),60-this.n.y-j*this.n.step));k=parents.get(k);if(k===undefined)return [];}
  return route.reverse();
 }
 height(p,reference){const[i,j]=this.coords(p);if(!this.valid(i,j))return null;return this.world.groundHeight(p,reference);}
}
