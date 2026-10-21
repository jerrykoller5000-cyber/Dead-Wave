// GB-152 (Jerry, 2026-10-09 16:57 CT: "Make hands that have real finger. Make them manipulate the weapons accurately."):
// the marine's hand with real fingers. A palm, a two-segment thumb and four three-segment fingers, each joint posable
// every frame. It replaces the mitt (a palm block with four ridges and a two-piece thumb) that studio/marine-body.js
// built, at the same size, on the same wrist, in the same glove and bare-skin materials.
//
// Hand space is the elbow's space at rest (as the mitt was built): +y toward the elbow, the fingers hanging along -y
// when straight, the palm facing +z, so the fingers curl toward +z round whatever runs along x through the fist (the
// wrist's userData.grip, the channel the holds put a grip through). side +1 is armRG's hand, -1 armLG's. The index finger
// and the thumb are on the +x*side edge. (The mitt had them on the -x*side edge, which made each hand the mirror image
// of the one it should be: on a pistol grip the firing thumb could only lie on the outside of the frame. GB-151 drew the
// mitts mirrored to get round it; that goes away with these hands.)
//
// One mesh per material per hand: the segments are deformed rigidly on the CPU (about 250 vertices a hand) when the pose
// changes, so the rig costs no draw calls over the mitt and needs no skinning support from the renderer (the test build's
// three has none). rig.set(pose) takes joint angles (radians); rig.update() rewrites the visible meshes if anything changed.
import { boxProjectUV } from '../../core/geometry.js';

export const FINGERS = ['index', 'middle', 'ring', 'little'];
// A pose: f = per finger [knuckle (MCP) curl, middle joint (PIP) curl, end joint (DIP) curl, spread]; t = the thumb's
// [curl at its base toward the palm, swing out from the index edge (+) or across the palm (-), end joint curl].
export const HAND_POSES = {
  open:    { f: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], t: [0, 0.35, 0] },
  relaxed: { f: [[0.3, 0.45, 0.25, 0.04], [0.38, 0.55, 0.3, 0], [0.46, 0.62, 0.32, -0.04], [0.55, 0.7, 0.36, -0.08]], t: [0.35, 0.25, 0.2] },
  // CU-112: unarmed. Fingers curl in, the thumb lies along the palm, nothing presented to the camera.
  hang:    { f: [[0.5, 0.6, 0.4, 0.02], [0.55, 0.65, 0.42, 0], [0.58, 0.68, 0.44, -0.02], [0.62, 0.72, 0.46, -0.03]], t: [0.5, -0.2, 0.4] },
  // fist: wrapped round a 2.6 cm bar through the wrist's grip channel (fitted: the fingers' inner faces 1.3 cm off its axis)
  fist:    { f: [[1.05, 1.15, 1.0, 0], [1.05, 1.15, 1.0, 0], [1.05, 1.15, 1.0, 0], [1.08, 1.2, 1.0, 0]], t: [1.0, -0.3, 0.55] },
  point:   { f: [[0.1, 0.1, 0.05, 0.05], [1.05, 1.15, 1.0, 0], [1.05, 1.15, 1.0, 0], [1.08, 1.2, 1.0, 0]], t: [0.9, -0.2, 0.5] }
};
export function copyPose(p, out = { f: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], t: [0, 0, 0] }) {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) out.f[i][j] = p.f[i][j] || 0;
  for (let j = 0; j < 3; j++) out.t[j] = p.t[j] || 0;
  return out;
}
// out = a + (b - a) * k, joint by joint.
export function lerpPose(a, b, k, out) {
  out = out || copyPose(a);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) out.f[i][j] = a.f[i][j] + (b.f[i][j] - a.f[i][j]) * k;
  for (let j = 0; j < 3; j++) out.t[j] = a.t[j] + (b.t[j] - a.t[j]) * k;
  return out;
}

// The hand's build, in hand space for side s, the mitt's ox (palm centre x) and gz (its front z).
export function handLayout(s, ox, gz) {
  const mcpY = -0.284, mcpZ = gz - 0.02;
  const fingers = FINGERS.map((name, i) => ({
    name, x: ox + s * (0.0285 - 0.019 * i),
    len: [[0.036, 0.022, 0.018], [0.039, 0.025, 0.019], [0.037, 0.023, 0.018], [0.029, 0.018, 0.015]][i],
    w: [0.0175, 0.018, 0.017, 0.015][i], d: 0.017
  }));
  return {
    s, ox, gz, mcpY, mcpZ, fingers,
    palm: [[-0.206, 0.029, 0.015, gz - 0.022], [-0.222, 0.036, 0.017, gz - 0.022], [-0.255, 0.040, 0.016, gz - 0.021], [-0.281, 0.039, 0.0145, gz - 0.02], [-0.291, 0.033, 0.010, gz - 0.02]],
    thumb: { x: ox + s * 0.03, y: -0.232, z: gz - 0.01, len: [0.034, 0.026], w: [0.02, 0.018], d: [0.019, 0.016] }
  };
}

