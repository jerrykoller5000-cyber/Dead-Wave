// world/hollows-props.js — AG-416: Sculpted cave architecture, hero interactive loot props,
// organic pulsing nests, veined husks, megalithic rune doors, feathered daylight shafts,
// tactical per-warren interactives, and bespoke Deep set pieces for all five Hollows warrens.
//
// Pure ES module depending only on the passed THREE namespace (100% Node/fakethree & WebGPU safe).
// Preserves all logical collision envelopes (t325 >= 4.4 m clear width, 0 doorway-band solids).

import { buildCompactStoneGeometry, buildMenhirGeometry, projectStoneBoxUV, fbm3 } from './rock-geometry.js';
import { getHollowPBRPack } from './hollows-pbr.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Per-material static geometry batcher (1 draw call per material!)
// ---------------------------------------------------------------------------
export class SculptBatch {
  constructor(T, namePrefix = 'hollow') {
    this.T = T;
    this.namePrefix = namePrefix;
    this.buckets = new Map();
    this._m4 = new T.Matrix4();
    this._q = new T.Quaternion();
    this._e = new T.Euler();
    this._v = new T.Vector3();
    this._s = new T.Vector3(1, 1, 1);
    this._up = new T.Vector3(0, 1, 0);
  }

  _bucket(mat, tile = 1.0) {
    let b = this.buckets.get(mat);
    if (!b) {
      b = { mat, tile, pos: [], nrm: [], uv: [] };
      this.buckets.set(mat, b);
    }
    return b;
  }

  pushGeo(geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, quat = null, tile = 1.0, keepUV = false } = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (quat) {
      this._m4.compose(this._v.set(x, y, z), quat, this._s.set(sx, sy, sz));
    } else {
      this._e.set(rx, ry, rz, 'YXZ');
      this._q.setFromEuler(this._e);
      this._m4.compose(this._v.set(x, y, z), this._q, this._s.set(sx, sy, sz));
    }
    g.applyMatrix4(this._m4);
    g.computeVertexNormals();
    if (!keepUV || !g.attributes.uv) projectStoneBoxUV(g, tile);
    const b = this._bucket(mat, tile);
    const P = g.attributes.position.array;
    const N = g.attributes.normal.array;
    const U = g.attributes.uv.array;
    for (let i = 0; i < P.length; i++) b.pos.push(P[i]);
    for (let i = 0; i < N.length; i++) b.nrm.push(N[i]);
    for (let i = 0; i < U.length; i++) b.uv.push(U[i]);
    g.dispose();
  }

  box(w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0, tile = 1.0) {
    const g = new this.T.BoxGeometry(w, h, d);
    this.pushGeo(g, mat, { x, y, z, rx, ry, rz, tile });
    g.dispose();
  }

  cyl(rt, rb, h, segs, mat, x, y, z, rx = 0, ry = 0, rz = 0, tile = 1.0) {
    const g = new this.T.CylinderGeometry(rt, rb, h, segs);
    this.pushGeo(g, mat, { x, y, z, rx, ry, rz, tile });
    g.dispose();
  }

  torus(r, tube, rSegs, tSegs, arc, mat, x, y, z, rx = 0, ry = 0, rz = 0, tile = 0.6) {
    const g = new this.T.TorusGeometry(r, tube, rSegs, tSegs, arc);
    this.pushGeo(g, mat, { x, y, z, rx, ry, rz, tile });
    g.dispose();
  }

  beam(a, b, w, d, mat, tile = 1.1) {
    const T = this.T;
    const va = new T.Vector3(a[0], a[1], a[2]);
    const vb = new T.Vector3(b[0], b[1], b[2]);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    if (len < 1e-4) return;
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const q = new T.Quaternion().setFromUnitVectors(this._up, dir.normalize());
    const g = new T.BoxGeometry(w, len, d);
    this.pushGeo(g, mat, { x: mid.x, y: mid.y, z: mid.z, quat: q, tile });
    g.dispose();
  }

  rod(a, b, rt, rb, segs, mat, tile = 0.8) {
    const T = this.T;
    const va = new T.Vector3(a[0], a[1], a[2]);
    const vb = new T.Vector3(b[0], b[1], b[2]);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    if (len < 1e-4) return;
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const q = new T.Quaternion().setFromUnitVectors(this._up, dir.normalize());
    const g = new T.CylinderGeometry(rt, rb, len, segs);
    this.pushGeo(g, mat, { x: mid.x, y: mid.y, z: mid.z, quat: q, tile });
    g.dispose();
  }

  tube(pts, segs, radiusFn, mat, tile = 0.9) {
    if (!pts || pts.length < 2) return;
    const b = this._bucket(mat, tile);
    const n = pts.length;
    const rings = [];
    let prevT = null;
    let prevU = [1, 0, 0];
    const dists = [0];
    for (let i = 1; i < n; i++) {
      dists.push(dists[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
    }
    for (let i = 0; i < n; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(n - 1, i + 1)];
      let tx = p1[0] - p0[0], ty = p1[1] - p0[1], tz = p1[2] - p0[2];
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl; ty /= tl; tz /= tl;
      let ux, uy, uz;
      if (!prevT) {
        const ax = Math.abs(ty) < 0.85 ? [0, 1, 0] : [1, 0, 0];
        ux = ty * ax[2] - tz * ax[1];
        uy = tz * ax[0] - tx * ax[2];
        uz = tx * ax[1] - ty * ax[0];
      } else {
        const dot = prevU[0] * tx + prevU[1] * ty + prevU[2] * tz;
        ux = prevU[0] - tx * dot;
        uy = prevU[1] - ty * dot;
        uz = prevU[2] - tz * dot;
      }
      const ul = Math.hypot(ux, uy, uz) || 1;
      ux /= ul; uy /= ul; uz /= ul;
      const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
      prevT = [tx, ty, tz];
      prevU = [ux, uy, uz];
      const r = typeof radiusFn === 'function' ? radiusFn(i / (n - 1), i) : radiusFn;
      const ring = [];
      for (let k = 0; k <= segs; k++) {
        const a = (k / segs) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const nx = ux * ca + vx * sa, ny = uy * ca + vy * sa, nz = uz * ca + vz * sa;
        ring.push({
          p: [pts[i][0] + nx * r, pts[i][1] + ny * r, pts[i][2] + nz * r],
          n: [nx, ny, nz],
          u: k / segs,
          v: dists[i] / Math.max(0.25, tile),
        });
      }
      rings.push(ring);
    }
    const pushV = (q) => {
      b.pos.push(q.p[0], q.p[1], q.p[2]);
      b.nrm.push(q.n[0], q.n[1], q.n[2]);
      b.uv.push(q.u, q.v);
    };
    for (let i = 0; i < n - 1; i++) {
      for (let k = 0; k < segs; k++) {
        const a = rings[i][k], c = rings[i][k + 1], d = rings[i + 1][k + 1], e = rings[i + 1][k];
        pushV(a); pushV(c); pushV(d);
        pushV(a); pushV(d); pushV(e);
      }
    }
  }

  stone(cx, cy, cz, rx, ry, rz, seed, style, mat, { rot = [0, 0, 0], detail = 1, tile = 1.0 } = {}) {
    const g = buildCompactStoneGeometry(this.T, { rx, ry, rz, detail, seed, style, uvTile: tile });
    this.pushGeo(g, mat, { x: cx, y: cy, z: cz, rx: rot[0], ry: rot[1], rz: rot[2], tile, keepUV: true });
    g.dispose();
  }

  blade(cx, cy, cz, w, h, d, seed, style, mat, { rx = 0, ry = 0, rz = 0, taperTop = 0.24, detail = 1, tile = 1.1 } = {}) {
    const g = buildCompactStoneGeometry(this.T, { rx: w * 0.5, ry: h * 0.5, rz: d * 0.5, detail, seed, style, uvTile: tile });
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const py = P.getY(i);
      const u = clamp((py + h * 0.5) / Math.max(0.1, h), 0, 1);
      const pinch = lerp(1.06, taperTop, u * u);
      const skew = u * u * 0.14 * w * ((seed & 1) ? 1 : -1);
      P.setX(i, P.getX(i) * pinch + skew);
      P.setZ(i, P.getZ(i) * lerp(1.04, 0.44, u));
    }
    P.needsUpdate = true;
    this.pushGeo(g, mat, { x: cx, y: cy, z: cz, rx, ry, rz, tile });
    g.dispose();
  }

  // Sculpted organic stalactite (down = true) or stalagmite (down = false)
  speleothem(x, yBase, z, rBase, len, down, seed, mat, tile = 0.9) {
    const rnd = mulberry32(seed);
    const segs = 6;
    const rings = 4;
    const pts = [];
    const sgn = down ? -1 : 1;
    for (let i = 0; i <= rings; i++) {
      const u = i / rings;
      pts.push([
        x + (rnd() - 0.5) * rBase * 0.35 * u,
        yBase + sgn * u * len,
        z + (rnd() - 0.5) * rBase * 0.35 * u,
      ]);
    }
    this.tube(pts, segs, (u) => Math.max(0.015, rBase * Math.pow(1 - u, 1.35) * (0.85 + 0.3 * Math.sin(u * 9 + seed))), mat, tile);
  }

  // Realistic anatomical bone cluster (femurs with condyle ends, curved ribs, weathered skull!)
  boneCluster(x, y, z, rnd, mat, { skull = false, count = 4 } = {}) {
    for (let k = 0; k < count; k++) {
      const a = rnd() * Math.PI * 2;
      const dist = 0.08 + rnd() * 0.42;
      const bx = x + Math.cos(a) * dist;
      const bz = z + Math.sin(a) * dist;
      const yaw = rnd() * Math.PI;
      if (k % 2 === 0) {
        // Femur / long bone with flared ends
        const len = 0.34 + rnd() * 0.14;
        const dx = Math.sin(yaw) * len * 0.5, dz = Math.cos(yaw) * len * 0.5;
        this.rod([bx - dx, y + 0.025, bz - dz], [bx + dx, y + 0.028, bz + dz], 0.018, 0.018, 5, mat, 0.3);
        this.stone(bx - dx, y + 0.03, bz - dz, 0.032, 0.026, 0.028, 8100 + k, 'limestone', mat, { detail: 0, tile: 0.3 });
        this.stone(bx + dx, y + 0.03, bz + dz, 0.034, 0.026, 0.028, 8150 + k, 'limestone', mat, { detail: 0, tile: 0.3 });
      } else {
        // Curved rib arc
        this.torus(0.14 + rnd() * 0.04, 0.012, 4, 8, Math.PI * 0.85, mat, bx, y + 0.022, bz, Math.PI * 0.46, yaw, 0, 0.25);
      }
    }
    if (skull) {
      const sx = x + (rnd() - 0.5) * 0.3, sz = z + (rnd() - 0.5) * 0.3;
      const syaw = rnd() * Math.PI * 2;
      // Cranium + brow + recessed maxilla silhouette
      this.stone(sx, y + 0.105, sz, 0.095, 0.105, 0.115, 8201 + Math.floor(rnd() * 99), 'limestone', mat, { rot: [0.22, syaw, 0.15], detail: 1, tile: 0.35 });
      this.box(0.085, 0.055, 0.07, mat, sx + Math.sin(syaw) * 0.075, y + 0.06, sz + Math.cos(syaw) * 0.075, 0.22, syaw, 0, 0.3);
    }
  }

  // Woodland bioluminescent shelf-fungus cluster (Art Direction §1: natural cap + muted sage gill glow!)
  shelfFungus(x, y, z, yaw, count, rnd, capMat, gillMat, scale = 1.0) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    for (let i = 0; i < count; i++) {
      const r = (0.09 + rnd() * 0.12) * scale;
      const dy = (i - (count - 1) * 0.5) * 0.095 * scale;
      const dx = (rnd() - 0.5) * 0.16 * scale;
      const px = x + dx * cy, pz = z - dx * sy, py = y + dy;
      const ry = yaw + (rnd() - 0.5) * 0.45;
      this.cyl(r * 0.96, r * 0.72, 0.026 * scale, 7, capMat, px, py + 0.010 * scale, pz, 0.10, ry, 0, 0.35);
      this.cyl(r * 0.74, r * 0.52, 0.016 * scale, 7, gillMat, px, py - 0.008 * scale, pz, 0.10, ry, 0, 0.35);
    }
  }

  flush(targetGroup, { receiveShadow = true, castShadow = false } = {}) {
    const T = this.T;
    let idx = 0;
    const meshes = [];
    for (const [, b] of this.buckets) {
      if (!b.pos.length) continue;
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(b.nrm, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(b.uv, 2));
      g.computeBoundingBox();
      g.computeBoundingSphere();
      const m = new T.Mesh(g, b.mat);
      m.name = `${this.namePrefix}-${idx++}`;
      m.castShadow = castShadow;
      m.receiveShadow = receiveShadow;
      targetGroup.add(m);
      meshes.push(m);
    }
    return meshes;
  }
}

