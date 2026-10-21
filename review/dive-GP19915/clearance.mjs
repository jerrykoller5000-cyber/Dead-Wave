import fs from 'node:fs';import crypto from 'node:crypto';
const p='index.html',original=fs.readFileSync(p,'utf8');let s=original;
const swap=(a,b)=>{let cr=false;if(!s.includes(a)){a=a.replaceAll('\n','\r\n');cr=true;}if(s.split(a).length!==2)throw Error('anchor mismatch '+a.slice(0,100));s=s.replace(a,cr?b.replaceAll('\n','\r\n'):b);};
swap('function laserStop(origin, dir, maxLen) {','function laserStop(origin, dir, maxLen, ignoreActors = false) {');
swap('for (const z of zombies) {\n        if (!z.mesh) continue;\n        const p = z.mesh.position;\n        if (!z.alive || !overlaps(p.x, p.z, z.radius)) continue;', 'for (const z of ignoreActors ? [] : zombies) {\n        if (!z.mesh) continue;\n        const p = z.mesh.position;\n        if (!z.alive || !overlaps(p.x, p.z, z.radius)) continue;');
swap('    function poseDiveBrace(){',`    const _diveMuzzle=new THREE.Vector3(),_diveGunOrigin=new THREE.Vector3(),_diveGunFrom=new THREE.Vector3(),_diveGunDir=new THREE.Vector3();
    // Tuck the whole hold before solving either hand; a long barrel must not fire from beyond a wall.
    function tuckDiveGun(origin,gun,q,scale){
      if(!diving()||!gun.userData.muzzleLocal)return;
      _diveMuzzle.copy(gun.userData.muzzleLocal).multiply(scale).applyQuaternion(q).add(origin);
      _diveGunFrom.copy(localPlayer.position);_diveGunFrom.y=_diveMuzzle.y;
      _diveGunDir.subVectors(_diveMuzzle,_diveGunFrom);const L=_diveGunDir.length();if(L<.05)return;
      _diveGunDir.multiplyScalar(1/L);const hit=laserStop(_diveGunFrom,_diveGunDir,L,true);
      if(hit.surface&&hit.len<L)origin.addScaledVector(_diveGunDir,-(L-hit.len+.035));
    }
    function tuckDiveGrip(anchor,gun,H,q){
      if(!diving())return;gun.getWorldScale(_hScale);
      _diveGunOrigin.set(H.grip[0],H.grip[1],H.grip[2]).multiply(_hScale).applyQuaternion(q).negate().add(anchor);
      _diveMuzzle.copy(_diveGunOrigin);tuckDiveGun(_diveGunOrigin,gun,q,_hScale);
      // tuckDiveGun reuses its muzzle scratch, so recover the original origin from the anchor.
      _diveMuzzle.set(H.grip[0],H.grip[1],H.grip[2]).multiply(_hScale).applyQuaternion(q).negate().add(anchor);
      anchor.add(_diveGunOrigin.sub(_diveMuzzle));
    }
    function poseDiveBrace(){`);
swap('      grip.set(H.grip[0], H.grip[1], H.grip[2]).multiplyScalar(s).applyQuaternion(_hq.gun).add(origin);\n      if (HANDS.skip[currentWeapon])', '      tuckDiveGun(origin,gun,_hq.gun,_hScale);\n      grip.set(H.grip[0], H.grip[1], H.grip[2]).multiplyScalar(s).applyQuaternion(_hq.gun).add(origin);\n      if (HANDS.skip[currentWeapon])');
swap('        // Solve the right arm onto the grip before placing the gun, so the gun\'s parent', '        tuckDiveGrip(anchor,gun,H,_hq.gun);\n        // Solve the right arm onto the grip before placing the gun, so the gun\'s parent');
swap('          handRollL = holdHand(armL, ud.elbowLG, _HAND_L, anchorL,', '          tuckDiveGrip(anchorL,offGun,H,_hq.gun);\n          handRollL = holdHand(armL, ud.elbowLG, _HAND_L, anchorL,');
const hash=t=>crypto.createHash('sha256').update(t).digest('hex');if(hash(fs.readFileSync(p,'utf8'))!==hash(original))throw Error('concurrent edit');fs.writeFileSync(p,s);
