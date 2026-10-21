// Rotate the whole shoulder-to-grip reach into the aim frame, not just the gun at the wrist.
// Cached maths only; the existing arm solver still owns the elbow bend and hand contact.
let state;
export function rotateDiveAimOffset(T,offset,bodyForward,aimDirection,weight,out){
 out.copy(offset);const w=Math.max(0,Math.min(1,weight));
 if(w<=0||bodyForward.lengthSq()<1e-10||aimDirection.lengthSq()<1e-10)return out;
 state ||= {from:new T.Vector3(),to:new T.Vector3(),turn:new T.Quaternion(),blend:new T.Quaternion()};
 state.from.copy(bodyForward).normalize();state.to.copy(aimDirection).normalize();
 state.turn.setFromUnitVectors(state.from,state.to);state.blend.identity().slerp(state.turn,w);
 return out.applyQuaternion(state.blend);
}

// A flat shooter's reach stays ahead of the carrier, above the belt. Rotating an
// unconstrained standing reach toward his feet used to put the grip in his pelvis.
export function clearDiveGrip(local,shoulder,weight,out,side=0,sideClear=false){
 const w=Math.max(0,Math.min(1,weight));out.copy(local);if(!w)return out;
 const x=side?side*Math.max(sideClear?.37:.13,Math.min(sideClear?.43:.37,side*local.x)):Math.max(-.30,Math.min(.30,local.x));
 const y=Math.max(.23,Math.min(.70,local.y)),z=Math.max(sideClear?-.16:.36,local.z);
 out.set(local.x+(x-local.x)*w,local.y+(y-local.y)*w,local.z+(z-local.z)*w);
 // Keep the hand within the articulated arm's reach without undoing clearance.
 const dx=out.x-shoulder.x,dy=out.y-shoulder.y,dz=out.z-shoulder.z,L=Math.hypot(dx,dy,dz);
 if(L>.54){const k=.54/L;out.set(shoulder.x+dx*k,shoulder.y+dy*k,shoulder.z+dz*k);}
 return out;
}

// The chest can turn toward the cursor, but a barrel cannot turn through the
// shooter's back while it catches up. Retain near-vertical shots toward the feet.
export function frontDiveDirection(local,out){
 out.copy(local);if(out.lengthSq()<1e-10)return out.set(0,0,1);
 out.normalize();if(out.z>=.06)return out;
 const L=Math.hypot(out.x,out.y);if(L<1e-8)return out.set(0,0,1);
 const k=Math.sqrt(1-.06*.06)/L;return out.set(out.x*k,out.y*k,.06);
}

// Compact airborne thrust/cut; the standing overhead chop crosses the helmet in
// a back dive. The palm stays beside the vest; only the strike extends outward.
export function diveBladePose(u,heavy=false){
 u=Math.max(0,Math.min(1,u));const s=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const cock=s(u/.18),strike=s((u-.18)/.24),recover=s((u-.55)/.45);
 const pulse=(cock*.08-strike*.08)*(1-recover),extension=strike*(1-recover);
 return {x:-.31-(heavy?.09:.035)*extension,y:.34+pulse+(heavy?.05:0)*Math.sin(Math.PI*u),z:.36+.12*extension,
  yaw:(heavy?.38:.18)*Math.sin(Math.PI*u*2),tilt:-.12+.20*extension,roll:(heavy?.26:.10)*Math.sin(Math.PI*u)};
}
