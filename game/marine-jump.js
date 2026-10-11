// GP-172: one deliberate jump, a short loaded push-off and time to absorb landing.
export const JUMP_FEEL=Object.freeze({prepare:.09,buffer:.15,recovery:.28,minRise:.08,landing:.42});
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{const u=clamp(v);return u*u*(3-2*u);};
export function createJumpState(){return {buffer:0,prepare:0,recover:0,air:0,landAge:99,landDuration:JUMP_FEEL.landing,strength:0,launches:0};}
export function resetJump(s){Object.assign(s,createJumpState());}
export function stepJump(s,dt,{pressed=false,grounded=true,canJump=false,enabled=true}={}){
 dt=Math.max(0,dt);s.recover=Math.max(0,s.recover-dt);s.landAge+=dt;s.air=grounded?0:s.air+dt;
 if(!enabled){s.buffer=s.prepare=0;return false;}
 if(pressed)s.buffer=JUMP_FEEL.buffer;
 if(s.prepare>0){
  if(!canJump){s.prepare=0;return false;}
  s.prepare=Math.max(0,s.prepare-dt);
  if(s.prepare===0){s.buffer=0;s.air=0;s.launches++;return true;}
 }else if(s.buffer>0&&canJump&&s.recover===0){s.prepare=JUMP_FEEL.prepare;s.buffer=0;}
 // A fresh press during the landing brace waits for planted feet. Air presses
 // retain the existing short buffer and coyote window instead of auto-hopping.
 if(s.recover===0)s.buffer=Math.max(0,s.buffer-dt);
 return false;
}
export function landJump(s,impact){
 const severity=clamp((impact-2)/8);
 s.prepare=0;s.air=0;s.recover=JUMP_FEEL.recovery+.1*severity;
 s.landAge=0;s.landDuration=JUMP_FEEL.landing+.08*severity;s.strength=.5+.5*severity;
}
export function jumpPose(s,vy,out={}){
 out.prepare=s.prepare>0?smooth(1-s.prepare/JUMP_FEEL.prepare):0;
 const u=s.landAge/s.landDuration,peak=.20;
 out.land=(u<peak?smooth(u/peak):1-smooth((u-peak)/(1-peak)))*(u<1?s.strength:0);
 const tuck=smooth(1-Math.abs(vy)/7.9);
 out.knee=.18+.52*tuck;out.thigh=-.015-.055*tuck;
 out.lean=.07+.055*tuck;out.head=-.025-.035*tuck;
 return out;
}
