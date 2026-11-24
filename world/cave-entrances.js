// world/cave-entrances.js — AG-412: Bespoke architectural framing, geological grounding,
// environmental storytelling vignettes, and subtle dusk/night atmosphere for all six Grave Shift caves.
//
// Each cave tells its own story grounded in docs/story.md, docs/specs/hollows.md,
// docs/world-design.md (the 15 spatial rules), docs/art-direction.md (the 4 families),
// and docs/asset-principles.md (silhouette first, primary/secondary/tertiary forms, honest PBR).
//
// Pure ES module depending only on the passed THREE namespace (100% Node & browser compatible).
// Never touches Math.random(), never changes cave positions/hills/colliders, keeps c.group untouched
// (t41 <60k tri budget), keeps Colossus central lane clear (t42), keeps rMax <214 (t42),
// and syncs all new First People carvings with firstPeople.glowMats (t153).

import { buildCompactStoneGeometry, buildMenhirGeometry, projectStoneBoxUV } from './rock-geometry.js';
import { getRockTextureLibrary, applyRockPBR } from './rock-textures.js';
import {
  getCaveEntrancePBR,
  makeColdwaterLintelTexture,
  makeStenciledPlacardTexture,
  makeMarrowHandprintTexture,
  makeSeismographScreenTexture,
  makeBarrowFriezeTextures,
  makeObeliskRuneTexture,
  makeSeepPoolAlphaTexture,
  makeRustBloomTexture,
} from './cave-entrance-textures.js';
import { GROOVE } from './first-people.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Per-material static geometry batcher (clean UVs, normals, shadows, low draw calls)
// ---------------------------------------------------------------------------
class BatchBuilder {
  constructor(T, namePrefix) {
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

  _bucket(mat, tile = 1.0, castShadow = true) {
    let b = this.buckets.get(mat);
    if (!b) {
      b = { mat, tile, castShadow, pos: [], nrm: [], uv: [] };
      this.buckets.set(mat, b);
    }
    return b;
  }

  pushGeo(geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, quat = null, tile = 1.0, keepUV = false, castShadow = true } = {}) {
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
    if (!keepUV || !g.attributes.uv) {
      projectStoneBoxUV(g, tile);
    }
    const b = this._bucket(mat, tile, castShadow);
    const P = g.attributes.position.array;
    const N = g.attributes.normal.array;
    const U = g.attributes.uv.array;
    for (let i = 0; i < P.length; i++) b.pos.push(P[i]);
    for (let i = 0; i < N.length; i++) b.nrm.push(N[i]);
    for (let i = 0; i < U.length; i++) b.uv.push(U[i]);
    g.dispose();
  }

  box(w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0, tile = 1.0) {
    const geo = new this.T.BoxGeometry(w, h, d);
    this.pushGeo(geo, mat, { x, y, z, rx, ry, rz, tile });
    geo.dispose();
  }

  cyl(rt, rb, h, segs, mat, x, y, z, rx = 0, ry = 0, rz = 0, tile = 1.0) {
    const geo = new this.T.CylinderGeometry(rt, rb, h, segs);
    this.pushGeo(geo, mat, { x, y, z, rx, ry, rz, tile });
    geo.dispose();
  }

  torus(r, tube, rSegs, tSegs, arc, mat, x, y, z, rx = 0, ry = 0, rz = 0, tile = 0.6) {
    const geo = new this.T.TorusGeometry(r, tube, rSegs, tSegs, arc);
    this.pushGeo(geo, mat, { x, y, z, rx, ry, rz, tile });
    geo.dispose();
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
    const geo = new T.BoxGeometry(w, len, d);
    this.pushGeo(geo, mat, { x: mid.x, y: mid.y, z: mid.z, quat: q, tile });
    geo.dispose();
  }

  rod(a, b, rTop, rBot, segs, mat, tile = 0.8) {
    const T = this.T;
    const va = new T.Vector3(a[0], a[1], a[2]);
    const vb = new T.Vector3(b[0], b[1], b[2]);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    if (len < 1e-4) return;
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const q = new T.Quaternion().setFromUnitVectors(this._up, dir.normalize());
    const geo = new T.CylinderGeometry(rTop, rBot, len, segs);
    this.pushGeo(geo, mat, { x: mid.x, y: mid.y, z: mid.z, quat: q, tile });
    geo.dispose();
  }

  // Smooth organic tube along 3D polyline (twisted roots, braided cables, vines, iron chains)
  tube(pts, segs, radiusFn, mat, tile = 0.9) {
    if (!pts || pts.length < 2) return;
    const b = this._bucket(mat, tile, true);
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
    const geo = buildCompactStoneGeometry(this.T, { rx, ry, rz, detail, seed, style, uvTile: tile });
    this.pushGeo(geo, mat, { x: cx, y: cy, z: cz, rx: rot[0], ry: rot[1], rz: rot[2], tile, keepUV: true });
    geo.dispose();
  }

  // Tapered sharp-crested cleaved rock blade (Shale fins, Marrow karst ribs, Wet basalt columns)
  blade(cx, cy, cz, w, h, d, seed, style, mat, { rx = 0, ry = 0, rz = 0, taperTop = 0.28, detail = 1, tile = 1.1 } = {}) {
    const geo = buildCompactStoneGeometry(this.T, { rx: w * 0.5, ry: h * 0.5, rz: d * 0.5, detail, seed, style, uvTile: tile });
    const P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const py = P.getY(i);
      const u = clamp((py + h * 0.5) / Math.max(0.1, h), 0, 1);
      const pinch = lerp(1.08, taperTop, u * u);
      const skew = u * u * 0.14 * w * ((seed & 1) ? 1 : -1);
      P.setX(i, P.getX(i) * pinch + skew);
      P.setZ(i, P.getZ(i) * lerp(1.04, 0.44, u));
    }
    P.needsUpdate = true;
    this.pushGeo(geo, mat, { x: cx, y: cy, z: cz, rx, ry, rz, tile });
    geo.dispose();
  }

  menhir(cx, cy, cz, w, h, t, rnd, mat, { rx = 0, ry = 0, rz = 0, taper = 0.26, crown = 0.2, flatFront = true, tile = 1.0 } = {}) {
    const geo = buildMenhirGeometry(this.T, w, h, t, rnd, { taper, crown, jitter: 0.04, chipStrength: 0.045, flatFront });
    this.pushGeo(geo, mat, { x: cx, y: cy, z: cz, rx, ry, rz, tile });
    geo.dispose();
  }

  flush(targetGroup) {
    const T = this.T;
    let idx = 0;
    for (const [, b] of this.buckets) {
      if (!b.pos.length) continue;
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(b.pos, 3));
      geo.setAttribute('normal', new T.Float32BufferAttribute(b.nrm, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(b.uv, 2));
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      const mesh = new T.Mesh(geo, b.mat);
      mesh.name = `${this.namePrefix}-batch-${idx++}`;
      mesh.castShadow = b.castShadow;
      mesh.receiveShadow = true;
      targetGroup.add(mesh);
    }
  }
}

// ---------------------------------------------------------------------------
// Shared Material Palette (cached per THREE instance)
// ---------------------------------------------------------------------------
const MAT_CACHE = new WeakMap();

function getMaterials(T) {
  if (MAT_CACHE.has(T)) return MAT_CACHE.get(T);
  const pbr = getCaveEntrancePBR(T);
  const rockLib = getRockTextureLibrary(T);
  const mkRock = (key, color, { rough = 0.92, metal = 0.03, normalMul = 1.05 } = {}) => {
    const mat = new T.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    if (rockLib && rockLib[key]) applyRockPBR(mat, rockLib[key], { selfColored: false, normalMul });
    return mat;
  };
  const m = {
    bark: new T.MeshStandardMaterial(pbr.gnarledBark.opts({ color: 0xcabca8, normalScale: 1.25 })),
    barkDark: new T.MeshStandardMaterial(pbr.gnarledBark.opts({ color: 0x8a7c6a, normalScale: 1.3 })),
    timber: new T.MeshStandardMaterial(pbr.creosoteTimber.opts({ color: 0xd4c5ac, normalScale: 1.15 })),
    timberDark: new T.MeshStandardMaterial(pbr.creosoteTimber.opts({ color: 0x94846e, normalScale: 1.2 })),
    wetTimber: new T.MeshStandardMaterial(pbr.wetTimber.opts({ color: 0xa2a596, normalScale: 1.15 })),
    iron: new T.MeshStandardMaterial(pbr.forgedIron.opts({ color: 0xdad6d0, normalScale: 1.05 })),
    ironRust: new T.MeshStandardMaterial(pbr.forgedIron.opts({ color: 0xc8a48c, normalScale: 1.15 })),
    pgbOlive: new T.MeshStandardMaterial(pbr.pgbOliveMetal.opts({ color: 0xc9ceb8, normalScale: 1.0 })),
    pgbDark: new T.MeshStandardMaterial(pbr.pgbOliveMetal.opts({ color: 0x72786e, normalScale: 1.0 })),
    pgbHazard: new T.MeshStandardMaterial(pbr.pgbOliveMetal.opts({ color: 0xd4a438, normalScale: 0.9 })),
    barrowStone: new T.MeshStandardMaterial(pbr.barrowStone.opts({ color: 0xdad5c6, normalScale: 1.15 })),
    marrowChalk: new T.MeshStandardMaterial(pbr.marrowChalk.opts({ color: 0xebe6da, normalScale: 1.1 })),
    bone: new T.MeshStandardMaterial(pbr.weatheredBone.opts({ color: 0xdfd8c4, normalScale: 0.95 })),
    canvas: new T.MeshStandardMaterial(pbr.tarpCanvas.opts({ color: 0x9b9276, normalScale: 0.95 })),
    canvasOrange: new T.MeshStandardMaterial(pbr.tarpCanvas.opts({ color: 0xc46b38, normalScale: 0.9 })),
    canvasYellow: new T.MeshStandardMaterial(pbr.tarpCanvas.opts({ color: 0xbda24a, normalScale: 0.9 })),
    cable: new T.MeshStandardMaterial({ color: 0x26282a, roughness: 0.78, metalness: 0.08 }),
    demoWire: new T.MeshStandardMaterial({ color: 0xc8742a, roughness: 0.65, metalness: 0.05 }),
    brass: new T.MeshStandardMaterial({ color: 0xb89c52, roughness: 0.42, metalness: 0.72 }),
    ore: mkRock('ironstone', 0x86604c, { rough: 0.88, metal: 0.14, normalMul: 1.2 }),
    sandstone: mkRock('sandstone', 0x8d7b64, { rough: 0.92, metal: 0.02, normalMul: 1.1 }),
    schist: mkRock('schist', 0xa6b0b9, { rough: 0.86, metal: 0.06, normalMul: 1.2 }),
    schistLight: mkRock('schist', 0xc4ccd4, { rough: 0.84, metal: 0.06, normalMul: 1.15 }),
    wetBasalt: mkRock('wetBasalt', 0x6c7e7a, { rough: 0.36, metal: 0.04, normalMul: 1.15 }),
    granite: mkRock('granite', 0xb3afa2, { rough: 0.9, metal: 0.03, normalMul: 1.1 }),
    fieldstone: mkRock('fieldstone', 0xa6a090, { rough: 0.92, metal: 0.02, normalMul: 1.05 }),
    monolith: mkRock('monolith', 0xc2beb0, { rough: 0.9, metal: 0.02, normalMul: 1.1 }),
    limestone: mkRock('limestone', 0xd6d2c6, { rough: 0.9, metal: 0.02, normalMul: 1.1 }),
    moss: new T.MeshStandardMaterial({ color: 0x3b582c, roughness: 0.94, metalness: 0.0 }),
    mossWet: new T.MeshStandardMaterial({ color: 0x294b2d, roughness: 0.48, metalness: 0.02 }),
    ash: new T.MeshStandardMaterial({ color: 0x2d2a27, roughness: 0.98, metalness: 0.0 }),
    // Restrained eerie woodland conk mushrooms (natural olive-cream cap + subtle muted sage gill glow)
    fungusCap: new T.MeshStandardMaterial({ color: 0x9c9274, roughness: 0.74, metalness: 0.01 }),
    fungusGlow: new T.MeshStandardMaterial({
      color: 0x9eb892, emissive: 0x3f9668, emissiveIntensity: 0.42, roughness: 0.58, metalness: 0.0,
    }),
    amberBulb: new T.MeshStandardMaterial({
      color: 0xffe4b0, emissive: 0xff9a38, emissiveIntensity: 1.5, roughness: 0.25, metalness: 0.0,
    }),
    seepWaterNormal: pbr.seepWaterNormal || null,
  };
  MAT_CACHE.set(T, m);
  return m;
}

