// world/aircraft-kit.js: shapes for the game's aircraft (CL-142, Jerry 2026-10-10: "a fidelity sweep and upgrade" of
// the cargo plane and Heron). The old models were boxes and cylinders; these are lofted skins (a fuselage, a nacelle,
// a float drawn as a run of cross-sections), airfoil panels (a wing, a fin, a flap, tapered and rounded at the tip),
// patches laid on a skin (windows, doors, panel lines, stencils that wrap round the body), streamlined struts, and
// a merge that turns a hundred still parts into one mesh per material (the parts' vertex colours carried through).
//
// Everything takes THREE as its first argument so the same code serves the game (three.webgpu.js) and the tests.
//
//   loftBody(T, prof, opts)        a superellipse skin; prof(z) -> { w, ht, hb, y, n, nb? } (half width, height over
//                                  and under the centre line, centre height, squareness: 2 round .. 4 boxy; nb for
//                                  the lower half when it differs).
//                                  -> { geo, surf(z, th, off) -> Vector3, norm(z, th) -> Vector3 }   th: 0 = +X side,
//                                  PI/2 = top, PI = -X side, -PI/2 = bottom
//   ringLoft(T, rings, opts)       a skin through rings of points: rings [{ z, pts: [[x, y], ...] }] (all the same
//                                  count, closed), flat-shaded when opts.flat
//   airfoilPanel(T, opts)          a wing-like panel along X (or Y with opts.axis 'y'): opts.at(s) -> { le, c, t, y | x,
//                                  sweepY? }, from..to the part of the chord drawn (a flap is 0.75..1)
//   skinPatch(T, body, z0, z1, a0, a1, off, opts)  a piece of skin lifted off a loftBody by off (uv 0..1 across it)
//   strut(T, a, b, chord, thick, mat)  a streamlined strut from a to b (its chord along Z)
//   mergeStatic(T, group, keep)    one mesh per material for every still mesh under group (keep(o) leaves it be)
//   camo(T, geo, f)                vertex colours: f(x, y, z) -> THREE.Color for each vertex

export function loftBody(T, prof, { zs, seg = 28, capStart = true, capEnd = true } = {}) {
  const ring = (z, th, out) => {
    const p = prof(z), c = Math.cos(th), s = Math.sin(th), e = 2 / ((s < 0 && p.nb) || p.n || 2.5);
    const x = p.w * Math.sign(c) * Math.pow(Math.abs(c), e);
    const y = (s >= 0 ? p.ht : p.hb) * Math.sign(s) * Math.pow(Math.abs(s), e);
    return out.set(x, p.y + y, z);
  };
  const pos = [], uv = [], idx = [];
  const v = new T.Vector3();
  for (let i = 0; i < zs.length; i++) {
    for (let j = 0; j <= seg; j++) {
      ring(zs[i], (j / seg) * Math.PI * 2, v); pos.push(v.x, v.y, v.z); uv.push(j / seg, i / (zs.length - 1));
    }
  }
  const W = seg + 1;
  for (let i = 0; i < zs.length - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * W + j, b = a + 1, c = a + W, d = c + 1;
    // zs run tail to nose (increasing z): wind so the outside faces out
    idx.push(a, b, c, b, d, c);
  }
  const cap = (i, flip) => {
    const p = prof(zs[i]); const ci = pos.length / 3; pos.push(0, p.y, zs[i]); uv.push(.5, i ? 1 : 0);
    for (let j = 0; j < seg; j++) { const a = i * W + j, b = a + 1; if (flip) idx.push(ci, b, a); else idx.push(ci, a, b); }
  };
  if (capStart && prof(zs[0]).w > 1e-3) cap(0, false);
  if (capEnd && prof(zs[zs.length - 1]).w > 1e-3) cap(zs.length - 1, true);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  fixSeamNormals(geo, zs.length, W);
  const surf = (z, th, off = 0, out = new T.Vector3()) => {
    ring(z, th, out);
    if (off) out.addScaledVector(norm(z, th), off);
    return out;
  };
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), d = new T.Vector3();
  const norm = (z, th, out = new T.Vector3()) => {
    const h = 1e-3;
    ring(z, th + h, a); ring(z, th - h, b); a.sub(b);          // around the ring
    ring(z + h, th, c); ring(z - h, th, d); c.sub(d);          // along the body
    out.crossVectors(a, c).normalize();
    if (out.lengthSq() < 0.5) out.set(Math.cos(th), Math.sin(th), 0);
    return out;
  };
  return { geo, surf, norm, prof };
}

