import fs from 'node:fs';import crypto from 'node:crypto';
const p='index.html',src=fs.readFileSync(p,'utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');let s=src;const edit=(a,b)=>{if(!s.includes(a))throw Error('missing '+a.slice(0,80));s=s.replace(a,b);};
edit("import { rotateDiveAimOffset }", "import { rotateDiveAimOffset, clearDiveGrip, frontDiveDirection, diveBladePose }");
edit("      return marineAimPoint(localPlayer.position, aimTarget, aimYaw, out,\r\n        { self:aimThroughMarine, crouch:crouching, scoped });",`      marineAimPoint(localPlayer.position, aimTarget, aimYaw, out,
        { self:aimThroughMarine, crouch:crouching, scoped });
      // Share the cleared aim with the gun and bullets, including near-body picks.
      if(diving()&&diveFlatW>.01){
        const t=marine.userData.torsoG;t.getWorldQuaternion(_diveAimQ);
        t.getWorldPosition(_diveAimOrigin);_diveAimOrigin.add(_diveAimLocal.set(0,.38,.02).applyQuaternion(_diveAimQ));
        _diveAimLocal.copy(out).sub(_diveAimOrigin);const distance=Math.max(2.25,_diveAimLocal.length());
        _diveAimLocal.applyQuaternion(_diveAimQ.invert());frontDiveDirection(_diveAimLocal,_diveAimLocal);
        _diveAimLocal.applyQuaternion(_diveAimQ.invert()).multiplyScalar(distance).add(_diveAimOrigin);
        out.lerp(_diveAimLocal,diveFlatW);
      }
      return out;`);
edit('    const _diveShoulder=new THREE.Vector3()', '    const _diveAimQ=new THREE.Quaternion(),_diveAimLocal=new THREE.Vector3(),_diveAimOrigin=new THREE.Vector3();\n    const _diveGripR=new THREE.Vector3(),_diveGripL=new THREE.Vector3(),_diveGripLocal=new THREE.Vector3();\n    let diveGripSetR=false,diveGripSetL=false;\n    const _diveShoulder=new THREE.Vector3()');
edit('      anchor.copy(_diveShoulder).add(_diveReach);','      anchor.copy(_diveShoulder).add(_diveReach);');
edit('    function poseDiveBrace(){',`    function clearDiveAnchor(anchor,arm,left=false){
      if(!diving()||diveFlatW<.01||reloading||WEAPON_HOLD[currentWeapon]?.level)return;
      const torso=arm.parent;torso.worldToLocal(_diveGripLocal.copy(anchor));
      clearDiveGrip(_diveGripLocal,arm.position,diveFlatW,_diveGripLocal,akimboOn()?(left?-1:1):0);
      const last=left?_diveGripL:_diveGripR,set=left?diveGripSetL:diveGripSetR;
      if(set){last.lerp(_diveGripLocal,1-Math.exp(-18*diveRealDt));clearDiveGrip(last,arm.position,diveFlatW,last,akimboOn()?(left?-1:1):0);}
      else last.copy(_diveGripLocal);
      if(left)diveGripSetL=true;else diveGripSetR=true;
      torso.localToWorld(anchor.copy(last));
    }
    function poseDiveBrace(){`);
edit('      if(diving())dt=diveRealDt;', '      if(!diving()){diveGripSetR=false;diveGripSetL=false;}\n      if(diving()&&dt>0)dt=diveRealDt;');
edit('        tuckDiveGrip(anchor,gun,H,_hq.gun);','        clearDiveAnchor(anchor,armR);aimGun();\n        tuckDiveGrip(anchor,gun,H,_hq.gun);');
edit('          // CU-100: the second gun\'s turn first', '          clearDiveAnchor(anchorL,armL,true);\n          // CU-100: the second gun\'s turn first');
edit('      if (knifeArmU < 0 || !clip || !knife.visible) return;', '      if (knifeArmU < 0 || !knife.visible) return;\n      if(diving()&&diveFlatW>.01){diveKnifeArm();return;}\n      if(!clip)return;');
edit('    function knifeArm() {',`    const _diveKnife={anchor:new THREE.Vector3(),local:new THREE.Vector3(),q:new THREE.Quaternion(),up:new THREE.Vector3(),f:new THREE.Vector3(),x:new THREE.Vector3(),y:new THREE.Vector3(),m:new THREE.Matrix4()};
    function diveKnifeArm(){
      const ud=marine.userData,t=ud.torsoG,a=ud.armLG,e=ud.elbowLG,K=_diveKnife;
      const p=diveBladePose(knifeArmU,heavyBlade());t.localToWorld(K.anchor.set(p.x,p.y,p.z));
      K.anchor.y=Math.max(K.anchor.y,localPlayer.position.y+.20*diveFlatW);
      // The arm leads the blade; no overhead wind-up or shoulder/body twist in flight.
      _POLE_KNIFE.set(-.55,-.65,.05);solveArmIK(a,e,_HAND_L,K.anchor,_POLE_KNIFE,1);a.updateMatrixWorld(true);
      K.f.copy(weaponAimPoint()).sub(K.anchor).normalize();
      K.x.crossVectors(diveGunUp(K.f,K.up),K.f).normalize();K.y.crossVectors(K.f,K.x);K.m.makeBasis(K.x,K.y,K.f);
      K.q.setFromRotationMatrix(K.m);_hE.set(p.tilt,p.yaw,p.roll);K.q.multiply(_hq.a.setFromEuler(_hE));
      knife.parent.getWorldQuaternion(_hq.a).invert();knife.quaternion.copy(_hq.a).multiply(K.q);
      knife.position.set(0,0,KNIFE_REST_POS.z);knife.updateMatrixWorld(true);
    }
    function knifeArm() {`);
edit('      knifeArmU = clip ? u : -1;', '      knifeArmU = clip || diving() ? u : -1;');
if(hash(fs.readFileSync(p,'utf8'))!==hash(src))throw Error('source changed');fs.writeFileSync(p,s);console.log('Applied focused clearance/knife hooks');