// ---------------------------------------------------------------------------
// Shared Reusable Storytelling Prop Assembly Helpers
// ---------------------------------------------------------------------------
function addFieldTripodLamp(T, batch, storyGroup, mats, x, y, z, yaw, aimPitch, height, opts = {}) {
  const { lights, worldOf, color = 0xff9b3e, intensity = 3.0, dist = 16, phase = 0, flicker = 0.08 } = opts;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const toL = (lx, ly, lz) => [x + lx * cy + lz * sy, y + ly, z - lx * sy + lz * cy];

  const hubY = height * 0.58;
  for (let k = 0; k < 3; k++) {
    const a = yaw + (k / 3) * Math.PI * 2 + 0.35;
    const spread = height * 0.42;
    batch.rod(
      [x + Math.cos(a) * spread, y - 0.12, z + Math.sin(a) * spread],
      [x, y + hubY, z],
      0.018, 0.022, 6, mats.pgbDark, 0.5
    );
    batch.rod(
      [x + Math.cos(a) * spread * 0.52, y + hubY * 0.46, z + Math.sin(a) * spread * 0.52],
      [x, y + hubY * 0.38, z],
      0.012, 0.012, 5, mats.iron, 0.5
    );
  }
  batch.rod([x, y + hubY * 0.35, z], [x, y + height, z], 0.020, 0.026, 7, mats.pgbOlive, 0.5);
  batch.cyl(0.042, 0.042, 0.07, 8, mats.iron, x, y + hubY, z);

  // Angled floodlight housing + hood + glowing lens facing forward along yaw (+Z in lamp space)
  const head = toL(0, height + 0.06, 0.05);
  batch.box(0.32, 0.22, 0.16, mats.pgbHazard, head[0], head[1], head[2], aimPitch, yaw, 0, 0.4);
  batch.box(0.35, 0.03, 0.22, mats.pgbDark, ...toL(0, height + 0.17, 0.09), aimPitch, yaw, 0, 0.4);
  const lens = new T.Mesh(new T.PlaneGeometry(0.25, 0.16), mats.amberBulb.clone());
  lens.name = 'cave-lamp-lens';
  const lPos = toL(0, height + 0.05, 0.138);
  lens.position.set(lPos[0], lPos[1], lPos[2]);
  lens.rotation.order = 'YXZ';
  lens.rotation.set(aimPitch, yaw, 0);
  storyGroup.add(lens);

  if (lights && worldOf) {
    // Project pooled light 1.4m ahead of the lens so it bathes the cave face/props cleanly!
    const wp = worldOf(head[0] + sy * 1.4, head[1] + 0.15, head[2] + cy * 1.4);
    lights.push({ wx: wp[0], wy: wp[1], wz: wp[2], color, intensity, dist, phase, flicker, lensMat: lens.material });
  }
}

function addHangingMineLantern(T, batch, storyGroup, mats, x, y, z, opts = {}) {
  const { lights, worldOf, color = 0xff9230, intensity = 2.8, dist = 14, phase = 1.2 } = opts;
  batch.torus(0.06, 0.011, 5, 12, Math.PI, mats.iron, x, y + 0.24, z, 0, 0, 0);
  batch.cyl(0.065, 0.115, 0.07, 8, mats.ironRust, x, y + 0.19, z);
  batch.cyl(0.105, 0.125, 0.06, 8, mats.ironRust, x, y - 0.14, z);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    batch.rod(
      [x + Math.cos(a) * 0.095, y - 0.11, z + Math.sin(a) * 0.095],
      [x + Math.cos(a) * 0.095, y + 0.16, z + Math.sin(a) * 0.095],
      0.008, 0.008, 5, mats.iron
    );
  }
  const glass = new T.Mesh(new T.CylinderGeometry(0.068, 0.062, 0.21, 10), mats.amberBulb.clone());
  glass.name = 'mine-lantern-glass';
  glass.position.set(x, y + 0.025, z);
  storyGroup.add(glass);

  if (lights && worldOf) {
    const wp = worldOf(x, y + 0.08, z + 0.35);
    lights.push({ wx: wp[0], wy: wp[1], wz: wp[2], color, intensity, dist, phase, flicker: 0.16, lensMat: glass.material });
  }
}

function addPgbCase(batch, mats, x, y, z, yaw, { w = 0.68, h = 0.34, d = 0.44, open = false, mat = null } = {}) {
  const m = mat || mats.pgbOlive;
  batch.box(w, h, d, m, x, y + h * 0.5 - 0.02, z, 0, yaw, 0, 0.6);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const loc = (lx, ly, lz) => [x + lx * cy + lz * sy, y + ly, z - lx * sy + lz * cy];
  for (const sx of [-1, 1]) {
    const p = loc(sx * (w * 0.48), h * 0.5, 0);
    batch.box(0.04, h * 0.92, d * 0.94, mats.pgbDark, p[0], p[1], p[2], 0, yaw, 0, 0.4);
    const l = loc(sx * (w * 0.26), h * 0.68, d * 0.51);
    batch.box(0.05, 0.08, 0.03, mats.iron, l[0], l[1], l[2], 0, yaw, 0, 0.4);
  }
  if (open) {
    const lp = loc(0, h + 0.14, -d * 0.42);
    batch.box(w * 0.98, 0.06, d * 0.96, m, lp[0], lp[1], lp[2], -1.22, yaw, 0, 0.6);
  }
}

function addBlinkingLed(T, storyGroup, leds, x, y, z, colorHex = 0xe83a24, period = 1.45, phase = 0) {
  const mat = new T.MeshStandardMaterial({
    color: colorHex, emissive: colorHex, emissiveIntensity: 2.2, roughness: 0.25, metalness: 0.0,
  });
  const led = new T.Mesh(new T.SphereGeometry(0.026, 8, 6), mat);
  led.name = 'pgb-sensor-led';
  led.position.set(x, y, z);
  storyGroup.add(led);
  leds.push({ mat, period, phase, baseIntensity: 2.2 });
}

function addHorseshoe(batch, mats, x, y, z, rx = 0, ry = 0, rz = 0, scale = 1.0) {
  batch.torus(0.085 * scale, 0.017 * scale, 5, 12, Math.PI * 1.28, mats.ironRust, x, y, z, rx, ry, rz + Math.PI * 0.86, 0.35);
}

// Nested woodland shelf-fungus cluster hugging tightly against bark/root curvature
function addShelfFungusCluster(batch, mats, x, y, z, yaw, count, rnd, scale = 1.0) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  for (let i = 0; i < count; i++) {
    const r = (0.10 + rnd() * 0.13) * scale;
    const dy = (i - (count - 1) * 0.5) * 0.105 * scale;
    const dx = (rnd() - 0.5) * 0.18 * scale;
    const px = x + dx * cy;
    const pz = z - dx * sy;
    const py = y + dy;
    batch.cyl(r * 0.94, r * 0.72, 0.028 * scale, 7, mats.fungusCap, px, py + 0.010 * scale, pz, 0.12, yaw + (rnd() - 0.5) * 0.4, 0, 0.4);
    batch.cyl(r * 0.72, r * 0.52, 0.018 * scale, 7, mats.fungusGlow, px, py - 0.008 * scale, pz, 0.12, yaw + (rnd() - 0.5) * 0.4, 0, 0.4);
  }
}

