import * as M from '/home/claude/gs306/studio/marine-hand.js';
class BA { constructor(a, n) { this.array = a; this.itemSize = n; this.count = a.length / n; } }
class BG { constructor() { this.attributes = {}; this.index = null; } setAttribute(k, v) { this.attributes[k] = v; } setIndex(i) { this.index = { array: Uint32Array.from(i), count: i.length }; } }
class V3 { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }
class Mesh { constructor(g, m) { this.geometry = g; this.material = m; this.children = []; this.userData = {}; this.visible = true; } add(o) { this.children.push(o); o.parent = this; } }
const T = { BufferGeometry: BG, BufferAttribute: BA, Mesh, Object3D: class { constructor() { this.userData = {}; this.visible = true; } }, Sphere: class {}, Box3: class {}, Vector3: V3 };
const b = M.buildHandMeshes({ T, s: 1, ox: 0, gz: 0.07, mat: {}, padMat: process.env.GLOVE ? {} : null, nailMat: process.env.GLOVE ? null : {}, detail: process.env.DET || 'high' });
const rig = M.makeHandRig(1, [b], M.HAND_POSES.open);
for (const [k, m] of Object.entries(b.meshes)) {
  if (!m) continue;
  const idx = m.geometry.index.array, P = m.geometry.attributes.position.array, N = m.geometry.attributes.normal.array;
  const edges = new Map();
  for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) { const a = idx[t + e], c = idx[t + (e + 1) % 3]; const key = a + ',' + c; edges.set(key, (edges.get(key) || 0) + 1); }
  let open = 0, dup = 0; const openList = [];
  for (const [key, cnt] of edges) { const [a, c] = key.split(',').map(Number); if (!edges.has(c + ',' + a)) { open++; if (openList.length < 5) openList.push([a, c, [P[a*3],P[a*3+1],P[a*3+2]].map(v=>+v.toFixed(4))]); } if (cnt > 1) dup++; }
  // normals vs face orientation: count faces whose geometric normal opposes the average vertex normal
  let bad = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const [a, c, d] = [idx[t], idx[t + 1], idx[t + 2]];
    const e1 = [P[c*3]-P[a*3], P[c*3+1]-P[a*3+1], P[c*3+2]-P[a*3+2]], e2 = [P[d*3]-P[a*3], P[d*3+1]-P[a*3+1], P[d*3+2]-P[a*3+2]];
    const fn = [e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
    const vn = [0,1,2].map(i => N[a*3+i]+N[c*3+i]+N[d*3+i]);
    if (fn[0]*vn[0]+fn[1]*vn[1]+fn[2]*vn[2] < -1e-12) { bad++; if (bad < 8) console.log('  bad face', a, c, d, [P[a*3],P[a*3+1],P[a*3+2]].map(v=>+v.toFixed(4))); }
  }
  console.log(k, 'verts', P.length/3, 'tris', idx.length/3, 'open edges', open, 'dup', dup, 'faces against normals', bad, openList);
}
{ const m = b.meshes.main, N = m.geometry.attributes.normal.array; let nan = 0; for (const v of N) if (!Number.isFinite(v)) nan++; console.log('NaN normals', nan); }