// The ring's first and last columns are the same points: give them the same normal.
function fixSeamNormals(geo, rows, W) {
  const n = geo.attributes.normal;
  for (let i = 0; i < rows; i++) {
    const a = i * W, b = a + W - 1;
    const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
  }
}

// Cosine-spaced samples, dense at both ends (where the noses and tips curve).
export function spaced(a, b, n, ease = 'both') {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const s = ease === 'both' ? (1 - Math.cos(u * Math.PI)) / 2 : ease === 'end' ? Math.sin(u * Math.PI / 2) : ease === 'start' ? 1 - Math.cos(u * Math.PI / 2) : u;
    out.push(a + (b - a) * s);
  }
  return out;
}
export const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;

export function ringLoft(T, rings, { flat = false, capStart = true, capEnd = true } = {}) {
  const n = rings[0].pts.length, pos = [], idx = [];
  for (const r of rings) for (const [x, y] of r.pts) pos.push(x, y, r.z);
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < n; j++) {
    const a = i * n + j, b = i * n + (j + 1) % n, c = a + n, d = b + n;
    idx.push(a, b, c, b, d, c);
  }
  const cap = (i, flip) => {
    const r = rings[i]; let cx = 0, cy = 0; for (const [x, y] of r.pts) { cx += x / n; cy += y / n; }
    const ci = pos.length / 3; pos.push(cx, cy, r.z);
    for (let j = 0; j < n; j++) { const a = i * n + j, b = i * n + (j + 1) % n; if (flip) idx.push(ci, b, a); else idx.push(ci, a, b); }
  };
  if (capStart) cap(0, false);
  if (capEnd) cap(rings.length - 1, true);
  let geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  if (flat) geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}

// NACA 4-digit half thickness at chord fraction u, for a section 1 thick.
const naca = (u) => 5 * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4);

// A wing, a tailplane, a fin, a flap: airfoil sections along the span. at(s) gives the section at span position s:
// le (leading edge z), c (chord), t (thickness / chord), y (its height; x for a fin), camber (optional, fraction of c).
// The chord runs from the leading edge back (toward -Z). from/to cut a part of the chord (a flap). round > 0 rounds
// the last `round` metres of span into the tip (chord and thickness drawn in, elliptically).
export function airfoilPanel(T, { s0, s1, at, axis = 'x', from = 0, to = 1, steps = 16, cn = 12, round = 0, roundStart = 0, droop = 0 }) {
  const ss = [];
  for (let i = 0; i <= steps; i++) ss.push(s0 + (s1 - s0) * i / steps);
  if (round > 0) { const tip = s1 >= s0 ? s1 : s0; ss.pop(); for (const k of [0.55, 0.78, 0.92, 0.985]) ss.push(s1 - (s1 - s0) / Math.abs(s1 - s0) * round * (1 - k)); ss.push(s1); }
  if (roundStart > 0) { ss.shift(); const add = []; for (const k of [0.985, 0.92, 0.78, 0.55]) add.push(s0 + (s1 - s0) / Math.abs(s1 - s0) * roundStart * (1 - k)); ss.unshift(s0, ...add); }
  const us = [];
  for (let i = 0; i <= cn; i++) { const q = i / cn; us.push(from + (to - from) * (1 - Math.cos(q * Math.PI)) / 2); }
  const rings = [];
  const span = Math.abs(s1 - s0);
  for (const s of ss) {
    const p = at(s);
    let c = p.c, t = p.t, le = p.le;
    const dEnd = Math.abs(s1 - s), dStart = Math.abs(s - s0);
    if (round > 0 && dEnd < round) { const k = Math.sqrt(Math.max(0, 1 - ((round - dEnd) / round) ** 2)); const c2 = c * (0.35 + 0.65 * k); le -= (c - c2) * 0.35; c = c2; t *= Math.max(0.15, k); }
    if (roundStart > 0 && dStart < roundStart) { const k = Math.sqrt(Math.max(0, 1 - ((roundStart - dStart) / roundStart) ** 2)); const c2 = c * (0.35 + 0.65 * k); le -= (c - c2) * 0.35; c = c2; t *= Math.max(0.15, k); }
    const pts = [];
    // upper surface front to back, then lower back to front
    for (const u of us) pts.push([le - u * c, (p.camber || 0) * c * 4 * u * (1 - u) + naca(u) * t * c - droop * u * u * c]);
    for (let i = us.length - 2; i >= 1; i--) { const u = us[i]; pts.push([le - u * c, (p.camber || 0) * c * 4 * u * (1 - u) - naca(u) * t * c * 0.82 - droop * u * u * c]); }
    rings.push({ s, p, pts });
  }
  // build: ring points are (z, h) in the section plane; the span coordinate is s along axis
  const n = rings[0].pts.length, pos = [], idx = [];
  for (const r of rings) for (const [z, h] of r.pts) {
    if (axis === 'x') pos.push(r.s, (r.p.y || 0) + h, z);
    else pos.push((r.p.x || 0) + h, r.s, z);
  }
  const flipped = (axis === 'x') === (s1 > s0);
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < n; j++) {
    const a = i * n + j, b = i * n + (j + 1) % n, c = a + n, d = b + n;
    if (flipped) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const cap = (i, flip) => {
    let cz = 0, ch = 0; for (const [z, h] of rings[i].pts) { cz += z / n; ch += h / n; }
    const r = rings[i]; const ci = pos.length / 3;
    if (axis === 'x') pos.push(r.s, (r.p.y || 0) + ch, cz); else pos.push((r.p.x || 0) + ch, r.s, cz);
    for (let j = 0; j < n; j++) { const a = i * n + j, b = i * n + (j + 1) % n; if (flip !== flipped) idx.push(ci, a, b); else idx.push(ci, b, a); }
  };
  cap(0, false); cap(rings.length - 1, true);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  void span;
  return geo;
}

