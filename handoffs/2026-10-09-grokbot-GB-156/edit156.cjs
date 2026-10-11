// GB-156: index.html edits, exact strings, UTF-8 without BOM, re-checked unchanged right before the save.
const fs = require('fs'), crypto = require('crypto');
const F = 'index.html';
const WRITE = process.argv.includes('--write');
const read = () => fs.readFileSync(F, 'utf8');
let src = read();
const h0 = crypto.createHash('sha1').update(src).digest('hex');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
const fix = (s) => s.replace(/\r?\n/g, eol);
const edits = [];
const rep = (name, a, b) => edits.push({ name, a: fix(a), b: fix(b) });

rep('import',
`    import { WATCHMAN, createWatchman, stepWatchman, watchmanPose, watchmanLeg, watchmanCarry } from './game/watchman-mg.js';`,
`    import { WATCHMAN, createWatchman, stepWatchman, watchmanPose, watchmanLeg, watchmanCarry } from './game/watchman-mg.js';
    import { CREW_STANCE, createFootPlant, stepFootPlant, stanceFeet, legReach, smooth01, createMortarLoad, stepMortarLoad, fireMortarLoad, mortarLoadU } from './studio/crew-footwork.js';   // GB-156`);

rep('mount-from',
`      if (b.type !== 'm240') player.position.set(spot.x, spot.y, spot.z);`,
`      // GB-156: the collision root still steps onto the crew spot at once (as before); the body walks there (updateMortarCrew).
      if (b.type !== 'm240') { _mcrew.from = { x: player.position.x, z: player.position.z, yaw: player.rotation.y, age: 0 }; player.position.set(spot.x, spot.y, spot.z); }`);

rep('shell-builder',
`      const mesh = acquireProjectileMesh('mortar', () => {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0x4a5530, roughness: 0.55, metalness: 0.4 }));
        body.rotation.x = Math.PI / 2; g.add(body);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0x9a7a3a, metalness: 0.65, roughness: 0.35 }));
        tip.rotation.x = Math.PI / 2; tip.position.z = 0.2; g.add(tip);
        const fins = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.12), gunMetal); fins.position.z = -0.16; g.add(fins);
        return g;
      });`,
`      const mesh = acquireProjectileMesh('mortar', makeMortarRoundMesh);`);

rep('fire-load',
`      b.kickT = 0.26;
      mortarLoadT = 0.45;`,
`      b.kickT = 0.26;
      mortarLoadT = 0.45;
      mortarCrewFired();   // GB-156: the round in his hand goes down the tube on this frame`);

rep('old-crew-pose',
`    function updateMortarCrewPose() {
      if (!mortarMounted || mortarMounted.type === 'm240') return;
      const ud = marine.userData;
      const armL = ud.armLG, armR = ud.armRG, elbowL = ud.elbowLG, elbowR = ud.elbowRG;
      const torso = ud.torsoG, head = ud.headG;
      // 1 while the shell is being lifted and dropped, 0 at rest on the tube.
      const load = mortarLoadT > 0 ? Math.sin((mortarLoadT / 0.45) * Math.PI) : 0;
      const lift = Math.max(0, Math.min(1, load));
      if (torso) { torso.rotation.x = 0.30 - lift * 0.22; torso.rotation.z = 0; }
      if (head) head.rotation.x = 0.18 - lift * 0.3;
      // Both arms forward and up into the muzzle; they rise together to feed it.
      for (const [arm, elbow, sgn] of [[armR, elbowR, 1], [armL, elbowL, -1]]) {
        if (!arm) continue;
        arm.rotation.x = -1.05 - lift * 0.55;
        arm.rotation.z = sgn * (0.26 - lift * 0.1);
        arm.rotation.y = 0;
        if (elbow) elbow.rotation.x = -0.85 + lift * 0.45;
      }
      // Knees bent, weight down behind the baseplate.
      if (ud.legLG) ud.legLG.rotation.x = 0.42;
      if (ud.legRG) ud.legRG.rotation.x = 0.30;
      if (ud.kneeLG) ud.kneeLG.rotation.x = -0.80;
      if (ud.kneeRG) ud.kneeRG.rotation.x = -0.62;
    }`,
`    // GB-156: the crew pose moved to updateMortarCrew (after the hold and the idle, so nothing above overwrites it, and
    // blended in and out instead of snapping on the first frame he is on the tube). Kept as a no-op for its call site.
    function updateMortarCrewPose() {}
    function makeMortarRoundMesh() {   // the 60 mm round: the shell in flight and (GB-156) the round in his hand
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0x4a5530, roughness: 0.55, metalness: 0.4 }));
      body.rotation.x = Math.PI / 2; g.add(body);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0x9a7a3a, metalness: 0.65, roughness: 0.35 }));
      tip.rotation.x = Math.PI / 2; tip.position.z = 0.2; g.add(tip);
      const fins = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.12), gunMetal); fins.position.z = -0.16; g.add(fins);
      return g;
    }`);