// Standing monolith + skin-tight carved First People rune band sharing ONE rotated parent group
// (guarantees zero detachment or offset on tapered/leaning menhirs from every camera angle!)
function addStandingMenhirWithRunes(T, targetGroup, { x, y, z, w, h, t, rx = 0.03, ry = 0, rz = 0, taper = 0.24, crown = 0.2, rnd, stoneMat, runeTex, firstPeople, name }) {
  const grp = new T.Group();
  grp.name = name;
  grp.position.set(x, y, z);
  grp.rotation.order = 'YXZ';
  grp.rotation.set(rx, ry, rz);

  const mGeo = buildMenhirGeometry(T, w, h, t, rnd, { taper, crown, jitter: 0.035, chipStrength: 0.04, flatFront: true });
  projectStoneBoxUV(mGeo, 0.95);
  const stone = new T.Mesh(mGeo, stoneMat);
  stone.name = `${name}-body`;
  stone.castShadow = true;
  stone.receiveShadow = true;
  grp.add(stone);

  if (runeTex) {
    const rMat = new T.MeshBasicMaterial({
      color: GROOVE,
      map: runeTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const cy = h * 0.50;
    const zFace = (t * 0.5) * (1 - taper * Math.pow(cy / h, 2)) + 0.016;
    const strip = new T.Mesh(new T.PlaneGeometry(w * 0.56, h * 0.66), rMat);
    strip.name = `${name}-glyphs`;
    strip.position.set(0, cy, zFace);
    grp.add(strip);
    if (firstPeople && Array.isArray(firstPeople.glowMats)) firstPeople.glowMats.push(rMat);
  }

  targetGroup.add(grp);
  return grp;
}

function addPlacardMesh(T, targetGroup, tex, fallbackHex, w, h, d, x, y, z, rx, ry, rz, name, edgeMat) {
  const faceMat = tex
    ? new T.MeshStandardMaterial({ color: 0xffffff, map: tex, roughness: 0.78, metalness: 0.12 })
    : new T.MeshStandardMaterial({ color: fallbackHex, roughness: 0.82, metalness: 0.12 });
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), [edgeMat, edgeMat, edgeMat, edgeMat, faceMat, edgeMat]);
  m.name = name;
  m.position.set(x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  targetGroup.add(m);
  return m;
}

// ===========================================================================
// 1. ROOT CAVE — "The Strangled Oak & Capt. Hale's Last Push"
// ===========================================================================
function dressRootCave(T, c, archBatch, storyBatch, archGrp, storyGrp, helpers) {
  const { d, rnd, gAt, lipAt, worldOf, mats, lights, leds } = helpers;
  const w = d.w, h = d.h, sk = d.skew || 0;

  // A. Sinuous Cathedral Strangler Root Buttresses hugging the arch and weaving organically into the soil!
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const tTop = Math.PI * 0.5 + s * (0.14 + k * 0.14);
      const pTop = lipAt(tTop);
      const tMid = s > 0 ? 0.36 - k * 0.08 : Math.PI - (0.36 - k * 0.08);
      const pMid = lipAt(tMid);
      const footX = s * (w + 0.35 + k * 0.58) + sk * 0.4;
      const footZ = 1.05 + k * 0.75;
      // Organic S-curved ground-hugging surface root that loops and plunges back into the earth (no rigid poles!)
      const r0 = 0.25 - k * 0.04;
      const pts = [
        [pTop[0] + s * (0.22 + k * 0.18), pTop[1] + 0.95 + k * 0.22, -1.35 - k * 0.3],
        [pTop[0] + s * (0.30 + k * 0.22), pTop[1] + 0.34, -0.25 + k * 0.08],
        [pMid[0] + s * (0.38 + k * 0.30), pMid[1] + 0.12, 0.28 + k * 0.12],
        [footX, gAt(footX, footZ) + 0.38, footZ],
      ];
      // 5 sinuous soil-hugging root segments curling gracefully into the turf
      const reach = 2.6 + k * 0.85;
      for (let step = 1; step <= 5; step++) {
        const u = step / 5;
        const wiggle = Math.sin(u * Math.PI * 1.7 + k * 1.3) * 0.55 * s;
        const lx = footX + s * u * (1.25 + k * 0.32) + wiggle;
        const lz = footZ + u * reach;
        const knee = Math.sin(u * Math.PI) * 0.18 * (1 - k * 0.18);
        const plunge = step === 5 ? -0.22 : (step === 4 ? 0.02 : knee + 0.07);
        pts.push([lx, gAt(lx, lz) + plunge, lz]);
      }
      archBatch.tube(pts, 7, (u) => r0 * lerp(1.15, 0.20, u), k === 1 ? mats.barkDark : mats.bark, 1.05);

      // Forking side rootlet diving into the mossy flank
      const fStart = pts[4];
      const fEndX = fStart[0] + s * (0.65 + rnd() * 0.5);
      const fEndZ = fStart[2] + 0.9 + rnd() * 0.6;
      const fMidX = lerp(fStart[0], fEndX, 0.5) - s * 0.18;
      const fMidZ = lerp(fStart[2], fEndZ, 0.5) + 0.12;
      archBatch.tube([
        fStart,
        [fMidX, gAt(fMidX, fMidZ) + 0.09, fMidZ],
        [fEndX, gAt(fEndX, fEndZ) - 0.14, fEndZ],
      ], 5, (u) => r0 * 0.48 * lerp(1.0, 0.18, u), mats.barkDark, 0.85);
    }

    // Warm mossy sandstone root-collar boulders locking the rock face into the soil
    const bx = s * (w + 0.88) + sk * 0.35, bz = 0.85;
    archBatch.stone(bx, gAt(bx, bz) + 0.24, bz, 0.95, 0.62, 0.85, 4121 + s * 19, 'sandstone', mats.sandstone, { rot: [0, s * 0.5, 0] });
    archBatch.stone(bx, gAt(bx, bz) + 0.64, bz, 0.65, 0.18, 0.58, 4125 + s * 11, 'river', mats.moss);
  }

  // B. Interwoven Overhead Root Brow Arch + outer gnarled hanging vine loops (strictly outside doorway void!)
  for (let k = 0; k < 2; k++) {
    const browPts = [];
    for (let i = 0; i <= 10; i++) {
      const t = lerp(0.16 * Math.PI, 0.84 * Math.PI, i / 10);
      const p = lipAt(t);
      const lift = Math.sin((i / 10) * Math.PI) * (0.30 + k * 0.24);
      browPts.push([p[0] * (1.05 + k * 0.05), p[1] + lift + 0.16, 0.22 + k * 0.22 - Math.sin((i / 10) * Math.PI) * 0.12]);
    }
    archBatch.tube(browPts, 6, (u) => 0.16 * (0.72 + 0.45 * Math.sin(u * Math.PI)), mats.bark, 1.0);
  }

  // C. Subtle Woodland Bioluminescent Shelf Fungi nestled tight into root crevices!
  const fungusSpots = [
    [-(w + 0.24), 1.55, 0.48, 0.72, 4, 0.95],
    [-(w + 0.16), 3.05, 0.36, 0.55, 3, 0.85],
    [w + 0.42 + sk * 0.3, 1.72, 0.46, -0.68, 4, 0.95],
    [w + 0.30 + sk * 0.4, 3.25, 0.34, -0.50, 3, 0.82],
    [-(w + 1.05), gAt(-(w + 1.05), 2.0) + 0.34, 2.0, 0.9, 3, 0.85],
  ];
  for (const [fx, fy, fz, fyaw, cnt, sc] of fungusSpots) {
    addShelfFungusCluster(storyBatch, mats, fx, fy, fz, fyaw, cnt, rnd, sc);
  }
  {
    const wp = worldOf(-(w + 0.15), 2.3, 0.85);
    lights.push({ wx: wp[0], wy: wp[1], wz: wp[2], color: 0x52c87e, intensity: 0.95, dist: 8.5, phase: 0.4, flicker: 0.05 });
  }

  // D. Capt. Hale's Abandoned PGB Recon Anchor (Viewer's LEFT, lx = -5.4..-2.8, lz = 1.6..6.8)
  const rx0 = -3.85, rz0 = 4.25, ry0 = gAt(rx0, rz0);
  const stakeX = -3.15, stakeZ = 2.65, stakeY = gAt(stakeX, stakeZ);
  // Warm earthy sandstone boulder (matches Root's palette!) + driven piton & mooring ring
  storyBatch.stone(stakeX - 0.15, stakeY + 0.16, stakeZ - 0.1, 0.62, 0.38, 0.56, 4129, 'sandstone', mats.sandstone);
  storyBatch.rod([stakeX, stakeY - 0.12, stakeZ], [stakeX + 0.06, stakeY + 0.72, stakeZ + 0.08], 0.036, 0.042, 7, mats.iron);
  storyBatch.torus(0.085, 0.018, 5, 12, Math.PI * 2, mats.ironRust, stakeX + 0.06, stakeY + 0.64, stakeZ + 0.09, Math.PI * 0.45, 0.4, 0);
  // Coiled spare climbing rope resting beside the piton boulder
  for (let r = 0; r < 3; r++) {
    storyBatch.torus(0.22 - r * 0.035, 0.018, 5, 14, Math.PI * 2, mats.canvasOrange, stakeX - 0.55, gAt(stakeX - 0.55, stakeZ + 0.45) + 0.03 + r * 0.025, stakeZ + 0.45, Math.PI / 2, 0, 0);
  }
  // Taut rappel line snaking from the anchor stake into the dark warren
  storyBatch.tube([
    [stakeX + 0.06, stakeY + 0.62, stakeZ + 0.09],
    [-2.95, gAt(-2.95, 1.5) + 0.28, 1.5],
    [-2.75, gAt(-2.75, 0.4) + 0.16, 0.4],
    [-2.65, 0.12, -1.6],
  ], 5, 0.022, mats.canvasOrange, 0.4);

  // Overturned PGB olive ammo crate + pelican sensor case + rolled green field mat half-swallowed by creeping roots!
  addPgbCase(storyBatch, mats, rx0, ry0, rz0, 0.42, { w: 0.78, h: 0.38, d: 0.46, open: true });
  addPgbCase(storyBatch, mats, rx0 - 0.75, gAt(rx0 - 0.75, rz0 + 0.85), rz0 + 0.85, -0.35, { w: 0.56, h: 0.28, d: 0.38, mat: mats.pgbDark });
  storyBatch.cyl(0.11, 0.11, 0.66, 10, mats.canvas, rx0 + 0.58, gAt(rx0 + 0.58, rz0 + 0.45) + 0.10, rz0 + 0.45, 0, 0.65, Math.PI / 2);
  // Creeping root tendril physically wrapping over the PGB crate (Art Direction §2: Order intruding!)
  storyBatch.tube([
    [rx0 - 1.15, gAt(rx0 - 1.15, rz0 - 0.55) - 0.06, rz0 - 0.55],
    [rx0 - 0.42, ry0 + 0.24, rz0 - 0.12],
    [rx0 + 0.05, ry0 + 0.41, rz0 + 0.05],
    [rx0 + 0.48, gAt(rx0 + 0.48, rz0 + 0.35) + 0.04, rz0 + 0.35],
    [rx0 + 0.92, gAt(rx0 + 0.92, rz0 + 0.75) - 0.10, rz0 + 0.75],
  ], 5, (u) => 0.048 * lerp(1.0, 0.30, u), mats.bark, 0.5);

  // PGB Work-Lamp Tripod aimed INWARD toward the root cathedral arch (yaw = Math.PI - 0.58 -> shining into -Z/+X!)
  addFieldTripodLamp(T, storyBatch, storyGrp, mats, -4.55, gAt(-4.55, 5.55), 5.55, Math.PI - 0.58, -0.22, 1.95, {
    lights, worldOf, color: 0xff9a3a, intensity: 3.1, dist: 16, phase: 0.1, flicker: 0.09,
  });

  // Hollowed mossy tree stump with a rusty hatchet buried in it
  const stx = -5.25, stz = 3.15, sty = gAt(stx, stz);
  storyBatch.cyl(0.36, 0.46, 0.62, 9, mats.barkDark, stx, sty + 0.24, stz);
  storyBatch.cyl(0.24, 0.28, 0.12, 8, mats.moss, stx, sty + 0.54, stz);
  storyBatch.beam([stx + 0.08, sty + 0.54, stz], [stx + 0.38, sty + 0.88, stz + 0.16], 0.036, 0.045, mats.timber);
  storyBatch.box(0.14, 0.09, 0.025, mats.ironRust, stx + 0.07, sty + 0.56, stz, 0.1, 0.45, -0.5);

  // E. Right Flank Acoustic Geophone Tripod beside Survey Board (survey board at (+4.42, 2.0), clear!)
  const gx = 3.55, gz = 4.65, gy = gAt(gx, gz);
  addPgbCase(storyBatch, mats, gx + 0.65, gAt(gx + 0.65, gz + 0.4), gz + 0.4, -0.65, { w: 0.52, h: 0.26, d: 0.36 });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.2;
    storyBatch.rod([gx + Math.cos(a) * 0.36, gy - 0.06, gz + Math.sin(a) * 0.36], [gx, gy + 0.92, gz], 0.015, 0.018, 5, mats.pgbDark);
  }
  storyBatch.box(0.26, 0.18, 0.20, mats.pgbOlive, gx, gy + 0.98, gz, 0, -0.55, 0, 0.35);
  storyBatch.rod([gx + 0.08, gy + 1.07, gz], [gx + 0.10, gy + 1.56, gz], 0.008, 0.010, 5, mats.iron);
  addBlinkingLed(T, storyGrp, leds, gx - 0.08, gy + 1.02, gz + 0.10, 0xe84028, 1.55, 0.3);
  storyBatch.tube([
    [gx, gy + 0.88, gz],
    [gx - 0.18, gy + 0.04, gz - 0.55],
    [3.1, gAt(3.1, 2.4) + 0.04, 2.4],
    [2.95, gAt(2.95, 0.7) + 0.05, 0.7],
  ], 4, 0.015, mats.cable, 0.4);
}

