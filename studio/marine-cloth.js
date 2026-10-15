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

export function liveCloth(T, { space, bones, geo, weights, material, name = 'live-cloth', aoOwners = null, holder = null }) {
  const B = bones.length, count = geo.attributes.position.count;
  if (weights.length !== count * B) throw new Error('liveCloth: weights need ' + count * B + ' values');
  const bindInv = bones.map((b) => relMatrix(T, space, b, new T.Matrix4()).invert());
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const rest = Float32Array.from(geo.attributes.position.array), nrm = Float32Array.from(geo.attributes.normal.array);
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
  if (!holder) { holder = new T.Group(); holder.name = name + '-live'; space.add(holder); }
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
      const nx = m[0] * a + m[3] * b + m[6] * c, ny = m[1] * a + m[4] * b + m[7] * c, nz = m[2] * a + m[5] * b + m[8] * c, l = Math.hypot(nx, ny, nz) || 1;
      Q[o] = nx / l; Q[o + 1] = ny / l; Q[o + 2] = nz / l;
    }
    const pa = PA.array, na = NA.array;
    for (let i = 0; i < drawn; i++) { const o = i * 3, s = map[i] * 3; pa[o] = P[s]; pa[o + 1] = P[s + 1]; pa[o + 2] = P[s + 2]; na[o] = Q[s]; na[o + 1] = Q[s + 1]; na[o + 2] = Q[s + 2]; }
    PA.needsUpdate = true; NA.needsUpdate = true;
    if (active.boundingSphere) active.boundingSphere = null;
  }
  mesh.onBeforeRender = bend; mesh.onBeforeShadow = bend;
  mesh.userData.cloth = { bend, bones, weights, B, rest, count, drawn, moves: () => moves };
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
