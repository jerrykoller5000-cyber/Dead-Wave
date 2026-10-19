// GP-19857: a Spider can sidestep while its body and mouth turn toward the prey.
const states=new WeakMap(),poses=new WeakMap(),wanderers=new WeakMap(),panics=new WeakMap();
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
const smooth=x=>{const u=clamp(x);return u*u*(3-2*u);};
export const SPIDER_MOTION=Object.freeze({rate:2.65,accel:9,response:.23,moveRate:3.4,moveAccel:12,wind:.38,snap:.22});
let enabled=true;
export const setSpiderMotionEnabled=value=>{enabled=!!value;}; // same-scene visual/steering QA
const interrupted=z=>!z.alive||z.crawling||z.hopping||z.sleeping||z.riseT>0||z.belowRiseT>0||z.knockT>0||z.getUpT>0||z.windowClimb||z.hitReact>0||z.hitPartT>0;
export const spiderHeadless=z=>!!(z.spider&&z.partsLost?.head);
export const SPIDER_TOUCH=Object.freeze({duration:1.5,beats:Object.freeze([.30,.70,1.10]),contactPad:.12,reachPad:.45,height:.65,rate:4.8,accel:18});
// GP-19859: double the whole shot cycle, including the mouth wind-up.
export const spiderSpitCooldown=random=>(2.3+clamp(random)*1.5)*2+SPIDER_MOTION.wind;
export function stepHeadlessSpiderTouch(z,dt,dx,dz,touching){
  if(!spiderHeadless(z)){panics.delete(z);return null;}
  let s=panics.get(z);
  if(!s){s={active:false,elapsed:0,x:0,z:1,touching:false,strike:0,started:false};panics.set(z,s);}
  s.strike=0;s.started=false;
  if(interrupted(z))s.active=false;
  else{
    if(s.active){const prev=s.elapsed;s.elapsed+=clamp(dt,0,.1);for(const beat of SPIDER_TOUCH.beats)if(prev<beat&&s.elapsed>=beat)s.strike++;if(s.elapsed>=SPIDER_TOUCH.duration)s.active=false;}
    if(touching&&!s.touching&&!s.active){const n=Math.hypot(dx,dz);s.x=n>1e-6?dx/n:Math.sin(z.mesh.rotation.y);s.z=n>1e-6?dz/n:Math.cos(z.mesh.rotation.y);s.elapsed=0;s.active=true;s.started=true;s.strike=0;}
  }
  s.touching=!!touching;
  return s;
}
export function spiderTouchState(z){const s=panics.get(z);return s?{active:s.active,elapsed:s.elapsed,x:s.x,z:s.z,strike:s.strike,started:s.started}:null;}
export function spiderTouchCanHit(z,dx,dz){const s=panics.get(z),n=Math.hypot(dx,dz);return !!(s?.active&&n>1e-6&&(s.x*dx+s.z*dz)/n>.65&&spiderFacing(z,dx,dz));}
// GP-19858: aimless heading and short pauses, independent of prey or decoys.
export function headlessSpiderStep(z,dt){
  if(!spiderHeadless(z)){wanderers.delete(z);panics.delete(z);return null;}
  let s=wanderers.get(z);
  if(!s){s={time:0,yaw:z.mesh.rotation.y,seed:z.bob||0,x:0,z:0,pace:0};wanderers.set(z,s);}
  s.time+=clamp(dt,0,.1);
  const yaw=s.yaw+Math.sin(s.time*.65+s.seed)*.85+Math.sin(s.time*.19+s.seed)*1.2;
  s.x=Math.sin(yaw);s.z=Math.cos(yaw);
  const cycle=s.time%6;
  s.pace=.28*(1-smooth((cycle-4.6)/.4))*smooth((6-cycle)/.3);
  const panic=panics.get(z);if(panic?.active){s.x=panic.x;s.z=panic.z;s.pace=0;}
  return s;
}
function turn(s,want,dt,rate,accel){
  const elapsed=clamp(dt,0,.1),n=Math.max(1,Math.ceil(elapsed*120)),h=elapsed/n;
  for(let i=0;i<n;i++){
    let error=angle(want-s.yaw);
    if(Math.abs(error)>2.6&&s.side&&Math.sign(error)!==s.side)error+=s.side*Math.PI*2;
    if(Math.abs(error)<2.4)s.side=0;else s.side ||= Math.sign(error)||1;
    const desired=clamp(error/SPIDER_MOTION.response,-rate,rate),old=s.rate;
    s.rate+=clamp(desired-s.rate,-accel*h,accel*h);
    let step=(old+s.rate)*.5*h;
    if(Math.sign(step)===Math.sign(error)&&Math.abs(step)>Math.abs(error)){step=error;s.rate=0;}
    s.yaw=angle(s.yaw+step);
  }
}
export function tickSpiderMotion(z,dt){
  if(!z.spider)return;
  const pose=poses.get(z);
  if(pose?.saved){for(const p of pose.parts)p.object.quaternion.copy(p.q);pose.hips.position.y=pose.y;pose.saved=false;}
  if(spiderHeadless(z)){z.spiderSpitWind=0;z.spiderSpitSnap=0;z.spiderShot=null;z.attackWindup=0;z.swingT=0;z._pendingAttack=null;}
  z.spiderSpitSnap=Math.max(0,(z.spiderSpitSnap||0)-Math.max(0,dt));
  if(interrupted(z)){z.spiderSpitWind=0;z.spiderSpitSnap=0;z.spiderShot=null;states.delete(z);const panic=panics.get(z);if(panic)panic.active=false;}
}
export function steerSpider(z,sx,sz,tx,tz,dt){
  if(!z.spider)return null;
  if(!enabled||interrupted(z)){states.delete(z);return null;}
  if(!Number.isFinite(sx+sz+tx+tz+dt)||Math.hypot(tx,tz)<1e-6)return null;
  let s=states.get(z);
  if(!s||Math.abs(angle(s.body.yaw-z.mesh.rotation.y))>.15){s={body:{yaw:z.mesh.rotation.y,rate:0,side:0},move:{yaw:Math.atan2(sx,sz),rate:0,side:0},steps:0};states.set(z,s);}
  const panic=panics.get(z)?.active,want=Math.atan2(tx,tz);turn(s.body,want,dt,panic?SPIDER_TOUCH.rate:SPIDER_MOTION.rate,panic?SPIDER_TOUCH.accel:SPIDER_MOTION.accel);
  turn(s.move,Math.atan2(sx,sz),dt,SPIDER_MOTION.moveRate,SPIDER_MOTION.moveAccel);
  s.steps+=Math.abs(s.body.rate)*dt*1.7;
  let mx=Math.sin(s.move.yaw),mz=Math.cos(s.move.yaw);
  // A blind spider still follows the flow field around cover, but its turning
  // inertia must not carry that path into melee range. Remove only the inward
  // part of its step near the prey; the remaining tangent rounds the corner.
  const prey=z._tp?.position;
  if(z.tactics==='spit'&&!spiderHeadless(z)&&prey&&z.mesh?.position){
    const dx=prey.x-z.mesh.position.x,dz=prey.z-z.mesh.position.z,d=Math.hypot(dx,dz);
    if(d>1e-6&&d<7&&(dx*tx+dz*tz)/(d*Math.hypot(tx,tz))>.95){
      const ux=dx/d,uz=dz/d,desiredIn=sx*ux+sz*uz;
      if(z.lineClear===false||desiredIn<-.5){
        const inward=Math.max(0,mx*ux+mz*uz);
        if(inward>0){
          mx-=inward*ux;mz-=inward*uz;
          let side=Math.hypot(mx,mz);
          if(side<1e-4){const sign=Math.sign(ux*sz-uz*sx)||1;mx=-uz*sign;mz=ux*sign;side=1;}
          mx/=side;mz/=side;
        }
      }
    }
  }
  return {yaw:s.body.yaw,x:mx,z:mz,rate:s.body.rate,pace:.45+.55*Math.max(0,Math.cos(angle(want-s.body.yaw)))};
}
export function spiderFacing(z,dx,dz){const n=Math.hypot(dx,dz);return n<1e-6||(Math.sin(z.mesh.rotation.y)*dx+Math.cos(z.mesh.rotation.y)*dz)/n>=.75;}
export function spiderGait(z,phase,moving){const s=states.get(z);return {phase:phase+(s?.steps||0),amount:moving?1:Math.max(.12,Math.min(.8,Math.abs(s?.body.rate||0)/SPIDER_MOTION.rate))};}
export function spiderMotionState(z){const s=states.get(z);return s?{yaw:s.body.yaw,rate:s.body.rate,moveYaw:s.move.yaw,moveRate:s.move.rate,steps:s.steps}:null;}
export function spiderMouthPoint(z,out){
  const u=z.mesh.userData,scale=u.head.position.z/.64;
  z.mesh.updateMatrixWorld(true);
  return out.set(0,-.08*scale,.20*scale).applyMatrix4(u.head.matrixWorld);
}
export function applySpiderMotion(T,z){
  if(!z.spider||!enabled||z.farLod||interrupted(z))return;
  const u=z.mesh.userData,r=u.rest||{};if(!u.hips||!u.torso||!u.head)return;
  let p=poses.get(z);
  if(!p){const objects=[u.hips,u.torso,u.head,...(u.crawlLimbs||[]).slice(0,2).flatMap(l=>[l.root,l.knee])];p={parts:objects.map(object=>({object,q:object.quaternion.clone()})),hips:u.hips,y:0,saved:false,up:new T.Vector3(0,1,0),direction:new T.Vector3(),q:new T.Quaternion()};poses.set(z,p);}
  for(const part of p.parts)part.q.copy(part.object.quaternion);p.y=u.hips.position.y;p.saved=true;
  const wind=z.spiderSpitWind>0?smooth(1-z.spiderSpitWind/SPIDER_MOTION.wind):0;
  const snap=z.spiderSpitSnap>0?Math.sin(Math.PI*z.spiderSpitSnap/SPIDER_MOTION.snap):0;
  const bank=clamp((states.get(z)?.body.rate||0)*.022,-.06,.06);
  u.hips.rotation.z+=bank;u.hips.position.y-=wind*.025;
  u.torso.rotation.x=(r.torsoRX||0)-wind*.09+snap*.09;
  u.head.rotation.x=(r.headRX||0)-wind*.24+snap*.30;
  u.head.rotation.z=-bank*.6;
  for(const l of (u.crawlLimbs||[]).slice(0,2))l.knee.rotateOnAxis(l.bendAxis,-wind*.12-snap*.06);
  const panic=panics.get(z);
  if(panic?.active){
    const t=panic.elapsed,k=smooth(t/.10)*smooth((SPIDER_TOUCH.duration-t)/.25);
    u.hips.position.y+=k*(.035+Math.sin(t*32)*.015);u.hips.rotation.z+=Math.sin(t*27)*.09*k;
    u.torso.rotation.x-=.12*k;u.torso.rotation.y+=Math.sin(t*24)*.14*k;
    for(const [i,l] of (u.crawlLimbs||[]).slice(0,2).entries()){
      if(z.partsLost?.[i?'armR':'armL'])continue;
      const phase=(t-SPIDER_TOUCH.beats[0])*Math.PI*2/.8-i*Math.PI,lift=(1-Math.cos(phase))*.5;
      p.direction.set(l.side*(.55+Math.sin(phase)*.30),.40+lift*.50,.65+(1-lift)*.35).normalize();
      p.q.setFromUnitVectors(p.up,p.direction);l.root.quaternion.slerp(p.q,k);l.knee.rotateOnAxis(l.bendAxis,(-.25-lift*.65)*k);
    }
  }
}
export function resetSpiderPose(mesh){for(const l of mesh.userData.crawlLimbs||[]){l.root.quaternion.copy(l.baseQ);l.knee.quaternion.copy(l.kneeQ);}}

