// studio/weapon-detail.js - CB-316 (J149, D-177): shared detail helpers for the gun makers. Small, cached geometry,
// built once at model time; nothing here runs per frame.
//
//   import { weaponDetail } from './weapon-detail.js';
//   const W = weaponDetail(ctx);                       // ctx = weaponModelContext() (THREE and the gun materials)
//
//   // A box with flat 45-degree chamfers on every edge (26 faces; far cheaper than a rounded box). Painted or not by the
//   // caller as usual (markPaintSurface(mesh, role) for a coated part).
//   W.chamferBox(gun, 0.03, 0.012, 0.08, 0.0012, ctx.gunBody, x, y, z, rx, ry, rz);
//
//   // A plate from an outline drawn on a face: the outline in that face's own two axes (axis 'x': [z, y] pairs, 'y': [x, z],
//   // 'z': [x, y]), thickness t along the axis, every edge chamfered by c. Proud of a face: put its centre t/2 out from it.
//   W.plate(gun, [[-0.02, 0], [0.02, 0], [0.02, 0.012], [-0.015, 0.014]], 0.002, 0.0006, ctx.gunMetal, { axis: 'x', x: 0.0125, y: 0.05, z: -0.03 });
//
//   // Serrations: a row of `count` grooves `pitch` apart, cut down `depth` from a ridged patch that sits on the face
//   // (axis/side: the face's outward normal; along: the way the row runs; w: the grooves' length across the row).
//   // profile 'v' (sawtooth, slide serrations), 'square' (flat lands, cocking serrations), 'round' (scalloped).
//   W.serrations(gun, ctx.gunBody, { x: 0.0126, y: 0.06, z: -0.1, axis: 'x', side: 1, along: 'z', count: 9, pitch: 0.003, w: 0.016, depth: 0.0008 });
//
//   // Screw heads and pin ends: ONE draw for every head of a kind on that parent (one Mesh with the heads baked in at their size;
//   // a lone head is the unit head with mesh.scale = r). A part that moves on
//   // its own (a slide, a bolt carrier) gets its own call with that part as the parent. kind: 'slot', 'cross', 'hex',
//   // 'torx', 'button' (a domed head), 'pin' (a flat pin end with a small chamfer). Each item: x, y, z (where the head
//   // meets the face, in parent space), axis + side (the face's outward normal), r (head radius, default 1.6 mm),
//   // turn (the drive's roll about the axis, radians). The head stands proud by 0.45 r (pin: 0.25 r) and is seated
//   // DETAIL_BED (0.6 mm) into the face so it never floats.
//   W.fasteners(gun, ctx.gunDark, 'torx', [{ x: 0.0125, y: 0.03, z: 0.01, axis: 'x', side: 1, r: 0.0018 }, ...]);
//   W.pins(gun, ctx.steelMat, [{ x: 0, y: 0.02, z: -0.05, axis: 'x', span: 0.025, r: 0.0015 }]);   // both ends of a through pin
//
// Everything returned is an ordinary Mesh with position, normal and uv (box-projected at the camo tile, as
// core/geometry.js does), so world/bake.js foldStatic, the camo and the tests treat it like any other part. Each
// fasteners Mesh keeps its items in userData.weaponDetail (kind, items) for seating checks. Sizes in the gun's own metres.
import { boxProjectUV } from '../core/geometry.js';

export const DETAIL_BED = 0.0006;
const AXES = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const caches = new WeakMap();   // THREE -> Map(key -> geometry)

function cacheFor(T) {
  let c = caches.get(T);
  if (!c) { c = new Map(); caches.set(T, c); }
  return c;
}

