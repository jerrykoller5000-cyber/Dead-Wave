// AG-308 (J137, Jerry 2026-11-11, D-156): Melee practice dummy for the Training Ground.
// Weighted free-standing military/gym striking dummy (human-scale worn canvas/vinyl torso & head on a
// sprung steel post and sand-weighted vulcanized rubber base, zero markings/logos), with surface-conforming
// blade/chainsaw/scorch/bullet decal batches sorted strictly beneath transparent effects and a damped
// 2-axis + torsion wobble when struck.

import { bakeStatic } from './bake.js';

export const DUMMY_SPEC = Object.freeze({
  height: 1.790,
  hingeY: 0.340,
  baseHeight: 0.148,
  baseRadius: 0.320,
  bodyRadius: 0.255,
  shoulderHalfWidth: 0.232,
  chestHalfDepth: 0.146,
  torsoBottomY: 0.820,
  neckY: 1.515,
  headBottomY: 1.565,
  headCenterY: 1.675,
  torsoCenterY: 1.165
});

// Recommended walkable spot near the range firing bench (FIRING_LINE.front = 0.18),
// ~1.5 m behind the bench on the open apron, clear of all 5 lanes, stations, console, and build-room door.
export const RECOMMENDED_DUMMY_SPOT = Object.freeze({
  x: -3.10,
  z: -1.35,
  yaw: 0.38
});

// Anatomical human-scale padded dummy slices: [worldY, halfWidthX, halfDepthZ, centerBiasZ, superellipseExp]
// Front of the dummy faces +Z in local dummy space.
const PROFILE_SLICES = [
  [0.820, 0.048, 0.048, 0.000, 2.00],
  [0.832, 0.146, 0.112, 0.002, 2.20],
  [0.865, 0.168, 0.126, 0.004, 2.30],
  [0.920, 0.164, 0.123, 0.005, 2.30],
  [0.990, 0.155, 0.118, 0.004, 2.25],
  [1.070, 0.168, 0.126, 0.008, 2.35],
  [1.150, 0.190, 0.137, 0.014, 2.45],
  [1.235, 0.214, 0.145, 0.020, 2.55],
  [1.315, 0.232, 0.146, 0.018, 2.60],
  [1.385, 0.224, 0.137, 0.010, 2.50],
  [1.435, 0.175, 0.112, 0.003, 2.25],
  [1.475, 0.102, 0.088, 0.000, 2.05],
  [1.505, 0.073, 0.073, 0.002, 2.00],
  [1.550, 0.070, 0.072, 0.004, 2.00],
  [1.578, 0.082, 0.098, 0.020, 2.15],
  [1.615, 0.091, 0.106, 0.018, 2.15],
  [1.665, 0.095, 0.110, 0.015, 2.10],
  [1.705, 0.096, 0.112, 0.014, 2.10],
  [1.748, 0.085, 0.097, 0.008, 2.05],
  [1.776, 0.054, 0.062, 0.004, 2.00],
  [1.790, 0.001, 0.001, 0.002, 2.00]
];

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}

// Interpolates [rx, rz, cz, exp] at worldY in [0.820, 1.790].
function sampleProfileParams(worldY, out) {
  const y = clamp(worldY, PROFILE_SLICES[0][0], PROFILE_SLICES[PROFILE_SLICES.length - 1][0]);
  let hi = 1;
  while (hi < PROFILE_SLICES.length - 1 && PROFILE_SLICES[hi][0] < y) hi++;
  const a = PROFILE_SLICES[hi - 1], b = PROFILE_SLICES[hi];
  const span = b[0] - a[0];
  const t = span > 1e-6 ? (y - a[0]) / span : 0;
  const s = t * t * (3 - 2 * t);
  out[0] = a[1] + (b[1] - a[1]) * s;
  out[1] = a[2] + (b[2] - a[2]) * s;
  out[2] = a[3] + (b[3] - a[3]) * s;
  out[3] = a[4] + (b[4] - a[4]) * s;
  return out;
}

const _profTmp = [0, 0, 0, 2];

// Evaluates exact 3D sculpted torso/neck/head surface point (in world-height coordinates, centered on X=0, Z=0).
// theta = 0 is +Z (front chest/chin), theta = PI/2 is +X (dummy's left shoulder), theta = PI is -Z (back).
function evalDummyBodySurface(worldY, theta, out) {
  const p = sampleProfileParams(worldY, _profTmp);
  let rx = p[0], rz = p[1], cz = p[2], exp = p[3];
  const st = Math.sin(theta), ct = Math.cos(theta);

  // Subtle anatomical padded-form sculpting (pure 3D padded bolster relief, zero painted facial features):
  // 1) Pectoral pad fullness & sternal groove on front chest (y = 1.18..1.38, ct > 0)
  if (worldY > 1.14 && worldY < 1.41 && ct > 0) {
    const wy = Math.sin(((worldY - 1.14) / 0.27) * Math.PI);
    const pec = wy * Math.pow(ct, 1.6) * (0.008 - 0.005 * Math.exp(-Math.pow(st / 0.16, 2)));
    rz += pec;
  }
  // 2) Deltoid lateral shoulder cap pad (y = 1.25..1.42, |st| > 0.65)
  if (worldY > 1.24 && worldY < 1.43) {
    const wy = Math.sin(((worldY - 1.24) / 0.19) * Math.PI);
    rx += wy * Math.pow(Math.abs(st), 3.0) * 0.009;
  }
  // 3) Subtle brow pad & jaw plane on striking head (y = 1.58..1.73, ct > 0.2)
  if (worldY > 1.67 && worldY < 1.735 && ct > 0.25) {
    const wy = Math.sin(((worldY - 1.67) / 0.065) * Math.PI);
    rz += wy * Math.pow((ct - 0.25) / 0.75, 1.5) * 0.0055;
  }

  // Superellipse radial mapping: (|sin|/1)^exp + (|cos|/1)^exp = 1/r^exp
  const ax = Math.pow(Math.abs(st), exp);
  const az = Math.pow(Math.abs(ct), exp);
  const denom = Math.pow(ax + az || 1, 1 / exp);
  const x = (rx * st) / denom;
  const z = cz + (rz * ct) / denom;
  out.x = x;
  out.y = worldY;
  out.z = z;
  return out;
}