rep('watchman-legs',
`        const moving = Math.min(1, Math.abs(m?.watchman.turnSpeed || 0) / 1.5);
        _watchman.step += dt * 12 * moving;
        for (const [side, z] of [['L', 0.10], ['R', -0.06]]) {
          const leg = u['leg' + side + 'G'], knee = u['knee' + side + 'G'], ankle = u['ankle' + side + 'G'];
          if (!leg || !knee || !ankle) continue;
          const footZ = z * w, yaw = player.rotation.y;
          const x = p.x + Math.cos(yaw) * leg.position.x + Math.sin(yaw) * footZ;
          const zWorld = p.z - Math.sin(yaw) * leg.position.x + Math.cos(yaw) * footZ;
          const ground = playerGroundY(x, zWorld, p.y + STEP_UP);
          const lift = Math.max(0, Math.sin(_watchman.step + (side === 'L' ? 0 : Math.PI))) * 0.035 * moving;
          watchmanLeg(0.62 - dip, 0.104 + ground - p.y + lift, footZ, _watchman.leg);
          leg.rotation.set(_watchman.leg.thigh, 0, 0);
          knee.rotation.set(_watchman.leg.knee, 0, 0); ankle.rotation.set(_watchman.leg.ankle, 0, 0);
        }`,
`        // GB-156: the feet stay where they are put and step as he walks round the tripod (crewFeet), instead of sliding
        // round with him under a little in-place lift.
        crewFeet(u, CREW_STANCE.m240, w, dt, _watchman.plant);`);

rep('watchman-reset',
`      if (mortarCarried?.kind !== 'm240' || !carriedM240Mesh.visible) return;
      mortarCarried.liftAge = (mortarCarried.liftAge || 0) + dt;`,
`      else _watchman.plant.feet = null;   // GB-156: off the gun, his feet are his own again
      if (mortarCarried?.kind !== 'm240' || !carriedM240Mesh.visible) return;
      mortarCarried.liftAge = (mortarCarried.liftAge || 0) + dt;`);

