// t247 - GB-158 (Jerry 2026-10-11, 2:24 AM CT, after the speed table): "let us set the baseline speed of the shambler at
//  4.3 with a lunge speed of 5.0. Feral stays the same. Pull Military top speed down to a 6.0. Screamer and drowned stay the
//  same. Crank demon up to 6.0 on average. Crank colossus to about 4.0. Crank guardian up to 7.0." All in m/s on the ground
//  for a body that is not a sprinter (horde.js SPEED_TARGET; the bosses in ZOMBIE_TYPES). Sprinters keep D-77's rule; the
//  demon's charge keeps its old pace; the untouched kinds give the D-77 numbers exactly. The deterministic numbers are in
//  game/horde.test.mjs; this checks the game uses them, and that the bosses really cover the ground at their new speeds.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(2);
  const H = T.hordeDbg;
  try {
    await startMatch(T, 'Speeds158');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    const RUN = H.run(), CAP = RUN * 0.9;
    const p = T.player.position;
    const hc = T.house && T.house.group ? T.house.group.position : { x: p.x - 1, z: p.z };
    let ux = p.x - hc.x, uz = p.z - hc.z; { const l = Math.hypot(ux, uz); if (l < 0.5) { ux = 1; uz = 0; } else { ux /= l; uz /= l; } }
    const S = { x: hc.x + ux * ((T.house && T.house.half) || 6) + ux * 12, z: hc.z + uz * ((T.house && T.house.half) || 6) + uz * 12 };
    const hold = () => { p.set(S.x, T.sampleHeight(S.x, S.z), S.z); T.setHp && T.setHp(100000); };
    hold();
    const spawnJoin = (k, n, night) => { const a = []; for (let i = 0; i < n; i++) { const z = T.spawnZombie(S.x + 60 + (i % 8) * 2, S.z + 60 + ((i / 8) | 0) * 2, k, true, true); if (z) { H.join(z, night); a.push(z); } } return a; };
    const walkers = (a) => a.filter((z) => z.paceBand !== 'sprint');
    const span = (a) => f2(Math.min(...a.map((z) => z.speed))) + '-' + f2(Math.max(...a.map((z) => z.speed)));
    const mean = (a) => a.reduce((s, z) => s + z.speed, 0) / Math.max(1, a.length);
    // (1) Shambler: 3.9-4.7, about 4.3 on average, lunge 5.0, top 5.0; its sprinters as D-77.
    const sh = spawnJoin('shambler', 40, 20), shW = walkers(sh), shS = sh.filter((z) => z.paceBand === 'sprint');
    ok(shW.length > 20 && shW.every((z) => z.speed >= 3.9 - 1e-6 && z.speed <= 4.7 + 1e-6 && z.hzCap === 5 && z.hzLungeAbs === 5 && Math.abs(z.baseSpeed - z.speed) < 1e-6), 'shamblers walk ' + span(shW) + ' m/s (mean ' + f2(mean(shW)) + '), top and lunge 5.0');
    ok(shS.every((z) => z.speed >= RUN * 1.04 - 1e-6 && z.speed <= RUN * 1.12 + 1e-6 && !z.hzLungeAbs), shS.length + ' shambler sprinters still past his sprint (' + shS.map((z) => f2(z.speed)).join(', ') + ')');
    T.clearZombies(); await wait(100);
    // (2) Soldier: never past 6.0 (and that is its cap and its lunge).
    const mi = walkers(spawnJoin('military', 24, 10));
    ok(mi.length > 10 && mi.every((z) => z.speed >= 5.0 - 1e-6 && z.speed <= 6.0 + 1e-6 && z.hzCap === 6 && z.hzLungeAbs === 6), 'soldiers walk ' + span(mi) + ' m/s, top 6.0');
    T.clearZombies(); await wait(100);
    // (3) Demon: 5.6-6.4, the charge at its old 13.4-15.1.
    const de = spawnJoin('demon', 16, 10);
    ok(de.length > 10 && de.every((z) => z.speed >= 5.6 - 1e-6 && z.speed <= 6.4 + 1e-6) && Math.abs(mean(de) - 6.0) < 0.25, 'demons walk ' + span(de) + ' m/s (mean ' + f2(mean(de)) + ')');
    ok(de.every((z) => z.chargeBase * 3.1 >= 13.4 - 0.05 && z.chargeBase * 3.1 <= 15.1 + 0.05), 'demon charges ' + f2(Math.min(...de.map((z) => z.chargeBase * 3.1))) + '-' + f2(Math.max(...de.map((z) => z.chargeBase * 3.1))) + ' m/s (as before)');
    T.clearZombies(); await wait(100);
    // (4) Untouched: feral, screamer, drowned give the D-77 speed exactly.
    for (const [k, base] of [['feral', 5.4], ['screamer', 3.5], ['drowned', 2.4]]) {
      const a = walkers(spawnJoin(k, 16, 10));
      ok(a.length > 5 && a.every((z) => Math.abs(z.speed - Math.min(CAP, base * 1.15 * z.paceMul * 1.6)) < 1e-6 && Math.abs(z.hzCap - CAP) < 1e-6 && !z.hzLungeAbs), k + ' unchanged: ' + span(a) + ' m/s');
      T.clearZombies(); await wait(50);
    }
    // (5) The bosses on the ground: the colossus about 4.0, the guardian 7.0, walking at him from 34 m.
    const live = async (k, want, secs) => {
      T.clearZombies(); await wait(200); hold();
      const z = T.spawnZombie(S.x + ux * 34, S.z + uz * 34, k, true, true); z.riseT = 0; z.hp = z.maxHp = 1e7;
      await wait(500);
      let dist = 0, t = 0, ph0 = z.walkPhase || 0; const s0 = T.getSimTime(), c0 = Date.now();
      let lx = z.mesh.position.x, lz = z.mesh.position.z, lt = s0;
      while (T.getSimTime() - s0 < secs && Date.now() - c0 < 12000) {
        hold(); await wait(100);
        const tt = T.getSimTime(), d = Math.hypot(z.mesh.position.x - lx, z.mesh.position.z - lz);
        if (Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z) > 6 && !(z.slamWind > 0) && !(z.attackWindup > 0)) { dist += d; t += tt - lt; }
        lx = z.mesh.position.x; lz = z.mesh.position.z; lt = tt;
      }
      const v = t > 0 ? dist / t : 0;
      ok(Math.abs(z.speed - want) < 1e-6 && v > want * 0.8 && v < want * 1.1, k + ': speed ' + f2(z.speed) + ', measured ' + f2(v) + ' m/s over ' + f2(t) + ' s');
      return { z, v, rpm: dist > 0 ? ((z.walkPhase || 0) - ph0) / dist : 0 };
    };
    const co = await live('colossus', 4.0, 2.5);
    ok(co.rpm > 1.5 && co.rpm < 2.7, 'the colossus strides ' + f2(co.rpm) + ' rad/m (it was 3.8 / 1.84 = 2.07): its feet keep up');
    await live('guardian', 7.0, 2.5);
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  try { T.clearZombies(); } catch (_) {}
  return out.join('\n');
})();
