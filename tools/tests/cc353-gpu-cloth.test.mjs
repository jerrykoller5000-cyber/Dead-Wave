// CC-353 (J153 note 2, the lag; claude3): liveCloth's GPU path (studio/marine-cloth.js gpuCloth) bends the same as its CPU
// path. Node only, the real three (vendor/three/three.core.js): a garment worn by three joints, built both ways from the
// same inputs, posed through a set of joint moves; the GPU mesh's skinning (three's: sum of weight x boneMatrix x bindMatrix
// x position, bindMatrixInverse after, all in float32 as the shader does) must land every vertex within 1e-5 m of the CPU
// bend and every normal within 1e-4, the GPU geometry must never be written (no per-vertex upload), an unchanged pose must
// write no joint matrix, three's own CPU getVertexPosition must give the same pose, and a garment with `under` (CC-344's fold)
// must draw what the CPU path draws on every frame, with vertices uploaded only on the frames the fold bites.
// node tools/tests/cc353-gpu-cloth.test.mjs
import { register } from 'node:module';
import assert from 'node:assert/strict';
const three = new URL('../../vendor/three/three.core.js', import.meta.url).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { if (s === 'three' || s === 'three/webgpu') return n(${JSON.stringify(three)}, c); return n(s, c); }`));
const T = await import(three);
const { liveCloth, loftRings, ringsIn, weigh, smooth01 } = await import('../../studio/marine-cloth.js');

function rig() {
  const root = new T.Group(), a = new T.Group(), b = new T.Group(), c = new T.Group();
  root.add(a); a.add(b); b.add(c); a.position.set(0.1, 1.0, 0); b.position.set(0, -0.3, 0.01); c.position.set(0, -0.28, 0);
  root.updateMatrixWorld(true);
  const rings = [...ringsIn(T, root, a, [[0.05, .09, .1], [0, .095, .1], [-.15, .09, .095], [-.29, .08, .085]], { e: .82 }), ...ringsIn(T, root, b, [[-.03, .075, .08], [-.15, .07, .08], [-.27, .065, .07]], { e: .82 })];
  const { geo } = loftRings(T, rings, 20, { caps: 'first' });
  const bones = [a, b, c];
  const w = weigh(T, root, bones, geo, (L) => { const k = smooth01(.05, -.05, L[1][1]), s = smooth01(-.04, .05, L[2][1]); return [1 - k, k * s, k * (1 - s)]; });
  return { root, bones, geo, w };
}
const mat = new T.MeshStandardMaterial();
const A = rig(), B = rig();
const cpu = liveCloth(T, { space: A.root, bones: A.bones, geo: A.geo, weights: A.w, material: mat, name: 'cpu' });
const gpu = liveCloth(T, { space: B.root, bones: B.bones, geo: B.geo, weights: B.w, material: mat, name: 'gpu', gpu: true });
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; };
ok(!cpu.isSkinnedMesh && cpu.userData.cloth.gpu === false, 'the default stays the CPU mesh');
ok(gpu.isSkinnedMesh && gpu.userData.cloth.gpu === true, 'gpu: true builds a SkinnedMesh');
ok(gpu.bindMode === 'detached' && gpu.bindMatrix.equals(new T.Matrix4()), 'detached, identity bind');
ok(gpu.boundingSphere && gpu.boundingSphere.radius > 0.3, 'the padded rest sphere is kept (no CPU skin of every vertex for it)');
const g = gpu.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
ok(si && sw && si.count === g.attributes.position.count, 'skinIndex/skinWeight on every drawn vertex');
const posV = g.attributes.position.version, nrmV = g.attributes.normal.version, rest = Float32Array.from(g.attributes.position.array);
const f = Math.fround;
function skinned() {   // three's SkinningNode, in float32
  const BM = gpu.skeleton.boneMatrices, bind = gpu.bindMatrix.elements, bindI = gpu.bindMatrixInverse.elements, P = g.attributes.position, N = g.attributes.normal;
  const outP = new Float32Array(P.count * 3), outN = new Float32Array(P.count * 3);
  const mul = (m, o, x, y, z, w) => [f(m[o] * x + m[o + 4] * y + m[o + 8] * z + m[o + 12] * w), f(m[o + 1] * x + m[o + 5] * y + m[o + 9] * z + m[o + 13] * w), f(m[o + 2] * x + m[o + 6] * y + m[o + 10] * z + m[o + 14] * w)];
  for (let i = 0; i < P.count; i++) {
    const v = mul(bind, 0, P.getX(i), P.getY(i), P.getZ(i), 1);
    let x = 0, y = 0, z = 0, nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < 4; k++) {
      const wk = sw.getComponent(i, k); if (!wk) continue; const j = si.getComponent(i, k) * 16;
      const p = mul(BM, j, v[0], v[1], v[2], 1), n = mul(BM, j, N.getX(i), N.getY(i), N.getZ(i), 0);
      x = f(x + wk * p[0]); y = f(y + wk * p[1]); z = f(z + wk * p[2]); nx = f(nx + wk * n[0]); ny = f(ny + wk * n[1]); nz = f(nz + wk * n[2]);
    }
    const q = mul(bindI, 0, x, y, z, 1), l = Math.hypot(nx, ny, nz) || 1;
    outP.set(q, i * 3); outN.set([nx / l, ny / l, nz / l], i * 3);
  }
  return { P: outP, N: outN };
}
const POSES = [[0, 0, 0, 0, 0, 0], [0.9, 0.1, -0.2, 1.4, 0, 0], [-0.5, 0.3, 0.4, 0.2, 0.1, -0.6], [1.6, -0.2, 0, 2.2, 0, 0.3], [0.3, 0.8, 0.2, 0.6, -0.2, 0.9]];
let worstP = 0, worstN = 0, worstApi = 0;
for (const [ax, ay, az, bx, cx, cz] of POSES) {
  for (const R of [A, B]) { R.bones[0].rotation.set(ax, ay, az); R.bones[1].rotation.set(bx, 0, 0); R.bones[2].rotation.set(cx, 0, cz); }
  cpu.userData.cloth.bend();
  gpu.skeleton.update();
  const s = skinned(), cp = cpu.geometry.attributes.position.array, cn = cpu.geometry.attributes.normal.array;
  for (let i = 0; i < cp.length; i++) { worstP = Math.max(worstP, Math.abs(cp[i] - s.P[i])); worstN = Math.max(worstN, Math.abs(cn[i] - s.N[i])); }
  const po = gpu.userData.cloth.posed();
  for (let i = 0; i < cp.length; i++) worstP = Math.max(worstP, Math.abs(cp[i] - po[i]));
  // three's own CPU side (raycast, getVertexPosition) reads the stand-in bones' matrixWorld: the same pose (ChatGPT's witness)
  const v = new T.Vector3();
  for (let i = 0; i < g.attributes.position.count; i++) { gpu.getVertexPosition(i, v); worstApi = Math.max(worstApi, Math.abs(v.x - cp[i * 3]), Math.abs(v.y - cp[i * 3 + 1]), Math.abs(v.z - cp[i * 3 + 2])); }
}
console.log(`INFO ${POSES.length} poses, ${g.attributes.position.count} vertices: worst position ${(worstP * 1000).toFixed(5)} mm, worst normal ${worstN.toExponential(2)}`);
ok(worstP < 1e-5, 'GPU skin = CPU bend within 1e-5 m (and posed() the same)');
ok(worstN < 1e-4, 'normals within 1e-4');
{ const pn = gpu.userData.cloth.posedNormals(), cn = cpu.userData.cloth.posedNormals(); let w = 0; for (let i = 0; i < cn.length; i++) w = Math.max(w, Math.abs(pn[i] - cn[i])); ok(w < 1e-4, 'posedNormals() = the CPU bend\'s normals (the cloth tests read them)'); }
console.log(`INFO three's getVertexPosition vs the CPU bend: worst ${(worstApi * 1000).toFixed(5)} mm`);
ok(worstApi < 1e-5, "three's CPU getVertexPosition (raycast, clip consumers) = the drawn pose within 1e-5 m");
ok(g.attributes.position.version === posV && g.attributes.normal.version === nrmV && g.attributes.position.array.every((v, i) => v === rest[i]), 'the GPU geometry is never written: no per-vertex upload');
const m0 = gpu.userData.cloth.moves(), bm = Float32Array.from(gpu.skeleton.boneMatrices);
gpu.skeleton.update(); gpu.skeleton.update();
ok(gpu.userData.cloth.moves() === m0 && gpu.skeleton.boneMatrices.every((v, i) => v === bm[i]), 'an unchanged pose writes no joint matrix');
B.bones[1].rotation.x += 0.01; gpu.skeleton.update();
ok(gpu.userData.cloth.moves() === m0 + 1, 'a moved joint writes them once');
// CC-344's fold (`under`): on the GPU too, the fold drawn by the CPU only on the frames it moves a vertex. A box over the
// front of the knee: the shin swung forward runs into it, the leg straight does not.
const UNDER = { k: 0, gap: 0.002, boxes: [{ x: [-.2, .2], y: [-.36, -.26], z: [.12, .35] }] };
const C1 = rig(), C2 = rig();
const ucpu = liveCloth(T, { space: C1.root, bones: C1.bones, geo: C1.geo, weights: C1.w, material: mat, name: 'ucpu', under: UNDER });
const ugpu = liveCloth(T, { space: C2.root, bones: C2.bones, geo: C2.geo, weights: C2.w, material: mat, name: 'ugpu', under: UNDER, gpu: true });
ok(ugpu.isSkinnedMesh && ugpu.userData.cloth.gpu === true, 'with `under` the garment is on the GPU too');
const ug = ugpu.geometry, uRest = Float32Array.from(ug.attributes.position.array);
const drawnGpu = () => {   // what the GPU draws: three's skinning of what is in the geometry with the joints it holds
  const BM = ugpu.skeleton.boneMatrices, Pg = ug.attributes.position, Sw = ug.attributes.skinWeight, Si = ug.attributes.skinIndex, o = new Float32Array(Pg.count * 3);
  for (let i = 0; i < Pg.count; i++) { let x = 0, y = 0, z = 0; for (let k = 0; k < 4; k++) { const w = Sw.getComponent(i, k); if (!w) continue; const j = Si.getComponent(i, k) * 16, X = Pg.getX(i), Y = Pg.getY(i), Z = Pg.getZ(i);
    x += w * (BM[j] * X + BM[j + 4] * Y + BM[j + 8] * Z + BM[j + 12]); y += w * (BM[j + 1] * X + BM[j + 5] * Y + BM[j + 9] * Z + BM[j + 13]); z += w * (BM[j + 2] * X + BM[j + 6] * Y + BM[j + 10] * Z + BM[j + 14]); } o.set([x, y, z], i * 3); }
  return o;
};
let worstU = 0, bites = 0, quiet = 0, uploadsOnQuiet = 0, lastV = ug.attributes.position.version, wasCpu = false;
for (const ax of [0, -0.4, -0.9, -1.4, -0.9, -0.2, 0, 0, -1.6, 0.1]) {
  for (const R of [C1, C2]) { R.bones[0].rotation.set(0, 0, 0); R.bones[1].rotation.set(ax, 0, 0); }
  ucpu.userData.cloth.bend(); ugpu.skeleton.update();
  const cpuBent = ucpu.geometry.attributes.position.array, gd = drawnGpu();
  for (let i = 0; i < gd.length; i++) worstU = Math.max(worstU, Math.abs(gd[i] - cpuBent[i]));
  const now = ugpu.userData.cloth.cpuFrames(), bit = now > bites; bites = now;
  const v = ug.attributes.position.version;
  if (!bit) { quiet++; if (v !== lastV && !wasCpu) uploadsOnQuiet++; }
  wasCpu = bit; lastV = v;
  if (!bit && !wasCpu) ok(ug.attributes.position.array.every((q, i) => q === uRest[i]), 'a frame the fold does not bite holds the bind pose (GPU skin)');
}
console.log(`INFO under: ${bites} frames drawn by the CPU (the fold bit), ${quiet} on the GPU; worst drawn difference ${(worstU * 1000).toFixed(5)} mm`);
ok(bites > 0 && quiet > 0, 'the poses include frames where the fold bites and frames where it does not');
ok(worstU < 1e-5, 'with the fold, what is drawn = the CPU path within 1e-5 m on every frame');
ok(uploadsOnQuiet === 0, 'no vertex upload on a frame the fold does not bite (but the one that puts the bind pose back)');
const D = rig(), four = liveCloth(T, { space: D.root, bones: [...D.bones, D.root.children[0]], geo: D.geo, weights: (() => { const n = D.w.length / 3, w = new Float32Array(n * 4); for (let i = 0; i < n; i++) { w[i * 4] = D.w[i * 3]; w[i * 4 + 1] = D.w[i * 3 + 1]; w[i * 4 + 2] = D.w[i * 3 + 2]; } return w; })(), material: mat, name: 'four', gpu: true });
ok(four.isSkinnedMesh, 'four joints still on the GPU');
console.log(`${pass} pass, 0 fail`);