// Flat-shaded triangles -> a BufferGeometry with position, normal and box-projected uv.
function build(T, tris) {
  const n = tris.length, pos = new Float32Array(n * 9), nrm = new Float32Array(n * 9), uv = new Float32Array(n * 6);
  for (let t = 0; t < n; t++) {
    const [a, b, c] = tris[t];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (let k = 0; k < 3; k++) {
      const p = tris[t][k], o = t * 9 + k * 3;
      pos[o] = p[0]; pos[o + 1] = p[1]; pos[o + 2] = p[2];
      nrm[o] = nx; nrm[o + 1] = ny; nrm[o + 2] = nz;
    }
  }
  boxProjectUV(pos, uv);
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

// Wind a triangle so it faces away from `inside` (a point inside the solid).
function outward(tri, inside) {
  const [a, b, c] = tri;
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const cx = (a[0] + b[0] + c[0]) / 3 - inside[0], cy = (a[1] + b[1] + c[1]) / 3 - inside[1], cz = (a[2] + b[2] + c[2]) / 3 - inside[2];
  return nx * cx + ny * cy + nz * cz < 0 ? [a, c, b] : tri;
}

// A box w x h x d, every edge chamfered by c (clamped below half the smallest side).
export function chamferBoxGeometry(T, w, h, d, c) {
  const hx = w / 2, hy = h / 2, hz = d / 2;
  c = Math.max(0, Math.min(c, Math.min(hx, hy, hz) * 0.95));
  const key = `cbox|${w}|${h}|${d}|${c}`, cache = cacheFor(T);
  if (cache.has(key)) return cache.get(key);
  const P = (ax, sx, sy, sz) => [sx * (ax === 0 ? hx : hx - c), sy * (ax === 1 ? hy : hy - c), sz * (ax === 2 ? hz : hz - c)];
  const tris = [], O = [0, 0, 0];
  const quad = (a, b, cc, dd) => { tris.push(outward([a, b, cc], O), outward([a, cc, dd], O)); };
  for (const s of [-1, 1]) {   // the six faces
    quad(P(0, s, -1, -1), P(0, s, 1, -1), P(0, s, 1, 1), P(0, s, -1, 1));
    quad(P(1, -1, s, -1), P(1, 1, s, -1), P(1, 1, s, 1), P(1, -1, s, 1));
    quad(P(2, -1, -1, s), P(2, 1, -1, s), P(2, 1, 1, s), P(2, -1, 1, s));
  }
  if (c > 0) {
    for (const a of [-1, 1]) for (const b of [-1, 1]) {   // the twelve edge chamfers
      quad(P(0, a, b, -1), P(0, a, b, 1), P(1, a, b, 1), P(1, a, b, -1));   // x-y edges, along z
      quad(P(0, a, -1, b), P(0, a, 1, b), P(2, a, 1, b), P(2, a, -1, b));   // x-z edges, along y
      quad(P(1, -1, a, b), P(1, 1, a, b), P(2, 1, a, b), P(2, -1, a, b));   // y-z edges, along x
    }
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {   // the eight corners
      tris.push(outward([P(0, sx, sy, sz), P(1, sx, sy, sz), P(2, sx, sy, sz)], O));
    }
  }
  const g = build(T, tris);
  cache.set(key, g);
  return g;
}

// Inset a closed outline by d (miter at each corner; good for the convex and gently concave outlines of plates).
function inset(pts, d) {
  const n = pts.length;
  let area = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const s = area > 0 ? 1 : -1;   // counter-clockwise: the inside is on the left
  const nrm = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    nrm.push([-dy / l * s, dx / l * s]);   // inward normal of edge i
  }
  return pts.map((p, i) => {
    const n0 = nrm[(i + n - 1) % n], n1 = nrm[i], mx = n0[0] + n1[0], my = n0[1] + n1[1];
    const dot = mx * n1[0] + my * n1[1] || 1, k = Math.min(d / dot, d * 4);
    return [p[0] + mx * k, p[1] + my * k];
  });
}

