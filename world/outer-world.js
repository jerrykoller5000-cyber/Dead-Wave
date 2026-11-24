// world/outer-world.js — AG-408 / AG-411: Outer World Beyond the Fenceline (r > LAND_MAX = 220 m).
// Transforms the outer mountain bowl beyond the circle wall into a genuinely convincing, atmospheric,
// lore-true Pacific Northwest alpine world when viewed from anywhere inside the circle:
//   - Two sculpted distant alpine mountain ranges (r = 450..1175 m) with craggy TSL rock/snow breakup,
//     dusk alpenglow, and cohesive Night / Blood Moon / Storm atmospheric perspective.
//   - Dense instanced outer foothill conifers (organic 6-7 whorl drooping bough silhouettes matching
//     the inner valley pines) & clustered forked autumn larch/birch screening the wall & slopes.
//   - Slope-aligned, corner-clamped, deep-root alpine granite cliff buttresses with automatic high-
//     altitude snow caps & canyon-bank framing (ZERO floating pancake rocks!).
//   - 7 upgraded story-grounded distant landmarks with real architectural silhouettes, per-leg
//     terrain-anchored footings, rock collars, weathered PBR TSL shaders & optical edge-softening:
//       1. RIDGELINE (North massif 282 deg + NW horn 256 deg): Stepped rock-cradled PGB concrete
//          radar bunker, buttresses, dark ops visor bay, detailed geodesic radome + catwalk, 36 m
//          open-truss microwave tower, helipad & pulsing twin red aviation beacons.
//       2. West Cordon Pass (181.6..197 deg): Rock-anchored PGB Overwatch bunker & X-braced steel
//          watchtower with stairs/catwalk/mullioned cab/pitched roof, feathered gravel exterior pass
//          road, & 4 open-lattice high-voltage pylons with per-leg footings & sagging catenary wires.
//       3. ESE River Gorge (29.6 deg): Animated foaming alpine river cascade framed by canyon crags
//          & Coldwater heavy-timber broken logging trestle with masonry piers & longitudinal bracing.
//       4. NE Mountain Pass Saddle (330..348 deg): Arched concrete valley viaduct, gambrel-roofed
//          PNW timber barn & hooped stave silo, and organically clustered distant night town lights.
//       5. SE High Ridge (64 deg): Authentic USFS-style timber fire-lookout tower with interior
//          zig-zag stairs, cantilevered catwalk/railings, dark-glass mullioned cab & hipped roof.
//       6. South Bench (106 deg): Stepped hillside Coldwater timber ore mill, elevated ore chute,
//          braced timber shaft headframe + spoked sheave wheel, hoist house & guyed smokestack.
//       7. NW Ridge Crest (234 deg): Sculpted, fractured ancient First People basalt monoliths &
//          tumbled stone cairn emerging from a dark rocky ridge outcrop.
//   - Multi-layered billowing valley mist & mountain peak cloud drapes partially occluding distant
//     foundations & canyons, plus sculpted soaring mountain raptors.
//
// Zero gameplay/collider/terrain/RNG side-effects; auto-hides inside Hollows & Training Ground.

import { mulberry32, sculptRockGeometry } from './rock-geometry.js';
import { createOuterAtmosphere, createOuterWorldMaterials } from './outer-textures.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / ((b - a) || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

// Lightweight 2D/3D deterministic hash + value noise + FBM + ridged noise
function hash2i(ix, iz, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function hash3f(a, b, c) {
  let h = Math.imul((a * 1000) | 0, 374761393) ^ Math.imul((b * 1000) | 0, 668265263) ^ Math.imul((c * 1000) | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise2(x, z, seed = 1) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2i(ix, iz, seed), b = hash2i(ix + 1, iz, seed);
  const c = hash2i(ix, iz + 1, seed), d = hash2i(ix + 1, iz + 1, seed);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uz);
}
function fbm2(x, z, seed = 1, oct = 4) {
  let s = 0, amp = 0.5, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) {
    s += (vnoise2(x * f, z * f, seed + i * 97) * 2 - 1) * amp;
    norm += amp; amp *= 0.5; f *= 2.04;
  }
  return norm > 0 ? s / norm : 0;
}
function ridged2(x, z, seed = 1, oct = 4) {
  let s = 0, amp = 0.5, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) {
    const n = 1 - Math.abs(vnoise2(x * f, z * f, seed + i * 131) * 2 - 1);
    s += n * n * amp;
    norm += amp; amp *= 0.48; f *= 2.08;
  }
  return norm > 0 ? s / norm : 0;
}
function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// =========================================================================
// ENHANCED STATIC BATCHER: Vertex-AO hemispheric shading + custom tris
// =========================================================================
function createStaticBatcher(THREE) {
  const pos = [];
  const nrm = [];
  const col = [];
  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpE = new THREE.Euler();
  const tmpS = new THREE.Vector3();
  const tmpP = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const tmpN = new THREE.Vector3();
  const nrmM = new THREE.Matrix3();
  const cObj = new THREE.Color();

  function addGeo(geo, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, shade = 1) {
    tmpE.set(rx, ry, rz);
    tmpQ.setFromEuler(tmpE);
    tmpP.set(x, y, z);
    tmpS.set(sx, sy, sz);
    tmpM.compose(tmpP, tmpQ, tmpS);
    nrmM.getNormalMatrix(tmpM);

    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.normal && typeof g.computeVertexNormals === 'function') g.computeVertexNormals();
    const gp = g.attributes.position;
    const gn = g.attributes.normal;
    cObj.setHex(hex).multiplyScalar(shade);
    const br = clamp(cObj.r, 0, 1), bg = clamp(cObj.g, 0, 1), bb = clamp(cObj.b, 0, 1);

    for (let i = 0; i < gp.count; i++) {
      tmpV.set(gp.getX(i), gp.getY(i), gp.getZ(i)).applyMatrix4(tmpM);
      pos.push(tmpV.x, tmpV.y, tmpV.z);
      let ny = 1;
      if (gn) {
        tmpN.set(gn.getX(i), gn.getY(i), gn.getZ(i)).applyMatrix3(nrmM).normalize();
        nrm.push(tmpN.x, tmpN.y, tmpN.z);
        ny = tmpN.y;
      } else {
        nrm.push(0, 1, 0);
      }
      // Physical hemispheric self-shading: overhangs/undersides darker, top bevels catch sky light
      const hemi = 0.80 + 0.24 * (ny * 0.5 + 0.5);
      col.push(clamp(br * hemi, 0, 1), clamp(bg * hemi, 0, 1), clamp(bb * hemi, 0, 1));
    }
    if (g !== geo) g.dispose();
  }

  function addTri(a, b, c, hex, shade = 1) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    cObj.setHex(hex).multiplyScalar(shade);
    const hemi = 0.80 + 0.24 * (ny * 0.5 + 0.5);
    const cr = clamp(cObj.r * hemi, 0, 1), cg = clamp(cObj.g * hemi, 0, 1), cb = clamp(cObj.b * hemi, 0, 1);
    for (const v of [a, b, c]) {
      pos.push(v[0], v[1], v[2]);
      nrm.push(nx, ny, nz);
      col.push(cr, cg, cb);
    }
  }

  function addRawVertex(x, y, z, nx, ny, nz, r, g, b) {
    pos.push(x, y, z);
    nrm.push(nx, ny, nz);
    col.push(clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1));
  }

  function box(w, h, d, hex, x, y, z, rx = 0, ry = 0, rz = 0, shade = 1) {
    const g = new THREE.BoxGeometry(w, h, d);
    addGeo(g, hex, x, y, z, rx, ry, rz, 1, 1, 1, shade);
    g.dispose();
  }

  function cyl(rt, rb, h, segs, hex, x, y, z, rx = 0, ry = 0, rz = 0, shade = 1) {
    const g = new THREE.CylinderGeometry(rt, rb, h, segs);
    addGeo(g, hex, x, y, z, rx, ry, rz, 1, 1, 1, shade);
    g.dispose();
  }

  function strut(a, b, r, hex, segs = 5, shade = 1) {
    const ax = a[0], ay = a[1], az = a[2], bx = b[0], by = b[1], bz = b[2];
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-4) return;
    const g = new THREE.CylinderGeometry(r, r, len, segs);
    const dir = new THREE.Vector3(dx / len, dy / len, dz / len);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const e = new THREE.Euler().setFromQuaternion(q);
    addGeo(g, hex, (ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5, e.x, e.y, e.z, 1, 1, 1, shade);
    g.dispose();
  }

  // Ground-anchored tapered rectangular/octagonal pier extending cleanly down into terrain
  function anchoredPier(wx, wz, topY, groundY, topR, botR, hex, yaw = 0, segs = 4, bury = 4.8) {
    const botY = groundY - bury;
    const h = Math.max(1.2, topY - botY);
    cyl(topR, botR, h, segs, hex, wx, botY + h * 0.5, wz, 0, yaw + (segs === 4 ? Math.PI * 0.25 : 0), 0);
  }

  // Pitched gable roof prism oriented along local X (length) & Z (span width) via site frame P
  function gableRoof(P, cx, baseY, cz, lenX, spanZ, riseY, eaveX, eaveZ, hexRoof, hexGable) {
    const hx = lenX * 0.5 + eaveX, hz = spanZ * 0.5 + eaveZ;
    const gx = lenX * 0.5, gz = spanZ * 0.5;
    const r0 = P(cx - hx, baseY + riseY, cz);
    const r1 = P(cx + hx, baseY + riseY, cz);
    const f0 = P(cx - hx, baseY, cz + hz);
    const f1 = P(cx + hx, baseY, cz + hz);
    const b0 = P(cx - hx, baseY, cz - hz);
    const b1 = P(cx + hx, baseY, cz - hz);
    // Two pitched roof slopes (double-sided thickness via outer & lower faces)
    addTri(f0, f1, r1, hexRoof, 1.04); addTri(f0, r1, r0, hexRoof, 1.04);
    addTri(b1, b0, r0, hexRoof, 0.94); addTri(b1, r0, r1, hexRoof, 0.94);
    // Dark roof undersides (so looking up from valley shows realistic shaded eaves!)
    addTri(f1, f0, r0, hexRoof, 0.48); addTri(f1, r0, r1, hexRoof, 0.48);
    addTri(b0, b1, r1, hexRoof, 0.48); addTri(b0, r1, r0, hexRoof, 0.48);
    // Triangular gable end walls
    if (hexGable != null) {
      const gr0 = P(cx - gx, baseY + riseY, cz), gf0 = P(cx - gx, baseY, cz + gz), gb0 = P(cx - gx, baseY, cz - gz);
      const gr1 = P(cx + gx, baseY + riseY, cz), gf1 = P(cx + gx, baseY, cz + gz), gb1 = P(cx + gx, baseY, cz - gz);
      addTri(gb0, gf0, gr0, hexGable, 0.92);
      addTri(gf1, gb1, gr1, hexGable, 0.96);
    }
  }

  // Overhanging hipped roof (classic USFS lookout / mountain bunker cap)
  function hipRoof(P, cx, baseY, cz, spanX, spanZ, riseY, ridgeX, hexRoof) {
    const hx = spanX * 0.5, hz = spanZ * 0.5, rx = ridgeX * 0.5;
    const c0 = P(cx - hx, baseY, cz + hz);
    const c1 = P(cx + hx, baseY, cz + hz);
    const c2 = P(cx + hx, baseY, cz - hz);
    const c3 = P(cx - hx, baseY, cz - hz);
    const r0 = P(cx - rx, baseY + riseY, cz);
    const r1 = P(cx + rx, baseY + riseY, cz);
    // Top hip faces
    addTri(c0, c1, r1, hexRoof, 1.05); addTri(c0, r1, r0, hexRoof, 1.05);
    addTri(c2, c3, r0, hexRoof, 0.92); addTri(c2, r0, r1, hexRoof, 0.92);
    addTri(c1, c2, r1, hexRoof, 0.98);
    addTri(c3, c0, r0, hexRoof, 0.95);
    // Shaded eaves underside
    addTri(c1, c0, r0, hexRoof, 0.42); addTri(c1, r0, r1, hexRoof, 0.42);
    addTri(c3, c2, r1, hexRoof, 0.42); addTri(c3, r1, r0, hexRoof, 0.42);
    addTri(c2, c1, r1, hexRoof, 0.42);
    addTri(c0, c3, r0, hexRoof, 0.42);
  }

  function build(name, mat) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
  }

  return { addGeo, addTri, addRawVertex, box, cyl, strut, anchoredPier, gableRoof, hipRoof, build, count: () => pos.length / 9 };
}

function makeSiteFrame(cx, cy, cz, yaw) {
  const co = Math.cos(yaw), si = Math.sin(yaw);
  return (lx, ly, lz) => [cx + co * lx + si * lz, cy + ly, cz - si * lx + co * lz];
}

function terrainNormalAt(sampleHeight, x, z, eps = 3.2) {
  const hx = (sampleHeight(x + eps, z) - sampleHeight(x - eps, z)) / (2 * eps);
  const hz = (sampleHeight(x, z + eps) - sampleHeight(x, z - eps)) / (2 * eps);
  const len = Math.hypot(-hx, 1, -hz) || 1;
  return { nx: -hx / len, ny: 1 / len, nz: -hz / len, slope: Math.hypot(hx, hz) };
}

function minFootprintY(sampleHeight, P, localXZList) {
  let lo = Infinity;
  for (const [lx, lz] of localXZList) {
    const wp = P(lx, 0, lz);
    const y = sampleHeight(wp[0], wp[2]);
    if (y < lo) lo = y;
  }
  return lo;
}

