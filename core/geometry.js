// Mesh helpers. Depends only on three. Second slice of the index.html split (CU-4).
import * as THREE from 'three';

// Bakes a handful of small meshes into one vertex-coloured mesh. Props used to be
// groups of 3–18 separate meshes each, which is thousands of draw calls once the
// whole map is visible.
const _mpMat = new THREE.Matrix4();
const _mpNrm = new THREE.Matrix3();
const _mpV = new THREE.Vector3();
export function mergeParts(parts, material, opts = {}) {
  const prepared = [];
  let total = 0;
  for (const p of parts) {
    // Plain float attributes are read straight from their arrays (through the index
    // if there is one); anything else goes through toNonIndexed() and the slow path.
    const g = p.geometry, pa = g.attributes.position, na = g.attributes.normal, ix = g.index;
    const plain = (a) => !a || (a.isBufferAttribute && !a.isInterleavedBufferAttribute && !a.normalized && a.itemSize === 3 && a.array instanceof Float32Array);
    const fast = plain(pa) && plain(na) && (!ix || !ix.isInterleavedBufferAttribute);
    const geo = fast || !ix ? g : g.toNonIndexed();
    const count = fast && ix ? ix.count : geo.attributes.position.count;
    total += count;
    prepared.push({ geo, mesh: p, fast, count });
  }
  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  let o = 0;
  for (const { geo, mesh, fast, count } of prepared) {
    mesh.updateMatrix();
    _mpMat.copy(mesh.matrix);
    _mpNrm.getNormalMatrix(_mpMat);
    const pos = geo.attributes.position;
    const nrm = geo.attributes.normal;
    const col = mesh.material.color;
    if (fast) {
      const P = pos.array, N = nrm ? nrm.array : null, I = geo.index ? geo.index.array : null;
      const e = _mpMat.elements, m = _mpNrm.elements;
      const cr = col.r, cg = col.g, cb = col.b;
      for (let i = 0; i < count; i++) {
        const w = (o + i) * 3, s = (I ? I[i] : i) * 3;
        const x = P[s], y = P[s + 1], z = P[s + 2];
        const iw = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
        positions[w] = (e[0] * x + e[4] * y + e[8] * z + e[12]) * iw;
        positions[w + 1] = (e[1] * x + e[5] * y + e[9] * z + e[13]) * iw;
        positions[w + 2] = (e[2] * x + e[6] * y + e[10] * z + e[14]) * iw;
        if (N) {
          const a = N[s], b = N[s + 1], c = N[s + 2];
          const nx = m[0] * a + m[3] * b + m[6] * c, ny = m[1] * a + m[4] * b + m[7] * c, nz = m[2] * a + m[5] * b + m[8] * c;
          const k = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
          normals[w] = nx * k; normals[w + 1] = ny * k; normals[w + 2] = nz * k;
        }
        colors[w] = cr; colors[w + 1] = cg; colors[w + 2] = cb;
      }
      o += count;
      continue;
    }
    for (let i = 0; i < pos.count; i++) {
      const w = (o + i) * 3;
      _mpV.fromBufferAttribute(pos, i).applyMatrix4(_mpMat);
      positions[w] = _mpV.x; positions[w + 1] = _mpV.y; positions[w + 2] = _mpV.z;
      if (nrm) {
        _mpV.fromBufferAttribute(nrm, i).applyMatrix3(_mpNrm).normalize();
        normals[w] = _mpV.x; normals[w + 1] = _mpV.y; normals[w + 2] = _mpV.z;
      }
      colors[w] = col.r; colors[w + 1] = col.g; colors[w + 2] = col.b;
    }
    o += pos.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  merged.computeBoundingSphere();
  const out = new THREE.Mesh(merged, material);
  out.castShadow = !!opts.castShadow;
  out.receiveShadow = !!opts.receiveShadow;
  return out;
}

export function addCast(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// === Beveled box geometry ===
// Characters used to be built from raw BoxGeometry, which under the sun reads as
// a pile of razor-edged crates. This is a compact port of three's
// RoundedBoxGeometry: a 2-segment box whose vertices get pushed onto a
// rounded shell, so every part picks up a soft highlight along its edges and
// reads as moulded gear / flesh instead of cardboard. Cached by dimensions —
// zombies are pooled and re-built a lot.
const _rboxCache = new Map();
export function rbox(w, h, d, r, seg) {
  seg = seg || 2;
  r = Math.min(r == null ? Math.min(w, h, d) * 0.18 : r, Math.min(w, h, d) * 0.49);
  const key = w.toFixed(3) + ',' + h.toFixed(3) + ',' + d.toFixed(3) + ',' + r.toFixed(3) + ',' + seg;
  const hit = _rboxCache.get(key);
  if (hit) return hit;
  const geo = new THREE.BoxGeometry(1, 1, 1, seg, seg, seg).toNonIndexed();
  const pos = geo.attributes.position.array;
  const nrm = geo.attributes.normal.array;
  const bx = w * 0.5 - r, by = h * 0.5 - r, bz = d * 0.5 - r;
  const half = 0.5 / seg;
  for (let i = 0; i < pos.length; i += 3) {
    const px = pos[i], py = pos[i + 1], pz = pos[i + 2];
    let nx = px - Math.sign(px) * half;
    let ny = py - Math.sign(py) * half;
    let nz = pz - Math.sign(pz) * half;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    pos[i] = bx * Math.sign(px) + nx * r;
    pos[i + 1] = by * Math.sign(py) + ny * r;
    pos[i + 2] = bz * Math.sign(pz) + nz * r;
    nrm[i] = nx; nrm[i + 1] = ny; nrm[i + 2] = nz;
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
  geo.computeBoundingSphere();
  geo.userData.shared = true; // cached — never disposed per-instance
  geo.userData.shared = true;   // cached: never disposed by a merge
  _rboxCache.set(key, geo);
  return geo;
}
// Convenience: a shadow-casting beveled-box mesh.
export function rmesh(w, h, d, mat, r) {
  const m = new THREE.Mesh(rbox(w, h, d, r), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Camo is laid on by position, not by each box's own 0..1 faces, so the pattern is
// the same size on a boot as on a chest: each triangle takes the two axes of the
// plane it faces most, at one repeat per CAMO_TILE metres.
const CAMO_TILE = 0.42;
export function boxProjectUV(pos, uv) {
  for (let t = 0; t + 8 < pos.length; t += 9) {
    const ax = pos[t + 3] - pos[t], ay = pos[t + 4] - pos[t + 1], az = pos[t + 5] - pos[t + 2];
    const bx = pos[t + 6] - pos[t], by = pos[t + 7] - pos[t + 1], bz = pos[t + 8] - pos[t + 2];
    const nx = Math.abs(ay * bz - az * by), ny = Math.abs(az * bx - ax * bz), nz = Math.abs(ax * by - ay * bx);
    for (let k = 0; k < 3; k++) {
      const x = pos[t + k * 3], y = pos[t + k * 3 + 1], z = pos[t + k * 3 + 2], o = (t / 3 + k) * 2;
      if (nx >= ny && nx >= nz) { uv[o] = z / CAMO_TILE; uv[o + 1] = y / CAMO_TILE; }
      else if (ny >= nz) { uv[o] = x / CAMO_TILE; uv[o + 1] = z / CAMO_TILE; }
      else { uv[o] = x / CAMO_TILE; uv[o + 1] = y / CAMO_TILE; }
    }
  }
}
