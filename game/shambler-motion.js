// GP-19852: marine clip footwork retargeted to the Shambler's longer legs.
// Collision steering, movement speed, reach and combat poses remain the game's.
import { createTurnSteps, turnAngle } from '../studio/marine-turn.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const states=new WeakMap();
let enabled=true;
export const setShamblerMotionEnabled=value=>{enabled=!!value;}; // same-scene QA comparison
function splitBootSurface(T,shin){
  // Concept bodies already batch each shin. Split its boot-coloured triangles
  // before skin binding; retain every original vertex/UV/colour and shared template.
  const leather=new T.Color(0x594834),sole=new T.Color(0x27251f),feet=[];
  for(const mesh of [...shin.children]){
    const src=mesh.geometry;if(!mesh.isMesh||!src?.attributes.color)continue;
    const geo=src.index?src.toNonIndexed():src,P=geo.attributes.position,C=geo.attributes.color;
    const foot=[],leg=[];
    for(let i=0;i<P.count;i+=3){
      const y=(P.getY(i)+P.getY(i+1)+P.getY(i+2))/3;
      const same=c=>Math.abs(C.getX(i)-c.r)+Math.abs(C.getY(i)-c.g)+Math.abs(C.getZ(i)-c.b)<1e-5;
      const boot=same(leather)||(same(sole)&&y<-.2*Math.abs(shin.position.y)/.38)||y<-.365*Math.abs(shin.position.y)/.38;
      (boot?foot:leg).push(i,i+1,i+2);
    }
    if(!foot.length)continue;
    const part=indices=>{const out=new T.BufferGeometry();for(const [name,a] of Object.entries(geo.attributes)){const data=new a.array.constructor(indices.length*a.itemSize);indices.forEach((n,j)=>{for(let k=0;k<a.itemSize;k++)data[j*a.itemSize+k]=a.array[n*a.itemSize+k];});out.setAttribute(name,new T.BufferAttribute(data,a.itemSize,a.normalized));}out.computeBoundingSphere();return out;};
    const boot=new T.Mesh(part(foot),mesh.material);boot.position.copy(mesh.position);boot.quaternion.copy(mesh.quaternion);boot.scale.copy(mesh.scale);boot.castShadow=mesh.castShadow;shin.add(boot);feet.push(boot);
    mesh.geometry=part(leg);
    if(geo!==src)geo.dispose();
  }
  return feet;
}
export function prepareShamblerFeet(T,mesh,scale=1){
  const u=mesh.userData;
  for(const leg of [u.legLG,u.legRG]){
    const shin=leg?.userData.shinG;if(!shin||leg.userData.shamblerAnkle)continue;
    let boots=shin.children.filter(o=>o.isMesh&&o.position.y<-.28*scale);
    if(!boots.length)boots=splitBootSurface(T,shin);
    if(!boots.length)continue;
    const ankle=new T.Group();ankle.name='shambler-ankle';ankle.position.set(0,-.36*scale,.04*scale);
    shin.add(ankle);
    for(const boot of boots){boot.position.sub(ankle.position);ankle.add(boot);}
    leg.userData.shamblerAnkle=ankle;
    leg.userData.shamblerFootY=u.baseHipsY+leg.position.y+shin.position.y+ankle.position.y;
  }
}
export function resetShamblerMotion(z){
  if(z.typeKey!=='shambler')return;
  const u=z.mesh.userData;
  if(u.hips)u.hips.rotation.y=u.rest?.hipsRY||0;
  for(const leg of [u.legLG,u.legRG]){if(!leg)continue;leg.rotation.y=leg.rotation.z=0;leg.userData.shamblerAnkle?.rotation.set(0,0,0);}
}
export function shamblerLeg(ry,rz,A,B){
  const d=clamp(Math.hypot(ry,rz),.01,A+B-1e-5);
  const knee=Math.PI-Math.acos(clamp((A*A+B*B-d*d)/(2*A*B),-1,1));
  const thigh=Math.atan2(-rz,-ry)-Math.acos(clamp((A*A+d*d-B*B)/(2*A*d),-1,1));
  return {thigh,knee};
}
export function applyShamblerMotion(z,dt,phase,amount,sampleGait){
  if(z.typeKey!=='shambler'||!z.alive)return;
  if(!enabled){states.delete(z);return;}
  const u=z.mesh.userData,p=z.mesh.position,yaw=z.mesh.rotation.y;
  const suppressed=z.shamblerRecoveryActive||z.farLod||z.crawling||z.hopping||z.sleeping||z.poiGuard&&!z.poiAwake||z.riseT>0||z.belowRiseT>0||z.knockT>0||z.getUpT>0||z.windowClimb||z.hitReact>0||z.hitPartT>0||z.attackWindup>0||z.swingT>0||z.partsLost?.legL||z.partsLost?.legR;
  if(suppressed||!u.hips||!u.torso){states.delete(z);return;}
  let s=states.get(z);
  if(!s||Math.hypot(p.x-s.x,p.z-s.z)>3||dt>.15){s={x:p.x,z:p.z,hipYaw:yaw,turn:createTurnSteps(yaw),moving:false};states.set(z,s);}
  const dx=p.x-s.x,dz=p.z-s.z,speed=Math.hypot(dx,dz)/Math.max(.001,dt);
  s.x=p.x;s.z=p.z;
  const moving=amount>.02;
  const G=moving?sampleGait(((phase/(2*Math.PI))%1+1)%1,clamp((speed-2.1)/2.6,0,1)):null;
  if(moving&&!G)return;
  if(moving){
    const travel=speed>.05?Math.atan2(dx,dz):yaw;
    const want=yaw+clamp(turnAngle(travel-yaw),-.85,.85),error=turnAngle(want-s.hipYaw);
    s.hipYaw+=error*(1-Math.exp(-(9+16*Math.min(1,Math.abs(error)/.8))*dt));
    s.turn=null;
  }else{
    s.turn ||= createTurnSteps(s.hipYaw);
    const feet=s.turn.step(dt,yaw),lag=turnAngle(yaw-feet.yaw);
    s.hipYaw=feet.yaw+clamp(lag*.5,-.45,.45);
    const extra=turnAngle(yaw-s.hipYaw);
    if(Math.abs(extra)>.96){const pivot=extra-Math.sign(extra)*.96;s.turn.pivot(pivot);s.hipYaw+=pivot;}
  }
  const hips=u.hips,hipRel=clamp(turnAngle(s.hipYaw-yaw),-.96,.96),scale=Math.abs(u.legLG.userData.shinG.position.y)/.38;
  hips.rotation.y=(u.rest?.hipsRY||0)+hipRel;
  // The torso is a child of the hips in this rig: undo their steering so the reach stays on the target.
  u.torso.rotation.y-=hipRel;
  const legScale=.74/.5202;
  if(moving){
    hips.position.y=u.baseHipsY+G.bob*.75*legScale*scale*amount;
    hips.rotation.z=(u.rest?.hipsRZ||0)+Math.sin(phase)*.035*amount;
    u.torso.rotation.y+=G.twist*.2*amount;
  }
  for(const [i,side] of ['L','R'].entries()){
    const leg=i?u.legRG:u.legLG,shin=leg.userData.shinG,ankle=leg.userData.shamblerAnkle;
    if(!ankle)continue;
    let ry,rz;
    if(moving){
      const thigh=G['thigh'+side],knee=G['knee'+side];
      const my=-.27*Math.cos(thigh)-.2502*Math.cos(thigh+knee);
      const mz=-.27*Math.sin(thigh)-.2502*Math.sin(thigh+knee);
      const footY=leg.userData.shamblerFootY+Math.max(0,.62+G.bob+my-.1)*legScale*scale;
      ry=footY-hips.position.y-leg.position.y;rz=mz*legScale*scale-.04*scale;
      leg.rotation.y=0;
    }else{
      const f=s.turn.state,lift=f.swing===i?f.lift*.085*scale:0;
      ry=leg.userData.shamblerFootY+lift-hips.position.y-leg.position.y;rz=-.04*scale;
      leg.rotation.y=clamp(turnAngle(f.feet[i]-s.hipYaw),-.6,.6);
    }
    const pose=shamblerLeg(ry,rz,.38*scale,.36*scale);
    leg.rotation.x=pose.thigh;shin.rotation.x=pose.knee;
    ankle.rotation.x=-(hips.rotation.x+pose.thigh+pose.knee);
    ankle.rotation.z=-hips.rotation.z;
  }
  s.moving=moving;
}