// =========================================================================
// 1. LAYERED DISTANT ALPINE MOUNTAIN RANGES (r = 450..1175 m, 360-deg!)
// Higher-resolution glaciated arêtes, stepped cirques, couloirs, and UV.y = height
// feeding the TSL Alpine Mountain Shader (cohesive Noon/Overcast/Dusk/Night!).
// =========================================================================
function buildFarMountainRange(THREE, mat, {
  name, rInner, rPeak, rOuter, baseY, peakMin, peakMax,
  segs = 240, rings = 12, seed = 101,
  lowHex, midHex, rockHex, snowHex, snowLine = 0.62,
  saddleAngles = [],
}) {
  const cLow = new THREE.Color(lowHex);
  const cMid = new THREE.Color(midHex);
  const cRock = new THREE.Color(rockHex);
  const cSnow = new THREE.Color(snowHex);
  const cTmp = new THREE.Color();

  const cols = segs;
  const rows = rings + 1;
  const vCount = rows * cols;
  const pos = new Float32Array(vCount * 3);
  const col = new Float32Array(vCount * 3);
  const uvArr = new Float32Array(vCount * 2);
  const hGrid = new Float32Array(vCount);

  for (let ri = 0; ri < rows; ri++) {
    const t = ri / rings;
    const r = t <= 0.54
      ? lerp(rInner, rPeak, t / 0.54)
      : lerp(rPeak, rOuter, (t - 0.54) / 0.46);
    const arch = t <= 0.54
      ? Math.pow(Math.sin((t / 0.54) * Math.PI * 0.5), 1.18)
      : Math.cos(((t - 0.54) / 0.46) * Math.PI * 0.5);

    for (let si = 0; si < cols; si++) {
      const a = (si / cols) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const wx = ca * r, wz = sa * r;

      // Multi-scale glaciated alpine arête + sharp horn peaks + secondary rocky spurs
      const macro = ridged2(wx * 0.0021 + 4.1, wz * 0.0021 - 2.9, seed, 5);
      const ridge = ridged2(wx * 0.0058 - 1.7, wz * 0.0058 + 6.3, seed + 53, 4);
      const couloir = ridged2(wx * 0.0135 + 2.2, wz * 0.0135 - 5.1, seed + 109, 3);
      const warp = fbm2(wx * 0.0034, wz * 0.0034, seed + 19, 3);

      let saddleMul = 1.0;
      for (const sd of saddleAngles) {
        const da = Math.abs(angDiff(a, sd.ang));
        if (da < sd.width) {
          const k = 1 - sstep(0, sd.width, da);
          saddleMul *= (1 - k * sd.dip);
        }
      }

      const crestDrive = clamp(Math.pow(macro, 1.38) * 0.72 + ridge * 0.24 + warp * 0.08, 0, 1);
      const crestH = lerp(peakMin, peakMax, crestDrive) * saddleMul;
      // Glacial cirque ribs & rugged rocky shoulders breaking up flat slopes
      const shoulderRibs = ((couloir - 0.48) * 26 + fbm2(wx * 0.011, wz * 0.011, seed + 91, 2) * 14) * arch * (0.45 + 0.55 * t);
      const y = baseY + arch * crestH + shoulderRibs;

      const vi = ri * cols + si;
      pos[vi * 3] = wx;
      pos[vi * 3 + 1] = y;
      pos[vi * 3 + 2] = wz;
      const hn = clamp((y - baseY) / Math.max(1, peakMax), 0, 1);
      hGrid[vi] = hn;
      uvArr[vi * 2] = si / cols;
      uvArr[vi * 2 + 1] = hn;

      // Stratified alpine coloration: pine-dark base -> slate couloirs -> rugged granite -> snow ledges
      const snowNoise = fbm2(wx * 0.014, wz * 0.014, seed + 173, 3) * 0.16 - (1 - couloir) * 0.12;
      const sunFace = clamp(ca * 0.52 + sa * 0.34 + 0.5, 0, 1);
      const shade = 0.74 + sunFace * 0.32 + (ridge - 0.5) * 0.22 + (couloir - 0.5) * 0.14;

      if (hn < 0.26) {
        cTmp.copy(cLow).lerp(cMid, sstep(0.04, 0.26, hn));
      } else if (hn < snowLine + snowNoise) {
        cTmp.copy(cMid).lerp(cRock, sstep(0.24, snowLine + snowNoise, hn));
      } else {
        const sn = sstep(snowLine + snowNoise - 0.06, snowLine + snowNoise + 0.12, hn);
        cTmp.copy(cRock).lerp(cSnow, sn);
      }
      cTmp.multiplyScalar(shade);
      col[vi * 3] = clamp(cTmp.r, 0, 1);
      col[vi * 3 + 1] = clamp(cTmp.g, 0, 1);
      col[vi * 3 + 2] = clamp(cTmp.b, 0, 1);
    }
  }

  const indices = [];
  for (let ri = 0; ri < rings; ri++) {
    for (let si = 0; si < cols; si++) {
      const si2 = (si + 1) % cols;
      const a = ri * cols + si;
      const b = ri * cols + si2;
      const c = (ri + 1) * cols + si2;
      const d = (ri + 1) * cols + si;
      indices.push(a, d, c, a, c, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.frustumCulled = false;
  return { mesh, mat, baseColors: new Float32Array(col), heights: hGrid };
}

// =========================================================================
// 2. ORGANIC OUTER FOOTHILL CONIFERS & AUTUMN LARCH/BIRCH (4 instanced draws)
// Replaces flat 7-sided Playmobil cones with serrated drooping 6-7 whorl PNW
// pine boughs matching the inner valley's `addSkirt` pines + forked broadleaves!
// =========================================================================
function addConiferWhorl(b, THREE, y, R, H, points, rot, baseHex, seed, crownMidY, crownHalfH, offX = 0, offZ = 0) {
  // Decode sRGB hex via THREE.Color so outer conifer vertex colors match inner valley linear RGB!
  const cBase = new THREE.Color(baseHex);
  const apex = [offX + (hash3f(seed, 1, 2) - 0.5) * 0.10 * R, y + H, offZ + (hash3f(seed, 3, 4) - 0.5) * 0.10 * R];
  const under = [offX, y + H * 0.28, offZ];
  const rim = [];
  const n = points * 2;
  for (let k = 0; k < n; k++) {
    const a = rot + (k / n) * Math.PI * 2;
    const tip = (k % 2) === 0;
    // Uneven ragged drooping boughs with sky-notch gaps between branches!
    const rr = R * (tip ? 0.76 + hash3f(seed, k, 9) * 0.40 : 0.44 + hash3f(seed, k, 6) * 0.24);
    const droop = tip ? R * (0.24 + hash3f(seed, k, 5) * 0.14) : R * 0.03;
    rim.push([offX + Math.cos(a) * rr, y - droop, offZ + Math.sin(a) * rr, tip]);
  }

  const pushVert = (P, nx, ny, nz, up, out, spk) => {
    // Matches inner valley leafShade: deep cool-blue underside AO, warm sunlit outer needle tips!
    const ao = 0.52 + 0.48 * Math.pow(Math.min(1, out), 0.8);
    const lift = 0.72 + 0.28 * up;
    const mul = clamp(ao * lift * (1 + spk), 0.32, 1.24);
    let r = cBase.r * mul, g = cBase.g * mul, bl = cBase.b * mul;
    const warm = Math.max(0, up - 0.45) * out * 0.8;
    r += (cBase.r * 1.32 + 0.012 - r) * warm * 0.48;
    g += (cBase.g * 1.20 + 0.008 - g) * warm * 0.48;
    bl *= 1 - warm * 0.22;
    const cool = (1 - up) * (1 - out) * 0.35;
    bl += bl * cool * 0.45;
    b.addRawVertex(P[0], P[1], P[2], nx, ny, nz, r, g, bl);
  };

  for (let k = 0; k < n; k++) {
    let A = rim[k], B = rim[(k + 1) % n];
    if (R > H * 0.65) {
      const tip = A[3] ? A : B, notch = A[3] ? B : A;
      const gap = 0.14 + hash3f(seed, k, 17) * 0.18;
      const shoulder = [
        notch[0] + (tip[0] - notch[0]) * gap,
        notch[1] + H * 0.14,
        notch[2] + (tip[2] - notch[2]) * gap,
        false,
      ];
      if (A[3]) B = shoulder; else A = shoulder;
    }
    const spk = (hash3f(seed, k, 23) - 0.5) * 0.14;
    // Upper needle face
    for (const P of [apex, B, A]) {
      const hx = P[0] - offX, hz = P[2] - offZ, hl = Math.hypot(hx, hz) || 1;
      const out = Math.min(1, hl / Math.max(0.01, R));
      const nx = (hx / hl) * 0.58, ny = 0.81, nz = (hz / hl) * 0.58;
      const up = clamp(0.42 + 0.58 * ((P[1] - (crownMidY - crownHalfH)) / Math.max(0.1, crownHalfH * 2)), 0, 1);
      const isTip = P[3] === true;
      pushVert(P, nx, ny, nz, up, isTip ? 1.0 : (P === apex ? 0.36 : out * 0.78), spk + (isTip ? 0.06 : 0));
    }
    // Deeply shadowed bough underside
    for (const P of [under, A, B]) {
      const hx = P[0] - offX, hz = P[2] - offZ, hl = Math.hypot(hx, hz) || 1;
      pushVert(P, (hx / hl) * 0.38, -0.92, (hz / hl) * 0.38, 0.06, P === under ? 0.08 : 0.44, spk);
    }
  }
}

function makeConiferGeo(THREE, variant = 0) {
  const b = createStaticBatcher(THREE);
  const seed = 4110 + variant * 137;

  if (variant === 3) {
    // Organic foothill autumn larch / mountain birch: slightly bent forked trunk + 8 varied foliage tufts!
    b.cyl(0.18, 0.38, 6.2, 6, 0x4b3b2e, 0, 0.3, 0, 0.04, 0, -0.03);
    b.strut([0.05, 2.5, 0], [1.05, 4.3, -0.45], 0.11, 0x4b3b2e, 5);
    b.strut([-0.04, 2.8, 0.06], [-0.95, 4.5, 0.55], 0.10, 0x4b3b2e, 5);
    const tufts = [
      { x: 0.0,  y: 4.1, z: 0.0,  r: 1.55, sx: 1.15, sy: 0.92, sz: 1.08, hex: 0x7c5b2f },
      { x: 0.95, y: 4.5, z: -0.4, r: 1.25, sx: 1.05, sy: 0.88, sz: 1.02, hex: 0x996d33 },
      { x: -0.9, y: 4.7, z: 0.5,  r: 1.20, sx: 1.02, sy: 0.94, sz: 0.98, hex: 0x8a6430 },
      { x: 0.25, y: 5.7, z: 0.22, r: 1.30, sx: 0.96, sy: 1.05, sz: 0.94, hex: 0xa67938 },
      { x: -0.5, y: 5.5, z: -0.6, r: 1.10, sx: 1.02, sy: 0.95, sz: 1.04, hex: 0x6f7337 },
      { x: 0.65, y: 3.4, z: 0.72, r: 1.05, sx: 1.10, sy: 0.82, sz: 1.05, hex: 0x666a33 },
      { x: -0.7, y: 3.5, z: -0.5, r: 0.98, sx: 1.06, sy: 0.84, sz: 1.02, hex: 0x7a572c },
      { x: 0.08, y: 6.7, z: -0.1, r: 0.88, sx: 0.92, sy: 1.08, sz: 0.92, hex: 0xaa7f3d },
    ];
    for (let i = 0; i < tufts.length; i++) {
      const tf = tufts[i];
      const g = new THREE.IcosahedronGeometry(tf.r, 1);
      // Organic vertex displacement so crowns never look like regular polyhedra
      const p = g.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const vx = p.getX(v), vy = p.getY(v), vz = p.getZ(v);
        const k = 0.84 + hash3f(seed + i * 19, vx * 3.1, vz * 3.1 + vy * 2.3) * 0.34;
        p.setXYZ(v, vx * k, vy * k, vz * k);
      }
      g.computeVertexNormals();
      b.addGeo(g, tf.hex, tf.x, tf.y, tf.z, (i % 3 - 1) * 0.14, i * 1.1, (i % 2 ? 0.1 : -0.1), tf.sx, tf.sy, tf.sz);
      g.dispose();
    }
  } else {
    // Authentic PNW 6-7 tier serrated drooping conifers (Douglas fir / Subalpine blue spruce / Mountain hemlock)
    const configs = [
      // 0: Tall coastal Douglas fir / dark alpine spruce
      {
        H: 9.8, baseY: 1.7, maxR: 2.55, tiers: 6, leanX: 0.22, leanZ: -0.12,
        pal: [0x213522, 0x263d26, 0x2c452b, 0x324d30, 0x395636, 0x41603c],
      },
      // 1: Narrow spire-like subalpine fir / blue spruce for high ridges
      {
        H: 10.6, baseY: 1.5, maxR: 2.08, tiers: 7, leanX: -0.16, leanZ: 0.14,
        pal: [0x223633, 0x273e3a, 0x2d4743, 0x34514c, 0x3b5a55, 0x43645e, 0x4b6c66],
      },
      // 2: Heavy-boughed old-growth mountain hemlock / cedar (dense near-wall screening!)
      {
        H: 9.2, baseY: 1.4, maxR: 2.75, tiers: 6, leanX: 0.14, leanZ: 0.18,
        pal: [0x273921, 0x2e4226, 0x354b2c, 0x3c5431, 0x445e37, 0x4c683d],
      },
    ];
    const cfg = configs[variant] || configs[0];
    // Tapered buried trunk (-3.5 m root anchor -> zero floating trunks even on 35-deg slopes!)
    b.cyl(0.11, 0.42, cfg.H + 2.7, 6, 0x3e2f23, cfg.leanX * 0.35, (cfg.H - 4.3) * 0.5, cfg.leanZ * 0.35, cfg.leanZ * 0.03, 0, -cfg.leanX * 0.03);

    const crownMidY = (cfg.baseY + cfg.H) * 0.5;
    const crownHalfH = (cfg.H - cfg.baseY) * 0.5;
    for (let i = 0; i < cfg.tiers; i++) {
      const t = i / (cfg.tiers - 1);
      const y = lerp(cfg.baseY, cfg.H - 1.5, t);
      const R = cfg.maxR * lerp(1.0, 0.28, Math.pow(t, 0.88)) * (0.92 + hash3f(seed, i, 3) * 0.16);
      const wH = lerp(2.35, 1.45, t);
      const pts = i < 2 ? 7 : (i < 5 ? 6 : 5);
      const ox = cfg.leanX * t * t;
      const oz = cfg.leanZ * t * t;
      addConiferWhorl(b, THREE, y, R, wH, pts, i * 1.18 + variant * 0.7, cfg.pal[i % cfg.pal.length], seed + i * 31, crownMidY, crownHalfH, ox, oz);
    }
    // Organic ragged spire leader tuft (no blunt geometric cone tip!)
    addConiferWhorl(b, THREE, cfg.H - 0.85, 0.52, 1.45, 5, variant * 1.9, cfg.pal[cfg.pal.length - 1], seed + 299, crownMidY, crownHalfH, cfg.leanX, cfg.leanZ);
  }

  const mesh = b.build('conifer-proto-' + variant, new THREE.MeshStandardMaterial({ vertexColors: true }));
  const geo = mesh.geometry;
  mesh.material.dispose();
  return geo;
}

function buildOuterForests(THREE, mats, { sampleHeight, wallRadius, cordonAng, riverAng, exclusionCircles = [] }) {
  const rnd = mulberry32(0xa6411f1);
  const buckets = [[], [], [], []];

  // Pass A: Dense lush screening woodland belt right outside the circle wall (r = 224..274 m)
  // Naturally frames & partially occludes bare slope seams and lower structure bases (Rule 7!)
  const SCREEN_ATTEMPTS = 2400;
  const SLOPE_ATTEMPTS = 4000;
  const TOTAL = SCREEN_ATTEMPTS + SLOPE_ATTEMPTS;

  for (let i = 0; i < TOTAL; i++) {
    const isBelt = i < SCREEN_ATTEMPTS;
    const a = rnd() * Math.PI * 2;
    const r = isBelt
      ? wallRadius + 4.5 + Math.pow(rnd(), 0.95) * 52
      : wallRadius + 44 + Math.pow(rnd(), 0.92) * 124;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = sampleHeight(x, z);

    // Organic alpine timberline (trees cluster in sheltered hollows & climb ridges naturally)
    const timberline = 56 + fbm2(x * 0.015, z * 0.015, 311, 3) * 15;
    if (h > timberline) continue;
    if (h > timberline - 14 && rnd() < ((h - (timberline - 14)) / 14) * 0.78) continue;

    // Slope check: stricter above low foothills so NO lone trees cling to bare grey scree walls!
    const { slope } = terrainNormalAt(sampleHeight, x, z, 3.0);
    const maxSlope = h > 24 ? 0.56 : 0.72;
    if (slope > maxSlope) continue;

    // Keep sightline corridors cleanly framed at Cordon pass road & River Gorge trestle/cascade
    if (Math.abs(angDiff(a, cordonAng)) < 0.036 && r < 318) continue;
    if (Math.abs(angDiff(a, riverAng)) < 0.048 && r < 276) continue;
    if (Math.abs(angDiff(a, riverAng)) < 0.034 && r < 355) continue;

    let blocked = false;
    for (const ex of exclusionCircles) {
      if (Math.hypot(x - ex.x, z - ex.z) < ex.r) { blocked = true; break; }
    }
    if (blocked) continue;

    // Strict natural grove cohesion on upper slopes (eliminates stray solo plastic cones on bare dirt!)
    const grove = fbm2(x * 0.021 + 7.3, z * 0.021 - 4.1, 419, 3);
    if (!isBelt && h > 22 && grove < -0.04) continue;
    if (!isBelt && grove < -0.18) continue;

    let sp;
    if (h < 22 && grove > 0.14 && rnd() < 0.25) sp = 3; // warm autumn larch/birch in lower dells
    else if (h > 36) sp = rnd() < 0.66 ? 1 : 0;         // spire subalpine firs near timberline
    else if (isBelt) sp = rnd() < 0.45 ? 2 : (rnd() < 0.78 ? 0 : 1); // shaggy hemlocks & firs behind wall
    else sp = rnd() < 0.46 ? 0 : (rnd() < 0.72 ? 2 : 1);

    const altShrink = h > timberline - 16 ? lerp(1.0, 0.56, (h - (timberline - 16)) / 16) : 1.0;
    const sc = (0.76 + rnd() * 0.68) * altShrink;
    const sy = sc * (0.94 + rnd() * 0.34);
    // Slight downhill seat offset (-0.75 m) + buried trunk root guarantees zero floating trunks
    buckets[sp].push({ x, y: h - 0.75, z, sc, sy, ry: rnd() * Math.PI * 2, shade: 0.84 + rnd() * 0.26 });
  }

  const group = new THREE.Group();
  group.name = 'outer-foothill-forests';

  const dummy = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const tint = new THREE.Color();
  let totalTrees = 0;

  for (let bi = 0; bi < buckets.length; bi++) {
    const list = buckets[bi];
    if (!list.length) continue;
    const geo = makeConiferGeo(THREE, bi);
    const mat = mats.makeConiferMat('outer-conifer-mat-' + bi);
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    im.name = 'outer-forest-tier-' + bi;
    im.castShadow = false;
    im.receiveShadow = false;
    for (let k = 0; k < list.length; k++) {
      const it = list[k];
      e.set((rnd() - 0.5) * 0.05, it.ry, (rnd() - 0.5) * 0.05);
      q.setFromEuler(e);
      p.set(it.x, it.y, it.z);
      s.set(it.sc, it.sy, it.sc);
      dummy.compose(p, q, s);
      im.setMatrixAt(k, dummy);
      if (!mats.tslActive && typeof im.setColorAt === 'function') {
        tint.setRGB(it.shade, it.shade, it.shade);
        im.setColorAt(k, tint);
      }
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    group.add(im);
    totalTrees += list.length;
  }
  return { group, totalTrees };
}

// =========================================================================
// 3. SLOPE-ALIGNED, DEEP-ROOT ALPINE CLIFF BUTTRESSES & CANYON BOULDERS
// Replaces floating horizontal pancake rocks with fractured granite buttresses
// featuring deep buried root wedges, terrain-normal alignment, corner-height
// clamping, and automatic high-altitude TSL snow caps!
// =========================================================================
function makeCliffOutcropGeo(THREE, seed, style) {
  const geo = sculptRockGeometry(THREE, {
    radius: 1.0, detail: 2, seed, style,
    scale: [1.15, 0.88, 0.92], flatBase: 0.0, planes: 10, angularity: 0.62,
  });
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();

  const gp = g.attributes.position;
  // Pull lower hemisphere vertices sharply downward into a deep anchored root wedge (-1.55)
  // so no rock underside can EVER poke out or hover over a steep 38-deg mountain slope!
  for (let i = 0; i < gp.count; i++) {
    let vx = gp.getX(i), vy = gp.getY(i), vz = gp.getZ(i);
    if (vy < 0.0) {
      vy = vy * 2.15 - 0.35;
      vx *= 1.12;
      vz *= 1.12;
    } else {
      // Sculpt crisp stratified ridge crest steps on the exposed upper face
      vy *= 0.96 + 0.14 * Math.sin(vx * 2.8 + vz * 2.1);
    }
    gp.setXYZ(i, vx, vy, vz);
  }
  g.computeVertexNormals();
  const gn = g.attributes.normal;
  const cols = new Float32Array(gp.count * 3);
  for (let i = 0; i < gp.count; i++) {
    const vy = gp.getY(i), ny = gn ? gn.getY(i) : 0.5;
    // Ground-contact root darkening + sunlit facet modulation
    const rootAO = sstep(-1.4, 0.25, vy) * 0.42 + 0.58;
    const hemi = 0.78 + 0.26 * (ny * 0.5 + 0.5);
    const k = clamp(rootAO * hemi, 0.45, 1.08);
    cols[i * 3] = k;
    cols[i * 3 + 1] = k;
    cols[i * 3 + 2] = k;
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

function buildOuterCrags(THREE, mats, { sampleHeight, wallRadius, riverAng, exclusionCircles = [], extraCragSpots = [] }) {
  const rnd = mulberry32(0xc4a9411);
  const slateCrags = [];
  const graniteCrags = [];

  const upVec = new THREE.Vector3(0, 1, 0);
  const nVec = new THREE.Vector3();
  const alignQ = new THREE.Quaternion();
  const yawQ = new THREE.Quaternion();

  function tryAddCrag(cx, cz, sx, sy, sz, yaw, list, tiltFollow = 0.68) {
    if (Math.hypot(cx, cz) < wallRadius + 10) return false;
    const tn = terrainNormalAt(sampleHeight, cx, cz, 3.2);
    // Clamp seating to the LOWEST downhill corner of the rock footprint (mathematically prevents floating!)
    const probeR = Math.max(sx, sz) * 0.65;
    let minH = sampleHeight(cx, cz);
    for (let k = 0; k < 4; k++) {
      const a = yaw + k * Math.PI * 0.5;
      const h = sampleHeight(cx + Math.cos(a) * probeR, cz + Math.sin(a) * probeR);
      if (h < minH) minH = h;
    }
    // Embed solidly so the exposed crown rises naturally out of the mountain flank
    const cy = minH + sy * 0.24;
    list.push({
      x: cx, y: cy, z: cz, sx, sy, sz, yaw,
      nx: lerp(0, tn.nx, tiltFollow),
      ny: lerp(1, tn.ny, tiltFollow),
      nz: lerp(0, tn.nz, tiltFollow),
      shade: 0.86 + rnd() * 0.22,
    });
    return true;
  }

  // A) Landmark foundation collars & rocky gorge/waterfall bank boulders (grounds props & water into real rock!)
  for (const sp of extraCragSpots) {
    tryAddCrag(sp.x, sp.z, sp.sx, sp.sy, sp.sz, sp.yaw ?? rnd() * Math.PI * 2, sp.pale ? graniteCrags : slateCrags, sp.tilt ?? 0.55);
  }

  // B) Rocky canyon bank boulders framing BOTH edges of the ESE River Cascade & SW Glacial Waterfall!
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const r = lerp(228, 362, t);
    const a = riverAng + Math.sin(t * 5.2) * 0.022;
    const side = (i % 2 === 0 ? 1 : -1);
    const bankOff = lerp(6.8, 3.6, t) + rnd() * 3.0;
    const cx = Math.cos(a) * r - Math.sin(a) * side * bankOff;
    const cz = Math.sin(a) * r + Math.cos(a) * side * bankOff;
    tryAddCrag(cx, cz, 3.0 + rnd() * 2.6, 2.2 + rnd() * 1.9, 2.6 + rnd() * 2.2, rnd() * Math.PI * 2, slateCrags, 0.55);
  }
  // SW Glacial Waterfall cliff-wall rocks (~214 deg)
  const wfA = 214 * Math.PI / 180;
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const r = lerp(328, 390, t);
    const side = (i % 2 === 0 ? 1 : -1);
    const bankOff = lerp(5.8, 3.0, t) + rnd() * 2.5;
    const cx = Math.cos(wfA) * r - Math.sin(wfA) * side * bankOff;
    const cz = Math.sin(wfA) * r + Math.cos(wfA) * side * bankOff;
    tryAddCrag(cx, cz, 3.8 + rnd() * 2.8, 2.8 + rnd() * 2.2, 3.2 + rnd() * 2.2, rnd() * Math.PI * 2, graniteCrags, 0.62);
  }

  // C) Natural alpine cliff ribs along high rocky ridges & mountain shoulders (NO random floating mid-meadow blobs!)
  for (let i = 0; i < 420; i++) {
    const a = rnd() * Math.PI * 2;
    const r = wallRadius + 46 + rnd() * 150;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = sampleHeight(x, z);
    if (h < 38) continue; // Keep rocky cliff ribs up on the genuine alpine rock/talus zone!

    const tn = terrainNormalAt(sampleHeight, x, z, 4.0);
    if (tn.slope < 0.34 && h < 66) continue;

    let blocked = false;
    for (const ex of exclusionCircles) {
      if (Math.hypot(x - ex.x, z - ex.z) < ex.r + 4) { blocked = true; break; }
    }
    if (blocked) continue;

    const contourYaw = Math.atan2(tn.nz, tn.nx) + Math.PI * 0.5;
    const clusterN = 2 + ((rnd() * 2) | 0);
    for (let c = 0; c < clusterN; c++) {
      const off = (c - (clusterN - 1) * 0.5) * (4.4 + rnd() * 2.8);
      const cx = x + Math.cos(contourYaw) * off + (rnd() - 0.5) * 2.0;
      const cz = z + Math.sin(contourYaw) * off + (rnd() - 0.5) * 2.0;
      const ch = sampleHeight(cx, cz);
      const sx = (3.6 + rnd() * 3.4) * (c === 0 ? 1.15 : 0.85);
      const sy = (2.8 + rnd() * 2.6) * (c === 0 ? 1.12 : 0.85);
      const sz = (3.0 + rnd() * 2.8);
      const targetList = (ch > 72 || rnd() < 0.5) ? graniteCrags : slateCrags;
      tryAddCrag(cx, cz, sx, sy, sz, contourYaw + (rnd() - 0.5) * 0.45, targetList, 0.72);
    }
    if (slateCrags.length + graniteCrags.length >= 230) break;
  }

  const group = new THREE.Group();
  group.name = 'outer-alpine-crags';
  const dummy = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3(), tint = new THREE.Color();

  const specs = [
    { name: 'outer-crags-slate',   list: slateCrags,   style: 'granite',   rockKey: 'granite',   color: 0x70736e, seed: 4111 },
    { name: 'outer-crags-granite', list: graniteCrags, style: 'limestone', rockKey: 'limestone', color: 0x878983, seed: 4112 },
  ];
  for (const sp of specs) {
    if (!sp.list.length) continue;
    const geo = makeCliffOutcropGeo(THREE, sp.seed, sp.style);
    const mat = mats.makeCragMat(sp.name + '-mat', sp.color, sp.rockKey);
    const im = new THREE.InstancedMesh(geo, mat, sp.list.length);
    im.name = sp.name;
    for (let k = 0; k < sp.list.length; k++) {
      const it = sp.list[k];
      nVec.set(it.nx, it.ny, it.nz).normalize();
      alignQ.setFromUnitVectors(upVec, nVec);
      yawQ.setFromAxisAngle(upVec, it.yaw);
      alignQ.multiply(yawQ);
      p.set(it.x, it.y, it.z);
      s.set(it.sx, it.sy, it.sz);
      dummy.compose(p, alignQ, s);
      im.setMatrixAt(k, dummy);
      if (!mats.tslActive && typeof im.setColorAt === 'function') {
        tint.setRGB(it.shade, it.shade, it.shade);
        im.setColorAt(k, tint);
      }
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    group.add(im);
  }
  return { group, count: slateCrags.length + graniteCrags.length };
}

// =========================================================================
// 4. SEVEN UPGRADED LORE-TRUE OUTER LANDMARKS (Detailed silhouettes, per-leg
//    grounding, rocky summit collars, zero smooth grey shoeboxes/dominoes!)
// =========================================================================
function addSculptedMonolith(batcher, THREE, pos, height, rx, rz, tiltX, yaw, tiltZ, hex, seed) {
  const g = new THREE.CylinderGeometry(rx * 0.42, rx * 1.18, height, 7, 5);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (y + height * 0.5) / height; // 0 = buried root, 1 = fractured tip
    const ang = Math.atan2(z, x);
    // Asymmetric basalt cleavage ribs + tapered ragged fractured crown
    const fluting = 0.80 + 0.34 * Math.sin(ang * 3 + seed) + 0.18 * hash3f(seed, Math.round(ang * 4), Math.round(t * 5));
    const scaleZ = rz / Math.max(0.01, rx);
    // Chipped oblique ancient crest slant at the top
    const topBevel = t > 0.78 ? (x * 0.55 + z * 0.35) * ((t - 0.78) / 0.22) : 0;
    p.setXYZ(i, x * fluting, y - topBevel, z * fluting * scaleZ);
  }
  g.computeVertexNormals();
  batcher.addGeo(g, hex, pos[0], pos[1], pos[2], tiltX, yaw, tiltZ, 1, 1, 1, 1.0);
  g.dispose();
}

function buildOuterLandmarks(THREE, mats, { sampleHeight, cordonAng, riverAng, cordonRoadEnd }) {
  const concrete = createStaticBatcher(THREE); // brutalist concrete, stone piers, viaduct, radome
  const timber   = createStaticBatcher(THREE); // weathered heavy timber trestle, lookout, mill, barn
  const steel    = createStaticBatcher(THREE); // open-lattice towers, pylons, corrugated roofs, dishes
  const monolith = createStaticBatcher(THREE); // ancient sculpted First People basalt standing stones
  const beaconsRed   = [];
  const beaconsAmber = [];
  const landmarksMeta = [];
  const exclusionCircles = [];
  const extraCragSpots = [];

  function findPeak(degCenter, degSpan, rMin, rMax) {
    let best = { x: 0, z: 0, h: -1e9, r: rMin, ang: degCenter * Math.PI / 180 };
    for (let d = -degSpan; d <= degSpan; d += 2) {
      const a = (degCenter + d) * Math.PI / 180;
      for (let r = rMin; r <= rMax; r += 6) {
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const h = sampleHeight(x, z);
        if (h > best.h) best = { x, z, h, r, ang: a };
      }
    }
    return best;
  }

  // Helper: add a ring of natural alpine rock crags cradling a hilltop structure's lower bastion
  function addRockCollar(cx, cz, radius, count, seedBase, pale = false) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + hash3f(seedBase, i, 1) * 0.45;
      const r = radius * (0.85 + hash3f(seedBase, i, 2) * 0.35);
      extraCragSpots.push({
        x: cx + Math.cos(a) * r,
        z: cz + Math.sin(a) * r,
        sx: 3.4 + hash3f(seedBase, i, 3) * 2.8,
        sy: 2.6 + hash3f(seedBase, i, 4) * 2.2,
        sz: 3.0 + hash3f(seedBase, i, 5) * 2.2,
        yaw: a + 0.6,
        pale,
        tilt: 0.60,
      });
    }
  }

  // -------------------------------------------------------------------------
  // LANDMARK 1: RIDGELINE — PGB MOUNTAIN RADAR & COMMS COMMAND (North Massif!)
  // Seated tightly into the rocky summit with stepped retaining buttresses,
  // recessed dark ops visor bay, detailed geodesic radome + catwalk, 36 m
  // open-lattice relay tower + dual dishes, helipad, and upgraded NW horn mast!
  // -------------------------------------------------------------------------
  {
    const crest = findPeak(282, 10, 334, 366);
    const yaw = Math.atan2(-crest.x, -crest.z);
    // Seat the deck 2.4 m into the actual summit cone + wrap front cliffs with bold alpine granite crags!
    const baseY = crest.h - 2.4;
    const P = makeSiteFrame(crest.x, baseY, crest.z, yaw);
    exclusionCircles.push({ x: crest.x, z: crest.z, r: 28 });
    landmarksMeta.push({ id: 'ridgeline-command', x: crest.x, y: crest.h, z: crest.z });
    addRockCollar(crest.x, crest.z, 10.6, 10, 5101, true);
    // Bold granite cliff buttress crags specifically hugging the steep inward valley-facing bastion base!
    for (const [lx, lz, sx, sy] of [[-6.5, 7.2, 5.4, 4.6], [-1.2, 8.8, 6.2, 5.2], [4.6, 7.6, 5.6, 4.8], [9.2, 5.2, 5.0, 4.4]]) {
      const wp = P(lx, 0, lz);
      extraCragSpots.push({ x: wp[0], z: wp[2], sx, sy, sz: sx * 0.85, yaw: yaw + lx * 0.1, pale: false, tilt: 0.55 });
    }

    // Compact terraced brutalist retaining bastion plunged deeply into the peak
    const footMin = minFootprintY(sampleHeight, P, [[-9, -7], [9, -7], [9, 7], [-9, 7], [0, 8], [0, -8]]);
    const bastBot = footMin - 8.5;
    const bastH = Math.max(8, (baseY + 1.8) - bastBot);
    concrete.cyl(8.6, 11.4, bastH, 8, 0x525651, crest.x, bastBot + bastH * 0.5, crest.z, 0, yaw + Math.PI / 8, 0);
    // Angled vertical concrete structural buttress ribs framing the bastion wall (kills smooth puck silhouette!)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.39;
      const bx0 = Math.cos(a) * 8.1, bz0 = Math.sin(a) * 8.1;
      const bx1 = Math.cos(a) * 10.4, bz1 = Math.sin(a) * 10.4;
      concrete.strut(P(bx1, -9.0, bz1), P(bx0, 1.8, bz0), 0.72, 0x474b47, 5);
    }
    // Concrete deck parapet rim
    concrete.cyl(9.0, 9.3, 0.9, 8, 0x626660, ...P(0, 2.0, 0), 0, yaw + Math.PI / 8, 0);

    // Armored stepped operations bunker (main block + upper penthouse + side comms annex)
    concrete.box(11.4, 4.2, 7.4, 0x5f645e, ...P(-1.0, 4.4, -0.6), 0, yaw, 0);
    // Overhanging beveled concrete blast fascia & roof parapet
    concrete.box(12.2, 0.65, 8.2, 0x464a46, ...P(-1.0, 6.7, -0.6), 0, yaw, 0);
    concrete.box(11.6, 0.75, 0.42, 0x555954, ...P(-1.0, 7.3, 3.2), 0, yaw, 0);
    concrete.box(11.6, 0.75, 0.42, 0x555954, ...P(-1.0, 7.3, -4.4), 0, yaw, 0);
    // Structural exterior concrete pilasters + dark recessed operations observation bay!
    for (const px of [-5.7, -2.8, 0.2, 3.2, 4.7]) {
      concrete.box(0.65, 4.3, 0.55, 0x4e524e, ...P(px, 4.4, 3.25), 0, yaw, 0);
    }
    // Dark recessed panoramic ops-room visor strip (reads as genuine bunker windows by day!)
    steel.box(8.4, 1.20, 0.35, 0x111518, ...P(-1.3, 5.1, 3.12), 0, yaw, 0);
    // Upper command penthouse + rooftop HVAC vents
    concrete.box(6.8, 2.6, 5.4, 0x6c716a, ...P(-3.0, 8.2, -1.0), 0, yaw, 0);
    concrete.box(7.3, 0.45, 5.9, 0x525652, ...P(-3.0, 9.65, -1.0), 0, yaw, 0);
    steel.box(1.8, 1.1, 1.4, 0x4b5154, ...P(1.8, 7.5, -1.8), 0, yaw, 0);
    steel.cyl(0.24, 0.28, 2.2, 6, 0x454a4e, ...P(3.0, 8.0, -2.2));

    // Detailed Faceted Geodesic Radome (detail=2!) atop ribbed tower drum + steel catwalk ring!
    concrete.cyl(3.0, 3.5, 3.8, 10, 0x656a64, ...P(-4.0, 11.4, -1.0));
    steel.cyl(3.9, 3.9, 0.25, 12, 0x464c50, ...P(-4.0, 13.1, -1.0)); // external service catwalk deck
    // Catwalk handrail posts + top rail ring
    for (let k = 0; k < 10; k++) {
      const a0 = (k / 10) * Math.PI * 2, a1 = ((k + 1) / 10) * Math.PI * 2;
      const p0 = P(-4.0 + Math.cos(a0) * 3.8, 13.2, -1.0 + Math.sin(a0) * 3.8);
      const p1 = P(-4.0 + Math.cos(a0) * 3.8, 14.2, -1.0 + Math.sin(a0) * 3.8);
      const p2 = P(-4.0 + Math.cos(a1) * 3.8, 14.2, -1.0 + Math.sin(a1) * 3.8);
      steel.strut(p0, p1, 0.06, 0x444a4e, 4);
      steel.strut(p1, p2, 0.06, 0x444a4e, 4);
    }
    const domeGeo = new THREE.IcosahedronGeometry(3.85, 2);
    concrete.addGeo(domeGeo, 0xb8bbb4, ...P(-4.0, 16.4, -1.0), 0, yaw, 0, 1, 0.94, 1);
    domeGeo.dispose();
    steel.cyl(3.15, 3.25, 0.45, 12, 0x52575b, ...P(-4.0, 13.45, -1.0)); // radome base flange collar

    // Compact terraced helipad tucked neatly against the east shoulder
    const hpW = P(9.4, 0, 0.2);
    const hpG = sampleHeight(hpW[0], hpW[2]);
    concrete.anchoredPier(hpW[0], hpW[2], baseY + 1.1, hpG, 5.1, 7.6, 0x5c605b, yaw, 8, 6.0);
    concrete.cyl(5.4, 5.4, 0.55, 8, 0x676b66, ...P(9.4, 1.35, 0.2), 0, yaw, 0);
    concrete.box(0.55, 0.12, 3.8, 0xa28e4e, ...P(8.2, 1.68, 0.2), 0, yaw, 0);
    concrete.box(0.55, 0.12, 3.8, 0xa28e4e, ...P(10.6, 1.68, 0.2), 0, yaw, 0);
    concrete.box(2.5, 0.12, 0.55, 0xa28e4e, ...P(9.4, 1.68, 0.2), 0, yaw, 0);

    // Tall 36 m Open Steel Truss Microwave & Relay Tower with X-bracing, platform & dual parabolic dishes!
    const tx = 4.4, tz = -1.6;
    const tH = 35.5, bW = 2.35, topW = 0.52;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      steel.strut(P(tx + sx * bW, 2.0, tz + sz * bW), P(tx + sx * topW, 2.0 + tH, tz + sz * topW), 0.22, 0x454b50, 5);
    }
    const bays = 7;
    for (let k = 0; k < bays; k++) {
      const f0 = k / bays, f1 = (k + 1) / bays;
      const y0 = 2.0 + f0 * tH, y1 = 2.0 + f1 * tH;
      const w0 = lerp(bW, topW, f0), w1 = lerp(bW, topW, f1);
      // 4-sided criss-cross open lattice X-braces + slim perimeter girts (NO solid clunky plates!)
      for (const side of [
        [[-w0, -w0], [w1, -w1], [w0, -w0], [-w1, -w1]],
        [[w0, -w0], [w1, w1], [w0, w0], [w1, -w1]],
        [[w0, w0], [-w1, w1], [-w0, w0], [w1, w1]],
        [[-w0, w0], [-w1, -w1], [-w0, -w0], [-w1, w1]],
      ]) {
        steel.strut(P(tx + side[0][0], y0, tz + side[0][1]), P(tx + side[1][0], y1, tz + side[1][1]), 0.11, 0x545a5f, 4);
        steel.strut(P(tx + side[2][0], y0, tz + side[2][1]), P(tx + side[3][0], y1, tz + side[3][1]), 0.11, 0x545a5f, 4);
      }
      steel.strut(P(tx - w1, y1, tz - w1), P(tx + w1, y1, tz - w1), 0.11, 0x4c5257, 4);
      steel.strut(P(tx + w1, y1, tz - w1), P(tx + w1, y1, tz + w1), 0.11, 0x4c5257, 4);
      steel.strut(P(tx + w1, y1, tz + w1), P(tx - w1, y1, tz + w1), 0.11, 0x4c5257, 4);
      steel.strut(P(tx - w1, y1, tz + w1), P(tx - w1, y1, tz - w1), 0.11, 0x4c5257, 4);
    }
    // Maintenance platform deck + railing at y = 26 m
    steel.box(3.4, 0.24, 3.4, 0x464c50, ...P(tx, 26.2, tz), 0, yaw, 0);
    // Dual parabolic microwave relay drum dishes aimed toward FOB Threshold!
    const dish1 = new THREE.CylinderGeometry(2.35, 0.72, 1.0, 12);
    steel.addGeo(dish1, 0x9aa0a2, ...P(tx - 0.8, 25.0, tz + 1.7), Math.PI * 0.45, yaw + 0.08, 0);
    const dish2 = new THREE.CylinderGeometry(1.65, 0.55, 0.8, 12);
    steel.addGeo(dish2, 0x8e9598, ...P(tx + 1.4, 30.8, tz + 1.2), Math.PI * 0.47, yaw - 0.12, 0);
    dish1.dispose(); dish2.dispose();
    // Lightning spire & antenna cross-arrays
    steel.cyl(0.07, 0.16, 7.2, 5, 0x5c6267, ...P(tx, 2.0 + tH + 3.6, tz));
    steel.box(3.6, 0.16, 0.16, 0x585e63, ...P(tx, 2.0 + tH + 1.2, tz), 0, yaw, 0);

    const bk1 = P(tx, 2.0 + tH + 7.2, tz);
    beaconsRed.push({ x: bk1[0], y: bk1[1], z: bk1[2], size: 4.8, phase: 0.0, speed: 2.3 });
    const bk2 = P(-4.0, 20.6, -1.0);
    beaconsRed.push({ x: bk2[0], y: bk2[1], z: bk2[2], size: 3.6, phase: 1.7, speed: 2.3 });
    for (const wx of [-3.8, -1.2, 1.4]) {
      const wp = P(wx, 5.1, 3.55);
      beaconsAmber.push({ x: wp[0], y: wp[1], z: wp[2], size: 2.8, phase: 0.3 + wx });
    }
    for (const [hx, hz] of [[6.2, -3.0], [12.6, -3.0], [6.2, 3.4], [12.6, 3.4]]) {
      const hp = P(hx, 1.9, hz);
      beaconsAmber.push({ x: hp[0], y: hp[1], z: hp[2], size: 1.75, phase: hx });
    }

    // Secondary Ridgeline NW Horn Relay Station (~256 deg): rock-cradled shelter + tapered 3-leg steel lattice mast!
    const westHorn = findPeak(256, 6, 316, 344);
    const hYaw = Math.atan2(-westHorn.x, -westHorn.z);
    const P2 = makeSiteFrame(westHorn.x, westHorn.h - 1.0, westHorn.z, hYaw);
    exclusionCircles.push({ x: westHorn.x, z: westHorn.z, r: 16 });
    addRockCollar(westHorn.x, westHorn.z, 5.8, 6, 5109, true);
    concrete.anchoredPier(westHorn.x, westHorn.z, westHorn.h + 0.6, westHorn.h - 4.0, 3.8, 6.2, 0x676c67, hYaw, 8, 5.5);
    concrete.box(4.6, 2.4, 4.0, 0x727771, ...P2(-0.8, 2.0, -0.4), 0, hYaw, 0);
    steel.box(5.0, 0.35, 4.4, 0x4c5255, ...P2(-0.8, 3.35, -0.4), 0.08, hYaw, 0);
    // 3-leg open steel triangular lattice mast (no longer a lone bare stick!)
    const mH = 22.0;
    for (let j = 0; j < 3; j++) {
      const a0 = (j / 3) * Math.PI * 2, a1 = ((j + 1) / 3) * Math.PI * 2;
      steel.strut(P2(1.4 + Math.cos(a0) * 1.15, 0.6, 0.3 + Math.sin(a0) * 1.15), P2(1.4 + Math.cos(a0) * 0.25, 0.6 + mH, 0.3 + Math.sin(a0) * 0.25), 0.12, 0x4c5257, 4);
      for (let k = 0; k < 4; k++) {
        const y0 = 0.6 + (k / 4) * mH, y1 = 0.6 + ((k + 1) / 4) * mH;
        const r0 = lerp(1.15, 0.25, k / 4), r1 = lerp(1.15, 0.25, (k + 1) / 4);
        steel.strut(P2(1.4 + Math.cos(a0) * r0, y0, 0.3 + Math.sin(a0) * r0), P2(1.4 + Math.cos(a1) * r1, y1, 0.3 + Math.sin(a1) * r1), 0.075, 0x585e63, 4);
      }
    }
    const hornDish = new THREE.CylinderGeometry(1.3, 0.4, 0.65, 10);
    steel.addGeo(hornDish, 0x909698, ...P2(1.4, 16.5, 1.3), Math.PI * 0.45, hYaw, 0);
    hornDish.dispose();
    steel.box(3.8, 0.18, 0.18, 0x585e63, ...P2(1.4, 20.8, 0.3), 0, hYaw, 0);
    const bk3 = P2(1.4, 24.4, 0.3);
    beaconsRed.push({ x: bk3[0], y: bk3[1], z: bk3[2], size: 4.0, phase: 3.1, speed: 2.9 });
  }

  // -------------------------------------------------------------------------
  // LANDMARK 2: WEST CORDON OVERWATCH, PASS ROAD & HIGH-VOLTAGE PYLONS
  // Visible right over the West Cordon Gate (`01`, `10`, `16`) — gets full
  // architectural detail: rock-cradled bunker, X-braced steel watchtower with
  // exterior stairs, cantilevered catwalk/railings, mullioned observation cab
  // + overhanging pitched roof, per-leg anchored pylons & feathered gravel road!
  // -------------------------------------------------------------------------
  const passRoadPoints = [];
  {
    const ovA = cordonAng - 0.145;
    const ovR = 260;
    const ovX = Math.cos(ovA) * ovR, ovZ = Math.sin(ovA) * ovR;
    const ovH = sampleHeight(ovX, ovZ);
    const ovYaw = Math.atan2(-ovX, -ovZ);
    const O = makeSiteFrame(ovX, ovH - 0.4, ovZ, ovYaw);
    // Smaller exclusion radius (15 m) so lush evergreens & boulders naturally hug & partially occlude the bastion!
    exclusionCircles.push({ x: ovX, z: ovZ, r: 15 });
    landmarksMeta.push({ id: 'cordon-overwatch', x: ovX, y: ovH, z: ovZ });
    addRockCollar(ovX, ovZ, 8.2, 8, 5201, false);

    // Stepped rock-hugged concrete retaining terrace anchored below lowest slope corner
    const ovFootMin = minFootprintY(sampleHeight, O, [[-6, -5], [6, -5], [6, 5], [-6, 5]]);
    const ovBot = ovFootMin - 5.5;
    const ovBaseH = Math.max(4.0, (ovH + 0.6) - ovBot);
    concrete.box(12.2, ovBaseH, 9.6, 0x676b64, ovX, ovBot + ovBaseH * 0.5, ovZ, 0, ovYaw, 0);
    // Angled concrete retaining buttresses along front retaining face
    for (const bx of [-4.6, -1.6, 1.6, 4.6]) {
      concrete.strut(O(bx, -5.5, 5.4), O(bx, 0.8, 4.6), 0.48, 0x5c6059, 4);
    }
    // Concrete blast-wall parapet around compound apron
    concrete.box(12.6, 1.05, 0.45, 0x72766e, ...O(0, 1.35, 4.65), 0, ovYaw, 0);

    // Armored concrete guardhouse with overhanging pitched corrugated roof, dark recessed door & vent
    concrete.box(7.2, 3.0, 4.8, 0x74786f, ...O(-2.2, 2.3, -1.2), 0, ovYaw, 0);
    steel.box(1.1, 2.1, 0.25, 0x262c2b, ...O(-2.2, 1.9, 1.22), 0, ovYaw, 0); // recessed dark blast door
    steel.box(1.9, 0.65, 0.22, 0x1d2324, ...O(-4.3, 2.6, 1.22), 0, ovYaw, 0); // armored guard slit
    steel.gableRoof(O, -2.2, 3.75, -1.2, 7.6, 5.2, 1.05, 0.45, 0.45, 0x4b514e, 0x666a62);
    steel.cyl(0.14, 0.18, 2.2, 5, 0x3f4443, ...O(-4.8, 4.8, -2.6)); // generator exhaust pipe

    // Authentic 14.5 m Tapered Steel Military Watchtower (X-braced legs, stairs, catwalk, mullioned cab, pitched roof!)
    const tx = 2.9, tz = 1.0, tH = 12.6;
    const bW = 1.75, topW = 1.28;
    // Per-leg anchored piers
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const lp = O(tx + sx * bW, 0, tz + sz * bW);
      concrete.anchoredPier(lp[0], lp[2], ovH + 0.9, sampleHeight(lp[0], lp[2]), 0.48, 0.68, 0x62665f, ovYaw, 4, 4.0);
      steel.strut(O(tx + sx * bW, 0.6, tz + sz * bW), O(tx + sx * topW, tH, tz + sz * topW), 0.14, 0x424846, 5);
    }
    // 3 full X-braced steel truss bays + intermediate horizontal beams + zig-zag exterior access stairs!
    for (let b = 0; b < 3; b++) {
      const y0 = lerp(0.8, tH - 0.3, b / 3), y1 = lerp(0.8, tH - 0.3, (b + 1) / 3);
      const w0 = lerp(bW, topW, b / 3), w1 = lerp(bW, topW, (b + 1) / 3);
      for (const s of [
        [[-w0, -w0], [w1, -w1], [w0, -w0], [-w1, -w1]],
        [[w0, -w0], [w1, w1], [w0, w0], [w1, -w1]],
        [[w0, w0], [-w1, w1], [-w0, w0], [w1, w1]],
        [[-w0, w0], [-w1, -w1], [-w0, -w0], [-w1, w1]],
      ]) {
        steel.strut(O(tx + s[0][0], y0, tz + s[0][1]), O(tx + s[1][0], y1, tz + s[1][1]), 0.08, 0x4e5452, 4);
        steel.strut(O(tx + s[2][0], y0, tz + s[2][1]), O(tx + s[3][0], y1, tz + s[3][1]), 0.08, 0x4e5452, 4);
      }
      // Horizontal floor framing + mid-stair landing
      steel.strut(O(tx - w1, y1, tz - w1), O(tx + w1, y1, tz - w1), 0.10, 0x464c4a, 4);
      steel.strut(O(tx + w1, y1, tz - w1), O(tx + w1, y1, tz + w1), 0.10, 0x464c4a, 4);
      steel.strut(O(tx + w1, y1, tz + w1), O(tx - w1, y1, tz + w1), 0.10, 0x464c4a, 4);
      steel.strut(O(tx - w1, y1, tz + w1), O(tx - w1, y1, tz - w1), 0.10, 0x464c4a, 4);
      // Zig-zag interior stair stringers
      const sx0 = b % 2 === 0 ? -w0 * 0.7 : w0 * 0.7;
      const sx1 = b % 2 === 0 ? w1 * 0.7 : -w1 * 0.7;
      steel.strut(O(tx + sx0, y0, tz - 0.35), O(tx + sx1, y1, tz - 0.35), 0.09, 0x3b403f, 4);
      steel.strut(O(tx + sx0, y0, tz + 0.35), O(tx + sx1, y1, tz + 0.35), 0.09, 0x3b403f, 4);
    }
    // Cantilevered catwalk deck + diagonal knee braces + wrap-around safety railings!
    const catW = 2.65;
    steel.box(catW * 2, 0.28, catW * 2, 0x454b49, ...O(tx, tH, tz), 0, ovYaw, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      steel.strut(O(tx + sx * topW, tH - 1.5, tz + sz * topW), O(tx + sx * catW * 0.94, tH - 0.1, tz + sz * catW * 0.94), 0.09, 0x464c4a, 4);
      steel.strut(O(tx + sx * catW, tH + 0.1, tz + sz * catW), O(tx + sx * catW, tH + 1.15, tz + sz * catW), 0.06, 0x4d5351, 4);
    }
    for (const rh of [0.58, 1.12]) {
      steel.strut(O(tx - catW, tH + rh, tz - catW), O(tx + catW, tH + rh, tz - catW), 0.05, 0x4e5452, 4);
      steel.strut(O(tx + catW, tH + rh, tz - catW), O(tx + catW, tH + rh, tz + catW), 0.05, 0x4e5452, 4);
      steel.strut(O(tx + catW, tH + rh, tz + catW), O(tx - catW, tH + rh, tz + catW), 0.05, 0x4e5452, 4);
      steel.strut(O(tx - catW, tH + rh, tz + catW), O(tx - catW, tH + rh, tz - catW), 0.05, 0x4e5452, 4);
    }
    // Armored guard cab: olive-grey lower armored wainscot + recessed dark panoramic window glass + corner mullions!
    concrete.box(3.4, 1.15, 3.4, 0x5c6259, ...O(tx, tH + 0.72, tz), 0, ovYaw, 0);
    steel.box(3.05, 1.05, 3.05, 0x1b2124, ...O(tx, tH + 1.80, tz), 0, ovYaw, 0); // recessed dark observation glass
    for (const [mx, mz] of [[-1.62, -1.62], [1.62, -1.62], [1.62, 1.62], [-1.62, 1.62], [0, 1.62], [0, -1.62], [1.62, 0], [-1.62, 0]]) {
      steel.box(0.16, 1.20, 0.16, 0x4c524d, ...O(tx + mx, tH + 1.80, tz + mz), 0, ovYaw, 0);
    }
    concrete.box(3.55, 0.32, 3.55, 0x565c54, ...O(tx, tH + 2.52, tz), 0, ovYaw, 0);
    // Overhanging pitched hipped corrugated sun-roof (kills flat-cube Roblox tower look!)
    steel.hipRoof(O, tx, tH + 2.66, tz, 4.9, 4.9, 1.15, 0.7, 0x3e4442);
    // Twin inward floodlight housings + comms antenna whip
    for (const fx of [-1.2, 1.2]) {
      steel.box(0.42, 0.28, 0.30, 0x2f3534, ...O(tx + fx, tH + 2.52, tz + 2.05), 0.25, ovYaw, 0);
    }
    steel.cyl(0.05, 0.11, 4.4, 5, 0x4c5250, ...O(tx + 0.6, tH + 5.6, tz - 0.5));

    const ob = O(tx + 0.6, tH + 7.9, tz - 0.5);
    beaconsRed.push({ x: ob[0], y: ob[1], z: ob[2], size: 3.2, phase: 0.9, speed: 2.7 });
    const ol = O(tx, tH + 1.85, tz + 1.9);
    beaconsAmber.push({ x: ol[0], y: ol[1], z: ol[2], size: 3.0, phase: 1.1 });
    const ol2 = O(-2.2, 2.7, 1.5);
    beaconsAmber.push({ x: ol2[0], y: ol2[1], z: ol2[2], size: 2.2, phase: 2.2 });

    // Subtle distant highway lights miles beyond the western pass saddle (192..202 deg, r=475..565 m)
    for (let k = 0; k < 5; k++) {
      const ha = (191.5 + k * 2.4) * Math.PI / 180;
      const hr = 468 + k * 26;
      beaconsAmber.push({ x: Math.cos(ha) * hr, y: 122 + k * 8.5, z: Math.sin(ha) * hr, size: 2.6, phase: k * 1.3 });
    }

    // Exterior mountain pass road winding smoothly out from cordonRoadEnd toward the lower 197 deg saddle
    const startX = cordonRoadEnd ? cordonRoadEnd.x : Math.cos(cordonAng) * 244;
    const startZ = cordonRoadEnd ? cordonRoadEnd.z : Math.sin(cordonAng) * 244;
    const startA = Math.atan2(startZ, startX);
    const startR = Math.hypot(startX, startZ);
    const endA = 197 * Math.PI / 180;
    const steps = 36;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = lerp(Math.max(240, startR), 414, t);
      const sw = Math.sin(t * Math.PI * 2.2) * 0.024 * (1 - t * 0.4);
      const a = lerp(startA, endA, Math.pow(t, 0.85)) + sw;
      const px = Math.cos(a) * r, pz = Math.sin(a) * r;
      const py = sampleHeight(px, pz);
      passRoadPoints.push({ x: px, y: py, z: pz });
      // Low weathered roadside timber guard-posts along outer curve (NO floating coat-hanger L-poles!)
      if (i > 1 && i < 14 && i % 3 === 0) {
        const nx = -Math.sin(a), nz = Math.cos(a);
        const gx = px + nx * 3.1, gz = pz + nz * 3.1, gy = sampleHeight(gx, gz);
        timber.cyl(0.08, 0.10, 1.5, 5, 0x58493b, gx, gy + 0.35, gz);
      }
      // Two solidly grounded timber power/utility poles near lower pass shoulder (not floating mid-cliff!)
      if (i === 5 || i === 11) {
        const nx = -Math.sin(a), nz = Math.cos(a);
        const lx = px + nx * 3.8, lz = pz + nz * 3.8, ly = sampleHeight(lx, lz);
        timber.cyl(0.11, 0.17, 7.6, 6, 0x504234, lx, ly + 2.4, lz);
        timber.box(1.8, 0.14, 0.14, 0x4c3e31, lx, ly + 5.7, lz, 0, a, 0);
        beaconsAmber.push({ x: lx - nx * 0.7, y: ly + 5.5, z: lz - nz * 0.7, size: 2.3, phase: i * 0.7 });
      }
    }

    // HIGH-VOLTAGE STEEL TRANSMISSION PYLONS marching over the western pass (severed at the Cordon!)
    // Nudge pylon 1 slightly onto broader grade & anchor EVERY SINGLE LEG individually to sampleHeight!
    const pylonSites = [
      { deg: 177.5, r: 248, dead: true },
      { deg: 186.4, r: 298, dead: false },
      { deg: 193.2, r: 358, dead: false },
      { deg: 198.8, r: 410, dead: false },
    ];
    const pylonTops = [];
    for (let pi = 0; pi < pylonSites.length; pi++) {
      const ps = pylonSites[pi];
      const pa = ps.deg * Math.PI / 180;
      const px = Math.cos(pa) * ps.r, pz = Math.sin(pa) * ps.r;
      const pyaw = pa + Math.PI * 0.5;
      const bW = 2.45, mW = 1.08, tW = 0.48;
      // Anchor pylon waist to the LOWEST of its 4 ground legs so legs plunge into terrain with ZERO dangling stilts!
      const rawF = makeSiteFrame(px, 0, pz, pyaw);
      let legMinH = Infinity, legMaxH = -Infinity;
      const legGround = [];
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const gp = rawF(sx * bW, 0, sz * bW);
        const gh = sampleHeight(gp[0], gp[2]);
        legGround.push({ sx, sz, x: gp[0], z: gp[2], h: gh });
        if (gh < legMinH) legMinH = gh;
        if (gh > legMaxH) legMaxH = gh;
      }
      const baseH = lerp(legMinH, legMaxH, 0.38);
      const F = makeSiteFrame(px, baseH, pz, pyaw);
      exclusionCircles.push({ x: px, z: pz, r: 9 });
      const H = 21.5;

      // Per-leg concrete footing piers anchored 4.5 m deep below each leg's exact ground height!
      for (const lg of legGround) {
        const pierTop = lg.h + 0.55;
        concrete.anchoredPier(lg.x, lg.z, pierTop, lg.h, 0.48, 0.72, 0x676b64, pyaw, 4, 4.5);
        // Steel corner leg rising cleanly from each leg's individual concrete footing to the waist collar!
        steel.strut([lg.x, pierTop - 0.1, lg.z], F(lg.sx * mW, H * 0.56, lg.sz * mW), 0.14, 0x454b4f, 4);
        steel.strut(F(lg.sx * mW, H * 0.56, lg.sz * mW), F(lg.sx * tW, H, lg.sz * tW), 0.11, 0x454b4f, 4);
      }

      // Open criss-cross steel lattice X-bracing bays (replaces clunky solid steel.box rings!)
      const pBays = [0.14, 0.35, 0.56, 0.74, 0.90];
      for (let k = 0; k < pBays.length - 1; k++) {
        const f0 = pBays[k], f1 = pBays[k + 1];
        const w0 = f0 < 0.56 ? lerp(bW, mW, f0 / 0.56) : lerp(mW, tW, (f0 - 0.56) / 0.44);
        const w1 = f1 < 0.56 ? lerp(bW, mW, f1 / 0.56) : lerp(mW, tW, (f1 - 0.56) / 0.44);
        const y0 = f0 * H, y1 = f1 * H;
        for (const s of [
          [[-w0, -w0], [w1, -w1], [w0, -w0], [-w1, -w1]],
          [[w0, -w0], [w1, w1], [w0, w0], [w1, -w1]],
          [[w0, w0], [-w1, w1], [-w0, w0], [w1, w1]],
          [[-w0, w0], [-w1, -w1], [-w0, -w0], [-w1, w1]],
        ]) {
          steel.strut(F(s[0][0], y0, s[0][1]), F(s[1][0], y1, s[1][1]), 0.075, 0x52585c, 4);
          steel.strut(F(s[2][0], y0, s[2][1]), F(s[3][0], y1, s[3][1]), 0.075, 0x52585c, 4);
        }
        steel.strut(F(-w1, y1, -w1), F(w1, y1, -w1), 0.08, 0x4b5155, 4);
        steel.strut(F(w1, y1, -w1), F(w1, y1, w1), 0.08, 0x4b5155, 4);
        steel.strut(F(w1, y1, w1), F(-w1, y1, w1), 0.08, 0x4b5155, 4);
        steel.strut(F(-w1, y1, w1), F(-w1, y1, -w1), 0.08, 0x4b5155, 4);
      }

      // Open triangular-truss flared cross-arms + peaked earth-wire lightning spire + ceramic insulator strings!
      const armY1 = H * 0.72, armY2 = H * 0.90;
      for (const [ay, span, rise] of [[armY1, 5.9, 1.8], [armY2, 4.5, 1.5]]) {
        steel.strut(F(-span, ay, 0), F(span, ay, 0), 0.12, 0x4b5155, 4);
        steel.strut(F(-span, ay, 0), F(-0.7, ay + rise, 0), 0.095, 0x50565a, 4);
        steel.strut(F(span, ay, 0), F(0.7, ay + rise, 0), 0.095, 0x50565a, 4);
        steel.strut(F(-span * 0.52, ay, 0), F(-0.7, ay + rise * 0.55, 0), 0.07, 0x52585c, 4);
        steel.strut(F(span * 0.52, ay, 0), F(0.7, ay + rise * 0.55, 0), 0.07, 0x52585c, 4);
      }
      // Peaked lightning crown above upper arm
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        steel.strut(F(sx * tW, H, sz * tW), F(0, H + 2.4, 0), 0.09, 0x4d5357, 4);
      }

      // Hanging ceramic suspension insulator strings below all 4 arm tips
      const armAttach = [
        F(-5.5, armY1, 0), F(5.5, armY1, 0),
        F(-4.1, armY2, 0), F(4.1, armY2, 0),
      ];
      const tips = [];
      for (const att of armAttach) {
        const bot = [att[0], att[1] - 1.05, att[2]];
        concrete.cyl(0.14, 0.14, 0.95, 6, 0x9fa4a2, att[0], att[1] - 0.52, att[2]);
        tips.push(bot);
      }
      pylonTops.push(tips);

      // Organically curved severed dangling cables on the nearest pylon right outside the Cordon wall!
      if (ps.dead) {
        for (let wi = 0; wi < tips.length; wi++) {
          const tp = tips[wi];
          const swayDir = (wi % 2 === 0 ? 1 : -1) * 0.6;
          const dropLen = 5.5 + (wi % 2) * 2.2;
          let prev = tp;
          for (let k = 1; k <= 4; k++) {
            const t = k / 4;
            const cur = [
              tp[0] + Math.cos(pa) * (-t * 2.2) + swayDir * Math.sin(t * 2.4) * 1.1,
              tp[1] - t * t * dropLen,
              tp[2] + Math.sin(pa) * (-t * 2.2) + swayDir * t * 0.9,
            ];
            steel.strut(prev, cur, 0.032, 0x282d31, 4);
            prev = cur;
          }
        }
      }
    }
    // Fine realistic sagging catenary powerline spans (10 smooth segments, slim r=0.032 m!)
    for (let pi = 0; pi < pylonTops.length - 1; pi++) {
      const A = pylonTops[pi], B = pylonTops[pi + 1];
      for (let wi = 0; wi < A.length; wi++) {
        const p0 = A[wi], p1 = B[wi];
        const segs = 10;
        let prev = p0;
        for (let k = 1; k <= segs; k++) {
          const t = k / segs;
          const sag = Math.sin(t * Math.PI) * 3.6;
          const cur = [lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t) - sag, lerp(p0[2], p1[2], t)];
          steel.strut(prev, cur, 0.032, 0x262b2f, 4);
          prev = cur;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // LANDMARK 3: ESE RIVER GORGE — COLDWATER BROKEN TIMBER LOGGING TRESTLE
  // Tapered weathered stone-masonry abutment piers (NO grey shoeboxes!),
  // heavy timber bents with cap beams, sill timbers, X-sway bracing AND
  // longitudinal girt/brace beams + splintered collapsed center span!
  // -------------------------------------------------------------------------
  {
    const trA = riverAng;
    const trR = 272;
    const cx = Math.cos(trA) * trR, cz = Math.sin(trA) * trR;
    const midH = sampleHeight(cx, cz);
    const spanY = midH + 14.2;
    const trYaw = trA;
    const T = makeSiteFrame(cx, 0, cz, trYaw);
    exclusionCircles.push({ x: cx, z: cz, r: 19 });
    landmarksMeta.push({ id: 'coldwater-trestle', x: cx, y: spanY, z: cz });

    const halfSpan = 28;
    const bents = 7;
    const bentInfo = [];
    for (let i = 0; i < bents; i++) {
      const lx = lerp(-halfSpan, halfSpan, i / (bents - 1));
      const gp = T(lx, 0, 0);
      const gy = sampleHeight(gp[0], gp[2]);
      const h = spanY - gy;
      const broken = i === 3;
      const topY = broken ? gy + Math.max(2.6, h * 0.40) : spanY;
      const footW = 1.55 + Math.max(0, (topY - gy)) * 0.11;
      bentInfo.push({ lx, gy, topY, footW, broken });

      // Tapered stepped weathered stone-masonry footing piers (anchored below downhill slope, NO boxy slabs!)
      const pierTop = gy + 1.15;
      for (const sz of [-1, 1]) {
        const fp = T(lx, 0, sz * footW * 0.65);
        const fgh = sampleHeight(fp[0], fp[2]);
        concrete.anchoredPier(fp[0], fp[2], pierTop, fgh, 0.85, 1.38, 0x62645d, trYaw, 6, 4.2);
      }
      // Horizontal heavy timber sill beam resting on the stone piers
      timber.strut(T(lx, pierTop + 0.18, -footW * 1.05), T(lx, pierTop + 0.18, footW * 1.05), 0.24, 0x48392c, 5);
      // Heavy outer battered & inner plumb timber trestle posts
      for (const sz of [-1, 1]) {
        timber.strut(T(lx, pierTop, sz * footW), T(lx, topY, sz * 1.35), 0.26, 0x564636, 5);
        timber.strut(T(lx, pierTop, sz * footW * 0.44), T(lx, topY, sz * 0.52), 0.22, 0x4f4031, 5);
      }
      // Heavy cap beam & corbel timber atop each intact bent
      if (!broken) {
        timber.box(0.55, 0.48, 3.6, 0x47382b, ...T(lx, topY + 0.05, 0), 0, trYaw, 0);
      }
      // Horizontal sash girts & double diagonal X-sway braces up each bent
      const tiers = Math.max(1, Math.floor((topY - pierTop) / 4.2));
      for (let k = 0; k < tiers; k++) {
        const y0 = lerp(pierTop + 0.3, topY - 0.35, k / tiers);
        const y1 = lerp(pierTop + 0.3, topY - 0.35, (k + 1) / tiers);
        const w0 = lerp(footW, 1.35, k / tiers);
        const w1 = lerp(footW, 1.35, (k + 1) / tiers);
        timber.strut(T(lx, y0, -w0), T(lx, y0, w0), 0.15, 0x4a3b2c, 4);
        timber.strut(T(lx, y0, -w0), T(lx, y1, w1), 0.12, 0x453729, 4);
        timber.strut(T(lx, y0, w0), T(lx, y1, -w1), 0.12, 0x453729, 4);
      }
      // Rocky boulder buttressing at end abutments
      if (i === 0 || i === bents - 1) {
        extraCragSpots.push({ x: gp[0], z: gp[2], sx: 4.0, sy: 2.6, sz: 3.6, yaw: trYaw, pale: false, tilt: 0.45 });
      }
    }

    // Longitudinal timber girt & diagonal tower bracing tying adjacent bents together (huge 3D realism boost!)
    for (const [iA, iB] of [[0, 1], [1, 2], [4, 5], [5, 6]]) {
      const A = bentInfo[iA], B = bentInfo[iB];
      const midY = Math.max(A.gy, B.gy) + (spanY - Math.max(A.gy, B.gy)) * 0.52;
      if (midY < spanY - 2.0) {
        for (const sz of [-1.45, 1.45]) {
          timber.strut(T(A.lx, midY, sz), T(B.lx, midY, sz), 0.14, 0x48392b, 4);
          timber.strut(T(A.lx, midY, sz), T(B.lx, spanY - 0.5, sz * 0.92), 0.11, 0x433528, 4);
          timber.strut(T(B.lx, midY, sz), T(A.lx, spanY - 0.5, sz * 0.92), 0.11, 0x433528, 4);
        }
      }
    }

    // Heavy twin deck stringers, closely-spaced ties, outer guard timbers, rusted rails & broken jagged central gap!
    for (const [x0, x1, sagEnd] of [[-halfSpan - 5, -5.0, -1.7], [5.4, halfSpan + 5, -1.5]]) {
      for (const sz of [-1.25, 1.25]) {
        const yA = x0 < 0 ? spanY : spanY + sagEnd;
        const yB = x0 < 0 ? spanY + sagEnd : spanY;
        timber.strut(T(x0, yA + 0.12, sz), T(x1, yB + 0.12, sz), 0.28, 0x4e3e2f, 5);
        timber.strut(T(x0, yA + 0.52, sz * 1.22), T(x1, yB + 0.52, sz * 1.22), 0.11, 0x443628, 4); // timber guard rail
        steel.strut(T(x0, yA + 0.44, sz * 0.68), T(x1, yB + 0.44, sz * 0.68), 0.08, 0x624836, 4); // rusted narrow-gauge rail
      }
      const ties = 16;
      for (let k = 0; k <= ties; k++) {
        const t = k / ties;
        const tx = lerp(x0, x1, t);
        const ty = x0 < 0 ? lerp(spanY, spanY + sagEnd, t * t) : lerp(spanY + sagEnd, spanY, 1 - (1 - t) * (1 - t));
        timber.box(0.38, 0.22, 3.35, 0x493a2c, ...T(tx, ty + 0.28, 0), 0, trYaw, 0);
      }
      // Broken splintered rails & hanging snapped stringers plunging dramatically into the gorge gap!
      const tipX = x0 < 0 ? x1 : x0;
      const dir = x0 < 0 ? 1 : -1;
      const tipY = spanY + sagEnd;
      steel.strut(T(tipX, tipY + 0.42, -0.85), T(tipX + dir * 2.8, tipY - 3.6, -1.05), 0.07, 0x5c4434, 4);
      steel.strut(T(tipX, tipY + 0.42, 0.85), T(tipX + dir * 2.2, tipY - 2.9, 0.65), 0.07, 0x5c4434, 4);
      timber.strut(T(tipX, tipY + 0.1, 1.2), T(tipX + dir * 2.0, tipY - 2.2, 1.35), 0.18, 0x4c3c2d, 5);
    }
  }

  // -------------------------------------------------------------------------
  // LANDMARK 4: NE LOW PASS SADDLE — ARCHED VIADUCT, GAMBREL BARN & SILO, TOWN LIGHTS
  // Tucked cleanly lower in the NE pass saddle (NO floating Stonehenge block
  // on the eastern ridge!), arched bridge spandrels, true gambrel timber barn!
  // -------------------------------------------------------------------------
  {
    const passA = 337 * Math.PI / 180;
    const brR = 356;
    const bx = Math.cos(passA) * brR, bz = Math.sin(passA) * brR;
    const bh = sampleHeight(bx, bz);
    const bYaw = passA + Math.PI * 0.5;
    const B = makeSiteFrame(bx, bh, bz, bYaw);
    exclusionCircles.push({ x: bx, z: bz, r: 20 });
    landmarksMeta.push({ id: 'ne-pass-valley', x: bx, y: bh, z: bz });

    // Arched Concrete Highway Viaduct spanning the NE pass floor
    const deckY = 5.4;
    concrete.box(44, 1.45, 5.4, 0x767973, ...B(0, deckY, 0), 0, bYaw, 0);
    // Overhanging deck fascia + concrete safety parapet walls
    concrete.box(44.4, 0.95, 0.36, 0x676b66, ...B(0, deckY + 1.15, 2.55), 0, bYaw, 0);
    concrete.box(44.4, 0.95, 0.36, 0x676b66, ...B(0, deckY + 1.15, -2.55), 0, bYaw, 0);
    // Tapered per-pier terrain-anchored concrete piers + angled concrete arch spandrel haunches!
    const piers = [-16, -5.5, 5.5, 16];
    for (const px of piers) {
      const pp = B(px, 0, 0);
      concrete.anchoredPier(pp[0], pp[2], bh + deckY - 0.6, sampleHeight(pp[0], pp[2]), 1.35, 2.15, 0x656963, bYaw, 4, 5.0);
      // Angled concrete arch haunch ribs sweeping up into the deck slab!
      for (const dir of [-1, 1]) {
        concrete.strut(B(px + dir * 0.8, deckY - 4.2, 0), B(px + dir * 4.2, deckY - 0.6, 0), 0.95, 0x6c706a, 5);
      }
    }
    for (const px of [-14, 0, 14]) {
      const lp = B(px, deckY + 4.4, 2.4);
      steel.cyl(0.06, 0.10, 3.3, 5, 0x4b5055, lp[0], lp[1] - 1.5, lp[2]);
      beaconsAmber.push({ x: lp[0], y: lp[1] + 0.15, z: lp[2], size: 2.5, phase: px * 0.2 });
    }

    // Weathered PNW Gambrel-Roofed Timber Farmstead Barn, Lean-To & Hooped Stave Silo!
    const fA = 331 * Math.PI / 180, fR = 314;
    const fx = Math.cos(fA) * fR, fz = Math.sin(fA) * fR, fh = sampleHeight(fx, fz);
    const fYaw = fA + 0.42;
    const F = makeSiteFrame(fx, fh - 0.4, fz, fYaw);
    exclusionCircles.push({ x: fx, z: fz, r: 15 });
    const fMin = minFootprintY(sampleHeight, F, [[-7, -5], [9, -5], [9, 5], [-7, 5]]);
    const fBaseH = Math.max(3.5, (fh + 0.3) - (fMin - 4.5));
    // Fieldstone slope-anchored barn foundation terrace
    concrete.box(13.0, fBaseH, 9.0, 0x656760, fx, (fMin - 4.5) + fBaseH * 0.5, fz, 0, fYaw, 0);
    // Main weathered timber barn body + recessed dark barn & hayloft doors
    timber.box(11.4, 4.2, 7.4, 0x5d4838, ...F(0, 2.3, 0), 0, fYaw, 0);
    steel.box(2.2, 2.6, 0.22, 0x26201c, ...F(0, 1.5, 3.72), 0, fYaw, 0); // recessed double barn door
    steel.box(1.5, 1.4, 0.22, 0x26201c, ...F(0, 4.2, 3.72), 0, fYaw, 0); // hayloft window opening
    // Authentic pitched gable rusted-iron barn roof + overhanging eaves + rooftop ridge cupola ventilator!
    steel.gableRoof(F, 0, 4.35, 0, 11.4, 7.4, 3.1, 0.65, 0.55, 0x5a4337, 0x564233);
    timber.box(1.7, 1.35, 1.7, 0x554233, ...F(0, 7.75, 0), 0, fYaw, 0);
    steel.hipRoof(F, 0, 8.4, 0, 2.2, 2.2, 0.75, 0.1, 0x4b423b);
    // Side equipment lean-to shed
    timber.box(4.8, 2.5, 4.6, 0x544233, ...F(-7.8, 1.5, -0.4), 0, fYaw, 0);
    steel.box(5.4, 0.32, 5.2, 0x534036, ...F(-7.8, 2.95, -0.4), 0.18, fYaw, 0);
    // Hooped timber stave silo + metal reinforcement bands + vertical chute + conical galvanized cap!
    const sp = F(7.8, 0, -1.0);
    const sgh = sampleHeight(sp[0], sp[2]);
    concrete.anchoredPier(sp[0], sp[2], fh + 0.4, sgh, 2.25, 2.55, 0x62645d, fYaw, 8, 4.0);
    timber.cyl(2.05, 2.15, 9.2, 10, 0x695542, ...F(7.8, 4.8, -1.0));
    for (const hy of [1.8, 3.6, 5.4, 7.2, 8.8]) {
      steel.cyl(2.16, 2.16, 0.14, 10, 0x494d4f, ...F(7.8, hy, -1.0)); // steel hoop bands
    }
    timber.box(0.85, 8.6, 0.85, 0x5a4837, ...F(6.0, 4.6, -1.0), 0, fYaw, 0); // silo feed chute
    steel.cyl(0.18, 2.38, 2.15, 10, 0x595e60, ...F(7.8, 10.45, -1.0)); // conical silo cap
    const bl = F(0, 2.8, 3.9);
    beaconsAmber.push({ x: bl[0], y: bl[1], z: bl[2], size: 2.4, phase: 4.1 });

    // Distant living town sodium lights twinkling miles beyond the NE saddle (organically clustered streets!)
    const tRnd = mulberry32(0x70a0411);
    const clusters = [
      { deg: 329, r: 515, n: 7 },
      { deg: 337, r: 565, n: 9 },
      { deg: 344, r: 615, n: 7 },
    ];
    for (const cl of clusters) {
      for (let k = 0; k < cl.n; k++) {
        const a = (cl.deg + (tRnd() - 0.5) * 6.5) * Math.PI / 180;
        const r = cl.r + (tRnd() - 0.5) * 48;
        const tx = Math.cos(a) * r, tz = Math.sin(a) * r;
        const ty = 108 + (r - 485) * 0.22 + (tRnd() - 0.5) * 10;
        beaconsAmber.push({ x: tx, y: ty, z: tz, size: 2.2 + tRnd() * 1.4, phase: tRnd() * 6.28 });
      }
    }
  }

  // -------------------------------------------------------------------------
  // LANDMARK 5: SE HIGH RIDGE (~64 deg) — USFS RANGER FIRE-LOOKOUT TOWER
  // Seated on dark granite peak crags with per-leg terrain-anchored stone
  // footings (ZERO grey stilts!), interior zig-zag stairs, cantilevered catwalk
  // & railings, dark-glass mullioned panoramic cab & overhanging hipped roof!
  // -------------------------------------------------------------------------
  {
    const lk = findPeak(64, 6, 304, 336);
    const lYaw = Math.atan2(-lk.x, -lk.z);
    const baseH = lk.h - 0.8;
    const L = makeSiteFrame(lk.x, baseH, lk.z, lYaw);
    exclusionCircles.push({ x: lk.x, z: lk.z, r: 14 });
    landmarksMeta.push({ id: 'ranger-fire-lookout', x: lk.x, y: lk.h, z: lk.z });
    addRockCollar(lk.x, lk.z, 5.2, 6, 5501, true);

    const H = 15.2;
    const bW = 2.85, tW = 1.85;
    // Per-leg terrain-anchored stone footings + tapered heavy timber corner posts
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const lp = L(sx * bW, 0, sz * bW);
      const lgh = sampleHeight(lp[0], lp[2]);
      concrete.anchoredPier(lp[0], lp[2], lgh + 0.6, lgh, 0.55, 0.85, 0x656862, lYaw, 4, 4.5);
      timber.strut([lp[0], lgh + 0.4, lp[2]], L(sx * tW, H, sz * tW), 0.21, 0x574534, 5);
    }
    // 3 X-braced structural timber bays + horizontal girts + interior zig-zag wooden staircase & landings!
    for (let b = 0; b < 3; b++) {
      const y0 = lerp(0.2, H - 0.4, b / 3), y1 = lerp(0.2, H - 0.4, (b + 1) / 3);
      const w0 = lerp(bW, tW, b / 3), w1 = lerp(bW, tW, (b + 1) / 3);
      for (const s of [
        [[-w0, -w0], [w1, -w1], [w0, -w0], [-w1, -w1]],
        [[w0, -w0], [w1, w1], [w0, w0], [w1, -w1]],
        [[w0, w0], [-w1, w1], [-w0, w0], [w1, w1]],
        [[-w0, w0], [-w1, -w1], [-w0, -w0], [-w1, w1]],
      ]) {
        timber.strut(L(s[0][0], y0, s[0][1]), L(s[1][0], y1, s[1][1]), 0.11, 0x4d3d2e, 4);
        timber.strut(L(s[2][0], y0, s[2][1]), L(s[3][0], y1, s[3][1]), 0.11, 0x4d3d2e, 4);
      }
      // Perimeter girts (NO clunky solid slab!) + interior stairway landing & angled stair run
      timber.strut(L(-w1, y1, -w1), L(w1, y1, -w1), 0.13, 0x514030, 4);
      timber.strut(L(w1, y1, -w1), L(w1, y1, w1), 0.13, 0x514030, 4);
      timber.strut(L(w1, y1, w1), L(-w1, y1, w1), 0.13, 0x514030, 4);
      timber.strut(L(-w1, y1, w1), L(-w1, y1, -w1), 0.13, 0x514030, 4);
      timber.box(w1 * 1.4, 0.18, 1.1, 0x534232, ...L(0, y1, b % 2 === 0 ? -w1 * 0.4 : w1 * 0.4), 0, lYaw, 0);
      const sx0 = b % 2 === 0 ? -w0 * 0.65 : w0 * 0.65;
      const sx1 = b % 2 === 0 ? w1 * 0.65 : -w1 * 0.65;
      timber.strut(L(sx0, y0, -0.35), L(sx1, y1, -0.35), 0.10, 0x473829, 4);
      timber.strut(L(sx0, y0, 0.35), L(sx1, y1, 0.35), 0.10, 0x473829, 4);
    }
    // Cantilevered wrap-around catwalk deck + diagonal knee braces + stanchions & safety railings!
    const catW = 3.25;
    timber.box(catW * 2, 0.32, catW * 2, 0x594837, ...L(0, H, 0), 0, lYaw, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      timber.strut(L(sx * tW, H - 1.9, sz * tW), L(sx * catW * 0.94, H - 0.1, sz * catW * 0.94), 0.12, 0x4e3e2f, 4);
      timber.strut(L(sx * catW, H + 0.1, sz * catW), L(sx * catW, H + 1.25, sz * catW), 0.08, 0x5a4837, 4);
    }
    for (const rh of [0.62, 1.20]) {
      timber.strut(L(-catW, H + rh, -catW), L(catW, H + rh, -catW), 0.06, 0x5c4a38, 4);
      timber.strut(L(catW, H + rh, -catW), L(catW, H + rh, catW), 0.06, 0x5c4a38, 4);
      timber.strut(L(catW, H + rh, catW), L(-catW, H + rh, catW), 0.06, 0x5c4a38, 4);
      timber.strut(L(-catW, H + rh, catW), L(-catW, H + rh, -catW), 0.06, 0x5c4a38, 4);
    }
    // Authentic USFS L-4 panoramic glass cab: wooden wainscot + dark-glass window band + corner/mullion posts!
    timber.box(4.1, 1.15, 4.1, 0x675542, ...L(0, H + 0.72, 0), 0, lYaw, 0);
    steel.box(3.72, 1.25, 3.72, 0x1b2126, ...L(0, H + 1.92, 0), 0, lYaw, 0); // recessed panoramic cab windows
    for (const [mx, mz] of [[-1.98, -1.98], [1.98, -1.98], [1.98, 1.98], [-1.98, 1.98], [0, 1.98], [0, -1.98], [1.98, 0], [-1.98, 0]]) {
      timber.box(0.18, 1.38, 0.18, 0x6c5a47, ...L(mx, H + 1.92, mz), 0, lYaw, 0);
    }
    timber.box(4.25, 0.30, 4.25, 0x5c4b39, ...L(0, H + 2.72, 0), 0, lYaw, 0);
    // Low-pitched overhanging hipped gable roof with deep eaves (replaces blunt 4-sided pyramid hat!)
    timber.hipRoof(L, 0, H + 2.86, 0, 6.2, 6.2, 1.55, 0.9, 0x493f35);
    // Rooftop radio whip + weather anemometer mast
    steel.cyl(0.05, 0.09, 4.8, 4, 0x505659, ...L(1.1, H + 6.0, -0.7));
    steel.box(1.1, 0.08, 0.08, 0x545a5d, ...L(-0.8, H + 5.2, 0.6), 0, lYaw, 0);
    steel.cyl(0.04, 0.06, 1.4, 4, 0x545a5d, ...L(-0.8, H + 4.6, 0.6));
    const ll = L(0, H + 1.95, 2.2);
    beaconsAmber.push({ x: ll[0], y: ll[1], z: ll[2], size: 3.4, phase: 2.8 });
  }

  // -------------------------------------------------------------------------
  // LANDMARK 6: SOUTH BENCH (~106 deg) — STEPPED COLDWATER ORE MILL & HEADFRAME
  // Gravity-fed 3-tier hillside timber stamp mill with pitched corrugated roofs,
  // clerestory monitor ridge, elevated ore-car chute trestle, authentic braced
  // timber A-frame headframe + spoked sheave wheel, hoist house & guyed stack!
  // -------------------------------------------------------------------------
  {
    const mA = 106 * Math.PI / 180, mR = 296;
    const mx = Math.cos(mA) * mR, mz = Math.sin(mA) * mR, mh = sampleHeight(mx, mz);
    const mYaw = Math.atan2(-mx, -mz) + 0.22;
    const M = makeSiteFrame(mx, mh - 0.5, mz, mYaw);
    exclusionCircles.push({ x: mx, z: mz, r: 20 });
    landmarksMeta.push({ id: 'coldwater-outer-mill', x: mx, y: mh, z: mz });
    addRockCollar(mx, mz, 12.5, 6, 5601, false);

    // Slope-anchored stone retaining cribwork following exact hillside drop
    const mMin = minFootprintY(sampleHeight, M, [[-11, -6], [11, -6], [11, 6], [-11, 6]]);
    const mBot = mMin - 5.0;
    const mRetH = Math.max(4.0, (mh + 0.2) - mBot);
    concrete.box(21.5, mRetH, 10.8, 0x64665f, mx, mBot + mRetH * 0.5, mz, 0, mYaw, 0);

    // Main lower stamp-mill hall + stepped upper crusher house + clerestory monitor roof ridge!
    timber.box(10.8, 4.8, 6.8, 0x574839, ...M(-3.6, 2.6, 0.4), 0, mYaw, 0);
    steel.gableRoof(M, -3.6, 5.0, 0.4, 10.8, 6.8, 2.4, 0.6, 0.55, 0x5e4538, 0x504234);
    // Raised clerestory roof monitor along mill ridge
    timber.box(6.4, 1.15, 2.2, 0x4d3f31, ...M(-3.6, 7.2, 0.4), 0, mYaw, 0);
    steel.gableRoof(M, -3.6, 7.75, 0.4, 6.4, 2.2, 0.75, 0.35, 0.35, 0x553f34, 0x4c3e30);
    // Upper ore-bin annex stepped behind mill
    timber.box(5.6, 5.8, 4.8, 0x514234, ...M(-1.2, 3.8, -4.4), 0, mYaw, 0);
    steel.gableRoof(M, -1.2, 6.7, -4.4, 5.6, 4.8, 1.6, 0.4, 0.4, 0x594235, 0x4c3e30);
    // Recessed dark industrial mill windows & loading bay door
    for (const wx of [-6.8, -3.6, -0.4]) {
      steel.box(1.3, 1.5, 0.22, 0x1e1d1b, ...M(wx, 3.2, 3.85), 0, mYaw, 0);
    }

    // Elevated enclosed timber ore-car trestle chute bridging the headframe into the upper crusher house!
    timber.box(7.8, 1.45, 1.6, 0x524234, ...M(2.6, 7.2, -0.6), 0, mYaw, -0.14);
    steel.box(8.1, 0.25, 1.9, 0x5c4437, ...M(2.6, 8.0, -0.6), 0, mYaw, -0.14);

    // Authentic Braced 4-Post Timber Mine Shaft Headframe + Angled Backstays + Spoked Iron Sheave Wheel!
    const hH = 16.2, hx = 6.6;
    for (const sz of [-2.0, 2.0]) {
      // Main shaft guide posts
      timber.strut(M(hx - 1.5, -1.0, sz), M(hx - 0.6, hH, sz * 0.58), 0.26, 0x4e3f31, 5);
      timber.strut(M(hx + 1.5, -1.0, sz), M(hx + 0.6, hH, sz * 0.58), 0.26, 0x4e3f31, 5);
      // Heavy angled diagonal backstay thrust struts resisting hoist-cable pull
      timber.strut(M(hx - 5.2, -0.5, sz * 0.85), M(hx - 0.3, hH * 0.88, sz * 0.55), 0.24, 0x493b2d, 5);
      // Cross-bracing bays on the headframe
      timber.strut(M(hx - 1.2, 4.5, sz * 0.85), M(hx + 1.0, 9.5, sz * 0.72), 0.13, 0x46382b, 4);
      timber.strut(M(hx + 1.2, 4.5, sz * 0.85), M(hx - 1.0, 9.5, sz * 0.72), 0.13, 0x46382b, 4);
    }
    timber.strut(M(hx - 1.0, 9.5, -1.4), M(hx - 1.0, 9.5, 1.4), 0.16, 0x4b3c2e, 4);
    timber.strut(M(hx + 1.0, 9.5, -1.4), M(hx + 1.0, 9.5, 1.4), 0.16, 0x4b3c2e, 4);
    // Framed timber top sheave-house cap & gabled cover
    timber.box(3.4, 0.45, 3.0, 0x524234, ...M(hx, hH, 0), 0, mYaw, 0);
    steel.gableRoof(M, hx, hH + 1.1, 0, 3.6, 3.2, 1.1, 0.35, 0.35, 0x564034, 0x4c3d2f);
    // Spoked rusted iron head-sheave wheel + diagonal hoist cable descending to the hoist house
    const wheel = new THREE.TorusGeometry(1.38, 0.16, 6, 14);
    steel.addGeo(wheel, 0x5c4234, ...M(hx, hH - 0.95, 0), 0, mYaw, 0);
    wheel.dispose();
    for (let sp = 0; sp < 4; sp++) {
      const a = (sp / 4) * Math.PI;
      steel.strut(
        M(hx + Math.cos(a) * 1.32, hH - 0.95 + Math.sin(a) * 1.32, 0),
        M(hx - Math.cos(a) * 1.32, hH - 0.95 - Math.sin(a) * 1.32, 0),
        0.055, 0x523b2e, 4
      );
    }
    steel.strut(M(hx - 0.6, hH - 0.6, 0), M(1.6, 2.2, 1.2), 0.045, 0x313436, 4); // tensioned hoist wire

    // Riveted Iron Boiler Smokestack on masonry firebox base with spark-arrestor crown & 3 guy wires!
    concrete.box(3.2, 3.6, 3.0, 0x625e57, ...M(-9.8, 1.8, -1.8), 0, mYaw, 0);
    steel.cyl(0.50, 0.78, 14.5, 8, 0x47423e, ...M(-9.8, 10.6, -1.8));
    steel.cyl(0.68, 0.56, 0.75, 8, 0x3b3734, ...M(-9.8, 18.0, -1.8)); // spark-arrestor crown cap
    for (const [gx, gz] of [[-14.2, -5.0], [-14.0, 2.6], [-5.2, -4.8]]) {
      steel.strut(M(-9.8, 14.2, -1.8), M(gx, 0.4, gz), 0.032, 0x34373a, 4);
    }
  }

  // -------------------------------------------------------------------------
  // LANDMARK 7: NW RIDGE CREST (~234 deg) — ANCIENT FIRST PEOPLE STANDING STONES
  // Replaces the 3 rectangular Domino boxes spelling `山` with sculpted,
  // fractured, tapered basalt monoliths emerging from a dark rocky ridge outcrop!
  // -------------------------------------------------------------------------
  {
    const nwA = 234 * Math.PI / 180, nwR = 304;
    const nx = Math.cos(nwA) * nwR, nz = Math.sin(nwA) * nwR, nh = sampleHeight(nx, nz);
    const nYaw = Math.atan2(-nx, -nz);
    const N = makeSiteFrame(nx, nh - 0.6, nz, nYaw);
    exclusionCircles.push({ x: nx, z: nz, r: 13 });
    landmarksMeta.push({ id: 'nw-ancient-stones', x: nx, y: nh, z: nz });
    // Dark rocky basalt ridge collar so the ancient stones emerge from real rock, never pasted on white snow!
    addRockCollar(nx, nz, 5.6, 7, 5701, false);

    // Tall weathered leaning central menhir + two smaller broken/canted companion monoliths (asymmetric!)
    const p0 = N(0.0, 3.2, 0.0);
    const p1 = N(-4.4, 1.8, 1.6);
    const p2 = N(3.8, 1.2, 2.2);
    const p3 = N(-1.8, 0.4, -2.4);
    addSculptedMonolith(monolith, THREE, p0, 12.2, 1.55, 0.95, 0.07, nYaw + 0.15, -0.09, 0x5c605c, 5711);
    addSculptedMonolith(monolith, THREE, p1, 8.2,  1.25, 0.85, -0.08, nYaw + 0.65, 0.16, 0x555956, 5717);
    addSculptedMonolith(monolith, THREE, p2, 6.4,  1.10, 0.80, 0.12, nYaw - 0.50, -0.22, 0x595d59, 5723);
    addSculptedMonolith(monolith, THREE, p3, 5.2,  0.95, 0.75, -0.18, nYaw + 1.20, 0.14, 0x525653, 5729);
    // Low ancient tumbled fieldstone cairn ring nested between the stones
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      const cp = N(0.3 + Math.cos(a) * 2.1, 0.2, 2.2 + Math.sin(a) * 1.9);
      const cg = sampleHeight(cp[0], cp[2]);
      addSculptedMonolith(monolith, THREE, [cp[0], cg - 0.1, cp[2]], 2.0 + (k % 2) * 0.7, 0.72, 0.62, 0.1, a, -0.1, 0x5d615c, 5740 + k * 7);
    }
  }

  const group = new THREE.Group();
  group.name = 'outer-world-landmarks';
  group.add(concrete.build('outer-landmarks-concrete', mats.concrete));
  group.add(timber.build('outer-landmarks-timber', mats.timber));
  group.add(steel.build('outer-landmarks-steel', mats.steel));
  group.add(monolith.build('outer-landmarks-monolith', mats.monolith));

  // Build exterior pass road ribbon with UV coords for TSL feathered gravel shoulders (ZERO hard ribbon edges!)
  if (passRoadPoints.length >= 2) {
    const rp = [], rc = [], ruv = [];
    const halfW = 3.2;
    for (let i = 0; i < passRoadPoints.length - 1; i++) {
      const a = passRoadPoints[i], b = passRoadPoints[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l, nz = dx / l;
      const v0 = i / (passRoadPoints.length - 1), v1 = (i + 1) / (passRoadPoints.length - 1);
      const p00 = [a.x - nx * halfW, sampleHeight(a.x - nx * halfW, a.z - nz * halfW) + 0.14, a.z - nz * halfW, 0, v0];
      const p01 = [a.x + nx * halfW, sampleHeight(a.x + nx * halfW, a.z + nz * halfW) + 0.14, a.z + nz * halfW, 1, v0];
      const p10 = [b.x - nx * halfW, sampleHeight(b.x - nx * halfW, b.z - nz * halfW) + 0.14, b.z - nz * halfW, 0, v1];
      const p11 = [b.x + nx * halfW, sampleHeight(b.x + nx * halfW, b.z + nz * halfW) + 0.14, b.z + nz * halfW, 1, v1];
      for (const v of [p00, p10, p11, p00, p11, p01]) {
        rp.push(v[0], v[1], v[2]);
        rc.push(0.42, 0.40, 0.36);
        ruv.push(v[3], v[4]);
      }
    }
    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    rGeo.setAttribute('color', new THREE.Float32BufferAttribute(rc, 3));
    rGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ruv, 2));
    rGeo.computeVertexNormals();
    const roadMesh = new THREE.Mesh(rGeo, mats.passRoad);
    roadMesh.name = 'outer-pass-road';
    group.add(roadMesh);
  }

  return { group, beaconsRed, beaconsAmber, landmarksMeta, exclusionCircles, extraCragSpots };
}

