// CL-198 (Jerry, 2026-10-15: "I want you to work on the blouse. The trousers. The Hats. The Gloves. I want you to make
// sure they look good and natural in all their configurations and movements").
//
// Cloth worn across a joint. The marine is a rig of groups (pelvis, thigh, shin, foot; chest, upper arm, forearm), and
// a rigid piece of cloth on each one opened a gap or drove one piece through the next whenever a joint bent: the
// trouser thigh through the seat in a run, the calf out of the thigh in a crouch, the forearm sleeve out of the upper
// sleeve as the elbow closed. Each garment here is ONE surface from end to end, built in the marine's own space with
// the rig at rest, and every vertex carries a weight for each of the joints it is worn by (linear blend skinning,
// the way studio/marine-waist.js and liveShoulder already wear the waist and the shoulder caps). Before each draw (and
// each shadow draw) the surface follows its joints; nothing is recomputed while they don't move.
//
// liveCloth(T, {space, bones, geo, weights, material, name}):
//   space    an ancestor of every bone; the cloth hangs in it (the marine's root).
//   bones    the joints, B of them. Their transforms relative to `space` at the call are the bind pose.
//   geo      BufferGeometry in `space` coordinates at the bind pose, with normals.
//   weights  Float32Array, count * B (each vertex's weights, summing to 1).
// Returns the mesh (in its own group under `space`) with userData.cloth = { bend, bones, weights }.

import { boxProjectUV } from '../core/geometry.js';

export function relMatrix(T, space, bone, out) {
  out.identity();
  for (let o = bone; o && o !== space; o = o.parent) { o.updateMatrix(); out.premultiply(o.matrix); }
  return out;
}

