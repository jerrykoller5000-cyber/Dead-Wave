// Player footprints for the medical bay in world/training-props.js and training-wear.js. Bullet solids
// remain owned by World. Anchor to the public bed centre, including the room offset.
// Keep these footprints in sync if that furniture's dimensions change.
export function createTrainingInfirmary(tg) {
  const {x,z}=tg.bed.centre, floor=tg.floorY;
  const box=(name,cx,cz,hx,hz,top)=>({name,minX:cx-hx,maxX:cx+hx,minZ:cz-hz,maxZ:cz+hz,minY:floor,maxY:floor+top});
  const blockers=[
    box('bed',x,z,1.24,.52,.91),
    box('cabinet',x+2.72,z-1.28,.89,.50,1.17),
    box('iv',x-1.42,z-.66,.055,.055,1.94),
    box('oxygen',x-1.49,z+.8,.16,.16,1.01),
    box('cot',x+3.25,z+1.25,.95,.38,.54)
  ];
  return createTrainingBlockers(blockers);
}

// Shared swept collision for the bay enclosure; furniture behavior stays identical.
export function createTrainingBlockers(blockers) {
  // AG-419: zero-allocation constrain + swept slab check (avoids per-radius box cloning and per-blocker tuple allocations).
  const n = blockers.length;
  const masks = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const ef = blockers[i].exitFaces;
    if (!ef) { masks[i] = 15; continue; }
    let m = 0;
    if (ef.includes('maxZ')) m |= 1;
    if (ef.includes('minZ')) m |= 2;
    if (ef.includes('minX')) m |= 4;
    if (ef.includes('maxX')) m |= 8;
    masks[i] = m;
  }
  return {constrain(p,previous=p,radius=.42) {
    const low=Math.min(p.y,previous.y),high=Math.max(p.y,previous.y)+1.7;
    let x=previous.x,z=previous.z,dx=p.x-x,dz=p.z-z;
    // A save/debug teleport or landing may start inside furniture. Eject to the
    // closest edge; ties prefer the clear bedside/front aisle over the back wall.
    for(let pass=0;pass<8;pass++) {
      let overlap=false;
      for(let i=0;i<n;i++) {
        const b=blockers[i];
        if(low>=b.maxY || high<=b.minY)continue;
        const minX=b.minX-radius,maxX=b.maxX+radius,minZ=b.minZ-radius,maxZ=b.maxZ+radius;
        if(x>minX && x<maxX && z>minZ && z<maxZ) {
          const mask=masks[i];
          let bestD=Infinity,bestAxis=-1,bestVal=0;
          if(mask&1){const d=maxZ-z;bestD=d;bestAxis=1;bestVal=maxZ;}
          if(mask&2){const d=z-minZ;if(bestAxis<0||d<=bestD-1e-8){bestD=d;bestAxis=1;bestVal=minZ;}}
          if(mask&4){const d=x-minX;if(bestAxis<0||d<=bestD-1e-8){bestD=d;bestAxis=0;bestVal=minX;}}
          if(mask&8){const d=maxX-x;if(bestAxis<0||d<=bestD-1e-8){bestD=d;bestAxis=0;bestVal=maxX;}}
          if(bestAxis===0)x=bestVal;else if(bestAxis===1)z=bestVal;
          overlap=true;
        }
      }
      if(!overlap)break;
    }
    // Swept, expanded rectangles stop fast rolls as well as ordinary walking.
    // Preserve the tangent displacement so walking into a bed slides along it.
    for(let pass=0;pass<5 && (Math.abs(dx)>1e-9 || Math.abs(dz)>1e-9);pass++) {
      let hasHit=false,firstT=Infinity,firstNx=0,firstNz=0;
      for(let i=0;i<n;i++) {
        const b=blockers[i];
        if(low>=b.maxY || high<=b.minY)continue;
        if(sweepBox(x,z,dx,dz,b.minX-radius,b.maxX+radius,b.minZ-radius,b.maxZ+radius) && (!hasHit || _hitT<firstT)) {
          hasHit=true;firstT=_hitT;firstNx=_hitNx;firstNz=_hitNz;
        }
      }
      if(!hasHit){x+=dx;z+=dz;dx=dz=0;break;}
      x+=dx*firstT;z+=dz*firstT;
      dx*=1-firstT;dz*=1-firstT;
      if(firstNx)dx=0;if(firstNz)dz=0;
    }
    const blockX=Math.abs(x-p.x)>1e-7,blockZ=Math.abs(z-p.z)>1e-7;
    return {x,z,moved:blockX||blockZ,blockX,blockZ};
  }};
}

let _hitT=0,_hitNx=0,_hitNz=0;
function sweepBox(x,z,dx,dz,minX,maxX,minZ,maxZ) {
  let enter=-Infinity,exit=Infinity,nx=0,nz=0;
  // A tangent on the boundary is free: don't snag the player on a corner.
  if(Math.abs(dx)<1e-9){if(x<=minX || x>=maxX)return false;}
  else {
    let a=(minX-x)/dx,c=(maxX-x)/dx;const normal=dx>0?-1:1;
    if(a>c){const tmp=a;a=c;c=tmp;}
    if(a>enter+1e-9){enter=a;nx=normal;nz=0;}
    else if(Math.abs(a-enter)<1e-9){nx=normal;}
    if(c<exit)exit=c;if(enter>exit)return false;
  }
  if(Math.abs(dz)<1e-9){if(z<=minZ || z>=maxZ)return false;}
  else {
    let a=(minZ-z)/dz,c=(maxZ-z)/dz;const normal=dz>0?-1:1;
    if(a>c){const tmp=a;a=c;c=tmp;}
    if(a>enter+1e-9){enter=a;nx=0;nz=normal;}
    else if(Math.abs(a-enter)<1e-9){nz=normal;}
    if(c<exit)exit=c;if(enter>exit)return false;
  }
  if(enter>=-1e-9 && enter<=1 && exit>0){_hitT=enter>0?enter:0;_hitNx=nx;_hitNz=nz;return true;}
  return false;
}