// ===========================================================================
// 2. SHALE CAVE — "The Split Knife-Ridge & Spc. Mensah's Blast Site"
// ===========================================================================
function dressShaleCave(T, c, archBatch, storyBatch, archGrp, storyGrp, helpers) {
  const { d, rnd, gAt, lipAt, worldOf, doc, mats, lights, leds } = helpers;
  const w = d.w, h = d.h, sk = d.skew || 0;

  // A. Towering Cantilevered Metamorphic Slate Fins (varied blue-grey & silver-slate tones!)
  for (const s of [-1, 1]) {
    const bladeSpecs = [
      { ox: 0.78, oz: 0.35, bw: 1.05, bh: 6.8, bd: 1.55, tiltZ: -s * 0.07, yaw: s * 0.22, light: false },
      { ox: 1.72, oz: 0.85, bw: 1.25, bh: 5.2, bd: 1.85, tiltZ: -s * 0.16, yaw: s * 0.36, light: true },
      { ox: 2.75, oz: 1.55, bw: 1.15, bh: 3.4, bd: 1.60, tiltZ: -s * 0.24, yaw: s * 0.45, light: false },
      { ox: 1.12, oz: -0.55, bw: 1.10, bh: 7.9, bd: 1.75, tiltZ: -s * 0.06, yaw: s * 0.14, light: true },
    ];
    bladeSpecs.forEach((bs, bi) => {
      const lx = s * (w + bs.ox) + sk * (bs.bh * 0.3);
      const lz = bs.oz;
      const gy = gAt(lx, lz);
      archBatch.blade(lx, gy + bs.bh * 0.44 - 0.35, lz, bs.bw, bs.bh, bs.bd, 4201 + bi * 29 + s * 7, 'schist', bs.light ? mats.schistLight : mats.schist, {
        rx: 0.06, ry: bs.yaw, rz: bs.tiltZ, taperTop: 0.22, detail: 1, tile: 1.35,
      });
    });

    // Stepped cleaved slate foot-shelves & cascading talus scree shingles burying the seam
    archBatch.stone(s * (w + 1.0), gAt(s * (w + 1.0), 0.95) + 0.32, 0.95, 1.05, 0.34, 0.95, 4225 + s * 5, 'schist', mats.schistLight, { rot: [0.06, s * 0.3, -s * 0.08] });
    for (let k = 0; k < 10; k++) {
      const lx = s * (w + 0.15 + rnd() * 3.8);
      const lz = 0.2 + rnd() * 5.2;
      if (Math.abs(lx - sk * 1.2) < 2.35 && lz < 4.5) continue;
      const gy = gAt(lx, lz);
      const rx = 0.38 + rnd() * 0.58;
      const ry = 0.09 + rnd() * 0.15;
      const rz = 0.32 + rnd() * 0.52;
      archBatch.stone(lx, gy + ry * 0.32 - 0.04, lz, rx, ry, rz, 4240 + k * 13 + s * 3, 'schist', (k & 1) ? mats.schistLight : mats.schist, {
        rot: [(rnd() - 0.5) * 0.22, rnd() * Math.PI, (rnd() - 0.5) * 0.24],
        detail: 1, tile: 0.85,
      });
    }
  }

  // B. High Engineered Rock-Stabilization Strut, Anchor Plates & Wedged Capstone (y > 7.1 m — far above Colossus!)
  const pLeft = lipAt(Math.PI * 0.64), pRight = lipAt(Math.PI * 0.36);
  const strutY = Math.max(pLeft[1], pRight[1]) + 0.14;
  archBatch.beam([pLeft[0] - 0.55, pLeft[1] + 0.15, 0.18], [pRight[0] + 0.55, pRight[1] + 0.12, 0.18], 0.28, 0.26, mats.ironRust, 0.8);
  // Steel rock-bolt anchor plates & diagonal brace struts wedging the capstone into both cleft walls
  archBatch.box(0.42, 0.42, 0.12, mats.pgbHazard, pLeft[0] - 0.42, pLeft[1] + 0.15, 0.22, 0, 0.25, 0);
  archBatch.box(0.42, 0.42, 0.12, mats.pgbHazard, pRight[0] + 0.42, pRight[1] + 0.12, 0.22, 0, -0.25, 0);
  archBatch.beam([pLeft[0] - 0.45, pLeft[1] - 0.55, 0.14], [(pLeft[0] + pRight[0]) * 0.5 - 0.3, strutY, 0.20], 0.16, 0.16, mats.iron);
  archBatch.beam([pRight[0] + 0.45, pRight[1] - 0.55, 0.14], [(pLeft[0] + pRight[0]) * 0.5 + 0.3, strutY, 0.20], 0.16, 0.16, mats.iron);
  archBatch.stone((pLeft[0] + pRight[0]) * 0.5 + 0.15, strutY + 0.42, 0.24, 1.32, 0.58, 0.92, 4288, 'schist', mats.schistLight, { rot: [0.08, 0.15, -0.12] });

  // C. Spc. Mensah's Unfinished Blasting Rig (flush borehole charges + ground-hugging orange firing wire!)
  const leftBoreX = -(w + 0.62);
  for (const [cx, cy, cz, cyaw] of [
    [leftBoreX, 1.55, 0.52, 0.58],
    [leftBoreX - 0.12, 2.55, 0.58, 0.52],
    [w + 0.68 + sk * 0.3, 1.72, 0.56, -0.58],
  ]) {
    // Borehole steel rod seated deep into the slate blade + flush strapped satchel charge
    storyBatch.rod([cx - Math.sign(cx) * 0.08, cy, cz - 0.25], [cx + Math.sign(cx) * 0.12, cy + 0.03, cz + 0.18], 0.022, 0.022, 6, mats.iron);
    storyBatch.box(0.24, 0.32, 0.15, mats.canvas, cx, cy, cz + 0.04, 0.06, cyaw, 0, 0.35);
    storyBatch.box(0.26, 0.045, 0.17, mats.pgbHazard, cx, cy + 0.07, cz + 0.04, 0.06, cyaw, 0, 0.35);
    storyBatch.box(0.26, 0.045, 0.17, mats.pgbHazard, cx, cy - 0.07, cz + 0.04, 0.06, cyaw, 0, 0.35);
  }
  // Pale crushed rock-drill tailings mound beneath the left borehole!
  storyBatch.stone(leftBoreX + 0.15, gAt(leftBoreX + 0.15, 0.85) + 0.04, 0.85, 0.45, 0.12, 0.38, 4294, 'limestone', mats.schistLight);

  // Wooden PGB Demolition Crate + Plunger Detonator Box
  const dx0 = -4.25, dz0 = 4.65, dy0 = gAt(dx0, dz0);
  const demoTex = makeStenciledPlacardTexture(T, doc, {
    lines: [
      { text: 'PGB · DEMOLITIONS', size: 40, y: 0.26 },
      { text: 'BLASTING CHARGES', size: 44, y: 0.52, color: '#7c1a12' },
      { text: 'MENSAH · WARREN 2', size: 32, y: 0.76 },
    ],
    ground: '#7e6c4e', stripe: true, rust: 0.4, seed: 4202,
  });
  addPlacardMesh(T, storyGrp, demoTex, 0x7e6c4e, 0.88, 0.52, 0.54, dx0, dy0 + 0.25, dz0, 0, 0.48, 0, 'shale-demo-crate', mats.timberDark);
  storyBatch.box(0.91, 0.06, 0.56, mats.iron, dx0, dy0 + 0.08, dz0, 0, 0.48, 0);
  storyBatch.box(0.91, 0.06, 0.56, mats.iron, dx0, dy0 + 0.44, dz0, 0, 0.48, 0);

  const px0 = -3.35, pz0 = 5.45, py0 = gAt(px0, pz0);
  storyBatch.stone(px0, py0 + 0.06, pz0, 0.48, 0.14, 0.44, 4291, 'schist', mats.schistLight);
  storyBatch.box(0.30, 0.36, 0.24, mats.pgbOlive, px0, py0 + 0.30, pz0, 0, 0.32, 0, 0.4);
  storyBatch.box(0.32, 0.04, 0.26, mats.brass, px0, py0 + 0.49, pz0, 0, 0.32, 0);
  storyBatch.rod([px0, py0 + 0.49, pz0], [px0, py0 + 0.84, pz0], 0.018, 0.018, 6, mats.iron);
  storyBatch.rod([px0 - 0.13, py0 + 0.84, pz0 - 0.04], [px0 + 0.13, py0 + 0.84, pz0 + 0.04], 0.024, 0.024, 6, mats.timber);
  addBlinkingLed(T, storyGrp, leds, px0 + 0.08, py0 + 0.44, pz0 + 0.12, 0xe8a020, 1.25, 0.6);

  // Ground-hugging twisted firing wire draping tightly along scree & climbing the left slate rib (no lollipop pole!)
  storyBatch.tube([
    [px0, py0 + 0.44, pz0 - 0.12],
    [px0 - 0.12, gAt(px0 - 0.12, 4.9) + 0.03, 4.9],
    [-3.55, gAt(-3.55, 3.8) + 0.03, 3.8],
    [-3.78, gAt(-3.78, 2.5) + 0.03, 2.5],
    [leftBoreX + 0.06, gAt(leftBoreX + 0.06, 1.2) + 0.04, 1.2],
    [leftBoreX + 0.04, gAt(leftBoreX + 0.04, 0.72) + 0.55, 0.72],
    [leftBoreX, 1.52, 0.56],
    [leftBoreX - 0.10, 2.52, 0.60],
  ], 4, 0.015, mats.demoWire, 0.35);

  // Coiled spool of blast wire + sledgehammer + bright orange blast-perimeter marker flag
  const spX = -4.95, spZ = 3.65, spY = gAt(spX, spZ);
  storyBatch.cyl(0.24, 0.24, 0.04, 12, mats.timberDark, spX, spY + 0.04, spZ);
  storyBatch.cyl(0.24, 0.24, 0.04, 12, mats.timberDark, spX, spY + 0.24, spZ);
  storyBatch.cyl(0.18, 0.18, 0.20, 12, mats.demoWire, spX, spY + 0.14, spZ);
  storyBatch.beam([-4.65, gAt(-4.65, 2.65) + 0.04, 2.65], [-4.15, gAt(-4.15, 2.25) + 0.88, 2.25], 0.042, 0.042, mats.timber);
  storyBatch.box(0.22, 0.11, 0.10, mats.iron, -4.12, gAt(-4.15, 2.25) + 0.90, 2.23, 0.2, 0.4, 0.72);
  // Orange perimeter survey flag stake
  const flX = -2.85, flZ = 6.25, flY = gAt(flX, flZ);
  storyBatch.rod([flX, flY - 0.08, flZ], [flX, flY + 0.85, flZ], 0.008, 0.010, 5, mats.iron);
  storyBatch.box(0.22, 0.14, 0.012, mats.canvasOrange, flX + 0.11, flY + 0.76, flZ, 0, 0.3, 0);

  // D. Right Flank Blast Zone A-Frame Sign + Raking Floodlight Mast aimed INWARD & UP at the slate fins!
  const bx = 4.35, bz = 5.45, by = gAt(bx, bz);
  const blastTex = makeStenciledPlacardTexture(T, doc, {
    lines: [
      { text: 'CAUTION', size: 52, y: 0.25, color: '#8f1b10' },
      { text: 'BLAST ZONE', size: 54, y: 0.52 },
      { text: 'CHARGES ARMED · KEEP OUT', size: 28, y: 0.77 },
    ],
    ground: '#cfb45e', stripe: true, rust: 0.45, seed: 4208,
  });
  for (const sx of [-0.46, 0.46]) {
    storyBatch.rod([bx + sx, by - 0.06, bz + 0.26], [bx + sx, by + 1.05, bz], 0.022, 0.022, 6, mats.iron);
    storyBatch.rod([bx + sx, by - 0.06, bz - 0.26], [bx + sx, by + 1.05, bz], 0.022, 0.022, 6, mats.iron);
  }
  addPlacardMesh(T, storyGrp, blastTex, 0xcfb45e, 1.02, 0.64, 0.035, bx, by + 0.66, bz + 0.14, -0.22, -0.32, 0, 'shale-blast-aframe', mats.pgbDark);

  // Floodlight tripod rotated INWARD (yaw = Math.PI + 0.48) grazing up across the jagged slate fins!
  addFieldTripodLamp(T, storyBatch, storyGrp, mats, 3.65, gAt(3.65, 6.85), 6.85, Math.PI + 0.48, -0.34, 2.15, {
    lights, worldOf, color: 0xffa64a, intensity: 3.4, dist: 18, phase: 1.7, flicker: 0.06,
  });

  // Stacked flat slate trail cairn markers (Cpl. Delgado)
  const cx1 = 5.35, cz1 = 3.85, cy1 = gAt(cx1, cz1);
  for (let k = 0; k < 5; k++) {
    const r = 0.32 - k * 0.048;
    storyBatch.stone(cx1 + (rnd() - 0.5) * 0.04, cy1 + 0.06 + k * 0.11, cz1 + (rnd() - 0.5) * 0.04, r, 0.065, r * 0.85, 4270 + k, 'schist', mats.schistLight);
  }
}

