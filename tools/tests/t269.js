// t269 - temporary grokbot probe of t244 frame 23 head jump; to be removed.
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
    step(10);
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
    // GB-202 sweep probe (temporary): per frame, the head and hips steps and the head relative to the hips, frames 1-40.
    let prev = sample(), prevR = null;
    for (let i = 1; i <= 40; i++) { step(1); const s = sample(), D = T.crewDbg().mortar, rel = s.head.clone().sub(s.hips);
      const dh = s.head.distanceTo(prev.head), dp = s.hips.distanceTo(prev.hips), dr = prevR ? rel.distanceTo(prevR) : 0;
      if (i >= 15 && i <= 30 || dh > 0.04) out.push('INFO f' + i + ' head ' + cm(dh) + ' hips ' + cm(dp) + ' head-vs-hips ' + cm(dr) + ' (dy ' + cm(rel.y - (prevR ? prevR.y : rel.y)) + ') w ' + f2(D.w) + ' phase ' + D.phase + ' hipsY ' + f2(s.hips.y) + ' crouch? ' + (u.headG ? f2(u.headG.rotation.x) + '/' + f2(u.headG.rotation.y) : '-'));
      prev = s; prevR = rel; }
    performance.now = nowReal; window.requestAnimationFrame = rafReal; for (const cb of q) rafReal(cb);
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()