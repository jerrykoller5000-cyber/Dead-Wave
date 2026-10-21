// GP-19866: planted weight, committed close-range smash and angry miss recovery.
import {shamblerLeg} from './shambler-motion.js';
export const BRUTE=Object.freeze({turnRate:1.6,turnAccel:3.4,response:.34,stride:2,stance:.6,lift:.085,wind:.78,strike:.24,impact:.105,missRecover:1.15,hitRecover:.65,cooldown:2.65,startRange:1.95,reach:1.72,reachY:1.2});
let states=new WeakMap(),poses=new WeakMap(),enabled=true;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
const ease=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
const unavailable=z=>!z.alive||z.crawling||z.hopping||z.partsLost?.head||z.partsLost?.legL||z.partsLost?.legR||z.partsLost?.armL||z.partsLost?.armR||z.riseT>0||z.belowRiseT>0||z.knockT>0||z.getUpT>0||z.inWater||z.windowClimb||z.sleeping||z.poiGuard&&!z.poiAwake||z.abilityBusy;
export const setBruteEnabled=v=>{enabled=!!v;}; // private paired QA
export const bruteState=z=>states.get(z);
export function restoreBrutePose(z){const q=poses.get(z);if(q?.saved){for(const[o,k,v]of q.saved)o[k]=v;q.saved=null;}}
export function resetBrute(z){if(z.typeKey!=='brute')return;restoreBrutePose(z);states.delete(z);poses.delete(z);for(const l of[z.mesh.userData.legLG,z.mesh.userData.legRG])l?.userData.shamblerAnkle?.rotation.set(0,0,0);}
export function bruteCanReach(z,dx,dz){if(!enabled||z.typeKey!=='brute'||unavailable(z))return true;const d=Math.hypot(dx,dz);return !d||(Math.sin(z.mesh.rotation.y)*dx+Math.cos(z.mesh.rotation.y)*dz)/d>.5;}
export function stepBrute(z,dt,c){
  if(z.typeKey!=='brute')return null;
  if(!enabled||unavailable(z)||!c.valid){resetBrute(z);return null;}
  const h=clamp(dt,0,.1),p=z.mesh.position;
  let s=states.get(z);if(!s){s={yaw:z.mesh.rotation.y,rate:0,side:0,phase:'idle',t:0,connected:false};states.set(z,s);}
  if(Math.abs(angle(s.yaw-z.mesh.rotation.y))>.15)s.yaw=z.mesh.rotation.y;
  const old=s.phase;let hit=false,impact=false;
  if(s.phase!=='idle'&&(!s.victim||s.victim.alive===false||s.victim.hp<=0)){s.phase='idle';s.t=0;s.victim=null;}
  const target=c.target.position,dist=Math.hypot(target.x-p.x,target.z-p.z);
  if(s.phase==='idle'&&c.canStart&&z.attackCd<=dt+.001&&dist<BRUTE.startRange&&Math.abs(target.y-p.y)<BRUTE.reachY&&bruteCanReach(z,target.x-p.x,target.z-p.z)&&!c.blocked(p,target)){
    s.phase='wind';s.t=0;s.committedYaw=s.yaw;s.connected=false;s.checked=false;s.victim=c.target;
  }
  s.t+=h;
  if(s.phase==='wind'&&s.t>=BRUTE.wind){s.phase='strike';s.t=0;}
  if(s.phase==='strike'){
    if(!s.checked&&s.t>=BRUTE.impact){
      s.checked=true;impact=true;const v=s.victim.position,dx=v.x-p.x,dz=v.z-p.z,d=Math.hypot(dx,dz);
      hit=d<BRUTE.reach&&Math.abs(v.y-p.y)<BRUTE.reachY&&(!d||(Math.sin(s.committedYaw)*dx+Math.cos(s.committedYaw)*dz)/d>.6)&&!c.dodging(s.victim)&&!c.blocked(p,v);s.connected=hit;
    }
    if(s.t>=BRUTE.strike){s.phase=s.connected?'recover':'miss';s.t=0;}
  }else if((s.phase==='miss'&&s.t>=BRUTE.missRecover)||(s.phase==='recover'&&s.t>=BRUTE.hitRecover)){s.phase='idle';s.t=0;s.victim=null;}
  const busy=s.phase!=='idle';
  if(busy){s.yaw=s.committedYaw;s.rate=0;return{x:Math.sin(s.yaw),z:Math.cos(s.yaw),yaw:s.yaw,speed:0,busy:true,controlsAttack:true,hit,impact,victim:s.victim,started:s.phase!==old?s.phase:null};}
  // Acceleration-limited yaw with a held turn side prevents 180-degree ping-pong.
  const want=Math.atan2(c.x,c.z),n=Math.max(1,Math.ceil(h*120)),delta=h/n;
  for(let i=0;i<n;i++){
    let error=angle(want-s.yaw);if(Math.abs(error)>2.6&&s.side&&Math.sign(error)!==s.side)error+=s.side*Math.PI*2;
    if(Math.abs(error)<2.4)s.side=0;else s.side ||= Math.sign(error)||1;
    const desired=clamp(error/BRUTE.response,-BRUTE.turnRate,BRUTE.turnRate),oldRate=s.rate;s.rate+=clamp(desired-s.rate,-BRUTE.turnAccel*delta,BRUTE.turnAccel*delta);
    let turn=(oldRate+s.rate)*.5*delta;if(Math.sign(turn)===Math.sign(error)&&Math.abs(turn)>Math.abs(error)){turn=error;s.rate=0;}s.yaw=angle(s.yaw+turn);
  }
  const alignment=Math.max(0,Math.cos(angle(want-s.yaw)));
  return{x:Math.sin(s.yaw),z:Math.cos(s.yaw),yaw:s.yaw,speed:c.speed*(.2+.8*alignment),busy:false,controlsAttack:true,hit,impact,victim:null,started:s.phase!==old?s.phase:null};
}
export function applyBrutePose(z,dt){
  if(z.typeKey!=='brute'||!enabled||unavailable(z)||z.farLod)return;
  const state=states.get(z),u=z.mesh.userData,p=z.mesh.position;if(!state||!u.hips||!u.torso)return;
  const busy=state.phase!=='idle';if(!busy&&(z.attackWindup>0||z.swingT>0||z.hitReact>0||z.hitPartT>0)){poses.delete(z);return;}
  let q=poses.get(z);if(!q){q={x:p.x,z:p.z,yaw:z.mesh.rotation.y,hipYaw:z.mesh.rotation.y,phase:0,weight:0,saved:null};poses.set(z,q);}
  const scale=Math.abs(u.legLG.userData.shinG.position.y)/.38,travel=Math.hypot(p.x-q.x,p.z-q.z),turn=angle(z.mesh.rotation.y-q.yaw),h=clamp(dt,0,.1);q.x=p.x;q.z=p.z;q.yaw=z.mesh.rotation.y;
  if(travel<3&&!busy)q.phase=(q.phase+travel*2*Math.PI/(BRUTE.stride*scale)+Math.abs(turn)*.55)%(2*Math.PI);
  q.weight+=((!busy&&(travel>.0005||Math.abs(turn)>.0005)?1:0)-q.weight)*(1-Math.exp(-7*h));
  q.hipYaw=angle(q.hipYaw+angle(q.yaw-q.hipYaw)*(1-Math.exp(-5*h)));
  const lag=clamp(angle(q.hipYaw-q.yaw),-.4,.4),ph=q.phase,w=q.weight,rest=u.rest||{},wind=state.phase==='wind',strike=state.phase==='strike',miss=state.phase==='miss';
  const coil=wind?ease(state.t/BRUTE.wind):0,slam=strike?ease(state.t/BRUTE.strike):0,settle=state.phase==='recover'?ease(state.t/BRUTE.hitRecover):miss?ease((state.t-.25)/.75):0;
  const lean=wind?-.18*coil:strike?-.18+1.18*slam:busy?1.0*(1-settle)+.09*settle:.08*w;
  const drop=wind?.12+.025*coil:strike?.145+.195*slam:busy?.34*(1-settle)+.12*settle:.14*w;
  const shake=miss&&state.t>.35?Math.sin((state.t-.35)*19)*.33*Math.sin(clamp((state.t-.35)/.8,0,1)*Math.PI):0;
  q.saved=[];const set=(o,k,v)=>{if(!o)return;q.saved.push([o,k,o[k]]);o[k]=v;};
  set(u.hips.position,'y',u.baseHipsY+(-drop+(!busy?.028*(1-Math.cos(ph*2))*w:0))*scale);
  set(u.hips.position,'x',busy?0:Math.sin(ph)*.045*scale*w);set(u.hips.position,'z',busy?(wind?-.04*coil:strike?.11*slam:.11*(1-settle))*scale:0);
  set(u.hips.rotation,'y',busy?0:lag);set(u.hips.rotation,'z',busy?0:Math.sin(ph)*.055*w);
  set(u.torso.rotation,'x',(rest.torsoRX||0)+lean);set(u.torso.rotation,'y',busy?shake*.14:-lag*.8+Math.sin(ph)*.1*w);set(u.torso.rotation,'z',busy?shake*.11:-Math.sin(ph-.4)*.075*w);
  set(u.head.rotation,'x',(rest.headRX||0)+(wind?-.15*coil:strike?.22*slam:busy?.22*(1-settle):.035*w));set(u.head.rotation,'y',busy?shake:-lag*.2);set(u.head.rotation,'z',busy?shake*.3:-Math.sin(ph-.8)*.035*w);
  for(const[i,leg]of[u.legLG,u.legRG].entries()){
    const shin=leg.userData.shinG,ankle=leg.userData.shamblerAnkle;if(!shin||!ankle)continue;
    const cycle=((ph/(2*Math.PI)+i*.5)%1+1)%1,stance=cycle<BRUTE.stance,t=stance?cycle/BRUTE.stance:(cycle-BRUTE.stance)/(1-BRUTE.stance);
    const footZ=busy?(i?-.17:.17)*scale:(stance?.6*(1-2*t):.6*(2*ease(t)-1))*scale*w;
    const lift=busy||stance?0:Math.sin(t*Math.PI)*BRUTE.lift*scale*w;
    const side=i?1:-1;set(leg.position,'x',side*.185*scale);
    const ry=leg.userData.shamblerFootY+lift-u.hips.position.y-leg.position.y-Math.sin(u.hips.rotation.z)*leg.position.x;
    const pose=shamblerLeg(ry,footZ-u.hips.position.z,.38*scale,.36*scale);set(leg.rotation,'x',pose.thigh);set(leg.rotation,'y',busy?0:-lag*.2);set(shin.rotation,'x',pose.knee);set(ankle.rotation,'x',-(u.hips.rotation.x+pose.thigh+pose.knee));set(ankle.rotation,'z',-u.hips.rotation.z);
    const arm=i?u.armRG:u.armLG,el=arm.userData.elbowG;
    const armX=wind?-.2-2.4*coil:strike?-2.6+1.8*slam:busy?-.8*(1-settle)-.2*settle+shake*.3:-.14+Math.sin(ph+i*Math.PI-.4)*.2*w;
    set(arm.rotation,'x',armX);set(arm.rotation,'z',side*(busy?.16+Math.abs(shake)*.45:.14+Math.sin(ph+i*Math.PI)*.055*w));set(arm.rotation,'y',busy?side*shake*.25:side*.055*w);
    if(el)set(el.rotation,'x',wind?-.35-.45*coil:strike?-.8+.65*slam:busy?-.15-.35*settle:-.48+.10*Math.sin(ph+i*Math.PI)*w);
  }
}
