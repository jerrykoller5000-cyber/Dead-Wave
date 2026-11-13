// CH-1 (J151 notes 31 and 45, Jerry 13 Nov 2026: "lasers clip through things that they should stop on like pieces of
// the armory"; "weird collision detection and floaty impact decals on certain objects in training area").
// The Training Ground's props stopped the line queries (the laser, the rounds, the aim) on one box per still mesh
// (propSolids, CL-158). Those meshes are merged by material (bakeStatic), so one box held several parts and a round
// landed on its face in the air (45); and the size filters left thin pieces (the CIF and Armory shelves) and tall ones
// without any box at all, so the beam went through them (31).
// This is the exact layer for line queries only: the drawn triangles of every mesh propSolids walked (markLineMesh,
// markLineRoot), in world space, cut into small parts with their own boxes. tg.solids is untouched, so the
// camera, the player's and the zombies' collision and the station reach keep their boxes.
//   exactLayer(tg) -> { parts, count, solids }     built on first use, rebuilt when tg.solids changes length
//   exactTrace(layer, a, b, before, out, outside) -> t | null   the first drawn triangle on segment a -> b nearer than
//       before (t in 0..1); out gets { solid, nx, ny, nz } (the face's normal turned toward a); outside: the shell's
//       pieces are looked through (a camera outside the rooms)
const CELL = 0.4;   // m: the triangles of one mesh are grouped by the cell of their centre
const EDGE = 1e-5;   // a line along the edge two faces share hits one of them (no crack between them)
const meshParts = new WeakMap();   // mesh -> its parts (world space; the props are still once placed)
// propSolids names the surfaces: each mesh it walks, and each whole copy it walks (a later piece of it counts too). A set,
// not a userData flag: a clone of a mesh (the cutaway's wall shells) must not inherit it.
const lineMeshes = new WeakSet(), lineRoots = new WeakSet();
export function markLineMesh(o) { lineMeshes.add(o); }
export function markLineRoot(o) { lineRoots.add(o); }
export function isLineSurface(o) {
  if (lineMeshes.has(o)) return true;
  for (let x = o.parent; x; x = x.parent) if (lineRoots.has(x)) return true;
  return false;
}

function visibleChain(o) { for (let x = o; x; x = x.parent) if (x.visible === false) return false; return true; }
function drawnMaterial(m) {
  if (!m) return false;
  const one = (q) => q && q.visible !== false;   // glass too (the room's decals are not walked: propSolids' skip)
  return Array.isArray(m) ? m.some(one) : one(m);
}