// A piece of skin lifted off a loftBody: z0..z1 along it, a0..a1 round it (radians, see loftBody), raised by off.
// opts.round rounds the corners (metres, roughly); uv runs 0..1 along z and round the angle (for stencils).
export function skinPatch(T, body, z0, z1, a0, a1, off, { nz = 6, na = 6, round = 0 } = {}) {
  const pos = [], uv = [], idx = [], v = new T.Vector3();
  for (let i = 0; i <= nz; i++) for (let j = 0; j <= na; j++) {
    let u = i / nz, w = j / na;
    if (round > 0) {
      // pull the corners in: a superellipse window
      const cu = u * 2 - 1, cw = w * 2 - 1, r = Math.max(Math.abs(cu), Math.abs(cw));
      if (r > 0) { const e = 4; const k = r / Math.pow(Math.abs(cu) ** e + Math.abs(cw) ** e, 1 / e); u = (cu * k + 1) / 2; w = (cw * k + 1) / 2; }
    }
    body.surf(z0 + (z1 - z0) * u, a0 + (a1 - a0) * w, off, v);
    pos.push(v.x, v.y, v.z); uv.push(i / nz, j / na);
  }
  const W = na + 1;
  for (let i = 0; i < nz; i++) for (let j = 0; j < na; j++) {
    const a = i * W + j, b = a + 1, c = a + W, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  // make sure it faces out: compare with the body's normal at the middle
  const mid = body.norm((z0 + z1) / 2, (a0 + a1) / 2), nm = geo.attributes.normal, k = Math.floor(nm.count / 2);
  if (nm.getX(k) * mid.x + nm.getY(k) * mid.y + nm.getZ(k) * mid.z < 0) {
    const ix = geo.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
    geo.computeVertexNormals();
  }
  return geo;
}

// A thin band round the body at z (a panel line, a seam), from angle a0 to a1.
export function skinBand(T, body, z, width, a0, a1, off, na = 24) {
  return skinPatch(T, body, z - width / 2, z + width / 2, a0, a1, off, { nz: 1, na });
}

// A streamlined strut from a to b, its chord lying along `flow` (default Z).
export function strut(T, a, b, chord, thick, mat, seg = 10) {
  const A = new T.Vector3(...a), B = new T.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const geo = new T.CylinderGeometry(1, 1, len, seg, 1);
  geo.scale(thick / 2, 1, chord / 2);
  // a teardrop: pull the back of the section into a point
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z < 0) p.setZ(i, z * 1.6); }
  geo.computeVertexNormals();
  const m = new T.Mesh(geo, mat);
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  return m;
}

// A round tube from a to b (wires, rails, pipes).
export function tubeAB(T, a, b, r, mat, seg = 6) {
  const A = new T.Vector3(...a), B = new T.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const m = new T.Mesh(new T.CylinderGeometry(r, r, len, seg, 1), mat);
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  return m;
}

