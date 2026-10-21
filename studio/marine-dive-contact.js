// Swept horizontal body envelope: five overlapping spheres from boots to helmet.
// The normal standing collider remains authoritative; this guards the extra reach of a prone body.
const OFFSETS=[-.58,-.29,0,.32,.66],R=.29;
function hitBox(a,b,s,r,reference=a){
 let enter=0,leave=1,nx=0,nz=0;const dx=b.x-a.x,dz=b.z-a.z;
 for(const [axis,lo,hi,v]of [['x','minX','maxX',dx],['z','minZ','maxZ',dz]]){
  if(Math.abs(v)<1e-10){if(a[axis]<s[lo]-r||a[axis]>s[hi]+r)return null;continue;}
  let p=(s[lo]-r-a[axis])/v,q=(s[hi]+r-a[axis])/v,sign=-1;if(p>q){[p,q]=[q,p];sign=1;}
  if(p>=enter){enter=p;nx=axis==='x'?sign:0;nz=axis==='z'?sign:0;}leave=Math.min(leave,q);if(enter>leave)return null;
 }
 if(leave<0||enter>1)return null;
 if(!nx&&!nz){
  // All overlapping body samples must leave on the root's side of a thin wall;
  // choosing each sample's nearest face can push the head and boots opposite ways.
  const faces=[[reference.x-(s.minX-r),-1,0,s.minX-r,a.z],[s.maxX+r-reference.x,1,0,s.maxX+r,a.z],[reference.z-(s.minZ-r),0,-1,a.x,s.minZ-r],[s.maxZ+r-reference.z,0,1,a.x,s.maxZ+r]].sort((x,y)=>x[0]-y[0]);
  const q=faces[0];return {t:0,nx:q[1],nz:q[2],x:q[3],z:q[4]};
 }
 return {t:enter,nx,nz,x:a.x+dx*enter,z:a.z+dz*enter};
}
function hitCircle(a,b,s,r,reference=a){
 const dx=b.x-a.x,dz=b.z-a.z,x=a.x-s.x,z=a.z-s.z,rad=s.radius+r,c=x*x+z*z-rad*rad,A=dx*dx+dz*dz;
 let t=0;if(c>0){const B=2*(x*dx+z*dz),disc=B*B-4*A*c;if(A<1e-12||disc<0)return null;t=(-B-Math.sqrt(disc))/(2*A);if(t<0||t>1)return null;}
 let nx=c<=0?reference.x-s.x:x+dx*t,nz=c<=0?reference.z-s.z:z+dz*t,L=Math.hypot(nx,nz);if(L<1e-9){nx=-dx;nz=-dz;L=Math.hypot(nx,nz)||1;}nx/=L;nz/=L;
 return {t,nx,nz,x:s.x+nx*rad,z:s.z+nz*rad};
}
export function constrainDiveBody(from,to,dirX,dirZ,flat,hip,solids){
 let start={x:from.x,z:from.z},end={x:to.x,z:to.z},nx=0,nz=0,hit=false;
 for(let pass=0;pass<4;pass++){
  let best=null;
  for(const offset of OFFSETS){const k=offset*flat,ox=dirX*k,oz=dirZ*k,a={x:start.x+ox,z:start.z+oz},b={x:end.x+ox,z:end.z+oz},y=to.y+hip+k*.12;
   for(const s of solids){if(s.target!=null||s.floor||y+R<s.minY||y-R>s.maxY)continue;
    const h=s.radius!=null?hitCircle(a,b,s,R,start):hitBox(a,b,s,R,start);if(h&&(!best||h.t<best.t)){best={...h,ox,oz};}
   }
  }
  if(!best)break;
  hit=true;nx=best.nx;nz=best.nz;
  const x=best.x-best.ox+nx*.002,z=best.z-best.oz+nz*.002,dx=(end.x-start.x)*(1-best.t),dz=(end.z-start.z)*(1-best.t),dot=Math.min(0,dx*nx+dz*nz);
  start={x,z};end={x:x+dx-dot*nx,z:z+dz-dot*nz};
 }
 return {x:end.x,z:end.z,hit,nx,nz};
}
export function stopDiveIntoContact(d,nx,nz){
 const v=d.vx*nx+d.vz*nz;if(v<0){d.vx-=v*nx;d.vz-=v*nz;}
 d.wallT=.12;d.wallX=nx;d.wallZ=nz;d.contact=1;
}
