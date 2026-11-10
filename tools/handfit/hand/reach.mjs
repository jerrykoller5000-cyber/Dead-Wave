import * as M from '/home/claude/gs306/studio/marine-hand.js';
class BA { constructor(a, n) { this.array = a; this.itemSize = n; this.count = a.length / n; } }
class BG { constructor() { this.attributes = {}; } setAttribute(k, v) { this.attributes[k] = v; } setIndex(i) { this.index = { array: i, count: i.length }; } }
class V3 { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }
class Mesh { constructor(g) { this.geometry = g; this.userData = {}; this.visible = true; } add() {} }
const T = { BufferGeometry: BG, BufferAttribute: BA, Mesh, Object3D: class { constructor() { this.userData = {}; } }, Sphere: class {}, Box3: class {}, Vector3: V3 };
const b = M.buildHandMeshes({ T, s: 1, ox: 0, gz: 0.07, mat: {}, detail: 'mid' });
const rig = M.makeHandRig(1, [b], M.HAND_POSES.open);
const P = (n) => { const v = rig.point(n, new V3()); return [v.x, v.y, v.z]; };
const fist = [[1.0, 1.15, 0.95, 0], [1.05, 1.2, 1.0, 0], [1.05, 1.2, 1.0, 0], [1.05, 1.2, 1.0, 0]];
let best = [];
for (let c = 0; c <= 1.6; c += 0.1) for (let sw = -1.5; sw <= 1.5; sw += 0.1) for (let r = -0.8; r <= 0.8; r += 0.2) for (let mc = -0.4; mc <= 0.6; mc += 0.2) {
  rig.set({ f: fist, t: [c, sw, 0.05, r, mc] });
  const base = P('thumbBase'), tip = P('thumbTip'), idx = P('indexBase');
  const d = [tip[0] - base[0], tip[1] - base[1], tip[2] - base[2]], l = Math.hypot(...d); const u = d.map((x) => x / l);
  // want: pointing forward (+z), a little toward the fingers (-y), lying above the index knuckle (x > idx.x - 0.005)
  const score = Math.acos(Math.max(-1, Math.min(1, u[2] * 0.95 - u[1] * 0.3 / 1))) + Math.max(0, (idx[0] - 0.005) - tip[0]) * 20;
  best.push({ c: +c.toFixed(1), sw: +sw.toFixed(1), r: +r.toFixed(1), mc: +mc.toFixed(1), u: u.map((x) => +x.toFixed(2)), tip: tip.map((x) => +x.toFixed(3)), score: +score.toFixed(3) });
}
best.sort((a, b) => a.score - b.score);
console.log(best.slice(0, 6));
rig.set({ f: fist, t: [0, 0, 0, 0, 0] }); console.log('rest dir', P('thumbBase'), P('thumbTip'), 'index base', P('indexBase'), 'cmc', P('thumbCmc'));
