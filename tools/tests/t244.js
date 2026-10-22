// t244 - GB-156 (Jerry, 2026-10-09: "Could you make the animation for mounting both the mortar and the Watchman MG a
// little more realistic. For the mortar he takes a round out of his backpack with one hand and drops it down the tube.
// Pay attention to how the player mounts these two and what his feet look like when he is rotating them around. They
// need to move with the motion of the gun instead of sliding around frictionless.")
// On a manual 60 fps clock: mounting either gun moves his body without a jump (no frame moves the hips or head more than
// 6 cm, a hand more than 10); the mortar's round is in his hand over the muzzle before the shot, the shot still leaves on the click
// (shell spent, cooldown as before), and the round is gone down the tube within 0.1 s; traversing either gun through
// +-70 degrees, a planted foot never drifts 2 cm; stepping off either walks back without a jump.
// Needs the real renderer for the poses (node handoffs/2026-10-09-grokbot-GB-154/real-test.mjs tools/tests/t244.js).
(async () => {
  const T = window.TT, THREE = T.THREE, out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const f2 = (v) => (+v).toFixed(2), cm = (v) => (v * 100).toFixed(1) + ' cm';
  try {
    await startMatch(T, 'Crew');
    if (!T.crewDbg) { ok(false, 'crewDbg hook present'); return out.join('\n'); }
    const real = THREE.Matrix4 && new THREE.Matrix4().makeTranslation(1, 2, 3).elements[12] === 1;
    if (!real) { out.push('SKIP the poses need real three (run on the real renderer)'); return out.join('\n'); }
    const nowReal = performance.now.bind(performance), rafReal = window.requestAnimationFrame;
    let ft = nowReal(), q = [], aim = null;
    performance.now = () => ft;
    window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
    await new Promise((r) => setTimeout(r, 600));   // the loop's pending real frame runs, and asks this clock for the next
    const step = (n = 1, each) => { for (let i = 0; i < n; i++) { if (each) each(i); if (aim) T.aimTarget.set(...aim); ft += 1000 / 60; const qq = q; q = []; for (const cb of qq) cb(ft); } };
    T.clearZombies && T.clearZombies(); T.setHp && T.setHp(100000); T.unlockAllBuilds(); T.addCash(100000);
    for (const t of T.trees) { t.alive = false; t.stump = false; }
    for (const r of T.rocks) r.alive = false;
    const p = T.player.position, gx0 = T.gridIndex(p.x), gz0 = T.gridIndex(p.z);
    T.levelGroundRect(T.gridCentre(gx0 - 10), T.gridCentre(gz0 - 10), T.gridCentre(gx0 + 10), T.gridCentre(gz0 + 10), T.sampleHeight(p.x, p.z), 6);
    const sim0 = T.getSimTime ? T.getSimTime() : 0;
    step(10);
    // GB-210: the test page's three stand-in now has real matrices, so the check above no longer catches it, but this
    // manual clock does not move its game (no game time passes): the poses are left to the real renderer, as intended.
    if (T.getSimTime && T.getSimTime() === sim0) { performance.now = nowReal; window.requestAnimationFrame = rafReal; for (const cb of q) rafReal(cb); out.push('SKIP the manual clock does not drive this page (run on the real renderer)'); return out.join('\n'); }
    const m = T.getMarine(), u = m.userData, V = () => new THREE.Vector3();
    const J = { hips: u.lowerBody, head: u.headG, wristL: u.elbowLG.userData.wrist, wristR: u.elbowRG.userData.wrist, ankleL: u.ankleLG, ankleR: u.ankleRG };
    const sample = () => { m.updateMatrixWorld(true); const s = {}; for (const [k, o] of Object.entries(J)) s[k] = o.getWorldPosition(V()); return s; };
    // A jump: the hips or head moving more than 6 cm in a frame, or a hand more than 10 cm (a hand reaching quickly moves ~6).
    const LIM = { hips: 0.06, head: 0.06, wristL: 0.1, wristR: 0.1 };
    const maxJump = (fr) => { let w = 0, wk = ''; for (let i = 1; i < fr.length; i++) for (const k in LIM) { const d = fr[i][k].distanceTo(fr[i - 1][k]) / LIM[k]; if (d > w) { w = d; wk = k + '@' + i + ' ' + cm(d * LIM[k]); } } return [w, wk]; };
    // Planted-foot drift: from where a foot plants until it lifts, the rendered ankle (horizontal).
    const slipRun = (feetOf, n, each) => {
      let worst = 0; const start = [null, null];
      for (let i = 0; i < n; i++) {
        step(1, each); const s = sample(), feet = feetOf();
        if (!feet) continue;
        ['ankleL', 'ankleR'].forEach((k, j) => {
          if (!feet[j].planted) { start[j] = null; return; }
          if (!start[j]) { start[j] = s[k].clone(); return; }
          worst = Math.max(worst, Math.hypot(s[k].x - start[j].x, s[k].z - start[j].z));
        });
      }
      return worst;
    };
    const place = (kind, dx) => {
      for (const b of [...T.builds]) if (b.type === 'mortar' || b.type === 'm240') T.removeBuild(b);
      const gx = gx0 + dx, gz = gz0 + 2;
      const b = T.placeBuildAt(kind, gx, gz) || T.spawnBuild(kind, T.gridCentre(gx), T.gridCentre(gz));
      b.mesh.rotation.y = 0; T.getReserve()['60mm'] = 20; if (kind === 'm240') b.belt = 200;
      p.x = b.x + 1.2; p.z = b.z - 1.6; p.y = T.sampleHeight(p.x, p.z);
      aim = [b.x, T.sampleHeight(b.x, b.z + 18), b.z + 18];
      step(30);
      return b;
    };
    const sweep = (b) => (i) => { const a = i < 90 ? -1.22 * i / 90 : i < 270 ? -1.22 + 2.44 * (i - 90) / 180 : 1.22 - 1.22 * (i - 270) / 90; aim = [b.x + Math.sin(a) * 18, T.sampleHeight(b.x + Math.sin(a) * 18, b.z + Math.cos(a) * 18), b.z + Math.cos(a) * 18]; };

    // ---- The mortar.
    const mo = place('mortar', 2);
    let fr = [sample()];
    ok(T.mountMortar(mo) === true, 'he mounts the mortar');
    for (let i = 0; i < 70; i++) { step(1); fr.push(sample()); }
    let [jw, jk] = maxJump(fr);
    ok(jw < 1, 'mortar mount: no jump - worst frame ' + jk + ' (' + (jw * 100).toFixed(0) + '% of its limit)');
    ok(fr[0].hips.distanceTo(fr[1].hips) < 0.05, 'mortar mount: the body does not teleport to the crew spot (' + cm(fr[0].hips.distanceTo(fr[1].hips)) + ' on the first frame)');
    const hipsMoved = Math.hypot(fr[70].hips.x - fr[0].hips.x, fr[70].hips.z - fr[0].hips.z);
    ok(hipsMoved > 0.5 && fr[70].hips.y < fr[0].hips.y - 0.12, 'he walks in and crouches beside the tube (hips moved ' + cm(hipsMoved) + ', down ' + cm(fr[0].hips.y - fr[70].hips.y) + ')');
    step(120);
    let D = T.crewDbg().mortar;
    const axis = D.axis.clone(), muzzle = D.muzzle.clone();
    ok(D.phase === 'ready' && D.roundIn && D.round && D.round.visible, 'a round is in his hand, ready (' + D.phase + ')');
    if (D.round) {
      const rel = D.round.position.clone().sub(muzzle), along = rel.dot(axis), off = rel.addScaledVector(axis, -along).length();
      ok(along > 0.1 && along < 0.35 && off < 0.05, 'held over the muzzle, on the bore line (' + f2(along) + ' m up the axis, ' + cm(off) + ' off it)');
    }
    // He took it from his pack: earlier in the drill the hand was behind his shoulders.
    const shells = T.getReserve()['60mm'];
    T.fireMortar();
    ok(T.getReserve()['60mm'] === shells - 1, 'the shot still leaves on the click (a shell spent at once)');
    T.fireMortar();
    ok(T.getReserve()['60mm'] === shells - 1, 'and the cooldown still holds the next shot (a second click at once spends nothing)');
    D = T.crewDbg().mortar;
    ok(D.dropping && D.round.visible, 'the round is let go into the tube on the shot');
    let goneAt = -1, lowest = 1;
    for (let i = 1; i <= 12; i++) {
      step(1); D = T.crewDbg().mortar;
      if (D.round.visible) { const rel = D.round.position.clone().sub(D.muzzle); lowest = Math.min(lowest, rel.dot(D.axis)); }
      else if (goneAt < 0) goneAt = i;
    }
    ok(goneAt > 0 && goneAt <= 6, 'it slides down and is gone into the tube ' + (goneAt * 1000 / 60).toFixed(0) + ' ms after the shot (lowest seen ' + f2(lowest) + ' m on the axis)');
    // The next round: reach to the pack, round in hand, back over the muzzle, all inside the cooldown.
    const torsoBack = (pt) => u.torsoG.worldToLocal(pt.clone()).z;
    let reachedPack = false, inHand = false, readyAt = -1;
    for (let i = 0; i < 140; i++) {
      step(1); D = T.crewDbg().mortar;
      const w = sample().wristR;
      if ((D.phase === 'reach' || D.phase === 'grab') && torsoBack(w) < -0.02) reachedPack = true;
      if (D.roundIn && D.round.visible) inHand = true;
      if (D.phase === 'ready' && readyAt < 0) readyAt = i;
    }
    ok(reachedPack, 'his right hand goes back to the pack for the next round');
    ok(inHand, 'the next round is in his hand');
    ok(readyAt > 0 && readyAt / 60 < 2.4, 'and over the muzzle again ' + f2(readyAt / 60) + ' s after the shot, inside the 2.4 s cooldown');
    // Traverse.
    const ms = slipRun(() => T.crewDbg().mortar.feet, 360, sweep(mo));
    ok(ms < 0.02, 'mortar traverse +-70 deg: a planted foot drifts at most ' + cm(ms) + ' (' + T.crewDbg().mortar.steps + ' steps)');
    aim = [mo.x, T.sampleHeight(mo.x, mo.z + 18), mo.z + 18]; step(60);
    fr = [sample()]; T.dismountMortar(); for (let i = 0; i < 50; i++) { step(1); fr.push(sample()); }
    [jw, jk] = maxJump(fr);
    ok(jw < 1, 'mortar dismount: no jump (worst ' + jk + ', ' + (jw * 100).toFixed(0) + '% of its limit)');
    ok(!T.crewDbg().mortar.round.visible && Math.abs(m.position.x) < 1e-6 && Math.abs(m.position.z) < 1e-6, 'off the tube: no round, his body back on his root');

    // ---- The Watchman.
    const mg = place('m240', -2);
    fr = [sample()];
    ok(T.mountMortar(mg) === true, 'he mounts the Watchman');
    for (let i = 0; i < 50; i++) { step(1); fr.push(sample()); }
    [jw, jk] = maxJump(fr);
    ok(jw < 1, 'Watchman mount: no jump (worst ' + jk + ', ' + (jw * 100).toFixed(0) + '% of its limit)');
    const ws = slipRun(() => T.crewDbg().m240.feet, 360, sweep(mg));
    ok(ws < 0.02, 'Watchman traverse +-70 deg: a planted foot drifts at most ' + cm(ws) + ' (' + T.crewDbg().m240.steps + ' steps)');
    aim = [mg.x, T.sampleHeight(mg.x, mg.z + 18), mg.z + 18]; step(60);
    fr = [sample()]; T.dismountMortar(); for (let i = 0; i < 50; i++) { step(1); fr.push(sample()); }
    [jw, jk] = maxJump(fr);
    ok(jw < 1, 'Watchman dismount: he steps back off it, no jump (worst ' + jk + ', ' + (jw * 100).toFixed(0) + '% of its limit)');
    performance.now = nowReal; window.requestAnimationFrame = rafReal; for (const cb of q) rafReal(cb);
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
