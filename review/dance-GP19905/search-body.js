(()=>{
  const {dance,marine}=window.__danceCapture,THREE=TT.THREE,u=marine.userData,wr=u.elbowRG.userData.wrist;
  const meshes=group=>{const out=[];group.traverseVisible(o=>{if(o.isMesh&&o.geometry?.attributes.position)out.push(o);});return out;};
  const rightArm=meshes(u.elbowRG),boots=[...meshes(u.ankleLG),...meshes(u.ankleRG)],torso=meshes(u.torsoG).filter(o=>{for(let n=o;n&&n!==u.torsoG;n=n.parent)if(n===u.armLG||n===u.armRG||n===u.headG)return false;return true;});
  const minY=objects=>{let lo=Infinity;for(const o of objects){const a=o.geometry.attributes.position,e=o.matrixWorld.elements;for(let i=0;i<a.count;i++)lo=Math.min(lo,e[1]*a.getX(i)+e[5]*a.getY(i)+e[9]*a.getZ(i)+e[13]);}return lo;};
  const results=[];
  function measure(config){
    window.__freezeProbeConfig=config;dance.sample(20);dance.root.updateWorldMatrix(true,true);
    const tw=new THREE.Quaternion(0,wr.quaternion.y,0,wr.quaternion.w).normalize(),sw=wr.quaternion.clone().multiply(tw.clone().invert());
    const wristDeg=2*Math.acos(Math.min(1,Math.abs(sw.w)))*180/Math.PI;
    const target=u.headG.localToWorld(new THREE.Vector3(config.cheekX??.145,config.cheekY??.18,config.cheekZ??.03));
    const palm=wr.localToWorld(new THREE.Vector3(0,-.048,.016));
    const r={config,wristDeg,elbow:u.elbowRG.getWorldPosition(new THREE.Vector3()).toArray(),elbowFlex:u.elbowRG.rotation.x,
      armLo:minY(rightArm),bootLo:minY(boots),torsoLo:minY(torso),palm:palm.toArray(),headContactError:palm.distanceTo(target),hip:dance.bodyRoot.getWorldPosition(new THREE.Vector3()).toArray()};
    r.score=Math.max(0,wristDeg-29)*.10+Math.max(0,r.armLo+.019)*5+Math.max(0,r.torsoLo-.10)*2+r.headContactError*10;
    results.push(r);return r;
  }
  const legs=[];measure({"freeX":-0.15,"freeY":0,"freeZ":0.2,"freeElbow":-0.5,"legZL":0,"legZR":-0.2,"rootRoll":-1.55,"rootPitch":0.2,"cheekY":0.18,"palmTilt":-0.8,"palmRoll":0.5235987755982988,"poleX":0.4,"poleY":-2,"poleZ":0});
  results.sort((a,b)=>a.score-b.score);window.__freezeProbeConfig=results[0].config;dance.sample(20);
  return {count:results.length,best:results.slice(0,12),bestLegs:legs.slice(0,3),finalAudit:window.__danceAuditAt(20)};
})()