// ===========================================================================
// 3. IRON CAVE — "Coldwater Iron Works, Drift No. 3 — Est. 1891"
// ===========================================================================
function dressIronCave(T, c, archBatch, storyBatch, archGrp, storyGrp, helpers) {
  const { d, rnd, gAt, worldOf, doc, mats, lights } = helpers;
  const w = d.w;

  // A. Cast-Iron Nameplate Arch Lintel ("COLDWATER IRON WORKS · DRIFT NO. 3 · EST. 1891", docs/story.md §7!)
  const lintelTex = makeColdwaterLintelTexture(T, doc);
  const lintelY = 4.22;
  archBatch.box(3.52, 0.78, 0.18, mats.iron, 0, lintelY, 0.60, 0, 0, 0, 0.8);
  archBatch.box(3.66, 0.09, 0.24, mats.ironRust, 0, lintelY + 0.41, 0.63, 0, 0, 0, 0.6);
  archBatch.box(3.66, 0.09, 0.24, mats.ironRust, 0, lintelY - 0.41, 0.63, 0, 0, 0, 0.6);
  addPlacardMesh(T, archGrp, lintelTex, 0x3a342e, 3.36, 0.68, 0.04, 0, lintelY, 0.70, 0, 0, 0, 'coldwater-mine-lintel', mats.iron);

  // Overhead Timber Gallows Hoist Gantry + Pulley Sheave & Short High Chain (y = 5.65 m — bold upper silhouette!)
  const hoistY = 5.66;
  archBatch.beam([0, hoistY + 0.18, -0.8], [0, hoistY + 0.12, 1.62], 0.28, 0.32, mats.timber, 1.0);
  for (const s of [-1, 1]) {
    archBatch.beam([s * 1.15, hoistY - 0.68, 0.22], [0, hoistY + 0.12, 1.08], 0.14, 0.14, mats.timberDark, 0.8);
    archBatch.rod([s * 0.95, hoistY - 0.55, 0.30], [0, hoistY + 0.15, 1.25], 0.024, 0.024, 6, mats.iron);
  }
  archBatch.cyl(0.25, 0.25, 0.09, 12, mats.ironRust, 0, hoistY - 0.06, 1.42, 0, 0, Math.PI / 2);
  archBatch.box(0.09, 0.34, 0.28, mats.iron, 0, hoistY, 1.42);
  for (let k = 0; k < 4; k++) {
    archBatch.torus(0.045, 0.013, 5, 10, Math.PI * 2, mats.ironRust, 0.02, hoistY - 0.28 - k * 0.072, 1.42, 0, (k & 1) ? Math.PI / 2 : 0, 0);
  }
  archBatch.torus(0.09, 0.022, 5, 12, Math.PI * 1.45, mats.iron, 0.02, hoistY - 0.64, 1.42, 0, 0, Math.PI * 0.65);

  // B. Heavy Log-Cribbing Retaining Wing Walls flanking both sides into the red ironstone crag
  for (const s of [-1, 1]) {
    const startX = s * (w - 0.15);
    const endX = s * (w + 2.35);
    const baseZ = s > 0 ? 0.55 : 0.25;
    const endZ = s > 0 ? 1.85 : 1.55;
    for (let row = 0; row < 5; row++) {
      const ly = row * 0.32 + 0.12;
      const gStart = gAt(startX, baseZ), gEnd = gAt(endX, endZ);
      const yA = gStart + ly, yB = gEnd + ly * 0.78;
      archBatch.rod([startX, yA, baseZ], [endX, yB, endZ], 0.145, 0.155, 8, (row & 1) ? mats.timber : mats.timberDark, 0.9);
      if (row % 2 === 0) {
        const mx = lerp(startX, endX, 0.55), mz = lerp(baseZ, endZ, 0.55), my = lerp(yA, yB, 0.55);
        archBatch.rod([mx, my, mz + 0.25], [mx + s * 0.25, my + 0.08, mz - 1.15], 0.12, 0.13, 7, mats.timberDark, 0.8);
      }
    }
    for (let k = 0; k < 3; k++) {
      const rx = lerp(startX, endX, 0.3 + k * 0.32) + s * 0.15;
      const rz = lerp(baseZ, endZ, 0.3 + k * 0.32) + 0.55 + k * 0.25;
      archBatch.stone(rx, gAt(rx, rz) + 0.18, rz, 0.52 + rnd() * 0.25, 0.34 + rnd() * 0.16, 0.46 + rnd() * 0.22, 4310 + k * 11 + s * 5, 'ironstone', mats.ore);
    }
  }

  // Nailed Settler Iron Horseshoes (points up!) flush on both timber posts
  for (const s of [-1, 1]) {
    addHorseshoe(storyBatch, mats, s * 2.18, 2.35, 0.575, 0, 0, 0, 1.15);
    addHorseshoe(storyBatch, mats, s * 2.18, 2.02, 0.575, 0, 0, 0.08 * s, 1.05);
  }

  // Old Rusted Mine Ventilation Pipe poking out of left crag above IRON BELOW
  const vpX = -(w + 0.45), vpZ = 0.25;
  archBatch.rod([vpX - 0.6, 3.25, vpZ - 1.4], [vpX + 0.15, 2.95, vpZ + 0.85], 0.22, 0.22, 10, mats.ironRust, 0.7);
  archBatch.torus(0.24, 0.032, 6, 12, Math.PI * 2, mats.iron, vpX + 0.15, 2.95, vpZ + 0.85, 0.14, 0.35, 0);

  // C. Narrow-Gauge Ore Cart Track curving from right-of-center mouth -> Derailed Iron Ore Cart
  const trackPts = [];
  const trackSteps = 16;
  for (let i = 0; i <= trackSteps; i++) {
    const u = i / trackSteps;
    const lx = lerp(1.22, 4.45, Math.pow(u, 1.28));
    const lz = lerp(-0.35, 6.85, u);
    trackPts.push([lx, gAt(lx, lz), lz]);
  }
  const gauge = 0.44;
  for (let i = 0; i < trackSteps; i++) {
    const a = trackPts[i], b = trackPts[i + 1];
    const dx = b[0] - a[0], dz = b[2] - a[2], dl = Math.hypot(dx, dz) || 1;
    const nx = dz / dl, nz = -dx / dl;
    const mx = (a[0] + b[0]) * 0.5, mz = (a[2] + b[2]) * 0.5;
    const yL = gAt(mx - nx * 0.68, mz - nz * 0.68) + 0.015;
    const yR = gAt(mx + nx * 0.68, mz + nz * 0.68) + 0.015;
    storyBatch.beam([mx - nx * 0.68, yL, mz - nz * 0.68], [mx + nx * 0.68, yR, mz + nz * 0.68], 0.14, 0.075, (i & 1) ? mats.timber : mats.timberDark, 0.7);
    for (const side of [-gauge, gauge]) {
      const ax = a[0] + nx * side, az = a[2] + nz * side;
      const bx2 = b[0] + nx * side, bz2 = b[2] + nz * side;
      const liftB = i >= trackSteps - 2 && side > 0 ? (i - (trackSteps - 3)) * 0.09 : 0;
      storyBatch.beam([ax, gAt(ax, az) + 0.065, az], [bx2, gAt(bx2, bz2) + 0.065 + liftB, bz2], 0.055, 0.065, mats.ironRust, 0.6);
    }
  }

  // D. Derailed 1890s Riveted Iron Ore Cart heaped with Hematite Iron Ore + Spare Ties & Pickaxe
  const cartX = 4.65, cartZ = 6.75, cartY = gAt(cartX, cartZ);
  const cartYaw = 0.58, cartRoll = 0.18;
  const cc = Math.cos(cartYaw), cs = Math.sin(cartYaw);
  const cPt = (lx, ly, lz) => [cartX + lx * cc + lz * cs, cartY + ly, cartZ - lx * cs + lz * cc];
  storyBatch.box(1.06, 0.14, 1.56, mats.iron, ...cPt(0, 0.34, 0), 0.04, cartYaw, cartRoll, 0.7);
  for (const wx of [-0.46, 0.46]) for (const wz of [-0.46, 0.46]) {
    const wp = cPt(wx, 0.19, wz);
    storyBatch.cyl(0.20, 0.20, 0.08, 12, mats.ironRust, wp[0], wp[1], wp[2], 0, cartYaw, Math.PI / 2 + cartRoll);
    storyBatch.cyl(0.06, 0.06, 0.12, 8, mats.iron, wp[0], wp[1], wp[2], 0, cartYaw, Math.PI / 2 + cartRoll);
  }
  storyBatch.box(1.16, 0.78, 0.08, mats.ironRust, ...cPt(0, 0.76, 0.76), 0.18, cartYaw, cartRoll, 0.7);
  storyBatch.box(1.16, 0.78, 0.08, mats.ironRust, ...cPt(0, 0.76, -0.76), -0.18, cartYaw, cartRoll, 0.7);
  storyBatch.box(0.08, 0.78, 1.58, mats.ironRust, ...cPt(-0.56, 0.76, 0), 0.04, cartYaw, cartRoll + 0.16, 0.7);
  storyBatch.box(0.08, 0.78, 1.58, mats.ironRust, ...cPt(0.56, 0.76, 0), 0.04, cartYaw, cartRoll - 0.16, 0.7);
  storyBatch.box(1.24, 0.08, 1.66, mats.iron, ...cPt(0, 1.14, 0), 0.04, cartYaw, cartRoll, 0.7);
  for (let k = 0; k < 9; k++) {
    const ox = (rnd() - 0.5) * 0.75, oz = (rnd() - 0.5) * 1.1;
    const op = cPt(ox, 0.92 + rnd() * 0.28, oz);
    storyBatch.stone(op[0], op[1], op[2], 0.22 + rnd() * 0.16, 0.16 + rnd() * 0.12, 0.22 + rnd() * 0.14, 4350 + k, 'ironstone', mats.ore);
  }
  for (let k = 0; k < 7; k++) {
    const sx = cartX + 0.55 + rnd() * 1.25, sz = cartZ + (rnd() - 0.5) * 1.55;
    storyBatch.stone(sx, gAt(sx, sz) + 0.09, sz, 0.18 + rnd() * 0.16, 0.12 + rnd() * 0.10, 0.18 + rnd() * 0.15, 4370 + k, 'ironstone', mats.ore);
  }
  // Miner's rusty pickaxe leaning on cart + stack of spare timber ties beside cart
  storyBatch.beam(cPt(-0.74, 0.02, 0.35), cPt(-0.56, 1.12, 0.22), 0.042, 0.042, mats.timber);
  storyBatch.beam(cPt(-0.58, 1.05, -0.08), cPt(-0.54, 1.14, 0.54), 0.055, 0.045, mats.ironRust);
  for (let t = 0; t < 3; t++) {
    const tx = cartX + 1.45, tz = cartZ - 1.45 + t * 0.20;
    storyBatch.box(1.25, 0.12, 0.15, (t & 1) ? mats.timber : mats.timberDark, tx, gAt(tx, tz) + 0.05, tz, 0, 0.28, 0, 0.75);
  }

  // E. Warm Hanging 1890s Wrought-Iron Mine Lantern + Hikers' Camp Crate & Lantern
  storyBatch.beam([2.22, 2.88, 0.55], [2.72, 2.94, 0.92], 0.045, 0.045, mats.iron);
  storyBatch.beam([2.22, 2.52, 0.55], [2.56, 2.90, 0.80], 0.032, 0.032, mats.iron);
  addHangingMineLantern(T, storyBatch, storyGrp, mats, 2.70, 2.66, 0.90, {
    lights, worldOf, color: 0xff9230, intensity: 3.1, dist: 15, phase: 0.7,
  });

  const hx = -5.55, hz = 4.65, hy = gAt(hx, hz);
  storyBatch.box(0.68, 0.42, 0.48, mats.timber, hx, hy + 0.19, hz, 0, 0.32, 0, 0.65);
  storyBatch.cyl(0.055, 0.058, 0.24, 9, mats.canvasOrange, hx - 0.16, hy + 0.52, hz + 0.06);
  storyBatch.cyl(0.056, 0.056, 0.05, 9, mats.iron, hx - 0.16, hy + 0.65, hz + 0.06);
  addHangingMineLantern(T, storyBatch, storyGrp, mats, hx + 0.14, hy + 0.56, hz - 0.04, {
    lights, worldOf, color: 0xffb258, intensity: 1.7, dist: 9.5, phase: 2.3,
  });
}

