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
  const cigGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6);
  function cigarette() {
    const g = new THREE.Group();
    for (const [mat, length, z] of [[filter, .035, .0175], [paper, .09, .08], [ember, .012, .131]]) {
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
  let smokeT = 0;
  function hide() { root.visible = false; }
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
    if (bored <= 0) return;
    const shift = Math.sin((s.quiet - BORED_AFTER) * .85) * bored;
    u.lowerBody.rotation.z += shift * .045;
    u.torsoG.rotation.z -= shift * .055;
    u.torsoG.rotation.x += bored * .045;
    u.headG.rotation.y += Math.sin((s.quiet - BORED_AFTER) * .53) * .3 * bored;
    u.headG.rotation.x += (.04 + .035 * Math.sin(s.quiet * .7)) * bored;
    u.kneeLG.rotation.x += Math.max(0, shift) * .11;
    u.kneeRG.rotation.x += Math.max(0, -shift) * .11;
    if (s.phase !== 'pack' && s.phase !== 'smoking') return;
    root.visible = true;
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
    u.headG.localToWorld(mouth.set(.04, .10, .19));
    marine.worldToLocal(mouth);
    right.lerp(mouth, draw);
    if (packing && t > 2.9) left.lerp(local.set(mouth.x - .06, mouth.y - .06, mouth.z + .08), smooth((t - 2.9) / .35));
    if (packing && t > 3.65) left.lerp(local.set(-.27, .77, .12), smooth((t - 3.65) / .35));
    marine.localToWorld(right); marine.localToWorld(left);
    solveArm('R', right); solveArm('L', left);
    marine.updateWorldMatrix(true, true);
    u.gripR.getWorldPosition(tip); root.worldToLocal(tip); cig.position.copy(tip);
    cig.rotation.set(0, -.12 + u.headG.rotation.y * draw, 0);
    cig.visible = !packing || t > 1.55;
    const remaining = packing ? 1 : 1 - t / CIGARETTE_SECONDS;
    cig.children[1].scale.y = .02 + .07 * remaining;
    cig.children[1].position.z = .035 + cig.children[1].scale.y / 2;
    cig.children[2].position.z = .041 + cig.children[1].scale.y;
    cig.children[2].material = s.lit || (packing && t > 3.35) ? ember : ash;
    u.gripL.getWorldPosition(tip); root.worldToLocal(tip);
    pack.position.copy(tip); pack.rotation.set(-.2, .1, 0); pack.visible = packing && t > .5 && t < 2.75;
    lighter.position.copy(tip); lighter.visible = packing && t > 3.1;
    spark.position.copy(tip); spark.position.y += .04; spark.visible = lighter.visible && t > 3.35 && t < 3.85;
    smokeT -= dt;
    if (s.lit && smokeT <= 0) {
      smokeT = .4;
      const exhale = puff > 2.8 && puff < 4.5;
      if (exhale) u.headG.localToWorld(tip.set(.04, .1, .21));
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
