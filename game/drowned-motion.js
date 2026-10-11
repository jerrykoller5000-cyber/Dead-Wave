// GP-19863: low planted shuffles and weighted pursuit turns on the existing rig.
import { shamblerLeg } from './shambler-motion.js';
import { drownedState } from './drowned-behavior.js';
export const DROWNED_MOTION=Object.freeze({turnRate:1.45,turnAccel:3.2,response:.36,minPace:.24,stride:1.6,stance:.55,lift:.035,drop:.13,reachCos:.5});
let turns=new WeakMap(),poses=new WeakMap(),enabled=true;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
const smooth=v=>{const u=clamp(v,0,1);return u*u*(3-2*u);};
const unavailable=z=>!z.alive||z.crawling||z.hopping||z.sleeping||z.poiGuard&&!z.poiAwake||z.riseT>0||z.belowRiseT>0||z.knockT>0||z.getUpT>0||z.windowClimb||z.abilityBusy;
export const setDrownedMotionEnabled=value=>{enabled=!!value;}; // private same-scene QA
export function restoreDrownedMotion(z){const s=poses.get(z);if(s?.saved){for(const [o,k,v] of s.saved)o[k]=v;s.saved=null;}}
export function resetDrownedMotion(z){
  if(z.typeKey!=='drowned')return;
  restoreDrownedMotion(z);poses.delete(z);turns.delete(z);
  for(const leg of [z.mesh.userData.legLG,z.mesh.userData.legRG])leg?.userData.shamblerAnkle?.rotation.set(0,0,0);
}
export function drownedMotionState(z){const t=turns.get(z),p=poses.get(z);return {yaw:t?.yaw,rate:t?.rate,phase:p?.phase,weight:p?.weight,hipYaw:p?.hipYaw};}
export function steerDrowned(z,dx,dz,dt){
  if(z.typeKey!=='drowned')return null;
  if(!enabled||unavailable(z)){turns.delete(z);return null;}
  if(!Number.isFinite(dx+dz+dt)||Math.hypot(dx,dz)<1e-6)return null;
  let s=turns.get(z);if(!s||Math.abs(angle(s.yaw-z.mesh.rotation.y))>.12){s={yaw:z.mesh.rotation.y,rate:0,side:0};turns.set(z,s);}
  // A claw or grab commits its existing facing; it must not track a player behind it.
  if(z.attackWindup>0||z.swingT>0||['wind','drag','recover'].includes(drownedState(z)?.phase)){
    s.yaw=z.mesh.rotation.y;s.rate=0;s.side=0;return {x:Math.sin(s.yaw),z:Math.cos(s.yaw),yaw:s.yaw,pace:1,rate:0};
  }
  const want=Math.atan2(dx,dz),elapsed=clamp(dt,0,.1),n=Math.max(1,Math.ceil(elapsed*120)),h=elapsed/n;
  for(let i=0;i<n;i++){
    let error=angle(want-s.yaw);
    if(Math.abs(error)>2.6&&s.side&&Math.sign(error)!==s.side)error+=s.side*Math.PI*2;
    if(Math.abs(error)<2.4)s.side=0;else s.side ||= Math.sign(error)||1;
    const wanted=clamp(error/DROWNED_MOTION.response,-DROWNED_MOTION.turnRate,DROWNED_MOTION.turnRate),old=s.rate;
    s.rate+=clamp(wanted-s.rate,-DROWNED_MOTION.turnAccel*h,DROWNED_MOTION.turnAccel*h);
    let step=(old+s.rate)*.5*h;
    if(Math.sign(step)===Math.sign(error)&&Math.abs(step)>Math.abs(error)){step=error;s.rate=0;}
    s.yaw=angle(s.yaw+step);
  }
  const alignment=Math.max(0,Math.cos(angle(want-s.yaw)));
  return {x:Math.sin(s.yaw),z:Math.cos(s.yaw),yaw:s.yaw,rate:s.rate,pace:DROWNED_MOTION.minPace+(1-DROWNED_MOTION.minPace)*alignment};
}
export function drownedCanReach(z,dx,dz){
  if(!enabled||z.typeKey!=='drowned'||z.crawling||z.hopping)return true;
  const d=Math.hypot(dx,dz);return d<1e-5||(Math.sin(z.mesh.rotation.y)*dx+Math.cos(z.mesh.rotation.y)*dz)/d>=DROWNED_MOTION.reachCos;
}
// Phase follows resolved travel, not intended speed, so a blocked body does not march.
export function applyDrownedMotion(z,dt){
  if(z.typeKey!=='drowned')return;
  const u=z.mesh.userData,p=z.mesh.position,yaw=z.mesh.rotation.y;
  const grab=drownedState(z)?.phase;
  if(!enabled||unavailable(z)||z.inWater||z.farLod||z.hitReact>0||z.hitPartT>0||z.attackWindup>0||z.swingT>0||grab&&grab!=='idle'||z.partsLost?.legL||z.partsLost?.legR||!u.hips||!u.torso){poses.delete(z);return;}
  let s=poses.get(z);if(!s||Math.hypot(p.x-s.x,p.z-s.z)>3||dt>.15){s={x:p.x,z:p.z,yaw,hipYaw:yaw,phase:0,weight:0,saved:null};poses.set(z,s);}
  const travel=Math.hypot(p.x-s.x,p.z-s.z),turn=angle(yaw-s.yaw),h=clamp(dt,0,.1);
  s.x=p.x;s.z=p.z;s.yaw=yaw;
  const active=travel>.0005||Math.abs(turn)>.0005;
  s.phase=(s.phase+travel*2*Math.PI/DROWNED_MOTION.stride+Math.abs(turn)*.45)%(2*Math.PI);
  s.weight+=((active?1:0)-s.weight)*(1-Math.exp(-7*h));
  s.hipYaw=angle(s.hipYaw+angle(yaw-s.hipYaw)*(1-Math.exp(-6*h)));
  const lag=clamp(angle(s.hipYaw-yaw),-.42,.42),w=s.weight,ph=s.phase,rest=u.rest||{};
  const scale=Math.abs(u.legLG?.userData.shinG?.position.y||.38)/.38;
  s.saved=[];const set=(o,k,v)=>{if(!o)return;s.saved.push([o,k,o[k]]);o[k]=v;};
  set(u.hips.position,'y',u.baseHipsY+(-DROWNED_MOTION.drop+.025*(1-Math.cos(ph*2)))*scale*w);
  set(u.hips.position,'x',Math.sin(ph)*.035*scale*w);
  set(u.hips.rotation,'y',(rest.hipsRY||0)+lag);
  set(u.hips.rotation,'z',(rest.hipsRZ||0)+Math.sin(ph)*.075*w);
  set(u.torso.rotation,'x',(rest.torsoRX||0)+(.15+.035*Math.cos(ph*2))*w);
  set(u.torso.rotation,'y',(rest.torsoRY||0)-lag+Math.sin(ph-.5)*.065*w);
  set(u.torso.rotation,'z',(rest.torsoRZ||0)-Math.sin(ph-.45)*.095*w);
  if(u.head&&!z.partsLost?.head){set(u.head.rotation,'x',(rest.headRX||0)+(.09+.025*Math.sin(ph*2-.7))*w);set(u.head.rotation,'z',(rest.headRZ||0)-Math.sin(ph-.8)*.055*w);}
  for(const [i,leg] of [u.legLG,u.legRG].entries()){
    const shin=leg?.userData.shinG,ankle=leg?.userData.shamblerAnkle;if(!shin||!ankle)continue;
    const cycle=((ph/(2*Math.PI)+i*.5)%1+1)%1,stance=cycle<DROWNED_MOTION.stance;
    const t=stance?cycle/DROWNED_MOTION.stance:(cycle-DROWNED_MOTION.stance)/(1-DROWNED_MOTION.stance);
    const reach=DROWNED_MOTION.stride*DROWNED_MOTION.stance*.5;
    const footZ=(stance?reach*(1-2*t):reach*(2*smooth(t)-1))*scale*w;
    const lift=stance?0:Math.sin(t*Math.PI)*DROWNED_MOTION.lift*scale*w;
    const ry=leg.userData.shamblerFootY+lift-u.hips.position.y-leg.position.y-Math.sin(u.hips.rotation.z)*leg.position.x;
    const pose=shamblerLeg(ry,footZ-.04*scale,.38*scale,.36*scale);
    set(leg.rotation,'x',pose.thigh);set(leg.rotation,'y',-lag*.25);
    set(shin.rotation,'x',pose.knee);
    set(ankle.rotation,'x',-(u.hips.rotation.x+pose.thigh+pose.knee)+(stance?0:Math.sin(t*Math.PI)*.10*w));
    set(ankle.rotation,'z',-u.hips.rotation.z);
    const arm=i?u.armRG:u.armLG;if(arm&&!z.partsLost?.[i?'armR':'armL']){set(arm.rotation,'x',arm.rotation.x+Math.sin(ph+i*Math.PI-.5)*.10*w);set(arm.rotation,'z',arm.rotation.z+(i?-1:1)*.035*w);}
  }
}