// A complete Spider corpse keeps its back upright and gathers all six legs below it.
export function beginSpiderDeath(T,c){
  if(c.typeKey!=='spider')return;
  const u=c.mesh.userData;c.style='spider-curl';c.fallT=.72;
  c.spiderCurl={hips:u.hips.quaternion.clone(),torso:u.torso.quaternion.clone(),head:u.head.quaternion.clone(),hipTo:new T.Quaternion(),torsoTo:new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),.07),headTo:new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),.20),y:u.hips.position.y,limbs:[]};
  const up=new T.Vector3(0,1,0);
  for(const [i,l] of (u.crawlLimbs||[]).entries()){
    const pair=Math.floor(i/2),forward=[-.22,0,.26][pair],dU=new T.Vector3(l.side*.65,-.62,forward).normalize();
    const rootQ=new T.Quaternion().setFromUnitVectors(up,dU);
    const dL=new T.Vector3(-l.side*.83,.54,-forward*.4).normalize().applyQuaternion(rootQ.clone().invert());
    c.spiderCurl.limbs.push({limb:l,from:l.root.quaternion.clone(),kneeFrom:l.knee.quaternion.clone(),to:rootQ,kneeTo:new T.Quaternion().setFromUnitVectors(up,dL)});
  }
}
export function applySpiderDeath(T,c){
  const s=c.spiderCurl;if(!s)return;
  const m=c.mesh,u=m.userData,t=smooth(c.t/c.fallT),scale=u.head.position.z/.64;
  m.rotation.set(0,c.yaw,0);m.position.y=c.baseY;
  u.hips.quaternion.slerpQuaternions(s.hips,s.hipTo,t);u.hips.position.y=s.y+(.37*scale-s.y)*t;
  u.torso.quaternion.slerpQuaternions(s.torso,s.torsoTo,t);
  u.head.quaternion.slerpQuaternions(s.head,s.headTo,t);
  for(const p of s.limbs){p.limb.root.quaternion.slerpQuaternions(p.from,p.to,t);p.limb.knee.quaternion.slerpQuaternions(p.kneeFrom,p.kneeTo,t);}
}