// =========================================================================
// 5. ANIMATED ALPINE RIVER CASCADE, GLACIAL WATERFALL & MULTI-LAYER MIST
// Smooth 48-seg river cascade & 24-seg SW waterfall with flow UVs + feathered
// bank alpha + 18 billowing Gaussian alpine valley mist & peak cloud drapes!
// =========================================================================
function buildOuterWaterAndMist(THREE, mats, { sampleHeight, riverAng, cordonAng }) {
  const group = new THREE.Group();
  group.name = 'outer-water-and-mist';

  const wp = [], wc = [], wuv = [];

  // A) Upper alpine river cascade pouring into ESE River Gate (r = 220 -> 372 m, 48 smooth segments!)
  const rSegs = 48;
  let distAcc = 0;
  for (let i = 0; i < rSegs; i++) {
    const t0 = i / rSegs, t1 = (i + 1) / rSegs;
    const r0 = lerp(220, 370, t0), r1 = lerp(220, 370, t1);
    const a0 = riverAng + Math.sin(t0 * 5.2) * 0.022 + Math.sin(t0 * 11.4) * 0.005;
    const a1 = riverAng + Math.sin(t1 * 5.2) * 0.022 + Math.sin(t1 * 11.4) * 0.005;
    const w0 = lerp(6.4, 2.5, Math.pow(t0, 0.85)), w1 = lerp(6.4, 2.5, Math.pow(t1, 0.85));
    const x0 = Math.cos(a0) * r0, z0 = Math.sin(a0) * r0;
    const x1 = Math.cos(a1) * r1, z1 = Math.sin(a1) * r1;
    const nx0 = -Math.sin(a0), nz0 = Math.cos(a0);
    const nx1 = -Math.sin(a1), nz1 = Math.cos(a1);
    const y0 = sampleHeight(x0, z0) + 0.36, y1 = sampleHeight(x1, z1) + 0.36;
    const segLen = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    const v0 = distAcc * 0.085, v1 = (distAcc + segLen) * 0.085;
    distAcc += segLen;

    const steep = clamp((y1 - y0) / Math.max(0.5, segLen) * 2.2, 0.12, 1.0);
    const depthTint = clamp(1.0 - t0 * 0.65, 0.25, 1.0);
    // Vertex color carries physical water hints for TSL (r=foam, g=depth) & natural pale-teal fallback!
    const cR = mats.tslActive ? steep : lerp(0.28, 0.76, steep * 0.82);
    const cG = mats.tslActive ? depthTint : lerp(0.42, 0.83, steep * 0.82);
    const cB = mats.tslActive ? 1.0 : lerp(0.50, 0.87, steep * 0.82);

    const q0 = [x0 - nx0 * w0, sampleHeight(x0 - nx0 * w0 * 0.7, z0 - nz0 * w0 * 0.7) * 0.25 + y0 * 0.75, z0 - nz0 * w0, 0, v0];
    const q1 = [x0 + nx0 * w0, sampleHeight(x0 + nx0 * w0 * 0.7, z0 + nz0 * w0 * 0.7) * 0.25 + y0 * 0.75, z0 + nz0 * w0, 1, v0];
    const q2 = [x1 + nx1 * w1, sampleHeight(x1 + nx1 * w1 * 0.7, z1 + nz1 * w1 * 0.7) * 0.25 + y1 * 0.75, z1 + nz1 * w1, 1, v1];
    const q3 = [x1 - nx1 * w1, sampleHeight(x1 - nx1 * w1 * 0.7, z1 - nz1 * w1 * 0.7) * 0.25 + y1 * 0.75, z1 - nz1 * w1, 0, v1];
    for (const v of [q0, q1, q2, q0, q2, q3]) {
      wp.push(v[0], v[1], v[2]);
      wc.push(cR, cG, cB);
      wuv.push(v[3], v[4]);
    }
  }

  // B) SW Alpine Glacial Cliff Waterfall (~214 deg, r = 330 -> 394 m, 24 smooth segments!)
  const wfA = 214 * Math.PI / 180;
  const wfNx = -Math.sin(wfA), wfNz = Math.cos(wfA);
  let wfAcc = 0;
  const wfSegs = 24;
  for (let i = 0; i < wfSegs; i++) {
    const t0 = i / wfSegs, t1 = (i + 1) / wfSegs;
    const r0 = lerp(330, 394, t0), r1 = lerp(330, 394, t1);
    const x0 = Math.cos(wfA) * r0, z0 = Math.sin(wfA) * r0;
    const x1 = Math.cos(wfA) * r1, z1 = Math.sin(wfA) * r1;
    const y0 = sampleHeight(x0, z0) + 0.72, y1 = sampleHeight(x1, z1) + 0.72;
    const segLen = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    const v0 = wfAcc * 0.10, v1 = (wfAcc + segLen) * 0.10;
    wfAcc += segLen;
    const w0 = lerp(5.4, 2.2, t0), w1 = lerp(5.4, 2.2, t1);
    const foam = clamp(0.68 + t0 * 0.28, 0, 1);
    const cR = mats.tslActive ? foam : lerp(0.44, 0.84, foam);
    const cG = mats.tslActive ? 0.65 : lerp(0.56, 0.88, foam);
    const cB = mats.tslActive ? 1.0 : lerp(0.64, 0.92, foam);
    const q0 = [x0 - wfNx * w0, y0, z0 - wfNz * w0, 0, v0];
    const q1 = [x0 + wfNx * w0, y0, z0 + wfNz * w0, 1, v0];
    const q2 = [x1 + wfNx * w1, y1, z1 + wfNz * w1, 1, v1];
    const q3 = [x1 - wfNx * w1, y1, z1 - wfNz * w1, 0, v1];
    for (const v of [q0, q1, q2, q0, q2, q3]) {
      wp.push(v[0], v[1], v[2]);
      wc.push(cR, cG, cB);
      wuv.push(v[3], v[4]);
    }
  }

  const waterGeo = new THREE.BufferGeometry();
  waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  waterGeo.setAttribute('color', new THREE.Float32BufferAttribute(wc, 3));
  waterGeo.setAttribute('uv', new THREE.Float32BufferAttribute(wuv, 2));
  waterGeo.computeVertexNormals();
  const waterMesh = new THREE.Mesh(waterGeo, mats.water);
  waterMesh.name = 'outer-river-and-waterfall';
  group.add(waterMesh);

  // C) Multi-Layered Billowing Alpine Valley Mist & Peak Cloud Drapes (2 batched InstancedMeshes = 2 draws!)
  // Strategically positioned to softly veil structure foundations, river gorge, waterfall plunge,
  // western pass, Ridgeline cliff flanks, and NE valley saddle (partial occlusion & mile-deep atmosphere!)
  const mistTex = mats.texSet ? mats.texSet.mistTex : null;
  const valleyMistMat = new THREE.MeshBasicMaterial({
    color: 0xd8e4ef,
    map: mistTex,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  const peakMistMat = new THREE.MeshBasicMaterial({
    color: 0xdce6f2,
    map: mistTex,
    transparent: true,
    opacity: 0.20,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });

  const cDeg = (cordonAng * 180) / Math.PI;
  const rDeg = (riverAng * 180) / Math.PI;

  const valleySpots = [
    { deg: rDeg,      r: 256, w: 62,  h: 22, lift: 7  }, // River gorge spray & trestle lower mist
    { deg: rDeg + 2,  r: 294, w: 92,  h: 28, lift: 13 }, // Upper cascade gorge mist
    { deg: cDeg - 7,  r: 254, w: 72,  h: 22, lift: 8  }, // West Cordon Overwatch lower flank veil
    { deg: 193,       r: 326, w: 135, h: 30, lift: 14 }, // Western powerline pass valley mist
    { deg: 214,       r: 322, w: 118, h: 30, lift: 14 }, // SW glacial waterfall plunge spray cloud
    { deg: 334,       r: 325, w: 138, h: 32, lift: 14 }, // NE pass valley & farmstead mist
    { deg: 340,       r: 368, w: 155, h: 36, lift: 18 }, // NE viaduct mountain-pass fog layer
    { deg: 106,       r: 288, w: 110, h: 26, lift: 10 }, // South Coldwater mill gully mist
    { deg: 58,        r: 295, w: 115, h: 28, lift: 13 }, // SE gorge & lookout lower slope haze
    { deg: 234,       r: 296, w: 102, h: 26, lift: 11 }, // NW standing stones shoulder mist
    { deg: 5,         r: 315, w: 128, h: 28, lift: 12 }, // East timberline valley haze
    { deg: 148,       r: 325, w: 125, h: 26, lift: 13 }, // SSW gorge mist
  ];

  const peakSpots = [
    { deg: 280, r: 336, w: 128, h: 36, lift: -6 }, // Ridgeline northern massif cliff cloud drape!
    { deg: 264, r: 340, w: 140, h: 38, lift: 12 }, // Northern mountain saddle cloud ribbon
    { deg: 64,  r: 312, w: 96,  h: 30, lift: -4 }, // SE Fire-Lookout peak shoulder cloud wisp
    { deg: 189, r: 306, w: 108, h: 30, lift: -2 }, // Western pylon ridge cloud veil
    { deg: 310, r: 350, w: 145, h: 38, lift: 10 }, // NNE high alpine ridge veil
    { deg: 222, r: 342, w: 130, h: 34, lift: 8  }, // WSW alpine ridge cloud drape
  ];

  const mistGeo = new THREE.PlaneGeometry(1, 1);
  const buildMistLayer = (name, spots, mat) => {
    const im = new THREE.InstancedMesh(mistGeo, mat, spots.length);
    im.name = name;
    im.frustumCulled = false;
    const records = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < spots.length; i++) {
      const ms = spots[i];
      const a = ms.deg * Math.PI / 180;
      const mx = Math.cos(a) * ms.r, mz = Math.sin(a) * ms.r;
      const my = sampleHeight(mx, mz) + ms.lift;
      const yaw = Math.atan2(-mx, -mz);
      e.set(0, yaw, 0);
      q.setFromEuler(e);
      p.set(mx, my, mz);
      s.set(ms.w, ms.h, 1);
      m4.compose(p, q, s);
      im.setMatrixAt(i, m4);
      records.push({ baseX: mx, baseY: my, baseZ: mz, w: ms.w, h: ms.h, yaw, phase: i * 1.17, driftR: 6.5 });
    }
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
    return { im, mat, records };
  };

  const valleyMist = buildMistLayer('outer-valley-mist', valleySpots, valleyMistMat);
  const peakMist   = buildMistLayer('outer-peak-clouds', peakSpots, peakMistMat);

  return { group, valleyMist, peakMist };
}

// =========================================================================
// 6. DISTANT DUSK/NIGHT BEACONS, LIVING-WORLD LIGHTS & SCULPTED RAPTORS
// =========================================================================
function buildBeaconsAndBirds(THREE, mats, { beaconsRed, beaconsAmber, TSL = null }) {
  const group = new THREE.Group();
  group.name = 'outer-beacons-and-birds';

  const redGlowTex = mats.texSet ? mats.texSet.glowRedTex : null;
  const amberGlowTex = mats.texSet ? mats.texSet.glowAmberTex : null;
  const useSprite = typeof THREE.Sprite === 'function' && typeof THREE.SpriteMaterial === 'function';
  const useInstancedSprite = !!(useSprite && typeof THREE.SpriteNodeMaterial === 'function'
    && typeof THREE.InstancedBufferAttribute === 'function'
    && TSL && typeof TSL.instancedBufferAttribute === 'function' && beaconsAmber.length > 0);
  const fallbackGeo = typeof THREE.OctahedronGeometry === 'function'
    ? new THREE.OctahedronGeometry(0.18, 1)
    : new THREE.BoxGeometry(0.3, 0.3, 0.3);

  const redMeshes = [];
  for (let i = 0; i < beaconsRed.length; i++) {
    const b = beaconsRed[i];
    let sp, mat;
    if (useSprite) {
      mat = new THREE.SpriteMaterial({
        map: redGlowTex, color: 0xffffff, transparent: true, opacity: 0.0,
        depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
      });
      sp = new THREE.Sprite(mat);
      sp.scale.set(b.size, b.size, 1);
    } else {
      mat = new THREE.MeshBasicMaterial({ color: 0xff2b20, transparent: true, opacity: 0.0, depthWrite: false, fog: false });
      sp = new THREE.Mesh(fallbackGeo, mat);
      sp.scale.setScalar(b.size * 0.25);
    }
    sp.name = 'outer-red-beacon-' + i;
    sp.position.set(b.x, b.y, b.z);
    sp.frustumCulled = false;
    sp.matrixAutoUpdate = false;
    sp.updateMatrix();
    group.add(sp);
    redMeshes.push({ mesh: sp, mat, phase: b.phase, speed: b.speed, baseSize: b.size });
  }

  // AG-419: batch all 44 distant town/pass/lookout amber sprites into ONE native instanced SpriteNodeMaterial draw
  // (44 draws -> 1 draw every dusk/night frame, bit-exact Sprite billboarding via SpriteNodeMaterial.setupPositionView).
  let amberNode, amberMat;
  if (useInstancedSprite) {
    const n = beaconsAmber.length;
    const posData = new Float32Array(n * 3);
    const scaleData = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const b = beaconsAmber[i];
      posData[i * 3] = b.x; posData[i * 3 + 1] = b.y; posData[i * 3 + 2] = b.z;
      scaleData[i * 2] = b.size; scaleData[i * 2 + 1] = b.size;
    }
    const posAttr = new THREE.InstancedBufferAttribute(posData, 3);
    const scaleAttr = new THREE.InstancedBufferAttribute(scaleData, 2);
    amberMat = new THREE.SpriteNodeMaterial({
      map: amberGlowTex, color: 0xffffff, transparent: true, opacity: 0.0,
      depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    });
    amberMat.positionNode = TSL.instancedBufferAttribute(posAttr);
    amberMat.scaleNode = TSL.instancedBufferAttribute(scaleAttr);
    amberNode = new THREE.Sprite(amberMat);
    amberNode.count = n;
    amberNode.name = 'outer-amber-lights-core';
    amberNode.visible = false;
    amberNode.frustumCulled = false;
    amberNode.matrixAutoUpdate = false;
    amberNode.updateMatrix();
    group.add(amberNode);
  } else {
    amberNode = new THREE.Group();
    amberNode.name = 'outer-amber-lights-core';
    amberNode.visible = false;
    amberMat = useSprite
      ? new THREE.SpriteMaterial({
          map: amberGlowTex, color: 0xffffff, transparent: true, opacity: 0.0,
          depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
        })
      : new THREE.MeshBasicMaterial({ color: 0xffb35c, transparent: true, opacity: 0.0, depthWrite: false, fog: false });
    for (let i = 0; i < beaconsAmber.length; i++) {
      const b = beaconsAmber[i];
      const sp = useSprite ? new THREE.Sprite(amberMat) : new THREE.Mesh(fallbackGeo, amberMat);
      sp.position.set(b.x, b.y, b.z);
      if (useSprite) sp.scale.set(b.size, b.size, 1);
      else sp.scale.setScalar(b.size * 0.2);
      sp.frustumCulled = false;
      sp.matrixAutoUpdate = false;
      sp.updateMatrix();
      amberNode.add(sp);
    }
    amberNode.matrixAutoUpdate = false;
    amberNode.updateMatrix();
    group.add(amberNode);
  }

  // Sculpted 10-triangle soaring mountain raptor silhouette (fuselage, cambered inner wings,
  // swept dihedral outer wingtips & fanned tail — no more 2-triangle black dead-pixel darts!)
  const birdGeo = new THREE.BufferGeometry();
  const bv = new Float32Array([
    // Fuselage + neck/beak
    0, 0.04, 1.05,   -0.22, 0.0, 0.15,    0.22, 0.0, 0.15,
    -0.22, 0.0, 0.15, 0, 0.0, -0.70,      0.22, 0.0, 0.15,
    // Fanned raptor tail
    0, 0.0, -0.58,   -0.46, 0.03, -1.25,  0.46, 0.03, -1.25,
    // Left inner cambered wing + swept dihedral outer primary tip
    -0.18, 0.0, 0.30, -1.35, 0.22, 0.12,  -0.16, 0.0, -0.45,
    -1.35, 0.22, 0.12, -1.25, 0.18, -0.42, -0.16, 0.0, -0.45,
    -1.35, 0.22, 0.12, -2.45, 0.48, -0.32, -1.25, 0.18, -0.42,
    // Right inner cambered wing + swept dihedral outer primary tip
    0.18, 0.0, 0.30,  0.16, 0.0, -0.45,   1.35, 0.22, 0.12,
    1.35, 0.22, 0.12, 0.16, 0.0, -0.45,   1.25, 0.18, -0.42,
    1.35, 0.22, 0.12, 1.25, 0.18, -0.42,  2.45, 0.48, -0.32,
  ]);
  birdGeo.setAttribute('position', new THREE.BufferAttribute(bv, 3));
  birdGeo.computeVertexNormals();
  const birdCount = 12;
  const birdInst = new THREE.InstancedMesh(birdGeo, mats.birdMat, birdCount);
  birdInst.name = 'outer-alpine-birds';
  birdInst.frustumCulled = false;
  const bRnd = mulberry32(0xb14d411);
  const birds = [];
  for (let i = 0; i < birdCount; i++) {
    const homeAng = (i / birdCount) * Math.PI * 2 + bRnd() * 0.4;
    const homeR = 278 + bRnd() * 110;
    birds.push({
      cx: Math.cos(homeAng) * homeR,
      cz: Math.sin(homeAng) * homeR,
      cy: 105 + bRnd() * 64,
      orbitR: 24 + bRnd() * 28,
      speed: (0.13 + bRnd() * 0.12) * (i % 2 ? 1 : -1),
      phase: bRnd() * Math.PI * 2,
      sc: 0.72 + bRnd() * 0.48,
    });
  }
  group.add(birdInst);

  return { group, redMeshes, amberMat, amberMeshes: [amberNode], birdInst, birds };
}

