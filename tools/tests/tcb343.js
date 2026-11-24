// tcb343 - CB-376 (D-240; Claude 10's CJ-7 find, ChatGPT GP-20247's witness; Claude 2): rounds flew through the oil drums.
// updateProjectiles' landmark pass rejected a solid by the round's END point (within its radius + 0.8 m), but a round moves
// ~1.7 m an update at 60 fps (3.3 m on a 30 fps update): a drum hit early in the step was skipped and the round flew on.
// Now the reject uses the step's whole travel and the nearest solid on the step takes the round. Each map drum, from a clear
// side, 1.8 m away at mid height, 60 and 30 fps updates: the drum takes the round (its hp drops, the round ends there);
// a round 0.9 m to one side of it still flies past (the drum's hp unchanged).
(async () => {
  const T = window.TT, out = [], ok = (v, s) => out.push((v ? 'PASS ' : 'FAIL ') + s);
  try {
    await startMatch(T, 'Drums');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    const drums = (T.getMapDrums ? T.getMapDrums() : []).filter((d) => d.alive && d.colliders && d.colliders[0]);
    ok(drums.length >= 4, 'the map has its drums (' + drums.length + ')');
    const solids = T.worldSolids || [];
    const near = (ax, az, bx, bz, x, z, r) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1; const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); return Math.hypot(ax + dx * u - x, az + dz * u - z) < r; };
    let tried = 0, hits = 0, misses = 0, passes = 0, passTried = 0;
    const bad = [];
    for (const d of drums) {
      const c = d.colliders[0], y = c.y0 + 0.5;
      // A side whose 4 m line ends at the drum with nothing else near it (no other solid, tree or rock within 1.2 m).
      let dir = null;
      for (let k = 0; k < 16 && !dir; k++) {
        const a = k / 16 * Math.PI * 2, ux = Math.sin(a), uz = Math.cos(a);
        // the middle line and the side line (0.9 m off), each 4 m either side of the drum, clear of everything else
        const lines = [0, 0.9].map((o) => [c.x - ux * 4 + uz * o, c.z - uz * 4 - ux * o, c.x + ux * 4 + uz * o, c.z + uz * 4 - ux * o]);
        const blocked = (sx, sz, ex, ez) => solids.some((s) => s !== c && near(sx, sz, ex, ez, s.x, s.z, (s.radius || 0) + 1.2)) ||
          (T.trees || []).some((t) => t.alive !== false && near(sx, sz, ex, ez, t.x, t.z, 2.5)) ||
          (T.rocks || []).some((r) => r.alive !== false && near(sx, sz, ex, ez, r.x, r.z, (r.radius || 1) + 1));
        if (lines.some((l) => blocked(...l))) continue;
        dir = { ux, uz };
      }
      if (!dir) continue;
      for (const dt of [1 / 60, 1 / 30]) {
        // At the drum's middle.
        const hp0 = d.hp;
        const r = T.fireRoundDbg(c.x - dir.ux * 1.8, y, c.z - dir.uz * 1.8, dir.ux, 0, dir.uz, 1, 100, 0);
        for (let k = 0; k < 4 && T.projectiles.includes(r); k++) T.stepProjectilesDbg(dt);
        tried++;
        if (d.hp < hp0 && !T.projectiles.includes(r)) hits++; else { misses++; bad.push(d.x.toFixed(1) + ',' + d.z.toFixed(1) + ' @' + Math.round(1 / dt)); }
        d.hp = hp0;
        // 0.9 m to one side: past it.
        const hp1 = d.hp, ox = dir.uz * 0.9, oz = -dir.ux * 0.9;
        const q = T.fireRoundDbg(c.x - dir.ux * 1.8 + ox, y, c.z - dir.uz * 1.8 + oz, dir.ux, 0, dir.uz, 1, 100, 0);
        T.stepProjectilesDbg(dt);
        passTried++;
        if (d.hp === hp1) passes++; else bad.push('side ' + d.x.toFixed(1) + ',' + d.z.toFixed(1) + ' @' + Math.round(1 / dt) + ' hp ' + hp1 + '->' + d.hp);
        d.hp = hp1;
        for (const p of [r, q]) { const i = T.projectiles.indexOf(p); if (i >= 0) { p.life = 0; } }
      }
    }
    ok(tried >= 8, 'drums with a clear side to fire from (' + tried / 2 + ' drums)');
    ok(misses === 0 && hits === tried, 'a round fired at a drum from 1.8 m stops on it, at 60 and 30 fps (' + hits + '/' + tried + ' hit' + (bad.length ? '; flew through: ' + bad.join(' ') : '') + ')');
    ok(passes === passTried, 'a round 0.9 m to one side of the drum flies past it, the drum untouched (' + passes + '/' + passTried + (bad.length ? '; ' + bad.join(' ') : '') + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