// under (optional, CC-344, J128): { k, gap, boxes: [{ x: [x0, x1], y: [y0, y1], z: [z0, z1], back }] } - kit worn on bone k
// (a belt's band, the pouches on it: boxes in that bone's frame) that this cloth stays under: a vertex the other joints
// carry into one is put back out under it (gap below its underside), or behind it (gap behind its back face, `back`: a
// pouch standing off the belt) when that is nearer, so the cloth folds there (a trouser leg at the hip crease as the thigh
// comes up) instead of going through it.
// gpu (CC-353, J153 note 2, the lag): drawn as a SkinnedMesh with these same weights in the vertex shader (no vertex
// is moved or uploaded on the CPU: only the B joint matrices, each frame they change), when three has SkinnedMesh and the
// garment is worn by 4 joints or fewer; with `under`, CC-344's fold stays on the CPU and is drawn by it on the frames it
// moves a vertex (gpuCloth, below). Not on the suite's fake three (no SkinnedMesh): there it bends on the CPU as before.
// userData.cloth.gpu says which; userData.cloth.posed() gives the bent positions (drawn order) on either path for anything
// that needs them on the CPU.
export function liveCloth(T, { space, bones, geo, weights, material, name = 'live-cloth', aoOwners = null, holder = null, under = null, gpu = false }) {
  const B = bones.length, count = geo.attributes.position.count;
  if (weights.length !== count * B) throw new Error('liveCloth: weights need ' + count * B + ' values');
  const bindInv = bones.map((b) => relMatrix(T, space, b, new T.Matrix4()).invert());
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const rest = Float32Array.from(geo.attributes.position.array), nrm = Float32Array.from(geo.attributes.normal.array);
  const bandM = new T.Matrix4(), bandInv = new T.Matrix4();
  // What is drawn is one triangle per three vertices, with the camo box-projected at the body's scale (core/geometry.js),
  // as the rest of the marine is; the skin moves the shared vertices once and copies them out (map).
  const idx = geo.index ? geo.index.array : Uint32Array.from({ length: count }, (_, i) => i), drawn = idx.length;
  const map = Uint32Array.from(idx), pos = new Float32Array(drawn * 3), dn = new Float32Array(drawn * 3), uv = new Float32Array(drawn * 2);
  for (let i = 0; i < drawn; i++) for (let k = 0; k < 3; k++) { pos[i * 3 + k] = rest[map[i] * 3 + k]; dn[i * 3 + k] = nrm[map[i] * 3 + k]; }
  boxProjectUV(pos, uv);
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new T.Float32BufferAttribute(dn, 3));
  out.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  // CL-218: the sphere is the rest pose's, padded for the joints' reach, and kept: nulling it on every bend made three
  // walk every vertex again each frame to sort the draw (0.6 ms a frame at night 20, AG-96's profile). The mesh is
  // never frustum-culled; the sphere only orders the draw and gates a ray.
  const SPHERE_PAD = 0.35, padded = new WeakSet();
  const padSphere = (g) => { if (padded.has(g)) return; if (!g.boundingSphere) g.computeBoundingSphere(); g.boundingSphere.radius += SPHERE_PAD; padded.add(g); };
  padSphere(out);
  if (!holder) { holder = new T.Group(); holder.name = name + '-live'; space.add(holder); }
  const useGpu = !!(gpu && B <= 4 && T.SkinnedMesh && T.Skeleton && T.Bone);
  if (useGpu) return gpuCloth(T, { space, bones, weights, material, name, aoOwners, holder, B, count, drawn, map, rest, nrm, out, bindInv, under });
  const mesh = new T.Mesh(out, material); mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  mesh.userData.liveShape = true; mesh.userData.aoOwners = aoOwners || bones.slice();
  mesh.add(new T.Object3D());   // a child: mergeRigidMeshes leaves it (and its UVs) alone
  holder.add(mesh);
  const cur = bones.map(() => new T.Matrix4()), S = new Float32Array(B * 16), last = new Float32Array(B * 16).fill(NaN);
  const P = new Float32Array(count * 3), Q = new Float32Array(count * 3), m = new Float64Array(12);
  let moves = 0;
  function bend() {
    let same = true;
    for (let k = 0; k < B; k++) {
      relMatrix(T, space, bones[k], cur[k]).multiply(bindInv[k]);
      const e = cur[k].elements;
      for (let i = 0; i < 16; i++) { const v = e[i]; if (same && !(Math.abs(v - last[k * 16 + i]) < 1e-6)) same = false; S[k * 16 + i] = v; }
    }
    if (same) return;
    // AO or a wardrobe change may have swapped in a copy of the geometry: write into what is drawn.
    const active = mesh.geometry, PA = active.attributes.position, NA = active.attributes.normal;
    if (!PA || PA.count !== drawn || !NA) return;
    last.set(S); moves++;
    for (let i = 0; i < count; i++) {
      m.fill(0);
      const wo = i * B;
      for (let k = 0; k < B; k++) {
        const w = weights[wo + k]; if (w === 0) continue;
        const s = k * 16;
        m[0] += w * S[s]; m[1] += w * S[s + 1]; m[2] += w * S[s + 2];
        m[3] += w * S[s + 4]; m[4] += w * S[s + 5]; m[5] += w * S[s + 6];
        m[6] += w * S[s + 8]; m[7] += w * S[s + 9]; m[8] += w * S[s + 10];
        m[9] += w * S[s + 12]; m[10] += w * S[s + 13]; m[11] += w * S[s + 14];
      }
      const o = i * 3, x = rest[o], y = rest[o + 1], z = rest[o + 2], a = nrm[o], b = nrm[o + 1], c = nrm[o + 2];
      P[o] = m[0] * x + m[3] * y + m[6] * z + m[9];
      P[o + 1] = m[1] * x + m[4] * y + m[7] * z + m[10];
      P[o + 2] = m[2] * x + m[5] * y + m[8] * z + m[11];
      // CL-220: Math.sqrt, not Math.hypot: V8 allocates for a three-argument hypot, and this ran per vertex per bend (131 kB a frame at night 20, GP-19940's allocation profile).
      const nx = m[0] * a + m[3] * b + m[6] * c, ny = m[1] * a + m[4] * b + m[7] * c, nz = m[2] * a + m[5] * b + m[8] * c, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      Q[o] = nx / l; Q[o + 1] = ny / l; Q[o + 2] = nz / l;
    }
    if (under) {   // CC-344: kept under the kit on bone k
      relMatrix(T, space, bones[under.k], bandM); bandInv.copy(bandM).invert();
      const f = bandInv.elements, g = bandM.elements, gap = under.gap || 0;
      for (let i = 0; i < count; i++) {
        const o = i * 3, x = P[o], y = P[o + 1], z = P[o + 2];
        let lx = f[0] * x + f[4] * y + f[8] * z + f[12], ly = f[1] * x + f[5] * y + f[9] * z + f[13], lz = f[2] * x + f[6] * y + f[10] * z + f[14], moved = false;
        for (const b of under.boxes) {
          if (lx <= b.x[0] || lx >= b.x[1] || ly <= b.y[0] - gap || ly >= b.y[1] || lz <= b.z[0] - gap || lz >= b.z[1]) continue;
          const down = ly - (b.y[0] - gap), behind = b.back ? lz - (b.z[0] - gap) : Infinity;
          if (behind < down) lz = b.z[0] - gap; else ly = b.y[0] - gap;
          moved = true;
        }
        if (moved) { P[o] = g[0] * lx + g[4] * ly + g[8] * lz + g[12]; P[o + 1] = g[1] * lx + g[5] * ly + g[9] * lz + g[13]; P[o + 2] = g[2] * lx + g[6] * ly + g[10] * lz + g[14]; }
      }
    }
    const pa = PA.array, na = NA.array;
    for (let i = 0; i < drawn; i++) { const o = i * 3, s = map[i] * 3; pa[o] = P[s]; pa[o + 1] = P[s + 1]; pa[o + 2] = P[s + 2]; na[o] = Q[s]; na[o + 1] = Q[s + 1]; na[o + 2] = Q[s + 2]; }
    PA.needsUpdate = true; NA.needsUpdate = true;
    padSphere(active);   // (a swapped-in copy gets its padded rest sphere once; it isn't thrown away each bend)
  }
  mesh.onBeforeRender = bend; mesh.onBeforeShadow = bend;
  const posed = () => { bend(); return Float32Array.from(mesh.geometry.attributes.position.array); };
  const posedNormals = () => { bend(); return Float32Array.from(mesh.geometry.attributes.normal.array); };
  mesh.userData.cloth = { bend, bones, weights, B, rest, count, drawn, moves: () => moves, gpu: false, posed, posedNormals, space, map, nrm, under, bindInv };
  return mesh;
}