function buildSculptedTorsoGeometry(THREE, hingeY) {
  const radialSegs = 32;
  const yRings = [
    0.820, 0.826, 0.836, 0.855, 0.885, 0.925, 0.970, 1.020, 1.075,
    1.130, 1.185, 1.240, 1.290, 1.335, 1.375, 1.410, 1.442, 1.472,
    1.498, 1.525, 1.552, 1.572, 1.592, 1.620, 1.655, 1.690, 1.720,
    1.748, 1.770, 1.784, 1.790
  ];
  const rows = yRings.length;
  const cols = radialSegs + 1;
  const vertCount = rows * cols;
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const pt = { x: 0, y: 0, z: 0 };
  const yMin = yRings[0], ySpan = yRings[rows - 1] - yMin;

  for (let r = 0; r < rows; r++) {
    const wy = yRings[r];
    const v = (wy - yMin) / ySpan;
    for (let c = 0; c <= radialSegs; c++) {
      const u = c / radialSegs;
      // u = 0 at back (-Z, theta = -PI), u = 0.5 at front (+Z, theta = 0)
      const theta = (u - 0.5) * Math.PI * 2;
      evalDummyBodySurface(wy, theta, pt);
      const idx = r * cols + c;
      positions[idx * 3] = pt.x;
      positions[idx * 3 + 1] = pt.y - hingeY;
      positions[idx * 3 + 2] = pt.z;
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = v;
    }
  }

  const indices = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < radialSegs; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = (r + 1) * cols + c;
      const e = d + 1;
      indices.push(a, b, d, b, e, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Fix seam normals across c = 0 and c = radialSegs so the back seam has continuous shading
  const nrm = geo.attributes.normal;
  for (let r = 0; r < rows; r++) {
    const i0 = r * cols, i1 = r * cols + radialSegs;
    const nx = nrm.getX(i0) + nrm.getX(i1);
    const ny = nrm.getY(i0) + nrm.getY(i1);
    const nz = nrm.getZ(i0) + nrm.getZ(i1);
    const len = Math.hypot(nx, ny, nz) || 1;
    nrm.setXYZ(i0, nx / len, ny / len, nz / len);
    nrm.setXYZ(i1, nx / len, ny / len, nz / len);
  }
  nrm.needsUpdate = true;
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

// Builds a raised 3D webbing cinch strap hugging the exact sculpted profile around [yCenter - halfH .. yCenter + halfH]
function buildStrapBandGeometry(THREE, hingeY, yCenter, height, proud = 0.0042, uBandV = 0.055) {
  const segs = 36;
  const rings = [
    [yCenter - height * 0.5, 0.0005],
    [yCenter - height * 0.36, proud],
    [yCenter + height * 0.36, proud],
    [yCenter + height * 0.5, 0.0005]
  ];
  const cols = segs + 1, rows = rings.length;
  const pos = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);
  const pt = { x: 0, y: 0, z: 0 };
  for (let r = 0; r < rows; r++) {
    const [wy, lift] = rings[r];
    for (let c = 0; c <= segs; c++) {
      const u = c / segs;
      const theta = (u - 0.5) * Math.PI * 2;
      evalDummyBodySurface(wy, theta, pt);
      const rad = Math.hypot(pt.x, pt.z) || 1;
      const idx = r * cols + c;
      pos[idx * 3] = pt.x + (pt.x / rad) * lift;
      pos[idx * 3 + 1] = wy - hingeY;
      pos[idx * 3 + 2] = pt.z + (pt.z / rad) * lift;
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = uBandV; // samples the dark webbing band in the vinyl/canvas texture!
    }
  }
  const indices = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < segs; c++) {
      const a = r * cols + c, b = a + 1, d = (r + 1) * cols + c, e = d + 1;
      indices.push(a, b, d, b, e, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Procedural worn military canvas/vinyl upholstery texture (512x512, SRGB, zero text/logos/stencils).
function buildVinylCanvasTexture(THREE) {
  if (typeof document === 'undefined') return null;
  const W = 512, H = 512;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');

  let seed = 308137;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Base desaturated field khaki-olive heavy vinyl/canvas (#756e5a, < 22% saturation)
  c.fillStyle = '#756e5a';
  c.fillRect(0, 0, W, H);

  // Subtle mottled canvas hide & patina variation
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W, y = rnd() * H, r = 14 + rnd() * 48;
    const dark = rnd() < 0.54;
    const gr = c.createRadialGradient(x, y, 2, x, y, r);
    gr.addColorStop(0, dark ? 'rgba(42,40,31,0.11)' : 'rgba(154,146,122,0.09)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }

  // Heavy duck-canvas weave grain (warp & weft)
  c.fillStyle = 'rgba(34,32,25,0.09)';
  for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
  c.fillStyle = 'rgba(168,160,136,0.06)';
  for (let x = 0; x < W; x += 3) c.fillRect(x, 0, 1, H);

  // Burnished/scuffed strike zones (front chest u ~ 0.5, v ~ 0.42..0.64 -> canvas y = H*(1-v); head u ~ 0.5, v ~ 0.84..0.95)
  const wearZones = [
    [W * 0.50, H * 0.47, 88, 72, 0.24], // center chest & ribs
    [W * 0.42, H * 0.54, 54, 56, 0.16], // right rib strike zone
    [W * 0.58, H * 0.54, 54, 56, 0.16], // left rib strike zone
    [W * 0.50, H * 0.12, 58, 34, 0.22]  // head / jaw / brow strike zone
  ];
  for (const [wx, wy, rx, ry, alpha] of wearZones) {
    c.save();
    c.translate(wx, wy);
    c.scale(rx, ry);
    const gr = c.createRadialGradient(0, 0, 0.08, 0, 0, 1);
    gr.addColorStop(0, `rgba(52,48,38,${alpha})`);
    gr.addColorStop(0.65, `rgba(62,58,46,${(alpha * 0.55).toFixed(3)})`);
    gr.addColorStop(1, 'rgba(62,58,46,0)');
    c.fillStyle = gr;
    c.beginPath();
    c.arc(0, 0, 1, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  // Fine scuff scratches from old practice hits (no blade cuts — clean wear scuffs only)
  for (let i = 0; i < 95; i++) {
    const sx = W * (0.26 + rnd() * 0.48);
    const sy = H * (0.08 + rnd() * 0.78);
    const ang = (rnd() - 0.5) * 2.2;
    const len = 6 + rnd() * 18;
    c.strokeStyle = rnd() < 0.5 ? 'rgba(156,148,125,0.18)' : 'rgba(40,37,29,0.17)';
    c.lineWidth = 0.9 + rnd() * 1.3;
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    c.stroke();
  }

  // Tailored heavy leather/vinyl welt seams along left & right flanks (u = 0.25 and u = 0.75) + back closure (u = 0 / 1)
  const drawVerticalSeam = (ux, widthPx) => {
    const x = ux * W;
    c.fillStyle = 'rgba(36,34,27,0.58)';
    c.fillRect(x - widthPx * 0.5, 0, widthPx, H);
    c.fillStyle = 'rgba(130,122,100,0.32)';
    c.fillRect(x - 0.8, 0, 1.6, H);
    // Double saddle-stitch rows
    c.strokeStyle = 'rgba(176,166,138,0.48)';
    c.lineWidth = 1.2;
    c.setLineDash([4, 3.5]);
    for (const dx of [-widthPx * 0.95, widthPx * 0.95]) {
      c.beginPath();
      c.moveTo(x + dx, 12);
      c.lineTo(x + dx, H - 12);
      c.stroke();
    }
    c.setLineDash([]);
  };
  drawVerticalSeam(0.25, 3.2);
  drawVerticalSeam(0.75, 3.2);
  drawVerticalSeam(0.008, 4.5);
  drawVerticalSeam(0.992, 4.5);

  // Horizontal double-stitched panel seam at neck collar & lower hem
  const drawHorizontalSeam = (vy) => {
    const y = (1 - vy) * H;
    c.fillStyle = 'rgba(34,32,26,0.52)';
    c.fillRect(0, y - 1.8, W, 3.6);
    c.strokeStyle = 'rgba(174,164,136,0.44)';
    c.lineWidth = 1.1;
    c.setLineDash([4, 3.5]);
    for (const dy of [-3.6, 3.6]) {
      c.beginPath();
      c.moveTo(0, y + dy);
      c.lineTo(W, y + dy);
      c.stroke();
    }
    c.setLineDash([]);
  };
  drawHorizontalSeam(0.695);
  drawHorizontalSeam(0.115);

  // Dark olive-charcoal heavy nylon cinch webbing band at v ~ 0.055 (sampled by both 3D cinch straps + lower belt)
  const beltY = (1 - 0.055) * H;
  c.fillStyle = '#2b2f28';
  c.fillRect(0, beltY - 15, W, 30);
  c.fillStyle = 'rgba(18,20,17,0.45)';
  for (let r = -12; r <= 12; r += 3) c.fillRect(0, beltY + r, W, 1.2);
  c.strokeStyle = 'rgba(120,118,102,0.38)';
  c.lineWidth = 1.1;
  c.setLineDash([5, 3]);
  c.beginPath();
  c.moveTo(0, beltY - 11);
  c.lineTo(W, beltY - 11);
  c.moveTo(0, beltY + 11);
  c.lineTo(W, beltY + 11);
  c.stroke();
  c.setLineDash([]);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// 512x512 2x3 procedural decal atlas for dummy hit marks:
//   cell 0 (col 0, row 0): knife    — sharp narrow slash parting dark vinyl over pale-tan foam slit
//   cell 1 (col 1, row 0): machete  — broad ragged chop gash with torn canvas flap & exposed foam core
//   cell 2 (col 0, row 1): katana   — long razor-clean tapered diagonal-ready slice
//   cell 3 (col 1, row 1): chainsaw — chewed parallel saw-tooth rip track + shredded fibers + friction burn
//   cell 4 (col 0, row 2): scorch   — velvety carbon-black thermal burn & blistered vinyl soot halo
//   cell 5 (col 1, row 2): bullet   — punctured vinyl entry hole, pale foam ring & powder smudge
function buildMarksAtlasTexture(THREE) {
  if (typeof document === 'undefined') return null;
  const W0 = 512, H0 = 512;
  const SCALE = 2;
  const CW = W0 / 2, CH = H0 / 3;
  const cv = document.createElement('canvas');
  cv.width = W0 * SCALE;
  cv.height = H0 * SCALE;
  const c = cv.getContext('2d');
  c.scale(SCALE, SCALE);
  c.clearRect(0, 0, W0, H0);

  let seed = 908308;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const cellOrigin = (cell) => [(cell % 2) * CW, Math.floor(cell / 2) * CH];

  // Helper: authentic parted blade cut — dark parted slit flanked by raw frayed khaki-tan canvas edges
  const drawBladeGash = (cell, halfLen, darkHalfOpen, rimWidth, ragged, scuffAlpha) => {
    const [ox, oy] = cellOrigin(cell);
    const cx = ox + CW * 0.5, cy = oy + CH * 0.5;
    c.save();
    c.beginPath();
    c.rect(ox + 4, oy + 4, CW - 8, CH - 8);
    c.clip();

    // 1) Subtle recessed impact scuff / crease shadow around parted canvas
    c.save();
    c.translate(cx, cy);
    c.scale(halfLen * 1.12, Math.max(20, (darkHalfOpen + rimWidth) * 2.5));
    const halo = c.createRadialGradient(0, 0, 0.10, 0, 0, 1);
    halo.addColorStop(0, `rgba(16,14,10,${scuffAlpha})`);
    halo.addColorStop(0.52, `rgba(26,23,17,${(scuffAlpha * 0.42).toFixed(3)})`);
    halo.addColorStop(1, 'rgba(26,23,17,0)');
    c.fillStyle = halo;
    c.beginPath();
    c.arc(0, 0, 1, 0, Math.PI * 2);
    c.fill();
    c.restore();

    const steps = 56;
    const inU = [], inL = [], outU = [], outL = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * 2 - 1; // -1 .. +1
      const env = Math.pow(Math.max(0, 1 - t * t), ragged > 0.45 ? 0.58 : 0.72);
      const envRim = Math.pow(Math.max(0, 1 - Math.pow(t * 0.97, 2)), 0.65);
      const jagInU = ragged * (rnd() - 0.45) * darkHalfOpen * 0.36;
      const jagInL = ragged * (rnd() - 0.45) * darkHalfOpen * 0.36;
      const jagOutU = (0.28 + ragged * 0.85) * rnd() * rimWidth * 0.68;
      const jagOutL = (0.28 + ragged * 0.85) * rnd() * rimWidth * 0.68;
      const bow = Math.sin(t * Math.PI * 0.5) * (ragged > 0.2 ? 1.8 : 0.8);
      const x = cx + t * halfLen;
      const yInU = cy + bow - env * darkHalfOpen - Math.max(0, jagInU);
      const yInL = cy + bow + env * darkHalfOpen + Math.max(0, jagInL);
      inU.push([x, yInU]);
      inL.push([x, yInL]);
      outU.push([x, yInU - envRim * rimWidth - jagOutU]);
      outL.push([x, yInL + envRim * rimWidth + jagOutL]);
    }

    // 2) Soft dark outer tear shadow so lighter frayed canvas edges read even under bright flashlight/noon
    c.fillStyle = 'rgba(18,16,12,0.68)';
    c.beginPath();
    outU.forEach(([x, y], i) => (i ? c.lineTo(x, y - 1.6) : c.moveTo(x, y - 1.6)));
    for (let i = outL.length - 1; i >= 0; i--) c.lineTo(outL[i][0], outL[i][1] + 1.6);
    c.closePath();
    c.fill();

    // 3) Lighter frayed raw duck-canvas / pale foam border (warm khaki-buff, not chalky white!)
    c.fillStyle = 'rgba(220,208,172,0.95)';
    c.beginPath();
    outU.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let i = outL.length - 1; i >= 0; i--) c.lineTo(outL[i][0], outL[i][1]);
    c.closePath();
    c.fill();

    // Subtle olive-tan fiber mottling across the frayed lip so it looks woven, not flat plastic
    for (let i = 0; i < 34; i++) {
      const idx = 3 + Math.floor(rnd() * (steps - 6));
      const upperSide = i % 2 === 0;
      const [bx, by] = upperSide ? outU[idx] : outL[idx];
      c.fillStyle = rnd() < 0.5 ? 'rgba(148,138,108,0.45)' : 'rgba(226,215,182,0.55)';
      c.beginPath();
      c.arc(bx + (rnd() - 0.5) * 4, by + (upperSide ? 2 : -2), 1.4 + rnd() * 2.0, 0, Math.PI * 2);
      c.fill();
    }

    // Fine frayed canvas threads along both parted edges
    const threadCount = Math.round(28 + ragged * 38);
    for (let i = 0; i < threadCount; i++) {
      const t = rnd() * 1.84 - 0.92;
      const env = Math.max(0, 1 - t * t);
      if (env < 0.06) continue;
      const idx = clamp(Math.round(((t + 1) * 0.5) * steps), 0, steps);
      const upperSide = i % 2 === 0;
      const [bx, by] = upperSide ? outU[idx] : outL[idx];
      const ang = (upperSide ? -Math.PI * 0.5 : Math.PI * 0.5) + (rnd() - 0.5) * 1.65;
      const tl = (3.2 + rnd() * (5.5 + ragged * 6.5)) * (0.45 + 0.55 * env);
      c.strokeStyle = rnd() < 0.78 ? 'rgba(222,210,176,0.86)' : 'rgba(164,152,122,0.78)';
      c.lineWidth = 1.0 + rnd() * 0.9;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(bx, by + (upperSide ? 1.0 : -1.0));
      c.lineTo(bx + Math.cos(ang) * tl, by + Math.sin(ang) * tl);
      c.stroke();
    }

    // 4) Deep dark parted slit cavity down the center of the cut
    c.fillStyle = '#080705';
    c.beginPath();
    inU.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let i = inL.length - 1; i >= 0; i--) c.lineTo(inL[i][0], inL[i][1]);
    c.closePath();
    c.fill();

    // Subtle deep-shadow foam texture inside wide machete chop (no bright bars)
    if (ragged > 0.45) {
      for (let i = 0; i < 18; i++) {
        const idx = 8 + Math.floor(rnd() * (steps - 16));
        const mx = (inU[idx][0] + inL[idx][0]) * 0.5 + (rnd() - 0.5) * 4;
        const my = (inU[idx][1] + inL[idx][1]) * 0.5 + (rnd() - 0.5) * 3;
        c.fillStyle = 'rgba(48,42,31,0.48)';
        c.beginPath();
        c.arc(mx, my, 1.5 + rnd() * 2.2, 0, Math.PI * 2);
        c.fill();
      }
    }

    c.restore();
  };

  // Cell 0: Knife — crisp dark parted slash with lighter frayed canvas edges
  drawBladeGash(0, 98, 6.2, 5.6, 0.26, 0.38);

  // Cell 1: Machete — broader heavy ragged chop gash with torn raw-canvas lips
  drawBladeGash(1, 110, 10.5, 6.8, 0.72, 0.50);

  // Cell 2: Katana — long razor-clean tapered dark parted slice with crisp lighter frayed edges
  drawBladeGash(2, 121, 6.6, 5.3, 0.10, 0.34);

  // Cell 3: Chainsaw — ragged torn strip (chewed dark trench + jagged raw-canvas/foam flaps + shredded fibers)
  {
    const [ox, oy] = cellOrigin(3);
    const cx = ox + CW * 0.5, cy = oy + CH * 0.5;
    c.save();
    c.beginPath();
    c.rect(ox + 4, oy + 4, CW - 8, CH - 8);
    c.clip();

    // Chain-oil & friction bruise halo around chewed strip
    c.save();
    c.translate(cx, cy);
    c.scale(118, 48);
    const burn = c.createRadialGradient(0, 0, 0.15, 0, 0, 1);
    burn.addColorStop(0, 'rgba(14,12,9,0.78)');
    burn.addColorStop(0.58, 'rgba(24,20,15,0.44)');
    burn.addColorStop(1, 'rgba(24,20,15,0)');
    c.fillStyle = burn;
    c.beginPath();
    c.arc(0, 0, 1, 0, Math.PI * 2);
    c.fill();
    c.restore();

    const steps = 48;
    const halfLen = 110;
    const inU = [], inL = [], outU = [], outL = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * 2 - 1;
      const env = Math.pow(Math.max(0, 1 - Math.pow(t, 4)), 0.55); // blunt-ended ragged torn strip
      const toothU = (i % 2 === 0 ? 1 : -0.25) * (4.0 + rnd() * 6.5);
      const toothL = (i % 2 === 1 ? 1 : -0.25) * (4.0 + rnd() * 6.5);
      const x = cx + t * halfLen;
      const yInU = cy - env * (12.5 + rnd() * 5.5);
      const yInL = cy + env * (12.5 + rnd() * 5.5);
      inU.push([x, yInU]);
      inL.push([x, yInL]);
      outU.push([x + (rnd() - 0.5) * 3, yInU - env * (7.5 + Math.max(0, toothU))]);
      outL.push([x + (rnd() - 0.5) * 3, yInL + env * (7.5 + Math.max(0, toothL))]);
    }

    // Outer dark tear crease around ragged flaps
    c.fillStyle = 'rgba(16,14,10,0.72)';
    c.beginPath();
    outU.forEach(([x, y], i) => (i ? c.lineTo(x, y - 1.8) : c.moveTo(x, y - 1.8)));
    for (let i = outL.length - 1; i >= 0; i--) c.lineTo(outL[i][0], outL[i][1] + 1.8);
    c.closePath();
    c.fill();

    // Jagged lighter frayed canvas & torn foam strip border
    c.fillStyle = 'rgba(218,205,168,0.95)';
    c.beginPath();
    outU.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let i = outL.length - 1; i >= 0; i--) c.lineTo(outL[i][0], outL[i][1]);
    c.closePath();
    c.fill();

    // Deep chewed dark chain trench interior
    c.fillStyle = '#080705';
    c.beginPath();
    inU.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let i = inL.length - 1; i >= 0; i--) c.lineTo(inL[i][0], inL[i][1]);
    c.closePath();
    c.fill();

    // Irregular shredded khaki-foam tufts chewed up inside the dark trench
    for (let i = -9; i <= 9; i++) {
      const tx = cx + i * 10.2 + (rnd() - 0.5) * 4;
      const env = Math.max(0, 1 - Math.pow(i / 10.2, 4));
      c.save();
      c.translate(tx, cy + (rnd() - 0.5) * 10 * env);
      c.rotate(0.42 + (rnd() - 0.5) * 0.65);
      c.fillStyle = rnd() < 0.6 ? 'rgba(156,144,112,0.68)' : 'rgba(72,64,48,0.72)';
      c.fillRect(-2.2, -5.5 * env, 4.4, 8.5 * env);
      c.restore();
    }

    // Shredded raw-canvas threads flung along both chewed borders
    for (let i = 0; i < 68; i++) {
      const idx = 2 + Math.floor(rnd() * (steps - 4));
      const upperSide = i % 2 === 0;
      const [bx, by] = upperSide ? outU[idx] : outL[idx];
      const ang = (upperSide ? -Math.PI * 0.5 : Math.PI * 0.5) + (rnd() - 0.5) * 1.9;
      const len = 4.0 + rnd() * 10.5;
      c.strokeStyle = rnd() < 0.78 ? 'rgba(220,208,174,0.88)' : 'rgba(24,20,15,0.80)';
      c.lineWidth = 1.1 + rnd() * 1.1;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(bx, by);
      c.lineTo(bx + Math.cos(ang) * len, by + Math.sin(ang) * len);
      c.stroke();
    }
    c.restore();
  }

  // Cell 4: Scorch — velvety carbon-black burn & blistered vinyl char cloud
  {
    const [ox, oy] = cellOrigin(4);
    const cx = ox + CW * 0.5, cy = oy + CH * 0.5;
    c.save();
    c.beginPath();
    c.rect(ox + 6, oy + 6, CW - 12, CH - 12);
    c.clip();

    const puff = (px, py, rx, ry, rot, r, g, b, a0, aMid) => {
      c.save();
      c.translate(px, py);
      c.rotate(rot);
      c.scale(rx, ry);
      const gr = c.createRadialGradient(0, 0, 0.05, 0, 0, 1);
      gr.addColorStop(0, `rgba(${r},${g},${b},${a0})`);
      gr.addColorStop(0.46, `rgba(${r},${g},${b},${aMid})`);
      gr.addColorStop(0.80, `rgba(${r + 12},${g + 9},${b + 6},${(aMid * 0.34).toFixed(3)})`);
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      c.fillStyle = gr;
      c.beginPath();
      c.arc(0, 0, 1, 0, Math.PI * 2);
      c.fill();
      c.restore();
    };

    puff(cx, cy, 94, 70, 0.15, 26, 19, 13, 0.60, 0.30);
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2 + (rnd() - 0.5) * 0.42;
      const dist = 10 + rnd() * 30;
      puff(
        cx + Math.cos(ang) * dist * 1.15,
        cy + Math.sin(ang) * dist * 0.85,
        24 + rnd() * 24,
        18 + rnd() * 20,
        rnd() * 3.14,
        11, 10, 9,
        0.78, 0.38
      );
    }
    puff(cx, cy, 48, 38, 0.4, 7, 7, 7, 0.94, 0.66);
    for (let i = 0; i < 26; i++) {
      const bx = cx + (rnd() - 0.5) * 68;
      const by = cy + (rnd() - 0.5) * 48;
      c.fillStyle = rnd() < 0.4 ? 'rgba(72,60,44,0.45)' : 'rgba(5,5,5,0.78)';
      c.beginPath();
      c.arc(bx, by, 1.2 + rnd() * 2.4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  // Cell 5: Bullet — dark entry puncture surrounded by an authentic lighter torn raw-canvas/foam rim
  {
    const [ox, oy] = cellOrigin(5);
    const cx = ox + CW * 0.5, cy = oy + CH * 0.5;
    c.save();
    c.beginPath();
    c.rect(ox + 4, oy + 4, CW - 8, CH - 8);
    c.clip();

    // 1) Outer dark powder-burn & bullet-wipe smudge halo
    const smudge = c.createRadialGradient(cx, cy, 12, cx, cy, 62);
    smudge.addColorStop(0, 'rgba(12,10,8,0.88)');
    smudge.addColorStop(0.38, 'rgba(24,20,15,0.52)');
    smudge.addColorStop(0.70, 'rgba(34,28,22,0.18)');
    smudge.addColorStop(1, 'rgba(34,28,22,0)');
    c.fillStyle = smudge;
    c.beginPath();
    c.arc(cx, cy, 62, 0, Math.PI * 2);
    c.fill();

    // 2) Ragged lighter torn raw-canvas/foam rim
    const ptsRim = 28;
    const rimRadii = [];
    for (let i = 0; i <= ptsRim; i++) {
      rimRadii.push((i % 2 === 0 ? 31 : 25) + rnd() * 5.5);
    }

    c.fillStyle = 'rgba(16,14,10,0.72)';
    c.beginPath();
    for (let i = 0; i <= ptsRim; i++) {
      const a = (i / ptsRim) * Math.PI * 2;
      const r = rimRadii[i] + 2.0;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();

    c.fillStyle = 'rgba(220,208,172,0.95)';
    c.beginPath();
    for (let i = 0; i <= ptsRim; i++) {
      const a = (i / ptsRim) * Math.PI * 2;
      const r = rimRadii[i];
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();

    // Fine frayed canvas threads around bullet tear rim
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + (rnd() - 0.5) * 0.25;
      const r0 = 24 + rnd() * 5;
      const r1 = r0 + 5 + rnd() * 7;
      c.strokeStyle = rnd() < 0.8 ? 'rgba(222,210,176,0.86)' : 'rgba(164,152,122,0.78)';
      c.lineWidth = 1.1 + rnd() * 0.8;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      c.stroke();
    }

    // 3) Deep pitch-black puncture cavity inside the lighter torn rim
    c.fillStyle = '#060504';
    c.beginPath();
    const ptsHole = 24;
    for (let i = 0; i <= ptsHole; i++) {
      const a = (i / ptsHole) * Math.PI * 2;
      const r = 18.5 + (rnd() - 0.5) * 3.2;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();

    // 4) Radial tear splits cutting across rim
    c.strokeStyle = 'rgba(12,10,8,0.88)';
    c.lineWidth = 1.8;
    for (let i = 0; i < 7; i++) {
      const a = i * (Math.PI * 2 / 7) + (rnd() - 0.5) * 0.28;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16);
      c.lineTo(cx + Math.cos(a) * (29 + rnd() * 7), cy + Math.sin(a) * (29 + rnd() * 7));
      c.stroke();
    }
    c.restore();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

const MARK_PRESETS = {
  // J151 note 19: readable weighted recoil; the existing spring and stops stay fixed.
  knife:    { cell: 0, width: 0.180, height: 0.064, impulse: 3.50, orientToSlash: true },
  machete:  { cell: 1, width: 0.245, height: 0.088, impulse: 5.00, orientToSlash: true },
  katana:   { cell: 2, width: 0.320, height: 0.068, impulse: 5.50, orientToSlash: true },
  chainsaw: { cell: 3, width: 0.275, height: 0.106, impulse: 1.60, orientToSlash: true },
  scorch:   { cell: 4, width: 0.220, height: 0.165, impulse: 0.20, orientToSlash: false },
  bullet:   { cell: 5, width: 0.082, height: 0.082, impulse: 2.50, orientToSlash: false }
};

export function normalizeDummyHitKind(raw) {
  const k = String(raw || 'knife').toLowerCase();
  if (k.includes('katana') || k.includes('sword')) return 'katana';
  if (k.includes('machete') || k.includes('cleave') || k.includes('chop')) return 'machete';
  if (k.includes('saw') || k.includes('chain')) return 'chainsaw';
  if (k.includes('scorch') || k.includes('flame') || k.includes('fire') || k.includes('burn') || k.includes('char')) return 'scorch';
  if (k.includes('bullet') || k.includes('gun') || k.includes('shot') || k.includes('pellet') || k.includes('rifle') || k.includes('pistol') || k.includes('smg')) return 'bullet';
  return 'knife';
}

function classifyZoneByWorldY(worldY) {
  if (worldY >= DUMMY_SPEC.headBottomY) return 'head';
  if (worldY >= 1.475) return 'neck';
  if (worldY >= DUMMY_SPEC.torsoBottomY) return 'torso';
  if (worldY >= DUMMY_SPEC.hingeY) return 'post';
  return 'base';
}

// Projects a point in `pivot`-local space (where y = worldY - HINGE_Y) onto the exact sprung dummy surface
// (torso/neck/head sculpted profile for worldY >= 0.822, or steel mast cylinder for 0.340 <= worldY < 0.822).
// Writes surface position into `outPos` and outward unit normal into `outNormal`.
const _sP0 = { x: 0, y: 0, z: 0 };
const _sPT = { x: 0, y: 0, z: 0 };
const _sPY = { x: 0, y: 0, z: 0 };

function projectOntoPivotSurface(lx, ly, lz, outPos, outNormal) {
  const wy = clamp(ly + DUMMY_SPEC.hingeY, DUMMY_SPEC.hingeY + 0.01, DUMMY_SPEC.height - 0.008);
  if (wy < 0.824) {
    // Telescoping steel mast cylinder
    const r = wy < 0.655 ? 0.050 : (wy < 0.685 ? 0.059 : 0.040);
    let len = Math.hypot(lx, lz);
    const nx = len > 1e-5 ? lx / len : 0;
    const nz = len > 1e-5 ? lz / len : 1;
    outPos.set(nx * r, wy - DUMMY_SPEC.hingeY, nz * r);
    outNormal.set(nx, 0, nz);
    return wy;
  }

  const p = sampleProfileParams(wy, _profTmp);
  const rx0 = Math.max(0.04, p[0]);
  const rz0 = Math.max(0.04, p[1]);
  const cz = p[2];
  const dx = lx, dz = lz - cz;
  const theta = (Math.abs(dx) > 1e-6 || Math.abs(dz) > 1e-6) ? Math.atan2(dx / rx0, dz / rz0) : 0;
  evalDummyBodySurface(wy, theta, _sP0);

  // Account for raised 3D webbing cinch straps around y = 0.875 and y = 1.492 so decals wrap smoothly over straps too
  let strapLift = 0;
  const dLowStrap = Math.abs(wy - 0.875);
  if (dLowStrap < 0.025) strapLift = Math.max(strapLift, 0.0048 * (1 - Math.max(0, dLowStrap - 0.016) / 0.009));
  const dNeckStrap = Math.abs(wy - 1.492);
  if (dNeckStrap < 0.018) strapLift = Math.max(strapLift, 0.0039 * (1 - Math.max(0, dNeckStrap - 0.011) / 0.007));

  // Finite-difference surface tangents for exact smooth outward normal
  const dT = 0.025;
  const dY = wy > 1.775 ? -0.008 : 0.008;
  evalDummyBodySurface(wy, theta + dT, _sPT);
  evalDummyBodySurface(clamp(wy + dY, 0.824, DUMMY_SPEC.height - 0.002), theta, _sPY);

  const tx = (_sPT.x - _sP0.x) / dT;
  const ty = (_sPT.y - _sP0.y) / dT;
  const tz = (_sPT.z - _sP0.z) / dT;

  const ux = (_sPY.x - _sP0.x) / dY;
  const uy = (_sPY.y - _sP0.y) / dY;
  const uz = (_sPY.z - _sP0.z) / dY;

  // Cross(T_theta, T_y): at theta=0 (+Z), T_theta=(+x,0,0), T_y=(0,+1,0) => cross = (0, 0, +1) outward!
  let nx = ty * uz - tz * uy;
  let ny = tz * ux - tx * uz;
  let nz = tx * uy - ty * ux;
  const nLen = Math.hypot(nx, ny, nz) || 1;
  nx /= nLen; ny /= nLen; nz /= nLen;

  outPos.set(_sP0.x + nx * strapLift, _sP0.y - DUMMY_SPEC.hingeY + ny * strapLift, _sP0.z + nz * strapLift);
  outNormal.set(nx, ny, nz);
  return wy;
}

// Projects a point in `baseGroup`-local space (y in [0.008, 0.34]) onto the weighted rubber base or spring column.
function projectOntoBaseSurface(lx, ly, lz, outPos, outNormal) {
  const wy = clamp(ly, 0.012, 0.335);
  let r = 0.302, ny = 0;
  if (wy < 0.112) {
    r = 0.305;
  } else if (wy < 0.148) {
    const t = (wy - 0.112) / 0.036;
    r = 0.295 * (1 - t) + 0.165 * t;
    ny = 0.62;
  } else {
    r = 0.070;
  }
  const len = Math.hypot(lx, lz);
  const nx = len > 1e-5 ? lx / len : 0;
  const nz = len > 1e-5 ? lz / len : 1;
  const nLen = Math.hypot(nx, ny, nz) || 1;
  outPos.set(nx * r, wy, nz * r);
  outNormal.set(nx / nLen, ny / nLen, nz / nLen);
  return wy;
}

// Signed approximate radial distance (< 0 means inside dummy volume) in pivot-local space
function signedDistancePivot(lx, ly, lz, pad = 0) {
  const wy = ly + DUMMY_SPEC.hingeY;
  if (wy < DUMMY_SPEC.hingeY - pad || wy > DUMMY_SPEC.height + pad) return 1;
  const cy = clamp(wy, DUMMY_SPEC.hingeY, DUMMY_SPEC.height - 0.002);
  if (cy < 0.824) {
    const r = (cy < 0.655 ? 0.052 : 0.044) + pad;
    return Math.hypot(lx, lz) - r;
  }
  const p = sampleProfileParams(cy, _profTmp);
  const rx0 = Math.max(0.04, p[0]);
  const rz0 = Math.max(0.04, p[1]);
  const dz = lz - p[2];
  const theta = (Math.abs(lx) > 1e-6 || Math.abs(dz) > 1e-6) ? Math.atan2(lx / rx0, dz / rz0) : 0;
  evalDummyBodySurface(cy, theta, _sP0);
  const surfR = Math.hypot(_sP0.x, _sP0.z - p[2]) + pad;
  const ptR = Math.hypot(lx, dz);
  const yExcess = wy > DUMMY_SPEC.height ? wy - DUMMY_SPEC.height : (wy < DUMMY_SPEC.hingeY ? DUMMY_SPEC.hingeY - wy : 0);
  if (yExcess > 0) return Math.hypot(Math.max(0, ptR - surfR), yExcess) - pad;
  return ptR - surfR;
}

function signedDistanceBase(lx, ly, lz, pad = 0) {
  if (ly < -pad || ly > DUMMY_SPEC.hingeY + pad) return 1;
  const wy = clamp(ly, 0, DUMMY_SPEC.hingeY);
  const r = (wy < 0.146 ? 0.312 : 0.078) + pad;
  return Math.hypot(lx, lz) - r;
}

export function buildTrainingDummy(THREE, opts = {}) {
  const HINGE_Y = DUMMY_SPEC.hingeY;
  const capacity = Math.max(16, opts.capacity || 128);
  const baseCapacity = Math.max(8, opts.baseCapacity || 24);
  const markLife = opts.markLife != null ? opts.markLife : Infinity;

  const disposables = [];
  const keepGeo = (g) => { disposables.push(g); return g; };
  const keepMat = (m) => { disposables.push(m); return m; };
  const keepTex = (t) => { if (t) disposables.push(t); return t; };

  const vinylTex = keepTex(buildVinylCanvasTexture(THREE));
  const marksTex = keepTex(buildMarksAtlasTexture(THREE));

  const vinylMat = keepMat(new THREE.MeshStandardMaterial({
    name: 'training-dummy-vinyl',
    color: vinylTex ? 0xffffff : 0x756e5a,
    map: vinylTex || null,
    roughness: 0.78,
    metalness: 0.02
  }));

  const rubberMat = keepMat(new THREE.MeshStandardMaterial({
    name: 'training-dummy-rubber',
    color: 0x202523,
    roughness: 0.90,
    metalness: 0.04
  }));

  const steelMat = keepMat(new THREE.MeshStandardMaterial({
    name: 'training-dummy-steel',
    color: 0x565f5b,
    roughness: 0.42,
    metalness: 0.82
  }));

  // Decal material: lit MeshStandardMaterial so exposed tan foam & dark scorch respond naturally
  // across noon, overcast, dusk, and night (+ flashlight), sorted strictly BEFORE all transparent effects!
  const marksMat = keepMat(new THREE.MeshStandardMaterial({
    name: 'training-dummy-marks-mat',
    map: marksTex || null,
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.0,
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    polygonOffset: true,
    polygonOffsetFactor: -5.0,
    polygonOffsetUnits: -5.0
  }));

  const group = new THREE.Group();
  group.name = 'training-melee-dummy';

  const baseGroup = new THREE.Group();
  baseGroup.name = 'training-dummy-base';
  group.add(baseGroup);

  const pivot = new THREE.Group();
  pivot.name = 'training-dummy-pivot';
  pivot.position.set(0, HINGE_Y, 0);
  group.add(pivot);

  const addPart = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx || ry || rz) m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // --- 1. Weighted Sand/Rubber Free-Standing Base (seated flush at y = 0.000 m, 0.0 mm gap) ---
  const tempGeos = [];
  const tGeo = (g) => { tempGeos.push(g); return g; };

  // Bottom chamfered skirt (bottom face at exact y = 0.0000 m)
  addPart(baseGroup, tGeo(new THREE.CylinderGeometry(0.308, 0.320, 0.024, 24)), rubberMat, 0, 0.012, 0);
  // Main weighted sand drum
  addPart(baseGroup, tGeo(new THREE.CylinderGeometry(0.298, 0.308, 0.090, 24)), rubberMat, 0, 0.069, 0);
  // Beveled top deck cone
  addPart(baseGroup, tGeo(new THREE.CylinderGeometry(0.185, 0.298, 0.034, 24)), rubberMat, 0, 0.131, 0);
  // 8 roto-molded radial grip buttresses around base tank
  const ribGeo = tGeo(new THREE.BoxGeometry(0.036, 0.096, 0.092));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    addPart(baseGroup, ribGeo, rubberMat, Math.sin(a) * 0.262, 0.064, Math.cos(a) * 0.262, -0.14, a, 0);
  }
  // Sand/water fill bung cap on rear deck (-Z side, out of front footwork)
  addPart(baseGroup, tGeo(new THREE.CylinderGeometry(0.030, 0.033, 0.022, 12)), rubberMat, 0.115, 0.142, -0.185);
  addPart(baseGroup, tGeo(new THREE.BoxGeometry(0.046, 0.010, 0.014)), rubberMat, 0.115, 0.156, -0.185, 0, 0.5, 0);

  // Steel anchor flange & 6 hex bolts
  addPart(baseGroup, tGeo(new THREE.CylinderGeometry(0.148, 0.158, 0.018, 20)), steelMat, 0, 0.153, 0);
  const boltGeo = tGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 6));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    addPart(baseGroup, boltGeo, steelMat, Math.sin(a) * 0.122, 0.166, Math.cos(a) * 0.122);
  }
  // Lower steel spring cup + central internal steel damper rod + heavy coil spring
  addPart(baseGroup, tGeo(new THREE.CylinderGeometry(0.076, 0.086, 0.036, 18)), steelMat, 0, 0.176, 0);
  addPart(baseGroup, tGeo(new THREE.CylinderGeometry(0.031, 0.031, 0.185, 14)), steelMat, 0, 0.265, 0);
  addPart(baseGroup, tGeo(new THREE.TorusGeometry(0.068, 0.013, 7, 16)), rubberMat, 0, 0.194, 0, Math.PI / 2, 0, 0);
  addPart(baseGroup, tGeo(new THREE.TorusGeometry(0.066, 0.012, 7, 16)), rubberMat, 0, 0.340, 0, Math.PI / 2, 0, 0);

  const coilGeo = tGeo(new THREE.TorusGeometry(0.057, 0.0135, 7, 16));
  for (let i = 0; i < 5; i++) {
    const cy = 0.212 + i * 0.0285;
    addPart(baseGroup, coilGeo, steelMat, 0, cy, 0, Math.PI / 2 + 0.09, i * 0.7, 0);
  }

  bakeStatic(THREE, baseGroup);

  // --- 2. Sprung Upper Mast, Padded Human-Scale Torso & Sculpted Striking Head (inside `pivot` at y = HINGE_Y) ---
  const PY = (worldY) => worldY - HINGE_Y;

  // Pivot ball joint + upper steel spring cup (rubber boots live in `baseGroup` so `pivot` bakes to 2 draws: vinyl + steel)
  addPart(pivot, tGeo(new THREE.SphereGeometry(0.048, 14, 10)), steelMat, 0, PY(0.340), 0);
  addPart(pivot, tGeo(new THREE.CylinderGeometry(0.072, 0.078, 0.038, 18)), steelMat, 0, PY(0.368), 0);

  // Outer mast tube + height clamp collar + rear detent T-pin & pull ring + inner telescoping post
  addPart(pivot, tGeo(new THREE.CylinderGeometry(0.048, 0.051, 0.275, 18)), steelMat, 0, PY(0.522), 0);
  addPart(pivot, tGeo(new THREE.CylinderGeometry(0.059, 0.059, 0.046, 18)), steelMat, 0, PY(0.662), 0);
  addPart(pivot, tGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.048, 8)), steelMat, 0, PY(0.662), -0.068, Math.PI / 2, 0, 0);
  addPart(pivot, tGeo(new THREE.TorusGeometry(0.016, 0.0038, 6, 14)), steelMat, 0, PY(0.662), -0.094);
  addPart(pivot, tGeo(new THREE.CylinderGeometry(0.039, 0.039, 0.195, 16)), steelMat, 0, PY(0.772), 0);

  // Sculpted padded torso + neck + head + two 3D cinch-strap bands (all sharing `vinylMat` -> 1 baked mesh!)
  addPart(pivot, tGeo(buildSculptedTorsoGeometry(THREE, HINGE_Y)), vinylMat, 0, 0, 0);
  addPart(pivot, tGeo(buildStrapBandGeometry(THREE, HINGE_Y, 0.875, 0.046, 0.0045)), vinylMat, 0, 0, 0);
  addPart(pivot, tGeo(buildStrapBandGeometry(THREE, HINGE_Y, 1.492, 0.032, 0.0036)), vinylMat, 0, 0, 0);

  // Rear steel cinch buckles on the back (-Z) of both straps
  addPart(pivot, tGeo(new THREE.BoxGeometry(0.044, 0.052, 0.012)), steelMat, 0, PY(0.875), -0.125);
  addPart(pivot, tGeo(new THREE.BoxGeometry(0.034, 0.038, 0.010)), steelMat, 0, PY(1.492), -0.082);

  bakeStatic(THREE, pivot);

  // Dispose temporary unbaked part geometries; keep the baked output geometries for clean `dispose()`
  for (const g of tempGeos) g.dispose();
  baseGroup.traverse((o) => { if (o.isMesh && o.geometry) keepGeo(o.geometry); });
  pivot.traverse((o) => { if (o.isMesh && o.geometry) keepGeo(o.geometry); });

  // --- 3. Dynamic Curved Decal Batches (3x3 surface-wrapped grid = 8 tris / 24 verts per mark) ---
  // Each mark is subdivided into a 2x2 quad patch (9 grid points -> 24 vertices) projected directly onto
  // the dummy's curved local surface + 1.7 mm normal lift so long slashes wrap tightly around chest/ribs/head!
  const GRID_U = 8, GRID_V = 4;
  const GRID_COLS = GRID_U + 1, GRID_ROWS = GRID_V + 1;
  const GRID_PTS = GRID_COLS * GRID_ROWS;
  const GRID_PAIRS = [];
  for (let gy = 0; gy < GRID_V; gy++) {
    for (let gx = 0; gx < GRID_U; gx++) {
      GRID_PAIRS.push([gx, gy, gx + 1, gy, gx, gy + 1], [gx + 1, gy, gx + 1, gy + 1, gx, gy + 1]);
    }
  }
  const VERTS_PER_MARK = GRID_PAIRS.length * 3;

  const makeMarkBatch = (parent, cap, name) => {
    const geo = keepGeo(new THREE.BufferGeometry());
    const positions = new THREE.Float32BufferAttribute(new Float32Array(cap * VERTS_PER_MARK * 3), 3);
    const normals = new THREE.Float32BufferAttribute(new Float32Array(cap * VERTS_PER_MARK * 3), 3);
    const uvs = new THREE.Float32BufferAttribute(new Float32Array(cap * VERTS_PER_MARK * 2), 2);
    const colArr = new Float32Array(cap * VERTS_PER_MARK * 4);
    colArr.fill(1);
    const colors = new THREE.Float32BufferAttribute(colArr, 4);

    positions.setUsage(THREE.DynamicDrawUsage);
    normals.setUsage(THREE.DynamicDrawUsage);
    uvs.setUsage(THREE.DynamicDrawUsage);
    colors.setUsage(THREE.DynamicDrawUsage);

    // Pre-fill normals to +Z so warmup never hits zero-length normals
    for (let i = 0; i < cap * VERTS_PER_MARK; i++) normals.setXYZ(i, 0, 0, 1);

    geo.setAttribute('position', positions);
    geo.setAttribute('normal', normals);
    geo.setAttribute('uv', uvs);
    geo.setAttribute('color', colors);
    geo.setDrawRange(0, 0);

    const mesh = new THREE.Mesh(geo, marksMat);
    mesh.name = name;
    // renderOrder = -0.5 + transparent: true + depthWrite: false guarantees:
    //  1) Drawn strictly AFTER all opaque geometry (including the dummy itself)
    //  2) Drawn strictly BEFORE all transparent effects (renderOrder >= 0: sparks, slash ribbons, smoke=2, fire=3, embers=4)
    mesh.renderOrder = -0.5;
    mesh.visible = false;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.raycast = () => {};
    parent.add(mesh);

    return {
      mesh,
      parent,
      capacity: cap,
      next: 0,
      count: 0,
      positions,
      normals,
      uvs,
      colors,
      life: new Float32Array(cap)
    };
  };

  const pivotMarks = makeMarkBatch(pivot, capacity, 'training-dummy-marks');
  const baseMarks = makeMarkBatch(baseGroup, baseCapacity, 'training-dummy-base-marks');

  // --- 4. Placement, Solid Bounds & Collision ---
  const solid = {
    minX: -DUMMY_SPEC.baseRadius,
    maxX: DUMMY_SPEC.baseRadius,
    minY: 0,
    maxY: DUMMY_SPEC.height,
    minZ: -DUMMY_SPEC.baseRadius,
    maxZ: DUMMY_SPEC.baseRadius,
    cx: 0,
    cz: 0,
    radius: DUMMY_SPEC.baseRadius,
    prop: true,
    dummy: true
  };

  const _worldOrigin = new THREE.Vector3();
  function syncTransform() {
    group.updateMatrixWorld(true);
    _worldOrigin.setFromMatrixPosition(group.matrixWorld);
    const r = DUMMY_SPEC.baseRadius;
    solid.cx = _worldOrigin.x;
    solid.cz = _worldOrigin.z;
    solid.minX = _worldOrigin.x - r;
    solid.maxX = _worldOrigin.x + r;
    solid.minY = _worldOrigin.y;
    solid.maxY = _worldOrigin.y + DUMMY_SPEC.height;
    solid.minZ = _worldOrigin.z - r;
    solid.maxZ = _worldOrigin.z + r;
    return solid;
  }

  function setPose(x = 0, y = 0, z = 0, yaw = 0) {
    group.position.set(x, y, z);
    group.rotation.set(0, yaw, 0);
    return syncTransform();
  }

  setPose(opts.x || 0, opts.y || 0, opts.z || 0, opts.yaw || 0);
  if (opts.parent) {
    opts.parent.add(group);
    syncTransform();
  }

  // Smooth horizontal cylinder push-out so the player / marine walks solidly against the dummy
  function pushOut(pos, actorRadius = 0.36) {
    syncTransform();
    if (pos.y != null && (pos.y > solid.maxY + 0.1 || pos.y + 1.8 < solid.minY)) return false;
    const minDist = DUMMY_SPEC.baseRadius + actorRadius;
    const dx = pos.x - solid.cx;
    const dz = pos.z - solid.cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= minDist * minDist) return false;
    const d = Math.sqrt(d2);
    if (d > 1e-5) {
      const k = (minDist - d) / d;
      pos.x += dx * k;
      pos.z += dz * k;
    } else {
      pos.z += minDist;
    }
    return true;
  }

  // --- 5. Damped 2-Axis + Axial-Twist Spring Wobble State ---
  const OMEGA = 13.6;        // ~2.16 Hz heavy weighted torso natural frequency
  const ZETA = 0.21;         // ~3-4 crisp damped rebounds settling in ~1.3 s
  const MAX_TILT = 0.36;     // ~20.6 deg elastomer bump-stop limit
  const OMEGA_TWIST = 19.0;  // stiffer spine torsion
  const ZETA_TWIST = 0.30;
  const MAX_TWIST = 0.20;

  let tiltX = 0, tiltZ = 0, twistY = 0;
  let velX = 0, velZ = 0, velTwist = 0;
  let clockSec = 0;
  let lastSawTime = -10;
  const lastSawLocal = new THREE.Vector3(999, 999, 999);

  const stats = {
    hits: 0,
    damage: 0,
    byKind: { knife: 0, machete: 0, katana: 0, chainsaw: 0, scorch: 0, bullet: 0 }
  };

  function applyPivotRotation() {
    pivot.rotation.order = 'YXZ';
    pivot.rotation.set(tiltX, twistY, tiltZ);
    pivot.updateMatrix();
    if (group.parent) pivot.updateMatrixWorld(true);
  }

  // Scratch vectors (zero GC allocations on hit/raycast/update)
  const _invPivot = new THREE.Matrix4();
  const _invBase = new THREE.Matrix4();
  const _nMat = new THREE.Matrix3();
  const _pA = new THREE.Vector3();
  const _pB = new THREE.Vector3();
  const _pSample = new THREE.Vector3();
  const _surfPos = new THREE.Vector3();
  const _surfNrm = new THREE.Vector3();
  const _tanU = new THREE.Vector3();
  const _tanV = new THREE.Vector3();
  const _gridP = Array.from({ length: GRID_PTS }, () => new THREE.Vector3());
  const _gridN = Array.from({ length: GRID_PTS }, () => new THREE.Vector3());
  const _localHit = new THREE.Vector3();
  const _localDir = new THREE.Vector3();
  const _localSlash = new THREE.Vector3();
  const _worldPt = new THREE.Vector3();
  const _worldNrm = new THREE.Vector3();
  const _parentQ = new THREE.Quaternion();

  // Exact segment intersection [a -> b] against both the sprung `pivot` and static `baseGroup`
  function traceSegment(a, b, pad = 0) {
    group.updateMatrixWorld(true);

    // Quick broadphase cylinder check around world origin (expanded for max tilt sway ~0.62 m)
    _worldOrigin.setFromMatrixPosition(group.matrixWorld);
    const broadR = 0.68 + pad;
    const minY = _worldOrigin.y - pad, maxY = _worldOrigin.y + DUMMY_SPEC.height + 0.05 + pad;
    if ((a.y < minY && b.y < minY) || (a.y > maxY && b.y > maxY)) return null;
    const abx = b.x - a.x, abz = b.z - a.z;
    const lenXZ2 = abx * abx + abz * abz;
    const tClosest = lenXZ2 > 1e-8 ? clamp((( _worldOrigin.x - a.x) * abx + (_worldOrigin.z - a.z) * abz) / lenXZ2, 0, 1) : 0;
    const cx = a.x + abx * tClosest - _worldOrigin.x;
    const cz = a.z + abz * tClosest - _worldOrigin.z;
    if (cx * cx + cz * cz > broadR * broadR) return null;

    let bestT = 2;
    let bestOnBase = false;

    // 1) Test sprung upper assembly (`pivot`)
    _invPivot.copy(pivot.matrixWorld).invert();
    _pA.set(a.x, a.y, a.z).applyMatrix4(_invPivot);
    _pB.set(b.x, b.y, b.z).applyMatrix4(_invPivot);
    const segLen = _pA.distanceTo(_pB);
    const steps = clamp(Math.ceil(segLen / 0.035), 8, 64);

    let prevT = 0;
    let prevD = signedDistancePivot(_pA.x, _pA.y, _pA.z, pad);
    if (prevD <= 0) {
      bestT = 0;
      bestOnBase = false;
    } else {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        _pSample.lerpVectors(_pA, _pB, t);
        const d = signedDistancePivot(_pSample.x, _pSample.y, _pSample.z, pad);
        if (d <= 0) {
          // Bisection refinement (6 iterations -> sub-millimeter contact point)
          let lo = prevT, hi = t;
          for (let k = 0; k < 6; k++) {
            const mid = (lo + hi) * 0.5;
            _pSample.lerpVectors(_pA, _pB, mid);
            if (signedDistancePivot(_pSample.x, _pSample.y, _pSample.z, pad) <= 0) hi = mid;
            else lo = mid;
          }
          bestT = hi;
          bestOnBase = false;
          break;
        }
        prevT = t;
        prevD = d;
      }
    }

    // 2) Test static weighted rubber base (`baseGroup`)
    _invBase.copy(baseGroup.matrixWorld).invert();
    const bA = _localHit.set(a.x, a.y, a.z).applyMatrix4(_invBase);
    const ax = bA.x, ay = bA.y, az = bA.z;
    const bB = _localDir.set(b.x, b.y, b.z).applyMatrix4(_invBase);
    const bx = bB.x, by = bB.y, bz = bB.z;
    if (!(ay > DUMMY_SPEC.hingeY + pad && by > DUMMY_SPEC.hingeY + pad)) {
      const bSteps = clamp(Math.ceil(Math.hypot(bx - ax, by - ay, bz - az) / 0.04), 6, 32);
      let pT = 0;
      if (signedDistanceBase(ax, ay, az, pad) <= 0 && 0 < bestT) {
        bestT = 0;
        bestOnBase = true;
      } else {
        for (let i = 1; i <= bSteps; i++) {
          const t = i / bSteps;
          if (t >= bestT) break;
          const sx = ax + (bx - ax) * t, sy = ay + (by - ay) * t, sz = az + (bz - az) * t;
          if (signedDistanceBase(sx, sy, sz, pad) <= 0) {
            let lo = pT, hi = t;
            for (let k = 0; k < 5; k++) {
              const mid = (lo + hi) * 0.5;
              if (signedDistanceBase(ax + (bx - ax) * mid, ay + (by - ay) * mid, az + (bz - az) * mid, pad) <= 0) hi = mid;
              else lo = mid;
            }
            if (hi < bestT) {
              bestT = hi;
              bestOnBase = true;
            }
            break;
          }
          pT = t;
        }
      }
    }

    if (bestT > 1) return null;

    if (!bestOnBase) {
      _pSample.lerpVectors(_pA, _pB, bestT);
      const wy = projectOntoPivotSurface(_pSample.x, _pSample.y, _pSample.z, _surfPos, _surfNrm);
      _worldPt.copy(_surfPos).applyMatrix4(pivot.matrixWorld);
      _nMat.getNormalMatrix(pivot.matrixWorld);
      _worldNrm.copy(_surfNrm).applyMatrix3(_nMat).normalize();
      return {
        t: bestT,
        point: { x: _worldPt.x, y: _worldPt.y, z: _worldPt.z },
        normal: { x: _worldNrm.x, y: _worldNrm.y, z: _worldNrm.z },
        localPoint: { x: _surfPos.x, y: _surfPos.y, z: _surfPos.z },
        zone: classifyZoneByWorldY(wy),
        dummy: true,
        solid
      };
    }

    const sx = ax + (bx - ax) * bestT, sy = ay + (by - ay) * bestT, sz = az + (bz - az) * bestT;
    projectOntoBaseSurface(sx, sy, sz, _surfPos, _surfNrm);
    _worldPt.copy(_surfPos).applyMatrix4(baseGroup.matrixWorld);
    _nMat.getNormalMatrix(baseGroup.matrixWorld);
    _worldNrm.copy(_surfNrm).applyMatrix3(_nMat).normalize();
    return {
      t: bestT,
      point: { x: _worldPt.x, y: _worldPt.y, z: _worldPt.z },
      normal: { x: _worldNrm.x, y: _worldNrm.y, z: _worldNrm.z },
      localPoint: { x: _surfPos.x, y: _surfPos.y, z: _surfPos.z },
      zone: 'base',
      dummy: true,
      solid
    };
  }

  // Writes a curved 3x3 surface-conforming decal patch into `batch`
  function writeCurvedMark(batch, onBase, localPt, slashTangentLocal, preset, alpha = 1) {
    const projectFn = onBase ? projectOntoBaseSurface : projectOntoPivotSurface;
    projectFn(localPt.x, localPt.y, localPt.z, _surfPos, _surfNrm);

    // Build orthonormal tangent frame (_tanU along slash direction, _tanV perpendicular across width)
    if (slashTangentLocal && slashTangentLocal.lengthSq() > 1e-6) {
      _tanU.copy(slashTangentLocal).addScaledVector(_surfNrm, -slashTangentLocal.dot(_surfNrm));
      if (_tanU.lengthSq() < 1e-6) _tanU.set(1, 0, 0).addScaledVector(_surfNrm, -_surfNrm.x);
    } else {
      // Random / subtle diagonal default
      const ang = (batch.next * 2.39996) % (Math.PI * 2);
      const refX = Math.abs(_surfNrm.y) > 0.9 ? 1 : 0;
      _tanU.set(refX, 1 - refX, 0).cross(_surfNrm).normalize();
      _tanV.copy(_surfNrm).cross(_tanU).normalize();
      _tanU.multiplyScalar(Math.cos(ang)).addScaledVector(_tanV, Math.sin(ang));
    }
    _tanU.normalize();
    _tanV.copy(_surfNrm).cross(_tanU).normalize();

    const halfW = preset.width * 0.5;
    const halfH = preset.height * 0.5;
    const lift = 0.0038; // 3.8 mm proud of curved vinyl/rubber surface (with 8x4 grid sagitta < 1.8 mm -> zero clipping!)

    // Project all 45 points of the 9x5 patch onto the local surface so slashes hug curved chest/ribs/head seamlessly
    for (let gy = 0; gy < GRID_ROWS; gy++) {
      const fy = (gy / GRID_V) * 2 - 1; // -1 .. +1
      for (let gx = 0; gx < GRID_COLS; gx++) {
        const fx = (gx / GRID_U) * 2 - 1; // -1 .. +1
        const idx = gy * GRID_COLS + gx;
        const qx = _surfPos.x + _tanU.x * (fx * halfW) + _tanV.x * (fy * halfH);
        const qy = _surfPos.y + _tanU.y * (fx * halfW) + _tanV.y * (fy * halfH);
        const qz = _surfPos.z + _tanU.z * (fx * halfW) + _tanV.z * (fy * halfH);
        projectFn(qx, qy, qz, _gridP[idx], _gridN[idx]);
        _gridP[idx].addScaledVector(_gridN[idx], lift);
      }
    }

    const col = preset.cell % 2;
    const row = Math.floor(preset.cell / 2);
    // CanvasTexture has flipY = true by default in Three.js: row 0 (top of canvas) is v in [2/3, 1]!
    const uMin = col * 0.5 + 0.025, uSpan = 0.450;
    const vTop = 1 - row * (1 / 3) - 0.018, vSpan = (1 / 3) - 0.036;

    const slot = batch.next;
    const baseV = slot * VERTS_PER_MARK;
    for (let k = 0; k < GRID_PAIRS.length; k++) {
      const tri = GRID_PAIRS[k];
      for (let v = 0; v < 3; v++) {
        const gx = tri[v * 2], gy = tri[v * 2 + 1];
        const gi = gy * GRID_COLS + gx;
        const vi = baseV + k * 3 + v;
        batch.positions.setXYZ(vi, _gridP[gi].x, _gridP[gi].y, _gridP[gi].z);
        batch.normals.setXYZ(vi, _gridN[gi].x, _gridN[gi].y, _gridN[gi].z);
        const u = uMin + (gx / GRID_U) * uSpan;
        const uvV = vTop - (gy / GRID_V) * vSpan;
        batch.uvs.setXY(vi, u, uvV);
        batch.colors.setXYZW(vi, 1, 1, 1, alpha);
      }
    }

    batch.life[slot] = markLife;
    batch.next = (slot + 1) % batch.capacity;
    batch.count = Math.min(batch.capacity, batch.count + 1);
    batch.positions.needsUpdate = true;
    batch.normals.needsUpdate = true;
    batch.uvs.needsUpdate = true;
    batch.colors.needsUpdate = true;
    batch.mesh.geometry.setDrawRange(0, batch.count * VERTS_PER_MARK);
    batch.mesh.visible = true;
  }

  // Places a decal mark without applying wobble impulse
  function addMark(hit = {}) {
    group.updateMatrixWorld(true);
    const kind = normalizeDummyHitKind(hit.kind);
    const preset = MARK_PRESETS[kind] || MARK_PRESETS.knife;

    const worldY = hit.point ? hit.point.y : (_worldOrigin.y + DUMMY_SPEC.torsoCenterY);
    const relY = worldY - _worldOrigin.y;
    const onBase = relY < DUMMY_SPEC.hingeY - 0.01;
    const targetObj = onBase ? baseGroup : pivot;
    const batch = onBase ? baseMarks : pivotMarks;

    _invPivot.copy(targetObj.matrixWorld).invert();
    if (hit.point) {
      _localHit.set(hit.point.x, hit.point.y, hit.point.z).applyMatrix4(_invPivot);
    } else {
      _localHit.set(0, DUMMY_SPEC.torsoCenterY - (onBase ? 0 : HINGE_Y), 0.15);
    }

    // Throttle overlapping rapid chainsaw marks at the exact same spot within 55 ms unless forced
    if (kind === 'chainsaw' && !hit.forceMark && !onBase) {
      if (clockSec - lastSawTime < 0.055 && _localHit.distanceToSquared(lastSawLocal) < 0.022 * 0.022) {
        return false;
      }
      lastSawTime = clockSec;
      lastSawLocal.copy(_localHit);
    }

    let slashLocal = null;
    if (hit.slashDir && (hit.slashDir.x || hit.slashDir.y || hit.slashDir.z)) {
      targetObj.getWorldQuaternion(_parentQ);
      _localSlash.set(hit.slashDir.x || 0, hit.slashDir.y || 0, hit.slashDir.z || 0).applyQuaternion(_parentQ.invert());
      const projFn = onBase ? projectOntoBaseSurface : projectOntoPivotSurface;
      projFn(_localHit.x, _localHit.y, _localHit.z, _surfPos, _surfNrm);
      const tangSq = _localSlash.clone().addScaledVector(_surfNrm, -_localSlash.dot(_surfNrm)).lengthSq();
      if (tangSq > 0.04) slashLocal = _localSlash;
    }
    if (!slashLocal && preset.orientToSlash) {
      // When struck by gameplay ray/melee without an explicit blade-plane `slashDir`, orient along a natural diagonal slash
      const projFn = onBase ? projectOntoBaseSurface : projectOntoPivotSurface;
      projFn(_localHit.x, _localHit.y, _localHit.z, _surfPos, _surfNrm);
      const baseRoll = kind === 'katana' ? -0.58 : (kind === 'machete' ? -0.44 : (kind === 'chainsaw' ? 0.22 : -0.34));
      const vary = (((stats.hits | 0) % 5) - 2) * 0.06;
      const roll = hit.roll != null ? hit.roll : (baseRoll + vary);
      _tanU.set(1, 0, 0).addScaledVector(_surfNrm, -_surfNrm.x);
      if (_tanU.lengthSq() < 1e-5) _tanU.set(0, 0, 1).addScaledVector(_surfNrm, -_surfNrm.z);
      _tanU.normalize();
      _tanV.copy(_surfNrm).cross(_tanU).normalize();
      _localSlash.copy(_tanU).multiplyScalar(Math.cos(roll)).addScaledVector(_tanV, Math.sin(roll));
      slashLocal = _localSlash;
    }

    writeCurvedMark(batch, onBase, _localHit, slashLocal, preset, hit.alpha != null ? hit.alpha : 1);
    return true;
  }

  // Strikes the dummy: adds mark, triggers weighted 2-axis + twist wobble, and updates hit/damage stats
  function strike(hit = {}) {
    group.updateMatrixWorld(true);
    _worldOrigin.setFromMatrixPosition(group.matrixWorld);

    const kind = normalizeDummyHitKind(hit.kind);
    const preset = MARK_PRESETS[kind] || MARK_PRESETS.knife;

    // Resolve impact world point & surface zone
    let px = _worldOrigin.x, py = _worldOrigin.y + DUMMY_SPEC.torsoCenterY, pz = _worldOrigin.z;
    if (hit.point) {
      px = hit.point.x; py = hit.point.y; pz = hit.point.z;
    }
    _invPivot.copy(pivot.matrixWorld).invert();
    _localHit.set(px, py, pz).applyMatrix4(_invPivot);

    const relWorldY = py - _worldOrigin.y;
    const onBase = relWorldY < HINGE_Y - 0.01;
    let zone = 'base';
    if (!onBase) {
      const wy = projectOntoPivotSurface(_localHit.x, _localHit.y, _localHit.z, _surfPos, _surfNrm);
      zone = classifyZoneByWorldY(wy);
      _worldPt.copy(_surfPos).applyMatrix4(pivot.matrixWorld);
      _nMat.getNormalMatrix(pivot.matrixWorld);
      _worldNrm.copy(_surfNrm).applyMatrix3(_nMat).normalize();
    } else {
      _invBase.copy(baseGroup.matrixWorld).invert();
      _pSample.set(px, py, pz).applyMatrix4(_invBase);
      projectOntoBaseSurface(_pSample.x, _pSample.y, _pSample.z, _surfPos, _surfNrm);
      _worldPt.copy(_surfPos).applyMatrix4(baseGroup.matrixWorld);
      _nMat.getNormalMatrix(baseGroup.matrixWorld);
      _worldNrm.copy(_surfNrm).applyMatrix3(_nMat).normalize();
    }

    // Apply angular impulse to `pivot` (base hits don't wobble the sand tank, only sprung hits above HINGE_Y)
    if (!onBase) {
      group.getWorldQuaternion(_parentQ);
      _parentQ.invert();
      // Force direction in dummy-root local space
      if (hit.direction && (hit.direction.x || hit.direction.y || hit.direction.z)) {
        _localDir.set(hit.direction.x, hit.direction.y, hit.direction.z).normalize().applyQuaternion(_parentQ);
      } else if (hit.normal && (hit.normal.x || hit.normal.y || hit.normal.z)) {
        _localDir.set(-hit.normal.x, -hit.normal.y, -hit.normal.z).normalize().applyQuaternion(_parentQ);
      } else {
        _localDir.set(-_worldNrm.x, 0, -_worldNrm.z).normalize().applyQuaternion(_parentQ);
      }

      const leverArm = clamp((_surfPos.y) / 1.05, 0.22, 1.38); // ~0.85 at chest, ~1.28 at head
      const mag = (hit.impulse != null ? hit.impulse : preset.impulse) * leverArm;

      // In Three.js right-handed space around pivot (0, HINGE_Y, 0):
      //   +rotation.x tips +Y toward +Z;  -rotation.x tips +Y toward -Z
      //   -rotation.z tips +Y toward +X;  +rotation.z tips +Y toward -X
      velX += _localDir.z * mag;
      velZ += -_localDir.x * mag;

      // Off-center torque around Y spine: r x F_y = z*Fx - x*Fz (in Three.js Y-up: rx*Fz - rz*Fx -> y component = rz*Fx - rx*Fz)
      const torqueY = (_surfPos.z * _localDir.x - _surfPos.x * _localDir.z) * mag * 2.2;
      velTwist += torqueY;

      if (kind === 'chainsaw') {
        // High-frequency chain vibration chatter while sawing
        const jitter = Math.sin(clockSec * 58) * 0.55;
        velX = clamp(velX + jitter * 0.35, -5.5, 5.5);
        velZ = clamp(velZ - jitter * 0.25, -5.5, 5.5);
        velTwist = clamp(velTwist + jitter * 0.6, -4.5, 4.5);
      } else {
        velX = clamp(velX, -11, 11);
        velZ = clamp(velZ, -11, 11);
        velTwist = clamp(velTwist, -8, 8);
      }
    }

    const markAdded = hit.addMark === false ? false : addMark({
      ...hit,
      kind,
      point: { x: _worldPt.x, y: _worldPt.y, z: _worldPt.z }
    });

    const dmg = Math.max(0, Number(hit.damage) || 0);
    stats.hits += 1;
    stats.damage += dmg;
    stats.byKind[kind] = (stats.byKind[kind] || 0) + 1;

    return {
      hit: true,
      kind,
      zone,
      markAdded,
      damage: dmg,
      totalHits: stats.hits,
      totalDamage: stats.damage,
      point: { x: _worldPt.x, y: _worldPt.y, z: _worldPt.z },
      normal: { x: _worldNrm.x, y: _worldNrm.y, z: _worldNrm.z },
      tiltRad: Math.hypot(tiltX, tiltZ)
    };
  }

  function updateMarkBatch(batch, dt) {
    if (!(markLife < Infinity) || !batch.count) return;
    let dirty = false, alive = 0;
    const fadeWindow = Math.min(6, markLife * 0.25);
    for (let j = 0; j < batch.capacity; j++) {
      if (batch.life[j] > 0) {
        batch.life[j] = Math.max(0, batch.life[j] - dt);
        if (batch.life[j] > 0) alive++;
        if (fadeWindow > 0 && batch.life[j] < fadeWindow) {
          const a = batch.life[j] / fadeWindow;
          for (let v = 0; v < VERTS_PER_MARK; v++) batch.colors.setW(j * VERTS_PER_MARK + v, a);
          dirty = true;
        }
      }
    }
    if (dirty) batch.colors.needsUpdate = true;
    if (!alive) {
      batch.mesh.geometry.setDrawRange(0, 0);
      batch.mesh.visible = false;
      batch.count = 0;
      batch.next = 0;
    }
  }

  function update(dt) {
    if (!(dt > 0)) return;
    const clampedDt = Math.min(dt, 0.1);
    clockSec += clampedDt;

    // Sub-stepped damped harmonic oscillator (unconditionally clean across variable frame rates)
    const steps = Math.max(1, Math.ceil(clampedDt / (1 / 120)));
    const h = clampedDt / steps;
    const kTilt = OMEGA * OMEGA;
    const cTilt = 2 * ZETA * OMEGA;
    const kTwist = OMEGA_TWIST * OMEGA_TWIST;
    const cTwist = 2 * ZETA_TWIST * OMEGA_TWIST;

    for (let s = 0; s < steps; s++) {
      velX += (-kTilt * tiltX - cTilt * velX) * h;
      velZ += (-kTilt * tiltZ - cTilt * velZ) * h;
      tiltX += velX * h;
      tiltZ += velZ * h;

      // Elastomer spring bump-stop collar at MAX_TILT
      const mag = Math.hypot(tiltX, tiltZ);
      if (mag > MAX_TILT) {
        const scale = MAX_TILT / mag;
        tiltX *= scale;
        tiltZ *= scale;
        const radialVel = (tiltX * velX + tiltZ * velZ) / MAX_TILT;
        if (radialVel > 0) {
          const nx = tiltX / MAX_TILT, nz = tiltZ / MAX_TILT;
          velX -= nx * radialVel * 1.35;
          velZ -= nz * radialVel * 1.35;
        }
      }

      velTwist += (-kTwist * twistY - cTwist * velTwist) * h;
      twistY += velTwist * h;
      if (Math.abs(twistY) > MAX_TWIST) {
        twistY = Math.sign(twistY) * MAX_TWIST;
        if (twistY * velTwist > 0) velTwist *= -0.35;
      }
    }

    if (Math.abs(tiltX) < 1e-5 && Math.abs(tiltZ) < 1e-5 && Math.abs(twistY) < 1e-5 &&
        Math.abs(velX) < 1e-4 && Math.abs(velZ) < 1e-4 && Math.abs(velTwist) < 1e-4) {
      tiltX = tiltZ = twistY = 0;
      velX = velZ = velTwist = 0;
    }

    applyPivotRotation();
    updateMarkBatch(pivotMarks, clampedDt);
    updateMarkBatch(baseMarks, clampedDt);
  }

  function clearMarks() {
    for (const b of [pivotMarks, baseMarks]) {
      b.mesh.geometry.setDrawRange(0, 0);
      b.mesh.visible = false;
      b.count = 0;
      b.next = 0;
      b.life.fill(0);
    }
    lastSawTime = -10;
  }

  function reset() {
    clearMarks();
    tiltX = tiltZ = twistY = 0;
    velX = velZ = velTwist = 0;
    applyPivotRotation();
    stats.hits = 0;
    stats.damage = 0;
    for (const k of Object.keys(stats.byKind)) stats.byKind[k] = 0;
  }

  // Primes `pivotMarks` & `baseMarks` during Training warm-compile so the very first slash/shot never compiles on-frame
  function prepareWarmup() {
    const batches = [pivotMarks, baseMarks];
    const prevRanges = batches.map((b) => b.mesh.geometry.drawRange.count);
    const prevVis = batches.map((b) => b.mesh.visible);
    const tiny = [[-0.02, -0.02], [0.02, -0.02], [-0.02, 0.02], [0.02, -0.02], [0.02, 0.02], [-0.02, 0.02]];
    for (const b of batches) {
      b.mesh.visible = true;
      if (b.count) continue;
      for (let i = 0; i < 6; i++) {
        b.positions.setXYZ(i, tiny[i][0], 0.5 + tiny[i][1], 0);
        b.normals.setXYZ(i, 0, 0, 1);
      }
      b.positions.needsUpdate = true;
      b.normals.needsUpdate = true;
      b.mesh.geometry.setDrawRange(0, 6);
    }
    return () => {
      batches.forEach((b, i) => {
        b.mesh.geometry.setDrawRange(0, prevRanges[i]);
        b.mesh.visible = prevVis[i];
      });
    };
  }

  function state() {
    return {
      hits: stats.hits,
      damage: stats.damage,
      byKind: { ...stats.byKind },
      markCount: pivotMarks.count + baseMarks.count,
      tiltX,
      tiltZ,
      twistY,
      tiltRad: Math.hypot(tiltX, tiltZ),
      angularSpeed: Math.hypot(velX, velZ, velTwist)
    };
  }

  function dispose() {
    group.removeFromParent();
    for (const d of disposables) {
      if (d && typeof d.dispose === 'function') d.dispose();
    }
    disposables.length = 0;
  }

  return {
    group,
    baseGroup,
    pivot,
    marksMesh: pivotMarks.mesh,
    baseMarksMesh: baseMarks.mesh,
    solid,
    spec: DUMMY_SPEC,
    setPose,
    syncTransform,
    pushOut,
    traceSegment,
    strike,
    addMark,
    update,
    clearMarks,
    reset,
    prepareWarmup,
    state,
    dispose
  };
}
