// GP-74, Jerry's direct request. Active simulation seconds, never wall-clock time.
export const BORED_AFTER = 5, SMOKE_AFTER = 25, PACK_SECONDS = 4, CIGARETTE_SECONDS = 60;
export function createIdleClock() {
  const s = { quiet: 0, phase: 'ready', time: 0, lit: false, number: 0 };
  function reset() { Object.assign(s, { quiet: 0, phase: 'ready', time: 0, lit: false, number: 0 }); }
  function step(dt, { eligible = true, active = false, paused = false } = {}) {
    const event = { drop: false, spent: false };
    if (paused) return event;
    if (!eligible || active) { event.drop = eligible && s.lit; reset(); return event; }
    if (!Number.isFinite(dt) || dt <= 0) return event;
    const before = s.quiet;
    s.quiet += dt;
    if (s.phase === 'ready' && s.quiet > BORED_AFTER) s.phase = 'bored';
    if (s.phase === 'bored' && s.quiet > SMOKE_AFTER) {
      s.phase = 'pack'; s.time = s.quiet - SMOKE_AFTER;
    } else if (before > SMOKE_AFTER) s.time += dt;
    // Carry overshoot forward so timing is independent of the frame rate.
    while (s.phase === 'pack' || s.phase === 'smoking') {
      const duration = s.phase === 'pack' ? PACK_SECONDS : CIGARETTE_SECONDS;
      if (s.time < duration) break;
      s.time -= duration;
      if (s.phase === 'pack') { s.phase = 'smoking'; s.lit = true; s.number++; }
      else { event.spent = true; s.phase = 'pack'; s.lit = false; }
    }
    return event;
  }
  return { state: s, reset, step };
}

const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

