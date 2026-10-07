// t205 - GB-135 (D-77, Jerry 2026-10-06, playthrough 1): the horde, faster and a mass. (Reserved as t204 in the GB-135
//  check-in; CL-127 took t204 at 3:29 AM CT, so it is t205.) Each body's speed comes through horde.js speedFor: a walker
//  never past 90% of his sprint, a sprinter past his sprint (1.04-1.12x); 70% of them close in as a mass on one front,
//  30% round his sides; a full field refills in a clump (14, or after 10 s), not one body per death. The deterministic
//  numbers are in game/horde.test.mjs; this checks the game uses them.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(2);
  const H = T.hordeDbg;
  try {
    const M = await import(new URL('/game/horde.js', location.origin));
    await startMatch(T, 'Horde135');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    const RUN = H && H.run ? H.run() : 0;
    ok(!!H && typeof H.speedFor === 'function' && RUN > 10 && H.HORDE.CAP_RUN === 0.9 && typeof H.refill === 'function', 'hooks: speedFor, run ' + f2(RUN) + ', CAP_RUN ' + (H && H.HORDE.CAP_RUN) + ', refill');
    const rf = H.refill();
    ok(rf && rf.hold === false && rf.t === 0, 'out of a wave the field is not held: ' + JSON.stringify(rf));
    const p = T.player.position;
    const hc = T.house && T.house.group ? T.house.group.position : { x: p.x - 1, z: p.z };
    let ux = p.x - hc.x, uz = p.z - hc.z; { const l = Math.hypot(ux, uz); if (l < 0.5) { ux = 1; uz = 0; } else { ux /= l; uz /= l; } }
    const S = { x: hc.x + ux * ((T.house && T.house.half) || 6) + ux * 12, z: hc.z + uz * ((T.house && T.house.half) || 6) + uz * 12 };
    const hold = () => { p.set(S.x, T.sampleHeight(S.x, S.z), S.z); T.setHp && T.setHp(100000); };
    hold();
    // (1) Speeds, night 20.
    const BASE = 3.19 * 1.15, sh = [];
    for (let k = 0; k < 40; k++) { const z = T.spawnZombie(S.x + 50 + (k % 8) * 2, S.z + 50 + ((k / 8) | 0) * 2, 'shambler', true, true); if (z) { H.join(z, 20); sh.push(z); } }
    const walk = sh.filter((z) => z.paceBand !== 'sprint'), spr = sh.filter((z) => z.paceBand === 'sprint');
    ok(walk.length > 0 && walk.every((z) => z.speed <= RUN * 0.9 + 1e-6 && Math.abs(z.hzCap - RUN * 0.9) < 1e-6), 'walkers never past 90% of his sprint (top ' + f2(Math.max(...walk.map((z) => z.speed))) + ' of ' + f2(RUN * 0.9) + ')');
    ok(spr.every((z) => z.speed >= RUN * 1.04 - 1e-6 && z.speed <= RUN * 1.12 + 1e-6), spr.length + ' sprinters, all past his sprint (' + spr.map((z) => f2(z.speed)).join(', ') + ')');
    const avg = walk.reduce((a, z) => a + z.speed, 0) / Math.max(1, walk.length), was = walk.reduce((a, z) => a + BASE * z.paceMul, 0) / Math.max(1, walk.length);
    ok(avg >= was * 1.5, 'the walkers are faster on average: ' + f2(avg) + ' m/s (was ' + f2(was) + ')');
    ok(sh.every((z) => Math.abs(z.baseSpeed - z.speed) < 1e-6), 'baseSpeed moves with it (the maimed cuts are off the new speed)');
    // (2) Roles: three in every ten.
    const fl = sh.filter((z) => z.hzRole === 'flank').length, ms = sh.filter((z) => z.hzRole === 'mass').length;
    ok(fl + ms === sh.length && Math.abs(fl - 12) <= 1, fl + ' flankers and ' + ms + ' in the mass of ' + sh.length + ' (70/30)');
    const sp = T.spawnZombie(S.x + 70, S.z + 70, 'spider', true, true); H.join(sp, 20);
    ok(!sp.hzRole && sp.hzCap === undefined, 'the spider takes no role and no cap');
    // (3) The cap holds in the game: a walker given 40 m/s still goes no faster than its cap.
    T.clearZombies(); await wait(200);
    const q = T.spawnZombie(S.x + ux * 60, S.z + uz * 60, 'shambler', true, true); q.riseT = 0; q.hp = q.maxHp = 1e6; H.join(q, 1);
    while (q.paceBand === 'sprint') { q.hz = undefined; H.join(q, 1); }
    q.speed = q.baseSpeed = 40; q.sprintT = 0;
    await wait(300);
    let mx = 0;
    { const s0 = T.getSimTime(), c0 = Date.now(); let lx = q.mesh.position.x, lz = q.mesh.position.z, lt = s0;
      while (T.getSimTime() - s0 < 1.5 && Date.now() - c0 < 8000) { hold(); await wait(100);
        const t = T.getSimTime(), d = Math.hypot(q.mesh.position.x - lx, q.mesh.position.z - lz);
        if (t - lt > 0.05 && !(q.hzLungeT > 0) && !(q.sprintT > 0)) mx = Math.max(mx, d / (t - lt));
        lx = q.mesh.position.x; lz = q.mesh.position.z; lt = t; } }
    ok(mx > 1 && mx <= q.hzCap * 1.25 + 0.5, 'a walker pushed to 40 m/s holds to its cap: ' + f2(mx) + ' m/s, cap ' + f2(q.hzCap));
    // (4) A column from one side: once there is a mass, the flankers take slots round his sides (sampled while they are
    // still coming, past CLOSE, where the slot steers them; they re-think at once when the front forms or swings).
    T.clearZombies(); await wait(200);
    const col = [];
    for (let k = 0; k < 10; k++) {
      const z = T.spawnZombie(S.x + ux * (24 + k * 1.3), S.z + uz * (24 + k * 1.3), 'shambler', true, true);
      if (!z) continue; z.riseT = 0; z.hp = z.maxHp = 1e6; H.join(z, 1); col.push(z);
    }
    let seenMass = null; const offs = [];
    { const s0 = T.getSimTime(), c0 = Date.now();
      while (T.getSimTime() - s0 < 12 && Date.now() - c0 < 40000) { hold(); await wait(100);
        const st = H.state(); if (st.massAng != null) { seenMass = st.massAng;
          for (const z of col) if (z.alive && z.hzRole === 'flank' && z.hzSlot >= 0 && z.hzD > H.HORDE.CLOSE && T.getSimTime() - s0 > 0.5) offs.push(Math.abs(M.wanderAngle(M.slotAngle(z.hzSlot), st.massAng)) * 180 / Math.PI); } } }
    ok(col.filter((z) => z.hzRole === 'flank').length === 3, 'three of the ten are flankers');
    ok(seenMass != null, 'the mass found its front (' + (seenMass == null ? 'none' : f2(seenMass * 180 / Math.PI) + ' deg') + ')');
    const inBand = offs.filter((a) => a >= 80 - 1 && a <= 125 + 1).length;
    ok(offs.length > 0 && inBand / offs.length >= 0.7, 'the flankers hold slots 80-125 deg off the front: ' + inBand + ' of ' + offs.length + ' samples');
    // (5) The refill rule the game calls.
    ok(!M.refillReady(47, 48, 3) && M.refillReady(34, 48, 0) && M.refillReady(47, 48, 10), 'refill: one death waits; 14 down or 10 s, a clump');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  try { T.clearZombies(); } catch (_) {}
  return out.join('\n');
})();
