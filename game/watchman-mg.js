// Watchman-specific aiming and motion. The tripod bearing stays fixed while its gun traverses.
export const WATCHMAN = Object.freeze({
  crewBack: 0.56, swing: Math.PI * 0.48, minRange: 2.4,
  minPitch: -0.35, maxPitch: 0.61, follow: 22, turnRate: 5,
  mountS: 0.6, carryS: 0.58, interval: 0.09, kickS: 0.12, drop: 0.16   // GB-156: mountS was 0.38 s, which raced his hands and feet onto the gun
});
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = v => { const u=clamp(v,0,1); return u*u*(3-2*u); };
export function createWatchman(baseYaw=0) {
  return {baseYaw,yaw:baseYaw,pitch:0,age:0,kick:0,limited:false};
}
export function stepWatchman(s, origin, target, dt) {
  dt=clamp(Number.isFinite(dt)?dt:0,0,0.05);
  s.age+=dt; s.kick=Math.max(0,s.kick-dt);
  const dx=target.x-origin.x,dz=target.z-origin.z,range=Math.hypot(dx,dz);
  // Pointing through the operator/tripod keeps the last bearing, avoiding a 180-degree flip.
  if(!Number.isFinite(range)||range<WATCHMAN.minRange)return s;
  const delta=wrap(Math.atan2(dx,dz)-s.baseYaw);
  s.limited=Math.abs(delta)>WATCHMAN.swing;
  const want=s.baseYaw+clamp(delta,-WATCHMAN.swing,WATCHMAN.swing);
  const follow=1-Math.exp(-WATCHMAN.follow*dt);
  s.yaw+=clamp(wrap(want-s.yaw)*follow,-WATCHMAN.turnRate*dt,WATCHMAN.turnRate*dt);
  const pitch=clamp(Math.atan2(target.y-origin.y,range),WATCHMAN.minPitch,WATCHMAN.maxPitch);
  s.pitch+=(pitch-s.pitch)*follow;
  return s;
}
export function watchmanPose(s, feedT=0, feedS=3.2, out={}) {
  out.weight=smooth(s.age/(s.mountS||WATCHMAN.mountS));
  out.kick=Math.pow(clamp(s.kick/WATCHMAN.kickS,0,1),2);
  out.drop=WATCHMAN.drop*out.weight;
  out.lean=0.14+out.kick*0.035;
  const reload=feedT>0?clamp(1-feedT/feedS,0,1):0;
  out.feed=feedT>0?Math.sin(Math.PI*reload):0;
  out.charge=feedT>0?smooth((reload-0.72)/0.1)*(1-smooth((reload-0.90)/0.1)):0;
  return out;
}
export function watchmanLeg(hipHeight, footY, footZ, out={}) {
  const a=0.27,b=0.25,dy=hipHeight-footY;
  const d=clamp(Math.hypot(dy,footZ),Math.abs(a-b)+0.001,a+b-0.001);
  out.knee=Math.acos(clamp((d*d-a*a-b*b)/(2*a*b),-1,1));
  out.thigh=Math.atan2(-footZ,dy)-Math.atan2(b*Math.sin(out.knee),a+b*Math.cos(out.knee));
  out.ankle=-out.thigh-out.knee;
  return out;
}
export function watchmanCarry(age, out={}) {
  out.weight=smooth(age/WATCHMAN.carryS);
  const u=out.weight;
  out.y=0.82+0.32*u; out.z=0.34-0.29*u;
  out.pitch=-0.82+0.56*u; out.roll=-0.13;
  out.support=1-smooth((age-WATCHMAN.carryS)/0.3);
  return out;
}
