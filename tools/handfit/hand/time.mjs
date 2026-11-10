import * as M from '/home/claude/gs306/studio/marine-hand.js';
class BA { constructor(a, n) { this.array = a; this.itemSize = n; this.count = a.length / n; } }
class BG { constructor() { this.attributes = {}; } setAttribute(k, v) { this.attributes[k] = v; } setIndex(i) { this.index = { array: i, count: i.length }; } }
class Mesh { constructor(g) { this.geometry = g; this.userData = {}; this.visible = true; } add() {} }
const T = { BufferGeometry: BG, BufferAttribute: BA, Mesh, Object3D: class { constructor() { this.userData = {}; } }, Sphere: class {}, Box3: class {}, Vector3: class {} };
for (const detail of ['high', 'mid']) for (const s of [1, -1]) for (const glove of [true, false]) {
  const t0 = performance.now();
  const b = M.buildHandMeshes({ T, s, ox: s > 0 ? -0.01 : 0.02, gz: s > 0 ? 0.07 : 0.08, mat: {}, padMat: glove ? {} : null, nailMat: glove ? null : {}, detail });
  const tris = Object.values(b.meshes).filter(Boolean).reduce((a, m) => a + m.geometry.index.count / 3, 0);
  console.log(detail, s, glove ? 'glove' : 'bare', 'tris', tris, 'ms', (performance.now() - t0).toFixed(0));
}