// ---------------------------------------------------------------------------
// Sculpted Cave Shell Builder — organic rock wall relief + AO vertex colors!
// Keeps all displacement strictly flush at doorway jambs & floor seams so
// there are ZERO cracks and ZERO intrusion into t325's 4.4 m clearance.
// ---------------------------------------------------------------------------
export function buildSculptedBoxesGeometry(T, list, {
  subdivSize = 1.45,
  relief = 0.09,
  seed = 4160,
  uvTile = 3.5,
  aoFloor = true,
  isRoof = false,
  isFloor = false,
} = {}) {
  const pos = [], nrm = [], uv = [], col = [];

  const pushTri = (a, b, c, na, nb, nc, ua, ub, uc, ca, cb, cc) => {
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    nrm.push(na[0], na[1], na[2], nb[0], nb[1], nb[2], nc[0], nc[1], nc[2]);
    uv.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
    col.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2]);
  };

  for (const box of list) {
    const x0 = box.minX, x1 = box.maxX;
    const y0 = box.minY, y1 = box.maxY;
    const z0 = box.minZ, z1 = box.maxZ;
    const sx = x1 - x0, sy = y1 - y0, sz = z1 - z0;
    if (sx <= 1e-4 || sy <= 1e-4 || sz <= 1e-4) continue;

    // 6 faces: [normal, origin, uVec, vVec, uLen, vLen, faceKind]
    const faces = [
      { n: [1, 0, 0],  p: [x1, y0, z1], u: [0, 0, -1], v: [0, 1, 0], ul: sz, vl: sy, side: 'wall' },
      { n: [-1, 0, 0], p: [x0, y0, z0], u: [0, 0, 1],  v: [0, 1, 0], ul: sz, vl: sy, side: 'wall' },
      { n: [0, 0, 1],  p: [x0, y0, z1], u: [1, 0, 0],  v: [0, 1, 0], ul: sx, vl: sy, side: 'wall' },
      { n: [0, 0, -1], p: [x1, y0, z0], u: [-1, 0, 0], v: [0, 1, 0], ul: sx, vl: sy, side: 'wall' },
      { n: [0, 1, 0],  p: [x0, y1, z1], u: [1, 0, 0],  v: [0, 0, -1], ul: sx, vl: sz, side: 'top' },
      { n: [0, -1, 0], p: [x0, y0, z0], u: [1, 0, 0],  v: [0, 0, 1], ul: sx, vl: sz, side: 'bot' },
    ];

    for (const f of faces) {
      // Skip unseen outer underside of floor slabs & top of roof slabs to save ~30% tris!
      if (isFloor && f.side === 'bot') continue;
      if (isRoof && f.side === 'top') continue;

      const doSculpt = (f.side === 'wall' && !isFloor && !isRoof && relief > 0.005)
        || (isRoof && f.side === 'bot' && relief > 0.005);
      const nu = doSculpt ? Math.max(1, Math.min(8, Math.round(f.ul / subdivSize))) : 1;
      const nv = doSculpt ? Math.max(1, Math.min(6, Math.round(f.vl / subdivSize))) : 1;

      const gridP = new Array((nv + 1) * (nu + 1));
      const gridUV = new Array((nv + 1) * (nu + 1));
      const gridC = new Array((nv + 1) * (nu + 1));

      for (let j = 0; j <= nv; j++) {
        const fv = j / nv;
        for (let i = 0; i <= nu; i++) {
          const fu = i / nu;
          const px = f.p[0] + f.u[0] * (fu * f.ul) + f.v[0] * (fv * f.vl);
          const py = f.p[1] + f.u[1] * (fu * f.ul) + f.v[1] * (fv * f.vl);
          const pz = f.p[2] + f.u[2] * (fu * f.ul) + f.v[2] * (fv * f.vl);

          // Edge pinning: fade displacement smoothly to 0 along box edges so adjacent boxes never crack!
          const edgeU = Math.min(fu, 1 - fu);
          const edgeV = Math.min(fv, 1 - fv);
          const pin = doSculpt ? clamp(Math.min(edgeU * 4.5, edgeV * 4.5), 0, 1) : 0;

          let disp = 0;
          let noiseVal = 0;
          if (pin > 0.001) {
            noiseVal = fbm3(px * 0.44 + 7.1, py * 0.56 - 3.3, pz * 0.44 + 5.7, seed, 3);
            // Bias slightly inward on walls so sculpted rock NEVER crowds playable space
            disp = (noiseVal * 0.85 - (isRoof ? 0.10 : 0.20)) * relief * pin;
          }

          const vx = px + f.n[0] * disp;
          const vy = py + f.n[1] * disp;
          const vz = pz + f.n[2] * disp;
          const idx = j * (nu + 1) + i;
          gridP[idx] = [vx, vy, vz];

          // World-projected UVs for continuous seamless tiling across neighboring cells
          const uCoord = Math.abs(f.n[0]) > 0.5 ? pz : px;
          const vCoord = Math.abs(f.n[1]) > 0.5 ? pz : py;
          gridUV[idx] = [uCoord / uvTile, vCoord / uvTile];

          // Baked architectural AO vertex colors: ground contact shadow, ceiling crease shadow, crevice tone
          let ao = 1.0;
          if (f.side === 'wall' && aoFloor) {
            const botFade = clamp((fv * f.vl - 0.45) / 1.15, 0, 1);
            const topFade = clamp(((1 - fv) * f.vl) / 1.0, 0, 1);
            const endFade = clamp(Math.min(fu * f.ul, (1 - fu) * f.ul) / 0.85, 0, 1);
            ao = lerp(0.62, 1.0, botFade) * lerp(0.80, 1.0, topFade) * lerp(0.86, 1.0, endFade);
            ao *= 1.0 + noiseVal * 0.12;
          } else if (isRoof && f.side === 'bot') {
            ao = 0.66 + noiseVal * 0.18;
          } else if (isFloor && f.side === 'top') {
            // Slight perimeter darkening where floor meets surrounding rock walls
            const dEdge = Math.min(fu * f.ul, (1 - fu) * f.ul, fv * f.vl, (1 - fv) * f.vl);
            ao = lerp(0.76, 1.0, clamp(dEdge / 1.15, 0, 1));
          }
          ao = clamp(ao, 0.38, 1.06);
          gridC[idx] = [ao, ao, ao];
        }
      }

      // Compute face-averaged smooth-creased normals on the face grid
      const gridN = new Array((nv + 1) * (nu + 1));
      for (let k = 0; k < gridN.length; k++) gridN[k] = [0, 0, 0];
      const addNorm = (i0, i1, i2) => {
        const A = gridP[i0], B = gridP[i1], C = gridP[i2];
        const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
        const vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        gridN[i0][0] += nx; gridN[i0][1] += ny; gridN[i0][2] += nz;
        gridN[i1][0] += nx; gridN[i1][1] += ny; gridN[i1][2] += nz;
        gridN[i2][0] += nx; gridN[i2][1] += ny; gridN[i2][2] += nz;
      };
      for (let j = 0; j < nv; j++) {
        for (let i = 0; i < nu; i++) {
          const a = j * (nu + 1) + i;
          const b = a + 1;
          const c = a + (nu + 1) + 1;
          const d = a + (nu + 1);
          addNorm(a, b, c);
          addNorm(a, c, d);
        }
      }
      for (let k = 0; k < gridN.length; k++) {
        const l = Math.hypot(gridN[k][0], gridN[k][1], gridN[k][2]);
        if (l > 1e-6) { gridN[k][0] /= l; gridN[k][1] /= l; gridN[k][2] /= l; }
        else gridN[k] = f.n;
      }

      for (let j = 0; j < nv; j++) {
        for (let i = 0; i < nu; i++) {
          const a = j * (nu + 1) + i;
          const b = a + 1;
          const c = a + (nu + 1) + 1;
          const d = a + (nu + 1);
          pushTri(gridP[a], gridP[b], gridP[c], gridN[a], gridN[b], gridN[c], gridUV[a], gridUV[b], gridUV[c], gridC[a], gridC[b], gridC[c]);
          pushTri(gridP[a], gridP[c], gridP[d], gridN[a], gridN[c], gridN[d], gridUV[a], gridUV[c], gridUV[d], gridC[a], gridC[c], gridC[d]);
        }
      }
    }
  }

  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

