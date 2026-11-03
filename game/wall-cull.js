// game/wall-cull.js - GB-273 (CL-296 / D-112; docs/specs/sector-cull.md): what a stone wall hides isn't sent to draw.
// Occluders are the bands' stone as straight segments (at most 6 m, none across a gap), each with a conservative top:
// the lowest ground under it plus the stone kit's lowest course there (a breach's 1.75 m, else 2.5 m, the far slab's
// floor). Occludees are cells of 8 m holding the static draws' boxes. A cell is hidden when every top corner of its box
// is under the sightline over some segment between it and the eye. Two hidden reads to hide, one seen read to show.
// Round-robin, `budget` cells a frame, the near ones every frame; zero garbage a frame (typed arrays, a stamp for the
// segment dedupe).
export const WALL_CULL = Object.freeze({ cell: 8, grid: 16, segMax: 6, breachTop: 1.75, intactTop: 2.5, near: 16, budget: 64, move: 0.5 });

// The stone kit's breach wave (world/stone-wall-kit.js: ang = at / 60, a breach where the wave is over 1.15).
const breachAt = (at) => { const a = at / 60; return Math.sin(a * 17.5) + 0.55 * Math.cos(a * 33.0) > 1.15; };

// Runs of a band's solids (contiguous, under 1.5x their spacing apart) cut into segments of at most segMax.
export function wallSegmentsFromBand(band, heightAt, opt = WALL_CULL) {
  const out = [], S = band.solids || [];
  let run = [];
  const flush = () => {
    if (run.length >= 2) {
      let i0 = 0;
      while (i0 < run.length - 1) {
        let i1 = i0 + 1;
        while (i1 < run.length - 1 && Math.hypot(run[i1 + 1].x - run[i0].x, run[i1 + 1].z - run[i0].z) <= opt.segMax) i1++;
        let gy = Infinity, breach = false;
        for (let k = i0; k <= i1; k++) {
          const s = run[k], g = heightAt ? heightAt(s.x, s.z) : 0; if (g < gy) gy = g;
          for (let d = -1.2; d <= 1.2; d += 0.3) if (breachAt(s.at + d)) { breach = true; break; }
        }
        out.push({ ax: run[i0].x, az: run[i0].z, bx: run[i1].x, bz: run[i1].z, top: gy + (breach ? opt.breachTop : opt.intactTop) });
        i0 = i1;
      }
    }
    run = [];
  };
  let lastAt = -Infinity, step = Infinity;
  for (let i = 1; i < S.length; i++) step = Math.min(step, Math.abs(S[i].at - S[i - 1].at) || Infinity);
  if (!isFinite(step)) step = 0.8;
  for (const s of S) {
    const prev = run[run.length - 1];
    if (prev && (s.at - lastAt > step * 1.5 || Math.hypot(s.x - prev.x, s.z - prev.z) > step * 1.5)) flush();
    run.push(s); lastAt = s.at;
  }
  flush();
  return out;
}

