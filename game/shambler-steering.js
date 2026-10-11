// GP-19854: turn the pursuit direction itself, so the body and feet follow an arc.
const states=new WeakMap();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const SHAMBLER_TURN=Object.freeze({rate:2.3,accel:8,response:.2,minPace:.30,reachCos:.5});
let enabled=true;
export const setShamblerSteeringEnabled=value=>{enabled=!!value;}; // same-scene QA
export const turnDelta=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const hasShamblerSteering=z=>enabled&&z.typeKey==='shambler'&&states.has(z);
const overridden=z=>!z.alive||z.crawling||z.hopping||z.sleeping||z.poiGuard&&!z.poiAwake||z.riseT>0||z.belowRiseT>0||z.knockT>0||z.getUpT>0||z.windowClimb||z.abilityBusy||z.hitReact>0||z.hitPartT>0||z.shamblerRecoveryActive;
export function steerShambler(z,dx,dz,dt){
  if(z.typeKey!=='shambler')return null;
  if(!enabled||overridden(z)){states.delete(z);return null;}
  if(!Number.isFinite(dx+dz+dt)||Math.hypot(dx,dz)<1e-6)return null;
  let s=states.get(z);
  // The mesh's live heading is authoritative after an interruption or idle pose.
  if(!s||Math.abs(turnDelta(s.yaw-z.mesh.rotation.y))>.12){s={yaw:z.mesh.rotation.y,rate:0,side:0};states.set(z,s);}
  if(z.attackWindup>0||z.swingT>0){s.yaw=z.mesh.rotation.y;s.rate=0;s.side=0;return {x:Math.sin(s.yaw),z:Math.cos(s.yaw),yaw:s.yaw,pace:1,rate:0};}
  const want=Math.atan2(dx,dz),elapsed=clamp(dt,0,.1),n=Math.max(1,Math.ceil(elapsed*120)),h=elapsed/n;
  for(let i=0;i<n;i++){
    let error=turnDelta(want-s.yaw);
    // Nearly behind him: keep the chosen shoulder instead of twitching between
    // left and right when a moving target crosses the +/-PI seam.
    if(Math.abs(error)>2.6&&s.side&&Math.sign(error)!==s.side)error+=s.side*Math.PI*2;
    if(Math.abs(error)<2.4)s.side=0;
    else s.side ||= Math.sign(error)||1;
    const wantedRate=clamp(error/SHAMBLER_TURN.response,-SHAMBLER_TURN.rate,SHAMBLER_TURN.rate);
    const oldRate=s.rate;s.rate+=clamp(wantedRate-s.rate,-SHAMBLER_TURN.accel*h,SHAMBLER_TURN.accel*h);
    let step=(oldRate+s.rate)*.5*h;
    if(Math.sign(step)===Math.sign(error)&&Math.abs(step)>Math.abs(error)){step=error;s.rate=0;}
    s.yaw=turnDelta(s.yaw+step);
  }
  const alignment=Math.max(0,Math.cos(turnDelta(want-s.yaw)));
  return {x:Math.sin(s.yaw),z:Math.cos(s.yaw),yaw:s.yaw,rate:s.rate,pace:SHAMBLER_TURN.minPace+(1-SHAMBLER_TURN.minPace)*alignment};
}
export function shamblerCanReach(z,dx,dz){
  if(!enabled||z.typeKey!=='shambler'||z.crawling||z.hopping)return true;
  const d=Math.hypot(dx,dz);
  return d<1e-5||(Math.sin(z.mesh.rotation.y)*dx+Math.cos(z.mesh.rotation.y)*dz)/d>=SHAMBLER_TURN.reachCos;
}
