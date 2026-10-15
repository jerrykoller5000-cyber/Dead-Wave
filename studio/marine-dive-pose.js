import {DIVE,smooth} from './marine-dive.js';
const mix=(a,b,t)=>a+(b-a)*t;
// Articulated motion layered under the existing aim/hand solver. No fire/timing rules here.
export function divePose(d,vy=0){
 const f=d.phase==='air'?smooth(d.t/DIVE.tip):d.phase==='idle'?0:1;
 const air=d.phase==='air',down=d.phase==='down',up=d.phase==='up',u=up?Math.min(1,d.t/(d.pads?DIVE.getUpPads:DIVE.getUp)):0;
 const launch=smooth(d.t/.12),fall=air?smooth(-vy/3.5):0,breath=Math.sin(d.real*4.8),flutter=Math.sin(d.airT*11),impact=down?Math.exp(-d.t*18):0;
 // Push from the floor, gather the trailing knee, plant a boot, then extend into standing.
 const plant=up?smooth(u/.42):0,rise=up?smooth((u-.24)/.76):0,finish=up?smooth((u-.74)/.26):0;
 const w=up?1-finish:f,brace=up?Math.sin(Math.PI*u)**2:down?impact*.3:0;
 const out={weight:w,up:u,plant,rise,brace,
  legL:air?(-.1-.16*flutter-.17*fall)*f:up?mix(-.12,-1.02,plant)*(1-finish):-.12,
  legR:air?(-.45+.14*flutter-.28*fall)*f:up?mix(-.35,-1.48,plant)*(1-finish):-.38,
  kneeL:air?(.24+.14*flutter+.52*fall)*f:up?mix(.38,1.36,plant)*(1-finish):.38+.09*breath,
  kneeR:air?(1.02-.16*flutter+.25*fall)*f:up?mix(.76,1.95,plant)*(1-finish):.76+.05*breath,
  ankleL:air?(.22+.1*flutter)*f:up?-.36*plant*(1-finish):.15,
  ankleR:air?(.1-.1*flutter)*f:up?-.44*plant*(1-finish):.08,
  spread:air?(.08+.05*flutter)*f:up?.16*(1-finish):.1,
  chest:air?(-.08-.06*flutter+.09*fall)*f:up?.5*Math.sin(Math.PI*u):-.06+.025*breath,
  side:air?.035*flutter*f:up?.1*Math.sin(Math.PI*u):.02*breath,
  head:air?.035*flutter*f:up?.26*Math.sin(Math.PI*u):.02*breath,
  armSwing:air?(.14*flutter+.2*(1-launch))*f:up?.25*Math.sin(Math.PI*u):.03*breath,
  impact,contact:d.contact||0};
 if(down){
  const settle=smooth(d.t/.16),last=Math.sin(d.airT*11);
  for(const [key,v]of Object.entries({legL:-.27-.16*last,legR:-.73+.14*last,kneeL:.76+.14*last,kneeR:1.27-.16*last,ankleL:.22+.1*last,ankleR:.1-.1*last}))out[key]=mix(v,out[key],settle);
 }
 out.chest+=.1*out.contact*f;out.kneeL+=.22*out.contact*f;out.kneeR+=.22*out.contact*f;
 return out;
}

// Two-bone placement for recovery: knee points toward the body's forward plane,
// boot sole stays level on the planted surface. Separate from upper-body aiming.
let IK=null;
export function plantDiveLeg(T,leg,knee,ankle,target,pole,yaw,w){
 if(!leg||!knee||!ankle||w<=0)return;
 IK ||= {v:new T.Vector3(),h:new T.Vector3(),e1:new T.Vector3(),e2:new T.Vector3(),e3:new T.Vector3(),f1:new T.Vector3(),f2:new T.Vector3(),f3:new T.Vector3(),m1:new T.Matrix4(),m2:new T.Matrix4(),q:new T.Quaternion(),p:new T.Quaternion(),x:new T.Vector3(1,0,0),y:new T.Vector3(0,1,0)};
 const I=IK;leg.parent.updateWorldMatrix(true,false);I.v.copy(target);leg.parent.worldToLocal(I.v);I.v.sub(leg.position);
 const a=Math.abs(knee.position.y),b=ankle.position.length(),d=Math.min(a+b-.002,Math.max(Math.abs(a-b)+.002,I.v.length()));
 const angle=Math.acos(Math.max(-1,Math.min(1,(d*d-a*a-b*b)/(2*a*b))))+Math.atan2(ankle.position.z,-ankle.position.y);
 const cs=Math.cos(angle),sn=Math.sin(angle),hy=ankle.position.y,hz=ankle.position.z;
 I.h.set(0,-a+hy*cs-hz*sn,hy*sn+hz*cs);I.e1.copy(I.h).normalize();I.e2.set(0,-a,0).addScaledVector(I.e1,a*I.e1.y).normalize();I.e3.crossVectors(I.e1,I.e2);
 I.f1.copy(I.v).normalize();leg.parent.getWorldQuaternion(I.p).invert();I.f2.copy(pole).applyQuaternion(I.p);I.f2.addScaledVector(I.f1,-I.f2.dot(I.f1));if(I.f2.lengthSq()<1e-8)return;I.f2.normalize();I.f3.crossVectors(I.f1,I.f2);
 I.m1.makeBasis(I.e1,I.e2,I.e3).transpose();I.m2.makeBasis(I.f1,I.f2,I.f3).multiply(I.m1);I.q.setFromRotationMatrix(I.m2);leg.quaternion.slerp(I.q,w);
 I.q.setFromAxisAngle(I.x,angle);knee.quaternion.slerp(I.q,w);knee.updateWorldMatrix(true,true);
 knee.getWorldQuaternion(I.p).invert();I.q.setFromAxisAngle(I.y,yaw).premultiply(I.p);ankle.quaternion.slerp(I.q,w);
}
