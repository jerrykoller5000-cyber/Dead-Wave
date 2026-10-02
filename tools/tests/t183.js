// t183 - GB-124 (Jerry): unarmed, his arms hang at his sides instead of sticking straight out in front of him.
//  - Standing unarmed: each hand is well below its shoulder, at about hip height, beside the body (not in front
//    of it, not inside the torso), and the arms sway a little.
//  - Walking unarmed: the arms swing in opposition (left against right), each against its own leg.
//  - Armed again (U), the gun hold is back: the gun hand is out in front of the shoulder as before.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  const f2 = (v) => (+v).toFixed(2);
  try {
    await startMatch(T, 'Stance');
    T.clearZombies && T.clearZombies(); T.setHp(100000);
    const px = 18, pz = 18, p = T.player.position;
    T.levelGroundRect(px - 10, pz - 10, px + 10, pz + 10, T.sampleHeight(px, pz), 6);
    p.set(px, T.sampleHeight(px, pz), pz);
    await wait(500);
    const V = T.THREE.Vector3, ud = T.marine.userData;
    // A hand in his own frame: fwd along his facing, side across it, up from his feet.
    const handIn = (grip, arm) => {
      T.player.updateMatrixWorld(true);
      const h = grip.isVector3 ? grip.clone() : grip.getWorldPosition(new V()), s = arm.getWorldPosition(new V());
      const yaw = T.player.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw);
      const dx = h.x - p.x, dz = h.z - p.z;
      return { fwd: dx * fx + dz * fz, side: dx * fz - dz * fx, up: h.y - p.y, belowShoulder: s.y - h.y, fwdOfShoulder: (h.x - s.x) * fx + (h.z - s.z) * fz };
    };
    const armedR = handIn(ud.gripR, ud.armRG);
    ok(armedR.fwdOfShoulder > 0.2, 'armed, the gun hand is out in front of his shoulder (' + f2(armedR.fwdOfShoulder) + ' m)');
    T.toggleHolster();
    ok(T.isUnarmed(), 'U: unarmed');
    await until(() => !T.drawDbg().active, 10000);
    await wait(900);
    // The hand itself (the middle of the fist in the forearm's frame), not the grip point the gun IK aims, which sits ahead of it.
    const fist = (elbow) => { T.player.updateMatrixWorld(true); return elbow.localToWorld(new V(0, -0.25, 0.07)); };
    for (const [name, elbow, arm] of [['left', ud.elbowLG, ud.armLG], ['right', ud.elbowRG, ud.armRG]]) {
      const h = handIn(fist(elbow), arm);
      ok(h.belowShoulder > 0.4, 'unarmed, the ' + name + ' hand hangs well below the shoulder (' + f2(h.belowShoulder) + ' m)');
      ok(h.up > 0.4 && h.up < 0.8, 'at about hip height (' + f2(h.up) + ' m off the ground)');
      ok(Math.abs(h.fwdOfShoulder) < 0.2 && h.fwd < 0.25, 'not pointing forward (' + f2(h.fwdOfShoulder) + ' m ahead of the shoulder)');
      ok(Math.abs(h.side) > 0.22 && Math.abs(h.side) < 0.5, 'beside the body, clear of the torso (' + f2(h.side) + ' m to the side)');
    }
    // A gentle sway standing.
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < 20; i++) { const x = ud.armLG.rotation.x; lo = Math.min(lo, x); hi = Math.max(hi, x); await wait(100); }
    ok(hi - lo > 0.01 && hi - lo < 0.2, 'standing, the arms sway a little (' + f2(hi - lo) + ' rad)');
    // Walking: pinned in place so the legs and arms cycle on the spot.
    key('KeyW', true);
    const pin = setInterval(() => { p.x = px; p.z = pz; }, 2);
    await wait(600);
    const sL = [], sR = [], tL = [];
    for (let i = 0; i < 40; i++) { sL.push(ud.armLG.rotation.x); sR.push(ud.armRG.rotation.x); tL.push(ud.legLG.rotation.x); await wait(30); }
    key('KeyW', false); clearInterval(pin);
    const corr = (a, b) => { const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n; let c = 0, va = 0, vb = 0; for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; } return c / Math.sqrt(va * vb || 1); };
    const range = Math.max(...sL) - Math.min(...sL);
    ok(range > 0.25, 'walking, the arms swing (' + f2(range) + ' rad)');
    ok(corr(sL, sR) < -0.6, 'left against right (correlation ' + f2(corr(sL, sR)) + ')');
    ok(corr(sL, tL) < -0.4, 'each arm against its own leg (correlation ' + f2(corr(sL, tL)) + ')');
    ok(Math.max(...sL) < 0.4, 'the swing stays down at his side, never up in front (' + f2(Math.min(...sL)) + '..' + f2(Math.max(...sL)) + ')');
    await wait(800);
    // Armed again: the gun hold is back.
    T.toggleHolster();
    await until(() => !T.drawDbg().active, 10000);
    await wait(900);
    const back = handIn(ud.gripR, ud.armRG);
    ok(!T.isUnarmed() && back.fwdOfShoulder > 0.2, 'U again: the gun hand is back out in front (' + f2(back.fwdOfShoulder) + ' m, was ' + f2(armedR.fwdOfShoulder) + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()