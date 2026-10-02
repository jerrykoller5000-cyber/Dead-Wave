// Mesh helpers. Depends only on three. Second slice of the index.html split (CU-4).
import * as THREE from 'three';

// Bakes a handful of small meshes into one vertex-coloured mesh. Props used to be
// groups of 3–18 separate meshes each, which is thousands of draw calls once the
// whole map is visible.
const _mpMat = new THREE.Matrix4();
const _mpNrm = new THREE.Matrix3();
const _mpV = new THREE.Vector3();
export function mergeParts(parts, material, opts = {}) {
  const prepared = [];
  let total = 0;
  for (const p of parts) {
    // Plain float attributes are read straight from their arrays (through the index
    // if there is one); anything else goes through toNonIndexed() and the slow path.
    const g = p.geometry, pa = g.attributes.position, na = g.attributes.normal, ix = g.index;
    const plain = (a) => !a || (a.isBufferAttribute && !a.isInterleavedBufferAttribute && !a.normalized && a.itemSize === 3 && a.array instanceof Float32Array);
    const fast = plain(pa) && plain(na) && (!ix || !ix.isInterleavedBufferAttribute);
    const geo = fast || !ix ? g : g.toNonIndexed();
    const count = fast && ix ? ix.count : geo.attributes.position.count;
    total += count;
    prepared.push({ geo, mesh: p, fast, count });
  }
  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  let o = 0;
  for (const { geo, mesh, fast, count } of prepared) {
    mesh.updateMatrix();
    _mpMat.copy(mesh.matrix);
    _mpNrm.getNormalMatrix(_mpMat);
    const pos = geo.attributes.position;
    const nrm = geo.attributes.normal;
    const col = mesh.material.color;
    if (fast) {
      const P = pos.array, N = nrm ? nrm.array : null, I = geo.index ? geo.index.array : null;
      const e = _mpMat.elements, m = _mpNrm.elements;
      const cr = col.r, cg = col.g, cb = col.b;
      for (let i = 0; i < count; i++) {
        const w = (o + i) * 3, s = (I ? I[i] : i) * 3;
        const x = P[s], y = P[s + 1], z = P[s + 2];
        const iw = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
        positions[w] = (e[0] * x + e[4] * y + e[8] * z + e[12]) * iw;
        positions[w + 1] = (e[1] * x + e[5] * y + e[9] * z + e[13]) * iw;
        positions[w + 2] = (e[2] * x + e[6] * y + e[10] * z + e[14]) * iw;
        if (N) {
          const a = N[s], b = N[s + 1], c = N[s + 2];
          const nx = m[0] * a + m[3] * b + m[6] * c, ny = m[1] * a + m[4] * b + m[7] * c, nz = m[2] * a + m[5] * b + m[8] * c;
          const k = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
          normals[w] = nx * k; normals[w + 1] = ny * k; normals[w + 2] = nz * k;
        }
        colors[w] = cr; colors[w + 1] = cg; colors[w + 2] = cb;
      }
      o += count;
      continue;
    }
    for (let i = 0; i < pos.count; i++) {
      const w = (o + i) * 3;
      _mpV.fromBufferAttribute(pos, i).applyMatrix4(_mpMat);
      positions[w] = _mpV.x; positions[w + 1] = _mpV.y; positions[w + 2] = _mpV.z;
      if (nrm) {
        _mpV.fromBufferAttribute(nrm, i).applyMatrix3(_mpNrm).normalize();
        normals[w] = _mpV.x; normals[w + 1] = _mpV.y; normals[w + 2] = _mpV.z;
      }
      colors[w] = col.r; colors[w + 1] = col.g; colors[w + 2] = col.b;
    }
    o += pos.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  merged.computeBoundingSphere();
  const out = new THREE.Mesh(merged, material);
  out.castShadow = !!opts.castShadow;
  out.receiveShadow = !!opts.receiveShadow;
  return out;
}

export function addCast(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// === Beveled box geometry ===
// Characters used to be built from raw BoxGeometry, which under the sun reads as
// a pile of razor-edged crates. This is a compact port of three's
// RoundedBoxGeometry: a 2-segment box whose vertices get pushed onto a
// rounded shell, so every part picks up a soft highlight along its edges and
// reads as moulded gear / flesh instead of cardboard. Cached by dimensions —
// zombies are pooled and re-built a lot.
const _rboxCache = new Map();
export function rbox(w, h, d, r, seg) {
  seg = seg || 2;
  r = Math.min(r == null ? Math.min(w, h, d) * 0.18 : r, Math.min(w, h, d) * 0.49);
  const key = w.toFixed(3) + ',' + h.toFixed(3) + ',' + d.toFixed(3) + ',' + r.toFixed(3) + ',' + seg;
  const hit = _rboxCache.get(key);
  if (hit) return hit;
  const geo = new THREE.BoxGeometry(1, 1, 1, seg, seg, seg).toNonIndexed();
  const pos = geo.attributes.position.array;
  const nrm = geo.attributes.normal.array;
  const bx = w * 0.5 - r, by = h * 0.5 - r, bz = d * 0.5 - r;
  const half = 0.5 / seg;
  for (let i = 0; i < pos.length; i += 3) {
    const px = pos[i], py = pos[i + 1], pz = pos[i + 2];
    let nx = px - Math.sign(px) * half;
    let ny = py - Math.sign(py) * half;
    let nz = pz - Math.sign(pz) * half;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    pos[i] = bx * Math.sign(px) + nx * r;
    pos[i + 1] = by * Math.sign(py) + ny * r;
    pos[i + 2] = bz * Math.sign(pz) + nz * r;
    nrm[i] = nx; nrm[i + 1] = ny; nrm[i + 2] = nz;
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
  geo.computeBoundingSphere();
  geo.userData.shared = true; // cached — never disposed per-instance
  geo.userData.shared = true;   // cached: never disposed by a merge
  _rboxCache.set(key, geo);
  return geo;
}
// Convenience: a shadow-casting beveled-box mesh.
export function rmesh(w, h, d, mat, r) {
  const m = new THREE.Mesh(rbox(w, h, d, r), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Camo is laid on by position, not by each box's own 0..1 faces, so the pattern is
// the same size on a boot as on a chest: each triangle takes the two axes of the
// plane it faces most, at one repeat per CAMO_TILE metres.
const CAMO_TILE = 0.42;
export function boxProjectUV(pos, uv) {
  for (let t = 0; t + 8 < pos.length; t += 9) {
    const ax = pos[t + 3] - pos[t], ay = pos[t + 4] - pos[t + 1], az = pos[t + 5] - pos[t + 2];
    const bx = pos[t + 6] - pos[t], by = pos[t + 7] - pos[t + 1], bz = pos[t + 8] - pos[t + 2];
    const nx = Math.abs(ay * bz - az * by), ny = Math.abs(az * bx - ax * bz), nz = Math.abs(ax * by - ay * bx);
    for (let k = 0; k < 3; k++) {
      const x = pos[t + k * 3], y = pos[t + k * 3 + 1], z = pos[t + k * 3 + 2], o = (t / 3 + k) * 2;
      if (nx >= ny && nx >= nz) { uv[o] = z / CAMO_TILE; uv[o + 1] = y / CAMO_TILE; }
      else if (ny >= nz) { uv[o] = x / CAMO_TILE; uv[o + 1] = z / CAMO_TILE; }
      else { uv[o] = x / CAMO_TILE; uv[o + 1] = y / CAMO_TILE; }
    }
  }
}

// === Profile parts (CU-81) ===
// A gun reads by its outline, and a stack of boxes has none. slab() takes a part's side outline,
// [z, y] pairs, and gives it a thickness along x with rounded edges; lathe() turns a [radius, z]
// profile round the z axis. Both are built here rather than with three's ExtrudeGeometry or
// Shape, which the test build's three does not have. Non-indexed, with normals and UVs, so
// mergeRigidMeshes and the camo UVs take them like any box.
const SMOOTH_COS = Math.cos(0.7);
function buildGeo(pos, nrm) {
  const geo = new THREE.BufferGeometry();
  const P = new Float32Array(pos), N = new Float32Array(nrm), U = new Float32Array(pos.length / 3 * 2);
  for (let i = 0, j = 0; i < P.length; i += 3, j += 2) { U[j] = P[i + 2] * 4; U[j + 1] = P[i + 1] * 4; }
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  geo.computeBoundingSphere();
  return geo;
}
// One triangle, wound so its face looks the way its normals do.
function pushTri(pos, nrm, a, b, c, na, nb, nc) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
  if (fx * fx + fy * fy + fz * fz < 1e-18) return;
  const flip = fx * (na[0] + nb[0] + nc[0]) + fy * (na[1] + nb[1] + nc[1]) + fz * (na[2] + nb[2] + nc[2]) < 0;
  const vs = flip ? [a, c, b] : [a, b, c], ns = flip ? [na, nc, nb] : [na, nb, nc];
  for (let k = 0; k < 3; k++) { pos.push(vs[k][0], vs[k][1], vs[k][2]); nrm.push(ns[k][0], ns[k][1], ns[k][2]); }
}
// Ear clipping for a simple polygon, counter-clockwise in (u, v). Returns index triples.
export function triangulate(pts) {
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const idx = pts.map((_, i) => i), tris = [];
  let guard = pts.length * pts.length + 16;
  while (idx.length > 3 && guard-- > 0) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const ia = idx[(i + idx.length - 1) % idx.length], ib = idx[i], ic = idx[(i + 1) % idx.length];
      const a = pts[ia], b = pts[ib], c = pts[ic], cr = cross(a, b, c);
      if (Math.abs(cr) < 1e-12) { idx.splice(i, 1); cut = true; break; }
      if (cr < 0) continue;
      let ear = true;
      for (const j of idx) {
        if (j === ia || j === ib || j === ic) continue;
        const p = pts[j];
        if (cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0) { ear = false; break; }
      }
      if (!ear) continue;
      tris.push([ia, ib, ic]); idx.splice(i, 1); cut = true; break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
  return tris;
}
function cleanOutline(points) {
  const out = [];
  for (const p of points) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6) out.push([p[0], p[1]]);
  }
  while (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= 1e-6) out.pop();
  let area = 0;
  for (let i = 0; i < out.length; i++) { const a = out[i], b = out[(i + 1) % out.length]; area += a[0] * b[1] - b[0] * a[1]; }
  return area < 0 ? out.reverse() : out;
}
// slab(points, width, bevel, segs): the outline at x = 0 is the part's middle. bevel is how far the
// rounding eats into the outline (metres); segs 1 is a chamfer, 2 or 3 a rounded edge.
export function slab(points, width, bevel = 0.004, segs = 2) {
  const pts = cleanOutline(points), n = pts.length;
  if (n < 3) return buildGeo([], []);
  const hw = width / 2, b = Math.max(0, Math.min(bevel, hw * 0.9));
  // Outward normals of each edge (i -> i+1), in (z, y).
  const en = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], c = pts[(i + 1) % n], dz = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dz, dy) || 1;
    en.push([dy / l, -dz / l]);
  }
  // At each corner: the miter (to inset the outline by d, move by miter * d) and whether it is smooth.
  const miter = [], smooth = [];
  for (let i = 0; i < n; i++) {
    const p = en[(i + n - 1) % n], q = en[i], dot = p[0] * q[0] + p[1] * q[1];
    let mz = p[0] + q[0], my = p[1] + q[1];
    const k = 1 / Math.max(0.35, 1 + dot);
    mz *= k; my *= k;
    const ml = Math.hypot(mz, my);
    if (ml > 2.5) { mz *= 2.5 / ml; my *= 2.5 / ml; }
    miter.push([mz, my]);
    smooth.push(dot > SMOOTH_COS);
  }
  const vn = (i, e) => {
    if (!smooth[i]) return en[e];
    const p = en[(i + n - 1) % n], q = en[i], z = p[0] + q[0], y = p[1] + q[1], l = Math.hypot(z, y) || 1;
    return [z / l, y / l];
  };
  // Rings from the -x face round the side to the +x face: [x, inset, cosθ, sinθ (signed toward x)].
  const rings = [];
  const S = Math.max(1, segs | 0);
  for (let k = S; k >= 0; k--) { const t = k / S * Math.PI / 2; rings.push([-(hw - b) - b * Math.sin(t), b * (1 - Math.cos(t)), Math.cos(t), -Math.sin(t)]); }
  for (let k = 0; k <= S; k++) { const t = k / S * Math.PI / 2; rings.push([(hw - b) + b * Math.sin(t), b * (1 - Math.cos(t)), Math.cos(t), Math.sin(t)]); }
  const pos = [], nrm = [];
  const at = (i, r) => [r[0], pts[i][1] - miter[i][1] * r[1], pts[i][0] - miter[i][0] * r[1]];
  const nAt = (i, e, r) => { const s = vn(i, e); const x = r[3], c = r[2]; const l = Math.hypot(x, s[0] * c, s[1] * c) || 1; return [x / l, s[1] * c / l, s[0] * c / l]; };
  for (let r = 0; r + 1 < rings.length; r++) {
    const R0 = rings[r], R1 = rings[r + 1];
    if (Math.abs(R0[0] - R1[0]) < 1e-9 && Math.abs(R0[1] - R1[1]) < 1e-9) continue;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a = at(i, R0), bb = at(j, R0), c = at(j, R1), d = at(i, R1);
      const na = nAt(i, i, R0), nb = nAt(j, i, R0), nc = nAt(j, i, R1), nd = nAt(i, i, R1);
      pushTri(pos, nrm, a, bb, c, na, nb, nc);
      pushTri(pos, nrm, a, c, d, na, nc, nd);
    }
  }
  const capIn = b;
  const flat = pts.map((p, i) => [p[0] - miter[i][0] * capIn, p[1] - miter[i][1] * capIn]);
  let tris = triangulate(flat);
  if (tris.length < n - 2) tris = triangulate(pts);
  for (const sx of [-1, 1]) {
    const N = [sx, 0, 0];
    for (const [i, j, k] of tris) pushTri(pos, nrm, [sx * hw, flat[i][1], flat[i][0]], [sx * hw, flat[j][1], flat[j][0]], [sx * hw, flat[k][1], flat[k][0]], N, N, N);
  }
  return buildGeo(pos, nrm);
}
// lathe(profile, segs, phase): profile is [r, z], back to front (a closed loop, for a ring or a bell,
// goes forward on the outside). A point given twice in a row is a hard edge; elsewhere the turn is
// shaded smooth when it bends less than ~40 degrees.
export function lathe(profile, segs = 14, phase = 0) {
  const pr = [];
  for (const p of profile) pr.push([Math.max(0, p[0]), p[1]]);
  // Walked back to front, the solid lies on the axis side; a profile given front to back is turned round.
  if (pr.length > 1 && pr[0][1] > pr[pr.length - 1][1]) pr.reverse();
  const m = pr.length;
  if (m < 2) return buildGeo([], []);
  const sn = [];
  for (let j = 0; j + 1 < m; j++) {
    const a = pr[j], c = pr[j + 1], dr = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dr, dz);
    sn.push(l < 1e-9 ? null : [dz / l, -dr / l]);
  }
  const near = (j, step) => { for (let k = j + step; k >= 0 && k < sn.length; k += step) if (sn[k]) return sn[k]; return null; };
  const ends = (j, end) => {
    const s = sn[j];
    const o = end ? (sn[j + 1] === null ? null : near(j, 1)) : (sn[j - 1] === null ? null : near(j, -1));
    if (!o || s[0] * o[0] + s[1] * o[1] < SMOOTH_COS) return s;
    const r = s[0] + o[0], z = s[1] + o[1], l = Math.hypot(r, z) || 1;
    return [r / l, z / l];
  };
  const pos = [], nrm = [];
  const S = Math.max(3, segs | 0);
  for (let j = 0; j + 1 < m; j++) {
    if (!sn[j]) continue;
    const n0 = ends(j, false), n1 = ends(j, true), a = pr[j], c = pr[j + 1];
    for (let s = 0; s < S; s++) {
      const f0 = phase + s / S * Math.PI * 2, f1 = phase + (s + 1) / S * Math.PI * 2;
      const c0 = Math.cos(f0), s0 = Math.sin(f0), c1 = Math.cos(f1), s1 = Math.sin(f1);
      const P = (p, cs, sn2) => [p[0] * cs, p[0] * sn2, p[1]];
      const Nn = (q, cs, sn2) => [q[0] * cs, q[0] * sn2, q[1]];
      pushTri(pos, nrm, P(a, c0, s0), P(c, c0, s0), P(c, c1, s1), Nn(n0, c0, s0), Nn(n1, c0, s0), Nn(n1, c1, s1));
      pushTri(pos, nrm, P(a, c0, s0), P(c, c1, s1), P(a, c1, s1), Nn(n0, c0, s0), Nn(n1, c1, s1), Nn(n0, c1, s1));
    }
  }
  return buildGeo(pos, nrm);
}
// An outline helper: points along a quadratic curve from a through control c to b (both ends kept).
export function curve(a, c, b, steps = 6) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}
