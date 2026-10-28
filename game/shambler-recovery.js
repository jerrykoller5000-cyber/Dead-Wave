// GP-19853: a committed player melee lunge that whiffs earns a brief recovery.
import { shamblerLeg } from './shambler-motion.js';
export const SHAMBLER_RECOVERY=Object.freeze({duration:1.25,stumble:.36});
const states=new WeakMap(),clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const u=clamp(x);return u*u*(3-2*u);};
const interrupted=z=>!z.alive||z.crawling||z.hopping||z.sleeping||z.riseT>0||z.belowRiseT>0||z.knockT>0||z.getUpT>0||z.windowClimb||z.abilityBusy||z.hitReact>0||z.hitPartT>0||z.partsLost?.legL||z.partsLost?.legR;
export function shamblerLungeResult(z,landed){
  if(z.typeKey!=='shambler'||landed||interrupted(z))return false;
  const yaw=z.mesh.rotation.y;
  states.set(z,{waiting:true,t:0,side:z.swingSide===-1?-1:1,x:Math.sin(yaw),z:Math.cos(yaw),yaw,
    target:z._tp?.position||null,stepDt:0,walkPhase:0,pace:0,turnWeight:0,restore:null});
  return true;
}
function restorePose(s){
  if(!s?.restore)return;
  for(const [o,key,value] of s.restore)o[key]=value;
  s.restore=null;
}
export function tickShamblerRecovery(z,dt){
  if(z.typeKey!=='shambler')return false;
  const s=states.get(z);restorePose(s);z.shamblerRecoveryActive=false;
  if(!s)return false;
  if(interrupted(z)){states.delete(z);return false;}
  if(s.waiting){if(z.attackWindup>0||z.swingT>0)return false;s.waiting=false;}
  s.stepDt=Math.max(0,Math.min(.1,dt));s.t+=s.stepDt;
  if(s.t>=SHAMBLER_RECOVERY.duration){states.delete(z);return false;}
  z.shamblerRecoveryActive=true;
  const left=SHAMBLER_RECOVERY.duration-s.t;
  z.attackCd=Math.max(z.attackCd||0,left+.15);
  z.hzLungeT=0;z.hzLungeCd=Math.max(z.hzLungeCd||0,left+.25);
  return true;
}
export function shamblerRecoveryStep(z){
  const s=states.get(z);if(!s||s.waiting)return null;
  if(s.t<SHAMBLER_RECOVERY.stumble){s.turnWeight=0;s.pace=.24*(1-clamp(s.t/SHAMBLER_RECOVERY.stumble));return {x:s.x,z:s.z,pace:s.pace};}
  // The page's nearest-player cache is refreshed before this step. Keep the
  // struck-at player as a fallback if a caller has no live target this frame.
  const target=z._tp?.position||s.target,p=z.mesh.position;
  if(!target){s.turnWeight=0;s.pace=0;return {x:s.x,z:s.z,pace:0};}
  const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);
  if(d<1e-5){s.turnWeight=0;s.pace=0;return {x:Math.sin(s.yaw),z:Math.cos(s.yaw),pace:0};}
  const want=Math.atan2(dx,dz),error=Math.atan2(Math.sin(want-s.yaw),Math.cos(want-s.yaw));
  const turn=Math.max(-2.3*s.stepDt,Math.min(2.3*s.stepDt,error));
  s.yaw+=turn;
  s.turnWeight=clamp(Math.abs(turn)/Math.max(2.3*s.stepDt,1e-5));
  const alignment=Math.cos(Math.atan2(Math.sin(want-s.yaw),Math.cos(want-s.yaw)));
  // Turn on the spot while he is behind it; the ordinary contact ring handles
  // the approach once the body faces him again. Only the next swing stays late.
  s.pace=alignment>.3?smooth((s.t-SHAMBLER_RECOVERY.stumble)/.18)*(.35+.65*alignment):0;
  s.walkPhase+=(s.pace*(z.speed||1.4)*8+s.turnWeight*7)*s.stepDt;
  return {x:Math.sin(s.yaw),z:Math.cos(s.yaw),pace:s.pace};
}
export function shamblerRecoveryState(z){
  const s=states.get(z);return s?{waiting:s.waiting,t:s.t,side:s.side,active:!!z.shamblerRecoveryActive}:null;
}
export function applyShamblerRecovery(z){
  const s=states.get(z);if(!s||s.waiting||!z.shamblerRecoveryActive||z.farLod)return;
  const u=z.mesh.userData,r=u.rest||{},parts=z.partsLost||{},hips=u.hips,torso=u.torso;
  if(!hips||!torso||!u.legLG||!u.legRG)return;
  const t=s.t,side=s.side,end=SHAMBLER_RECOVERY.duration;
  const target=z._tp?.position||s.target,gap=target?Math.hypot(target.x-z.mesh.position.x,target.z-z.mesh.position.z):Infinity;
  const armClearance=smooth((gap-1.03)/.32);
  const closeGuard=(1-armClearance)*(1-smooth((t-1.19)/.06));
  const stumble=Math.sin(Math.PI*clamp(t/SHAMBLER_RECOVERY.stumble));
  const angry=smooth((t-.22)/.16)*(1-smooth((t-.98)/(end-.98)));
  const shake=Math.sin((t-.22)*Math.PI*2*5.2)*angry;
  const weight=smooth(t/.09)*(1-smooth((t-1.02)/.23));
  // Restore axes that ordinary Shambler poses do not write on the next frame.
  s.restore=[[hips.position,'x',hips.position.x]];
  hips.position.x=side*.025*stumble;
  hips.position.y=u.baseHipsY-.045*stumble;
  hips.position.z=.11*stumble;
  hips.rotation.z=(r.hipsRZ||0)+side*.09*stumble;
  torso.rotation.x+=(.30*stumble+.08*angry)*weight;
  torso.rotation.z+=side*.12*stumble;
  if(u.head&&!parts.head){s.restore.push([u.head.rotation,'y',u.head.rotation.y]);u.head.rotation.y+=shake*.44;u.head.rotation.x+=.13*stumble+Math.sin(t*23)*.035*angry;}
  for(const [i,sign] of [-1,1].entries()){
    const arm=i?u.armRG:u.armLG,lost=i?parts.armR:parts.armL;
    if(arm&&!lost){
      const beat=t*17+i*1.8;
      arm.rotation.x+=(-.5*stumble+(-.48+Math.sin(beat)*.40)*armClearance*angry)*weight+.50*closeGuard;
      arm.rotation.z+=sign*((.30*stumble+(.58+Math.sin(beat+1.2)*.20)*angry)*weight+.60*closeGuard);
      s.restore.push([arm.rotation,'y',arm.rotation.y]);arm.rotation.y+=sign*Math.sin(beat)*.18*angry;
      const elbow=arm.userData.elbowG;if(elbow)elbow.rotation.x-=.32*stumble+(.40+.23*Math.sin(beat+.5))*angry*armClearance;
    }
    const leg=i?u.legRG:u.legLG,shin=leg.userData.shinG,ankle=leg.userData.shamblerAnkle;if(!shin||!ankle)continue;
    const scale=Math.abs(shin.position.y)/.38;
    const step=clamp((t-i*.16)/.19),walk=t>=SHAMBLER_RECOVERY.stumble?Math.max(smooth((t-SHAMBLER_RECOVERY.stumble)/.18)*s.pace,.62*s.turnWeight*smooth((t-SHAMBLER_RECOVERY.stumble)/.08)):0;
    const stride=Math.sin(s.walkPhase+i*Math.PI),lift=t<.36?Math.sin(Math.PI*step)*.065*scale:Math.max(0,stride)*.095*scale*walk;
    const ry=leg.userData.shamblerFootY+lift-hips.position.y-leg.position.y;
    const rz=-.04*scale-hips.position.z+(t<.36?Math.sin(Math.PI*step)*.13:stride*.18*walk)*scale;
    const p=shamblerLeg(ry,rz,.38*scale,.36*scale);
    leg.rotation.x=p.thigh;shin.rotation.x=p.knee;
    ankle.rotation.x=-(hips.rotation.x+p.thigh+p.knee);ankle.rotation.z=-hips.rotation.z;
  }
}