// ===========================================================================
// 4. WET CAVE — "The Drowned Sluice & Seepage Grotto"
// ===========================================================================
function dressWetCave(T, c, archBatch, storyBatch, archGrp, storyGrp, helpers) {
  const { d, rnd, gAt, lipAt, worldOf, doc, mats, lights, leds } = helpers;
  const w = d.w;

  // A. Grounded Columnar Wet Basalt Cliff Buttresses (rising continuously from ground — ZERO floating cheek rocks!)
  for (const s of [-1, 1]) {
    const colSpecs = [
      { ox: 0.54, oz: 0.24, bw: 1.12, bh: 4.35, bd: 1.22, ry: s * 0.22, rz: -s * 0.03 },
      { ox: 1.42, oz: 0.66, bw: 1.24, bh: 3.15, bd: 1.30, ry: s * 0.36, rz: -s * 0.05 },
      { ox: 2.30, oz: 1.14, bw: 1.12, bh: 2.05, bd: 1.18, ry: s * 0.44, rz: -s * 0.07 },
    ];
    colSpecs.forEach((cs, ci) => {
      const lx = s * (w + cs.ox), lz = cs.oz;
      const gy = gAt(lx, lz);
      archBatch.blade(lx, gy + cs.bh * 0.44 - 0.30, lz, cs.bw, cs.bh, cs.bd, 4401 + ci * 19 + s * 7, 'basalt', mats.wetBasalt, {
        rx: 0.03, ry: cs.ry, rz: cs.rz, taperTop: 0.78, detail: 1, tile: 1.1,
      });
      // Grounded wet-moss boulder collar tucked snugly into the column foot (never perched on column tips)
      archBatch.stone(lx + s * 0.18, gy + 0.18, lz + 0.34, cs.bw * 0.42, 0.24, cs.bd * 0.38, 4420 + ci * 13 + s * 3, 'river', mats.mossWet);
    });

    // Wet mossy shoreline cobbles framing the seepage pool banks
    for (let k = 0; k < 5; k++) {
      const bx = s * (2.35 + k * 0.78 + rnd() * 0.38);
      const bz = 1.45 + k * 1.42 + rnd() * 0.55;
      archBatch.stone(bx, gAt(bx, bz) + 0.16, bz, 0.52 + rnd() * 0.28, 0.28 + rnd() * 0.16, 0.48 + rnd() * 0.24, 4430 + k * 7 + s * 3, 'basalt', mats.wetBasalt);
      archBatch.stone(bx, gAt(bx, bz) + 0.25, bz, 0.32 + rnd() * 0.12, 0.10, 0.28 + rnd() * 0.12, 4450 + k * 7 + s, 'river', mats.mossWet);
    }
  }

  // Tapered wet mineral stalactites hanging along the upper arch rim (clear of 4.7 m Colossus!)
  for (let k = 0; k < 15; k++) {
    const t = lerp(0.10 * Math.PI, 0.90 * Math.PI, k / 14);
    const p = lipAt(t);
    const inCenter = Math.abs(p[0]) < 2.5;
    const len = inCenter ? Math.min(0.46, Math.max(0.18, p[1] - 5.55)) : (0.52 + rnd() * 0.68);
    if (len < 0.16) continue;
    archBatch.cyl(0.014, 0.075 + rnd() * 0.055, len, 6, mats.wetBasalt, p[0], p[1] - len * 0.42 + 0.08, 0.12 + (rnd() - 0.5) * 0.14, 0, 0, Math.PI);
  }

  // B. Feathered Organic Mirror-Dark Seepage Pool (alpha-feathered perimeter — ZERO sharp polygon edge!)
  {
    const nx = 14, nz = 18;
    const pos = [], nrm = [], uv = [], idx = [];
    for (let j = 0; j <= nz; j++) {
      const v = j / nz;
      const lz = lerp(-0.4, 9.2, v);
      const meander = Math.sin(v * Math.PI * 1.35) * 0.55;
      const halfW = lerp(w * 0.88, 2.85, Math.pow(v, 0.65));
      for (let i = 0; i <= nx; i++) {
        const u = i / nx;
        const lx = meander + (u * 2 - 1) * halfW;
        const y = gAt(lx, lz) + 0.022;
        pos.push(lx, y, lz);
        nrm.push(0, 1, 0);
        // UV spans [0,1]x[0,1] across the feathered pool alpha map!
        uv.push(u, v);
      }
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, cc = a + nx + 1, dd = cc + 1;
      idx.push(a, cc, b, b, cc, dd);
    }
    const pGeo = new T.BufferGeometry();
    pGeo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    pGeo.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3));
    pGeo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    pGeo.setIndex(idx);
    pGeo.computeVertexNormals();
    const alphaMap = makeSeepPoolAlphaTexture(T, doc);
    const poolMat = new T.MeshStandardMaterial({
      color: 0x162624,
      roughness: 0.08,
      metalness: 0.16,
      transparent: true,
      opacity: alphaMap ? 0.90 : 0.78,
      alphaMap: alphaMap || null,
      normalMap: mats.seepWaterNormal || null,
      normalScale: new T.Vector2(0.45, 0.45),
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    const pool = new T.Mesh(pGeo, poolMat);
    pool.name = 'wet-seepage-pool';
    pool.receiveShadow = true;
    storyGrp.add(pool);
  }

  // Moss-slick Flat Basalt Stepping Stones & Waterlogged Boardwalk Planks bridging the wet apron
  const stepStones = [
    [-1.35, 1.85, 0.52, 0.42], [-0.35, 2.85, 0.56, 0.46], [0.72, 3.75, 0.50, 0.44],
    [0.12, 4.85, 0.54, 0.42], [-0.85, 6.05, 0.48, 0.40], [1.55, 2.25, 0.45, 0.38],
  ];
  stepStones.forEach(([sx, sz, rx, rz], i) => {
    storyBatch.stone(sx, gAt(sx, sz) + 0.025, sz, rx, 0.055, rz, 4470 + i * 11, 'basalt', mats.wetBasalt, { rot: [0, i * 0.9, 0] });
  });
  for (let k = 0; k < 5; k++) {
    const px = 2.35 + (rnd() - 0.5) * 0.25, pz = 3.2 + k * 0.88;
    const yaw = 0.14 + (rnd() - 0.5) * 0.22;
    storyBatch.box(1.15, 0.055, 0.24, mats.wetTimber, px, gAt(px, pz) + 0.035, pz, 0.02, yaw, (rnd() - 0.5) * 0.06, 0.7);
  }

  // C. Moss-Draped Stone Drainage Culvert, Dewatering Pipe, Timber Sluice Trough & Wrenched Iron Grate (LEFT!)
  const cx0 = -4.65, cz0 = 2.35, cy0 = gAt(cx0, cz0);
  // Rough stacked fieldstone culvert arch blended into mossy bank boulders (not a plain flat dark box!)
  archBatch.stone(cx0 - 0.42, cy0 + 0.56, cz0 - 0.12, 0.56, 0.68, 0.58, 4481, 'fieldstone', mats.fieldstone, { rot: [0, 0.42, 0] });
  archBatch.stone(cx0 + 0.42, cy0 + 0.56, cz0 + 0.18, 0.56, 0.68, 0.58, 4482, 'fieldstone', mats.fieldstone, { rot: [0, 0.42, 0] });
  archBatch.stone(cx0, cy0 + 1.18, cz0 + 0.04, 0.98, 0.24, 0.68, 4483, 'fieldstone', mats.fieldstone, { rot: [0, 0.42, 0] });
  archBatch.stone(cx0, cy0 + 1.38, cz0 + 0.04, 0.78, 0.14, 0.52, 4484, 'river', mats.mossWet, { rot: [0, 0.42, 0] });
  // Corrugated rusted dewatering pipe + moss-draped wooden sluice trough under pipe outflow
  archBatch.rod([cx0 - 0.35, cy0 + 0.55, cz0 - 0.45], [cx0 + 0.42, cy0 + 0.45, cz0 + 0.72], 0.24, 0.24, 12, mats.ironRust, 0.6);
  archBatch.torus(0.26, 0.032, 6, 12, Math.PI * 2, mats.iron, cx0 + 0.42, cy0 + 0.45, cz0 + 0.72, 0.08, 0.42, 0);
  storyBatch.box(0.54, 0.06, 1.45, mats.wetTimber, cx0 + 0.68, cy0 + 0.12, cz0 + 1.12, 0.08, 0.42, 0, 0.7);

  // Heavy Rusted Iron Drainage Grate — WRENCHED OFF ITS HINGES & BENT VIOLENTLY OUTWARD!
  const gx = -3.65, gz = 3.75, gy = gAt(gx, gz);
  storyBatch.box(1.28, 0.08, 0.08, mats.ironRust, gx, gy + 0.12, gz + 0.52, 0.18, 0.52, -0.14);
  storyBatch.box(1.28, 0.08, 0.08, mats.ironRust, gx - 0.42, gy + 0.38, gz - 0.22, 0.18, 0.52, -0.14);
  for (let i = -3; i <= 3; i++) {
    const off = i * 0.18;
    const bend = Math.abs(i) <= 1 ? 0.22 : 0.05;
    storyBatch.rod(
      [gx + off * 0.85, gy + 0.12, gz + 0.48 - off * 0.5],
      [gx + off * 0.85 - 0.22, gy + 0.26 + bend, gz + 0.08 - off * 0.5],
      0.022, 0.022, 6, mats.iron
    );
    storyBatch.rod(
      [gx + off * 0.85 - 0.22, gy + 0.26 + bend, gz + 0.08 - off * 0.5],
      [gx + off * 0.85 - 0.42, gy + 0.38, gz - 0.24 - off * 0.5],
      0.022, 0.022, 6, mats.ironRust
    );
  }

  // Cast-Iron Sluice Handwheel & Threaded Valve Stanchion
  const swX = -4.15, swZ = 1.05, swY = gAt(swX, swZ);
  storyBatch.rod([swX, swY - 0.12, swZ], [swX, swY + 1.38, swZ], 0.048, 0.055, 8, mats.ironRust);
  storyBatch.box(0.24, 0.26, 0.22, mats.iron, swX, swY + 1.08, swZ, 0, 0.35, 0);
  storyBatch.torus(0.28, 0.026, 6, 16, Math.PI * 2, mats.ironRust, swX, swY + 1.40, swZ, Math.PI / 2, 0, 0);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    storyBatch.rod([swX, swY + 1.40, swZ], [swX + Math.cos(a) * 0.27, swY + 1.40, swZ + Math.sin(a) * 0.27], 0.015, 0.015, 5, mats.iron);
  }

  // D. Right Flank PGB Hydrological Kit, Marine Beacon Tripod aimed INWARD across the seepage pool!
  const rx1 = 3.85, rz1 = 5.15, ry1 = gAt(rx1, rz1);
  storyBatch.box(0.82, 0.46, 0.58, mats.wetTimber, rx1 + 0.45, gAt(rx1 + 0.45, rz1 - 0.4) + 0.19, rz1 - 0.4, 0.06, -0.42, -0.09, 0.7);
  storyBatch.box(0.46, 0.14, 0.36, mats.canvasYellow, rx1 + 0.42, gAt(rx1 + 0.45, rz1 - 0.4) + 0.48, rz1 - 0.42, 0.04, -0.22, -0.08, 0.5);
  addPgbCase(storyBatch, mats, rx1 - 0.42, ry1, rz1 + 0.35, -0.58, { w: 0.62, h: 0.28, d: 0.42, open: true });
  addBlinkingLed(T, storyGrp, leds, rx1 - 0.42, ry1 + 0.28, rz1 + 0.35, 0x38d898, 1.85, 0.9);

  // Marine Amber Work-Beacon aimed INWARD (yaw = Math.PI + 0.55) lighting the glistening pool & basalt grotto!
  addFieldTripodLamp(T, storyBatch, storyGrp, mats, 4.45, gAt(4.45, 6.45), 6.45, Math.PI + 0.55, -0.18, 1.85, {
    lights, worldOf, color: 0xffa042, intensity: 3.3, dist: 16.5, phase: 2.1, flicker: 0.07,
  });

  // Bleached gnarled driftwood branch along the wet mud shoreline
  storyBatch.tube([
    [-3.1, gAt(-3.1, 6.2) + 0.05, 6.2],
    [-2.4, gAt(-2.4, 6.7) + 0.09, 6.7],
    [-1.7, gAt(-1.7, 7.1) + 0.04, 7.1],
  ], 6, (u) => 0.11 * lerp(1.0, 0.38, u), mats.wetTimber, 0.7);
}

