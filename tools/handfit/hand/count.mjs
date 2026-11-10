import * as M from '/home/claude/gs306/studio/marine-hand.js';
class BA { constructor(a, n) { this.array = a; this.itemSize = n; this.count = a.length / n; } }
class BG { constructor() { this.attributes = {}; } setAttribute(k, v) { this.attributes[k] = v; } setIndex(i) { this.index = { array: i, count: i.length }; } }
class V3 { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }
class Mesh { constructor(g) { this.geometry = g; this.userData = {}; this.visible = true; } add() {} }
const T = { BufferGeometry: BG, BufferAttribute: BA, Mesh, Object3D: class { constructor() { this.userData = {}; } }, Sphere: class {}, Box3: class {}, Vector3: V3 };
for (const detail of ['high', 'mid']) for (const glove of [true, false]) {
  const b = M.buildHandMeshes({ T, s: 1, ox: 0, gz: 0.07, mat: {}, padMat: glove ? {} : null, nailMat: glove ? null : {}, detail });
  const tris = Object.values(b.meshes).filter(Boolean).reduce((a, m) => a + m.geometry.index.count / 3, 0);
  const verts = Object.values(b.meshes).filter(Boolean).reduce((a, m) => a + m.geometry.attributes.position.count, 0);
  const rig = M.makeHandRig(1, [b]); const t0 = performance.now(); for (let i = 0; i < 200; i++) { rig.set({ f: [[i % 2, 0.5, 0.3, 0], [0.4, 0.5, 0.3, 0], [0.4, 0.5, 0.3, 0], [0.4, 0.5, 0.3, 0]], t: [0.3, 0.2, 0.1] }); rig.update(true); }
  console.log(detail, glove ? 'glove' : 'bare', 'tris', tris, 'verts', verts, 'deform ms', ((performance.now() - t0) / 200).toFixed(3));
}