function buildMeshParts(mesh, topY) {
  const g = mesh.geometry, pos = g && g.attributes && g.attributes.position;
  if (!pos) return [];
  mesh.updateWorldMatrix(true, false);
  const e = mesh.matrixWorld.elements, idx = g.index ? g.index.array : null;
  const n = idx ? g.index.count : pos.count, cells = new Map();
  const P = new Float64Array(9);
  for (let k = 0; k + 2 < n; k += 3) {
    for (let j = 0; j < 3; j++) {
      const i = idx ? idx[k + j] : k + j, x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      P[j * 3] = e[0] * x + e[4] * y + e[8] * z + e[12];
      P[j * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      P[j * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
    }
    if (Math.min(P[1], P[4], P[7]) > topY) continue;   // the roof and its lamps stay out of the aim ray from the camera
    const e1x = P[3] - P[0], e1y = P[4] - P[1], e1z = P[5] - P[2], e2x = P[6] - P[0], e2y = P[7] - P[1], e2z = P[8] - P[2];
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const nl = Math.hypot(nx, ny, nz); if (nl < 1e-12) continue;
    nx /= nl; ny /= nl; nz /= nl;
    const key = Math.floor((P[0] + P[3] + P[6]) / 3 / CELL) + ',' + Math.floor((P[1] + P[4] + P[7]) / 3 / CELL) + ',' + Math.floor((P[2] + P[5] + P[8]) / 3 / CELL);
    let c = cells.get(key); if (!c) cells.set(key, c = []);
    c.push(P[0], P[1], P[2], e1x, e1y, e1z, e2x, e2y, e2z, nx, ny, nz);
  }
  const parts = [];
  for (const list of cells.values()) {
    const tri = new Float64Array(list), box = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
    for (let t = 0; t < tri.length; t += 12) for (let j = 0; j < 3; j++) {
      const x = tri[t] + (j === 1 ? tri[t + 3] : j === 2 ? tri[t + 6] : 0), y = tri[t + 1] + (j === 1 ? tri[t + 4] : j === 2 ? tri[t + 7] : 0), z = tri[t + 2] + (j === 1 ? tri[t + 5] : j === 2 ? tri[t + 8] : 0);
      if (x < box[0]) box[0] = x; if (x > box[1]) box[1] = x; if (y < box[2]) box[2] = y; if (y > box[3]) box[3] = y; if (z < box[4]) box[4] = z; if (z > box[5]) box[5] = z;
    }
    const m = 0.002;   // a flat part still has a box to enter
    parts.push({ minX: box[0] - m, maxX: box[1] + m, minY: box[2] - m, maxY: box[3] + m, minZ: box[4] - m, maxZ: box[5] + m, tri, solid: null });
  }
  return parts;
}

export function exactLayer(tg, { maxTop = 3.2 } = {}) {
  const have = tg._exactLayer;
  if (have && have.count === tg.solids.length) return have;
  // The meshes' own boxes (propSolids tags each with its mesh) give a hit its solid: its flags (metal: sparks, no hole)
  // stay what they were. A mesh that had no box (too thin, too long, too tall) gets one of its own here.
  const byMesh = new Map();
  for (const s of tg.solids) if (s.mesh) byMesh.set(s.mesh, s);
  const banks = tg.solids.filter((s) => s.metal && s.block);   // GB-163: the lockers' bank is steel
  const parts = [], topY = tg.floorY + maxTop;
  tg.group.updateMatrixWorld(true);
  tg.group.traverse((o) => {
    if (!o.isMesh || !isLineSurface(o) || o.isInstancedMesh || o.isSkinnedMesh || !visibleChain(o) || !drawnMaterial(o.material)) return;
    let list = meshParts.get(o);
    if (!list) { list = buildMeshParts(o, topY); meshParts.set(o, list); }
    if (!list.length) return;
    let solid = byMesh.get(o);
    if (!solid) {
      const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
      for (const p of list) { b.minX = Math.min(b.minX, p.minX); b.maxX = Math.max(b.maxX, p.maxX); b.minY = Math.min(b.minY, p.minY); b.maxY = Math.max(b.maxY, p.maxY); b.minZ = Math.min(b.minZ, p.minZ); b.maxZ = Math.max(b.maxZ, p.maxZ); }
      solid = { ...b, prop: true, exactOnly: true };
      if (banks.some((k) => b.minX >= k.minX - 0.05 && b.maxX <= k.maxX + 0.05 && b.minZ >= k.minZ - 0.05 && b.maxZ <= k.maxZ + 0.1)) solid.metal = true;
    }
    // A piece of the shell (the cutaway's groups: the walls and what hangs on them) is looked through from outside, as its
    // wall is (traceTraining's throughGlass).
    let shell = false; for (let x = o.parent; x && x !== tg.group; x = x.parent) if (/^training-cutaway-/.test(x.name || '')) { shell = true; break; }
    for (const p of list) parts.push({ ...p, solid, mesh: o, shell });
  });
  // Every mesh's box is broad phase only now: a hidden mesh's, or one whose triangles are all over the roof line, stops
  // nothing (a box with nothing drawn in it put marks in the air).
  // Flat for the trace's loop: six floats a part's box, its triangles, its solid, whether it is the shell's.
  const P = parts.length, boxes = new Float64Array(P * 6), tris = new Array(P), solids = new Array(P), shells = new Uint8Array(P);
  parts.forEach((p, i) => { boxes.set([p.minX, p.maxX, p.minY, p.maxY, p.minZ, p.maxZ], i * 6); tris[i] = p.tri; solids[i] = p.solid; shells[i] = p.shell ? 1 : 0; });
  const layer = { parts, boxes, tris, solids, shells, count: tg.solids.length, meshes: new Set(byMesh.keys()) };
  tg._exactLayer = layer;
  return layer;
}

// Moller-Trumbore on each triangle of each part whose box the segment enters before the best so far. No allocation.
export function exactTrace(layer, a, b, before, out, outside = false) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, ax = a.x, ay = a.y, az = a.z;
  const ix = Math.abs(dx) < 1e-12 ? 0 : 1 / dx, iy = Math.abs(dy) < 1e-12 ? 0 : 1 / dy, iz = Math.abs(dz) < 1e-12 ? 0 : 1 / dz;
  const B = layer.boxes, TR = layer.tris, SH = layer.shells, n = layer.solids.length;
  let best = before, hit = -1, hx = 0, hy = 0, hz = 0;
  for (let i = 0, o = 0; i < n; i++, o += 6) {
    if (outside && SH[i]) continue;
    // the segment against the part's box (slabs), t0 the entry
    let t0 = 0, t1 = best, u, v, s;
    if (ix === 0) { if (ax < B[o] || ax > B[o + 1]) continue; }
    else { u = (B[o] - ax) * ix; v = (B[o + 1] - ax) * ix; if (u > v) { s = u; u = v; v = s; } if (u > t0) t0 = u; if (v < t1) t1 = v; if (t0 > t1) continue; }
    if (iy === 0) { if (ay < B[o + 2] || ay > B[o + 3]) continue; }
    else { u = (B[o + 2] - ay) * iy; v = (B[o + 3] - ay) * iy; if (u > v) { s = u; u = v; v = s; } if (u > t0) t0 = u; if (v < t1) t1 = v; if (t0 > t1) continue; }
    if (iz === 0) { if (az < B[o + 4] || az > B[o + 5]) continue; }
    else { u = (B[o + 4] - az) * iz; v = (B[o + 5] - az) * iz; if (u > v) { s = u; u = v; v = s; } if (u > t0) t0 = u; if (v < t1) t1 = v; if (t0 > t1) continue; }
    // Moller-Trumbore on its triangles
    const T = TR[i];
    for (let k = 0; k < T.length; k += 12) {
      const e1x = T[k + 3], e1y = T[k + 4], e1z = T[k + 5], e2x = T[k + 6], e2y = T[k + 7], e2z = T[k + 8];
      const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (det > -1e-14 && det < 1e-14) continue;
      const inv = 1 / det, sx = ax - T[k], sy = ay - T[k + 1], sz = az - T[k + 2];
      const uu = (sx * px + sy * py + sz * pz) * inv; if (uu < -EDGE || uu > 1 + EDGE) continue;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
      const vv = (dx * qx + dy * qy + dz * qz) * inv; if (vv < -EDGE || uu + vv > 1 + EDGE) continue;
      const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (t < 0 || t >= best) continue;
      best = t; hit = i; hx = T[k + 9]; hy = T[k + 10]; hz = T[k + 11];
    }
  }
  if (hit < 0) return null;
  if (hx * dx + hy * dy + hz * dz > 0) { hx = -hx; hy = -hy; hz = -hz; }   // the face toward the shooter
  out.solid = layer.solids[hit]; out.nx = hx; out.ny = hy; out.nz = hz;
  return best;
}
