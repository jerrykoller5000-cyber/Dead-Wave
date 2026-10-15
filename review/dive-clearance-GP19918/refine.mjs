import fs from 'node:fs';import crypto from 'node:crypto';const p='index.html',src=fs.readFileSync(p,'utf8');let s=src;const edit=(a,b)=>{if(!s.includes(a)&&s.includes(a.replaceAll('\n','\r\n'))){a=a.replaceAll('\n','\r\n');b=b.replaceAll('\n','\r\n');}if(!s.includes(a))throw Error(a.slice(0,90));s=s.replace(a,b);};
edit(`      _diveBodyUp.set(0,1,0).applyQuaternion(_diveGunQ);
      _diveBodyUp.addScaledVector(forward,-_diveBodyUp.dot(forward));`, `      // Body right stays stable when the aim points along his head/feet axis.
      // Projecting body up there flips the pistol's roll and defeats the wrist limits.
      _diveBodyUp.set(1,0,0).applyQuaternion(_diveGunQ);
      _diveBodyUp.crossVectors(forward,_diveBodyUp);`);
edit('aki ? diveDualPole(_akPoleR) : _POLE_R','diving() ? diveDualPole(aki?_akPoleR:_POLE_R) : aki?_akPoleR:_POLE_R');
edit('    const _diveKnife={anchor:new THREE.Vector3(),local:new THREE.Vector3()', '    const _diveKnife={anchor:new THREE.Vector3(),local:new THREE.Vector3(),rest:new THREE.Vector3(),origin:new THREE.Vector3()');
edit('      const p=diveBladePose(knifeArmU,heavyBlade());t.localToWorld(K.anchor.set(p.x,p.y,p.z));',`      const p=diveBladePose(knifeArmU,heavyBlade());
      fistPointW(e,_HAND_L,gripAL,K.rest);t.localToWorld(K.anchor.set(p.x,p.y,p.z));
      const blend=diveSmooth(knifeArmU/.12)*diveSmooth((1-knifeArmU)/.20);
      K.anchor.lerp(K.rest,1-blend);`);
edit(`      _POLE_KNIFE.set(-.55,-.65,.05);solveArmIK(a,e,_HAND_L,K.anchor,_POLE_KNIFE,1);a.updateMatrixWorld(true);
      K.f.copy(weaponAimPoint()).sub(K.anchor).normalize();`, `      _POLE_KNIFE.set(-.55,-.65,.05);
      K.f.copy(weaponAimPoint()).sub(K.anchor).normalize();`);
edit(`      knife.parent.getWorldQuaternion(_hq.a).invert();knife.quaternion.copy(_hq.a).multiply(K.q);
      knife.position.set(0,0,KNIFE_REST_POS.z);knife.updateMatrixWorld(true);`, `      handRollL=holdHand(a,e,_HAND_L,K.anchor,K.f,1,_POLE_KNIFE,1,1);a.updateMatrixWorld(true);
      // The blade's legacy mount is not the articulated fist. Place its handle on
      // the actual palm after wrist solving, as the firearms do.
      fistPointW(e,_HAND_L,gripAL,K.anchor);
      knife.getWorldScale(_hScale);K.origin.set(0,0,-.06).multiply(_hScale).applyQuaternion(K.q).negate().add(K.anchor);
      knife.parent.worldToLocal(K.origin);knife.position.copy(K.origin);
      knife.parent.getWorldQuaternion(_hq.a).invert();knife.quaternion.copy(_hq.a).multiply(K.q);knife.updateMatrixWorld(true);`);
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');if(hash(fs.readFileSync(p,'utf8'))!==hash(src))throw Error('source changed');fs.writeFileSync(p,s);console.log('Stable barrel roll and articulated knife grip');