// Ear-clip triangulation of a simple polygon (indices into pts).
function triangulate(pts) {
  const n = pts.length, idx = [...Array(n).keys()], out = [];
  let area = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const ccw = area > 0;
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inTri = (p, a, b, c) => { const d1 = cross(a, b, p), d2 = cross(b, c, p), d3 = cross(c, a, p); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  let guard = 0;
  while (idx.length > 3 && guard++ < 1000) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i + idx.length - 1) % idx.length], i1 = idx[i], i2 = idx[(i + 1) % idx.length];
      const a = pts[i0], b = pts[i1], c = pts[i2], cr = cross(a, b, c);
      if (ccw ? cr <= 0 : cr >= 0) continue;
      if (idx.some((j) => j !== i0 && j !== i1 && j !== i2 && inTri(pts[j], a, b, c))) continue;
      out.push([i0, i1, i2]); idx.splice(i, 1); cut = true; break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
  return out;
}

// A plate: the outline ([u, v] pairs) in the plane across `axis`, thickness t along it, both faces' edges chamfered by c.
export function plateGeometry(T, outline, t, c, axis = 'x') {
  const key = `plate|${axis}|${t}|${c}|${outline.map((p) => p.join(',')).join(';')}`, cache = cacheFor(T);
  if (cache.has(key)) return cache.get(key);
  const ht = t / 2; c = Math.max(0, Math.min(c, ht * 0.9));
  const inner = c > 0 ? inset(outline, c) : outline;
  // (u, v, w): w along the axis. axis 'x': u = z, v = y; 'y': u = x, v = z; 'z': u = x, v = y.
  const to = (u, v, w) => (axis === 'x' ? [w, v, u] : axis === 'y' ? [u, w, v] : [u, v, w]);
  let cu = 0, cv = 0; for (const p of outline) { cu += p[0]; cv += p[1]; } cu /= outline.length; cv /= outline.length;
  const O = to(cu, cv, 0), tris = [], n = outline.length;
  const faces = triangulate(inner);
  for (const s of [-1, 1]) for (const f of faces) tris.push(outward(f.map((i) => to(inner[i][0], inner[i][1], s * ht)), [O[0] + (axis === 'x' ? -s : 0), O[1] + (axis === 'y' ? -s : 0), O[2] + (axis === 'z' ? -s : 0)]));
  const ring = (pts, w) => pts.map((p) => to(p[0], p[1], w));
  const rings = c > 0 ? [ring(inner, -ht), ring(outline, -ht + c), ring(outline, ht - c), ring(inner, ht)] : [ring(outline, -ht), ring(outline, ht)];
  for (let r = 0; r + 1 < rings.length; r++) {
    for (let i = 0; i < n; i++) {
      const a = rings[r][i], b = rings[r][(i + 1) % n], cc = rings[r + 1][(i + 1) % n], dd = rings[r + 1][i];
      // outward = away from the outline's centre line through the plate
      const mid = to(cu, cv, (a[0] + b[0] + cc[0] + dd[0]) / 4 * (axis === 'x') + (a[1] + b[1] + cc[1] + dd[1]) / 4 * (axis === 'y') + (a[2] + b[2] + cc[2] + dd[2]) / 4 * (axis === 'z'));
      tris.push(outward([a, b, cc], mid), outward([a, cc, dd], mid));
    }
  }
  const g = build(T, tris);
  cache.set(key, g);
  return g;
}

