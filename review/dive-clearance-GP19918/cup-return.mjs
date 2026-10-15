import fs from 'node:fs';const file='index.html',src=fs.readFileSync(file,'utf8');let s=src;const edit=(a,b)=>{if(!s.includes(a))throw Error(a.slice(0,100));s=s.replace(a,b);};
edit('    function raiseDiveHold(anchor,height){',`    function fitDiveCup(anchor,gun,H,armL){
      if(!diving()||diveSideHoldR||akimboOn()||reloading||knifeAnimT>0||HANDS.fore[currentWeapon]!=='grip')return;
      // Clearance and smoothing can move the shared grip after the first reach
      // check. Rejoin the two reachable arm envelopes along the chest's lateral
      // axis, preserving the safe front plane instead of letting the cup hover.
      gun.getWorldScale(_hScale);
      _diveReach.set(H.fore[0]-H.grip[0],H.fore[1]-H.grip[1],H.fore[2]-H.grip[2]).multiply(_hScale).applyQuaternion(_hq.gun).add(anchor);
      const t=armL.parent;t.worldToLocal(_diveReach);t.worldToLocal(_diveGripLocal.copy(anchor));
      const dy=_diveReach.y-armL.position.y,dz=_diveReach.z-armL.position.z;
      const across=Math.sqrt(Math.max(0,.50*.50-dy*dy-dz*dz)),over=_diveReach.x-armL.position.x-across;
      if(over>0){_diveGripLocal.x-=over;t.localToWorld(anchor.copy(_diveGripLocal));_diveGripR.copy(_diveGripLocal);raiseDiveHold(anchor,.27);}
    }
    function raiseDiveHold(anchor,height){`);
edit('        clearDiveAnchor(anchor,armR);aimGun();','        clearDiveAnchor(anchor,armR);aimGun();\n        for(let i=0;i<2;i++){fitDiveCup(anchor,gun,H,armL);aimGun();}');
if(fs.readFileSync(file,'utf8')!==src)throw Error('source changed');fs.writeFileSync(file,s);console.log('Supported pistol rechecks coupled reach after body clearance');