// =========================================================================
// MAIN PUBLIC BUILDER: `buildOuterWorld(THREE, opts)`
// =========================================================================
export function buildOuterWorld(THREE, {
  sampleHeight,
  wallRadius = 220,
  terrainRadius = 430,
  cordonAng = 181.6 * Math.PI / 180,
  riverAng = 29.6 * Math.PI / 180,
  cordonRoadEnd = null,
  TSL = null,
} = {}) {
  const root = new THREE.Group();
  root.name = 'outer-world-vistas';

  const atmo = createOuterAtmosphere(THREE, TSL);
  const mats = createOuterWorldMaterials(THREE, TSL, atmo, { wallRadius, terrainRadius });

  // 1. Two Sculpted Distant Alpine Mountain Ranges beyond TERRAIN_RADIUS (r = 450..1175 m, inside skyDome=1350!)
  const midRange = buildFarMountainRange(THREE, mats.makeFarRangeMat('outer-alpine-mid-mat', { hazeBase: 0.30, isFar: false }), {
    name: 'outer-alpine-mid-range',
    rInner: terrainRadius + 20,
    rPeak: 632,
    rOuter: 795,
    baseY: -22,
    peakMin: 192,
    peakMax: 318,
    segs: 240,
    rings: 12,
    seed: 40811,
    lowHex: 0x364947,
    midHex: 0x4f616f,
    rockHex: 0x6b7783,
    snowHex: 0xcbd5df,
    snowLine: 0.62,
    saddleAngles: [
      { ang: 338 * Math.PI / 180, width: 0.34, dip: 0.42 },
      { ang: 196 * Math.PI / 180, width: 0.28, dip: 0.32 },
      { ang: 215 * Math.PI / 180, width: 0.26, dip: 0.26 },
    ],
  });

  const farRange = buildFarMountainRange(THREE, mats.makeFarRangeMat('outer-alpine-far-mat', { hazeBase: 0.56, isFar: true }), {
    name: 'outer-alpine-far-cordillera',
    rInner: 735,
    rPeak: 970,
    rOuter: 1175,
    baseY: -28,
    peakMin: 298,
    peakMax: 448,
    segs: 192,
    rings: 10,
    seed: 40829,
    lowHex: 0x576d86,
    midHex: 0x6c829c,
    rockHex: 0x8397b0,
    snowHex: 0xd6e1ee,
    snowLine: 0.55,
    saddleAngles: [
      { ang: 338 * Math.PI / 180, width: 0.22, dip: 0.20 },
    ],
  });
  root.add(midRange.mesh, farRange.mesh);

  // 2. Seven Upgraded Lore-True Outer Landmarks (produces exclusion pads + rock collar specs)
  const lm = buildOuterLandmarks(THREE, mats, { sampleHeight, cordonAng, riverAng, cordonRoadEnd });
  root.add(lm.group);

  // 3. Organic Outer Foothill Conifer & Larch Forests (4 instanced draws, serrated drooping whorls!)
  const forest = buildOuterForests(THREE, mats, {
    sampleHeight, wallRadius, cordonAng, riverAng, exclusionCircles: lm.exclusionCircles,
  });
  root.add(forest.group);

  // 4. Slope-Aligned, Corner-Clamped Deep-Root Alpine Cliff Buttresses & Canyon Bank Rocks
  const crags = buildOuterCrags(THREE, mats, {
    sampleHeight, wallRadius, riverAng, exclusionCircles: lm.exclusionCircles, extraCragSpots: lm.extraCragSpots,
  });
  root.add(crags.group);

  // 5. Animated Upper River Cascade, Glacial Waterfall & Multi-Layer Billowing Valley/Peak Mist
  const waterMist = buildOuterWaterAndMist(THREE, mats, { sampleHeight, riverAng, cordonAng });
  root.add(waterMist.group);

  // 6. Distant Dusk/Night Beacons, Town Sodium Lights & Sculpted Soaring Raptors
  const dynamic = buildBeaconsAndBirds(THREE, mats, {
    beaconsRed: lm.beaconsRed,
    beaconsAmber: lm.beaconsAmber,
    TSL,
  });
  root.add(dynamic.group);

  // AG-419: outer-world Object3D transforms never move at runtime (only uniforms, visibility, and
  // InstancedMesh instanceMatrix change); bake matrixWorld once and freeze matrixAutoUpdate.
  root.updateMatrixWorld(true);
  root.traverse((o) => { o.matrixAutoUpdate = false; });

  // Runtime animation & atmospheric perspective updater
  let elapsed = 0;
  const _hazeCol = new THREE.Color();
  const _skyMid = new THREE.Color();
  const _alpenglow = new THREE.Color(0xd88f64);
  const _bloodTint = new THREE.Color(0x4a1418);
  const _duskTint = new THREE.Color(0xd87b58);
  const _nightTint = new THREE.Color(0x050a14);
  const _tmpCol = new THREE.Color();
  const _syncEnv = {
    nightMix: 0, dusk: 0, rainK: 0, fogNightK: 0, bloodMoon: false,
    horizonColor: _tmpCol, skyMidColor: _skyMid, sunDir: null,
  };
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  const _p = new THREE.Vector3(), _s = new THREE.Vector3();

  // CPU fallback vertex-color tinter (only runs when TSL is unavailable, e.g. WebGL / Node tests)
  function tintRangeFallback(range, hazeAmt, duskAmt, nightAmt, bloodAmt, horizonCol, skyMidCol, stormFade) {
    const base = range.baseColors;
    const hts = range.heights;
    const attr = range.mesh.geometry.attributes.color;
    const arr = attr.array;
    _hazeCol.copy(horizonCol);
    if (bloodAmt > 0.01) _hazeCol.lerp(_bloodTint, bloodAmt * 0.50);

    const effHaze = clamp(hazeAmt + stormFade * (1 - hazeAmt) * 0.90, 0, 0.96);
    const rH = _hazeCol.r, gH = _hazeCol.g, bH = _hazeCol.b;

    for (let i = 0; i < hts.length; i++) {
      const o = i * 3;
      let r = base[o], g = base[o + 1], b = base[o + 2];
      if (duskAmt > 0.01) {
        const peakK = sstep(0.45, 0.92, hts[i]) * duskAmt;
        r = lerp(r, _alpenglow.r, peakK * 0.48);
        g = lerp(g, _alpenglow.g, peakK * 0.36);
        b = lerp(b, _alpenglow.b, peakK * 0.24);
      }
      if (nightAmt > 0.01) {
        // Cohesive night blend between fogged horizon and dark mid-sky (fixes night glow mismatch!)
        const topK = sstep(0.25, 0.95, hts[i]);
        const nr = lerp(rH * 0.86, skyMidCol.r * 1.10, topK);
        const ng = lerp(gH * 0.86, skyMidCol.g * 1.10, topK);
        const nb = lerp(bH * 0.86, skyMidCol.b * 1.10, topK);
        r = lerp(r, nr, nightAmt * 0.94);
        g = lerp(g, ng, nightAmt * 0.94);
        b = lerp(b, nb, nightAmt * 0.94);
      }
      const vertHaze = clamp(effHaze * (1.18 - hts[i] * 0.38), 0, 0.96);
      const hr = lerp(rH, lerp(rH, skyMidCol.r, sstep(0.55, 1.0, hts[i]) * 0.45), nightAmt);
      const hg = lerp(gH, lerp(gH, skyMidCol.g, sstep(0.55, 1.0, hts[i]) * 0.45), nightAmt);
      const hb = lerp(bH, lerp(bH, skyMidCol.b, sstep(0.55, 1.0, hts[i]) * 0.45), nightAmt);
      arr[o]     = lerp(r, hr, vertHaze);
      arr[o + 1] = lerp(g, hg, vertHaze);
      arr[o + 2] = lerp(b, hb, vertHaze);
    }
    attr.needsUpdate = true;
  }

  function animateMistLayer(layer) {
    for (let i = 0; i < layer.records.length; i++) {
      const mb = layer.records[i];
      _e.set(0, mb.yaw, 0);
      _q.setFromEuler(_e);
      _p.set(
        mb.baseX + Math.sin(elapsed * 0.065 + mb.phase) * mb.driftR,
        mb.baseY + Math.sin(elapsed * 0.045 + mb.phase * 1.3) * 1.2,
        mb.baseZ + Math.cos(elapsed * 0.055 + mb.phase) * mb.driftR
      );
      _s.set(mb.w, mb.h, 1);
      _m4.compose(_p, _q, _s);
      layer.im.setMatrixAt(i, _m4);
    }
    layer.im.instanceMatrix.needsUpdate = true;
  }

  let lastTintKey = '';
  let mistTick = 0;
  function update(dt = 0.016, env = {}) {
    const step = Math.max(0, Math.min(0.25, dt || 0));
    elapsed += step;
    const hidden = !!(env.inHollow || env.inTraining);
    root.visible = !hidden;
    if (hidden) return;

    const nightMix = clamp(env.nightMix ?? 0, 0, 1);
    const dusk = clamp(env.dusk ?? 0, 0, 1);
    const rainK = clamp(env.rainK ?? 0, 0, 1);
    const fogNightK = clamp(env.fogNightK ?? 0, 0, 1);
    const bloodAmt = env.bloodMoon ? nightMix : 0;
    const horizonCol = env.horizonColor || _tmpCol.setHex(0xd8e8ff);
    if (env.skyMidColor && typeof env.skyMidColor.r === 'number') {
      _skyMid.copy(env.skyMidColor);
    } else {
      _skyMid.setHex(0x87b7ff).lerp(_duskTint, dusk * 0.75).lerp(_nightTint, nightMix);
      if (bloodAmt > 0.01) _skyMid.lerp(_bloodTint, bloodAmt * 0.65);
    }

    // Sync TSL atmospheric uniforms every frame (zero per-frame alloc)
    _syncEnv.nightMix = nightMix;
    _syncEnv.dusk = dusk;
    _syncEnv.rainK = rainK;
    _syncEnv.fogNightK = fogNightK;
    _syncEnv.bloodMoon = !!env.bloodMoon;
    _syncEnv.horizonColor = horizonCol;
    _syncEnv.skyMidColor = _skyMid;
    _syncEnv.sunDir = env.sunDir || null;
    atmo.sync(_syncEnv, elapsed);

    const clearVis = clamp(1 - Math.max(fogNightK * 1.35, rainK * 0.78), 0, 1);
    const stormFade = clamp(Math.max(fogNightK, rainK * 0.78), 0, 1);

    if (!atmo.enabled) {
      const tintKey = `${Math.round(nightMix * 40)}|${Math.round(dusk * 40)}|${Math.round(stormFade * 30)}|${Math.round(bloodAmt * 20)}|${horizonCol.getHex()}`;
      if (tintKey !== lastTintKey) {
        lastTintKey = tintKey;
        tintRangeFallback(midRange, 0.28, dusk, nightMix, bloodAmt, horizonCol, _skyMid, stormFade);
        tintRangeFallback(farRange, 0.54, dusk, nightMix, bloodAmt, horizonCol, _skyMid, stormFade);
      }
    }
    midRange.mesh.visible = fogNightK < 0.88;
    farRange.mesh.visible = fogNightK < 0.78;

    // 1. Pulsing red Ridgeline & Cordon aviation beacons
    const lightWake = clamp(Math.max(dusk * 0.85, nightMix * 1.15), 0, 1) * clearVis;
    for (const r of dynamic.redMeshes) {
      const pulse = 0.28 + 0.72 * Math.pow(0.5 + 0.5 * Math.sin(elapsed * r.speed + r.phase), 3.0);
      const op = lightWake * (0.30 + 0.70 * pulse);
      r.mat.opacity = op;
      r.mesh.visible = op > 0.015;
    }

    // 2. Warm amber distant town lights, fire-lookout lantern, Ridgeline ops slits & pass lamps
    const amberOp = clamp(Math.max(dusk * 0.78, nightMix * 1.05), 0, 1) * clearVis;
    dynamic.amberMat.opacity = amberOp * 0.94;
    for (const m of dynamic.amberMeshes) m.visible = amberOp > 0.015;

    // 3. Multi-layered billowing valley mist & peak cloud drapes (partial occlusion + soft depth!)
    const dayMistBase = 0.22 + dusk * 0.14 + rainK * 0.22;
    waterMist.valleyMist.mat.color.copy(horizonCol);
    waterMist.valleyMist.mat.opacity = dayMistBase * (1 - nightMix * 0.74) * (1 - fogNightK * 0.92);
    waterMist.peakMist.mat.color.copy(horizonCol);
    waterMist.peakMist.mat.opacity = (0.18 + dusk * 0.12 + rainK * 0.24) * (1 - nightMix * 0.82) * (1 - fogNightK * 0.92);
    // Update mist drift at ~20 Hz to keep CPU overhead negligible
    mistTick += step;
    if (mistTick >= 0.05 || step === 0) {
      mistTick = 0;
      animateMistLayer(waterMist.valleyMist);
      animateMistLayer(waterMist.peakMist);
    }

    // 4. Sculpted high-altitude soaring mountain raptors (day & dusk only, roost at night/storm)
    const birdsVis = nightMix < 0.72 && rainK < 0.65 && fogNightK < 0.3;
    dynamic.birdInst.visible = birdsVis;
    if (birdsVis) {
      // Soften bird contrast gently toward horizon haze so they never read as dead black pixels
      if (mats.birdMat && mats.birdMat.color) {
        mats.birdMat.color.setHex(0x272d36).lerp(horizonCol, 0.28 + rainK * 0.3);
      }
      for (let i = 0; i < dynamic.birds.length; i++) {
        const b = dynamic.birds[i];
        const ang = elapsed * b.speed + b.phase;
        const bx = b.cx + Math.cos(ang) * b.orbitR;
        const bz = b.cz + Math.sin(ang) * b.orbitR;
        const by = b.cy + Math.sin(ang * 2 + b.phase) * 3.2;
        const heading = ang + (b.speed > 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
        const bank = b.speed > 0 ? -0.26 : 0.26;
        _e.set(0, -heading, bank);
        _q.setFromEuler(_e);
        _p.set(bx, by, bz);
        _s.setScalar(b.sc);
        _m4.compose(_p, _q, _s);
        dynamic.birdInst.setMatrixAt(i, _m4);
      }
      dynamic.birdInst.instanceMatrix.needsUpdate = true;
    }
  }

  update(0, { nightMix: 0, dusk: 0, rainK: 0, fogNightK: 0, horizonColor: new THREE.Color(0xd8e8ff) });

  return {
    group: root,
    update,
    landmarks: lm.landmarksMeta,
    stats: {
      forestTrees: forest.totalTrees,
      crags: crags.count,
      redBeacons: lm.beaconsRed.length,
      amberLights: lm.beaconsAmber.length,
      landmarks: lm.landmarksMeta.length,
      tslActive: mats.tslActive,
    },
  };
}
