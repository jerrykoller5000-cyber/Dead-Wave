// GP-19856: ground pace and a four-limbed Leaper pose. The existing leap owns motion/damage.
export const LEAPER_MOTION=Object.freeze({groundPace:.75,stride:2.05,landing:.26});
const states=new WeakMap(),clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{const u=clamp(x);return u*u*(3-2*u);};
let enabled=true;
export const setLeaperMotionEnabled=value=>{enabled=!!value;}; // same-scene QA
export const leaperGroundPace=(z,pace)=>z.typeKey==='leaper'?pace*LEAPER_MOTION.groundPace:pace;
function restore(s){
  if(!s?.saved)return;
  for(const part of s.pose)part.object.rotation.copy(part.rotation);
  s.hips.position.y=s.hipsY;s.saved=false;
}
export function tickLeaperMotion(z,dt){
  if(z.typeKey!=='leaper')return;
  const s=states.get(z);restore(s);
  if(s)s.land=Math.max(0,s.land-Math.max(0,dt));
}
export function leaperLanding(z){const s=states.get(z);if(s)s.land=LEAPER_MOTION.landing;}

// Solve an existing stretched limb without changing its scale or adding skin bones.
// Its distal hinge bends in the sagittal plane; rotate the complete bent chain onto the paw target.
export function leaperHinge(distance,A,B,sy,sz){
  const d=clamp(distance,Math.abs(A-B*sy)+.001,A+B*sy-.001);
  let lo=0,hi=2.8;
  for(let i=0;i<14;i++){
    const m=(lo+hi)/2,y=A+B*sy*Math.cos(m),z=B*sz*Math.sin(m);
    if(Math.hypot(y,z)>d)lo=m;else hi=m;
  }
  return (lo+hi)/2;
}
function paw(T,s,joint,hinge,end,parentInverse,x,y,z,bend){
  const target=s.target.set(x,y,z).applyMatrix4(parentInverse).sub(joint.position);
  const sy=joint.scale.y,sz=joint.scale.z,A=-hinge.position.y*sy;
  const angle=leaperHinge(target.length(),A,end,sy,sz)*bend;
  hinge.rotation.set(angle,0,0);
  s.chain.set(0,-A-end*sy*Math.cos(angle),-end*sz*Math.sin(angle)).normalize();
  joint.quaternion.setFromUnitVectors(s.chain,target.normalize());
}
export function applyLeaperMotion(T,z,dt,amount,distance){
  if(z.typeKey!=='leaper'||!z.alive)return;
  const u=z.mesh.userData,p=z.mesh.position;
  const interrupted=!enabled||z.farLod||z.crawling||z.hopping||z.sleeping||z.inWater||z.poiGuard&&!z.poiAwake||z.riseT>0||z.belowRiseT>0||z.knockT>0||z.getUpT>0||z.windowClimb||z.hitReact>0||z.hitPartT>0||z.partsLost?.legL||z.partsLost?.legR;
  if(interrupted||!u.hips||!u.torso){states.delete(z);return;}
  let s=states.get(z);
  if(!s){
    const objects=[u.hips,u.torso,u.head,u.armLG,u.armRG,u.legLG,u.legRG,u.armLG.userData.elbowG,u.armRG.userData.elbowG,u.legLG.userData.shinG,u.legRG.userData.shinG].filter(Boolean);
    s={x:p.x,z:p.z,yaw:z.mesh.rotation.y,phase:0,land:0,weight:0,bank:0,hips:u.hips,pose:objects.map(object=>({object,rotation:object.rotation.clone()})),target:new T.Vector3(),chain:new T.Vector3(),rear:new T.Matrix4(),front:new T.Matrix4()};states.set(z,s);
  }
  const air=z.leapT>0&&z.leapDur>0,travel=Math.hypot(p.x-s.x,p.z-s.z),yaw=z.mesh.rotation.y;
  const turn=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw));
  if(travel<2&&dt<.15&&!air)s.phase+=travel*2*Math.PI/LEAPER_MOTION.stride;
  s.bank+=(clamp(turn/Math.max(.001,dt)*.04,-.14,.14)-s.bank)*(1-Math.exp(-10*dt));
  s.weight+=((amount>.02&&travel>.0005?1:0)-s.weight)*(1-Math.exp(-12*dt));
  s.x=p.x;s.z=p.z;s.yaw=yaw;
  // Ordinary claw attacks retain their authored pose. A leap impact still gets its landing crouch.
  if(!air&&!s.land&&(z.attackWindup>0||z.swingT>0))return;
  for(const part of s.pose)part.rotation.copy(part.object.rotation);
  s.hipsY=u.hips.position.y;s.saved=true;
  const scale=Math.abs(u.legLG.userData.shinG.position.y)/.38,r=u.rest||{},phase=s.phase;
  const prepare=!air&&distance>5&&distance<14?smooth((.18-(z.leapCd??1))/.18):0;
  const land=smooth(s.land/LEAPER_MOTION.landing),weight=s.weight;
  const flight=air?clamp(1-z.leapT/z.leapDur):0,tuck=air?Math.sin(Math.PI*flight):0;
  const reach=air?smooth((flight-.55)/.35):0,push=air?1-smooth(flight/.18):prepare;
  u.hips.position.y=(u.baseHipsY||.62*scale)+(Math.cos(phase*2)*.025*weight*(air?0:1)-.11*push-.13*land)*scale;
  u.hips.rotation.set((r.hipsRX||.95)-.12*push+.16*land-.24*tuck,0,s.bank+Math.sin(phase)*.04*weight*(air?0:1));
  u.torso.rotation.set((r.torsoRX||.35)-.05*push-.22*tuck+.10*reach+.08*land,-Math.sin(phase)*.07*weight*(air?0:1),-s.bank*.5);
  if(u.head&&!z.partsLost?.head){u.head.rotation.x=-(u.hips.rotation.x+u.torso.rotation.x)+.18;u.head.rotation.z=-s.bank*.5;}
  u.hips.updateMatrix();u.torso.updateMatrix();
  s.rear.copy(u.hips.matrix).invert();s.front.multiplyMatrices(u.hips.matrix,u.torso.matrix).invert();
  for(let i=0;i<2;i++){
    const side=i?1:-1,q=phase+i*Math.PI,step=Math.sin(q),lift=Math.max(0,Math.cos(q));
    // Opposite forepaw/rear foot share a beat, with a short bent-limb return off the floor.
    const frontZ=air?.73-.27*tuck+.28*reach-.16*push:.72+.22*step*weight*(1-land)-.16*prepare+.25*land;
    const rearZ=air?-.15+.19*tuck-.18*reach+.13*push:-.22-.19*step*weight*(1-land)+.13*prepare-.10*land;
    const frontY=air?.12+.20*tuck:.075+.16*lift*weight*(1-prepare)*(1-land);
    const rearY=air?.12+.25*tuck:.065+.13*Math.max(0,-Math.cos(q))*weight*(1-prepare)*(1-land);
    const arm=i?u.armRG:u.armLG,leg=i?u.legRG:u.legLG;
    if(!z.partsLost?.[i?'armR':'armL'])paw(T,s,arm,arm.userData.elbowG,.59*scale,s.front,side*.34*scale,frontY*scale,frontZ*scale,-1);
    paw(T,s,leg,leg.userData.shinG,.412*scale,s.rear,side*.17*scale,rearY*scale,rearZ*scale,1);
  }
}
