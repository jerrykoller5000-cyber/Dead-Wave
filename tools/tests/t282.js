// t282 - GB-230 (N10, Jerry: "Night 1 waves too staggered. Need them to all come at once."): night 1 is one push. All
// fifteen come (D-29: half claw up, the rest walk out of one cave); the claw-ups rise after the cave's walkers are out,
// once they are close, so the bulk (the 2nd to the 14th to reach 20 m of the HQ) lands within 20 s, all within 100 s.
// GB-231: and it lands soon: the cave walkers start part way in (~66 m out, out of sight), so the middle arrival is 15-35 s
// after the alarm (aim 25-30).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'Night1');
    T.runDevCommand('godmode'); T.setHp(100000);
    const hqx = -5.9, hqz = -2.2; const home = () => T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);
    home(); T.clearZombies();
    const seen = new Map(); const evs = [];
    window.addEventListener('dw-game', (e) => { const d = e.detail; if (d && /wave|push|alarm/.test(d.type)) evs.push(d.type); });
    T.hqStartWave();
    const t0 = T.getSimTime(); let tA = null;
    while (T.getSimTime() - t0 < 150) {
      home();
      const now = T.getSimTime() - t0;
      if (tA == null && T.getPhase() === 'wave') tA = now;
      for (const z of T.zombies) {
        if (!z.alive) continue;
        let r = seen.get(z); if (!r) { r = { spawn: now, x: z.mesh.position.x, z: z.mesh.position.z, kind: z.typeKey, rise: !!(z.riseT > 0), near: null, d0: Math.hypot(z.mesh.position.x - hqx, z.mesh.position.z - hqz) }; seen.set(z, r); }
        if (r.near == null && Math.hypot(z.mesh.position.x - hqx, z.mesh.position.z - hqz) < 20) r.near = now;
      }
      if (seen.size >= 15 && [...seen.values()].every((r) => r.near != null)) break;
      await wait(100);
    }
    const rows = [...seen.values()].sort((a, b) => a.spawn - b.spawn);
    out.push('LOG phase-wave at ' + (tA == null ? '-' : tA.toFixed(1)) + ' s; grace ' + T.getSimTime() + ' events ' + [...new Set(evs)].join(','));
    for (const r of rows) out.push('LOG spawn ' + r.spawn.toFixed(1) + ' s ' + (r.rise ? 'claw-up' : 'cave   ') + ' d0 ' + r.d0.toFixed(0) + ' m, within 20 m at ' + (r.near == null ? '-' : r.near.toFixed(1) + ' s'));
    const sp = rows.map((r) => r.spawn), nr = rows.map((r) => r.near).filter((v) => v != null);
    const caveLast = Math.max(...rows.filter((r) => !r.rise).map((r) => r.spawn)), risers = rows.filter((r) => r.rise);
    ok(rows.length === 15, 'night 1: ' + rows.length + ' come (15)');
    ok(risers.length >= 7 && risers.every((r) => r.spawn >= caveLast), risers.length + ' claw up, all after the cave is out (last walker out at ' + caveLast.toFixed(1) + ' s, first riser ' + (risers.length ? Math.min(...risers.map((r) => r.spawn)).toFixed(1) : '-') + ' s)');
    const arr = rows.map((r) => r.near).filter((v) => v != null).sort((a, b) => a - b);
    ok(arr.length === 15 && arr[arr.length - 1] < 100, 'all 15 reach 20 m of the HQ within 100 s (last ' + (arr.length ? arr[arr.length - 1].toFixed(1) : '-') + ' s)');
    ok(arr.length >= 14 && arr[13] - arr[1] < 20, 'one push: the 2nd to the 14th land within ' + (arr.length >= 14 ? (arr[13] - arr[1]).toFixed(1) : '-') + ' s (under 20)');
    ok(arr.length >= 8 && arr[7] >= 15 && arr[7] <= 35, 'the push lands soon: the middle arrival at ' + (arr.length >= 8 ? arr[7].toFixed(1) : '-') + ' s (15-35)');
    const walk = rows.filter((r) => !r.rise); ok(walk.length > 0 && walk.every((r) => r.d0 < 120), 'the cave walkers start part way in, past the water if it is in the way (' + walk.map((r) => r.d0.toFixed(0)).join(', ') + ' m; all under 120)');
    out.push('LOG spawn spread ' + (Math.max(...sp) - Math.min(...sp)).toFixed(1) + ' s; arrival spread ' + (nr.length ? (Math.max(...nr) - Math.min(...nr)).toFixed(1) : '-') + ' s (' + nr.length + ' arrived)');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})();