rep('watchman-state',
`      channel: new THREE.Vector3(), camera: new THREE.Vector3(), shape: {}, carry: {}, leg: {}, weight: 0, step: 0 };`,
`      channel: new THREE.Vector3(), camera: new THREE.Vector3(), shape: {}, carry: {}, leg: {}, weight: 0, step: 0, plant: createFootPlant() };
    // GB-156 (Grokbot; Jerry: "Pay attention to how the player mounts these two and what his feet look like when he is
    // rotating them around. They need to move with the motion of the gun instead of sliding around frictionless."):
    // feet planted on the ground while he crews a gun. studio/crew-footwork.js keeps each foot where it landed until the
    // body has moved far enough from it, then steps it (one at a time) to where the stance wants it; here each leg reaches
    // its foot: the ankle 0.104 m over the ground under it, the hip rolled out to it, the thigh and knee from legReach,
    // the ankle laid flat and turned to the foot's own heading. Blended over the pose below it by w.
    const _crew = { want: [{}, {}], hipX: [0, 0], leg: {}, v: new THREE.Vector3(), t: new THREE.Vector3(), q: new THREE.Quaternion(),
      q2: new THREE.Quaternion(), ax: new THREE.Vector3(1, 0, 0), ay: new THREE.Vector3(0, 1, 0), az: new THREE.Vector3(0, 0, 1) };
    function crewFeet(u, stance, w, dt, plant) {
      const lb = u.lowerBody, legs = [u.legLG, u.legRG], knees = [u.kneeLG, u.kneeRG], ankles = [u.ankleLG, u.ankleRG];
      if (!lb || !legs[0] || !legs[1] || !knees[0] || !knees[1] || !ankles[0] || !ankles[1]) return null;
      player.updateMatrixWorld(true);
      const v = lb.getWorldPosition(_crew.v), f = _crew.t.set(0, 0, 1).transformDirection(lb.matrixWorld);
      const yaw = Math.atan2(f.x, f.z);
      _crew.hipX[0] = legs[0].position.x; _crew.hipX[1] = legs[1].position.x;
      const feet = stepFootPlant(plant, stanceFeet(v.x, v.z, yaw, _crew.hipX, stance, _crew.want), v, dt);
      for (let i = 0; i < 2; i++) {
        const ft = feet[i];
        ft.y = playerGroundY(ft.x, ft.z, player.position.y + STEP_UP);
        const t = lb.worldToLocal(_crew.t.set(ft.x, ft.y + 0.104 + ft.lift, ft.z)).sub(legs[i].position);
        const L = legReach(t.x, t.y, t.z, _crew.leg);
        const turn = Math.max(-0.7, Math.min(0.7, Math.atan2(Math.sin(ft.yaw - yaw), Math.cos(ft.yaw - yaw))));
        _crew.q.setFromAxisAngle(_crew.az, L.roll).multiply(_crew.q2.setFromAxisAngle(_crew.ax, L.thigh));
        legs[i].quaternion.slerp(_crew.q, w);
        knees[i].quaternion.slerp(_crew.q.setFromAxisAngle(_crew.ax, L.knee), w);
        _crew.q.setFromAxisAngle(_crew.ax, -L.thigh - L.knee).multiply(_crew.q2.setFromAxisAngle(_crew.az, -L.roll)).multiply(_crew.q2.setFromAxisAngle(_crew.ay, turn));
        ankles[i].quaternion.slerp(_crew.q, w);
      }
      return feet;
    }
    // GB-156 (Jerry: "For the mortar he takes a round out of his backpack with one hand and drops it down the tube."):
    // the mortar crewed. He walks from where he pressed E to a low crouch beside the tube (the tube on his left, turned in
    // toward it), left hand steadying the tube, right hand on it higher up. Between shots the right hand goes to the side
    // of his pack, pulls a round, brings it over the muzzle and holds it there; the shot lets it go and it drops in, the
    // hand pulls away and he ducks his head away from the muzzle (studio/crew-footwork.js: MORTAR_LOAD). The shot is
    // still instant on the click: the held round drops on the same frame the shell leaves, and the next round is in his
    // hand before the cooldown ends. Visual only: the collision root, the camera, the aim and the timing are as they were;
    // the body is drawn offset from the root (marine.position), back on it once he is off the tube.
    const MORTAR_KNEEL = { side: 0.52, fwd: 0.9, yaw: 0.6, inS: 0.55, outS: 0.42, lean: 0.36 };
    const _mcrew = { w: 0, age: 0, mortar: null, from: null, load: createMortarLoad(), plant: createFootPlant(), round: null, offset: false,
      v: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), axis: new THREE.Vector3(),
      muzzle: new THREE.Vector3(), toMe: new THREE.Vector3(), hand: new THREE.Vector3(), roundAt: new THREE.Vector3(), release: new THREE.Vector3(),
      ch: new THREE.Vector3(), q: new THREE.Quaternion(), pts: {}, rs: 1, head: { x: 0, y: 0 } };
    const MORTAR_ROUND_S = 0.85, MORTAR_ROUND_LO = -0.22 * MORTAR_ROUND_S, MORTAR_ROUND_HI = 0.27 * MORTAR_ROUND_S;
    function mortarCrewFired() {
      const L = _mcrew.load;
      if (L.round && _mcrew.round) _mcrew.release.copy(_mcrew.round.position);
      fireMortarLoad(L, Math.max(0.1, mortarFireCd));
    }
    function mortarCrewRound() {
      if (_mcrew.round) return _mcrew.round;
      const r = makeMortarRoundMesh();
      r.name = 'mortar-round-in-hand'; r.scale.setScalar(MORTAR_ROUND_S); r.visible = false;
      r.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      scene.add(r);
      return (_mcrew.round = r);
    }
    function updateMortarCrew(dt) {
      const live = mortarMounted && mortarMounted.type !== 'm240' && !mortarCarried && !playerSwimming && !gameOver ? mortarMounted : null;
      const C = _mcrew, u = marine.userData;
      if (live !== C.mortar && live) { C.age = 0; C.load = createMortarLoad(); }
      if (live) C.mortar = live;
      C.age += dt;
      if (C.from) C.from.age += dt;
      C.w = live ? Math.min(1, C.w + dt / MORTAR_KNEEL.inS) : Math.max(0, C.w - dt / MORTAR_KNEEL.outS);
      const W = smooth01(C.w), m = C.mortar;
      const round = C.round;
      if (W <= 0 || !m || !m.mesh || !u.lowerBody || !u.torsoG) {
        if (C.offset) { marine.position.x = 0; marine.position.z = 0; C.offset = false; }
        if (C.mortar && !live) { C.plant.feet = null; C.from = null; if (round) round.visible = false; C.load = createMortarLoad(); C.mortar = null; }
        return;
      }
      const tube = m.mesh.userData.tube;
      if (!tube) return;
      C.rs = Math.sign(u.armRG.position.x) || 1;   // his right, in his own x
      const rs = C.rs, faceYaw = player.rotation.y;
      // Where he walks in from (the collision root stepped there at once) and the crouch beside the tube.
      const fr = C.from, ea = fr ? smooth01(fr.age / MORTAR_KNEEL.inS) : 1;
      const c = Math.cos(faceYaw), s = Math.sin(faceYaw);
      const kx = rs * MORTAR_KNEEL.side * W, kz = MORTAR_KNEEL.fwd * W;
      let ox = c * kx + s * kz, oz = -s * kx + c * kz;
      if (fr && ea < 1) { ox += (fr.x - player.position.x) * (1 - ea); oz += (fr.z - player.position.z) * (1 - ea); }
      const par = marine.parent;
      par.updateMatrixWorld(true);
      const base = par.localToWorld(C.v.set(0, marine.position.y, 0));
      base.x += ox; base.z += oz;
      marine.position.copy(par.worldToLocal(base)); C.offset = true;
      marine.position.y -= CREW_STANCE.mortar.drop * W;
      const yawIn = -rs * MORTAR_KNEEL.yaw * W + (fr && ea < 1 ? Math.atan2(Math.sin(fr.yaw - faceYaw), Math.cos(fr.yaw - faceYaw)) * (1 - ea) : 0);
      // The load: shells left and settled on the tube.
      const L = stepMortarLoad(C.load, dt, C.w > 0.85 && live && (reserveAmmo['60mm'] | 0) > 0);
      const lu = mortarLoadU(L), ph = L.phase;
      const bump = (p) => (ph === p ? Math.sin(Math.PI * lu) : 0);
      // Hips and shoulders turned in to the tube; the shoulders lean over it, turn back toward the pack on the reach.
      u.lowerBody.rotation.y += (yawIn - u.lowerBody.rotation.y) * W;
      const twist = rs * 0.32 * (ph === 'reach' ? lu : ph === 'grab' ? 1 : ph === 'bring' ? 1 - lu : 0);
      u.torsoG.rotation.y += (yawIn * 0.85 + twist - u.torsoG.rotation.y) * W;
      u.torsoG.rotation.x += (MORTAR_KNEEL.lean + 0.1 * bump('bring') - 0.08 * bump('clear') - u.torsoG.rotation.x) * W;
      u.torsoG.rotation.z *= 1 - W;
      // Feet: a crouch that shuffles round the tube as it swings.
      crewFeet(u, CREW_STANCE.mortar, W, dt, C.plant);
      // The tube: muzzle, axis, and which way is "toward him" across it.
      player.updateMatrixWorld(true); m.mesh.updateMatrixWorld(true);
      const axis = C.axis.set(0, 1, 0).transformDirection(tube.matrixWorld);
      const muzzle = tube.localToWorld(C.muzzle.set(0, 0.626, 0));
      const chest = u.torsoG.getWorldPosition(C.a);
      const toMe = C.toMe.copy(chest).sub(muzzle); toMe.addScaledVector(axis, -toMe.dot(axis)); if (toMe.lengthSq() < 1e-6) toMe.set(0, 0, -1); toMe.normalize();
      const onTube = (y, out) => tube.localToWorld(out.set(0, y, 0)).addScaledVector(toMe, 0.135);
      const P = C.pts;
      P.restR = onTube(0.47, P.restR || new THREE.Vector3());
      P.restL = onTube(0.22, P.restL || new THREE.Vector3());
      P.pack = u.torsoG.localToWorld((P.pack || new THREE.Vector3()).set(rs * 0.215, 0.2, -0.17));
      P.packOut = u.torsoG.localToWorld((P.packOut || new THREE.Vector3()).set(rs * 0.3, 0.3, -0.06));
      P.roundC = (P.roundC || new THREE.Vector3()).copy(muzzle).addScaledVector(axis, 0.03 - MORTAR_ROUND_LO);
      P.hold = (P.hold || new THREE.Vector3()).copy(P.roundC).addScaledVector(toMe, 0.085).addScaledVector(axis, 0.04);
      P.away = (P.away || new THREE.Vector3()).copy(muzzle).addScaledVector(toMe, 0.34).addScaledVector(axis, 0.1);
      const from = { rest: P.restR, away: P.away, hold: P.hold }[L.from] || P.restR;
      const hand = C.hand;
      switch (ph) {
        case 'reach': hand.copy(from).lerp(P.pack, lu); break;
        case 'grab': hand.copy(P.pack).lerp(P.packOut, lu); break;
        case 'bring': hand.copy(P.packOut).lerp(P.hold, lu).addScaledVector(C.b.set(0, 1, 0), 0.12 * Math.sin(Math.PI * lu)); break;
        case 'ready': hand.copy(P.hold); break;
        case 'clear': hand.copy(P.hold).lerp(P.away, lu); break;
        default: hand.copy(L.from === 'rest' ? P.restR : from).lerp(P.restR, lu);
      }
      // Hands: the left on the tube; the right where the drill has it, palm toward the round (channel along the tube),
      // toward his back at the pack.
      const ch = ph === 'reach' || ph === 'grab' ? C.ch.set(0, -1, 0) : C.ch.copy(axis);
      holdHand(u.armRG, u.elbowRG, _HAND_R, hand, ch, 1, _POLE_R, W, 1, W);
      holdHand(u.armLG, u.elbowLG, _HAND_L, P.restL, axis, 1, _POLE_L, W, 1, W);
      const open = ph === 'clear' ? 1 - Math.min(1, L.t / 0.12) : ph === 'reach' ? 0.35 : 1;
      poseHands(u, W * (0.35 + 0.65 * open), W);
      // Head: down at the muzzle, round to the pack on the reach, ducked and turned away as the round goes in.
      if (u.headG) {
        const hx = 0.16 - 0.1 * bump('reach') + 0.32 * bump('clear'), hy = rs * (0.55 * bump('reach') + 0.5 * bump('clear'));
        u.headG.rotation.x += (hx - u.headG.rotation.x) * W; u.headG.rotation.y += (hy - u.headG.rotation.y) * W;
      }
      // The round: in his hand from the grab to the shot, then down the tube.
      const r = mortarCrewRound();
      if (L.round) {
        const wr = wristOf(u.elbowRG);
        player.updateMatrixWorld(true);
        const grip = wr ? wr.localToWorld(C.b.copy(wr.userData.grip || _HAND_R).sub(wr.position)) : C.b.copy(hand);
        r.position.copy(grip).addScaledVector(toMe, -0.085).addScaledVector(axis, -0.04);
        const up = ph === 'bring' ? C.c.set(0, 1, 0).lerp(axis, lu).normalize() : ph === 'ready' ? axis : C.c.set(0, 1, 0);
        r.quaternion.setFromUnitVectors(_crew.az, up);
        r.visible = W > 0.5;
      } else if (L.dropping) {
        const e = L.dropT * L.dropT;
        const inTube = C.c.copy(muzzle).addScaledVector(axis, MORTAR_ROUND_LO * 2.4);
        r.position.copy(C.release).lerp(inTube, e);
        r.quaternion.setFromUnitVectors(_crew.az, axis);
        r.visible = true;
      } else r.visible = false;
    }`);