// ===========================================================================
// 5. HILL CAVE — "The Barrow of the First People"
// ===========================================================================
function dressHillCave(T, c, archBatch, storyBatch, archGrp, storyGrp, helpers) {
  const { d, rnd, gAt, worldOf, doc, mats, lights, firstPeople } = helpers;
  const w = d.w, h = d.h;

  // A. Monumental Corbel Capitals, Stepped Retaining Cheeks & Organically Framed Carved Lintel Frieze!
  for (const s of [-1, 1]) {
    const jx = s * (w + 0.35);
    archBatch.stone(jx, h - 0.08, 0.56, 0.92, 0.46, 0.98, 4501 + s * 7, 'granite', mats.barrowStone, { detail: 1, tile: 1.0 });
    archBatch.stone(jx + s * 0.68, h - 0.42, 0.16, 0.78, 0.62, 1.05, 4509 + s * 7, 'granite', mats.barrowStone, { detail: 1, tile: 1.0 });
    // Sculpted mossy corner capstones framing the carved lintel ends so the frieze reads as ancient stone, never a sign!
    archBatch.stone(jx + s * 0.12, h + 0.54, 1.02, 0.88, 0.36, 0.64, 4512 + s * 11, 'granite', mats.barrowStone);
    archBatch.stone(jx + s * 0.12, h + 0.78, 1.00, 0.66, 0.15, 0.48, 4514 + s * 11, 'river', mats.moss);

    const py = gAt(jx, 0.45);
    archBatch.stone(jx + s * 0.15, py + 0.22, 0.48, 0.96, 0.46, 1.05, 4519 + s * 5, 'granite', mats.barrowStone);
    // Grounded cheek bolster closing any jamb-to-hill seam cleanly
    archBatch.stone(jx + s * 0.58, py + 2.45, 0.22, 0.66, 1.85, 0.78, 4524 + s * 5, 'fieldstone', mats.fieldstone);
    for (let tier = 0; tier < 4; tier++) {
      const tx = s * (w + 1.05 + tier * 0.46);
      const tz = 0.25 - tier * 0.18;
      const th = 4.6 - tier * 0.95;
      archBatch.stone(tx, gAt(tx, tz) + th * 0.42, tz, 0.64, th * 0.52, 0.92, 4530 + tier * 13 + s * 3, 'fieldstone', mats.fieldstone);
    }
  }

  // Carved Neolithic Frieze nested cleanly between the two megalithic corbel caps + mossy stone cap-ridge on top!
  const frieze = makeBarrowFriezeTextures(T, doc);
  const friezeY = h + 0.16;
  const friezeW = w * 2 + 0.05; // 6.65m — tucked tightly between the stone end-caps!
  addPlacardMesh(T, archGrp, frieze.colorTex, 0x858071, friezeW, 0.76, 0.36, 0, friezeY, 1.06, 0, 0, 0, 'barrow-carved-frieze', mats.barrowStone);
  // Weathered mossy capstones bridging top of carved frieze back into the barrow turf
  for (const fx of [-1.8, 0, 1.8]) {
    archBatch.stone(fx, friezeY + 0.48, 0.92, 1.15, 0.22, 0.55, 4548 + Math.round(fx * 5), 'fieldstone', mats.barrowStone);
    archBatch.stone(fx, friezeY + 0.64, 0.88, 0.88, 0.12, 0.42, 4552 + Math.round(fx * 5), 'river', mats.moss);
  }
  if (frieze.glowTex) {
    const glowMat = new T.MeshBasicMaterial({
      color: GROOVE, map: frieze.glowTex, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const fg = new T.Mesh(new T.PlaneGeometry(friezeW * 0.98, 0.72), glowMat);
    fg.name = 'barrow-frieze-glow';
    fg.position.set(0, friezeY, 1.255);
    archGrp.add(fg);
    if (firstPeople && Array.isArray(firstPeople.glowMats)) firstPeople.glowMats.push(glowMat);
  }

  // B. Embracing Crescent Forecourt Dry-Stone Barrow Kerb Walls
  for (const s of [-1, 1]) {
    const kerbPts = [
      [s * (w + 1.55), 1.4], [s * (w + 2.45), 2.5], [s * (w + 2.85), 3.9],
      [s * (w + 2.75), 5.3], [s * (w + 2.25), 6.6], [s * (w + 1.65), 7.8],
    ];
    for (let i = 0; i < kerbPts.length - 1; i++) {
      const a = kerbPts[i], b = kerbPts[i + 1];
      const mx = (a[0] + b[0]) * 0.5, mz = (a[1] + b[1]) * 0.5;
      const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
      const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const wallH = lerp(1.15, 0.58, i / (kerbPts.length - 1));
      const gy = gAt(mx, mz);
      archBatch.stone(mx, gy + wallH * 0.30, mz, 0.46, wallH * 0.42, segLen * 0.56, 4560 + i * 17 + s * 5, 'fieldstone', mats.barrowStone, { rot: [0, yaw, 0] });
      if (i < 4) {
        archBatch.stone(mx, gy + wallH * 0.72, mz, 0.40, wallH * 0.30, segLen * 0.50, 4580 + i * 17 + s * 5, 'fieldstone', mats.fieldstone, { rot: [0, yaw + 0.05, 0] });
        archBatch.stone(mx, gy + wallH * 0.92, mz, 0.30, 0.09, segLen * 0.36, 4595 + i * 7 + s, 'river', mats.moss, { rot: [0, yaw, 0] });
      }
    }
  }

  // C. Twin Leaning Carved Sentinel Menhirs (skin-tight rune bands sharing parent rotation!)
  const sentinels = [
    { x: -5.35, z: 7.45, w: 0.92, h: 2.85, t: 0.48, yaw: 0.36, leanZ: -0.06, glyphs: [5, 0, 2] },
    { x: 5.15, z: 6.95, w: 0.84, h: 2.42, t: 0.45, yaw: -0.40, leanZ: 0.08, glyphs: [4, 7, 1] },
  ];
  sentinels.forEach((st, idx) => {
    const sy = gAt(st.x, st.z);
    addStandingMenhirWithRunes(T, archGrp, {
      x: st.x, y: sy - 0.25, z: st.z, w: st.w, h: st.h, t: st.t,
      rx: 0.04, ry: st.yaw, rz: st.leanZ, taper: 0.26, crown: 0.18,
      rnd, stoneMat: mats.monolith, runeTex: makeObeliskRuneTexture(T, doc, st.glyphs),
      firstPeople, name: `barrow-sentinel-${idx}`,
    });
    archBatch.stone(st.x + 0.35, sy + 0.08, st.z + 0.32, 0.36, 0.18, 0.32, 4610 + idx * 13, 'fieldstone', mats.barrowStone);
  });

  // D. Sunken Ceremonial Processional Flagstones
  for (let row = 0; row < 7; row++) {
    const lz = 0.95 + row * 1.28;
    const cols = row % 2 === 0 ? [-0.95, 0.05, 1.02] : [-0.52, 0.55];
    for (let ci = 0; ci < cols.length; ci++) {
      const lx = cols[ci] + (rnd() - 0.5) * 0.18;
      const fz = lz + (rnd() - 0.5) * 0.16;
      const rx = 0.42 + rnd() * 0.18, rz = 0.46 + rnd() * 0.18;
      storyBatch.stone(lx, gAt(lx, fz) + 0.014, fz, rx, 0.042, rz, 4630 + row * 19 + ci * 7, 'fieldstone', mats.barrowStone, {
        rot: [0, (rnd() - 0.5) * 0.35, 0], detail: 1, tile: 0.75,
      });
    }
  }

  // E. Carved Offering Altar Table, Antler Ward Totem & Ritual Ash Brazier
  const ax = -3.65, az = 5.15, ay = gAt(ax, az);
  storyBatch.stone(ax - 0.42, ay + 0.22, az, 0.22, 0.30, 0.44, 4680, 'fieldstone', mats.barrowStone);
  storyBatch.stone(ax + 0.42, ay + 0.22, az, 0.22, 0.30, 0.44, 4681, 'fieldstone', mats.barrowStone);
  storyBatch.stone(ax, ay + 0.52, az, 0.78, 0.13, 0.52, 4682, 'granite', mats.barrowStone);
  storyBatch.cyl(0.24, 0.16, 0.14, 12, mats.fieldstone, ax - 0.16, ay + 0.68, az + 0.04);
  storyBatch.cyl(0.18, 0.18, 0.03, 10, mats.ash, ax - 0.16, ay + 0.74, az + 0.04);
  for (let k = 0; k < 4; k++) {
    storyBatch.stone(ax + 0.34, ay + 0.66 + k * 0.065, az - 0.05, 0.14 - k * 0.022, 0.038, 0.12 - k * 0.018, 4685 + k, 'river', mats.monolith);
  }

  const tx = -4.55, tz = 4.35, ty = gAt(tx, tz);
  storyBatch.rod([tx, ty - 0.15, tz], [tx + 0.06, ty + 2.05, tz - 0.04], 0.052, 0.068, 7, mats.timberDark);
  storyBatch.rod([tx - 0.42, ty + 1.48, tz + 0.06], [tx + 0.48, ty + 1.54, tz - 0.06], 0.032, 0.036, 6, mats.timber);
  storyBatch.stone(tx + 0.08, ty + 1.88, tz + 0.04, 0.13, 0.18, 0.24, 4691, 'river', mats.bone, { rot: [0.32, 0.4, 0] });
  for (const side of [-1, 1]) {
    storyBatch.tube([
      [tx + 0.06 + side * 0.08, ty + 2.02, tz - 0.02],
      [tx + 0.06 + side * 0.34, ty + 2.24, tz - 0.14],
      [tx + 0.06 + side * 0.56, ty + 2.52, tz + 0.06],
      [tx + 0.06 + side * 0.48, ty + 2.74, tz + 0.24],
    ], 5, (u) => lerp(0.026, 0.008, u), mats.bone, 0.4);
    storyBatch.rod([tx + 0.06 + side * 0.32, ty + 2.22, tz - 0.12], [tx + 0.06 + side * 0.24, ty + 2.48, tz + 0.14], 0.008, 0.018, 5, mats.bone);
  }
  for (const dx of [-0.30, 0.32]) {
    storyBatch.rod([tx + dx, ty + 1.50, tz], [tx + dx, ty + 1.18, tz], 0.006, 0.006, 4, mats.canvas);
    storyBatch.cyl(0.028, 0.012, 0.16, 6, mats.bone, tx + dx, ty + 1.12, tz);
  }

  // F. Lt. Ade's PGB Intelligence Field Case & Warm Ground Lantern
  const lx1 = 3.75, lz1 = 5.55, ly1 = gAt(lx1, lz1);
  addPgbCase(storyBatch, mats, lx1, ly1, lz1, -0.52, { w: 0.64, h: 0.30, d: 0.42, open: true });
  addHangingMineLantern(T, storyBatch, storyGrp, mats, lx1 - 0.55, gAt(lx1 - 0.55, lz1 + 0.42) + 0.24, lz1 + 0.42, {
    lights, worldOf, color: 0xff9838, intensity: 2.5, dist: 14, phase: 3.1,
  });
}

// ===========================================================================
// 6. CHALK / THE MARROW CAVE — "The Sealed Heart Threshold"
// ===========================================================================
function dressChalkCave(T, c, archBatch, storyBatch, archGrp, storyGrp, helpers) {
  const { d, rnd, gAt, worldOf, doc, mats, lights, leds, firstPeople } = helpers;
  const w = d.w;

  // A. Pale Karst Bone-Rib Buttresses & Calcite Spire Clusters framing the sealed Marrow door
  for (const s of [-1, 1]) {
    const ribs = [
      { ox: 0.32, oz: 0.28, bw: 0.95, bh: 6.4, bd: 1.35, tiltZ: -s * 0.18, yaw: s * 0.25 },
      { ox: 1.35, oz: 0.82, bw: 1.15, bh: 4.9, bd: 1.55, tiltZ: -s * 0.26, yaw: s * 0.38 },
      { ox: 2.38, oz: 1.52, bw: 1.05, bh: 3.2, bd: 1.40, tiltZ: -s * 0.32, yaw: s * 0.48 },
    ];
    ribs.forEach((rb, ri) => {
      const lx = s * (w + rb.ox), lz = rb.oz;
      archBatch.blade(lx, gAt(lx, lz) + rb.bh * 0.44 - 0.3, lz, rb.bw, rb.bh, rb.bd, 4701 + ri * 23 + s * 9, 'limestone', mats.marrowChalk, {
        rx: 0.05, ry: rb.yaw, rz: rb.tiltZ, taperTop: 0.26, detail: 1, tile: 1.2,
      });
    });
    for (let k = 0; k < 4; k++) {
      const sx = s * (w + 0.05 + k * 0.42), sz = 0.55 + k * 0.32;
      const sh = 0.65 + rnd() * 0.95;
      archBatch.cyl(0.03, 0.14 + rnd() * 0.08, sh, 7, mats.marrowChalk, sx, gAt(sx, sz) + sh * 0.45 - 0.05, sz, (rnd() - 0.5) * 0.12, 0, s * 0.08);
    }
  }

  // B. Twin Fluted First People Ward Obelisks (skin-tight cyan rune faces angled toward approaching player!)
  const obelisks = [
    { x: -4.75, z: 5.85, h: 3.35, w: 0.74, t: 0.56, yaw: 0.32, leanZ: -0.05, glyphs: [0, 2, 4, 6] },
    { x: 4.85, z: 5.55, h: 3.05, w: 0.72, t: 0.54, yaw: -0.34, leanZ: 0.06, glyphs: [1, 3, 5, 7] },
  ];
  obelisks.forEach((ob, oi) => {
    const oy = gAt(ob.x, ob.z);
    archBatch.stone(ob.x, oy + 0.16, ob.z, 0.78, 0.26, 0.72, 4740 + oi * 11, 'limestone', mats.marrowChalk);
    addStandingMenhirWithRunes(T, archGrp, {
      x: ob.x, y: oy + 0.05, z: ob.z, w: ob.w, h: ob.h, t: ob.t,
      rx: 0.03, ry: ob.yaw, rz: ob.leanZ, taper: 0.24, crown: 0.28,
      rnd, stoneMat: mats.marrowChalk, runeTex: makeObeliskRuneTexture(T, doc, ob.glyphs),
      firstPeople, name: `marrow-obelisk-${oi}`,
    });
  });

  // C. Broken Curved Arc of Seven Threshold Bound-Stones (center shattered & pushed outward from inside!)
  for (let i = 0; i < 7; i++) {
    const a = lerp(-0.92, 0.92, i / 6);
    const rArc = 7.45;
    const bx = Math.sin(a) * rArc;
    const bz = Math.cos(a) * rArc + 0.4;
    if (i === 3) {
      storyBatch.stone(bx - 1.15, gAt(bx - 1.15, bz + 0.85) + 0.14, bz + 0.85, 0.55, 0.24, 0.42, 4760, 'limestone', mats.marrowChalk, { rot: [0.25, 0.7, 0.35] });
      storyBatch.stone(bx + 1.25, gAt(bx + 1.25, bz + 0.95) + 0.12, bz + 0.95, 0.48, 0.20, 0.38, 4761, 'limestone', mats.marrowChalk, { rot: [-0.2, -0.5, -0.3] });
      continue;
    }
    const gy = gAt(bx, bz);
    const sh = i === 2 || i === 4 ? 0.68 : 0.92;
    const leanOut = i === 2 || i === 4 ? 0.24 : 0.08;
    storyBatch.menhir(bx, gy - 0.14, bz, 0.48, sh, 0.36, rnd, mats.marrowChalk, {
      rx: leanOut, ry: a, rz: (rnd() - 0.5) * 0.14, taper: 0.18, crown: 0.14, flatFront: false,
    });
  }

  // D. THE ANCIENT HAND-PRINT STONE (docs/story.md §7 — framed by pale chalk boulders & votive pebbles!)
  const hpx = -3.65, hpz = 3.05, hpy = gAt(hpx, hpz);
  const handTex = makeMarrowHandprintTexture(T, doc);
  storyBatch.stone(hpx - 0.06, hpy + 0.24, hpz - 0.16, 0.74, 0.40, 0.62, 4775, 'limestone', mats.marrowChalk, { rot: [0, 0.34, 0] });
  storyBatch.stone(hpx + 0.58, gAt(hpx + 0.58, hpz + 0.35) + 0.10, hpz + 0.35, 0.26, 0.14, 0.22, 4776, 'limestone', mats.marrowChalk);
  addPlacardMesh(T, storyGrp, handTex, 0xc2bdb0, 0.88, 1.00, 0.18, hpx + 0.04, hpy + 0.74, hpz + 0.06, -0.22, 0.34, -0.03, 'marrow-handprint-stone', mats.marrowChalk);

  // E. Desperate Coldwater Settlers' Iron Ward Stakes & Soft Feathered Rust Blooms flanking the Door Crack!
  const rustTex = makeRustBloomTexture(T, doc);
  const rustDecalMat = new T.MeshStandardMaterial({
    color: rustTex ? 0xffffff : 0x7c3b1e,
    map: rustTex || null,
    transparent: true,
    opacity: rustTex ? 0.92 : 0.55,
    roughness: 0.94,
    metalness: 0.04,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  });
  const stakes = [
    [-1.55, 1.35, 0.78, 0.06, 0.04],
    [-2.25, 1.75, 0.66, -0.04, -0.08],
    [1.48, 1.38, 0.82, 0.34, 0.22],
    [2.22, 1.82, 0.68, 0.08, -0.06],
  ];
  stakes.forEach(([sx, sz, sh, rx, rz], idx) => {
    const sy = gAt(sx, sz);
    storyBatch.rod([sx, sy - 0.10, sz], [sx + Math.sin(rz) * sh, sy + sh, sz + Math.sin(rx) * sh], 0.032, 0.046, 6, mats.ironRust);
    storyBatch.cyl(0.062, 0.046, 0.05, 6, mats.iron, sx + Math.sin(rz) * sh, sy + sh, sz + Math.sin(rx) * sh, rx, 0, rz);
    // Feathered organic rust-oxide stain bleeding across the chalk floor (NO hard orange circles!)
    const stain = new T.Mesh(new T.PlaneGeometry(0.95, 0.95), rustDecalMat);
    stain.name = `marrow-rust-stain-${idx}`;
    stain.rotation.x = -Math.PI / 2;
    stain.rotation.z = idx * 1.4;
    stain.position.set(sx, sy + 0.018, sz);
    stain.receiveShadow = true;
    storyGrp.add(stain);
    if (idx === 2) {
      addHorseshoe(storyBatch, mats, sx + 0.18, sy + 0.03, sz + 0.24, Math.PI / 2, 0.4, Math.PI, 1.1);
    }
  });
  storyBatch.tube([
    [-2.25, gAt(-2.25, 1.75) + 0.56, 1.75],
    [-1.90, gAt(-1.90, 1.55) + 0.42, 1.55],
    [-1.55, gAt(-1.55, 1.35) + 0.64, 1.35],
    [-1.25, gAt(-1.25, 1.48) + 0.06, 1.48],
  ], 5, 0.018, mats.ironRust, 0.35);

  // F. Abandoned PGB Acoustic / Seismograph Containment Station (with dropped clipboard + headset!)
  const sx0 = 4.65, sz0 = 4.05, sy0 = gAt(sx0, sz0);
  const stYaw = -0.58;
  storyBatch.box(1.24, 0.06, 0.68, mats.pgbOlive, sx0, sy0 + 0.78, sz0, 0, stYaw, 0, 0.7);
  const sc = Math.cos(stYaw), ss = Math.sin(stYaw);
  const tPt = (lx, ly, lz) => [sx0 + lx * sc + lz * ss, sy0 + ly, sz0 - lx * ss + lz * sc];
  for (const fx of [-0.54, 0.54]) for (const fz of [-0.28, 0.28]) {
    const legTop = tPt(fx, 0.76, fz);
    const legBot = tPt(fx, 0, fz);
    storyBatch.rod([legBot[0], gAt(legBot[0], legBot[2]) - 0.06, legBot[2]], legTop, 0.018, 0.020, 5, mats.pgbDark);
  }
  const recP = tPt(-0.18, 0.96, -0.04);
  storyBatch.box(0.58, 0.32, 0.38, mats.pgbDark, recP[0], recP[1], recP[2], 0, stYaw, 0, 0.5);
  const oscTex = makeSeismographScreenTexture(T, doc);
  const oscMat = oscTex
    ? new T.MeshStandardMaterial({ color: 0xffffff, map: oscTex, emissive: 0x62d4bc, emissiveMap: oscTex, emissiveIntensity: 0.95, roughness: 0.25 })
    : new T.MeshStandardMaterial({ color: 0x3a8878, emissive: 0x42b49c, emissiveIntensity: 0.75, roughness: 0.3 });
  const scrPos = tPt(-0.18, 0.97, 0.16);
  const scr = new T.Mesh(new T.PlaneGeometry(0.46, 0.23), oscMat);
  scr.name = 'marrow-seismograph-screen';
  scr.position.set(scrPos[0], scrPos[1], scrPos[2]);
  scr.rotation.y = stYaw;
  storyGrp.add(scr);
  for (const rx of [-0.32, -0.04]) {
    const rp = tPt(rx, 1.15, -0.04);
    storyBatch.cyl(0.11, 0.11, 0.035, 12, mats.iron, rp[0], rp[1], rp[2], 0, stYaw, 0);
    storyBatch.cyl(0.035, 0.035, 0.05, 8, mats.brass, rp[0], rp[1] + 0.01, rp[2], 0, stYaw, 0);
  }
  // Dropped clipboard & acoustic headphones resting on right half of the field table
  const cbP = tPt(0.36, 0.82, 0.08);
  storyBatch.box(0.24, 0.016, 0.32, mats.timber, cbP[0], cbP[1], cbP[2], 0, stYaw + 0.35, 0);
  storyBatch.box(0.20, 0.012, 0.26, mats.bone, cbP[0], cbP[1] + 0.012, cbP[2], 0, stYaw + 0.35, 0);
  const hpP = tPt(0.32, 0.86, -0.16);
  storyBatch.torus(0.095, 0.014, 5, 12, Math.PI, mats.pgbDark, hpP[0], hpP[1], hpP[2], Math.PI * 0.45, stYaw, 0);
  const ledP = tPt(0.06, 1.07, 0.16);
  addBlinkingLed(T, storyGrp, leds, ledP[0], ledP[1], ledP[2], 0xe83220, 1.05, 0.1);

  const dishX = 3.55, dishZ = 2.85, dishY = gAt(dishX, dishZ);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    storyBatch.rod([dishX + Math.cos(a) * 0.35, dishY - 0.06, dishZ + Math.sin(a) * 0.35], [dishX, dishY + 0.72, dishZ], 0.016, 0.018, 5, mats.pgbDark);
  }
  const dishYaw = Math.atan2(-dishX, -0.5 - dishZ);
  storyBatch.cyl(0.46, 0.12, 0.18, 14, mats.pgbOlive, dishX, dishY + 0.92, dishZ, Math.PI * 0.42, dishYaw, 0, 0.5);
  storyBatch.rod([dishX, dishY + 0.92, dishZ], [dishX + Math.sin(dishYaw) * 0.36, dishY + 1.02, dishZ + Math.cos(dishYaw) * 0.36], 0.014, 0.022, 6, mats.iron);
  storyBatch.tube([
    [sx0, sy0 + 0.74, sz0],
    [4.15, gAt(4.15, 3.35) + 0.04, 3.35],
    [dishX, dishY + 0.05, dishZ],
    [2.65, gAt(2.65, 1.45) + 0.04, 1.45],
  ], 4, 0.018, mats.cable, 0.4);

  const bx1 = 3.25, bz1 = 6.55, by1 = gAt(bx1, bz1);
  const restTex = makeStenciledPlacardTexture(T, doc, {
    lines: [
      { text: 'PGB · SITE 9 · MARROW', size: 38, y: 0.24 },
      { text: 'DO NOT BREACH SEAL', size: 42, y: 0.52, color: '#8f1b10' },
      { text: 'AUTHORIZED LEVEL-5 ONLY', size: 28, y: 0.78 },
    ],
    ground: '#c5bc9e', stripe: true, rust: 0.3, seed: 4799,
  });
  for (const sx of [-0.56, 0.56]) {
    storyBatch.rod([bx1 + sx, by1 - 0.06, bz1], [bx1 + sx, by1 + 1.15, bz1], 0.028, 0.032, 6, mats.pgbDark);
  }
  addPlacardMesh(T, storyGrp, restTex, 0xc5bc9e, 1.28, 0.74, 0.04, bx1, by1 + 0.88, bz1 + 0.03, 0, -0.34, 0.05, 'marrow-restrict-sign', mats.pgbDark);

  // Warm Sodium-Amber Tripod Work-Lamp aimed INWARD (yaw = Math.PI + 0.72) casting warm grazing contrast against the icy cyan Marrow door!
  addFieldTripodLamp(T, storyBatch, storyGrp, mats, 5.75, gAt(5.75, 4.95), 4.95, Math.PI + 0.72, -0.14, 2.05, {
    lights, worldOf, color: 0xff9e3c, intensity: 3.3, dist: 17, phase: 2.8, flicker: 0.05,
  });
}

// ===========================================================================
// Master Builder + Frame Updater
// ===========================================================================
export function buildAllCaveEntrances(THREE, ctx) {
  const {
    caves = [],
    sampleHeight,
    mouthPoint,
    doc = null,
    firstPeople = null,
  } = ctx || {};

  const mats = getMaterials(THREE);
  const root = new THREE.Group();
  root.name = 'cave-entrance-dressing';
  root.userData.cullKids = true;

  const lights = [];
  const leds = [];
  const perCave = [];

  for (const c of caves) {
    if (!c || !c.design) continue;
    const T = c.theme;
    const d = c.design;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
    const toWorldXZ = (lx, lz) => [c.x + rx * lx + fx * lz, c.z + rz * lx + fz * lz];
    const worldOf = (lx, ly, lz) => {
      const [wx, wz] = toWorldXZ(lx, lz);
      return [wx, c.gy + ly, wz];
    };
    const gAt = (lx, lz) => {
      const [wx, wz] = toWorldXZ(lx, lz);
      return sampleHeight(wx, wz) - c.gy;
    };
    const lipAt = (t) => {
      if (typeof mouthPoint === 'function') return mouthPoint(d, t, c.faceSeed || 0);
      const cc = Math.cos(t), ss = Math.sin(t), k = 2 / (d.p || 2);
      const x = d.w * Math.sign(cc) * Math.pow(Math.abs(cc), k);
      const y = d.h * Math.pow(Math.max(0, ss), k);
      return [x + (d.skew || 0) * y, Math.max(0, y)];
    };

    const archGrp = new THREE.Group();
    archGrp.name = `cave-arch:${T}`;
    archGrp.position.set(c.x, c.gy, c.z);
    archGrp.rotation.y = c.yaw;
    archGrp.userData.maxDist = 175;

    const storyGrp = new THREE.Group();
    storyGrp.name = `cave-story:${T}`;
    storyGrp.position.set(c.x, c.gy, c.z);
    storyGrp.rotation.y = c.yaw;
    storyGrp.userData.maxDist = 96;

    const archBatch = new BatchBuilder(THREE, `cave-arch-${T}`);
    const storyBatch = new BatchBuilder(THREE, `cave-story-${T}`);
    const rnd = makeRng((c.faceSeed || 1) * 1664525 + T.charCodeAt(0) * 97);

    const helpers = { d, rnd, gAt, lipAt, worldOf, doc, mats, lights, leds, firstPeople };

    if (T === 'root') dressRootCave(THREE, c, archBatch, storyBatch, archGrp, storyGrp, helpers);
    else if (T === 'shale') dressShaleCave(THREE, c, archBatch, storyBatch, archGrp, storyGrp, helpers);
    else if (T === 'iron') dressIronCave(THREE, c, archBatch, storyBatch, archGrp, storyGrp, helpers);
    else if (T === 'wet') dressWetCave(THREE, c, archBatch, storyBatch, archGrp, storyGrp, helpers);
    else if (T === 'hill') dressHillCave(THREE, c, archBatch, storyBatch, archGrp, storyGrp, helpers);
    else if (T === 'chalk') dressChalkCave(THREE, c, archBatch, storyBatch, archGrp, storyGrp, helpers);

    archBatch.flush(archGrp);
    storyBatch.flush(storyGrp);

    root.add(archGrp);
    root.add(storyGrp);
    perCave.push({ theme: T, archGrp, storyGrp });
  }

  return { group: root, perCave, lights, leds };
}

export function updateCaveEntrances(rig, { now = 0, night = false, dusk = 0, requestEffectLight = null, camPos = null } = {}) {
  if (!rig) return;
  const darkWeight = night ? 1.0 : clamp(dusk, 0, 1);

  for (let i = 0; i < rig.lights.length; i++) {
    const L = rig.lights[i];
    const pulse = 1 + Math.sin(now * 6.5 + L.phase * 4.3) * L.flicker + Math.sin(now * 14.1 + L.phase) * L.flicker * 0.45;
    if (L.lensMat) {
      L.lensMat.emissiveIntensity = lerp(0.45, 1.85, darkWeight) * pulse;
    }
    if (darkWeight > 0.04 && requestEffectLight) {
      if (camPos) {
        const dx = L.wx - camPos.x, dz = L.wz - camPos.z;
        if (dx * dx + dz * dz > 85 * 85) continue;
      }
      requestEffectLight(L.wx, L.wy, L.wz, L.color, L.intensity * darkWeight * pulse, L.dist);
    }
  }

  for (let i = 0; i < rig.leds.length; i++) {
    const ld = rig.leds[i];
    const cyc = ((now + ld.phase) % ld.period) / ld.period;
    const on = cyc < 0.28;
    ld.mat.emissiveIntensity = on ? ld.baseIntensity * (0.65 + 0.55 * darkWeight) : 0.08;
  }
}