// CC-353: the GPU path of liveCloth. The geometry keeps the bind pose (drawn order, as the CPU path draws it) with
// skinIndex 0..B-1 and the vertex's own weights; its skeleton's bones are stand-ins outside the scene, and before each draw
// (onBeforeRender, onBeforeShadow, and three's skeleton.update) update() writes each joint's
// move since the bind, in `space`, as relMatrix(space, bone) x bind^-1 - the very matrices the CPU path blends - so
// bindMatrix is the identity and the mesh hangs in `space` as before (holder at rest in it). An unchanged pose writes
// nothing. With `under` (CC-344's fold under the kit, the trouser legs): each frame the joints move, the shared vertices are
// bent on the CPU (no copy, no upload) only to see whether the fold moves any; on such a frame the CPU draws it exactly as
// the CPU path does (the bent, folded pose written to the geometry, the joints' matrices the identity), and on the first
// frame after, the bind pose goes back and the GPU skins again.
function gpuCloth(T, { space, bones, weights, material, name, aoOwners, holder, B, count, drawn, map, rest, nrm, out, bindInv, under }) {
  const si = new Uint16Array(drawn * 4), sw = new Float32Array(drawn * 4);
  for (let i = 0; i < drawn; i++) {
    const v = map[i];
    for (let k = 0; k < 4; k++) { si[i * 4 + k] = k < B ? k : 0; sw[i * 4 + k] = k < B ? weights[v * B + k] : 0; }
  }
  out.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4));
  out.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4));
  if (!holder) { holder = new T.Group(); holder.name = name + '-live'; space.add(holder); }
  const mesh = new T.SkinnedMesh(out, material); mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  mesh.userData.liveShape = true; mesh.userData.aoOwners = aoOwners || bones.slice();
  mesh.add(new T.Object3D());   // a child: mergeRigidMeshes leaves it (and its UVs) alone
  holder.add(mesh);
  const stand = bones.map(() => { const b = new T.Bone(); b.matrixAutoUpdate = false; b.matrixWorldAutoUpdate = false; return b; });   // outside the scene: their matrixWorld is written by update() below
  const skeleton = new T.Skeleton(stand, stand.map(() => new T.Matrix4()));
  mesh.bindMode = T.DetachedBindMode || 'detached';
  mesh.bind(skeleton, new T.Matrix4());
  // the padded rest sphere (the geometry's, from liveCloth): three would otherwise skin every vertex on the CPU once to
  // find the mesh's sphere for the draw order
  mesh.boundingSphere = out.boundingSphere.clone();
  const cur = new T.Matrix4(), BM = skeleton.boneMatrices, S = new Float32Array(B * 16), last = new Float32Array(B * 16).fill(NaN);
  const P = new Float32Array(count * 3), Q = new Float32Array(count * 3), m = new Float64Array(12);
  const bandM = new T.Matrix4(), bandInv = new T.Matrix4(), ID = new T.Matrix4().elements;
  const restDrawn = under ? Float32Array.from(out.attributes.position.array) : null, nrmDrawn = under ? Float32Array.from(out.attributes.normal.array) : null;
  let moves = 0, cpuFrames = 0, onCpu = false;
  // the CPU path's own bend of the shared vertices with the matrices M (and their normals when asked)
  function skinShared(M, normals) {
    for (let i = 0; i < count; i++) {
      m.fill(0);
      const wo = i * B;
      for (let k = 0; k < B; k++) {
        const w = weights[wo + k]; if (w === 0) continue;
        const s = k * 16;
        m[0] += w * M[s]; m[1] += w * M[s + 1]; m[2] += w * M[s + 2];
        m[3] += w * M[s + 4]; m[4] += w * M[s + 5]; m[5] += w * M[s + 6];
        m[6] += w * M[s + 8]; m[7] += w * M[s + 9]; m[8] += w * M[s + 10];
        m[9] += w * M[s + 12]; m[10] += w * M[s + 13]; m[11] += w * M[s + 14];
      }
      const o = i * 3, x = rest[o], y = rest[o + 1], z = rest[o + 2];
      P[o] = m[0] * x + m[3] * y + m[6] * z + m[9];
      P[o + 1] = m[1] * x + m[4] * y + m[7] * z + m[10];
      P[o + 2] = m[2] * x + m[5] * y + m[8] * z + m[11];
      if (normals) {
        const a = nrm[o], b = nrm[o + 1], c = nrm[o + 2];
        const nx = m[0] * a + m[3] * b + m[6] * c, ny = m[1] * a + m[4] * b + m[7] * c, nz = m[2] * a + m[5] * b + m[8] * c, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        Q[o] = nx / l; Q[o + 1] = ny / l; Q[o + 2] = nz / l;
      }
    }
  }
  // CC-344's fold, as the CPU path does it, on P; returns how many vertices it moved
  function fold() {
    relMatrix(T, space, bones[under.k], bandM); bandInv.copy(bandM).invert();
    const f = bandInv.elements, g = bandM.elements, gap = under.gap || 0;
    let n = 0;
    for (let i = 0; i < count; i++) {
      const o = i * 3, x = P[o], y = P[o + 1], z = P[o + 2];
      let lx = f[0] * x + f[4] * y + f[8] * z + f[12], ly = f[1] * x + f[5] * y + f[9] * z + f[13], lz = f[2] * x + f[6] * y + f[10] * z + f[14], moved = false;
      for (const b of under.boxes) {
        if (lx <= b.x[0] || lx >= b.x[1] || ly <= b.y[0] - gap || ly >= b.y[1] || lz <= b.z[0] - gap || lz >= b.z[1]) continue;
        const down = ly - (b.y[0] - gap), behind = b.back ? lz - (b.z[0] - gap) : Infinity;
        if (behind < down) lz = b.z[0] - gap; else ly = b.y[0] - gap;
        moved = true;
      }
      if (moved) { n++; P[o] = g[0] * lx + g[4] * ly + g[8] * lz + g[12]; P[o + 1] = g[1] * lx + g[5] * ly + g[9] * lz + g[13]; P[o + 2] = g[2] * lx + g[6] * ly + g[10] * lz + g[14]; }
    }
    return n;
  }
  function setJoints(M) {
    BM.set(M);
    for (let k = 0; k < B; k++) stand[k].matrixWorld.fromArray(M, k * 16);   // three's CPU side (getVertexPosition, raycast) reads the bones' matrixWorld
    if (skeleton.boneTexture) skeleton.boneTexture.needsUpdate = true;
  }
  const IDS = new Float32Array(B * 16); for (let k = 0; k < B; k++) IDS.set(ID, k * 16);
  function update() {   // the CPU path's own test: any element moved by 1e-6 or more
    let same = true;
    for (let k = 0; k < B; k++) {
      relMatrix(T, space, bones[k], cur).multiply(bindInv[k]);
      const e = cur.elements;
      for (let i = 0; i < 16; i++) { const v = e[i]; if (same && !(Math.abs(v - last[k * 16 + i]) < 1e-6)) same = false; S[k * 16 + i] = v; }
    }
    if (same) return;
    last.set(S); moves++;
    if (under) {
      skinShared(S, false);
      const active = mesh.geometry, PA = active.attributes.position, NA = active.attributes.normal;
      if (fold() > 0 && PA && NA && PA.count === drawn) {   // the fold bites: this frame is drawn as the CPU path draws it
        skinShared(S, true); fold();
        const pa = PA.array, na = NA.array;
        for (let i = 0; i < drawn; i++) { const o = i * 3, s = map[i] * 3; pa[o] = P[s]; pa[o + 1] = P[s + 1]; pa[o + 2] = P[s + 2]; na[o] = Q[s]; na[o + 1] = Q[s + 1]; na[o + 2] = Q[s + 2]; }
        PA.needsUpdate = true; NA.needsUpdate = true;
        if (!onCpu) setJoints(IDS);
        onCpu = true; cpuFrames++;
        return;
      }
      if (onCpu && PA && NA && PA.count === drawn) { PA.array.set(restDrawn); NA.array.set(nrmDrawn); PA.needsUpdate = true; NA.needsUpdate = true; }
      onCpu = false;
    }
    setJoints(S);
  }
  // Run before each draw and each shadow draw, as the CPU path's bend is (three uploads a draw's changed attributes before it
  // updates its nodes, so geometry written from skeleton.update would reach the GPU one draw late: on the frames the fold starts
  // or stops biting, one draw with the new matrices on the old vertices); skeleton.update then finds the pose unchanged.
  mesh.onBeforeRender = update; mesh.onBeforeShadow = update; skeleton.update = update;
  update();
  // the bent positions on the CPU (drawn order), for tests and tools; never needed to draw
  const posed = () => {
    update();
    skinShared(last, false); if (under) fold();
    const o = new Float32Array(drawn * 3);
    for (let i = 0; i < drawn; i++) { const s = map[i] * 3; o[i * 3] = P[s]; o[i * 3 + 1] = P[s + 1]; o[i * 3 + 2] = P[s + 2]; }
    return o;
  };
  const posedNormals = () => {   // and their normals (the fold moves no normal, as on the CPU path)
    update(); skinShared(last, true);
    const o = new Float32Array(drawn * 3);
    for (let i = 0; i < drawn; i++) { const s = map[i] * 3; o[i * 3] = Q[s]; o[i * 3 + 1] = Q[s + 1]; o[i * 3 + 2] = Q[s + 2]; }
    return o;
  };
  // (space, map, nrm, under, bindInv: what it was built from, so a probe can build the CPU path's twin of it beside it, CC-353's proof)
  mesh.userData.cloth = { bend: update, bones, weights, B, rest, count, drawn, moves: () => moves, cpuFrames: () => cpuFrames, gpu: true, posed, posedNormals, skeleton, space, map, nrm, under, bindInv };
  return mesh;
}

