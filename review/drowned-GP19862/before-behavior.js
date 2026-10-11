// GP-19860: a short, committed grab. State belongs to actors, never pooled meshes.
export const DROWNED = Object.freeze({wind:.65,drag:.95,recover:.65,cooldown:5.8,safe:2.2,reachPad:.55,height:1.1,cone:.65,pullSpeed:.9,maxPull:.86,pace:.22,douseRadius:2,fireRadius:1.6,douseEvery:.12,fireAgeRate:8});
let states=new WeakMap(),owners=new WeakMap(),safeUntil=new WeakMap(),wet=new WeakMap();
let enabled=true;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const u=clamp(v);return u*u*(3-2*u);};
const eligible=z=>z?.typeKey==='drowned'&&z.alive&&!z.crawling&&!z.hopping&&!z.sleeping&&!(z.riseT>0)&&!(z.belowRiseT>0)&&!(z.knockT>0)&&!(z.getUpT>0)&&!z.windowClimb&&!z.abilityBusy&&!z.partsLost?.head&&!z.partsLost?.armL&&!z.partsLost?.armR;
function unhold(z,s){if(s.target&&owners.get(s.target)===z){owners.delete(s.target);safeUntil.set(s.target,s.now+DROWNED.safe);}}
function recover(z,s,miss=false){unhold(z,s);s.phase='recover';s.t=0;s.miss=miss;s.cd=DROWNED.cooldown;s.caught=false;}
export function restoreDrownedPose(z){const s=states.get(z);if(s?.saved){for(const [o,k,v] of s.saved)o[k]=v;s.saved=null;}}
export function resetDrowned(z){restoreDrownedPose(z);const s=states.get(z);if(s)unhold(z,s);states.delete(z);wet.delete(z);}
export function clearDrowned(zombies=[]){for(const z of zombies)resetDrowned(z);states=new WeakMap();owners=new WeakMap();safeUntil=new WeakMap();wet=new WeakMap();}
export function setDrownedEnabled(value){enabled=!!value;}
export function breakDrownedGrip(target){const z=owners.get(target),s=z&&states.get(z);if(!s)return false;recover(z,s);return true;}
export function releaseDrowned(z){const s=states.get(z);if(s&&s.phase!=='idle'&&s.phase!=='recover')recover(z,s);}
export function drownedGrip(target){const z=owners.get(target),s=z&&states.get(z);if(!eligible(z)||s?.phase!=='drag'){if(z&&s)recover(z,s);return null;}return z;}
export function drownedPace(target){return drownedGrip(target)?DROWNED.pace:1;}
export function drownedState(z){const s=states.get(z);return s?{phase:s.phase,t:s.t,cd:s.cd,x:s.x,z:s.z,yaw:s.yaw,pulled:s.pulled,miss:s.miss}:null;}
export function stepDrowned(z,dt,c){
  if(z.typeKey!=='drowned')return null;
  let s=states.get(z);if(!s){s={phase:'idle',t:0,cd:0,x:0,z:1,yaw:0,target:null,pulled:0,now:0,saved:null};states.set(z,s);}
  const h=clamp(dt,0,.1);s.now=c.now;s.caught=false;s.started=false;s.cd=Math.max(0,s.cd-h);
  if(!enabled||!eligible(z)){if(s.phase==='wind'||s.phase==='drag')recover(z,s);return null;}
  const p=c.target?.position,q=z.mesh.position;
  const dx=p?p.x-q.x:0,dz=p?p.z-q.z:0,d=Math.hypot(dx,dz),reach=z.radius+c.radius+DROWNED.reachPad;
  const clear=c.valid&&p&&Number.isFinite(dx+dz+p.y)&&Math.abs(p.y-q.y)<DROWNED.height&&!c.blocked;
  const facing=d>1e-6?(Math.sin(z.mesh.rotation.y)*dx+Math.cos(z.mesh.rotation.y)*dz)/d:1;
  if(s.phase==='idle'){
    if(clear&&c.canStart&&!c.dodging&&s.cd<=0&&!owners.has(c.target)&&!(safeUntil.get(c.target)>c.now)&&d<=reach&&facing>DROWNED.cone){
      s.phase='wind';s.t=0;s.target=c.target;s.x=d>1e-6?dx/d:Math.sin(z.mesh.rotation.y);s.z=d>1e-6?dz/d:Math.cos(z.mesh.rotation.y);s.yaw=Math.atan2(s.x,s.z);s.pulled=0;s.miss=false;s.started=true;
      z.attackWindup=0;z.swingT=0;z._pendingAttack=null;z.hzLungeT=0;
    }
  }else{
    s.t+=h;
    if(s.phase==='wind'&&s.t>=DROWNED.wind){
      const cone=d>1e-6?(s.x*dx+s.z*dz)/d:1;
      if(clear&&!c.dodging&&c.target===s.target&&d<=reach&&cone>DROWNED.cone&&!owners.has(s.target)&&!(safeUntil.get(s.target)>c.now)){
        s.phase='drag';s.t=0;s.caught=true;owners.set(s.target,z);
      }else recover(z,s,true);
    }else if(s.phase==='drag'){
      if(!clear||c.dodging||c.target!==s.target||d>reach+.45||s.t>=DROWNED.drag||s.pulled>=DROWNED.maxPull)recover(z,s);
    }else if(s.phase==='recover'&&s.t>=DROWNED.recover){s.phase='idle';s.target=null;}
  }
  if(s.phase==='idle')return null;
  return {phase:s.phase,yaw:s.yaw,x:s.phase==='drag'?-s.x:s.x,z:s.phase==='drag'?-s.z:s.z,speed:s.phase==='drag'?DROWNED.pullSpeed:(s.phase==='recover'&&s.miss ? .42*(1-smooth(s.t/.3)) : 0),started:s.started,caught:s.caught,target:s.target};
}
// Only the body's resolved backward travel can pull its victim; crowd pushes cannot add range.
export function drownedPull(z,dx,dz){
  const s=states.get(z);if(s?.phase!=='drag'||owners.get(s.target)!==z||!Number.isFinite(dx+dz))return null;
  const amount=Math.min(Math.max(0,-dx*s.x-dz*s.z),DROWNED.maxPull-s.pulled,.09);
  if(amount<=0)return null;s.pulled+=amount;return {target:s.target,x:-s.x*amount,z:-s.z*amount};
}
export function smotherDrownedFires(zombies,fires,dt,blocked=()=>false){
  if(!enabled)return [];
  const events=[];
  for(const z of zombies){
    if(z.typeKey!=='drowned'||!z.alive||z.sleeping||z.poiGuard&&!z.poiAwake||z.riseT>0||z.belowRiseT>0)continue;
    let s=wet.get(z);if(!s){s={elapsed:DROWNED.douseEvery,puff:0};wet.set(z,s);}
    s.elapsed+=clamp(dt,0,.1);s.puff-=dt;if(s.elapsed<DROWNED.douseEvery)continue;
    const elapsed=s.elapsed;s.elapsed=0;const p=z.mesh.position;let cooled=false;
    for(const o of zombies){
      if(!o.alive||!(o.burnT>0))continue;const q=o.mesh.position;
      if(Math.hypot(p.x-q.x,p.z-q.z)<=DROWNED.douseRadius&&Math.abs(p.y-q.y)<DROWNED.height&&(o===z||!blocked(p,q))){o.burnT=0;o.burnDefense=false;cooled=true;}
    }
    for(const f of fires){
      if(Math.hypot(p.x-f.x,p.z-f.z)>DROWNED.fireRadius||Math.abs(p.y-f.y)>DROWNED.height||blocked(p,f))continue;
      f.age+=DROWNED.fireAgeRate*elapsed;cooled=true;
    }
    if(cooled&&s.puff<=0){events.push({x:p.x,y:p.y+.65,z:p.z});s.puff=.55;}
  }
  return events;
}
export function applyDrownedPose(z){
  const s=states.get(z);if(!s||s.phase==='idle'||!eligible(z)||z.farLod||!enabled)return;
  const u=z.mesh.userData,parts=z.partsLost||{};s.saved=[];
  const set=(o,k,v)=>{if(!o)return;s.saved.push([o,k,o[k]]);o[k]=v;};
  const wind=s.phase==='wind'?smooth(s.t/DROWNED.wind):0,hold=s.phase==='drag'?1:0;
  const miss=s.phase==='recover'&&s.miss?Math.sin(Math.PI*clamp(s.t/DROWNED.recover)):0;
  const settle=s.phase==='recover'?1-smooth(s.t/DROWNED.recover):1;
  const reach=s.phase==='recover'?settle:wind||hold;
  set(u.torso?.rotation,'x',(u.rest?.torsoRX||0)-.14*wind+.20*hold+.34*miss);
  set(u.torso?.rotation,'y',(u.rest?.torsoRY||0)+Math.sin(s.t*7)*.025*hold);
  set(u.hips?.position,'z',-.08*wind-.09*hold+.13*miss);
  if(u.hips)set(u.hips.position,'y',u.hips.position.y-.035*wind-.065*hold-.07*miss);
  if(u.head&&!parts.head)set(u.head.rotation,'x',(u.rest?.headRX||0)+.12*reach+.18*miss);
  for(const [arm,side] of [[u.armLG,-1],[u.armRG,1]]){
    if(!arm)continue;
    set(arm.rotation,'x',arm.rotation.x*(1-reach)+(-1.48+.12*hold)*reach-.15*miss);
    set(arm.rotation,'z',-side*(.22*reach+.35*miss));
    set(arm.rotation,'y',side*.10*reach);
    set(arm.userData.elbowG?.rotation,'x',-(.28*wind+.82*hold+.48*settle*(s.phase==='recover')));
  }
  if(hold&&!z.inWater)for(const leg of [u.legLG,u.legRG])if(leg)set(leg.rotation,'x',-leg.rotation.x);
}