rep('loop',
`        updateWatchmanExperiencePose(dt);   // GP-174: mounted/carry grip overrides run after the ordinary weapon hold`,
`        updateWatchmanExperiencePose(dt);   // GP-174: mounted/carry grip overrides run after the ordinary weapon hold
        updateMortarCrew(dt);   // GB-156: the mortar crouch, its loading drill and planted feet, over all of it`);

rep('tt',
`watchmanDbg: () => ({state:mortarMounted?.watchman || null,weight:_watchman.weight,ghost:ghostGroup}),`,
`watchmanDbg: () => ({state:mortarMounted?.watchman || null,weight:_watchman.weight,ghost:ghostGroup}), crewDbg: () => ({ mortar: { w: _mcrew.w, phase: _mcrew.load.phase, roundIn: _mcrew.load.round, dropping: _mcrew.load.dropping, dropT: _mcrew.load.dropT, fired: _mcrew.load.fired, round: _mcrew.round, muzzle: _mcrew.muzzle, axis: _mcrew.axis, feet: _mcrew.plant.feet, steps: _mcrew.plant.steps }, m240: { feet: _watchman.plant.feet, steps: _watchman.plant.steps } }),   /* GB-156 */`);

let out = src, bad = 0;
for (const e of edits) {
  const n = out.split(e.a).length - 1;
  if (n !== 1) { console.log('MATCH', e.name, n); bad++; continue; }
  out = out.replace(e.a, () => e.b);
}
if (bad) { console.log('not written'); process.exit(1); }
console.log('edits ok:', edits.length, 'size', src.length, '->', out.length);
if (WRITE) {
  const h1 = crypto.createHash('sha1').update(read()).digest('hex');
  if (h1 !== h0) { console.log('index.html changed since read; not written'); process.exit(2); }
  fs.writeFileSync(F, out, { encoding: 'utf8' });
  console.log('written');
}
