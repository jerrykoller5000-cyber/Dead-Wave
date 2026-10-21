import fs from 'node:fs';const file='index.html',src=fs.readFileSync(file,'utf8');let s=src;const edit=(a,b)=>{if(!s.includes(a))throw Error(a.slice(0,90));s=s.replace(a,b);};
edit('    function aimDiveGrip(anchor,arm,target){',`    const _diveIK={arm:new THREE.Quaternion(),elbow:new THREE.Quaternion(),wrist:new THREE.Quaternion(),point:new THREE.Vector3(),pole:new THREE.Vector3()};
    function holdDiveHand(arm,elbow,hand,anchor,channel,sign,pole,k,a){
      let roll=holdHand(arm,elbow,hand,anchor,channel,sign,pole,k,a);
      if(!diving()||diveFlatW<.5||k<.999)return roll;
      const left=elbow===marine.userData.elbowLG,wr=wristOf(elbow),I=_diveIK;
      let best=fistPointW(elbow,hand,left?gripAL:gripAR,I.point).distanceToSquared(anchor);
      if(best<.0001||!wr)return roll;
      I.arm.copy(arm.quaternion);I.elbow.copy(elbow.quaternion);I.wrist.copy(wr.quaternion);
      let turn=left?wristTurnL:wristTurnR,need=left?wristNeedL:wristNeedR;
      // Two anatomical elbow planes can unwind a steep aim without increasing the
      // wrist cap. Save the best real palm contact, not just the requested anchor.
      for(const z of [-.2,.2]){
        I.pole.set(left?-.6:.6,-.3,z);
        const candidate=holdHand(arm,elbow,hand,anchor,channel,sign,I.pole,k,a);
        const error=fistPointW(elbow,hand,left?gripAL:gripAR,I.point).distanceToSquared(anchor);
        if(error<best){best=error;roll=candidate;I.arm.copy(arm.quaternion);I.elbow.copy(elbow.quaternion);I.wrist.copy(wr.quaternion);turn=left?wristTurnL:wristTurnR;need=left?wristNeedL:wristNeedR;}
      }
      arm.quaternion.copy(I.arm);elbow.quaternion.copy(I.elbow);wr.quaternion.copy(I.wrist);arm.updateMatrixWorld(true);
      if(left){wristTurnL=turn;wristNeedL=need;}else{wristTurnR=turn;wristNeedR=need;}
      return roll;
    }
    function aimDiveGrip(anchor,arm,target){`);
edit('handRollR = holdHand(armR, ud.elbowRG, _HAND_R, anchor,','handRollR = holdDiveHand(armR, ud.elbowRG, _HAND_R, anchor,');
edit('handRollL = holdHand(armL, ud.elbowLG, _HAND_L, anchorL,','handRollL = holdDiveHand(armL, ud.elbowLG, _HAND_L, anchorL,');
if(fs.readFileSync(file,'utf8')!==src)throw Error('source changed');fs.writeFileSync(file,s);console.log('Bounded alternate elbow planes for steep aim');
