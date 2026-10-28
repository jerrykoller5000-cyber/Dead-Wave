// tools/sweep/trails.js — CL-256 (the trails, after the places): a camera job that walks every trail, for the eyes.
// Run in the game by tools/sweep/run.mjs; it returns a job for tools/camera.mjs:
//   node tools/sweep/run.mjs tools/sweep/trails.js --match --out review/sweep/jobs/trails.json
//   node tools/camera.mjs job review/sweep/jobs/trails.json
// Every 35 m along each trail (T.PATHS), a picture at his eye height (at the water's surface where it runs wet),
// 2 m back and looking 12 m on along the trail: what he sees walking it. A few ends and bridges besides.
(async () => {
  const T = window.TT, H = (x, z) => T.sampleHeight(x, z), paths = T.PATHS || [];
  const r2 = (v) => Math.round(v * 100) / 100;
  const surf = (x, z) => H(x, z) + Math.max(0, (T.waterDepthAt && T.waterDepthAt(x, z)) || 0);
  const STEP = 35, shots = [];
  const shot = (li, at, x, z, dx, dz, tag) => {
    const cx = x - dx * 2, cz = z - dz * 2, tx = x + dx * 12, tz = z + dz * 12;
    shots.push({ cam: { x: r2(cx), y: r2(surf(cx, cz) + 1.7), z: r2(cz), tx: r2(tx), ty: r2(H(tx, tz) + 1.0), tz: r2(tz), fov: 60 },
      time: 'noon', caption: `trail ${li} at ${Math.round(at)} m${tag ? ' (' + tag + ')' : ''}`,
      out: `review/sweep/trails/trail-${String(li).padStart(2, '0')}-${String(Math.round(at)).padStart(4, '0')}.png` });
  };
  const lens = [];
  paths.forEach((pl, li) => {
    let acc = 0, next = 0;
    for (let k = 0; k + 1 < pl.length; k++) {
      const a = pl[k], b = pl[k + 1], L = Math.hypot(b.x - a.x, b.z - a.z);
      if (L < 1e-3) continue;
      const dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
      while (next <= acc + L) { const t = (next - acc) / L; shot(li, next, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, dx, dz); next += STEP; }
      acc += L;
    }
    // The end, looking in at what it leads to.
    if (pl.length > 1) { const a = pl[pl.length - 2], b = pl[pl.length - 1], L = Math.hypot(b.x - a.x, b.z - a.z) || 1; shot(li, acc, b.x - (b.x - a.x) / L * 6, b.z - (b.z - a.z) / L * 6, (b.x - a.x) / L, (b.z - a.z) / L, 'the end'); }
    lens.push(Math.round(acc));
  });
  return { shots, out: 'review/sweep/trails/', cols: 4, size: '960x540', lengths: lens };
})()