// Several pieces (each indexed, in `space`) as one geometry, so one garment and its seams bend as one.
export function joinGeos(T, list) {
  let n = 0; const P = [], N = [], I = [];
  for (const g of list) {
    const p = g.attributes.position, nn = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(nn.getX(i), nn.getY(i), nn.getZ(i)); }
    if (g.index) for (const v of g.index.array) I.push(v + n); else for (let i = 0; i < p.count; i++) I.push(i + n);
    n += p.count;
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
  geo.setIndex(I); return geo;
}

// A tube lofted through rings, each ring given by a centre and two axes in `space` (a frame), so the rings of one
// garment can come from different joints (the upper arm's and the forearm's) and still make one surface.
// ring = { c: [x,y,z], ax: [x,y,z] (unit, the ring's "rx" direction), az: [x,y,z] (unit, the "rz" direction),
//          rx, rz, e (squareness: 1 round, under 1 boxier), t (any number the caller wants back per vertex) }
// Returns { geo, ringOf (Int16Array: each vertex's ring), angleOf (Float32Array: each vertex's angle, 0 at +az) }.
export function loftRings(T, rings, n = 24, { caps = null, uvScale = 3 } = {}) {
  const p = [], uv = [], ix = [], ringOf = [], angleOf = [];
  for (let r = 0; r < rings.length; r++) {
    const R = rings[r], e = R.e == null ? .8 : R.e;
    for (let j = 0; j <= n; j++) {
      const a = j / n * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
      const u = Math.sign(s) * Math.abs(s) ** e * R.rx, w = Math.sign(c) * Math.abs(c) ** e * R.rz;
      p.push(R.c[0] + R.ax[0] * u + R.az[0] * w, R.c[1] + R.ax[1] * u + R.az[1] * w, R.c[2] + R.ax[2] * u + R.az[2] * w);
      uv.push(j / n, R.c[1] * uvScale); ringOf.push(r); angleOf.push(a);
    }
  }
  for (let r = 0; r < rings.length - 1; r++) for (let j = 0; j < n; j++) { const a = r * (n + 1) + j, b = a + n + 1; ix.push(a, a + 1, b, a + 1, b + 1, b); }
  const capRow = (row, reverse) => {
    const R = rings[row], ci = p.length / 3; p.push(...R.c); uv.push(.5, .5); ringOf.push(row); angleOf.push(0);
    for (let j = 0; j < n; j++) { const a = row * (n + 1) + j; ix.push(ci, ...(reverse ? [a + 1, a] : [a, a + 1])); }
  };
  if (caps === 'first' || caps === 'both') capRow(0, true);
  if (caps === 'last' || caps === 'both') capRow(rings.length - 1, false);
  // Faces out whichever way the rings run (down a limb or up it): test one quad against its ring's centre.
  {
    const q = Math.min(1, rings.length - 2), R = rings[q], a = q * (n + 1) + 1, b = a + 1, c = a + n + 1;
    const ux = p[b * 3] - p[a * 3], uy = p[b * 3 + 1] - p[a * 3 + 1], uz = p[b * 3 + 2] - p[a * 3 + 2];
    const vx = p[c * 3] - p[a * 3], vy = p[c * 3 + 1] - p[a * 3 + 1], vz = p[c * 3 + 2] - p[a * 3 + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;   // the normal of (a, a+1, b) is -(u x v)... see below
    const ox = p[a * 3] - R.c[0], oy = p[a * 3 + 1] - R.c[1], oz = p[a * 3 + 2] - R.c[2];
    // triangle (a, a+1, a+n+1) has normal (a+1 - a) x (a+n+1 - a) = u x v
    if (nx * ox + ny * oy + nz * oz < 0) for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(p, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(ix); geo.computeVertexNormals();
  // One normal on the seam column (its first and last vertex sit on one spot).
  const N = geo.attributes.normal;
  for (let r = 0; r < rings.length; r++) {
    const a = r * (n + 1), b = a + n, x = N.getX(a) + N.getX(b), y = N.getY(a) + N.getY(b), z = N.getZ(a) + N.getZ(b), l = Math.hypot(x, y, z) || 1;
    N.setXYZ(a, x / l, y / l, z / l); N.setXYZ(b, x / l, y / l, z / l);
  }
  return { geo, ringOf: Int16Array.from(ringOf), angleOf: Float32Array.from(angleOf) };
}

// Rings authored in a joint's own space ([y, rx, rz, cx, cz] down its -y, as the body's form() takes them) put into
// `space` at the bind pose: the frame's axes are the joint's x and z.
export function ringsIn(T, space, bone, list, extra = {}) {
  const M = relMatrix(T, space, bone, new T.Matrix4()), v = new T.Vector3(), X = new T.Vector3(), Z = new T.Vector3();
  X.set(1, 0, 0).transformDirection(M); Z.set(0, 0, 1).transformDirection(M);
  return list.map(([y, rx, rz, cx = 0, cz = 0, e]) => {
    v.set(cx, y, cz).applyMatrix4(M);
    return { c: [v.x, v.y, v.z], ax: [X.x, X.y, X.z], az: [Z.x, Z.y, Z.z], rx, rz, e: e == null ? extra.e : e, y };
  });
}

export const smooth01 = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Weights for a geometry in `space`: fn(locals) gets each vertex's position in every bone's own frame (bind pose),
// as an array of [x, y, z], and returns that vertex's weights (one per bone; they are normalised here).
export function weigh(T, space, bones, geo, fn) {
  const inv = bones.map((b) => relMatrix(T, space, b, new T.Matrix4()).invert()), P = geo.attributes.position, B = bones.length;
  const out = new Float32Array(P.count * B), v = new T.Vector3(), loc = bones.map(() => [0, 0, 0]);
  for (let i = 0; i < P.count; i++) {
    for (let k = 0; k < B; k++) { v.fromBufferAttribute(P, i).applyMatrix4(inv[k]); loc[k][0] = v.x; loc[k][1] = v.y; loc[k][2] = v.z; }
    const w = fn(loc); let sum = 0;
    for (let k = 0; k < B; k++) sum += Math.max(0, w[k] || 0);
    for (let k = 0; k < B; k++) out[i * B + k] = sum > 0 ? Math.max(0, w[k] || 0) / sum : (k === 0 ? 1 : 0);
  }
  return out;
}

// A piece built in a bone's own space (any three geometry), moved into `space` at the bind pose, with normals.
export function geoIn(T, space, bone, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const M = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(sx, sy, sz));
  M.premultiply(relMatrix(T, space, bone, new T.Matrix4()));
  const g = geo.index ? geo : geo;   // indexed or not, joinGeos takes both
  if (!g.attributes.normal) g.computeVertexNormals();
  g.applyMatrix4(M); return g;
}

// CC-364 (D-216 lever 3, Director 09:15Z 21 Nov): the live cloth's GPU pieces that share one material drawn as ONE
// SkinnedMesh, the same picture with fewer draws (review/CC-364: the prototype's native A/B, ChatGPT 2: 0 pixels changed).
// The merged mesh's skeleton is the pieces' joints side by side (stand-ins, as gpuCloth's): before each draw every shown
// piece runs its own update() (the very matrices it would have drawn with) and the merged mesh takes them, carried from
// the piece's place into its own (C = Wmerged^-1 * Wpiece). Same vertices, same weights, same material.
//  - The pieces stay where they are, their `visible` as the game sets it (the wardrobe shows and hides their holders);
//    they are only taken off the render layers (layers.mask 0), as the rig skin does (studio/marine-skin.js).
//  - Only the pieces drawn now are in its geometry: before each draw it checks every piece (shown or not, its material,
//    its geometry and the versions of its attributes) and builds the geometry again when one changed (the sleeves rolled,
//    a new AO bake); the skeleton keeps its size (padded), so the shader stays the same.
//  - The arms' pieces (live-sleeve, live-sleeve-rolled, live-bare-arm) only merge among themselves and the merged mesh
//    keeps their name: the first-person view leaves exactly those names out of the eye's pass (game/viewmodel.js ARM_CLOTH).
//  - Not merged: a piece with `under` (the trouser legs: their fold under the kit is drawn on the CPU), one alone in its set.
//  - Fewer than two of a set shown (the shorts' pieces in long trousers): it parks, off the render layers, and the pieces
//    draw themselves as before; the first draw of a piece while two or more are shown wakes it.
//  - A piece given another material than the merged mesh's, or pieces whose attributes no longer match, are handed back:
//    they draw themselves again from then on (the merged mesh leaves the tree).
//  - The warm-up's compiles (index.html compileInSlices: renderer.compileAsync, which shows and hides drawables by
//    `visible`) are sat out: nothing is checked or changed during them.
//  - Its userData.cloth gives posed()/posedNormals() of what it draws, as a piece's does (tools/tests/tcc344.js reads them).
// armLiveMerge(T, root, extra) does it on the figure's first real draw (after makeMarine's AO bake and rig skin), and runs
// `extra` (the face's merge, ui/marine-face.js) then too. On three without SkinnedMesh (the suite's fake three) nothing
// changes. ?livemerge=0 turns it off. TT: getMarine().userData.liveMerge.info().
const MERGE_ARM = { 'live-sleeve': 'live-sleeve', 'live-sleeve-rolled': 'live-sleeve', 'live-bare-arm': 'live-bare-arm' };
const MERGE_PADS = [8, 16, 32];
const mergeHide = (o) => { if (o.userData.liveMergeMask == null) o.userData.liveMergeMask = o.layers.mask; o.layers.mask = 0; };
const mergeUnhide = (o) => { if (o.userData.liveMergeMask != null) { o.layers.mask = o.userData.liveMergeMask; delete o.userData.liveMergeMask; } };
const later = (fn) => { if (typeof setTimeout === 'function') setTimeout(fn, 3000); };   // a geometry swapped out is disposed once no draw can still hold it
const ATTRS = ['position', 'normal', 'uv', 'color', 'skinIndex', 'skinWeight'];
// renderer.compileAsync (index.html's warm-up, compileInSlices) runs onBeforeRender too, while it shows and hides whole
// slices of the scene: nothing here looks at the pieces or changes anything during it.
export function compilingNow(r) { return !!(r && (r._compilationPromises != null || r._createObjectPipeline && r._handleObjectFunction === r._createObjectPipeline)); }

export function mergeLiveCloth(T, root) {
  if (!T || !T.SkinnedMesh || !T.Skeleton || !T.Bone || !root) return null;
  if (root.userData.liveMerge) return root.userData.liveMerge;
  const sets = new Map();
  root.traverse((o) => {
    const c = o.userData && o.userData.cloth;
    if (!o.isSkinnedMesh || !c || !c.gpu || c.under || !c.skeleton || o.userData.liveMerged || !o.material || Array.isArray(o.material)) return;
    const cls = MERGE_ARM[o.name] || 'live-merge', key = cls + '|' + o.material.uuid;
    let s = sets.get(key); if (!s) sets.set(key, s = { cls, mat: o.material, list: [] });
    s.list.push(o);
  });
  const merges = [];
  for (const { cls, mat, list } of sets.values()) {
    if (list.length < 2) continue;
    const nb = list.reduce((n, p) => n + p.skeleton.bones.length, 0), pad = MERGE_PADS.find((n) => n >= nb);
    if (!pad) continue;
    merges.push(makeLiveMerge(T, root, list, mat, cls, pad));
  }
  const info = () => merges.map((m) => m.info());
  return (root.userData.liveMerge = { merges, info });
}

function makeLiveMerge(T, root, list, mat, name, pad) {
  const n = list.length, base = new Int32Array(n), shown = new Uint8Array(n);
  { let b = 0; for (let i = 0; i < n; i++) { base[i] = b; b += list[i].skeleton.bones.length; } }
  const bones = []; for (let k = 0; k < pad; k++) { const b = new T.Bone(); b.matrixAutoUpdate = false; b.matrixWorldAutoUpdate = false; bones.push(b); }
  const skeleton = new T.Skeleton(bones, bones.map(() => new T.Matrix4()));
  // what each piece was when the geometry was built: its geometry, its material and its attributes' versions
  const seenGeo = new Array(n), seenMat = new Array(n), seenVer = new Float64Array(n * ATTRS.length);
  const ver = (g, a) => { const x = g && g.attributes[a]; return x ? x.version + 1 : 0; };
  const isShown = (p) => {
    if (!p.parent || !p.visible) return false;
    for (let q = p.parent; q && q !== root; q = q.parent) if (!q.visible) return false;
    return (p.userData.liveMergeMask != null ? p.userData.liveMergeMask : p.layers.mask) !== 0;
  };
  // active: the merged mesh draws the shown pieces. parked (fewer than two shown: nothing to save): the pieces draw
  // themselves as before and the merged mesh is off the render layers; the first draw of a piece while two or more are
  // shown wakes it. (Not `visible`: the warm-up's compileInSlices shows and hides drawables by it, and puts it back true.)
  let mesh = null, dead = false, active = false, builds = 0, updates = 0, parks = 0, drawn = [];
  const whys = {};
  const why = (w) => { whys[w] = (whys[w] || 0) + 1; return true; };
  const shownCount = () => { let c = 0; for (const p of list) if (isShown(p)) c++; return c; };
  function build() {   // the shown pieces as one geometry; null: hand back
    drawn = [];
    for (let i = 0; i < n; i++) {
      const p = list[i];
      shown[i] = isShown(p) ? 1 : 0;
      seenGeo[i] = p.geometry; seenMat[i] = p.material;
      for (let a = 0; a < ATTRS.length; a++) seenVer[i * ATTRS.length + a] = ver(p.geometry, ATTRS[a]);
      if (shown[i]) drawn.push(i);
    }
    if (list.some((p) => p.material !== mesh.material)) return null;   // a piece given another material than the merged mesh's: hand back (a fade that swaps them all, game/training-camera-collision.js, swaps the merged mesh's too)
    const ps = drawn.map((i) => list[i]);
    if (ps.length < 2) return undefined;   // fewer than two shown: park
    const names = Object.keys(ps[0].geometry.attributes).sort();
    for (const p of ps) { const nm = Object.keys(p.geometry.attributes).sort(); if (nm.join() !== names.join()) return null; }   // attributes no longer alike: hand back
    const geo = new T.BufferGeometry();
    let verts = 0, idx = 0; const indexed = ps.some((p) => p.geometry.index);
    for (const p of ps) { const c = p.geometry.attributes.position.count; verts += c; idx += p.geometry.index ? p.geometry.index.count : c; }
    for (const nm of names) {
      const a0 = ps[0].geometry.attributes[nm];
      if (a0.isInterleavedBufferAttribute) return null;
      const out = new a0.array.constructor(verts * a0.itemSize);
      let at = 0;
      for (let j = 0; j < ps.length; j++) {
        const a = ps[j].geometry.attributes[nm];
        if (a.itemSize !== a0.itemSize || a.array.constructor !== a0.array.constructor || a.normalized !== a0.normalized) return null;
        if (nm === 'skinIndex') { const b = base[drawn[j]]; for (let i = 0; i < a.array.length; i++) out[at + i] = a.array[i] + b; }
        else out.set(a.array, at);
        at += a.array.length;
      }
      geo.setAttribute(nm, new T.BufferAttribute(out, a0.itemSize, a0.normalized));
    }
    if (indexed) {
      const index = new Uint32Array(idx); let at = 0, off = 0;
      for (const p of ps) { const g = p.geometry, c = g.attributes.position.count; if (g.index) { const s = g.index.array; for (let i = 0; i < s.length; i++) index[at + i] = s[i] + off; at += s.length; } else { for (let i = 0; i < c; i++) index[at + i] = off + i; at += c; } off += c; }
      geo.setIndex(new T.BufferAttribute(index, 1));
    }
    // the pieces' padded rest spheres, joined (liveCloth keeps each: never culled, the sphere only orders the draw)
    const sph = new T.Sphere(), tmp = new T.Sphere(), M = new T.Matrix4();
    root.updateMatrixWorld(true);
    const inv = new T.Matrix4().copy(root.matrixWorld).invert();
    let first = true;
    for (const p of ps) { const b = p.boundingSphere || p.geometry.boundingSphere; if (!b) continue; tmp.copy(b).applyMatrix4(M.multiplyMatrices(inv, p.matrixWorld)); if (first) { sph.copy(tmp); first = false; } else sph.union(tmp); }
    if (first) sph.set(new T.Vector3(0, 0.9, 0), 1.6);
    geo.boundingSphere = sph;
    builds++;
    return geo;
  }
  function handBack() {
    dead = true; active = false;
    for (const p of list) { mergeUnhide(p); delete p.userData.liveMerged; }
    if (mesh) { mesh.layers.mask = 0; if (mesh.parent) mesh.parent.remove(mesh); const g = mesh.geometry; later(() => g.dispose()); }
  }
  function park() {
    active = false; parks++;
    mesh.layers.mask = 0;
    for (const p of list) mergeUnhide(p);
  }
  // A new geometry for the shown pieces, swapped in (three takes a mesh's new geometry at its next draw).
  function activate() {
    const geo = build();
    if (geo === undefined) { park(); return false; }
    if (!geo) { handBack(); return false; }
    const old = mesh.geometry; mesh.geometry = geo; mesh.boundingSphere = geo.boundingSphere.clone(); later(() => old.dispose());
    for (const p of list) mergeHide(p);
    mesh.layers.mask = MASK; active = true;
    return true;
  }
  function wake() { if (!dead && !active && shownCount() >= 2) activate(); }
  function changed() {
    for (let i = 0; i < n; i++) {
      const p = list[i];
      if (p.layers.mask !== 0) { p.userData.liveMergeMask = p.layers.mask; p.layers.mask = 0; return why('layers ' + p.name); }   // something put it back on a layer: it stays off, and is looked at again
      if (shown[i] !== (isShown(p) ? 1 : 0)) return why('shown ' + p.name);
      if (seenGeo[i] !== p.geometry) return why('geometry ' + p.name);
      if (seenMat[i] !== p.material) return why('material ' + p.name);
      for (let a = 0; a < ATTRS.length; a++) if (seenVer[i * ATTRS.length + a] !== ver(p.geometry, ATTRS[a])) return why(ATTRS[a] + ' ' + p.name);
    }
    return false;
  }
  const BM = skeleton.boneMatrices, Wi = new T.Matrix4(), C = new T.Matrix4(), S = new T.Matrix4();
  function update(r) {
    if (dead || !active || compilingNow(r)) return;
    if (changed()) {
      if (shownCount() < 2) { park(); return; }
      if (!activate()) return;
    }
    mesh.updateWorldMatrix(true, false);
    Wi.copy(mesh.matrixWorld).invert();
    for (const i of drawn) {
      const p = list[i];
      p.userData.cloth.bend();   // the piece's own update(): its joints' matrices in its own place
      p.updateWorldMatrix(true, false);
      C.multiplyMatrices(Wi, p.matrixWorld);
      const pb = p.skeleton.boneMatrices, nb = p.skeleton.bones.length;
      for (let k = 0, at = base[i]; k < nb; k++, at++) {
        S.fromArray(pb, k * 16).premultiply(C);
        S.toArray(BM, at * 16);
        bones[at].matrixWorld.copy(S);   // three's CPU side (getVertexPosition, raycast) reads the bones' matrixWorld
      }
    }
    if (skeleton.boneTexture) skeleton.boneTexture.needsUpdate = true;
    updates++;
  }
  const MASK = list[0].userData.liveMergeMask != null ? list[0].userData.liveMergeMask : list[0].layers.mask || 1;   // the pieces' own layers
  mesh = new T.SkinnedMesh(new T.BufferGeometry(), mat);
  mesh.name = name; mesh.frustumCulled = false; mesh.layers.mask = 0;
  mesh.castShadow = list.some((p) => p.castShadow); mesh.receiveShadow = list.some((p) => p.receiveShadow);
  // liveShape: the shadow proxy (CL-140) and the rig skin leave it alone, as they do the pieces
  mesh.userData.liveShape = true; mesh.userData.noRigSkin = true; mesh.userData.liveMergeOf = list;
  mesh.userData.aoOwners = [...new Set(list.flatMap((p) => p.userData.aoOwners || []))];
  mesh.add(new T.Object3D());   // a child: mergeRigidMeshes leaves it alone
  mesh.bindMode = T.DetachedBindMode || 'detached';
  root.add(mesh);
  mesh.bind(skeleton, new T.Matrix4());
  mesh.onBeforeRender = update; mesh.onBeforeShadow = update; skeleton.update = update;
  // what is drawn, on the CPU (as a piece's userData.cloth.posed gives it), for tests and tools that read surfaces: the shown
  // pieces' own bent positions, in the merged geometry's order (the pieces and the merged mesh all hang in `root`'s space)
  const cat = (k) => { update(); if (!active) return new Float32Array(0); const parts = drawn.map((i) => list[i].userData.cloth[k]()); const o = new Float32Array(parts.reduce((a, b) => a + b.length, 0)); let at = 0; for (const q of parts) { o.set(q, at); at += q.length; } return o; };
  mesh.userData.cloth = { gpu: true, merged: true, bend: () => update(), posed: () => cat('posed'), posedNormals: () => cat('posedNormals'), pieces: list };
  // a piece drawn while parked looks whether it should wake the merge
  for (const p of list) {
    p.userData.liveMerged = mesh;
    const r = p.onBeforeRender, sh = p.onBeforeShadow;
    p.onBeforeRender = function (...a) { if (!active && !dead && !compilingNow(a[0])) wake(); return r.apply(this, a); };
    p.onBeforeShadow = function (...a) { if (!active && !dead && !compilingNow(a[0])) wake(); return sh.apply(this, a); };
  }
  if (shownCount() >= 2) { if (activate()) update(); } else parks++;
  const info = () => ({ name, pieces: list.map((p) => p.name), active, drawn: active ? drawn.map((i) => list[i].name) : [], verts: active ? mesh.geometry.attributes.position.count : 0, bones: base[n - 1] + list[n - 1].skeleton.bones.length, pad, builds, parks, updates, whys: { ...whys }, handedBack: dead });
  return { mesh, list, info, handBack };
}

// On the figure's first real draw (any of its live cloth's, main pass or shadow; not a warm-up compile), once: the merges
// above and `extra`.
export function armLiveMerge(T, root, extra = []) {
  if (!T || !T.SkinnedMesh || !root || root.userData.liveMergeArmed) return;
  if (typeof location !== 'undefined' && location.search && new URLSearchParams(location.search).get('livemerge') === '0') return;
  root.userData.liveMergeArmed = true;
  const hooked = [];
  let fired = false;
  const fire = () => {
    if (fired) return; fired = true;
    for (const h of hooked) { h.o.onBeforeRender = h.r; h.o.onBeforeShadow = h.s; }
    try { mergeLiveCloth(T, root); } catch (e) { if (typeof console !== 'undefined') console.warn('CC-364 live cloth merge failed', e); }
    for (const fn of extra) { try { fn(); } catch (e) { if (typeof console !== 'undefined') console.warn('CC-364 merge failed', e); } }
  };
  root.traverse((o) => {
    const c = o.userData && o.userData.cloth;
    if (!o.isSkinnedMesh || !c || !c.gpu) return;
    const r = o.onBeforeRender, s = o.onBeforeShadow;
    hooked.push({ o, r, s });
    o.onBeforeRender = function (...a) { if (!compilingNow(a[0])) fire(); return r.apply(this, a); };
    o.onBeforeShadow = function (...a) { if (!compilingNow(a[0])) fire(); return s.apply(this, a); };
  });
}