export function createWallCull(segments, opt = WALL_CULL) {
  const nS = segments.length;
  const SA = new Float64Array(nS * 5);   // ax az bx bz top
  let gx0 = Infinity, gz0 = Infinity, gx1 = -Infinity, gz1 = -Infinity;
  segments.forEach((s, i) => {
    SA.set([s.ax, s.az, s.bx, s.bz, s.top], i * 5);
    gx0 = Math.min(gx0, s.ax, s.bx); gz0 = Math.min(gz0, s.az, s.bz); gx1 = Math.max(gx1, s.ax, s.bx); gz1 = Math.max(gz1, s.az, s.bz);
  });
  if (!nS) { gx0 = gz0 = 0; gx1 = gz1 = 1; }
  const G = opt.grid, gw = Math.max(1, Math.ceil((gx1 - gx0) / G) + 1), gh = Math.max(1, Math.ceil((gz1 - gz0) / G) + 1);
  // Segment hash: each grid cell lists the segments whose box touches it.
  const lists = Array.from({ length: gw * gh }, () => []);
  for (let i = 0; i < nS; i++) {
    const o = i * 5, x0 = Math.floor((Math.min(SA[o], SA[o + 2]) - gx0) / G), x1 = Math.floor((Math.max(SA[o], SA[o + 2]) - gx0) / G);
    const z0 = Math.floor((Math.min(SA[o + 1], SA[o + 3]) - gz0) / G), z1 = Math.floor((Math.max(SA[o + 1], SA[o + 3]) - gz0) / G);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) lists[z * gw + x].push(i);
  }
  const start = new Int32Array(gw * gh + 1); let tot = 0;
  for (let c = 0; c < lists.length; c++) { start[c] = tot; tot += lists[c].length; }
  start[lists.length] = tot;
  const idx = new Int32Array(tot); { let p = 0; for (const l of lists) for (const v of l) idx[p++] = v; }
  const stamp = new Int32Array(nS); let stampN = 0;

  // Is the sightline from the eye to (cx, cy, cz) under the top of some segment it crosses?
  function blocked(ex, ey, ez, cx, cy, cz) {
    if (!nS) return false;
    stampN++;
    const dx = cx - ex, dz = cz - ez, len = Math.hypot(dx, dz);
    if (len < 1e-6) return false;
    const steps = Math.ceil(len / (G * 0.5)) + 1;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, px = ex + dx * t, pz = ez + dz * t;
      const gxI = Math.floor((px - gx0) / G), gzI = Math.floor((pz - gz0) / G);
      for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) {
        const X = gxI + ox, Z = gzI + oz;
        if (X < 0 || Z < 0 || X >= gw || Z >= gh) continue;
        const c = Z * gw + X;
        for (let q = start[c]; q < start[c + 1]; q++) {
          const s = idx[q];
          if (stamp[s] === stampN) continue;
          stamp[s] = stampN;
          const o = s * 5, ax = SA[o], az = SA[o + 1], bx = SA[o + 2], bz = SA[o + 3], top = SA[o + 4];
          const sx = bx - ax, sz = bz - az, den = dx * sz - dz * sx;
          if (Math.abs(den) < 1e-9) continue;
          const u = ((ax - ex) * sz - (az - ez) * sx) / den;   // along the sightline
          const v = ((ax - ex) * dz - (az - ez) * dx) / den;   // along the segment
          if (u <= 0 || u >= 1 || v < 0 || v > 1) continue;
          if (ey + (cy - ey) * u < top) return true;
        }
      }
    }
    return false;
  }

  // Cells of the static draws.
  const C = opt.cell, cellMap = new Map();
  let cap = 256, n = 0;
  let box = new Float64Array(cap * 6), tests = new Float64Array(cap * 3), reads = new Int8Array(cap), hid = new Uint8Array(cap), tested = new Uint8Array(cap), frameOf = new Uint32Array(cap);
  let frame = 0;
  const grow = () => {
    cap *= 2;
    const b = new Float64Array(cap * 6); b.set(box); box = b;
    const t = new Float64Array(cap * 3); t.set(tests); tests = t;
    const r = new Int8Array(cap); r.set(reads); reads = r;
    const h = new Uint8Array(cap); h.set(hid); hid = h;
    const d = new Uint8Array(cap); d.set(tested); tested = d;
    const f = new Uint32Array(cap); f.set(frameOf); frameOf = f;
  };
  // Put a static draw's box (its sphere's box is fine) in the cell its centre falls in; returns the cell id.
  function include(cx, cy, cz, r) {
    const key = Math.floor(cx / C) * 100003 + Math.floor(cz / C);
    let id = cellMap.get(key);
    if (id == null) {
      if (n >= cap) grow();
      id = n++; cellMap.set(key, id);
      const o = id * 6; box[o] = box[o + 1] = box[o + 2] = Infinity; box[o + 3] = box[o + 4] = box[o + 5] = -Infinity;
      reads[id] = 0; hid[id] = 0; tested[id] = 0;
    }
    const o = id * 6;
    box[o] = Math.min(box[o], cx - r); box[o + 1] = Math.min(box[o + 1], cy - r); box[o + 2] = Math.min(box[o + 2], cz - r);
    box[o + 3] = Math.max(box[o + 3], cx + r); box[o + 4] = Math.max(box[o + 4], cy + r); box[o + 5] = Math.max(box[o + 5], cz + r);
    tested[id] = 0; reads[id] = 0; hid[id] = 0;   // a grown box is seen until it's tested again
    return id;
  }
  function testCell(id, ex, ey, ez) {
    const o = id * 6, x0 = box[o], y1 = box[o + 4], z0 = box[o + 2], x1 = box[o + 3], z1 = box[o + 5];
    const all = blocked(ex, ey, ez, x0, y1, z0) && blocked(ex, ey, ez, x1, y1, z0) && blocked(ex, ey, ez, x0, y1, z1) && blocked(ex, ey, ez, x1, y1, z1);
    if (all) { if (reads[id] < 2) reads[id]++; if (reads[id] >= 2) hid[id] = 1; }
    else { reads[id] = 0; hid[id] = 0; }
    frameOf[id] = frame; const t = id * 3; tests[t] = ex; tests[t + 1] = ey; tests[t + 2] = ez; tested[id] = 1;
  }
  let cursor = 0;
  const stats = { cells: 0, hidden: 0, tested: 0, segments: nS };
  // One frame's work: the near cells, then up to `budget` cells round-robin that are untested, unsettled, or whose last
  // test was from more than opt.move away.
  function update(ex, ey, ez, budget = opt.budget) {
    let done = 0, hidden = 0; frame++;
    const near2 = (opt.near + C) * (opt.near + C), mv2 = opt.move * opt.move;
    for (let id = 0; id < n; id++) {
      const o = id * 6, mx = (box[o] + box[o + 3]) * 0.5 - ex, mz = (box[o + 2] + box[o + 5]) * 0.5 - ez;
      if (mx * mx + mz * mz < near2) { testCell(id, ex, ey, ez); done++; }
    }
    for (let k = 0; k < n && done < budget; k++) {
      const id = cursor; cursor = (cursor + 1) % n;
      if (frameOf[id] === frame) continue;
      const t = id * 3, mx = tests[t] - ex, my = tests[t + 1] - ey, mz = tests[t + 2] - ez;
      const settled = tested[id] && (reads[id] === 0 || reads[id] >= 2);
      if (settled && mx * mx + my * my + mz * mz < mv2) continue;
      testCell(id, ex, ey, ez); done++;
    }
    for (let id = 0; id < n; id++) hidden += hid[id];
    stats.cells = n; stats.hidden = hidden; stats.tested = done;
    return stats;
  }
  const isHidden = (id) => id >= 0 && id < n && hid[id] === 1;
  function reset() { for (let id = 0; id < n; id++) { hid[id] = 0; reads[id] = 0; tested[id] = 0; } }
  return { include, update, isHidden, reset, blocked, stats, get cellCount() { return n; } };
}
