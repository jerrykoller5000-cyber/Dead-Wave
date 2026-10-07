// t198 - GB-94 (written as t193, then t195; moved here 2026-10-05 after CL-120 took t193 and CL-122 took t195) (P-79, Jerry 2026-10-05): the horde's manners, in the game. Each body from the horde rolls its own pace
// inside its type (a TT spawn keeps the old walk unless it joins with TT.hordeDbg.join), and a column that comes at him
// single file arrives round him from several sides, with the pack's rush on the way. The deterministic numbers are in
// game/horde.test.mjs; this checks the game uses them.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const H = T.hordeDbg;
  try {
    await startMatch(T, 'Horde');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    ok(!!H && !!H.HORDE && H.HORDE.SLOTS === 12, 'the debug handle is there (12 slots)');
    const p = T.player.position;
    const hc = T.house && T.house.group ? T.house.group.position : { x: p.x - 1, z: p.z };
    let ux = p.x - hc.x, uz = p.z - hc.z; { const l = Math.hypot(ux, uz); if (l < 0.5) { ux = 1; uz = 0; } else { ux /= l; uz /= l; } }
    const S = { x: hc.x + ux * ((T.house && T.house.half) || 6) + ux * 12, z: hc.z + uz * ((T.house && T.house.half) || 6) + uz * 12 };
    const hold = () => { p.set(S.x, T.sampleHeight(S.x, S.z), S.z); T.setHp && T.setHp(100); };
    hold();
    // (1) Its own pace inside its type.
    const BASE = 3.19 * 1.15;
    const sh = [];
    for (let k = 0; k < 24; k++) { const z = T.spawnZombie(S.x + 40 + (k % 6) * 2, S.z + 40 + ((k / 6) | 0) * 2, 'shambler', true, true); if (z) { H.join(z); sh.push(z); } }
    const mul = sh.map((z) => z.paceMul);
    ok(sh.length === 24 && mul.every((m) => m >= 0.78 - 1e-9 && m <= 1.45 + 1e-9), 'every shambler rolls a pace in 0.78-1.45 of the type (' + Math.min(...mul).toFixed(2) + '-' + Math.max(...mul).toFixed(2) + ')');
    ok(new Set(mul.map((m) => m.toFixed(3))).size >= 20, 'and not one pace: ' + new Set(mul.map((m) => m.toFixed(3))).size + ' different among 24');
    // GB-135 (D-77, Jerry 2026-10-06: faster dead, up to 90% of his sprint, sprinters outrun him) changed this: the pace
    // roll is the same, but the speed it gives now comes through horde.js speedFor (was: the type speed times its pace).
    const want = (z) => H.speedFor('shambler', BASE * z.paceMul, { band: z.paceBand, u: z.paceU }, H.run()).speed;
    ok(sh.every((z) => Math.abs(z.speed - want(z)) < 1e-6 && Math.abs(z.baseSpeed - want(z)) < 1e-6), 'its walking speed is its pace through speedFor (GB-135)');
    ok(new Set(sh.map((z) => z.paceBand)).size >= 2, 'bands among them: ' + [...new Set(sh.map((z) => z.paceBand))].join(', '));
    const br = []; for (let k = 0; k < 6; k++) { const z = T.spawnZombie(S.x + 40 + k * 2, S.z + 52, 'brute', true, true); if (z) { H.join(z); br.push(z); } }
    ok(br.length === 6 && br.every((z) => z.paceMul >= 0.94 && z.paceMul <= 1.06), 'a brute stays a brute (0.94-1.06)');
    const sp = T.spawnZombie(S.x + 52, S.z + 52, 'spider', true, true); H.join(sp);
    ok(sp.paceMul === 1 && sp.hz === null, 'the spider keeps its own walk');
    const tt = T.spawnZombie(S.x + 54, S.z + 52, 'shambler', true, true); const ttSpeed = tt.speed;
    await wait(150);
    ok(tt.hz === null && tt.speed === ttSpeed, 'a TT spawn that does not join keeps the old walk (the older checks)');
    T.clearZombies(); await wait(200);
    // (2) A column of ten, single file, from 26 m: they arrive round him from several sides.
    const col = [];
    for (let k = 0; k < 10; k++) {
      const x = S.x + ux * (26 + k * 1.3), zq = S.z + uz * (26 + k * 1.3);
      const z = T.spawnZombie(x, zq, 'shambler', true, true);
      if (!z) continue;
      z.riseT = 0; z.hp = z.maxHp = 1e6; H.join(z); col.push(z);
    }
    const r0 = H.state().rushes;
    const arrived = new Map(), slots = new Set();
    const s0 = T.getSimTime(), c0 = Date.now();
    while (arrived.size < col.length && T.getSimTime() - s0 < 25 && Date.now() - c0 < 60000) {
      hold(); await wait(50);
      for (const z of col) {
        if (!z.alive) continue;
        if (z.hzSlot >= 0) slots.add(z.hzSlot);
        if (arrived.has(z)) continue;
        const dx = z.mesh.position.x - S.x, dz = z.mesh.position.z - S.z;
        if (Math.hypot(dx, dz) < 3) arrived.set(z, Math.atan2(dz, dx));
      }
    }
    const home = Math.atan2(uz, ux);
    const gaps = [...arrived.values()].map((a) => { let d = (a - home) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; });
    const span = gaps.length ? (Math.max(...gaps) - Math.min(...gaps)) * 180 / Math.PI : 0;
    const sectors = new Set(gaps.map((g) => Math.round(g / (Math.PI / 6)))).size;
    ok(arrived.size >= 8, arrived.size + ' of ' + col.length + ' reached him (' + (T.getSimTime() - s0).toFixed(1) + ' s game time)');
    ok(slots.size >= 4, 'they took ' + slots.size + ' different slots round him');
    ok(span >= 60 && sectors >= 3, 'they arrived from several sides, not single file: bearings span ' + span.toFixed(0) + ' degrees over ' + sectors + ' of 12 sides');
    ok(H.state().rushes > r0, 'the pack waited for company and rushed together (' + (H.state().rushes - r0) + ' rush)');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  try { T.clearZombies(); } catch (_) {}
  return out.join('\n');
})();
