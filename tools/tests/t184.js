// t184 - GB-125 (Jerry): a natural tactical crouch.
//  - Crouched (hold C), armed: the hips are clearly lower, both boots are on the ground (not sunk into it, not
//    floating), the knees are above the ground and bend forward, the chest leans in and the head stays up; the gun
//    hand is still out in front and the gun still points where it did standing.
//  - Crouch-walking: the soles never sink below the ground, one foot is always planted while the other lifts,
//    and the knees stay above the ground.
//  - Unarmed and crouched: the hands come down in front, near the knees, not straight out and not into the legs.
//  - Letting go of C blends back up to the standing height.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  const f2 = (v) => (+v).toFixed(2), f3 = (v) => (+v).toFixed(3);
  try {
    await startMatch(T, 'Crouch');
    T.clearZombies && T.clearZombies(); T.setHp(100000);
    const px = 18, pz = 18, p = T.player.position;
    T.levelGroundRect(px - 10, pz - 10, px + 10, pz + 10, T.sampleHeight(px, pz), 6);
    p.set(px, T.sampleHeight(px, pz), pz);
    await wait(600);
    const V = T.THREE.Vector3, ud = T.marine.userData;
    const gy = () => T.sampleHeight(p.x, p.z);
    // His own frame: fwd along his facing, up from the ground.
    const frame = (w) => { const yaw = T.player.rotation.y; return { fwd: (w.x - p.x) * Math.sin(yaw) + (w.z - p.z) * Math.cos(yaw), up: w.y - gy() }; };
    const legs = () => {
      T.player.updateMatrixWorld(true);
      const r = {};
      for (const s of ['L', 'R']) {
        const box = new T.THREE.Box3().setFromObject(ud['ankle' + s + 'G']);
        const hip = frame(ud['leg' + s + 'G'].getWorldPosition(new V())), knee = frame(ud['knee' + s + 'G'].getWorldPosition(new V()));
        const ank = frame(ud['ankle' + s + 'G'].getWorldPosition(new V()));
        // How far the knee sits ahead of the straight line from hip to ankle (a knee bending forward is > 0).
        const t = (knee.up - hip.up) / ((ank.up - hip.up) || -1e-6);
        r[s] = { sole: box.min.y - gy(), hip: hip.up, knee: knee.up, kneeAhead: knee.fwd - (hip.fwd + (ank.fwd - hip.fwd) * t) };
      }
      return r;
    };
    const gunDir = () => { T.player.updateMatrixWorld(true); const q = ud.weaponMount.getWorldQuaternion(new T.THREE.Quaternion()); return new V(0, 0, 1).applyQuaternion(q); };
    const gripFwd = () => { T.player.updateMatrixWorld(true); const g = frame(ud.gripR.getWorldPosition(new V())), s = frame(ud.armRG.getWorldPosition(new V())); return g.fwd - s.fwd; };
    const headUp = () => { T.player.updateMatrixWorld(true); const q = ud.headG.getWorldQuaternion(new T.THREE.Quaternion()); return new V(0, 0, 1).applyQuaternion(q).y; };

    // Standing, armed.
    const st = legs(), stDir = gunDir(), stGrip = gripFwd();
    // Crouched, armed.
    key('KeyC', true);
    await wait(2000);
    ok(T.getCrouching(), 'C held: crouching');
    const cr = legs();
    ok(st.L.hip - cr.L.hip > 0.12, 'the hips drop (' + f2(st.L.hip) + ' -> ' + f2(cr.L.hip) + ' m)');
    for (const s of ['L', 'R']) {
      ok(cr[s].sole > -0.04 && cr[s].sole < 0.03, s + ' boot on the ground, not sunk or floating (sole ' + f3(cr[s].sole) + ' m; standing ' + f3(st[s].sole) + ')');
      ok(cr[s].knee > 0.12, s + ' knee above the ground (' + f2(cr[s].knee) + ' m)');
      ok(cr[s].kneeAhead > 0.05, s + ' knee bends forward (' + f2(cr[s].kneeAhead) + ' m ahead of hip-ankle line)');
    }
    ok(ud.torsoG.rotation.x > 0.2, 'the chest leans in (' + f2(ud.torsoG.rotation.x) + ' rad)');
    ok(Math.abs(headUp()) < 0.2, 'the head stays up (look pitch ' + f2(headUp()) + ')');
    const crDir = gunDir(), crGrip = gripFwd();
    ok(crGrip > 0.2, 'armed crouch: the gun hand is out in front (' + f2(crGrip) + ' m, standing ' + f2(stGrip) + ')');
    const ang = Math.acos(Math.max(-1, Math.min(1, crDir.dot(stDir))));
    ok(ang < 0.12, 'the gun points where it did standing (' + f2(ang) + ' rad apart)');
    // Crouch-walk, pinned in place so the legs cycle on the spot.
    key('KeyW', true);
    const pin = setInterval(() => { p.x = px; p.z = pz; }, 2);
    await wait(800);
    let minSole = Infinity, maxPlanted = -Infinity, minKnee = Infinity, liftL = -Infinity, liftR = -Infinity;
    for (let i = 0; i < 50; i++) {
      const l = legs();
      minSole = Math.min(minSole, l.L.sole, l.R.sole);
      maxPlanted = Math.max(maxPlanted, Math.min(l.L.sole, l.R.sole));
      minKnee = Math.min(minKnee, l.L.knee, l.R.knee);
      liftL = Math.max(liftL, l.L.sole); liftR = Math.max(liftR, l.R.sole);
      await wait(25);
    }
    key('KeyW', false); clearInterval(pin);
    ok(minSole > -0.045, 'crouch-walk: no sole sinks into the ground (lowest ' + f3(minSole) + ' m)');
    ok(maxPlanted < 0.035, 'one foot is always planted (worst ' + f3(maxPlanted) + ' m)');
    ok(liftL > 0.03 && liftR > 0.03, 'and each foot lifts for its step (' + f3(liftL) + ', ' + f3(liftR) + ' m)');
    ok(minKnee > 0.1, 'the knees stay above the ground (lowest ' + f2(minKnee) + ' m)');
    await wait(600);
    // Unarmed and crouched: hands down in front, near the knees.
    T.toggleHolster();
    await until(() => !T.drawDbg().active, 10000);
    await wait(1200);
    ok(T.isUnarmed() && T.getCrouching(), 'U while crouched: unarmed, still crouching');
    const fist = (elbow) => { T.player.updateMatrixWorld(true); return elbow.localToWorld(new V(0, -0.25, 0.07)); };
    for (const [s, elbow, arm] of [['L', ud.elbowLG, ud.armLG], ['R', ud.elbowRG, ud.armRG]]) {
      const h = fist(elbow), sh = arm.getWorldPosition(new V()), kn = ud['knee' + s + 'G'].getWorldPosition(new V());
      const hf = frame(h), kf = frame(kn);
      ok(sh.y - h.y > 0.3, 'unarmed crouch: the ' + s + ' hand hangs below the shoulder (' + f2(sh.y - h.y) + ' m)');
      ok(h.distanceTo(kn) < 0.35, 'near the knee (' + f2(h.distanceTo(kn)) + ' m)');
      ok(hf.up > 0.12, 'and clear of the ground (' + f2(hf.up) + ' m)');
      ok(hf.fwd - frame(sh).fwd < 0.45, 'not reaching out in front (' + f2(hf.fwd - frame(sh).fwd) + ' m ahead of the shoulder)');
    }
    // Stand up: blends back to the standing height.
    key('KeyC', false);
    await wait(120);
    const mid = legs();
    ok(mid.L.sole > -0.07 && mid.R.sole > -0.07, 'standing up, the boots stay on the ground mid-blend (' + f3(mid.L.sole) + ', ' + f3(mid.R.sole) + ')');
    await wait(1500);
    const up = legs();
    ok(!T.getCrouching() && Math.abs(up.L.hip - st.L.hip) < 0.03, 'C released: back to the standing height (' + f2(up.L.hip) + ' m, was ' + f2(st.L.hip) + ')');
    T.toggleHolster();
    await until(() => !T.drawDbg().active, 10000);
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
