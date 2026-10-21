import fs from 'node:fs';import crypto from 'node:crypto';const path='index.html',before=fs.readFileSync(path,'utf8');let s=before;
const replace=(a,b)=>{if(s.split(a).length!==2)throw Error('anchor mismatch '+a);s=s.replace(a,b);};
replace("import { divePose, plantDiveLeg } from './studio/marine-dive-pose.js';","import { divePose, plantDiveLeg } from './studio/marine-dive-pose.js';\n    import { rotateDiveAimOffset } from './studio/marine-dive-aim.js';");
replace('    function poseDiveBrace(){',`    const _diveShoulder=new THREE.Vector3(),_diveReach=new THREE.Vector3(),_diveFront=new THREE.Vector3(),_diveAim=new THREE.Vector3();
    function aimDiveGrip(anchor,arm,target){
      if(!diving()||diveFlatW<.001||reloading||WEAPON_HOLD[currentWeapon]?.level)return;
      arm.getWorldPosition(_diveShoulder);_diveReach.subVectors(anchor,_diveShoulder);
      _diveFront.set(0,0,1).transformDirection(arm.parent.matrixWorld);_diveAim.subVectors(target,_diveShoulder);
      rotateDiveAimOffset(THREE,_diveReach,_diveFront,_diveAim,diveFlatW,_diveReach);
      anchor.copy(_diveShoulder).add(_diveReach);
    }
    function poseDiveBrace(){`);
replace('        if(diving())anchor.y=Math.max(anchor.y,localPlayer.position.y+.27*diveFlatW);','        aimDiveGrip(anchor,armR,target);\n        if(diving())anchor.y=Math.max(anchor.y,localPlayer.position.y+.27*diveFlatW);');
replace('          torso.localToWorld(anchorL);','          torso.localToWorld(anchorL);\n          aimDiveGrip(anchorL,armL,target);\n          if(diving())anchorL.y=Math.max(anchorL.y,localPlayer.position.y+.27*diveFlatW);');
const hash=t=>crypto.createHash('sha256').update(t).digest('hex');if(hash(fs.readFileSync(path,'utf8'))!==hash(before))throw Error('concurrent edit');fs.writeFileSync('review/dive-aim-GP19917/index.fresh-before-apply.html',before);fs.writeFileSync(path,s);console.log('PASS focused generic/offhand dive grip targets; UTF8 fresh-file guard');
