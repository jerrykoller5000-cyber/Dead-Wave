// GP-19877: slow floating protected pursuit, anxious exposed retreat; one shield clock.
import {shamblerLeg} from './shambler-motion.js';
export const SCREAMER=Object.freeze({damageShare:.25,openSeconds:2.4,turnRate:2,turnAccel:4.8,stride:1.4,exposedTurnRate:3.8,exposedTurnAccel:9,retreatGap:8,protectedPace:.40});
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
export function screamerState(z){const p=poses.get(z),s=turns.get(z);return {open:z.sonicOpenT||0,shield:screamerProtected(z),phase:p?.phase,weight:p?.weight,exposure:p?.exposure,hover:p?.hover,rate:s?.rate,mode:s?.mode,evadeSide:s?.evadeSide};}
export function steerScreamer(z,dx,dz,dt,threat=null){
 if(z.typeKey!=='screamer'||unavailable(z)){if(z.typeKey==='screamer')turns.delete(z);return null;}
 if(!Number.isFinite(dx+dz+dt)||Math.hypot(dx,dz)<1e-6)return null;
 let s=turns.get(z);if(!s||Math.abs(angle(s.yaw-z.mesh.rotation.y))>.12){s={yaw:z.mesh.rotation.y,rate:0,side:0,clock:0,evadeSide:Math.sin((z.bob||0)*17)>=0?1:-1,evadeT:0,mode:'pursue'};turns.set(z,s);}
 const h0=clamp(dt,0,.1);s.clock+=h0;
 if(z.screamT>0||z.attackWindup>0||z.swingT>0){s.yaw=z.mesh.rotation.y;s.rate=0;s.mode='committed';return {x:Math.sin(s.yaw),z:Math.cos(s.yaw),yaw:s.yaw,pace:screamerProtected(z)?SCREAMER.protectedPace:1};}
 const evading=z.sonicOpenT>0&&!z.partsLost?.head&&!z.partsLost?.legL&&!z.partsLost?.legR&&!z.inWater&&threat?.allow&&Number.isFinite(threat.dx+threat.dz);
 s.mode=evading?'retreat':'pursue';
 const want=Math.atan2(evading?threat.dx:dx,evading?threat.dz:dz),n=Math.max(1,Math.ceil(h0*120)),h=h0/n;
 const maxRate=evading?SCREAMER.exposedTurnRate:SCREAMER.turnRate,accel=evading?SCREAMER.exposedTurnAccel:SCREAMER.turnAccel;
 for(let i=0;i<n;i++){let error=angle(want-s.yaw);if(Math.abs(error)>2.6&&s.side&&Math.sign(error)!==s.side)error+=s.side*Math.PI*2;
  if(Math.abs(error)<2.4)s.side=0;else s.side||=Math.sign(error)||1;
  const rate=clamp(error/(evading?.2:.36),-maxRate,maxRate),old=s.rate;
  s.rate+=clamp(rate-s.rate,-accel*h,accel*h);let step=(old+s.rate)*.5*h;
  if(Math.sign(step)===Math.sign(error)&&Math.abs(step)>Math.abs(error)){step=error;s.rate=0;}s.yaw=angle(s.yaw+step);}
 if(evading){
  const d=Math.hypot(threat.dx,threat.dz);if(d>SCREAMER.retreatGap+1.5){return {x:0,z:0,yaw:s.yaw,rate:s.rate,pace:0,evading:true};}
  const nx=d>1e-6?threat.dx/d:Math.sin(s.yaw),nz=d>1e-6?threat.dz/d:Math.cos(s.yaw);
  s.evadeT-=h0;if(s.evadeT<=0){s.evadeSide*=-1;s.evadeT=.40+.12*(.5+.5*Math.sin(s.clock*2.3));}
  const back=clamp((SCREAMER.retreatGap-d)/1.2,0,1),side=s.evadeSide;
  let x=0,zz=0,found=false;
  for(const lateral of [.55*side,-.55*side,0,1.4*side,-1.4*side,3*side,-3*side]){
   const ax=-nx*back-nz*lateral,az=-nz*back+nx*lateral,len=Math.hypot(ax,az);if(len<1e-6)continue;
   const cx=ax/len,cz=az/len;if(!threat.safe||threat.safe(cx,cz)){x=cx;zz=cz;found=true;break;}}
  const pace=found?(back>.05?.78+.22*(.5+.5*Math.sin(s.clock*13)):.30):0;
  return {x,z:zz,yaw:s.yaw,rate:s.rate,pace,evading:true};
 }
 s.evadeT=0;
 return {x:Math.sin(s.yaw),z:Math.cos(s.yaw),yaw:s.yaw,rate:s.rate,pace:(screamerProtected(z)?SCREAMER.protectedPace:1)*(.32+.68*Math.max(0,Math.cos(angle(want-s.yaw))))};
}
export function screamerScreamPose(remaining,open=0){
 const t=clamp(1-remaining/1.2,0,1),load=Math.sin(Math.min(1,t/.28)*Math.PI*.5),release=remaining>0?load:0,spent=clamp(open/SCREAMER.openSeconds,0,1);
 return {arch:-.3*release+.2*spent,head:-.5*release+.25*spent,jaw:.32*release-.08*spent,arms:release,spent};
}
export function applyScreamerPose(z,dt){
 if(z.typeKey!=='screamer')return;const u=z.mesh.userData,p=z.mesh.position,yaw=z.mesh.rotation.y;
 if(unavailable(z)||z.inWater||z.farLod||z.hitReact>0||z.hitPartT>0||z.attackWindup>0||z.swingT>0||z.partsLost?.legL||z.partsLost?.legR||z.partsLost?.head||!u.hips||!u.torso){poses.delete(z);return;}
 let s=poses.get(z);if(!s||Math.hypot(p.x-s.x,p.z-s.z)>3||dt>.15){s={x:p.x,z:p.z,yaw,hipYaw:yaw,phase:0,clock:(z.bob||0)%6,weight:0,exposure:0,hover:0,saved:null};poses.set(z,s);}
 const dx=p.x-s.x,dz=p.z-s.z,travel=Math.hypot(dx,dz),turn=angle(yaw-s.yaw),h=clamp(dt,0,.1),rest=u.rest||{},v=screamerScreamPose(z.screamT||0,z.sonicOpenT||0),sing=z.screamT>0;
 const exposed=z.sonicOpenT>0&&!z.partsLost?.head;
 s.exposure+=(Number(exposed)-s.exposure)*(1-Math.exp(-12*h));s.clock+=h;
 s.x=p.x;s.z=p.z;s.yaw=yaw;s.phase=(s.phase+travel*Math.PI*2/(1.8-.65*s.exposure)+Math.abs(turn)*.35)%(Math.PI*2);
 s.weight+=((travel>.0005||Math.abs(turn)>.0005?1:0)-s.weight)*(1-Math.exp(-8*h));s.hipYaw=angle(s.hipYaw+angle(yaw-s.hipYaw)*(1-Math.exp(-(4+5*s.exposure)*h)));
 const lag=clamp(angle(s.hipYaw-yaw),-.48,.48),w=s.weight,ph=s.phase,scale=z.scale||1,e=s.exposure;
 const glide=z.partsLost?.head?0:1-e,flow=s.clock*1.4,wave=Math.sin(flow),breath=(.5+.5*Math.sin(s.clock*2.1-.8))*glide,twitch=(Math.sin(s.clock*13)+.35*Math.sin(s.clock*21))*.5*e;
 s.hover=(.16+.065*wave)*glide;s.saved=[];
 const set=(o,k,v)=>{if(!o)return;s.saved.push([o,k,o[k]]);o[k]=v;};
 set(u.hips.position,'y',u.baseHipsY+(s.hover+(.025*(1-Math.cos(ph*2))*w-.045)*e)*scale);
 set(u.hips.position,'x',(.04*Math.sin(flow)*glide+.065*Math.sin(ph)*e*w)*scale);
 set(u.hips.rotation,'y',(rest.hipsRY||0)+lag);set(u.hips.rotation,'z',(rest.hipsRZ||0)+.04*Math.sin(flow)*glide+.085*Math.sin(ph)*e*w);
 // GP-19890: breathing stays visible while hovering or waiting, and restores before reactions.
 if(u.torso.scale){set(u.torso.scale,'x',u.torso.scale.x*(1+.018*breath));set(u.torso.scale,'y',u.torso.scale.y*(1+.028*breath));set(u.torso.scale,'z',u.torso.scale.z*(1+.055*breath));}
 set(u.torso.position,'y',u.torso.position.y+.012*scale*breath);
 set(u.torso.rotation,'x',(rest.torsoRX||0)-.055*glide-.025*breath+.19*e*w+v.arch*(sing?1:.4));
 set(u.torso.rotation,'y',(rest.torsoRY||0)-lag*.8+.065*Math.sin(flow-.6)*glide+.12*twitch);
 set(u.torso.rotation,'z',(rest.torsoRZ||0)-.035*Math.sin(flow-.6)*glide-.085*Math.sin(ph-.5)*e*w);
 if(!z.partsLost?.head){set(u.head.rotation,'x',(rest.headRX||0)+v.head*(sing?1:.45)+.035*Math.sin(flow-1)*glide+.11*twitch);
  set(u.head.rotation,'z',(rest.headRZ||0)-.03*Math.sin(flow-1)*glide+.09*twitch);
  set(u.screamerJaw?.rotation,'x',v.jaw+.055*e*(.5+.5*Math.sin(s.clock*11)));
  set(u.screamerTongue?.rotation,'x',Math.sin(flow-.7)*.08*glide+.12*twitch+.15*v.arms);set(u.screamerTongue?.rotation,'z',Math.sin(flow-1)*.13*glide+.16*twitch);}
 const direction=travel>.0005?clamp((dx*Math.sin(yaw)+dz*Math.cos(yaw))/travel,-1,1):1;
 for(const [i,leg]of [u.legLG,u.legRG].entries()){
  const shin=leg?.userData.shinG,ankle=leg?.userData.shamblerAnkle;if(!shin||!ankle)continue;
  const cycle=((ph/(Math.PI*2)+i*.5)%1+1)%1,stance=cycle<.60,t=stance?cycle/.60:(cycle-.60)/.40,smooth=t*t*(3-2*t),reach=1.15*.60*.5;
  const footZ=((stance?reach*(1-2*t):reach*(2*smooth-1))*e*direction*w+(-.10+.14*Math.sin(flow+i*Math.PI-1))*glide)*scale;
  const lift=(stance?0:Math.sin(t*Math.PI)*.12*w)*e+(.15+.075*Math.sin(flow+i*Math.PI-.5))*glide;
  const ry=leg.userData.shamblerFootY+lift*scale-u.hips.position.y-leg.position.y-Math.sin(u.hips.rotation.z)*leg.position.x;
  const legPose=shamblerLeg(ry,footZ,.38*scale,.36*scale);set(leg.rotation,'x',legPose.thigh);set(leg.rotation,'y',-lag*.3);set(shin.rotation,'x',legPose.knee);set(ankle.rotation,'x',-(u.hips.rotation.x+legPose.thigh+legPose.knee));set(ankle.rotation,'z',-u.hips.rotation.z);
  const arm=i?u.armRG:u.armLG,side=i?-1:1;if(!arm||z.partsLost?.[i?'armR':'armL'])continue;
  const ribbon=Math.sin(flow+i*.9-1),flail=Math.sin(ph+i*Math.PI-.3)*w;
  set(arm.rotation,'x',(-.30+.24*ribbon)*glide+(-.70+.32*flail+.18*twitch)*e-.65*v.arms);
  set(arm.rotation,'z',side*(-(.56+.20*Math.sin(flow+i*.8))*glide+(.34+.16*flail)*e+.38*v.arms));set(arm.rotation,'y',-side*(.12+.18*glide*Math.sin(flow+i*.8)+.12*e+.15*v.arms));
  set(arm.userData.elbowG?.rotation,'x',(-.48+.20*Math.sin(flow+i*.9-1.7))*glide+(-.85+.24*Math.sin(ph+i*Math.PI-.8))*e-.35*v.arms);
  set(arm.userData.elbowG?.rotation,'z',side*(.18*Math.sin(flow+i*.8-2)*glide+.20*twitch));
 }
}