// ---------------------------------------------------------------------------
// Hero Oil Lantern (caged wrought-iron mine/camp lantern with warm flame core)
// ---------------------------------------------------------------------------
export function buildOilLanternMesh(T, mats, { hangLen = 0.55, wallMount = false } = {}) {
  const g = new T.Group();
  g.name = 'hollow-lantern';
  const batch = new SculptBatch(T, 'lantern');
  if (wallMount) {
    batch.beam([0, 0.24, -0.26], [0, 0.24, 0.04], 0.03, 0.03, mats.iron);
    batch.beam([0, 0.04, -0.26], [0, 0.24, -0.04], 0.024, 0.024, mats.iron);
  } else {
    batch.rod([0, 0.23, 0], [0, 0.23 + hangLen, 0], 0.012, 0.012, 5, mats.iron);
  }
  // Curved bail handle, vented chimney hood, oil fount base, 4 cage guard rods
  batch.torus(0.068, 0.011, 5, 10, Math.PI, mats.iron, 0, 0.20, 0, 0, 0, 0);
  batch.cyl(0.058, 0.115, 0.075, 8, mats.ironRust, 0, 0.155, 0);
  batch.cyl(0.098, 0.122, 0.065, 8, mats.ironRust, 0, -0.135, 0);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    batch.rod([Math.cos(a) * 0.095, -0.11, Math.sin(a) * 0.095], [Math.cos(a) * 0.095, 0.13, Math.sin(a) * 0.095], 0.008, 0.008, 4, mats.iron);
  }
  batch.flush(g);

  // Warm glowing glass mantle + flame core
  const glassMat = mats.lanternGlass ? mats.lanternGlass.clone() : mats.lamp.clone();
  const glass = new T.Mesh(new T.CylinderGeometry(0.066, 0.058, 0.20, 9), glassMat);
  glass.position.y = 0.01;
  g.add(glass);

  const flame = new T.Mesh(new T.SphereGeometry(0.042, 7, 6), mats.lamp);
  flame.scale.set(0.85, 1.55, 0.85);
  flame.position.y = 0.0;
  g.add(flame);

  g.userData.glassMat = glassMat;
  g.userData.flame = flame;
  return g;
}

// ---------------------------------------------------------------------------
// Hero Supply Crate (visible, stenciled PGB crate that swings open on claim!)
// ---------------------------------------------------------------------------
export function buildSupplyCrateMesh(T, mats, index = 0) {
  const g = new T.Group();
  g.name = 'supply-crate-' + index;

  // Base body with recessed dark interior & visible contents
  const baseBatch = new SculptBatch(T, 'crate-base');
  // Four corner feet + reinforced steel side walls + iron corner bumpers
  for (const sx of [-0.30, 0.30]) for (const sz of [-0.18, 0.18]) {
    baseBatch.box(0.08, 0.035, 0.08, mats.iron, sx, 0.018, sz, 0, 0, 0, 0.3);
    baseBatch.box(0.045, 0.32, 0.045, mats.ironRust, sx * 1.12, 0.19, sz * 1.14, 0, 0, 0, 0.3);
  }
  // Recessed interior floor & walls (visible once opened!)
  baseBatch.box(0.68, 0.06, 0.42, mats.crateDark, 0, 0.065, 0, 0, 0, 0, 0.5);
  baseBatch.box(0.68, 0.26, 0.04, mats.crate, 0, 0.21, 0.19, 0, 0, 0, 0.5);
  baseBatch.box(0.68, 0.26, 0.04, mats.crate, 0, 0.21, -0.19, 0, 0, 0, 0.5);
  baseBatch.box(0.04, 0.26, 0.36, mats.crate, -0.32, 0.21, 0, 0, 0, 0, 0.5);
  baseBatch.box(0.04, 0.26, 0.36, mats.crate, 0.32, 0.21, 0, 0, 0, 0, 0.5);
  // Front latch plates & side carry handles
  for (const sx of [-0.18, 0.18]) baseBatch.box(0.055, 0.09, 0.025, mats.brass, sx, 0.29, 0.222, 0, 0, 0, 0.3);
  for (const sx of [-0.35, 0.35]) baseBatch.torus(0.055, 0.011, 4, 8, Math.PI, mats.iron, sx, 0.21, 0, 0, Math.PI / 2, Math.PI);
  baseBatch.flush(g);

  // Stenciled front placard face
  if (mats.supplyStencil) {
    const face = new T.Mesh(new T.PlaneGeometry(0.56, 0.22), mats.supplyStencil);
    face.position.set(0, 0.20, 0.214);
    g.add(face);
  }

  // Interior loot silhouettes (hidden when claimed!)
  const contents = new T.Group();
  contents.name = 'crate-contents';
  const cBatch = new SculptBatch(T, 'crate-loot');
  cBatch.box(0.26, 0.14, 0.16, mats.ammoCan, -0.14, 0.17, 0.02, 0, 0.08, 0, 0.4); // ammo box
  cBatch.cyl(0.038, 0.038, 0.12, 8, mats.crate, 0.14, 0.16, 0.06, 0, 0, 0.25);     // frag grenade
  cBatch.box(0.18, 0.07, 0.12, mats.chalk, 0.12, 0.14, -0.07, 0, -0.18, 0, 0.3);  // medkit pack
  cBatch.flush(contents);
  g.add(contents);

  // Subtle amber salvage indicator light on front-right bezel (Art Direction §3: gold/amber = take/press)
  const beaconMat = new T.MeshStandardMaterial({
    color: 0xffd24a, emissive: 0xffb830, emissiveIntensity: 1.5, roughness: 0.3, metalness: 0.1,
  });
  const beacon = new T.Mesh(new T.BoxGeometry(0.08, 0.024, 0.024), beaconMat);
  beacon.position.set(0.24, 0.35, 0.218);
  g.add(beacon);

  // Hinged lid pivot at rear edge (z = -0.21, y = 0.34)
  const lidPivot = new T.Group();
  lidPivot.position.set(0, 0.34, -0.21);
  const lidBatch = new SculptBatch(T, 'crate-lid');
  lidBatch.box(0.74, 0.06, 0.46, mats.crate, 0, 0.03, 0.21, 0, 0, 0, 0.5);
  lidBatch.box(0.76, 0.028, 0.05, mats.iron, 0, 0.06, 0.08, 0, 0, 0, 0.4);
  lidBatch.box(0.76, 0.028, 0.05, mats.iron, 0, 0.06, 0.34, 0, 0, 0, 0.4);
  lidBatch.flush(lidPivot);
  g.add(lidPivot);

  g.userData.claimed = false;
  g.userData.setClaimed = (on) => {
    g.userData.claimed = !!on;
    lidPivot.rotation.x = on ? -1.68 : 0;
    contents.visible = !on;
    beacon.visible = !on;
  };
  return g;
}

