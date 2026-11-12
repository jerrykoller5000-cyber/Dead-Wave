import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
assert(process.env.DW_GAME_TEST_TOKEN);
const vendor=new URL('../../vendor/three/three.core.js',import.meta.url).href;
registerHooks({resolve(s,c,next){return s==='three'?{url:vendor,shortCircuit:true}:next(s,c);}});
const G=await import(vendor),{slab}=await import('../../core/geometry.js');
const {visiblePieces,visibleSurfaceGap}=await import('../../tools/tests/weapon-seating.js');
const line=[[-.36,.095],[-.51,.095],[-.55,.045],[-.55,-.11],[-.46,-.13],[-.40,-.09]];
function band(l,h){const a=[],b=[];for(let i=0;i<l.length;i++){const p=l[Math.max(0,i-1)],q=l[Math.min(l.length-1,i+1)],z=q[0]-p[0],y=q[1]-p[1],m=Math.hypot(y,z);a.push([l[i][0]-y*h/m,l[i][1]+z*h/m]);b.push([l[i][0]+y*h/m,l[i][1]-z*h/m]);}return a.concat(b.reverse());}
const old=band(line,.018),rear=Array.from({length:11},(_,i)=>{const a=Math.PI/2+Math.PI*i/10,y=.13*Math.sin(a);return[-.32+.13*Math.cos(a)+.012*(1-(y/.13)**2),y];});
function meet(i,j){
  const [a,b,c,d]=[old[i],old[i+1],rear[j],rear[j+1]],dz=b[0]-a[0],dy=b[1]-a[1],fz=d[0]-c[0],fy=d[1]-c[1];
  const t=((c[0]-a[0])*fy-(c[1]-a[1])*fz)/(dz*fy-dy*fz);return[a[0]+t*dz,a[1]+t*dy];
}
const mat=new G.MeshBasicMaterial({side:G.DoubleSide}),mask=new G.Mesh(slab(band([[-.44,.07],[-.43,.035],[-.425,.008]],.005),.016,.002,2),mat);
const body=new G.Mesh(slab([[.225,-.13],[.225,.13],...rear],.28,.035,3),mat);
for(const variant of ['old','two-upper','one-upper']){
 const points=variant==='old'?old:[meet(0,2),...old.slice(1,5),meet(4,7),meet(6,7),...old.slice(7,11),...(variant==='two-upper'?[meet(10,1),rear[2]]:[meet(10,2)])];
 const mesh=new G.Mesh(slab(points,.065,.008,2),mat);
 const ray=new G.Raycaster(new G.Vector3(.1,.04652/(.7*.9570996978851964),-.29468/(.7*.9570996978851964)),new G.Vector3(-1,0,0));
 const hits=ray.intersectObject(mesh,false).map(h=>[h.point.x,h.faceIndex]); 
 console.log(variant,'at witness',hits,'nearby art',visibleSurfaceGap(mesh,mask,1),'housing',visibleSurfaceGap(mesh,body,1),'closed',visiblePieces(mesh).every(s=>s.closed));
}
