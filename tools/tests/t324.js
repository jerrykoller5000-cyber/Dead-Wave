// t324 - CU-218: each dry opening in the HQ ring is one trail, at most 6 m of arc.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const step = Math.PI / 180 / 4;
    const n = Math.round(Math.PI * 2 / step);
    const samples = [];
    for (let i = 0; i < n; i++) {
      const a = i * step;
      const x = Math.cos(a) * 60, z = Math.sin(a) * 60;
      samples.push({ open: !T.wallBandsDbg.blocked(x, z, 0.2), wet: T.waterDepthAt(x, z) > 0.05 });
    }
    const runs = [];
    let cur = null;
    for (let i = 0; i < samples.length; i++) {
      if (samples[i].open) { if (!cur) cur = { i0: i, i1: i, wet: 0 }; else cur.i1 = i; if (samples[i].wet) cur.wet++; }
      else if (cur) { runs.push(cur); cur = null; }
    }
    if (cur) runs.push(cur);
    if (runs.length > 1 && samples[0].open && samples[samples.length - 1].open) {
      const last = runs.pop();
      runs[0].i0 = last.i0 - samples.length;
      runs[0].wet += last.wet;
    }
    const dry = [];
    const detail = [];
    for (const r of runs) {
      const count = r.i1 - r.i0 + 1;
      const metres = count / samples.length * Math.PI * 2 * 60;
      const wet = r.wet > count * 0.5;
      if (wet) continue;
      const mid = ((r.i0 + r.i1) / 2) * step;
      const x = Math.cos(mid) * 60, z = Math.sin(mid) * 60;
      const hws = [];
      for (const line of T.PATHS || []) {
        let best = Infinity;
        for (let i = 1; i < line.length; i++) {
          const a = line[i - 1], b = line[i], dx = b.x - a.x, dz = b.z - a.z, q = dx * dx + dz * dz;
          const t = q > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / q)) : 0;
          best = Math.min(best, Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)));
        }
        if (best < 8) hws.push((line.hw || 0).toFixed(2) + '@' + best.toFixed(1));
      }
      dry.push(metres);
      detail.push(metres.toFixed(1) + 'm [' + hws.join(' ') + ']');
    }
    ok(dry.length > 0, 'the ring has dry openings (' + detail.join('; ') + ')');
    ok(dry.every((m) => m <= 8), 'each dry opening stays a single crossing (' + detail.join('; ') + ')');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