// A soft rectangular loft along y (rings: [y, rx, rz, cz], cx), closed at both ends, as triangles with smooth normals.
function loft(out, seg, rings, cx, n) {
  const ringPts = rings.map(([y, rx, rz, cz = 0]) => {
    const pts = [];
    for (let j = 0; j < n; j++) {
      const a = (j + 0.5) / n * Math.PI * 2, sa = Math.sin(a), ca = Math.cos(a);
      const ex = Math.sign(sa) * Math.abs(sa) ** 0.7, ez = Math.sign(ca) * Math.abs(ca) ** 0.7;
      const nx = sa / Math.max(rx, 1e-4), nz = ca / Math.max(rz, 1e-4), nl = Math.hypot(nx, nz) || 1;
      pts.push({ p: [cx + rx * ex, y, cz + rz * ez], n: [nx / nl, 0, nz / nl] });
    }
    return pts;
  });
  const tri = (a, b, c) => { for (const v of [a, b, c]) { out.pos.push(...v.p); out.nrm.push(...v.n); out.seg.push(seg); } };
  for (let r = 0; r + 1 < ringPts.length; r++) for (let j = 0; j < n; j++) {
    const a = ringPts[r][j], b = ringPts[r][(j + 1) % n], c = ringPts[r + 1][j], d = ringPts[r + 1][(j + 1) % n];
    // rings run down (-y): wind so the faces look out
    tri(a, c, b); tri(b, c, d);
  }
  for (const [r, up] of [[0, true], [ringPts.length - 1, false]]) {
    const ring = ringPts[r], y = rings[r][0], cz = rings[r][3] || 0;
    const c = { p: [cx, y, cz], n: [0, up ? 1 : -1, 0] };
    for (let j = 0; j < n; j++) {
      const a = { p: ring[j].p, n: c.n }, b = { p: ring[(j + 1) % n].p, n: c.n };
      if (up) tri(c, a, b); else tri(c, b, a);
    }
  }
}
// A small box (pads), centre c, half sizes h, with flat normals.
function box(out, seg, c, h) {
  const F = [[0, 1, 2], [1, 0, 2], [2, 0, 1]];
  for (const [ax, u, v] of F) for (const sg of [1, -1]) {
    const q = (a, b) => { const p = [0, 0, 0]; p[ax] = c[ax] + sg * h[ax]; p[u] = c[u] + a * h[u]; p[v] = c[v] + b * h[v]; return p; };
    const nrm = [0, 0, 0]; nrm[ax] = sg;
    const quad = [q(-1, -1), q(1, -1), q(1, 1), q(-1, 1)];
    // wind toward the normal
    const e1 = quad[1].map((x, k) => x - quad[0][k]), e2 = quad[2].map((x, k) => x - quad[0][k]);
    const fn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const flip = fn[0] * nrm[0] + fn[1] * nrm[1] + fn[2] * nrm[2] < 0;
    const order = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
    for (const k of order) { out.pos.push(...quad[k]); out.nrm.push(...nrm); out.seg.push(seg); }
  }
}

// The joints: 0 = the palm; 1 + i*3 + j = finger i, segment j (0 proximal); 13, 14 = the thumb's two segments.
// Each segment's pivot (hand space, at rest) and its parent.
function jointTable(L) {
  const J = [{ parent: -1, pivot: [0, 0, 0] }];
  L.fingers.forEach((f) => {
    let y = L.mcpY;
    for (let j = 0; j < 3; j++) { J.push({ parent: j ? J.length - 1 : 0, pivot: [f.x, y, L.mcpZ] }); y -= f.len[j]; }
  });
  J.push({ parent: 0, pivot: [L.thumb.x, L.thumb.y, L.thumb.z] });
  J.push({ parent: 13, pivot: [L.thumb.x, L.thumb.y - L.thumb.len[0], L.thumb.z] });
  return J;
}