// Vertex colours from a function of position (in the geometry's own frame).
export function camo(T, geo, f) {
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new T.Color();
  for (let i = 0; i < p.count; i++) { f(p.getX(i), p.getY(i), p.getZ(i), c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  return geo;
}

// A disruptive two-tone pattern, soft-edged, the same everywhere on the aircraft (it is a function of position).
export function camoField(seed = 0) {
  return (x, y, z) => {
    const a = Math.sin(x * 0.55 + z * 0.31 + seed) + Math.sin(z * 0.47 - y * 0.9 + 1.3 + seed * 2.1)
      + 0.8 * Math.sin((x - z) * 0.38 + 2.1 + y * 0.6) + 0.5 * Math.sin(y * 1.3 + x * 0.21 - z * 0.17 + seed);
    return smoothstep(0.55, 0.95, a);
  };
}

// One mesh per material for every still mesh under `group` that keep(o) does not hold back. Positions, normals, uvs and
// vertex colours (white where a part has none) are carried through. The merged meshes cast and receive shadows.
export function mergeStatic(T, group, keep = () => false) {
  group.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(group.matrixWorld).invert();
  const lists = new Map(), dead = [];
  const walk = (o, held) => {
    const h = held || keep(o);
    if (o.isMesh && !h && !Array.isArray(o.material) && o.visible) {
      let l = lists.get(o.material); if (!l) lists.set(o.material, l = []);
      l.push(o);
    }
    for (const c of o.children) walk(c, h);
  };
  for (const c of group.children) walk(c, false);
  const M = new T.Matrix4(), N = new T.Matrix3(), v = new T.Vector3();
  for (const [mat, list] of lists) {
    if (list.length < 2) continue;
    let total = 0;
    const geos = list.map((o) => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry; total += g.attributes.position.count; return g; });
    const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), uv = new Float32Array(total * 2), col = new Float32Array(total * 3);
    let k = 0, anyCol = false;
    list.forEach((o, li) => {
      const g = geos[li];
      M.multiplyMatrices(inv, o.matrixWorld); N.getNormalMatrix(M);
      const P = g.attributes.position, Nn = g.attributes.normal, U = g.attributes.uv, C = g.attributes.color;
      if (C) anyCol = true;
      for (let i = 0; i < P.count; i++, k++) {
        v.fromBufferAttribute(P, i).applyMatrix4(M); pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
        if (Nn) { v.fromBufferAttribute(Nn, i).applyMatrix3(N).normalize(); nrm[k * 3] = v.x; nrm[k * 3 + 1] = v.y; nrm[k * 3 + 2] = v.z; }
        if (U) { uv[k * 2] = U.getX(i); uv[k * 2 + 1] = U.getY(i); }
        if (C) { col[k * 3] = C.getX(i); col[k * 3 + 1] = C.getY(i); col[k * 3 + 2] = C.getZ(i); } else { col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = 1; }
      }
      if (g !== o.geometry) g.dispose();
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.BufferAttribute(nrm, 3));
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    if (anyCol) geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    const m = new T.Mesh(geo, mat);
    m.castShadow = list.some((o) => o.castShadow); m.receiveShadow = true;
    m.userData.merged = list.length;
    group.add(m);
    for (const o of list) dead.push(o);
  }
  for (const o of dead) { o.parent.remove(o); o.geometry.dispose(); }
  return dead.length;
}

// A canvas texture of stencilled text (or a drawing: draw(ctx, w, h)).
export function stencilTexture(T, text, { w = 512, h = 96, color = 'rgba(214, 208, 180, 0.92)', font = 'bold 64px "Arial Narrow", Arial, sans-serif', draw = null } = {}) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  if (!g) return null;
  g.clearRect(0, 0, w, h);
  if (draw) draw(g, w, h);
  else { g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2); }
  const t = new T.CanvasTexture(cv);
  t.anisotropy = 4;
  return t;
}

// Several geometries as one (non-indexed; positions, normals, uvs, colours where all have them).
export function joinGeos(T, geos) {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const has = (k) => parts.every((g) => g.attributes[k]);
  const out = new T.BufferGeometry();
  for (const [k, n] of [['position', 3], ['normal', 3], ['uv', 2], ['color', 3]]) {
    if (!has(k)) continue;
    let total = 0; for (const g of parts) total += g.attributes[k].count;
    const arr = new Float32Array(total * n); let at = 0;
    for (const g of parts) { const a = g.attributes[k]; for (let i = 0; i < a.count; i++) for (let c = 0; c < n; c++) arr[at++] = a.array[i * a.itemSize + c]; }
    out.setAttribute(k, new T.BufferAttribute(arr, n));
  }
  if (!out.attributes.normal) out.computeVertexNormals();
  out.computeBoundingSphere();
  return out;
}

// A geometry moved/rotated in place (so it can be joined with others).
export function placed(T, geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  const m = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(sx, sy, sz));
  return geo.applyMatrix4(m);
}
