// GP-19870: private weighted pursuit, planted shuffle and a real lower-jaw spit pose.
import {shamblerLeg} from './shambler-motion.js';
export const SPITTER_MOTION=Object.freeze({turnRate:1.85,turnAccel:4.8,response:.26,minPace:.3,stride:1.35,stance:.6,lift:.055,drop:.075});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
const smooth=v=>{const x=clamp(v,0,1);return x*x*(3-2*x);};
const poses=new WeakMap(),turns=new WeakMap();let enabled=true;
const unavailable=z=>!z.alive||z.crawling||z.hopping||z.sleeping||z.poiGuard&&!z.poiAwake||z.riseT>0||z.belowRiseT>0||z.knockT>0||z.getUpT>0||z.windowClimb||z.abilityBusy;
export const setSpitterMotionEnabled=v=>{enabled=!!v;}; // private comparison only
export function restoreSpitterMotion(z){const s=poses.get(z);if(s?.saved){for(const [o,k,v]of s.saved)o[k]=v;s.saved=null;}}
export function resetSpitterMotion(z){if(z.typeKey!=='spitter')return;restoreSpitterMotion(z);poses.delete(z);turns.delete(z);
 for(const l of [z.mesh.userData.legLG,z.mesh.userData.legRG])l?.userData.shamblerAnkle?.rotation.set(0,0,0);delete z.spitterShot;}