// Build the hand for side s in two materials-sets: returns { rig, meshes: { main, pads } } where pads may be null.
// opts: { T, s, ox, gz, mat, padMat (glove's knuckle guards, optional), pose }
export function buildHandMeshes({ T, s, ox, gz, mat, padMat = null }) {
  const L = handLayout(s, ox, gz), J = jointTable(L);
  const main = { pos: [], nrm: [], seg: [] }, pads = padMat ? { pos: [], nrm: [], seg: [] } : null;
  loft(main, 0, L.palm, ox, 10);
  L.fingers.forEach((f, i) => {
    let y = L.mcpY;
    for (let j = 0; j < 3; j++) {
      const k = [1, 0.93, 0.86][j], w = f.w / 2 * k, d = f.d / 2 * k, len = f.len[j], z = L.mcpZ;
      const rings = [[y + 0.004, w * 0.82, d * 0.82, z], [y, w, d, z], [y - len * 0.5, w * 1.03, d * 1.03, z], [y - len, w * 0.96, d * 0.96, z]];
      if (j === 2) rings.push([y - len - 0.004, w * 0.62, d * 0.6, z]);
      loft(main, 1 + i * 3 + j, rings, f.x, 6);
      if (pads && j === 0) box(pads, 1 + i * 3, [f.x, y - len * 0.45, z - d - 0.0022], [f.w * 0.36, len * 0.24, 0.0024]);
      y -= len;
    }
  });
  { const t = L.thumb; let y = t.y;
    for (let j = 0; j < 2; j++) {
      const w = t.w[j] / 2, d = t.d[j] / 2, len = t.len[j];
      const rings = [[y + 0.005, w * 0.85, d * 0.85, t.z], [y, w, d, t.z], [y - len * 0.5, w * 1.02, d * 1.02, t.z], [y - len, w * 0.92, d * 0.92, t.z]];
      if (j === 1) rings.push([y - len - 0.005, w * 0.6, d * 0.58, t.z]);
      loft(main, 13 + j, rings, t.x, 6);
      y -= len;
    }
  }
  if (pads) box(pads, 0, [ox, -0.27, gz - 0.039], [0.031, 0.007, 0.003]);   // the guard across the back of the hand
  const skins = [];
  const mk = (src, m) => {
    const n = src.pos.length / 3, rest = new Float32Array(src.pos), nrest = new Float32Array(src.nrm), seg = new Uint8Array(src.seg);
    // rest positions relative to their own segment's pivot
    for (let v = 0; v < n; v++) { const p = J[seg[v]].pivot; rest[v * 3] -= p[0]; rest[v * 3 + 1] -= p[1]; rest[v * 3 + 2] -= p[2]; }
    const P = new Float32Array(src.pos), N = new Float32Array(src.nrm), U = new Float32Array(n * 2);
    boxProjectUV(P, U);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(P, 3));
    geo.setAttribute('normal', new T.BufferAttribute(N, 3));
    geo.setAttribute('uv', new T.BufferAttribute(U, 2));
    // Bounds that hold any pose (the deform never recomputes them).
    geo.boundingSphere = new T.Sphere(new T.Vector3(ox, -0.27, gz), 0.11);
    geo.boundingBox = new T.Box3(new T.Vector3(ox - 0.11, -0.38, gz - 0.11), new T.Vector3(ox + 0.11, -0.16, gz + 0.11));
    const mesh = new T.Mesh(geo, m);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = 'gb152-hand';
    // A rigid-merge pass (mergeRigidMeshes) leaves a mesh with children alone: this one is rewritten every pose.
    mesh.add(new T.Object3D());
    const skin = { mesh, rest, nrest, seg, stamp: -1 };
    skins.push(skin);
    return mesh;
  };
  const meshes = { main: mk(main, mat), pads: pads ? mk(pads, padMat) : null };
  return { L, J, skins, meshes };
}

// Rigid 3x4 transforms as flat arrays [r00 r01 r02 tx r10 ... ] (row-major), so the deform needs nothing from three.
function rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0]; }
function rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0]; }
function mul(A, B) {
  const o = new Array(12);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) o[r * 4 + c] = A[r * 4] * B[c] + A[r * 4 + 1] * B[4 + c] + A[r * 4 + 2] * B[8 + c];
    o[r * 4 + 3] = A[r * 4] * B[3] + A[r * 4 + 1] * B[7] + A[r * 4 + 2] * B[11] + A[r * 4 + 3];
  }
  return o;
}
function trans(x, y, z) { return [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z]; }

