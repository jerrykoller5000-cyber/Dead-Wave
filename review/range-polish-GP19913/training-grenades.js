// Candidate for Grokbot: swept finite-radius contact with the existing range fixture.
// Bullets keep their open shot slot; grenades bounce only against actual bench/fence solids.
export const GRENADE_RADIUS=.12;
export function rangeGrenadeHit(tg,a,b,radius=GRENADE_RADIUS){
 let best=null;
 for(const s of tg?.solids||[]){
  if(!s.firingLine)continue;
  let near=0,far=1,normal=null;const delta={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z};
  for(const [axis,lo,hi] of [['x','minX','maxX'],['y','minY','maxY'],['z','minZ','maxZ']]){
   const p=a[axis],v=delta[axis],low=s[lo]-radius,high=s[hi]+radius;
   if(Math.abs(v)<1e-9){if(p<low||p>high){near=2;break;}continue;}
   let enter=(low-p)/v,leave=(high-p)/v,sign=-1;
   if(enter>leave){[enter,leave]=[leave,enter];sign=1;}
   if(enter>=near){near=enter;normal={x:0,y:0,z:0};normal[axis]=sign;}
   far=Math.min(far,leave);if(near>far){near=2;break;}
  }
  if(near>1||far<0||near>far)continue;
  if(!normal){
   // A release already intersecting the expanded fixture is pushed back through its nearest face.
   let distance=Infinity;
   for(const [axis,lo,hi] of [['x','minX','maxX'],['y','minY','maxY'],['z','minZ','maxZ']])for(const [key,sign] of [[lo,-1],[hi,1]]){
    const edge=s[key]+sign*radius,d=Math.abs(a[axis]-edge);
    if(d<distance){distance=d;normal={x:0,y:0,z:0};normal[axis]=sign;}
   }
  }
  if(best&&near>=best.t)continue;
  const point={x:a.x+delta.x*near,y:a.y+delta.y*near,z:a.z+delta.z*near};
  // Snap the center to the expanded contact face, including initial overlap.
  for(const axis of ['x','y','z'])if(normal[axis])point[axis]=s[normal[axis]<0?'min'+axis.toUpperCase():'max'+axis.toUpperCase()]+normal[axis]*radius;
  best={t:near,normal,point,solid:s};
 }
 return best;
}
export function bounceRangeGrenade(g,tg,from,dt){
 const hit=rangeGrenadeHit(tg,from,g.pos);if(!hit)return null;
 const n=hit.normal,dot=g.vx*n.x+g.vy*n.y+g.vz*n.z;
 if(dot<0){
  // Damp tangent motion and reflect the inward component, preserving the timed fuse.
  g.vx=(g.vx-dot*n.x)*.72-dot*n.x*.34;
  g.vy=(g.vy-dot*n.y)*.72-dot*n.y*.34;
  g.vz=(g.vz-dot*n.z)*.72-dot*n.z*.34;
 }
 const left=Math.max(0,dt*(1-hit.t));
 g.pos.x=hit.point.x+n.x*.002+g.vx*left;
 g.pos.y=hit.point.y+n.y*.002+g.vy*left;
 g.pos.z=hit.point.z+n.z*.002+g.vz*left;
 return {...hit,speed:Math.max(0,-dot)};
}