// The serration patch in its own frame: x across the row (w), y out of the face, z along the row. The valley floors sit
// 0.05 mm proud of the face, the ridges `depth` above them, and the patch reaches DETAIL_BED into the face below.
export function serrationGeometry(T, count, pitch, w, depth, profile = 'v') {
  const key = `serr|${count}|${pitch}|${w}|${depth}|${profile}`, cache = cacheFor(T);
  if (cache.has(key)) return cache.get(key);
  const lift = 0.00005, top = lift + depth, len = count * pitch, z0 = -len / 2;
  const prof = [];   // (z, y) along the row, a function of z
  for (let i = 0; i < count; i++) {
    const a = z0 + i * pitch;
    if (profile === 'square') prof.push([a, top], [z0 + (i + 0.5) * pitch, top], [z0 + (i + 0.5) * pitch, lift], [z0 + (i + 1) * pitch, lift]);
    else if (profile === 'round') { for (let k = 0; k < 6; k++) { const u = k / 6; prof.push([a + pitch * u, lift + depth * (1 - Math.sin(Math.PI * u))]); } }
    else prof.push([a, top], [z0 + (i + 0.5) * pitch, lift]);   // 'v': each groove a V between sharp ridges
  }
  if (profile !== 'square') prof.push([z0 + len, top]);   // (a square row ends on its last groove's floor)
  const clean = prof.filter((p, i) => i === 0 || Math.abs(p[0] - prof[i - 1][0]) > 1e-9 || Math.abs(p[1] - prof[i - 1][1]) > 1e-9);
  const hx = w / 2, bot = -DETAIL_BED, tris = [];
  const inside = [0, (bot + lift) / 2, 0];
  const quad = (a, b, c, d, ins = inside) => { tris.push(outward([a, b, c], ins), outward([a, c, d], ins)); };
  for (let i = 0; i + 1 < clean.length; i++) {
    const [za, ya] = clean[i], [zb, yb] = clean[i + 1];
    if (Math.abs(za - zb) < 1e-9) {   // a vertical wall of a square groove: faces along z
      quad([-hx, ya, za], [hx, ya, za], [hx, yb, zb], [-hx, yb, zb], [0, Math.min(ya, yb) - 1e-4, za + (ya > yb ? -1 : 1) * 1e-4]);
      continue;
    }
    // the top surface between two profile points (a V flank, a land, a valley floor)
    quad([-hx, ya, za], [hx, ya, za], [hx, yb, zb], [-hx, yb, zb], [0, bot, (za + zb) / 2]);
  }
  const f = clean[0], l = clean[clean.length - 1];
  // the two side walls (x = +-hx): the profile closed along the bed, triangulated whole (no T-junctions)
  const side = [...clean, [l[0], bot], [f[0], bot]];
  for (const tri of triangulate(side)) for (const sx of [-1, 1]) tris.push(outward(tri.map((i) => [sx * hx, side[i][1], side[i][0]]), [0, side[tri[0]][1], side[tri[0]][0]]));
  quad([-hx, bot, f[0]], [hx, bot, f[0]], [hx, f[1], f[0]], [-hx, f[1], f[0]]);   // the two ends
  quad([-hx, bot, l[0]], [hx, bot, l[0]], [hx, l[1], l[0]], [-hx, l[1], l[0]]);
  quad([-hx, bot, f[0]], [hx, bot, f[0]], [hx, bot, l[0]], [-hx, bot, l[0]], [0, 1, 0]);   // the bed
  const g = build(T, tris);
  cache.set(key, g);
  return g;
}

