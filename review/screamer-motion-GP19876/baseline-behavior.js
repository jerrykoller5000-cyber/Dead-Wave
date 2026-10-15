// GP-19872: a committed wraith turn and a readable post-scream vulnerability window.
import {shamblerLeg} from '/game/shambler-motion.js';
export const SCREAMER=Object.freeze({damageShare:.03,openSeconds:2.4,turnRate:2.25,turnAccel:5.5,stride:1.4});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
const poses=new WeakMap(),turns=new WeakMap();
const unavailable=z=>!z.alive||z.crawling||z.hopping||z.sleeping||z.poiGuard&&!z.poiAwake||z.riseT>0||z.belowRiseT>0||z.knockT>0||z.getUpT>0||z.windowClimb||z.abilityBusy;
export function screamerProtected(z){return z.typeKey==='screamer'&&z.alive!==false&&!z.partsLost?.head&&!(z.sonicOpenT>0);}
export function tickScreamerShield(z,dt){
 if(z.typeKey!=='screamer')return;
 if(!z.alive||z.partsLost?.head){z.sonicOpenT=0;z._sonicScreaming=false;z.screamT=0;return;}
 const singing=z.screamT>0;
 if(z._sonicScreaming&&!singing)z.sonicOpenT=SCREAMER.openSeconds;
 else z.sonicOpenT=Math.max(0,(z.sonicOpenT||0)-clamp(dt,0,.1));
 z._sonicScreaming=singing;z.sonicHitT=Math.max(0,(z.sonicHitT||0)-dt);
}
export function restoreScreamerPose(z){const s=poses.get(z);if(s?.saved){for(const [o,k,v]of s.saved)o[k]=v;s.saved=null;}}
export function resetScreamer(z){if(z.typeKey!=='screamer')return;restoreScreamerPose(z);poses.delete(z);turns.delete(z);delete z.sonicOpenT;delete z._sonicScreaming;delete z.sonicHitT;
 for(const l of [z.mesh.userData.legLG,z.mesh.userData.legRG])l?.userData.shamblerAnkle?.rotation.set(0,0,0);
 z.mesh.userData.screamerFx?.hide();}
