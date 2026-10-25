// GB-230 scratch: night 1's timeline from the alarm: when each of the 15 comes out (cave or claw-up), and when each is within 20 m of the HQ.
(async () => {
  const T = window.TT; const out = [];
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
    out.push('LOG spawn spread ' + (Math.max(...sp) - Math.min(...sp)).toFixed(1) + ' s; arrival spread ' + (nr.length ? (Math.max(...nr) - Math.min(...nr)).toFixed(1) : '-') + ' s (' + nr.length + ' arrived)');
  } catch (e) { out.push('FAIL threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();