// A unit fastener head (radius 1) standing up +y from y = 0 (the face), seated to -bed (in units of r, given), with its
// drive cut into the top: the drive is any star-shaped outline r_in(theta) sampled at the head's own segments.
const SEG = 36;
function driveRadius(kind, th) {
  const c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
  if (kind === 'slot') return Math.min(0.78 / (c || 1e-9), 0.13 / (s || 1e-9));
  if (kind === 'cross') return Math.max(Math.min(0.62 / (c || 1e-9), 0.12 / (s || 1e-9)), Math.min(0.12 / (c || 1e-9), 0.62 / (s || 1e-9)));
  if (kind === 'hex') { const a = ((th % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6; return 0.42 * Math.cos(Math.PI / 6) / Math.cos(a); }
  if (kind === 'torx') return 0.36 * (1 + 0.22 * Math.cos(6 * th));
  return 0;
}
export function fastenerGeometry(T, kind = 'slot', bedRel = 0.4) {
  const key = `fast|${kind}|${bedRel}`, cache = cacheFor(T);
  if (cache.has(key)) return cache.get(key);
  const tris = [], H = kind === 'pin' ? 0.25 : 0.45, ch = kind === 'pin' ? 0.08 : 0.12, bot = -bedRel;
  const ring = (r, y, i) => { const th = i / SEG * Math.PI * 2; return [Math.cos(th) * r, y, Math.sin(th) * r]; };
  const inside = [0, (bot + H) / 2, 0];
  const quad = (a, b, c, d, ins = inside) => { tris.push(outward([a, b, c], ins), outward([a, c, d], ins)); };
  for (let i = 0; i < SEG; i++) {
    const j = i + 1;
    quad(ring(1, bot, i), ring(1, bot, j), ring(1, H - ch, j), ring(1, H - ch, i));   // the side
    tris.push(outward([[0, bot, 0], ring(1, bot, i), ring(1, bot, j)], [0, 1, 0]));      // the seat (inside the face)
  }
  if (kind === 'button') {
    // a domed head: the chamfer ring rises into a shallow dome
    const rows = 5;
    for (let k = 0; k < rows; k++) {
      const a0 = k / rows * Math.PI / 2, a1 = (k + 1) / rows * Math.PI / 2;
      const r0 = Math.cos(a0), r1 = Math.cos(a1), y0 = H - ch + Math.sin(a0) * (ch + 0.12), y1 = H - ch + Math.sin(a1) * (ch + 0.12);
      for (let i = 0; i < SEG; i++) {
        if (r1 < 1e-6) tris.push(outward([ring(r0, y0, i), ring(r0, y0, i + 1), [0, y1, 0]], inside));
        else quad(ring(r0, y0, i), ring(r0, y0, i + 1), ring(r1, y1, i + 1), ring(r1, y1, i));
      }
    }
  } else {
    const rTop = 1 - ch;
    for (let i = 0; i < SEG; i++) quad(ring(1, H - ch, i), ring(1, H - ch, i + 1), ring(rTop, H, i + 1), ring(rTop, H, i));   // the top chamfer
    if (kind === 'pin') {
      for (let i = 0; i < SEG; i++) tris.push(outward([[0, H, 0], ring(rTop, H, i), ring(rTop, H, i + 1)], inside));
    } else {
      const depth = Math.min(0.32, H + bedRel * 0.5), rIn = (i) => Math.min(driveRadius(kind, i / SEG * Math.PI * 2), rTop * 0.92);
      for (let i = 0; i < SEG; i++) {
        const j = i + 1, a = ring(rTop, H, i), b = ring(rTop, H, j), c = ring(rIn(j), H, j), d = ring(rIn(i), H, i);
        quad(a, b, c, d, [0, H - 1, 0]);   // the top face round the drive
        // the drive's wall and floor (seen from above: they face inward/up)
        const c2 = ring(rIn(j), H - depth, j), d2 = ring(rIn(i), H - depth, i);
        tris.push(outward([d, c, c2], [d[0] * 2, H - depth / 2, d[2] * 2]), outward([d, c2, d2], [d[0] * 2, H - depth / 2, d[2] * 2]));
        tris.push(outward([[0, H - depth, 0], d2, c2], [0, H - depth - 1, 0]));
      }
    }
  }
  const g = build(T, tris);
  cache.set(key, g);
  return g;
}

export function weaponDetail(ctx) {
  const T = ctx.THREE;
  const up = new T.Vector3(0, 1, 0), q = new T.Quaternion(), roll = new T.Quaternion(), m = new T.Matrix4(), v = new T.Vector3(), s = new T.Vector3();
  const dir = (axis, side = 1) => new T.Vector3(...AXES[axis]).multiplyScalar(side);
  const place = (mesh, parent, x, y, z) => { mesh.position.set(x || 0, y || 0, z || 0); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
  // The heads of `geo` for every item: y of the unit part along the face's normal, scaled by r.
  // A single head is an ordinary Mesh: the unit head, mesh.scale = r (callers may rescale its geometry).
  function instanced(parent, geo, mat, items, kind, scaleOf, offsetOf = () => 0) {
    const pose = (it) => {
      const n = dir(it.axis || 'x', it.side || 1), r = scaleOf(it);
      q.setFromUnitVectors(up, n); roll.setFromAxisAngle(up, it.turn || 0); q.multiply(roll);
      v.set(it.x || 0, it.y || 0, it.z || 0).addScaledVector(n, offsetOf(it));
      return r;
    };
    if (items.length === 1) {
      const one = new T.Mesh(geo, mat), r = pose(items[0]);
      one.position.copy(v); one.quaternion.copy(q); one.scale.set(r, r, r);
      one.userData.weaponDetail = { kind, items: items.map((it) => ({ ...it })) };
      one.castShadow = false; one.receiveShadow = true;
      parent.add(one);
      return one;
    }
    // Two or more heads: one plain Mesh, every head baked into its geometry at its size and place (no instancing:
    // a copy path that drops instance matrices drew unit-size, 1 m, heads in the revolver's eye; CB-316, 12 Nov).
    const src = geo.attributes, nv = src.position.count, P = new Float32Array(nv * 3 * items.length), N = new Float32Array(nv * 3 * items.length);
    const nm = new T.Matrix3(), a = new T.Vector3();
    items.forEach((it, k) => {
      const r = pose(it); m.compose(v, q, s.set(r, r, r)); nm.getNormalMatrix(m);
      for (let i = 0; i < nv; i++) {
        a.fromBufferAttribute(src.position, i).applyMatrix4(m); P.set([a.x, a.y, a.z], (k * nv + i) * 3);
        a.fromBufferAttribute(src.normal, i).applyMatrix3(nm).normalize(); N.set([a.x, a.y, a.z], (k * nv + i) * 3);
      }
    });
    const baked = new T.BufferGeometry(), U = new Float32Array(P.length / 3 * 2);
    boxProjectUV(P, U);
    baked.setAttribute('position', new T.BufferAttribute(P, 3));
    baked.setAttribute('normal', new T.BufferAttribute(N, 3));
    baked.setAttribute('uv', new T.BufferAttribute(U, 2));
    baked.computeBoundingBox(); baked.computeBoundingSphere();
    const mesh = new T.Mesh(baked, mat);
    mesh.userData.weaponDetail = { kind, items: items.map((it) => ({ ...it })) };
    mesh.castShadow = false; mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  return {
    DETAIL_BED,
    chamferBox(parent, w, h, d, c, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
      const mesh = place(new T.Mesh(chamferBoxGeometry(T, w, h, d, c), mat), parent, x, y, z);
      mesh.rotation.set(rx, ry, rz);
      return mesh;
    },
    plate(parent, outline, t, c, mat, o = {}) {
      const mesh = place(new T.Mesh(plateGeometry(T, outline, t, c, o.axis || 'x'), mat), parent, o.x, o.y, o.z);
      if (o.rx || o.ry || o.rz) mesh.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
      return mesh;
    },
    serrations(parent, mat, o) {
      const axis = o.axis || 'x', side = o.side || 1, along = o.along || 'z';
      const mesh = new T.Mesh(serrationGeometry(T, o.count || 8, o.pitch || 0.003, o.w || 0.014, o.depth || 0.0008, o.profile || 'v'), mat);
      // the patch's own frame: y out of the face, z along the row
      const n = dir(axis, side), a = dir(along), x3 = new T.Vector3().crossVectors(n, a);
      mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x3, n, a));
      mesh.userData.weaponDetail = { kind: 'serrations', axis, side, along, count: o.count || 8 };
      return place(mesh, parent, o.x, o.y, o.z);
    },
    fasteners(parent, mat, kind, items) {
      if (!items.length) return null;
      const geo = fastenerGeometry(T, kind, 0.4);
      // the unit head's seat is 0.4 r deep; DETAIL_BED is the least a head is seated, so a small head goes deeper
      return instanced(parent, geo, mat, items, kind, (it) => it.r || 0.0016);
    },
    pins(parent, mat, items) {
      const ends = [];
      for (const it of items) {
        const axis = it.axis || 'x', half = (it.span || 0.02) / 2;
        for (const side of [-1, 1]) ends.push({ ...it, axis, side, x: (it.x || 0) + AXES[axis][0] * side * half, y: (it.y || 0) + AXES[axis][1] * side * half, z: (it.z || 0) + AXES[axis][2] * side * half });
      }
      return this.fasteners(parent, mat, 'pin', ends);
    }
  };
}
