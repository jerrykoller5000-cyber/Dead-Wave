// GP-19884: heavy Bomber locomotion on the existing concept rig, no new draws.
import {shamblerLeg} from './shambler-motion.js';
import {blendBomberSkin,pulseBomberVeins,resetBomberVeins} from './bomber-appearance.js';
export const BOMBER=Object.freeze({maxSpeed:4.0,accel:1.1,brake:.75,turn:1.3,turnAccel:2.5,response:.45,stride:1.3,stance:.62,lift:.035});
const states=new WeakMap(),poses=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const unavailable=z=>!z.alive||z.crawling||z.hopping||z.sleeping||z.poiGuard&&!z.poiAwake||z.riseT>0||z.belowRiseT>0||z.knockT>0||z.getUpT>0||z.windowClimb||z.partsLost?.legL||z.partsLost?.legR;
export const createBomberMotion=yaw=>({yaw,speed:0,rate:0,side:0});
export function advanceBomber(s,dx,dz,speed,dt){
 if(!Number.isFinite(dx+dz+speed+dt)||dt<=0)return s;
 const n=Math.max(1,Math.ceil(Math.min(dt,.1)*120)),h=Math.min(dt,.1)/n,hasDirection=Math.hypot(dx,dz)>1e-6,want=hasDirection?Math.atan2(dx,dz):s.yaw;
 for(let i=0;i<n;i++){
  let error=angle(want-s.yaw);
  if(Math.abs(error)>2.6&&s.side&&Math.sign(error)!==s.side)error+=s.side*Math.PI*2;
  if(Math.abs(error)<2.4)s.side=0;else s.side ||= Math.sign(error)||1;
  const cap=BOMBER.turn/(1+s.speed*.25),rate=clamp(error/BOMBER.response,-cap,cap);
  const old=s.rate;s.rate+=clamp(rate-s.rate,-BOMBER.turnAccel*h,BOMBER.turnAccel*h);
  let turn=(old+s.rate)*.5*h;
  if(Math.sign(turn)===Math.sign(error)&&Math.abs(turn)>Math.abs(error)){turn=error;s.rate=0;}
  s.yaw=angle(s.yaw+turn);
  const wanted=(hasDirection?clamp(speed,0,BOMBER.maxSpeed):0)*(.55+.45*Math.max(0,Math.cos(error)));
  s.speed+=clamp(wanted-s.speed,-BOMBER.brake*h,BOMBER.accel*h);
 }
 return s;
}
export function stepBomber(z,dx,dz,speed,dt,allow=true){
 if(z.typeKey!=='bomber')return null;
 if(unavailable(z)){states.delete(z);return null;}
 let s=states.get(z);if(!s||Math.abs(angle(s.yaw-z.mesh.rotation.y))>.18){s=createBomberMotion(z.mesh.rotation.y);states.set(z,s);}
 if(!allow){s.speed=s.rate=0;return {x:Math.sin(s.yaw),z:Math.cos(s.yaw),yaw:s.yaw,speed:0};}
 advanceBomber(s,dx,dz,speed,dt);
 return {x:Math.sin(s.yaw),z:Math.cos(s.yaw),yaw:s.yaw,speed:s.speed};
}
export function restoreBomberPose(z){const q=poses.get(z);if(q){for(let i=0;i<q.n;i++){const[o,k,v]=q.saved[i];o[k]=v;}q.n=0;}}
export function resetBomber(z){if(z.typeKey!=='bomber')return;restoreBomberPose(z);resetBomberVeins(z);states.delete(z);poses.delete(z);}

export function prepareBomberAppearance(T,g,scale){
 const u=g.userData;
 if(u.typeKey!=='bomber'||u.bomberPrepared)return;
 // Concept templates share geometry. Sculpt private copies, keeping UVs, fissures
 // and skin details aligned; the existing belly surface supplies all the bulk.
 const sculpt=(bone,sx,sz,belly=false)=>{
  for(const m of bone.children){if(!m.isMesh||u.eyes.includes(m))continue;
   const geo=m.geometry.clone(),p=geo.attributes.position;
   for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),low=1-clamp((y/scale-.12)/.34,0,1),front=clamp(z/(.4*scale),0,1);
    p.setXYZ(i,x*(belly?1.22+.22*low:sx),y-(belly?.065*scale*low*front:0),z*(belly?1.25+.28*low:sz));
   }
   geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();m.geometry=geo;
   m.position.x*=sx;m.position.z*=sz;
  }
 };
 sculpt(u.torso,1.44,1.53,true);sculpt(u.hips,1.38,1.35);
 for(const side of ['L','R']){
  const arm=u['arm'+side+'G'],leg=u['leg'+side+'G'];arm.position.x*=1.38;leg.position.x*=1.3;
  sculpt(arm,1.35,1.32);sculpt(arm.userData.elbowG,1.32,1.25);sculpt(leg,1.5,1.4);sculpt(leg.userData.shinG,1.25,1.2);
 }
 sculpt(u.head,1.12,1.10);for(const eye of u.eyes){eye.position.x*=1.12;eye.position.z*=1.10;}
 u.bomberBelly=u.torso.children.find(m=>m.isMesh&&m.material===u.pulseMats[0]);blendBomberSkin(T,u,scale);u.bomberPrepared=true;
}

