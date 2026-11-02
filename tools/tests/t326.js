// t326 - GP-20008: shamblers cross the quarter-band gaps. The page needs
// ?quarterwalls=1 (DW_TEST_QUERY=quarterwalls=1). With the flag off, this
// check does not walk; the full suite stays on the ring alone.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const hypot = Math.hypot;
  try {
    await startMatch(T, 'QuarterWalk');
    T.clearZombies();
    T.runDevCommand('godmode');
    if (T.skipGrace) T.skipGrace();
    const dbg = T.wallBandsDbg;
    ok(!!(dbg && dbg.on), 'the walls are on');
    if (!dbg || !dbg.quartersOn) {
      ok(true, 'quarters are off on this page (run with DW_TEST_QUERY=quarterwalls=1)');
      return out.join('\n');
    }
    const hx = T.house.group.position.x, hz = T.house.group.position.z;
    const gaps = [
      { name: 'NE', x: -50, z: 115 },
      { name: 'NW', x: 91.54, z: 69.7 },
      { name: 'SW', x: 68, z: -105 },
      { name: 'SE', x: -57.2, z: -68.2 },
    ];
    function dry(x, z) {
      if (T.waterDepthAt(x, z) > 0.3) return false;
      if (T.terrainSlope(x, z) > 0.62) return false;
      if (dbg.blocked(x, z, 0.7)) return false;
      return true;
    }
    function place(x, z, away) {
      const dx = x - hx, dz = z - hz, len = hypot(dx, dz) || 1;
      const ux = dx / len, uz = dz / len;
      const px = -uz, pz = ux;
      for (const along of [14, 18, 10, 22]) {
        for (const side of [0, 4, -4, 8, -8]) {
          const sx = x + ux * along * away + px * side;
          const sz = z + uz * along * away + pz * side;
          if (dry(sx, sz)) return { x: sx, z: sz };
        }
      }
      return null;
    }
    const men = [];
    for (const g of gaps) {
      const outSpot = place(g.x, g.z, 1);
      const inSpot = place(g.x, g.z, -1);
      ok(!!outSpot && !!inSpot, g.name + ' has dry ground on both sides');
      if (!outSpot || !inSpot) continue;
      const z = T.spawnZombie(outSpot.x, outSpot.z, 'shambler', true, true);
      ok(!!z, g.name + ' shambler spawned');
      if (!z) continue;
      men.push({
        g, z, goal: inSpot, clipped: false, stuckFor: 0, arrived: false,
        hist: [{ t: T.getSimTime(), x: outSpot.x, z: outSpot.z }], prevT: T.getSimTime(),
      });
    }
    const t0 = T.getSimTime();
    const w0 = Date.now();
    while (men.some((m) => !m.arrived && m.stuckFor <= 3 && m.z.alive) && T.getSimTime() - t0 < 70 && Date.now() - w0 < 100000) {
      await wait(80);
      const now = T.getSimTime();
      for (const m of men) {
        if (m.arrived || !m.z.alive || m.stuckFor > 3) continue;
        const p = m.z.mesh.position;
        const dt = Math.min(0.35, now - m.prevT);
        m.hist.push({ t: now, x: p.x, z: p.z });
        while (m.hist.length > 1 && now - m.hist[0].t > 1.2) m.hist.shift();
        if (dbg.blocked(p.x, p.z, 0.05)) m.clipped = true;
        const window = now - m.hist[0].t;
        const slid = hypot(p.x - m.hist[0].x, p.z - m.hist[0].z);
        const against = hypot(p.x - m.g.x, p.z - m.g.z) < 14 && dbg.blocked(p.x, p.z, 0.45);
        if (against && window >= 1.0 && slid < 0.35) m.stuckFor += dt;
        else if (!against || slid >= 0.35) m.stuckFor = 0;
        if (hypot(p.x - m.goal.x, p.z - m.goal.z) < 8) m.arrived = true;
        m.prevT = now;
        m.r = hypot(p.x - hx, p.z - hz);
        m.secs = now - t0;
      }
    }
    for (const m of men) {
      ok(m.arrived && !m.clipped && m.stuckFor <= 3,
        m.g.name + ' crossed ' + (m.secs || 0).toFixed(0) + 's (r ' + (m.r || 0).toFixed(0) + ', stuck ' + m.stuckFor.toFixed(1) + 's, clip ' + m.clipped + ')');
    }
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