// ---------------------------------------------------------------------------
// Hero Gravewalker Dog Tag Vignette (somber fallen helmet + glinting steel tags!)
// ---------------------------------------------------------------------------
export function buildDogTagVignetteMesh(T, mats, theme, n, rnd) {
  const g = new T.Group();
  g.name = `dog-tag-${theme}-${n}`;

  // Persistent fallen PGB gear vignette (stays after tag pickup!)
  const gearBatch = new SculptBatch(T, 'tag-vignette');
  // Scuffed tilted olive combat helmet
  const helmGeo = new T.SphereGeometry(0.165, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.56);
  gearBatch.pushGeo(helmGeo, mats.helmet, { x: -0.18, y: 0.04, z: -0.08, rx: 0.32, ry: rnd() * 6, rz: 0.62, tile: 0.4 });
  helmGeo.dispose();
  // Helmet brim / visor lip
  gearBatch.torus(0.155, 0.014, 4, 12, Math.PI * 1.6, mats.crateDark, -0.18, 0.04, -0.08, 0.32 + Math.PI / 2, 0.2, 0.62);
  // Tattered olive webbing pouch / ammo mag nearby
  gearBatch.box(0.18, 0.07, 0.13, mats.crate, 0.20, 0.035, 0.14, 0.06, rnd() * 3, -0.08, 0.3);
  gearBatch.flush(g);

  // Subtle dark stain / dirt scuff beneath
  const scuff = new T.Mesh(new T.CircleGeometry(0.38, 12), mats.drag);
  scuff.rotation.x = -Math.PI / 2;
  scuff.position.y = 0.008;
  g.add(scuff);

  // Recoverable dog tags + chain + subtle glinting amber-silver point (disappears on pickup)
  const tagGrp = new T.Group();
  tagGrp.name = 'dog-tag-pickup';
  const tagMat = new T.MeshStandardMaterial({
    color: 0xd8dee2, emissive: 0xffe49c, emissiveIntensity: 0.55, roughness: 0.24, metalness: 0.88,
  });
  const tagA = new T.Mesh(new T.BoxGeometry(0.052, 0.006, 0.095), tagMat);
  tagA.position.set(0.05, 0.015, 0.03);
  tagA.rotation.y = 0.45;
  tagGrp.add(tagA);
  const tagB = new T.Mesh(new T.BoxGeometry(0.052, 0.006, 0.095), tagMat);
  tagB.position.set(0.09, 0.022, -0.01);
  tagB.rotation.set(0.08, -0.35, 0.12);
  tagGrp.add(tagB);
  const chain = new T.Mesh(new T.TorusGeometry(0.085, 0.006, 4, 14), tagMat);
  chain.rotation.x = Math.PI / 2;
  chain.position.set(0.03, 0.012, 0.06);
  tagGrp.add(chain);

  // Subtle upward shimmer sliver so observant players notice the metal glint in lantern/flashlight light
  const glintMat = new T.MeshBasicMaterial({
    color: 0xffe4a0, transparent: true, opacity: 0.65, depthWrite: false, side: T.DoubleSide, toneMapped: false,
  });
  const glint = new T.Mesh(new T.SphereGeometry(0.032, 4, 2), glintMat);
  glint.position.set(0.06, 0.16, 0.02);
  tagGrp.add(glint);
  g.add(tagGrp);

  g.userData.glint = glint;
  g.userData.collected = false;
  g.userData.setCollected = (on) => {
    g.userData.collected = !!on;
    tagGrp.visible = !on;
  };
  return g;
}

// ---------------------------------------------------------------------------
// Hero Reinforced Strongbox (stone plinth + iron-bound PGB field vault + animated lid)
// ---------------------------------------------------------------------------
export function buildStrongboxMesh(T, mats) {
  const box = new T.Group();
  box.name = 'strongbox';

  const baseBatch = new SculptBatch(T, 'strongbox-base');
  // Carved stepped stone plinth
  baseBatch.stone(0, 0.11, 0, 0.72, 0.15, 0.54, 41690, 'granite', mats.stoneTrim || mats.rock, { detail: 1, tile: 0.9 });
  baseBatch.box(1.14, 0.07, 0.78, mats.stoneTrim || mats.rock, 0, 0.21, 0, 0, 0, 0, 0.9);
  // Vault lower housing (recessed open cavity for when lid swings open)
  baseBatch.box(0.92, 0.08, 0.60, mats.crateDark, 0, 0.29, 0, 0, 0, 0, 0.6);
  baseBatch.box(0.92, 0.36, 0.05, mats.vaultBody || mats.accent, 0, 0.49, 0.275, 0, 0, 0, 0.6);
  baseBatch.box(0.92, 0.36, 0.05, mats.vaultBody || mats.accent, 0, 0.49, -0.275, 0, 0, 0, 0.6);
  baseBatch.box(0.05, 0.36, 0.54, mats.vaultBody || mats.accent, -0.435, 0.49, 0, 0, 0, 0, 0.6);
  baseBatch.box(0.05, 0.36, 0.54, mats.vaultBody || mats.accent, 0.435, 0.49, 0, 0, 0, 0, 0.6);
  // Heavy riveted forged-iron straps & side carry handles + brass lock housing
  for (const sx of [-0.34, 0.34]) {
    baseBatch.box(0.07, 0.42, 0.64, mats.iron, sx, 0.47, 0, 0, 0, 0, 0.4);
  }
  for (const sx of [-0.475, 0.475]) {
    baseBatch.torus(0.075, 0.016, 5, 10, Math.PI, mats.ironRust, sx, 0.46, 0, 0, Math.PI / 2, Math.PI);
  }
  baseBatch.box(0.16, 0.14, 0.045, mats.brass, 0, 0.58, 0.315, 0, 0, 0, 0.3);
  baseBatch.flush(box);

  // Vault stenciled nameplate
  if (mats.vaultStencil) {
    const face = new T.Mesh(new T.PlaneGeometry(0.54, 0.22), mats.vaultStencil);
    face.position.set(0, 0.47, 0.305);
    box.add(face);
  }

  // Faint pale-cyan rune-shard glow leaking from seam while closed (Art Direction §1/§3!)
  const seamMat = new T.MeshBasicMaterial({
    color: 0x8ef2ff, transparent: true, opacity: 0.72, toneMapped: false,
  });
  const seam = new T.Mesh(new T.BoxGeometry(0.84, 0.022, 0.56), seamMat);
  seam.position.set(0, 0.675, 0);
  box.add(seam);

  // Articulated domed steel-bound lid
  const lidPivot = new T.Group();
  lidPivot.position.set(0, 0.67, -0.30);
  const lidBatch = new SculptBatch(T, 'strongbox-lid');
  lidBatch.box(0.96, 0.10, 0.64, mats.iron, 0, 0.05, 0.30, 0, 0, 0, 0.5);
  lidBatch.box(0.86, 0.055, 0.54, mats.ironRust, 0, 0.12, 0.30, 0, 0, 0, 0.5);
  for (const sx of [-0.34, 0.34]) lidBatch.box(0.075, 0.13, 0.66, mats.iron, sx, 0.075, 0.30, 0, 0, 0, 0.4);
  lidBatch.flush(lidPivot);
  box.add(lidPivot);

  box.userData.opened = false;
  box.userData.seamMat = seamMat;
  box.userData.setOpened = (on) => {
    box.userData.opened = !!on;
    lidPivot.rotation.x = on ? -1.62 : 0;
    seam.visible = !on;
  };
  return box;
}

// ---------------------------------------------------------------------------
// Hero Organic Pulsing Nest (replaces the giant red beach ball!)
// ---------------------------------------------------------------------------
const NEST_MAT_CACHE = new WeakMap();