// The rig for one hand: shared by its glove and its bare hand (only the visible one is rewritten).
export function makeHandRig(s, builds, pose = HAND_POSES.relaxed) {
  const { L, J } = builds[0];
  const skins = builds.flatMap((b) => b.skins);
  const rig = {
    side: s, layout: L, joints: J, skins, stamp: 0,
    pose: copyPose(pose), mats: null,
    set(p) {
      const q = rig.pose; let same = true;
      for (let i = 0; i < 4 && same; i++) for (let j = 0; j < 4; j++) if (Math.abs((p.f[i][j] || 0) - q.f[i][j]) > 1e-4) { same = false; break; }
      for (let j = 0; j < 3 && same; j++) if (Math.abs((p.t[j] || 0) - q.t[j]) > 1e-4) same = false;
      if (same) return rig;
      copyPose(p, rig.pose); rig.stamp++; rig.mats = null; return rig;
    },
    // Joint matrices (hand space) for the current pose.
    matrices() {
      if (rig.mats) return rig.mats;
      const p = rig.pose, M = new Array(J.length);
      M[0] = trans(0, 0, 0);
      for (let i = 0; i < 4; i++) {
        const fp = p.f[i];
        for (let j = 0; j < 3; j++) {
          const k = 1 + i * 3 + j, jt = J[k], par = J[jt.parent];
          const rel = trans(jt.pivot[0] - par.pivot[0], jt.pivot[1] - par.pivot[1], jt.pivot[2] - par.pivot[2]);
          // curl turns the segment's -y toward +z (the palm side): a negative turn about x
          const R = j === 0 ? mul(rotZ(s * (fp[3] || 0)), rotX(-fp[0])) : rotX(-fp[j]);
          M[k] = mul(mul(M[jt.parent], rel), R);
        }
      }
      { const t = p.t, j0 = J[13], j1 = J[14];
        M[13] = mul(mul(M[0], trans(...j0.pivot)), mul(rotZ(s * t[1]), rotX(-t[0])));
        M[14] = mul(mul(M[13], trans(j1.pivot[0] - j0.pivot[0], j1.pivot[1] - j0.pivot[1], j1.pivot[2] - j0.pivot[2])), rotX(-t[2])); }
      return (rig.mats = M);
    },
    // A point on the hand, hand space, current pose: 'palm' (the palm's face, middle), 'thumbTip', 'thumbBase',
    // '<finger>Tip' / '<finger>Base' (the knuckle) / '<finger>Mid' (the middle joint).
    point(name, out) {
      const M = rig.matrices(), apply = (k, x, y, z) => { const m = M[k]; return out.set(m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]); };
      if (name === 'palm') return apply(0, L.ox, -0.262, L.gz - 0.004);
      if (name === 'thumbBase') return apply(13, 0, 0, 0);
      if (name === 'thumbTip') return apply(14, 0, -L.thumb.len[1] - 0.004, 0);
      const fi = FINGERS.findIndex((f) => name.startsWith(f));
      if (fi < 0) return out.set(L.ox, -0.262, L.gz);
      const f = L.fingers[fi], k = 1 + fi * 3;
      if (name.endsWith('Base')) return apply(k, 0, 0, 0);
      if (name.endsWith('Mid')) return apply(k + 1, 0, 0, 0);
      return apply(k + 2, 0, -f.len[2] - 0.004, 0);   // Tip
    },
    // Rewrite the meshes that are showing (or all, force) for the current pose.
    update(force = false) {
      let M = null;
      for (const sk of skins) {
        if (sk.stamp === rig.stamp && !force) continue;
        if (!force) { let vis = true; for (let o = sk.mesh; o; o = o.parent) { if (!o.visible) { vis = false; break; } if (o.userData && o.userData.handRoot) break; } if (!vis) continue; }
        M = M || rig.matrices();
        const g = sk.mesh.geometry, P = g.attributes.position, N = g.attributes.normal, pa = P.array, na = N.array, r = sk.rest, nr = sk.nrest, seg = sk.seg;
        for (let v = 0, n = seg.length; v < n; v++) {
          const m = M[seg[v]], x = r[v * 3], y = r[v * 3 + 1], z = r[v * 3 + 2], nx = nr[v * 3], ny = nr[v * 3 + 1], nz = nr[v * 3 + 2];
          pa[v * 3] = m[0] * x + m[1] * y + m[2] * z + m[3]; pa[v * 3 + 1] = m[4] * x + m[5] * y + m[6] * z + m[7]; pa[v * 3 + 2] = m[8] * x + m[9] * y + m[10] * z + m[11];
          na[v * 3] = m[0] * nx + m[1] * ny + m[2] * nz; na[v * 3 + 1] = m[4] * nx + m[5] * ny + m[6] * nz; na[v * 3 + 2] = m[8] * nx + m[9] * ny + m[10] * nz;
        }
        P.needsUpdate = true; N.needsUpdate = true;
        sk.stamp = rig.stamp;
      }
      return rig;
    }
  };
  rig.update(true);
  return rig;
}
