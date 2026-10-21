// GP-19864: private soldier controller and posed armor hit tests.
import {shamblerLeg} from './shambler-motion.js';
export const MILITARY=Object.freeze({bullet:.8,chest:.5,helmet:.6,blast:.6,maxSpeed:6.2,turnRate:3.8,turnAccel:12,kickWind:.26,kickRange:1.35});
let states=new WeakMap(),poses=new WeakMap(),claims=new WeakMap(),enabled=true;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
const unfit=z=>!z.alive||z.crawling||z.hopping||z.partsLost?.head||z.partsLost?.legL||z.partsLost?.legR||z.riseT>0||z.belowRiseT>0||z.knockT>0||z.getUpT>0||z.inWater||z.windowClimb||z.sleeping||z.poiGuard&&!z.poiAwake;
export const setMilitaryEnabled=v=>{enabled=!!v;};
export const militaryActive=z=>enabled&&z.typeKey==='military';
export const militaryState=z=>states.get(z);
export function restoreMilitaryPose(z){const p=poses.get(z);if(p?.saved){for(const[o,k,v]of p.saved)o[k]=v;p.saved=null;}}
export function resetMilitary(z){restoreMilitaryPose(z);const s=states.get(z);if(s?.grenade)claims.delete(s.grenade);states.delete(z);poses.delete(z);if(z.typeKey==='military')for(const leg of[z.mesh.userData.legLG,z.mesh.userData.legRG])leg?.userData.shamblerAnkle?.rotation.set(0,0,0);}
export function militaryCanReach(z,dx,dz){if(!militaryActive(z)||unfit(z))return true;const d=Math.hypot(dx,dz);return !d||(Math.sin(z.mesh.rotation.y)*dx+Math.cos(z.mesh.rotation.y)*dz)/d>.4;}
export function stepMilitary(z,dt,c){
  if(!militaryActive(z)||unfit(z)||!c.valid){resetMilitary(z);return null;}
  const p=z.mesh.position,target=c.target.position,h=clamp(dt,0,.1);
  let s=states.get(z);if(!s){s={phase:'idle',t:0,yaw:z.mesh.rotation.y,rate:0,vx:0,vz:0,tx:target.x,tz:target.z,guardCd:1.2+(z.bob||0),bashCd:1,sideT:0,side:1};states.set(z,s);}
  const tvx=clamp((target.x-s.tx)/Math.max(dt,.001),-14,14),tvz=clamp((target.z-s.tz)/Math.max(dt,.001),-14,14);s.tx=target.x;s.tz=target.z;s.vx+=(tvx-s.vx)*(1-Math.exp(-5*h));s.vz+=(tvz-s.vz)*(1-Math.exp(-5*h));s.guardCd-=h;s.bashCd-=h;s.sideT-=h;
  const oldPhase=s.phase;
  let dx=c.x,dz=c.z,speed=Math.min(c.speed,MILITARY.maxSpeed),want=Math.atan2(target.x-p.x,target.z-p.z),hit=false,kicked=false;
  const dist=Math.hypot(target.x-p.x,target.z-p.z);
  if(s.phase!=='idle'&&z.hitReact>.08){if(s.grenade)claims.delete(s.grenade);s.grenade=null;s.phase='idle';s.bashCd=2;s.guardCd=2;}
  if(s.phase==='idle'&&c.canStart){
    for(const g of c.grenades||[]){if(!g.handThrown||g.isShell||g.militaryReturned||claims.has(g)||g.fuse-g.age<MILITARY.kickWind+.09||Math.abs(g.pos.y-p.y)>.42||Math.hypot(g.pos.x-p.x,g.pos.z-p.z)>MILITARY.kickRange||c.blocked(p,g.pos))continue;s.phase='kickWind';s.t=0;s.grenade=g;claims.set(g,z);break;}
    // The normal attack clock is decremented later in the actor update; reserve
    // this ready beat before another claw swing can consume it.
    if(s.phase==='idle'&&dist<2.25&&dist>.65&&s.bashCd<=0&&z.attackCd<=dt+.001&&militaryCanReach(z,target.x-p.x,target.z-p.z)&&!c.blocked(p,target)&&Math.abs(target.y-p.y)<1.2){s.phase='bashWind';s.t=0;s.committedYaw=s.yaw;s.bashCd=3.6;}
    else if(s.phase==='idle'&&dist>2.5&&dist<9&&s.guardCd<=0&&(!z.partsLost?.armL||!z.partsLost?.armR)){s.phase='guard';s.t=0;s.guardCd=4.8;}
  }
  s.t+=h;
  if(s.phase==='guard'){speed*=.6;if(s.t>.85){s.phase='idle';s.t=0;}}
  if(s.phase==='kickWind'||s.phase==='kickRecover'){
    const g=s.grenade;speed=0;if(g){want=Math.atan2(g.pos.x-p.x,g.pos.z-p.z);const distance=Math.hypot(g.pos.x-p.x,g.pos.z-p.z);if(s.phase==='kickWind'&&distance>.8){speed=Math.min(c.speed,2.2);dx=Math.sin(want);dz=Math.cos(want);}}
    if(s.phase==='kickWind'&&s.t>=MILITARY.kickWind){
      if(g&&c.grenades.includes(g)&&g.age<g.fuse&&Math.abs(g.pos.y-p.y)<.45&&Math.hypot(g.pos.x-p.x,g.pos.z-p.z)<1.05&&!c.blocked(p,g.pos)&&Math.cos(angle(want-s.yaw))>.55){const v=c.thrower(g)?.position||target,d=Math.hypot(v.x-g.pos.x,v.z-g.pos.z)||1;g.vx=(v.x-g.pos.x)/d*12;g.vz=(v.z-g.pos.z)/d*12;g.vy=2.4;g.militaryReturned=true;kicked=true;}
      if(g)claims.delete(g);s.grenade=null;s.phase='kickRecover';s.t=0;
    }else if(s.phase==='kickRecover'&&s.t>.35){s.phase='idle';s.t=0;}
  }
  if(s.phase==='bashWind'||s.phase==='bash'||s.phase==='bashRecover'){
    want=s.committedYaw;speed=0;
    if(s.phase==='bashWind'&&s.t>.42){s.phase='bash';s.t=0;s.connected=false;}
    if(s.phase==='bash'){speed=Math.min(c.speed*1.1,MILITARY.maxSpeed);dx=Math.sin(want);dz=Math.cos(want);if(!s.connected&&dist<1.3&&Math.abs(target.y-p.y)<1.2&&Math.cos(angle(Math.atan2(target.x-p.x,target.z-p.z)-want))>.55&&!c.dodging&&!c.blocked(p,target)){s.connected=true;hit=true;}if(s.t>.25){s.phase='bashRecover';s.t=0;}}
    else if(s.phase==='bashRecover'&&s.t>.45){s.phase='idle';s.t=0;}
  }
  if(s.phase==='idle'||s.phase==='guard'){
    // Follow lateral footwork with a short perception delay, while facing the target.
    const lateral=s.vx*Math.cos(want)-s.vz*Math.sin(want);
    if(c.engage!==false&&dist<9&&dist>1.5&&!c.blocked(p,target)){if(s.sideT<=0&&Math.abs(lateral)>.8){s.side=Math.sign(lateral);s.sideT=.45;}const strafe=s.sideT>0?.42*s.side:0;dx+=Math.cos(want)*strafe;dz-=Math.sin(want)*strafe;const len=Math.hypot(dx,dz)||1;dx/=len;dz/=len;}
  }
  // Target-facing strafes retain independent lower-body direction.
  if((dist>10||c.engage===false)&&s.phase==='idle')want=Math.atan2(dx,dz);
  if(Math.abs(angle(s.yaw-z.mesh.rotation.y))>.15)s.yaw=z.mesh.rotation.y;
  const error=angle(want-s.yaw),rate=clamp(error/.2,-MILITARY.turnRate,MILITARY.turnRate);s.rate+=clamp(rate-s.rate,-MILITARY.turnAccel*h,MILITARY.turnAccel*h);let turn=s.rate*h;if(Math.sign(turn)===Math.sign(error)&&Math.abs(turn)>Math.abs(error)){turn=error;s.rate=0;}s.yaw=angle(s.yaw+turn);
  if(s.phase==='idle'||s.phase==='guard')speed*=.35+.65*Math.max(0,Math.cos(angle(Math.atan2(dx,dz)-s.yaw)));
  return {x:dx,z:dz,speed,yaw:s.yaw,phase:s.phase,started:s.phase!==oldPhase?s.phase:null,busy:!['idle','guard'].includes(s.phase),hit,kicked};
}
export function applyMilitaryPose(z,dt){
  if(!militaryActive(z)||unfit(z)||z.farLod||z.hitReact>0||z.hitPartT>0||z.attackWindup>0||z.swingT>0)return;
  const u=z.mesh.userData,s=states.get(z),p=z.mesh.position;if(!s||!u.hips||!u.torso)return;
  let q=poses.get(z);if(!q){q={x:p.x,z:p.z,phase:0,weight:0,saved:null};poses.set(z,q);}
  const mx=p.x-q.x,mz=p.z-q.z,travel=Math.hypot(mx,mz);q.x=p.x;q.z=p.z;if(travel<3)q.phase+=travel*Math.PI*2/2.0;q.weight+=((travel>.001?1:0)-q.weight)*(1-Math.exp(-10*dt));
  const ph=q.phase,w=q.weight,scale=Math.abs(u.legLG?.userData.shinG?.position.y||.38)/.38,rest=u.rest||{},motionYaw=travel>.001?Math.atan2(mx,mz):s.yaw,twist=clamp(angle(motionYaw-s.yaw),-.65,.65),guard=s.phase==='guard',bash=s.phase.startsWith('bash'),kick=s.phase.startsWith('kick');
  q.saved=[];const set=(o,k,v)=>{if(!o)return;q.saved.push([o,k,o[k]]);o[k]=v;};
  set(u.hips.position,'y',u.baseHipsY+(-.07+.045*(1-Math.cos(ph*2)))*scale*w);
  set(u.hips.rotation,'y',twist*.75);set(u.hips.rotation,'z',Math.sin(ph)*.04*w);
  set(u.torso.rotation,'y',-twist*.65+Math.sin(ph)*.07*w+(bash?-.28:0));
  const bashLean=s.phase==='bashWind'?.08:s.phase==='bash'?.4:s.phase==='bashRecover'?.4*(1-clamp(s.t/.45,0,1)):0;
  set(u.torso.rotation,'x',(rest.torsoRX||0)+(bash?bashLean:guard?.08:.06*w));
  set(u.head.rotation,'y',-twist*.15);set(u.head.rotation,'x',(rest.headRX||0)-.04*w);
  for(const[i,leg]of[u.legLG,u.legRG].entries()){
    const shin=leg?.userData.shinG,ankle=leg?.userData.shamblerAnkle;if(!shin||!ankle)continue;const cycle=((ph/(2*Math.PI)+i*.5)%1+1)%1,stance=cycle<.58,t=stance?cycle/.58:(cycle-.58)/.42,reach=.48*scale*w,lift=stance?0:Math.sin(t*Math.PI)*.10*scale*w,footZ=stance?reach*(1-2*t):reach*(2*(t*t*(3-2*t))-1);
    const pose=shamblerLeg(leg.userData.shamblerFootY+lift-u.hips.position.y-leg.position.y,footZ,.38*scale,.36*scale);set(leg.rotation,'x',pose.thigh);set(leg.rotation,'y',twist*.25);set(shin.rotation,'x',pose.knee);set(ankle.rotation,'x',-(u.hips.rotation.x+pose.thigh+pose.knee));set(ankle.rotation,'z',-u.hips.rotation.z);
    if(kick&&i===1){const wind=s.phase==='kickWind',t=wind?clamp(s.t/.26,0,1):1-clamp(s.t/.35,0,1);set(leg.rotation,'x',-.95*t);set(shin.rotation,'x',wind?1.5*t:.12*t);set(ankle.rotation,'x',wind?-.25:.2);}
    const arm=i?u.armRG:u.armLG;if(!arm||z.partsLost?.[i?'armR':'armL'])continue;const el=arm.userData.elbowG;
    set(arm.rotation,'x',guard?-1.18:bash?(i?-.8:-1.1):-.3+Math.sin(ph+i*Math.PI)*.28*w);set(arm.rotation,'z',(i?-1:1)*(guard?.23:bash?.3:.13));set(arm.rotation,'y',guard?(i?-1:1)*.38:(i?1:-1)*.05);if(el)set(el.rotation,'x',guard?-1.4:bash?-.95:-1.05+.12*Math.sin(ph+i*Math.PI)*w);
  }
}
const rays=new WeakMap();
export function militaryProjectileHit(T,z,a,b){
  if(z.typeKey!=='military')return null;
  let r=rays.get(T);if(!r){r={ray:new T.Raycaster(),dir:new T.Vector3(),local:new T.Vector3(),inv:new T.Matrix4(),hits:[]};rays.set(T,r);}
  r.dir.subVectors(b,a);const length=r.dir.length();if(!length)return null;r.dir.divideScalar(length);r.ray.set(a,r.dir);r.ray.far=length;r.ray.near=0;z.mesh.updateMatrixWorld(true);
  const u=z.mesh.userData;
  // Each vertex has one rigid bone. Its retained source mesh is exactly the
  // rendered surface, without re-skinning thousands of vertices for every round.
  if(!u.militaryHitMeshes){u.militaryHitMeshes=[];z.mesh.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh&&!o.userData.stump&&(o.userData.skinSrc||(!u.skinMeshes?.length&&o.visible)||u.eyes?.includes(o)))u.militaryHitMeshes.push(o);});}
  r.hits.length=0;r.ray.intersectObjects(u.militaryHitMeshes,false,r.hits);
  const h=r.hits[0];if(!h)return null;const bone=h.object.parent;r.inv.copy(bone.matrixWorld).invert();r.local.copy(h.point).applyMatrix4(r.inv);const v=r.local;let zone='exposed',part='torso';
  if(bone===u.head){part='head';const inward=r.dir.clone().transformDirection(r.inv);
    // The rendered helmet surface wins over a height estimate at its rim.
    zone=h.object.material.userData.militaryUniform?'helmet':v.y>-.13&&v.y<.143&&Math.abs(v.x)<.135&&v.z>.075&&inward.z<-.15?'face':'exposed';
  }
  else if(bone===u.torso&&v.y>.015&&v.y<.52)zone='chest';
  else for(const [key,root]of[['armL',u.armLG],['armR',u.armRG],['legL',u.legLG],['legR',u.legRG]])for(let n=bone;n&&n!==z.mesh;n=n.parent)if(n===root)part=key;
  return {t:h.distance/length,zone,part};
}
export function militaryBulletShare(zone){return zone==='chest'?MILITARY.chest:zone==='helmet'?MILITARY.helmet:MILITARY.bullet;}