export function buildHollowNestMesh(T, theme = 'iron', id = 0) {
  let shared = NEST_MAT_CACHE.get(T);
  if (!shared) {
    const pbr = getHollowPBRPack(T, theme);
    shared = {
      flesh: new T.MeshStandardMaterial(pbr.nestFlesh.opts({
        color: 0xbfa8ac, normalScale: 1.35, aoMapIntensity: 0.85,
        extra: { emissive: new T.Color(0x3a0b10), emissiveIntensity: 0.35 },
      })),
      root: new T.MeshStandardMaterial(pbr.cavePbr.gnarledBark.opts({ color: 0x6b5848, normalScale: 1.25 })),
      sacBase: new T.MeshStandardMaterial(pbr.huskMembrane.opts({
        color: 0xd8a898, normalScale: 1.0,
        extra: { emissive: new T.Color(0x9a2820), emissiveIntensity: 0.65 },
      })),
      maw: new T.MeshBasicMaterial({ color: 0x100406 }),
      core: new T.MeshBasicMaterial({ color: 0x9cffc2, toneMapped: false }),
    };
    NEST_MAT_CACHE.set(T, shared);
  }

  const rnd = mulberry32(hashStr('hollow-nest:' + theme + ':' + id));
  const g = new T.Group();
  g.name = 'below-nest';
  g.userData.nest = id;

  // Clone emissive mats per nest so each nest visibly reacts to its own HP & hit flash!
  const fleshMat = shared.flesh.clone();
  const sacMat = shared.sacBase.clone();
  const coreMat = shared.core.clone();

  const bodyGrp = new T.Group();
  const batch = new SculptBatch(T, 'nest-body');

  // 1. Sculpted organic central brood mound (squashed irregular fleshy rock)
  batch.stone(0, 0.42, 0, 0.94, 0.62, 0.94, 41700 + id * 17, 'granite', fleshMat, { detail: 2, tile: 0.75 });
  // Asymmetric secondary shoulder lobes
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + rnd() * 0.4;
    const r = 0.56 + rnd() * 0.18;
    batch.stone(Math.cos(a) * r, 0.32 + rnd() * 0.12, Math.sin(a) * r, 0.42 + rnd() * 0.12, 0.34 + rnd() * 0.12, 0.40, 41740 + id * 19 + k, 'granite', fleshMat, { detail: 1, tile: 0.6 });
  }
  // 2. 8 sinuous gnarled anchor tendrils gripping out across the stone floor!
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + (rnd() - 0.5) * 0.3;
    const reach = 1.35 + rnd() * 0.55;
    const pts = [];
    for (let s = 0; s <= 4; s++) {
      const u = s / 4;
      const rr = lerp(0.45, reach, u);
      const sw = Math.sin(u * Math.PI * 1.4 + k) * 0.16;
      const py = u === 0 ? 0.55 : (u === 4 ? -0.02 : (1 - u) * 0.38 + Math.sin(u * Math.PI) * 0.10);
      pts.push([Math.cos(a) * rr - Math.sin(a) * sw, py, Math.sin(a) * rr + Math.cos(a) * sw]);
    }
    batch.tube(pts, 5, (u) => lerp(0.11, 0.025, u), shared.root, 0.65);
  }
  // 3. Chitinous crown ribs framing the central spawning maw
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    batch.tube([
      [Math.cos(a) * 0.58, 0.55, Math.sin(a) * 0.58],
      [Math.cos(a) * 0.42, 0.96, Math.sin(a) * 0.42],
      [Math.cos(a) * 0.28, 1.06, Math.sin(a) * 0.28],
    ], 5, (u) => lerp(0.075, 0.03, u), shared.root, 0.4);
  }
  batch.flush(bodyGrp);

  // 4. Open dark central maw + eerie glowing uncanny heart pulse inside
  const maw = new T.Mesh(new T.CylinderGeometry(0.28, 0.18, 0.24, 10), shared.maw);
  maw.position.y = 0.86;
  bodyGrp.add(maw);
  const core = new T.Mesh(new T.SphereGeometry(0.16, 8, 6), coreMat);
  core.position.y = 0.78;
  bodyGrp.add(core);

  // 5. 6 irregular glistening pulsing brood egg sacs nestled around the flanks
  const sacs = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.25 + (rnd() - 0.5) * 0.25;
    const dist = 0.62 + rnd() * 0.18;
    const sc = 0.22 + rnd() * 0.10;
    const sac = new T.Mesh(new T.SphereGeometry(sc, 8, 7), sacMat);
    sac.scale.set(1.0, 1.25 + rnd() * 0.25, 0.95);
    sac.position.set(Math.cos(a) * dist, 0.38 + rnd() * 0.26, Math.sin(a) * dist);
    sac.rotation.set((rnd() - 0.5) * 0.5, a, (rnd() - 0.5) * 0.5);
    sac.userData.baseScale = sac.scale.clone();
    sac.userData.phase = rnd() * Math.PI * 2;
    bodyGrp.add(sac);
    sacs.push(sac);
  }
  g.add(bodyGrp);

  g.userData.hitFlash = 0;
  g.userData.disposeExtra = () => { fleshMat.dispose(); sacMat.dispose(); coreMat.dispose(); };
  g.userData.updatePulse = (timeS, hpFrac = 1, dt = 0.016) => {
    const dmg = 1 - clamp(hpFrac, 0, 1);
    if (g.userData.hitFlash > 0) g.userData.hitFlash = Math.max(0, g.userData.hitFlash - dt * 5.5);
    const freq = 3.2 + dmg * 6.8;
    const p = 1 + Math.sin(timeS * freq + id * 1.7) * (0.045 + dmg * 0.055);
    bodyGrp.scale.set(p, 1 + (p - 1) * 1.35, p);
    for (const s of sacs) {
      const sp = 1 + Math.sin(timeS * (freq * 1.25) + s.userData.phase) * (0.10 + dmg * 0.09);
      s.scale.copy(s.userData.baseScale).multiplyScalar(sp);
    }
    const fl = g.userData.hitFlash;
    fleshMat.emissiveIntensity = 0.35 + dmg * 0.95 + fl * 1.8;
    sacMat.emissiveIntensity = 0.55 + dmg * 1.25 + fl * 2.0;
    // Core shifts from eerie uncanny pale-green toward angry crimson-amber as nest nears bursting!
    coreMat.color.setRGB(
      clamp(lerp(0.55, 1.0, dmg) + fl * 0.4, 0, 1),
      clamp(lerp(0.95, 0.32, dmg) + fl * 0.3, 0, 1),
      clamp(lerp(0.70, 0.18, dmg) + fl * 0.2, 0, 1)
    );
  };
  return g;
}

// ---------------------------------------------------------------------------
// Hero Veined Husk (organic hanging cocoon with braided root anchor & sway)
// ---------------------------------------------------------------------------
export function buildHeroHusk(T, mats, what, rnd) {
  const g = new T.Group();
  g.name = 'husk';
  const many = what === 'many';
  const batch = new SculptBatch(T, 'husk');

  // Braided organic root cord gripping ceiling down into cocoon crown
  for (let s = 0; s < 3; s++) {
    const a0 = (s / 3) * Math.PI * 2;
    batch.tube([
      [Math.cos(a0) * 0.24, 0.25, Math.sin(a0) * 0.24],
      [Math.cos(a0 + 0.9) * 0.11, -0.22, Math.sin(a0 + 0.9) * 0.11],
      [Math.cos(a0 + 1.8) * 0.18, -0.78, Math.sin(a0 + 1.8) * 0.18],
    ], 5, (u) => lerp(0.065, 0.032, u), mats.bark || mats.accent, 0.5);
  }

  // Sculpted organic tapered cocoon sack (organic stone displacement -> lumpy anatomical silhouette!)
  batch.stone(0, -1.18, 0, many ? 0.58 : 0.38, 0.88, many ? 0.48 : 0.35, 41800 + Math.floor(rnd() * 900), 'granite', mats.husk, { detail: 2, tile: 0.7 });
  if (many) {
    batch.stone(-0.36, -0.96, 0.12, 0.30, 0.62, 0.28, 41850 + Math.floor(rnd() * 400), 'granite', mats.husk, { rot: [0.1, 0.2, 0.22], detail: 1, tile: 0.6 });
    batch.stone(0.38, -1.32, -0.08, 0.28, 0.56, 0.26, 41890 + Math.floor(rnd() * 400), 'granite', mats.husk, { rot: [-0.1, -0.3, -0.18], detail: 1, tile: 0.6 });
  }
  // Sinewy constricting root tendrils wrapping the waist of the husk
  batch.torus(many ? 0.52 : 0.36, 0.028, 5, 12, Math.PI * 2, mats.barkDark || mats.accent, 0, -0.92, 0, Math.PI / 2 + 0.14, 0, 0.12);
  batch.torus(many ? 0.46 : 0.32, 0.022, 5, 12, Math.PI * 2, mats.bark || mats.accent, 0, -1.48, 0, Math.PI / 2 - 0.12, 0, -0.1);

  if (what === 'boot') {
    // Hiker's lace-up boot jutting out of the torn bottom of the sack
    batch.cyl(0.055, 0.062, 0.24, 7, mats.hikerBoot, 0.11, -1.92, 0.08, 0.24, 0.15, -0.12);
    batch.box(0.115, 0.11, 0.26, mats.hikerBoot, 0.12, -2.05, 0.14, 0.32, 0.15, -0.06, 0.3);
    batch.box(0.125, 0.028, 0.28, mats.iron, 0.12, -2.10, 0.15, 0.32, 0.15, -0.06, 0.3);
    batch.box(0.095, 0.022, 0.12, mats.hikerLace, 0.12, -1.98, 0.20, 0.32, 0.15, -0.06, 0.3);
  } else if (what === 'jacket') {
    // Torn orange Search-and-Rescue jacket sleeve & reflective stripe pressing through membrane
    batch.stone(0.08, -1.08, 0.28, 0.24, 0.34, 0.11, 41871, 'granite', mats.rangerJacket, { rot: [-0.08, 0.22, 0.12], detail: 1, tile: 0.4 });
    batch.box(0.32, 0.055, 0.04, mats.reflective, 0.09, -1.14, 0.38, -0.08, 0.22, 0.12, 0.3);
  } else {
    // Two pale gnarled hands pressing outward through the tight membrane
    for (const [hx, hy, hz, rz] of [[0.46, -0.84, 0.28, -0.45], [-0.48, -1.34, 0.26, 0.52]]) {
      batch.stone(hx, hy, hz, 0.075, 0.11, 0.048, 41881, 'granite', mats.huskDark, { rot: [0.1, 0, rz], detail: 1, tile: 0.3 });
    }
  }
  batch.flush(g);
  g.rotation.y = rnd() * Math.PI * 2;
  g.rotation.z = (rnd() - 0.5) * 0.10;
  g.userData.what = what;
  g.userData.swayPhase = rnd() * Math.PI * 2;
  g.userData.baseRotZ = g.rotation.z;
  return g;
}