export function screamerState(z){return {open:z.sonicOpenT||0,shield:screamerProtected(z),phase:poses.get(z)?.phase,weight:poses.get(z)?.weight,rate:turns.get(z)?.rate};}
export function steerScreamer(z,dx,dz,dt){
 if(z.typeKey!=='screamer'||unavailable(z)){if(z.typeKey==='screamer')turns.delete(z);return null;}
 if(!Number.isFinite(dx+dz+dt)||Math.hypot(dx,dz)<1e-6)return null;
 let s=turns.get(z);if(!s||Math.abs(angle(s.yaw-z.mesh.rotation.y))>.12){s={yaw:z.mesh.rotation.y,rate:0,side:0};turns.set(z,s);}
 if(z.screamT>0||z.attackWindup>0||z.swingT>0){s.yaw=z.mesh.rotation.y;s.rate=0;return {x:Math.sin(s.yaw),z:Math.cos(s.yaw),yaw:s.yaw,pace:1};}
 const want=Math.atan2(dx,dz),h0=clamp(dt,0,.1),n=Math.max(1,Math.ceil(h0*120)),h=h0/n;
 for(let i=0;i<n;i++){let error=angle(want-s.yaw);if(Math.abs(error)>2.6&&s.side&&Math.sign(error)!==s.side)error+=s.side*Math.PI*2;
  if(Math.abs(error)<2.4)s.side=0;else s.side||=Math.sign(error)||1;
  const rate=clamp(error/.3,-SCREAMER.turnRate,SCREAMER.turnRate),old=s.rate;
  s.rate+=clamp(rate-s.rate,-SCREAMER.turnAccel*h,SCREAMER.turnAccel*h);let step=(old+s.rate)*.5*h;
  if(Math.sign(step)===Math.sign(error)&&Math.abs(step)>Math.abs(error)){step=error;s.rate=0;}s.yaw=angle(s.yaw+step);}
 return {x:Math.sin(s.yaw),z:Math.cos(s.yaw),yaw:s.yaw,rate:s.rate,pace:.32+.68*Math.max(0,Math.cos(angle(want-s.yaw)))};
}
export function screamerScreamPose(remaining,open=0){
 const t=clamp(1-remaining/1.2,0,1),load=Math.sin(Math.min(1,t/.28)*Math.PI*.5),release=remaining>0?load:0,spent=clamp(open/SCREAMER.openSeconds,0,1);
 return {arch:-.3*release+.2*spent,head:-.5*release+.25*spent,jaw:.32*release-.08*spent,arms:release,spent};
}
export function applyScreamerPose(z,dt){
 if(z.typeKey!=='screamer')return;const u=z.mesh.userData,p=z.mesh.position,yaw=z.mesh.rotation.y;
 if(unavailable(z)||z.inWater||z.farLod||z.hitReact>0||z.hitPartT>0||z.attackWindup>0||z.swingT>0||z.partsLost?.legL||z.partsLost?.legR){poses.delete(z);return;}
 let s=poses.get(z);if(!s||Math.hypot(p.x-s.x,p.z-s.z)>3||dt>.15){s={x:p.x,z:p.z,yaw,hipYaw:yaw,phase:0,weight:0,saved:null};poses.set(z,s);}
 const travel=Math.hypot(p.x-s.x,p.z-s.z),turn=angle(yaw-s.yaw),h=clamp(dt,0,.1),rest=u.rest||{},v=screamerScreamPose(z.screamT||0,z.sonicOpenT||0),sing=z.screamT>0;
 s.x=p.x;s.z=p.z;s.yaw=yaw;s.phase=(s.phase+travel*Math.PI*2/SCREAMER.stride+Math.abs(turn)*.45)%(Math.PI*2);
 s.weight+=((travel>.0005||Math.abs(turn)>.0005?1:0)-s.weight)*(1-Math.exp(-8*h));s.hipYaw=angle(s.hipYaw+angle(yaw-s.hipYaw)*(1-Math.exp(-6*h)));
 const lag=clamp(angle(s.hipYaw-yaw),-.42,.42),w=s.weight,ph=s.phase,scale=z.scale||1;s.saved=[];
 const set=(o,k,v)=>{if(!o)return;s.saved.push([o,k,o[k]]);o[k]=v;};
 set(u.hips.position,'y',u.baseHipsY+(.025*(1-Math.cos(ph*2))*w-.025*v.spent)*scale);
 set(u.hips.position,'x',Math.sin(ph)*.055*scale*w);set(u.hips.rotation,'y',(rest.hipsRY||0)+lag);set(u.hips.rotation,'z',(rest.hipsRZ||0)+Math.sin(ph)*.07*w);
 set(u.torso.rotation,'x',(rest.torsoRX||0)+.07*w+v.arch);set(u.torso.rotation,'y',-lag*.8+Math.sin(ph-.5)*.1*w);set(u.torso.rotation,'z',-Math.sin(ph-.5)*.065*w);
 if(!z.partsLost?.head){set(u.head.rotation,'x',(rest.headRX||0)+v.head+.07*Math.sin(ph-.8)*w);set(u.head.rotation,'z',-.065*Math.sin(ph-.8)*w);
  set(u.screamerJaw?.rotation,'x',v.jaw);set(u.screamerTongue?.rotation,'x',Math.sin(ph*.7)*.10*w+.15*v.arms);set(u.screamerTongue?.rotation,'z',Math.sin(ph-1)*.18*w);}
 for(const [i,leg]of [u.legLG,u.legRG].entries()){
  const shin=leg?.userData.shinG,ankle=leg?.userData.shamblerAnkle;if(!shin||!ankle)continue;
  const cycle=((ph/(Math.PI*2)+i*.5)%1+1)%1,stance=cycle<.58,t=stance?cycle/.58:(cycle-.58)/.42,smooth=t*t*(3-2*t),reach=SCREAMER.stride*.58*.5;
  const footZ=(stance?reach*(1-2*t):reach*(2*smooth-1))*scale*w,lift=stance?0:Math.sin(t*Math.PI)*.10*scale*w;
  const ry=leg.userData.shamblerFootY+lift-u.hips.position.y-leg.position.y-Math.sin(u.hips.rotation.z)*leg.position.x;
  const legPose=shamblerLeg(ry,footZ,.38*scale,.36*scale);set(leg.rotation,'x',legPose.thigh);set(leg.rotation,'y',-lag*.3);set(shin.rotation,'x',legPose.knee);set(ankle.rotation,'x',-(u.hips.rotation.x+legPose.thigh+legPose.knee));set(ankle.rotation,'z',-u.hips.rotation.z);
  const arm=i?u.armRG:u.armLG,side=i?-1:1;if(!arm||z.partsLost?.[i?'armR':'armL'])continue;
  set(arm.rotation,'x',-.5+Math.sin(ph+i*Math.PI-.4)*.23*w-.65*v.arms+.18*v.spent);
  set(arm.rotation,'z',side*(.4+.1*Math.sin(ph+i*Math.PI)*w+.38*v.arms));set(arm.rotation,'y',-side*(.15+.15*v.arms));
  set(arm.userData.elbowG?.rotation,'x',-.5+.12*Math.sin(ph+i*Math.PI-.8)*w-.35*v.arms);
 }
}