// Props and posing use the game's existing two-bone arm solver and smoke pool.
export function createMarineIdle({ THREE, marine, scene, solveArm, smoke, ground, ignite }) {
  const clock = createIdleClock(), s = clock.state, u = marine.userData;
  const root = new THREE.Group(); root.name = 'marine-idle-props'; marine.add(root);
  const paper = new THREE.MeshStandardMaterial({ color: 0xe9dec7, roughness: 1 });
  const filter = new THREE.MeshStandardMaterial({ color: 0xad713d, roughness: 1 });
  const ember = new THREE.MeshBasicMaterial({ color: 0xff6125, toneMapped: false });
  const ash = new THREE.MeshStandardMaterial({ color: 0x47433e, roughness: 1 });
  const cigGeo = new THREE.CylinderGeometry(0.0037, 0.0037, 1, 8);
  function cigarette() {
    const g = new THREE.Group();
    for (const [mat, length, z] of [[filter, .021, .0105], [paper, .053, .0475], [ember, .004, .076]]) {
      const m = new THREE.Mesh(cigGeo, mat); m.rotation.x = Math.PI / 2;
      m.scale.y = length; m.position.z = z; g.add(m);
    }
    return g;
  }
  const cig = cigarette(); root.add(cig);
  const pack = new THREE.Group(); root.add(pack);
  const packMat = new THREE.MeshStandardMaterial({ color: 0x9c3930, roughness: .9 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(.085, .115, .042), paper); pack.add(box);
  const band = new THREE.Mesh(new THREE.BoxGeometry(.087, .055, .044), packMat); band.position.y = -.017; pack.add(band);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(.085, .024, .042), paper); lid.position.set(0, .067, -.018); lid.rotation.x = -.9; pack.add(lid);
  const lighter = new THREE.Mesh(new THREE.BoxGeometry(.026, .05, .02), filter); root.add(lighter);
  const spark = new THREE.Mesh(new THREE.SphereGeometry(.016, 5, 4), ember); spark.scale.y = 1.8; root.add(spark);
  const right = new THREE.Vector3(), left = new THREE.Vector3(), mouth = new THREE.Vector3();
  const tip = new THREE.Vector3(), local = new THREE.Vector3();
  const drops = [], pool = [];
  const pinch=new THREE.Vector3(),middle=new THREE.Vector3(),offset=new THREE.Vector3(),want=new THREE.Vector3(),desired=new THREE.Vector3(),pinchTarget=new THREE.Vector3(),actual=new THREE.Vector3(),shoulder=new THREE.Vector3(),desiredDir=new THREE.Vector3(),actualDir=new THREE.Vector3();
  const headQ=new THREE.Quaternion(),handQ=new THREE.Quaternion(),cigQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion(),rootQ=new THREE.Quaternion(),armWorldQ=new THREE.Quaternion(),armParentQ=new THREE.Quaternion();
  const twistQ=new THREE.Quaternion(),correctQ=new THREE.Quaternion(),axis=new THREE.Vector3();
  const smokePose={f:[[.46,.58,.26,.08],[.5,.64,.3,-.08],[.96,1.08,.72,-.04],[1.08,1.16,.82,-.08]],t:[.7,-.08,.42]};
  const PINCH_FROM_LIP=.018;
  function pointOnHand(wrist,name,out){wrist.userData.hand.point(name,out);out.sub(wrist.position);return wrist.localToWorld(out);}
  function holdPinch(target,draw){
    const wr=u.elbowRG.userData.wrist,hand=wr?.userData.hand;if(!hand){solveArm('R',target);return;}
    hand.set(smokePose).update();
    // Hold the filter at the fingertips. The old PIP-joint anchor put both
    // fingers and most of the glove through his nose and cheek.
    hand.point('indexTip',pinch);hand.point('middleTip',middle);pinch.add(middle).multiplyScalar(.5).sub(wr.position);
    u.headG.getWorldQuaternion(headQ);
    // Turn the hand's finger axis up-left toward the cigarette. At -1.12 the
    // wrist had to sit above the fingertips, which raised the elbow and spread
    // the palm across his eye like a facepalm. This roll puts the wrist below
    // and to the right of the pinch instead.
    const handRoll = Number.isFinite(cig.userData.smokeRoll) ? cig.userData.smokeRoll : -2.3;
    cig.userData.smokeRollApplied = handRoll;
    handQ.setFromAxisAngle(local.set(0,0,1),handRoll).premultiply(headQ);
    cigQ.copy(handQ);
    offset.copy(pinch).multiply(wr.scale).applyQuaternion(handQ);
    // `target` is the filter's lip end. Keep the fingertips outside the face,
    // 1.8 cm down the cigarette, instead of solving the glove onto the lips.
    axis.set(0,0,PINCH_FROM_LIP).applyQuaternion(cigQ);
    pinchTarget.copy(target).add(axis);
    desired.copy(pinchTarget).sub(offset);
    want.copy(desired);
    // The generic two-bone solve uses the historical arm lengths, while the
    // fitted sleeve/wrist rig has moved since those constants were authored.
    // Its endpoint radius is right but its fitted shoulder basis can rotate the
    // wrist off the requested bearing. Rotate the solved upper arm in world
    // space by that measured angular error; this keeps the bend and reach while
    // putting the real fitted wrist on the requested point.
    solveArm('R',want,wr.position);
    marine.updateWorldMatrix(true,true);
    u.armRG.getWorldPosition(shoulder);
    wr.getWorldPosition(actual);
    desiredDir.copy(desired).sub(shoulder);
    actualDir.copy(actual).sub(shoulder);
    if(desiredDir.lengthSq()>.0001&&actualDir.lengthSq()>.0001){
      correctQ.setFromUnitVectors(actualDir.normalize(),desiredDir.clone().normalize());
      u.armRG.getWorldQuaternion(armWorldQ);
      armWorldQ.premultiply(correctQ);
      u.armRG.parent.getWorldQuaternion(armParentQ).invert();
      u.armRG.quaternion.copy(armParentQ).multiply(armWorldQ);
      marine.updateWorldMatrix(true,true);
    }
    const targetReach=shoulder.distanceTo(desired);
    // Roll the forearm around the solved wrist line before asking the wrist to
    // bend. Rolling preserves contact; putting all this twist in the wrist did not.
    u.elbowRG.getWorldQuaternion(parentQ);wr.quaternion.copy(parentQ.invert()).multiply(handQ);
    axis.copy(wr.position).normalize();
    const projection=wr.quaternion.x*axis.x+wr.quaternion.y*axis.y+wr.quaternion.z*axis.z;
    let angle=2*Math.atan2(projection,wr.quaternion.w);angle=Math.atan2(Math.sin(angle),Math.cos(angle));
    twistQ.setFromAxisAngle(axis,Math.max(-1.7,Math.min(1.7,angle)));
    u.elbowRG.quaternion.multiply(twistQ);u.elbowRG.updateWorldMatrix(true,false);
    u.elbowRG.getWorldQuaternion(parentQ);wr.quaternion.copy(parentQ.invert()).multiply(handQ);
    // Bound flexion during the travel between lip and resting hand. Contact
    // follows the fingers throughout; the full draw already lies inside this limit.
    const bend=2*Math.acos(Math.min(1,Math.abs(wr.quaternion.w)));
    if(bend>1.05)wr.quaternion.slerp(new THREE.Quaternion(),1-1.05/bend);
    wr.getWorldQuaternion(handQ);
    marine.updateWorldMatrix(true,true);
    wr.getWorldPosition(actual);
    pointOnHand(wr,'indexTip',pinch);pointOnHand(wr,'middleTip',middle);pinch.add(middle).multiplyScalar(.5);
    // Wrist flexion changes the fingertip offset after the arm solve. Correct
    // the final rigid arm bearing from the measured fingertip, so the visible
    // fingers—not merely the wrist proxy—finish on the cigarette.
    desiredDir.copy(pinchTarget).sub(shoulder);
    actualDir.copy(pinch).sub(shoulder);
    if(desiredDir.lengthSq()>.0001&&actualDir.lengthSq()>.0001){
      correctQ.setFromUnitVectors(actualDir.normalize(),desiredDir.clone().normalize());
      u.armRG.getWorldQuaternion(armWorldQ);
      armWorldQ.premultiply(correctQ);
      u.armRG.parent.getWorldQuaternion(armParentQ).invert();
      u.armRG.quaternion.copy(armParentQ).multiply(armWorldQ);
      marine.updateWorldMatrix(true,true);
      wr.getWorldPosition(actual);
      pointOnHand(wr,'indexTip',pinch);pointOnHand(wr,'middleTip',middle);pinch.add(middle).multiplyScalar(.5);
    }
    // The prop follows the head-facing axis, not a clamped wrist quaternion:
    // filter at the lips, ember out in front. This makes its direction explicit
    // and prevents a bent wrist from visually reversing it.
    root.worldToLocal(tip.copy(target));cig.position.copy(tip);
    root.getWorldQuaternion(rootQ);cig.quaternion.copy(rootQ.invert()).multiply(cigQ);
    cig.userData.pinch=pinch.toArray();cig.userData.mouth=target.toArray();cig.userData.draw=draw;
    cig.userData.wristTarget=desired.toArray();cig.userData.wristActual=actual.toArray();
    cig.userData.targetReach=targetReach;cig.userData.actualReach=shoulder.distanceTo(actual);cig.userData.handOffset=offset.length();
  }
  let smokeT = 0;
  function hide() { root.visible = false; u.balaclava?.userData.mouthOpen?.(0); }
  hide();
  function drop(lit) {
    if (!cig.visible || !root.visible) return;
    let d = pool.pop();
    if (!d && drops.length >= 8) d = drops.shift();
    if (!d) { d = { mesh: cigarette() }; scene.add(d.mesh); }
    cig.getWorldPosition(d.mesh.position); cig.getWorldQuaternion(d.mesh.quaternion);
    d.mesh.scale.copy(cig.getWorldScale(local)); d.mesh.visible = true;
    for (let i = 0; i < cig.children.length; i++) {
      d.mesh.children[i].scale.copy(cig.children[i].scale);
      d.mesh.children[i].position.copy(cig.children[i].position);
    }
    d.mesh.children[2].material = lit ? ember : ash;
    Object.assign(d, { age: 0, vy: .15, landed: false, lit }); drops.push(d);
  }
  function step(dt, input = {}) {
    const e = clock.step(dt, input);
    if (e.drop) drop(true);
    else if (e.spent) drop(false);
    if (s.phase !== 'pack' && s.phase !== 'smoking') hide();
    // Pauses freeze both the timer and the falling cigarette.
    if (input.paused) return;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i]; d.age += dt;
      if (!d.landed) {
        d.vy -= dt * 4.5; d.mesh.position.y += d.vy * dt;
        d.mesh.rotation.x += dt * 5;
        const y = ground(d.mesh.position.x, d.mesh.position.z);
        if (d.mesh.position.y <= y + .025) {
          d.mesh.position.y = y + .025; d.mesh.rotation.x = 0; d.landed = true;
          if (d.lit) ignite(d.mesh.position.x, d.mesh.position.z);
          d.mesh.children[2].material = ash;
        }
      }
      if (d.age > 8) { d.mesh.visible = false; pool.push(d); drops.splice(i, 1); }
    }
  }
  function pose(dt) {
    const bored = smooth((s.quiet - BORED_AFTER) / 1.2);
    u.idleSway = 0;
    if (bored <= 0) return;
    const shift = Math.sin((s.quiet - BORED_AFTER) * .85) * bored;
    // CU-99: while the standing turn steps hold his legs (studio/marine-turn.js, u.turn.active), the weight shift is
    // theirs to make: they tilt his hips by u.idleSway over boots that stay planted. Bending his hips and knees here,
    // after they had planted the boots, slid the boots about.
    if (u.turn && u.turn.active) u.idleSway = shift * .012;
    else {
      u.lowerBody.rotation.z += shift * .012;
      u.kneeLG.rotation.x += Math.max(0, shift) * .025;
      u.kneeRG.rotation.x += Math.max(0, -shift) * .025;
    }
    u.torsoG.rotation.z -= shift * .014;
    u.torsoG.rotation.x += bored * .008;
    u.headG.rotation.y += Math.sin((s.quiet - BORED_AFTER) * .53) * .3 * bored;
    u.headG.rotation.x += (.04 + .035 * Math.sin(s.quiet * .7)) * bored;
    if (s.phase !== 'pack' && s.phase !== 'smoking') return;
    root.visible = true;
    u.balaclava?.userData.mouthOpen?.(1);
    const packing = s.phase === 'pack', t = s.time;
    const puff = t % 8;
    const draw = packing ? smooth((t - 2.1) / 1.0) :
      (puff > 6.8 ? smooth((puff - 6.8) / 1.2) : 1 - smooth((puff - 2.3) / .9));
    // Bring the pack up from the vest; take a cigarette, then lift it to the mouth.
    left.set(-.25, .81, .15).lerp(local.set(-.19, 1.04, .32), smooth((t - .45) / .7));
    if (!packing || t > 2.1) left.lerp(local.set(-.27, .77, .12), packing ? smooth((t - 2.1) / .7) : 1);
    right.set(.28, .82, .2);
    if (packing) right.lerp(local.set(-.13, 1.11, .35), smooth((t - 1.0) / .5));
    marine.updateWorldMatrix(true, true);
    u.headG.localToWorld(mouth.set(.025, .125, .171));
    marine.worldToLocal(mouth);
    right.lerp(mouth, draw);
    if (packing && t > 2.9) left.lerp(local.set(mouth.x - .06, mouth.y - .06, mouth.z + .08), smooth((t - 2.9) / .35));
    if (packing && t > 3.65) left.lerp(local.set(-.27, .77, .12), smooth((t - 3.65) / .35));
    marine.localToWorld(right); marine.localToWorld(left);
    solveArm('L', left); holdPinch(right,draw);
    marine.updateWorldMatrix(true, true);
    cig.visible = !packing || t > 1.55;
    const remaining = packing ? 1 : 1 - t / CIGARETTE_SECONDS;
    cig.children[1].scale.y = .012 + .041 * remaining;
    cig.children[1].position.z = .021 + cig.children[1].scale.y / 2;
    cig.children[2].position.z = .023 + cig.children[1].scale.y;
    cig.children[2].material = s.lit || (packing && t > 3.35) ? ember : ash;
    const wl=u.elbowLG.userData.wrist;if(wl?.userData.hand)pointOnHand(wl,'palm',tip);else u.gripL.getWorldPosition(tip);root.worldToLocal(tip);
    pack.position.copy(tip); pack.rotation.set(-.2, .1, 0); pack.visible = packing && t > .5 && t < 2.75;
    lighter.position.copy(tip); lighter.visible = packing && t > 3.1;
    spark.position.copy(tip); spark.position.y += .04; spark.visible = lighter.visible && t > 3.35 && t < 3.85;
    smokeT -= dt;
    if (s.lit && smokeT <= 0) {
      smokeT = .4;
      const exhale = puff > 2.8 && puff < 4.5;
      if (exhale) u.headG.localToWorld(tip.set(.025, .114, .162));
      else cig.localToWorld(tip.set(0, 0, cig.children[2].position.z));
      smoke(tip.x, tip.y, tip.z, { tone: 'pale', size: exhale ? .16 : .08, grow: exhale ? 2.2 : 1.7, vy: .24, life: 2.2, peak: .6 });
    }
  }
  function reset() {
    clock.reset(); hide(); smokeT = 0;
    for (const d of drops) { d.mesh.visible = false; pool.push(d); } drops.length = 0;
  }
  return { state: s, step, pose, reset, props: { root, cig, pack, lighter }, drops };
}