// ---------------------------------------------------------------------------
// Hero Monumental Rune Door (stepped megalithic portal + breathing Ring of Eight!)
// ---------------------------------------------------------------------------
export function buildRuneDoorMesh(T, mats, doorTex) {
  const door = new T.Group();
  door.name = 'rune-door';
  const rnd = mulberry32(41699);
  const batch = new SculptBatch(T, 'rune-door');
  const frameMat = mats.barrowStone || mats.rock;

  // Note: layoutWarren places plan.doors.rune 0.30 m INSIDE the Deep rock wall (C - 0.7 vs C - 1.0),
  // with local +Z pointing into the Deep room. Shift portal assembly +0.38 m forward so the basalt
  // door slab & carved glowing Ring of Eight stand proudly clear of the wall surface!
  const Z0 = 0.38;

  // Stepped carved megalithic threshold
  batch.box(3.85, 0.16, 1.35, frameMat, 0, 0.08, Z0 + 0.22, 0, 0, 0, 1.0);
  batch.box(3.35, 0.14, 1.02, frameMat, 0, 0.21, Z0 + 0.12, 0, 0, 0, 1.0);
  // Twin massive tapered carved jamb menhirs framing the recessed portal
  for (const sx of [-1, 1]) {
    const jGeo = buildMenhirGeometry(T, 0.78, 4.15, 0.92, rnd, { taper: 0.18, crown: 0.12, jitter: 0.03, chipStrength: 0.035, flatFront: true });
    batch.pushGeo(jGeo, frameMat, { x: sx * 1.62, y: 0.12, z: Z0 + 0.14, ry: sx * -0.06, tile: 1.1 });
    jGeo.dispose();
    // Low flanking ward stones along the threshold
    batch.stone(sx * 2.18, 0.42, Z0 + 0.56, 0.34, 0.52, 0.32, 41701 + sx * 9, 'granite', frameMat, { detail: 1, tile: 0.8 });
  }
  // Heavy overhanging carved lintel capstone
  batch.stone(0, 4.22, Z0 + 0.20, 2.28, 0.46, 0.62, 41707, 'granite', frameMat, { detail: 1, tile: 1.15 });
  batch.box(3.92, 0.24, 0.96, frameMat, 0, 3.92, Z0 + 0.16, 0, 0, 0, 1.0);
  batch.flush(door);

  // Dark basalt monolithic door slab emerging cleanly proud of the Deep wall (front face at z = Z0 + 0.18 = 0.56)
  const slab = new T.Mesh(new T.BoxGeometry(2.65, 3.68, 0.36), mats.rune);
  slab.position.set(0, 2.02, Z0);
  door.add(slab);

  // Glowing carved Ring of Eight face proud of slab front (z = Z0 + 0.205 = 0.585, clear of rock wall!)
  let glyphMat = null;
  if (doorTex) {
    glyphMat = new T.MeshBasicMaterial({
      map: doorTex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: T.AdditiveBlending,
      toneMapped: false,
      color: 0x8ef2ff,
    });
    const face = new T.Mesh(new T.PlaneGeometry(2.42, 3.38), glyphMat);
    face.position.set(0, 2.02, Z0 + 0.205);
    door.add(face);
  }
  door.userData.glyphMat = glyphMat;
  door.userData.slabMat = mats.rune;
  return door;
}

// ---------------------------------------------------------------------------
// Hero Bolt-Hole & Feathered Volumetric Daylight Shaft (zero hard cones or white discs!)
// ---------------------------------------------------------------------------
export function buildBoltHoleMesh(T, mats, { backYaw = 0, index = 0 } = {}) {
  const g = new T.Group();
  g.name = 'bolt-hole-' + index;
  g.rotation.y = backYaw;

  // Sculpted jagged rock crawl-fissure framing the crack on the back wall (z = -0.32)
  const batch = new SculptBatch(T, 'bolt-frame');
  const rockMat = mats.stoneTrim || mats.rock;
  batch.stone(-0.48, 0.95, -0.26, 0.34, 1.08, 0.36, 41910 + index * 13, 'schist', rockMat, { rot: [0, 0.2, 0.14], detail: 1, tile: 0.8 });
  batch.stone(0.48, 0.95, -0.26, 0.34, 1.08, 0.36, 41915 + index * 13, 'schist', rockMat, { rot: [0, -0.2, -0.14], detail: 1, tile: 0.8 });
  batch.stone(0, 2.06, -0.24, 0.64, 0.34, 0.42, 41921 + index * 13, 'schist', rockMat, { detail: 1, tile: 0.8 });
  // Small stacked talus lip at the base of the crawl fissure
  batch.stone(-0.24, 0.14, 0.08, 0.26, 0.14, 0.22, 41927 + index * 7, 'granite', rockMat, { detail: 1, tile: 0.6 });
  batch.stone(0.26, 0.12, 0.12, 0.24, 0.12, 0.20, 41931 + index * 7, 'granite', rockMat, { detail: 1, tile: 0.6 });
  batch.flush(g);

  // Natural feathered daylight rock slit facing INTO the room (+Z)
  const slit = new T.Mesh(new T.PlaneGeometry(0.56, 1.82), mats.day);
  slit.position.set(0, 1.06, -0.20);
  g.add(slit);

  // Soft 2D Gaussian-feathered crossed volumetric light planes angling gracefully onto the floor!
  const beamGrp = new T.Group();
  beamGrp.position.set(0, 1.24, 0.80);
  beamGrp.rotation.x = 0.64;
  for (const ry of [-0.52, 0.52]) {
    const plane = new T.Mesh(new T.PlaneGeometry(1.75, 3.05), mats.shaft);
    plane.rotation.y = ry;
    beamGrp.add(plane);
  }
  g.add(beamGrp);

  // Smooth radial-gradient sunlit floor pool where the beam lands (zero hard octagon edge!)
  const poolMat = mats.shaftPool || mats.shaft;
  const pool = new T.Mesh(new T.PlaneGeometry(2.55, 2.55), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.022, 1.38);
  g.add(pool);

  return g;
}

