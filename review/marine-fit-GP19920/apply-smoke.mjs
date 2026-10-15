import fs from 'node:fs';
function edit(file,fn){const before=fs.readFileSync(file,'utf8');let s=before.replaceAll('\r\n','\n');const r=(a,b)=>{if(s.split(a).length!==2)throw Error(file+': '+a);s=s.replace(a,b);};fn(r);if(fs.readFileSync(file,'utf8')!==before)throw Error('concurrent edit');fs.writeFileSync(file,s.replaceAll('\n',before.includes('\r\n')?'\r\n':'\n'));}
if(!fs.readFileSync('index.html','utf8').includes('solveArm: (side, target, hand) =>'))edit('index.html',r=>{
 r("solveArm: (side, target) => solveArmIK(marine.userData['arm' + side + 'G'], marine.userData['elbow' + side + 'G'],\n        side === 'R' ? _HAND_R : _HAND_L, target,", "solveArm: (side, target, hand) => solveArmIK(marine.userData['arm' + side + 'G'], marine.userData['elbow' + side + 'G'],\n        hand || (side === 'R' ? _HAND_R : _HAND_L), target,");
});
edit('studio/marine-idle.js',r=>{
 r('const cigGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6);','const cigGeo = new THREE.CylinderGeometry(0.0037, 0.0037, 1, 8);');
 r('[[filter, .035, .0175], [paper, .09, .08], [ember, .012, .131]]','[[filter, .021, .0105], [paper, .053, .0475], [ember, .004, .076]]');
 r('const drops = [], pool = [];',`const drops = [], pool = [];
  const pinch=new THREE.Vector3(),middle=new THREE.Vector3(),offset=new THREE.Vector3(),want=new THREE.Vector3();
  const headQ=new THREE.Quaternion(),handQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion(),rootQ=new THREE.Quaternion();
  const smokePose={f:[[.16,.12,.05,.09],[.16,.12,.05,-.05],[.75,1,.6,-.04],[.9,1.1,.7,-.08]],t:[.45,.15,.3]};
  function pointOnHand(wrist,name,out){wrist.userData.hand.point(name,out);out.sub(wrist.position);return wrist.localToWorld(out);}
  function holdPinch(target,draw){
    const wr=u.elbowRG.userData.wrist,hand=wr?.userData.hand;if(!hand){solveArm('R',target);return;}
    hand.set(smokePose).update();
    hand.point('indexMid',pinch);hand.point('middleMid',middle);pinch.add(middle).multiplyScalar(.5).sub(wr.position);
    u.headG.getWorldQuaternion(headQ);
    handQ.setFromAxisAngle(local.set(0,0,1),-1.12).premultiply(headQ);
    offset.copy(pinch).multiply(wr.scale).applyQuaternion(handQ);
    solveArm('R',want.copy(target).sub(offset),wr.position);
    u.elbowRG.getWorldQuaternion(parentQ);wr.quaternion.copy(parentQ.invert()).multiply(handQ);
    marine.updateWorldMatrix(true,true);
    pointOnHand(wr,'indexMid',pinch);pointOnHand(wr,'middleMid',middle);pinch.add(middle).multiplyScalar(.5);
    root.worldToLocal(tip.copy(pinch));cig.position.copy(tip);
    root.getWorldQuaternion(rootQ);cig.quaternion.copy(rootQ.invert()).multiply(handQ);
    // Fingers pinch the filter 1.6 cm from its lip end.
    cig.position.add(offset.set(0,0,-.016).applyQuaternion(cig.quaternion));
    cig.userData.pinch=pinch.toArray();cig.userData.draw=draw;
  }`);
 r('function hide() { root.visible = false; }','function hide() { root.visible = false; u.balaclava?.userData.mouthOpen?.(0); }');
 r('root.visible = true;','root.visible = true;\n    u.balaclava?.userData.mouthOpen?.(1);');
 r("u.headG.localToWorld(mouth.set(.04, .10, .19));","u.headG.localToWorld(mouth.set(.025, .114, .171));");
 r("right.lerp(mouth, draw);","right.lerp(mouth, draw);");
 r("solveArm('R', right); solveArm('L', left);\n    marine.updateWorldMatrix(true, true);\n    u.gripR.getWorldPosition(tip); root.worldToLocal(tip); cig.position.copy(tip);\n    cig.rotation.set(0, -.12 + u.headG.rotation.y * draw, 0);", "solveArm('L', left); holdPinch(right,draw);\n    marine.updateWorldMatrix(true, true);");
 r('cig.children[1].scale.y = .02 + .07 * remaining;','cig.children[1].scale.y = .012 + .041 * remaining;');
 r('cig.children[1].position.z = .035 + cig.children[1].scale.y / 2;','cig.children[1].position.z = .021 + cig.children[1].scale.y / 2;');
 r('cig.children[2].position.z = .041 + cig.children[1].scale.y;','cig.children[2].position.z = .023 + cig.children[1].scale.y;');
 r('u.gripL.getWorldPosition(tip); root.worldToLocal(tip);',"const wl=u.elbowLG.userData.wrist;if(wl?.userData.hand)pointOnHand(wl,'palm',tip);else u.gripL.getWorldPosition(tip);root.worldToLocal(tip);");
 r("if (exhale) u.headG.localToWorld(tip.set(.04, .1, .21));","if (exhale) u.headG.localToWorld(tip.set(.025, .114, .162));");
});
