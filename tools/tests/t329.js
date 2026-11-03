// t329 - CU-230 (Claude, after CU-229): GP-20015's bridge and ford clearance, held by the suite.
// The same walk as review/GP-20015/clearance-probe.mjs: both bridges and the four fords,
// the deck and a step to each side, none of it inside a wall band. J68.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const d = T.wallBandsDbg;
    ok(!!(d && d.crossings && d.blocked), 'the wall-band crossings are there');
    if (!d || !d.crossings) return out.join('\n');
    const crossings = d.crossings();
    const bridges = (T.POI && T.POI.bridges) || [];
    const bridgeRows = crossings.filter((c) => String(c.id).startsWith('bridge-'));
    const fordRows = crossings.filter((c) => String(c.id).startsWith('ford-'));
    ok(bridges.length >= 2 && bridgeRows.length === bridges.length, 'both bridges have a corridor (' + bridgeRows.map((c) => c.id).join(', ') + ')');
    ok(fordRows.length === 4, 'four fords have a corridor (' + fordRows.map((c) => c.id).join(', ') + ')');
    let samples = 0, blocked = 0;
    const hits = [];
    for (const c of crossings) {
      let n = 0, bad = 0;
      for (let j = 1; j < c.pts.length; j++) {
        const a = c.pts[j - 1], b = c.pts[j], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
        if (len < 1e-6) continue;
        const nx = -dz / len, nz = dx / len, steps = Math.ceil(len / 0.5);
        for (let k = 0; k <= steps; k++) for (const side of [-1.2, 0, 1.2]) {
          const t = k / steps, x = a.x + dx * t + nx * side, z = a.z + dz * t + nz * side;
          n++;
          if (d.blocked(x, z, 0.35)) { bad++; if (hits.length < 4) hits.push(c.id + ' ' + x.toFixed(1) + ',' + z.toFixed(1)); }
        }
      }
      samples += n; blocked += bad;
      ok(n > 0 && bad === 0, c.id + ' is clear (' + n + ' samples, ' + bad + ' blocked)');
    }
    ok(samples === 696 && blocked === 0, 'the corridors stay clear (' + samples + ' samples, ' + blocked + ' blocked' + (hits.length ? '; ' + hits.join('; ') : '') + ')');
  } catch (e) { ok(false, 'threw ' + String((e && e.stack) || e).slice(0, 300)); }
  return out.join('\n');
})()
