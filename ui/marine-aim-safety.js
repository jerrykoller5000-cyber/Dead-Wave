// GP-170: a mouse ray through the marine can pick floor behind his hands/muzzle.
// Keep the raw pick for building/interaction, but give the hold and bullets one
// shared point in front of him until the cursor clears his personal space.
export const AIM_PERSONAL_SPACE = Object.freeze({facingRadius:.75, weaponRange:2.25, readyHeight:.95});
const smooth=u=>u*u*(3-2*u);
export function marineAimPoint(root,target,yaw,out,{self=false,crouch=false,scoped=false}={}) {
  const dx=target.x-root.x,dz=target.z-root.z,d=Math.hypot(dx,dz),S=AIM_PERSONAL_SPACE;
  if(scoped || (!self && d>=S.weaponRange)) {out.x=target.x;out.y=target.y;out.z=target.z;return out;}
  const holdFacing=self || d<S.facingRadius;
  const fx=holdFacing?Math.sin(yaw):dx/d,fz=holdFacing?Math.cos(yaw):dz/d;
  const u=holdFacing?0:Math.max(0,Math.min(1,(d-S.facingRadius)/(S.weaponRange-S.facingRadius)));
  const readyY=root.y+S.readyHeight*(crouch?.7:1);
  out.x=root.x+fx*S.weaponRange;out.z=root.z+fz*S.weaponRange;
  out.y=readyY+(target.y-readyY)*smooth(u);
  return out;
}