export function applyBomberPose(z,dt,target=null){
 if(z.typeKey!=='bomber')return;
 pulseBomberVeins(z,dt,target); // GP-19891: glow persists while hurt or downed, independently of the pose.
 if(unavailable(z)||z.farLod||z.inWater||z.hitReact>0||z.hitPartT>0)return;
 const s=states.get(z),u=z.mesh.userData,p=z.mesh.position;if(!s||!u.hips||!u.torso)return;
 let q=poses.get(z);if(!q){q={x:p.x,z:p.z,yaw:s.yaw,hipYaw:s.yaw,phase:0,weight:0,time:0,flapPhase:0,flapNear:0,saved:[],n:0};poses.set(z,q);}
 const h=clamp(dt,0,.1),scale=Math.abs(u.legLG.userData.shinG.position.y)/.38,travel=Math.hypot(p.x-q.x,p.z-q.z),turn=angle(s.yaw-q.yaw);
 q.x=p.x;q.z=p.z;q.yaw=s.yaw;q.time+=h;
 if(travel<3)q.phase=(q.phase+travel*2*Math.PI/(BOMBER.stride*scale*z.mesh.scale.z)+Math.abs(turn)*.4)%(Math.PI*2);
 // Wall/build collision owns position: an impact sheds momentum, never pushes through it.
 const actual=h>0?travel/h:s.speed;
 if(travel<3&&s.speed>.3&&actual<s.speed*.25)s.speed=Math.min(s.speed,actual+.12);
 q.weight+=((travel>.0003||Math.abs(turn)>.0004?1:0)-q.weight)*(1-Math.exp(-6*h));
 q.hipYaw=angle(q.hipYaw+angle(s.yaw-q.hipYaw)*(1-Math.exp(-4*h)));
 const ph=q.phase,w=q.weight,lag=clamp(angle(q.hipYaw-s.yaw),-.35,.35),roll=Math.sin(ph)*.095*w,rest=u.rest||{},pace=s.speed/BOMBER.maxSpeed;
 const set=(o,k,v)=>{if(!o)return;const entry=q.saved[q.n]||(q.saved[q.n]=[o,k,0]);entry[0]=o;entry[1]=k;entry[2]=o[k];q.n++;o[k]=v;};
 set(u.hips.position,'y',u.baseHipsY+(-.12+.018*(1-Math.cos(ph*2)))*scale*w);
 set(u.hips.position,'x',Math.sin(ph)*.035*scale*w);set(u.hips.rotation,'y',lag);set(u.hips.rotation,'z',roll);
 set(u.torso.rotation,'x',(rest.torsoRX||0)+(.075+.065*pace)*w+.016*Math.sin(q.time*2));
 set(u.torso.rotation,'y',-lag*.6+Math.sin(ph-.3)*.05*w);set(u.torso.rotation,'z',-Math.sin(ph-.35)*.075*w-s.rate*pace*.025);
 if(!z.partsLost?.head){set(u.head.rotation,'x',(rest.headRX||0)+.04*w+Math.sin(ph-.7)*.04*w);set(u.head.rotation,'y',-lag*.25);set(u.head.rotation,'z',-.65*roll);}
 // GP-19890: a smoothed player-distance response speeds the flaps up continuously.
 const distance=target&&Number.isFinite(target.x+target.y+target.z)&&Math.abs(target.y-p.y)<1.6?Math.hypot(target.x-p.x,target.z-p.z):Infinity;
 const near=clamp((10-distance)/7.2,0,1);q.flapNear+=(near-q.flapNear)*(1-Math.exp(-4*h));q.flapPhase=(q.flapPhase+h*(2.0+7*q.flapNear))%(2*Math.PI);
 const jiggle=Math.sin(ph*2-.7)*.012*scale*w,flapAmp=.045+.17*q.flapNear,flap=Math.sin(q.flapPhase);
 const belly=u.bomberBelly;if(belly){set(belly.scale,'x',belly.scale.x*(1+.02*Math.sin(ph-.65)*w));set(belly.scale,'y',belly.scale.y*(1+.012*Math.sin(q.time*2)));set(belly.position,'y',belly.position.y+jiggle);}
 for(const[i,leg]of[u.legLG,u.legRG].entries()){
  const shin=leg.userData.shinG,ankle=leg.userData.shamblerAnkle,cycle=((ph/(2*Math.PI)+i*.5)%1+1)%1,stance=cycle<BOMBER.stance,t=stance?cycle/BOMBER.stance:(cycle-BOMBER.stance)/(1-BOMBER.stance),ease=t*t*(3-2*t);
  const half=BOMBER.stride*BOMBER.stance/2,footZ=(stance?half*(1-2*t):half*(2*ease-1))*scale*w,lift=stance?0:Math.sin(t*Math.PI)*BOMBER.lift*scale*w;
  if(shin&&ankle){const ry=leg.userData.shamblerFootY+lift-u.hips.position.y-leg.position.y-Math.sin(roll)*leg.position.x,pose=shamblerLeg(ry,footZ,.38*scale,.36*scale);set(leg.rotation,'x',pose.thigh);set(leg.rotation,'y',-lag*.15);set(shin.rotation,'x',pose.knee);set(ankle.rotation,'x',-(u.hips.rotation.x+pose.thigh+pose.knee));set(ankle.rotation,'z',-roll);}
  const arm=i?u.armRG:u.armLG,side=i?1:-1;if(arm&&!z.partsLost?.[i?'armR':'armL']){
   // Elbows out, forearms cupping the belly sides; hands ride its delayed wobble.
   set(arm.position,'y',arm.position.y+jiggle);set(arm.position,'x',arm.position.x+side*.018*scale*Math.sin(ph-.65)*w);
   set(arm.rotation,'x',-.24+.045*Math.sin(ph-.4)*w-.055*flap*q.flapNear);set(arm.rotation,'z',side*(.62+flapAmp*flap));set(arm.rotation,'y',-side*.10);
   const elbow=arm.userData.elbowG;set(elbow?.rotation,'x',-1.05+.07*Math.sin(ph*2-1)*w-.12*Math.sin(q.flapPhase-.55)*q.flapNear);set(elbow?.rotation,'z',-side*.30);
  }
 }
}