// ---------------------------------------------------------------------------
// Per-Warren Tactical Environmental Interactive Props
// ---------------------------------------------------------------------------
export function buildInteractiveProp(T, mats, spec) {
  const g = new T.Group();
  g.name = `hollow-interactive-${spec.kind}-${spec.id}`;
  g.position.set(spec.x, spec.y, spec.z);
  g.rotation.y = spec.yaw || 0;

  const intact = new T.Group();
  intact.name = 'intact';
  const batch = new SculptBatch(T, 'interactive');

  if (spec.kind === 'powder-cask') {
    // Iron Warren: 1891 black-powder & lamp-oil keg with chipped hazard red bands!
    batch.cyl(0.24, 0.24, 0.72, 10, mats.timberDark || mats.accent, 0, 0.36, 0, 0, 0, 0, 0.6);
    batch.cyl(0.265, 0.265, 0.06, 10, mats.hazardRed, 0, 0.14, 0, 0, 0, 0, 0.4);
    batch.cyl(0.265, 0.265, 0.08, 10, mats.hazardRed, 0, 0.38, 0, 0, 0, 0, 0.4);
    batch.cyl(0.265, 0.265, 0.06, 10, mats.hazardRed, 0, 0.60, 0, 0, 0, 0, 0.4);
    batch.cyl(0.055, 0.055, 0.08, 7, mats.brass, 0.08, 0.74, 0.04);
    batch.flush(intact);
    g.add(intact);
  } else if (spec.kind === 'demo-charge') {
    // Shale Warren: Spc. Mensah's armed blasting charge wedged onto a slate shelf with blinking red LED!
    batch.stone(0, 0.22, 0, 0.32, 0.24, 0.24, 41950 + spec.id, 'schist', mats.stoneTrim || mats.rock, { detail: 1, tile: 0.6 });
    batch.box(0.28, 0.34, 0.18, mats.canvas || mats.crate, 0, 0.56, 0.06, 0.08, 0, 0, 0.35);
    batch.box(0.30, 0.05, 0.20, mats.hazardYellow, 0, 0.63, 0.06, 0.08, 0, 0, 0.35);
    batch.box(0.30, 0.05, 0.20, mats.hazardYellow, 0, 0.48, 0.06, 0.08, 0, 0, 0.35);
    batch.rod([0, 0.72, 0.06], [0.06, 0.96, 0.08], 0.008, 0.008, 5, mats.iron);
    batch.flush(intact);
    const ledMat = new T.MeshStandardMaterial({ color: 0xff4428, emissive: 0xff3818, emissiveIntensity: 2.4, roughness: 0.2 });
    const led = new T.Mesh(new T.SphereGeometry(0.032, 8, 6), ledMat);
    led.position.set(0.08, 0.68, 0.16);
    intact.add(led);
    g.userData.ledMat = ledMat;
    g.add(intact);
  } else if (spec.kind === 'spore-bulb') {
    // Root Warren: Swollen taut bioluminescent fungal spore sac nestled into gnarled root cradle!
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      batch.tube([[Math.cos(a) * 0.36, 0.0, Math.sin(a) * 0.36], [Math.cos(a) * 0.24, 0.34, Math.sin(a) * 0.24], [Math.cos(a) * 0.18, 0.56, Math.sin(a) * 0.18]], 5, (u) => lerp(0.06, 0.025, u), mats.bark || mats.accent, 0.5);
    }
    batch.flush(intact);
    const bulbMat = new T.MeshStandardMaterial({
      color: 0x8ea882, emissive: 0x368452, emissiveIntensity: 0.52, roughness: 0.46, metalness: 0.0,
    });
    const bulb = new T.Mesh(new T.SphereGeometry(0.30, 10, 8), bulbMat);
    bulb.scale.set(1.0, 1.25, 1.0);
    bulb.position.y = 0.44;
    intact.add(bulb);
    g.userData.bulbMat = bulbMat;
    g.userData.bulb = bulb;
    g.add(intact);
  } else if (spec.kind === 'flare-pack') {
    // Wet Warren: Battered PGB fuel jerrycan + clipped orange emergency chemical flare pack resting on a stone ledge!
    batch.stone(0, 0.26, 0, 0.44, 0.28, 0.38, 41960 + spec.id, 'basalt', mats.stoneTrim || mats.rock, { detail: 1, tile: 0.7 });
    batch.box(0.28, 0.42, 0.16, mats.hazardRed, -0.08, 0.68, 0, 0, 0.22, 0.04, 0.4);
    batch.cyl(0.032, 0.032, 0.06, 6, mats.brass, -0.14, 0.91, 0);
    batch.cyl(0.042, 0.042, 0.28, 7, mats.rangerJacket, 0.14, 0.63, 0.08, 0.15, 0, -0.22);
    batch.flush(intact);
    const tipMat = new T.MeshBasicMaterial({ color: 0xffb84a, toneMapped: false });
    const tip = new T.Mesh(new T.SphereGeometry(0.038, 7, 6), tipMat);
    tip.position.set(0.18, 0.77, 0.10);
    intact.add(tip);
    g.add(intact);
  } else if (spec.kind === 'pitch-brazier') {
    // Hill Warren: Ancient forged-iron tripod pitch cauldron packed with resinous charcoal — lightable!
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.3;
      batch.rod([Math.cos(a) * 0.34, 0, Math.sin(a) * 0.34], [Math.cos(a) * 0.22, 0.88, Math.sin(a) * 0.22], 0.025, 0.030, 6, mats.iron);
    }
    batch.cyl(0.34, 0.22, 0.28, 10, mats.ironRust, 0, 0.92, 0);
    batch.torus(0.34, 0.028, 5, 12, Math.PI * 2, mats.iron, 0, 1.05, 0, Math.PI / 2, 0, 0);
    batch.stone(0, 1.03, 0, 0.26, 0.10, 0.26, 41980 + spec.id, 'basalt', mats.crateDark, { detail: 1, tile: 0.4 });
    batch.flush(intact);
    // Unlit vs lit organic multi-tongue flickering flame cluster + glowing coal bed!
    const fireGrp = new T.Group();
    fireGrp.name = 'brazier-fire';
    fireGrp.visible = false;
    const emberMat = new T.MeshStandardMaterial({
      color: 0x3b1808, emissive: 0xff5a14, emissiveIntensity: 2.2, roughness: 0.82, metalness: 0.0,
    });
    const emberBed = new T.Mesh(new T.CylinderGeometry(0.25, 0.20, 0.07, 10), emberMat);
    emberBed.position.y = 1.07;
    fireGrp.add(emberBed);
    // Sculpted glowing coal chunks on the ember bed
    for (let k = 0; k < 5; k++) {
      const ca = (k / 5) * Math.PI * 2 + 0.3;
      const coal = new T.Mesh(new T.SphereGeometry(0.065, 6, 5), emberMat);
      coal.scale.set(1.2, 0.65, 0.9);
      coal.position.set(Math.cos(ca) * 0.11, 1.11, Math.sin(ca) * 0.11);
      fireGrp.add(coal);
    }
    const flameCore = new T.Group();
    flameCore.position.y = 1.08;
    const fMat = mats.brazierFlame || new T.MeshBasicMaterial({ color: 0xffa83c, transparent: true, opacity: 0.88, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
    // 4 overlapping crossed + offset organic flame tongues (never a low-poly orange traffic cone!)
    const tongues = [
      { w: 0.56, h: 0.88, x: 0, z: 0, ry: 0.0, rx: 0.04 },
      { w: 0.56, h: 0.84, x: 0, z: 0, ry: Math.PI * 0.5, rx: -0.04 },
      { w: 0.44, h: 0.68, x: 0.06, z: -0.04, ry: Math.PI * 0.25, rx: 0.08 },
      { w: 0.42, h: 0.64, x: -0.06, z: 0.05, ry: -Math.PI * 0.25, rx: -0.07 },
    ];
    for (const tg of tongues) {
      const m = new T.Mesh(new T.PlaneGeometry(tg.w, tg.h), fMat);
      m.position.set(tg.x, tg.h * 0.46, tg.z);
      m.rotation.set(tg.rx, tg.ry, 0);
      flameCore.add(m);
    }
    fireGrp.add(flameCore);
    intact.add(fireGrp);
    g.userData.fireGrp = fireGrp;
    g.userData.flameCore = flameCore;
    g.add(intact);
  }

  g.userData.spec = spec;
  g.userData.intact = intact;
  g.userData.used = false;
  g.userData.setUsed = (on) => {
    g.userData.used = !!on;
    if (spec.kind === 'pitch-brazier') {
      if (g.userData.fireGrp) g.userData.fireGrp.visible = !!on;
    } else {
      intact.visible = !on;
    }
  };
  return g;
}

