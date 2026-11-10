// CL-334 e: the fist's thumb, searched: wrapped round the bar, its pad on the back of the index (and middle) finger's middle
// bone, across them, touching but not through the bar or the fingers, inside the joint limits.
import * as M from '/home/claude/gs306/studio/marine-hand.js';
class BA { constructor(a, n) { this.array = a; this.itemSize = n; this.count = a.length / n; } }
class BG { constructor() { this.attributes = {}; } setAttribute(k, v) { this.attributes[k] = v; } setIndex(i) { this.index = { array: i, count: i.length }; } }
class V3 { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }
class Mesh { constructor(g) { this.geometry = g; this.userData = {}; this.visible = true; } add() {} }
const T = { BufferGeometry: BG, BufferAttribute: BA, Mesh, Object3D: class { constructor() { this.userData = {}; } }, Sphere: class {}, Box3: class {}, Vector3: V3 };
const L0 = M.handLayout(1, 0, 0.07);
const b = M.buildHandMeshes({ T, s: 1, ox: 0, gz: 0.07, mat: {}, padMat: null, nailMat: null, detail: 'high' });
const rig = M.makeHandRig(1, [b], M.HAND_POSES.fist);
const sk = rig.skins[0], P = sk.mesh.geometry.attributes.position.array, seg = sk.seg, n = sk.n;
const bar = { y: L0.gripY, z: 0.07 + 0.008, r: 0.013 };
const F = JSON.parse(process.argv[2] || 'null') || M.HAND_POSES.fist.f;
const thumbV = [], idxV = [], midV = [];
for (let v = 0; v < n; v++) { const s0 = seg[v]; if (s0 >= 14) thumbV.push(v); else if (s0 === 2 || s0 === 3) idxV.push(v); else if (s0 === 5 || s0 === 6) midV.push(v); }
const p = new V3();
function evalT(t) {
  rig.set({ f: F, t }).update(true);
  let barPen = 0, fingPen = 0;
  for (const v of thumbV) { const dy = P[v * 3 + 1] - bar.y, dz = P[v * 3 + 2] - bar.z, dd = Math.hypot(dy, dz) - bar.r; if (dd < 0) barPen = Math.max(barPen, -dd); }
  // the thumb against the index and middle fingers' skin: nearest distance (vertex to vertex, 2 mm floor for the mesh spacing)
  let near = 1;
  for (const v of thumbV) for (const w of idxV.concat(midV)) { const d = Math.hypot(P[v * 3] - P[w * 3], P[v * 3 + 1] - P[w * 3 + 1], P[v * 3 + 2] - P[w * 3 + 2]); if (d < near) near = d; }
  const tip = rig.point('thumbTip', new V3()), base = rig.point('thumbBase', new V3());
  // the target: the back (dorsal, -z of the bone) of the index finger's middle bone, half way along, and the middle finger's
  const Mx = rig.matrices(), at = (k, x, y, z) => { const m = Mx[k]; return [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]]; };
  const fI = L0.fingers[0], fM = L0.fingers[1];
  const tI = at(2, 0, -fI.len[1] * 0.5, -fI.d / 2 - 0.008), tM = at(5, 0, -fM.len[1] * 0.4, -fM.d / 2 - 0.008);
  // the thumb's end bone: its pad half way along
  const pad = at(15, 0, -L0.thumb.len[2] * 0.45, L0.thumb.d[2] / 2);
  const dI = Math.hypot(pad[0] - tI[0], pad[1] - tI[1], pad[2] - tI[2]);
  const tipToM = Math.hypot(tip.x - tM[0], tip.y - tM[1], tip.z - tM[2]);
  return { barPen, near, dI, tipToM, tip: [tip.x, tip.y, tip.z].map((q) => +q.toFixed(4)), base: [base.x, base.y, base.z].map((q) => +q.toFixed(4)) };
}
let best = null;
const R = (a, b, s) => { const o = []; for (let x = a; x <= b + 1e-9; x += s) o.push(+x.toFixed(3)); return o; };
for (const c of R(0.6, 1.3, 0.1)) for (const sw of R(-0.9, 0.3, 0.15)) for (const ip of R(0, 1.2, 0.2)) for (const rl of R(-0.3, 0.6, 0.15)) for (const me of R(-0.3, 0.45, 0.15)) {
  const t = [c, sw, ip, rl, me], e = evalT(t);
  const score = e.barPen * 400 + Math.max(0, 0.0015 - e.near) * 400 + e.dI * 30 + e.tipToM * 10;
  if (!best || score < best.score) best = { score, t, e };
}
console.log(JSON.stringify(best));