export function spitterMotionState(z){const s=poses.get(z),t=turns.get(z);return {phase:s?.phase,weight:s?.weight,yaw:t?.yaw,rate:t?.rate};}
export function spitterFacing(z,dx,dz,cos=.65){const d=Math.hypot(dx,dz);return !enabled||z.typeKey!=='spitter'||d<1e-6||(Math.sin(z.mesh.rotation.y)*dx+Math.cos(z.mesh.rotation.y)*dz)/d>=cos;}
export function steerSpitter(z,dx,dz,dt){
 if(z.typeKey!=='spitter'||!enabled||unavailable(z)){if(z.typeKey==='spitter')turns.delete(z);return null;}
 if(!Number.isFinite(dx+dz+dt)||Math.hypot(dx,dz)<1e-6)return null;
 let s=turns.get(z);if(!s||Math.abs(angle(s.yaw-z.mesh.rotation.y))>.12){s={yaw:z.mesh.rotation.y,rate:0,side:0};turns.set(z,s);}
 if(z.attackWindup>0||z.swingT>0){s.yaw=z.mesh.rotation.y;s.rate=0;return {x:Math.sin(s.yaw),z:Math.cos(s.yaw),yaw:s.yaw,pace:1};}
 const want=Math.atan2(dx,dz),h0=clamp(dt,0,.1),n=Math.max(1,Math.ceil(h0*120)),h=h0/n;
 for(let i=0;i<n;i++){let error=angle(want-s.yaw);
  if(Math.abs(error)>2.6&&s.side&&Math.sign(error)!==s.side)error+=s.side*Math.PI*2;
  if(Math.abs(error)<2.4)s.side=0;else s.side ||= Math.sign(error)||1;
  const rate=clamp(error/SPITTER_MOTION.response,-SPITTER_MOTION.turnRate,SPITTER_MOTION.turnRate),old=s.rate;
  s.rate+=clamp(rate-s.rate,-SPITTER_MOTION.turnAccel*h,SPITTER_MOTION.turnAccel*h);let step=(old+s.rate)*.5*h;
  if(Math.sign(step)===Math.sign(error)&&Math.abs(step)>Math.abs(error)){step=error;s.rate=0;}s.yaw=angle(s.yaw+step);}
 const alignment=Math.max(0,Math.cos(angle(want-s.yaw)));
 return {x:Math.sin(s.yaw),z:Math.cos(s.yaw),yaw:s.yaw,rate:s.rate,pace:SPITTER_MOTION.minPace+(1-SPITTER_MOTION.minPace)*alignment};
}
export function spitterSpitPose(wind=0,snap=0){
 if(wind>0){const u=clamp(1-wind/.6,0,1),load=smooth(u/.8),push=smooth((u-.78)/.22);
  return {head:-.42*load+.57*push,torso:-.15*load+.16*push,jaw:.65*load,brace:load};}
 if(snap>0){const u=clamp(1-snap/.25,0,1),settle=1-smooth(u);
  return {head:.15*(1-u)+.12*Math.sin(Math.PI*u),torso:.01*(1-u)+.13*Math.sin(Math.PI*u),jaw:.65*settle,brace:settle};}
 return {head:0,torso:0,jaw:0,brace:0};
}
export function prepareSpitterJaw(T,mesh,scale=1){
 const u=mesh.userData;if(u.typeKey!=='spitter'||u.spitterJaw)return;
 const jaw=new T.Group();jaw.name='spitter-jaw';jaw.position.set(0,-.075*scale,.045*scale);u.head.add(jaw);
 const eyes=new Set(u.eyes||[]);
 for(const m of [...u.head.children]){if(!m.isMesh||eyes.has(m)||!m.geometry?.attributes.position)continue;
  m.updateMatrix();const src=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();src.applyMatrix4(m.matrix);
  const P=src.attributes.position,lower=[],upper=[];
  for(let i=0;i<P.count;i+=3){const y=(P.getY(i)+P.getY(i+1)+P.getY(i+2))/3,z=(P.getZ(i)+P.getZ(i+1)+P.getZ(i+2))/3;
   (y<-.122*scale&&z>.025*scale?lower:upper).push(i,i+1,i+2);}
  if(!lower.length){src.dispose();continue;}
  const part=indices=>{const g=new T.BufferGeometry();for(const [name,a]of Object.entries(src.attributes)){const data=new a.array.constructor(indices.length*a.itemSize);
    indices.forEach((v,i)=>{for(let k=0;k<a.itemSize;k++)data[i*a.itemSize+k]=a.array[v*a.itemSize+k];});g.setAttribute(name,new T.BufferAttribute(data,a.itemSize,a.normalized));}g.computeBoundingSphere();return g;};
  const j=new T.Mesh(part(lower),m.material);j.position.copy(jaw.position).multiplyScalar(-1);j.castShadow=m.castShadow;jaw.add(j);
  if(upper.length){m.geometry=part(upper);m.position.set(0,0,0);m.rotation.set(0,0,0);m.scale.setScalar(1);}else m.removeFromParent();src.dispose();}
 u.spitterJaw=jaw;u.jaw=jaw;
}
export function applySpitterMotion(z,dt){
 if(z.typeKey!=='spitter')return;
 const u=z.mesh.userData,p=z.mesh.position,yaw=z.mesh.rotation.y;
 if(!enabled||unavailable(z)||z.inWater||z.farLod||z.hitReact>0||z.hitPartT>0||z.attackWindup>0||z.swingT>0||z.partsLost?.legL||z.partsLost?.legR||!u.hips||!u.torso){poses.delete(z);return;}
 let s=poses.get(z);if(!s||Math.hypot(p.x-s.x,p.z-s.z)>3||dt>.15){s={x:p.x,z:p.z,yaw,hipYaw:yaw,phase:0,weight:0,saved:null};poses.set(z,s);}
 const travel=Math.hypot(p.x-s.x,p.z-s.z),turn=angle(yaw-s.yaw),h=clamp(dt,0,.1),spit=spitterSpitPose(z.spitWind,z.spitSnap),rest=u.rest||{};
 s.x=p.x;s.z=p.z;s.yaw=yaw;s.phase=(s.phase+travel*Math.PI*2/SPITTER_MOTION.stride+Math.abs(turn)*.38)%(Math.PI*2);
 s.weight+=((travel>.0005||Math.abs(turn)>.0005?1:0)-s.weight)*(1-Math.exp(-8*h));
 s.hipYaw=angle(s.hipYaw+angle(yaw-s.hipYaw)*(1-Math.exp(-7*h)));
 const lag=clamp(angle(s.hipYaw-yaw),-.4,.4),w=s.weight,ph=s.phase,scale=Math.abs(u.legLG?.userData.shinG?.position.y||.38)/.38;
 s.saved=[];const set=(o,k,v)=>{if(!o)return;s.saved.push([o,k,o[k]]);o[k]=v;};
 set(u.hips.position,'y',u.baseHipsY+(-SPITTER_MOTION.drop+.026*(1-Math.cos(ph*2)))*scale*w-.035*scale*spit.brace);
 set(u.hips.position,'x',Math.sin(ph)*.038*scale*w);set(u.hips.rotation,'y',(rest.hipsRY||0)+lag);
 set(u.hips.rotation,'z',(rest.hipsRZ||0)+Math.sin(ph)*.07*w);
 set(u.torso.rotation,'x',(rest.torsoRX||0)+(.16+.035*Math.cos(ph*2))*w+spit.torso);
 set(u.torso.rotation,'y',(rest.torsoRY||0)-lag+Math.sin(ph-.35)*.07*w);
 set(u.torso.rotation,'z',(rest.torsoRZ||0)-Math.sin(ph-.4)*.07*w);
 if(u.head&&!z.partsLost?.head){set(u.head.rotation,'x',(rest.headRX||0)+.075*w+spit.head);set(u.head.rotation,'z',(rest.headRZ||0)-Math.sin(ph-.6)*.04*w);
  set(u.jaw?.rotation,'x',spit.jaw);}
 for(const [i,leg]of [u.legLG,u.legRG].entries()){
  const shin=leg?.userData.shinG,ankle=leg?.userData.shamblerAnkle;if(!shin||!ankle)continue;
  const cycle=((ph/(Math.PI*2)+i*.5)%1+1)%1,stance=cycle<SPITTER_MOTION.stance;
  const t=stance?cycle/SPITTER_MOTION.stance:(cycle-SPITTER_MOTION.stance)/(1-SPITTER_MOTION.stance),reach=SPITTER_MOTION.stride*SPITTER_MOTION.stance*.5;
  const footZ=(stance?reach*(1-2*t):reach*(2*smooth(t)-1))*scale*w, lift=stance?0:Math.sin(t*Math.PI)*SPITTER_MOTION.lift*scale*w;
  const ry=leg.userData.shamblerFootY+lift-u.hips.position.y-leg.position.y-Math.sin(u.hips.rotation.z)*leg.position.x;
  const pose=shamblerLeg(ry,footZ-.04*scale,.38*scale,.36*scale);
  set(leg.rotation,'x',pose.thigh);set(leg.rotation,'y',-lag*.3);set(shin.rotation,'x',pose.knee);
  set(ankle.rotation,'x',-(u.hips.rotation.x+pose.thigh+pose.knee));set(ankle.rotation,'z',-u.hips.rotation.z);
  const side=i?-1:1,arm=i?u.armRG:u.armLG;if(!arm||z.partsLost?.[i?'armR':'armL'])continue;
  const base=(i?rest.armRRX:rest.armLRX)??-.4;set(arm.rotation,'x',base+Math.sin(ph+i*Math.PI-.3)*.15*w-.24*spit.brace);
  set(arm.rotation,'z',((i?rest.armRRZ:rest.armLRZ)||0)+side*(.09*w+.1*spit.brace));
  set(arm.userData.elbowG?.rotation,'x',-.35-.1*Math.sin(ph+i*Math.PI-.5)*w-.38*spit.brace);
 }
}