// ---------------------------------------------------------------------------
// Hero Deep Set Pieces (All 5 Warrens — rich silhouettes, zero Lego blocks!)
// ---------------------------------------------------------------------------
export function buildHeroSetPiece(T, group, plan, theme, mats, floorY, C, extraSolids) {
  const set = plan.points.set;
  const y3 = floorY(3);
  const rnd = mulberry32(hashStr('hollows-hero-set:' + theme));
  const batch = new SculptBatch(T, 'setpiece-' + theme);

  if (theme === 'root') {
    // THE CLIMBERS' KNOT: sprawling cathedral tangle of ancient strangler roots & fused husks overhead!
    const roofY = y3 + 7.5;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + rnd() * 0.35;
      const rOut = 2.6 + rnd() * 3.4;
      const sag = 1.3 + rnd() * 1.4;
      batch.tube([
        [set.x + Math.cos(a) * rOut, roofY + 0.1, set.z + Math.sin(a) * rOut],
        [set.x + Math.cos(a + 0.3) * (rOut * 0.55), roofY - sag * 0.75, set.z + Math.sin(a + 0.3) * (rOut * 0.55)],
        [set.x + (rnd() - 0.5) * 1.4, roofY - sag, set.z + (rnd() - 0.5) * 1.4],
      ], 6, (u) => lerp(0.18, 0.08, u), k % 2 ? mats.bark : mats.barkDark, 0.9);
    }
    // Knotted organic central root mass & tangled bone/cocoon bulges up in the canopy
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      batch.stone(
        set.x + Math.cos(a) * (0.6 + rnd() * 0.9),
        roofY - 1.15 - rnd() * 0.65,
        set.z + Math.sin(a) * (0.6 + rnd() * 0.9),
        0.52 + rnd() * 0.35, 0.48 + rnd() * 0.32, 0.50 + rnd() * 0.30,
        42100 + k * 13, 'granite', k % 3 === 0 ? mats.husk : mats.barkDark, { detail: 1, tile: 0.7 }
      );
    }
    // Woodland shelf fungi ringing the outer base roots (NOT neon mint discs!)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.4;
      batch.shelfFungus(set.x + Math.cos(a) * 4.8, y3 + 0.65 + rnd() * 0.9, set.z + Math.sin(a) * 4.8, -a, 4, rnd, mats.fungusCap, mats.fungusGlow, 1.1);
    }
    batch.boneCluster(set.x + 1.4, y3, set.z - 1.2, rnd, mats.bone, { skull: true, count: 5 });
  } else if (theme === 'shale') {
    // THE SHALE FLANKERS: dramatic twin cleaved-slate ambush clefts oriented strictly perpendicular
    // to the ramp->Rune-Door axis so they ALWAYS flank left & right with a 100% clear hero sightline!
    const rd = plan.doors && plan.doors.rune;
    const ddx = rd ? (rd.x - set.x) : 0;
    const ddz = rd ? (rd.z - set.z) : 1;
    const ddl = Math.hypot(ddx, ddz) || 1;
    const fx = ddx / ddl, fz = ddz / ddl; // toward Rune Door
    const sx = fz, sz = -fx;              // left/right across the Deep
    const baseYaw = Math.atan2(fx, fz);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const sideOff = s * (5.3 + (k === 1 ? 0.35 : -0.15));
        const fwdOff = (k - 1) * 2.55;
        const bx = set.x + sx * sideOff + fx * fwdOff;
        const bz = set.z + sz * sideOff + fz * fwdOff;
        const bh = 4.6 + (k === 1 ? 1.4 : rnd() * 0.9);
        batch.blade(bx, y3 + bh * 0.46, bz, 0.72, bh, 1.85, 42200 + k * 23 + s * 7, 'schist', k === 1 ? mats.schistLight : mats.accent, {
          rx: 0.04, ry: baseYaw + s * 0.18 + (rnd() - 0.5) * 0.22, rz: -s * 0.12, taperTop: 0.20, detail: 1, tile: 1.2,
        });
        // Shattered talus scree pile beneath each fin
        batch.stone(bx - sx * s * 0.45, y3 + 0.16, bz - sz * s * 0.45, 0.55, 0.20, 0.62, 42240 + k * 9 + s, 'schist', mats.schistLight, { detail: 1, tile: 0.7 });
      }
    }
    // Central fractured slate impact crater & spilled PGB brass/bones
    batch.boneCluster(set.x - sx * 1.2, y3, set.z - sz * 1.2, rnd, mats.bone, { skull: true, count: 5 });
  } else if (theme === 'iron') {
    // COLDWATER IRON WORKS MINE CREW: narrow-gauge rails, detailed steel ore cart loaded with red ore, timber cable winch!
    const railLen = C * 1.75;
    for (const s of [-0.46, 0.46]) {
      batch.box(0.075, 0.085, railLen, mats.iron, set.x + s, y3 + 0.055, set.z, 0, 0, 0, 0.6);
    }
    for (let k = -5; k <= 5; k++) {
      batch.box(1.42, 0.07, 0.19, mats.timber || mats.accent, set.x, y3 + 0.032, set.z + k * 1.12, 0, (rnd() - 0.5) * 0.04, 0, 0.7);
    }
    // Detailed riveted steel ore cart (angled hopper bed + 4 flanged wheels + ore pile!)
    const cx = set.x + 0.15, cz = set.z + 1.65, cy = y3 + 0.10;
    const tiltZ = 0.14;
    batch.box(1.02, 0.12, 1.56, mats.iron, cx, cy + 0.24, cz, 0, 0.08, tiltZ, 0.6); // chassis
    batch.box(1.16, 0.58, 0.07, mats.ironRust, cx, cy + 0.56, cz + 0.78, 0.18, 0.08, tiltZ, 0.6); // front wall
    batch.box(1.16, 0.58, 0.07, mats.ironRust, cx, cy + 0.56, cz - 0.78, -0.18, 0.08, tiltZ, 0.6); // back wall
    batch.box(0.07, 0.58, 1.64, mats.ironRust, cx - 0.56, cy + 0.56, cz, 0, 0.08, tiltZ + 0.18, 0.6); // left hopper wall
    batch.box(0.07, 0.58, 1.64, mats.ironRust, cx + 0.56, cy + 0.56, cz, 0, 0.08, tiltZ - 0.18, 0.6); // right hopper wall
    for (const wx of [-0.46, 0.46]) for (const wz of [-0.48, 0.48]) {
      batch.cyl(0.18, 0.18, 0.07, 10, mats.iron, cx + wx, cy + 0.15, cz + wz, 0, 0, Math.PI / 2);
    }
    // Mound of red-ochre ironstone ore chunks overflowing the cart!
    for (let k = 0; k < 5; k++) {
      batch.stone(cx + (rnd() - 0.5) * 0.55, cy + 0.68 + rnd() * 0.18, cz + (rnd() - 0.5) * 0.85, 0.26 + rnd() * 0.12, 0.22 + rnd() * 0.10, 0.26 + rnd() * 0.12, 42310 + k * 7, 'granite', mats.ore || mats.rock, { detail: 1, tile: 0.5 });
    }
    // Heavy timber-framed geared cable winch off to the side
    const wx0 = set.x + 4.1, wz0 = set.z - 3.4;
    for (const sx of [-0.72, 0.72]) {
      batch.beam([wx0 + sx, y3, wz0 - 0.55], [wx0 + sx, y3 + 1.25, wz0], 0.14, 0.14, mats.timber || mats.accent);
      batch.beam([wx0 + sx, y3, wz0 + 0.55], [wx0 + sx, y3 + 1.25, wz0], 0.14, 0.14, mats.timber || mats.accent);
    }
    batch.cyl(0.38, 0.38, 1.26, 12, mats.timberDark || mats.accent, wx0, y3 + 0.92, wz0, 0, 0, Math.PI / 2);
    batch.cyl(0.48, 0.48, 0.08, 12, mats.iron, wx0 - 0.66, y3 + 0.92, wz0, 0, 0, Math.PI / 2);
    batch.cyl(0.48, 0.48, 0.08, 12, mats.iron, wx0 + 0.66, y3 + 0.92, wz0, 0, 0, Math.PI / 2);
    batch.rod([wx0, y3 + 0.92, wz0], [cx, cy + 0.45, cz - 0.78], 0.018, 0.018, 5, mats.ironRust); // taut haul cable
  } else if (theme === 'wet') {
    // THE DROWNED: sunken stepped dark basalt basin (NO double-plane Z-fighting water disc!)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const r = 4.15;
      batch.stone(
        set.x + Math.cos(a) * r, y3 + 0.44 + (k % 2 ? 0.08 : 0), set.z + Math.sin(a) * r,
        0.58, 0.28 + (k % 3) * 0.08, 0.46, 42400 + k * 11, 'basalt', mats.wetBasalt || mats.rock,
        { rot: [0, -a, 0], detail: 1, tile: 0.7 }
      );
      if (k % 4 === 0) {
        // Broken half-submerged columnar basalt marker pillars around the pool rim
        batch.cyl(0.28, 0.36, 1.35 + rnd() * 0.9, 6, mats.wetBasalt || mats.accent, set.x + Math.cos(a) * (r + 0.45), y3 + 0.75, set.z + Math.sin(a) * (r + 0.45), (rnd() - 0.5) * 0.14, a, (rnd() - 0.5) * 0.14);
      }
    }
    // Bones & skulls washed up onto the stone basin rim
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.7;
      batch.boneCluster(set.x + Math.cos(a) * 4.2, y3 + 0.56, set.z + Math.sin(a) * 4.2, rnd, mats.bone, { skull: k === 0, count: 4 });
    }
  } else if (theme === 'hill') {
    // THE BARROW KING: grand stepped megalithic stone bier + carved court sarcophagi + bone offerings!
    const stMat = mats.barrowStone || mats.accent;
    // Two-tier stepped stone dais
    batch.box(3.8, 0.18, 2.4, stMat, set.x, y3 + 0.09, set.z, 0, 0, 0, 1.1);
    batch.box(3.2, 0.18, 1.9, stMat, set.x, y3 + 0.27, set.z, 0, 0, 0, 1.0);
    // Heavy carved bier pedestal & beveled overhanging capstone slab
    batch.box(2.55, 0.62, 1.28, mats.rock, set.x, y3 + 0.67, set.z, 0, 0, 0, 0.95);
    batch.box(2.86, 0.16, 1.56, stMat, set.x, y3 + 1.04, set.z, 0, 0, 0, 1.0);
    // Iron-banded funeral bindings across the bier (Art Direction §2: iron binds the uncanny!)
    for (const sx of [-0.95, 0, 0.95]) {
      batch.box(0.08, 0.80, 1.62, mats.ironRust, set.x + sx, y3 + 0.74, set.z, 0, 0, 0, 0.4);
    }
    // Weathered ceremonial offering sword/shield & skull laid on the bier
    batch.box(0.09, 0.03, 1.15, mats.ironRust, set.x + 0.15, y3 + 1.14, set.z, 0, 1.48, 0, 0.4);
    batch.box(0.32, 0.04, 0.06, mats.iron, set.x - 0.18, y3 + 1.15, set.z, 0, 1.48, 0, 0.4);
    batch.boneCluster(set.x + 0.65, y3 + 1.12, set.z + 0.15, rnd, mats.bone, { skull: true, count: 3 });

    // Six stepped court tombs circling the Deep perimeter (wide radius 5.3 m — clear of player fighting ring!)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.25;
      const tx = set.x + Math.cos(a) * 5.35, tz = set.z + Math.sin(a) * 5.35;
      batch.box(1.75, 0.44, 0.76, stMat, tx, y3 + 0.22, tz, 0, -a, 0, 0.85);
      batch.box(1.90, 0.10, 0.88, mats.rock, tx, y3 + 0.49, tz, 0, -a, 0, 0.85);
      batch.box(0.06, 0.56, 0.90, mats.ironRust, tx, y3 + 0.28, tz, 0, -a, 0, 0.4);
      if (k % 2 === 0) batch.boneCluster(tx - Math.cos(a) * 0.68, y3, tz - Math.sin(a) * 0.68, rnd, mats.bone, { skull: k === 0, count: 3 });
    }
  }

  // Every warren: realistic anatomical bone clusters by sleepers' alcoves (replacing white sticks!)
  for (let i = 0; i < plan.points.sleepers.length; i++) {
    const p = plan.points.sleepers[i];
    if (rnd() < 0.55) {
      batch.boneCluster(p.x + (rnd() - 0.5) * 0.55, p.y, p.z + (rnd() - 0.5) * 0.55, rnd, mats.bone, { skull: i % 4 === 0, count: 3 });
    }
  }

  batch.flush(group);
  void extraSolids;
}
