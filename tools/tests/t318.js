// t318 - CU-209 (CL-287 W1): the HQ's sightlines after the belts.
// The yard sees no place. The roof sees only the mast. The checks are the tool's
// (tools/sightlines.mjs): ground, a canopy at 0.8 of its radius, the HQ's walls.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const hypot = Math.hypot;
  function segmentHitsCylinder(ax, ay, az, bx, by, bz, cx, cz, radius, y0, y1) {
    if (!(radius > 0) || !(y1 > y0)) return null;
    const dy = by - ay; let t0 = 0, t1 = 1;
    if (Math.abs(dy) < 1e-8) { if (ay < y0 || ay > y1) return null; }
    else {
      const ta = (y0 - ay) / dy, tb = (y1 - ay) / dy;
      t0 = Math.max(0, Math.min(ta, tb)); t1 = Math.min(1, Math.max(ta, tb));
      if (t1 < t0) return null;
    }
    const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz;
    const dist2 = (t) => { const x = ax + dx * t - cx, z = az + dz * t - cz; return x * x + z * z; };
    const r2 = radius * radius;
    if (len2 < 1e-10) return dist2(t0) <= r2 ? t0 : null;
    let t = ((cx - ax) * dx + (cz - az) * dz) / len2;
    if (t < t0) t = t0; else if (t > t1) t = t1;
    if (dist2(t) <= r2) return t;
    if (dist2(t0) <= r2) return t0;
    if (dist2(t1) <= r2) return t1;
    return null;
  }
  function groundHit(eye, target) {
    const dx = target.x - eye.x, dy = target.y - eye.y, dz = target.z - eye.z;
    const len = hypot(dx, dy, dz); if (len < 3) return null;
    const n = Math.max(2, Math.ceil(len / 2));
    for (let i = 1; i < n; i++) {
      const u = i / n, along = u * len;
      if (along < 1.5 || len - along < 1.5) continue;
      const x = eye.x + dx * u, z = eye.z + dz * u, y = eye.y + dy * u;
      if (T.sampleHeight(x, z) > y) return 'ground';
    }
    return null;
  }
  function blocked(eye, place) {
    const target = { x: place.x, y: T.sampleHeight(place.x, place.z) + 1.5, z: place.z };
    let best = null, bestT = 2;
    const consider = (t, by) => { if (t != null && t > 0 && t < 1 && t < bestT) { bestT = t; best = by; } };
    const g = groundHit(eye, target); if (g) consider(0.5, g);
    for (const tree of T.trees || []) {
      if (!tree || tree.alive === false || tree.falling) continue;
      const radius = (tree.canopyRadius || 0) * 0.8; if (!(radius > 0)) continue;
      const ground = T.sampleHeight(tree.x, tree.z);
      const t = segmentHitsCylinder(eye.x, eye.y, eye.z, target.x, target.y, target.z, tree.x, tree.z, radius, ground + (tree.canopyBottom || 0), ground + (tree.canopyTop || 0));
      consider(t, 'tree');
    }
    const H = T.house, hx = H && H.group ? H.group.position.x : 0, hz = H && H.group ? H.group.position.z : 0;
    const reach = ((H && H.half) || 8) + 3;
    for (const s of T.worldSolids || []) {
      if (!(s.radius > 0) || !(s.y1 > s.y0) || hypot(s.x - hx, s.z - hz) > reach) continue;
      const t = segmentHitsCylinder(eye.x, eye.y, eye.z, target.x, target.y, target.z, s.x, s.z, s.radius, s.y0, s.y1);
      if (t != null && t > 0.02 && t < 0.98) consider(t, 'wall');
    }
    return best;
  }
  try {
    const P = T.POI, places = [];
    for (const id of ['tower', 'graveyard', 'dock']) if (P[id]) places.push({ id, x: P[id].x, z: P[id].z });
    (P.cabins || []).forEach((c, i) => { if (c) places.push({ id: 'cabin:' + i, x: c.x, z: c.z }); });
    const bag = T.getObjectiveProps && T.getObjectiveProps();
    for (const [id, p] of Object.entries((bag && bag.props) || {})) {
      const c = p && (p.centre || p);
      if (c && c.x != null) places.push({ id, x: c.x, z: c.z });
    }
    ok(places.length === 12, 'twelve places (' + places.length + ')');
    const H = T.house, hx = H.group.position.x, hz = H.group.position.z, half = H.half || 8;
    const yard = { x: hx, y: T.sampleHeight(hx, hz - (half + 1.5)) + 1.7, z: hz - (half + 1.5) };
    const roofY = T.hqLadderAt().roof + 1.6;
    const roof = { x: hx, y: roofY, z: hz };
    const openOf = (eye) => places.filter((p) => !blocked(eye, p)).map((p) => p.id);
    const yardOpen = openOf(yard), roofOpen = openOf(roof);
    const hikers = places.find((p) => p.id === 'objective:hikers-cache');
    let near = '';
    if (hikers) {
      const dx = hikers.x, dz = hikers.z, len = Math.hypot(dx, dz) || 1;
      let best = 1e9, top = 0, rad = 0;
      for (const tree of T.trees || []) {
        if (!tree || tree.alive === false) continue;
        const along = (tree.x * dx + tree.z * dz) / len;
        if (along < 24 || along > 70) continue;
        const px = dx / len * along, pz = dz / len * along;
        const d = Math.hypot(tree.x - px, tree.z - pz);
        if (d < best) { best = d; top = tree.canopyTop || 0; rad = tree.canopyRadius || 0; }
      }
      const radio = places.find((p) => p.id === 'objective:radio-repair');
      near = ' hikers ' + hikers.x.toFixed(1) + ',' + hikers.z.toFixed(1) + ' nearest ' + (best < 1e8 ? best.toFixed(1) + ' m, crown +' + top.toFixed(1) + ' r ' + rad.toFixed(1) : 'none')
        + (radio ? ' radio ' + (blocked(roof, radio) || 'open') : '');
    }
    ok(yardOpen.length === 0, 'the yard sees nothing (' + (yardOpen.join(', ') || 'none') + ')');
    ok(roofOpen.length === 1 && roofOpen[0] === 'objective:radio-repair', 'the roof sees only the mast (' + roofOpen.join(', ') + ')' + near);
    let inClear = 0;
    for (const tree of T.trees || []) {
      if (!tree || tree.alive === false) continue;
      if (Math.hypot(tree.x - 42, tree.z + 20) < 9) inClear++;
    }
    ok(inClear === 0, 'the landing clearing is open (' + inClear + ' trees)');
    let onTrail = false;
    for (const line of T.PATHS || []) for (const p of line) if (Math.hypot(p.x - 42, p.z + 20) < 3) onTrail = true;
    ok(onTrail, 'a trail leaves the landing clearing');
    let slant = 0, crossings = 0;
    for (const line of T.PATHS || []) {
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1], b = line[i];
        const ra = Math.hypot(a.x, a.z), rb = Math.hypot(b.x, b.z);
        if ((ra - 60) * (rb - 60) > 0) continue;
        const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, mr = Math.hypot(mx, mz) || 1;
        const seg = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        const dot = Math.abs((b.x - a.x) * mx + (b.z - a.z) * mz) / (seg * mr);
        crossings++;
        if (dot < 0.85) slant++;
      }
    }
    ok(crossings > 0 && slant === 0, 'spurs cross the 60 m ring near square (' + slant + ' slanted of ' + crossings + ')');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
