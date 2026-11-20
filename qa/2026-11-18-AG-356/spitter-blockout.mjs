// qa/2026-11-18-AG-356/spitter-blockout.mjs
// REVIEW-ONLY proposed gaunt Spitter blockout for AG-356 (J168 + D-190).
// Never imported by the game; builds on the exact Spitter bone heights/scale (s = 1.05).

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const G = (x) => Math.exp(-x * x);
const angd = (a, b) => {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

function hash3(i, j, k, seed) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 2147483647) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function noise3(x, y, z, seed = 1) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  const fx = x - i, fy = y - j, fz = z - k;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  const h = (a, b, c) => hash3(i + a, j + b, k + c, seed);
  return L(
    L(L(h(0, 0, 0), h(1, 0, 0), sx), L(h(0, 1, 0), h(1, 1, 0), sx), sy),
    L(L(h(0, 0, 1), h(1, 0, 1), sx), L(h(0, 1, 1), h(1, 1, 1), sx), sy),
    sz
  );
}
const fbm = (x, y, z, seed) =>
  0.6 * noise3(x, y, z, seed) +
  0.3 * noise3(x * 2.1, y * 2.1, z * 2.1, seed + 7) +
  0.1 * noise3(x * 4.3, y * 4.3, z * 4.3, seed + 13);

const bw = (b, t, y) => G(angd(t, b.t) / b.at) * G((y - b.y) / b.ay);

function makeTube(T, s, parent, mat, spec) {
  const { keys, n = 22, sub = 2, bumps = [], field = null, vpaint = null, axis = 'y', capBulge = [0.008, 0.008] } = spec;
  const K = keys.map((k) => [k.y, k.w, k.d, k.cx || 0, k.cz || 0, k.p || 2]);
  const cr = (a, b, c, d, t) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  const R = [];
  for (let j = 0; j < K.length - 1; j++) {
    for (let k = 0; k < sub; k++) {
      const t = k / sub;
      const row = [];
      for (let q = 0; q < 6; q++) {
        const a = K[Math.max(0, j - 1)][q], b = K[j][q], c = K[j + 1][q], d = K[Math.min(K.length - 1, j + 2)][q];
        let v = q === 0 ? b + (c - b) * t : cr(a, b, c, d, t);
        if (q === 1 || q === 2 || q === 5) v = clamp(v, Math.min(b, c) * 0.97, Math.max(b, c) * 1.03);
        row.push(v);
      }
      R.push(row);
    }
  }
  R.push(K.at(-1));

  const pts = [];
  for (const [y, w, d, cx, cz, p] of R) {
    const row = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU, st = Math.sin(t), ct = Math.cos(t), e = 2 / p;
      const bx = w * Math.sign(st) * Math.abs(st) ** e;
      const bz = d * Math.sign(ct) * Math.abs(ct) ** e;
      let nx = Math.sign(bx) * Math.abs(bx / Math.max(1e-4, w)) ** (p - 1) / Math.max(1e-4, w);
      let nz = Math.sign(bz) * Math.abs(bz / Math.max(1e-4, d)) ** (p - 1) / Math.max(1e-4, d);
      const l = Math.hypot(nx, nz) || 1;
      nx /= l; nz /= l;
      let r = 0;
      for (const b of bumps) r += b.a * bw(b, t, y);
      if (field) r += field(t, y, cx + bx, cz + bz);
      row.push([cx + bx + nx * r, y, cz + bz + nz * r]);
    }
    pts.push(row);
  }

  const swap = axis === 'z';
  const pos = [];
  for (const row of pts) {
    for (const [x, y, z] of row) pos.push(x * s, (swap ? z : y) * s, (swap ? y : z) * s);
  }
  const addCap = (row, dy) => {
    let x = 0, z = 0;
    for (const q of row) { x += q[0]; z += q[2]; }
    x /= n; z /= n;
    pos.push(x * s, (swap ? z : row[0][1] + dy) * s, (swap ? row[0][1] + dy : z) * s);
  };
  const rows = pts.length;
  addCap(pts[0], -capBulge[0]);
  addCap(pts[rows - 1], capBulge[1]);
  const c0 = rows * n, c1 = c0 + 1;

  const idx = [];
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * n + i, b = j * n + (i + 1) % n;
      idx.push(a, b, a + n, b, b + n, a + n);
    }
  }
  for (let i = 0; i < n; i++) idx.push(c0, (i + 1) % n, i);
  for (let i = 0; i < n; i++) {
    const a = (rows - 1) * n;
    idx.push(c1, a + i, a + (i + 1) % n);
  }

  let vol = 0;
  for (let k = 0; k < idx.length; k += 3) {
    const ia = idx[k] * 3, ib = idx[k + 1] * 3, ic = idx[k + 2] * 3;
    const ax = pos[ia], ay = pos[ia + 1], az = pos[ia + 2];
    const bx = pos[ib], by = pos[ib + 1], bz = pos[ib + 2];
    const cx = pos[ic], cy = pos[ic + 1], cz = pos[ic + 2];
    vol += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  if (vol < 0) {
    for (let k = 0; k < idx.length; k += 3) {
      const tmp = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = tmp;
    }
  }

  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  let useMat = mat;
  if (vpaint && vpaint.length) {
    const colArr = new Float32Array((rows * n + 2) * 3);
    const base = mat.color;
    const c = new T.Color();
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < n; i++) {
        const t = (i / n) * TAU, y = R[j][0], q = pts[j][i];
        c.copy(base);
        for (const layer of vpaint) {
          const w = clamp(layer.w(t, y, q[0], q[2]), 0, 1);
          if (w > 0) c.lerp(layer.color, w);
        }
        const k = (j * n + i) * 3;
        colArr[k] = c.r; colArr[k + 1] = c.g; colArr[k + 2] = c.b;
      }
    }
    for (const ci of [c0, c1]) {
      const k = ci * 3;
      colArr[k] = base.r; colArr[k + 1] = base.g; colArr[k + 2] = base.b;
    }
    geo.setAttribute('color', new T.Float32BufferAttribute(colArr, 3));
    useMat = mat.clone();
    useMat.color.setHex(0xffffff);
    useMat.vertexColors = true;
  }

  const mesh = new T.Mesh(geo, useMat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);

  const ys = R.map((r) => r[0]);
  const NA = geo.getAttribute('normal');
  const PA = geo.getAttribute('position');
  const at = (t, y) => {
    const tt = ((t % TAU) + TAU) % TAU;
    const fi = (tt / TAU) * n;
    const i0 = Math.floor(fi) % n, i1 = (i0 + 1) % n, ft = fi - Math.floor(fi);
    let j = ys.findIndex((v) => v >= y);
    if (j < 0) j = rows - 1;
    if (j === 0) j = 1;
    const j0 = j - 1, fy = clamp((y - ys[j0]) / (ys[j] - ys[j0] || 1), 0, 1);
    const mix = (u, w, f) => u.map((x, idx2) => x + (w[idx2] - x) * f);
    const get = (q, attr) => [attr.getX(q), attr.getY(q), attr.getZ(q)];
    const a = j0 * n, b = j * n;
    const p = mix(mix(get(a + i0, PA), get(a + i1, PA), ft), mix(get(b + i0, PA), get(b + i1, PA), ft), fy).map((v) => v / s);
    const nn = mix(mix(get(a + i0, NA), get(a + i1, NA), ft), mix(get(b + i0, NA), get(b + i1, NA), ft), fy);
    return { p: new T.Vector3(...p), n: new T.Vector3(...nn).normalize() };
  };

  return { mesh, at };
}

function makeCord(T, s, parent, mat, pts, radii, n = 6) {
  const P = pts.map((q) => new T.Vector3(q[0], q[1], q[2]));
  const pos = [], idx = [];
  const D0 = P[1].clone().sub(P[0]).normalize();
  let N = new T.Vector3(0, 1, 0);
  if (Math.abs(N.dot(D0)) > 0.9) N.set(1, 0, 0);
  N.sub(D0.clone().multiplyScalar(N.dot(D0))).normalize();
  for (let j = 0; j < P.length; j++) {
    const D = (j < P.length - 1 ? P[j + 1].clone().sub(P[j]) : P[j].clone().sub(P[j - 1])).normalize();
    N.sub(D.clone().multiplyScalar(N.dot(D))).normalize();
    const B = D.clone().cross(N).normalize();
    const r = radii[Math.min(j, radii.length - 1)];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const V = P[j].clone().addScaledVector(N, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r);
      pos.push(V.x * s, V.y * s, V.z * s);
    }
  }
  for (let j = 0; j < P.length - 1; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * n + i, b = j * n + (i + 1) % n;
      idx.push(a, a + n, b, b, a + n, b + n);
    }
  }
  const c0 = pos.length / 3;
  const e0 = P[0].clone().addScaledVector(P[0].clone().sub(P[1]).normalize(), radii[0] * 0.4);
  pos.push(e0.x * s, e0.y * s, e0.z * s);
  const c1 = c0 + 1;
  const e1 = P.at(-1).clone().addScaledVector(P.at(-1).clone().sub(P.at(-2)).normalize(), radii.at(-1) * 0.4);
  pos.push(e1.x * s, e1.y * s, e1.z * s);
  for (let i = 0; i < n; i++) {
    const a = i, b = (i + 1) % n, L = (P.length - 1) * n;
    idx.push(c0, b, a, c1, L + a, L + b);
  }
  const cen = P.reduce((a, b) => a.add(b), new T.Vector3()).multiplyScalar(s / P.length);
  let v2 = 0;
  for (let k = 0; k < idx.length; k += 3) {
    const Q = (q) => new T.Vector3(pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2]).sub(cen);
    v2 += Q(idx[k]).dot(Q(idx[k + 1]).cross(Q(idx[k + 2])));
  }
  if (v2 < 0) {
    for (let k = 0; k < idx.length; k += 3) {
      const tmp = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = tmp;
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new T.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function makeRagSkirt(T, s, parent, mat, darkCol, base, opts) {
  const { n = 32, rows = 12, lo, hi, off } = opts;
  const grid = [], inner = [], ptsNorm = [];
  for (let r = 0; r <= rows; r++) {
    const row = [], irow = [], nrow = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU;
      const y = lo(t) + ((hi(t) - lo(t)) * r) / rows;
      const h = base.at(t, y);
      const d = off(t, y, r / rows);
      row.push(h.p.clone().addScaledVector(h.n, d));
      irow.push(h.p.clone().addScaledVector(h.n, Math.max(0.001, d - 0.008)));
      nrow.push(r / rows);
    }
    grid.push(row);
    inner.push(irow);
    ptsNorm.push(nrow);
  }
  const pos = [], col = [], idx = [];
  const baseC = mat.color;
  const c = new T.Color();
  const pushGrid = (gRows, isInner) => {
    for (let r = 0; r <= rows; r++) {
      for (let i = 0; i < n; i++) {
        const v = gRows[r][i];
        pos.push(v.x * s, v.y * s, v.z * s);
        const u = ptsNorm[isInner ? rows - r : r][i];
        c.copy(baseC).lerp(darkCol, clamp((1 - u) * 0.75 + (isInner ? 0.35 : 0) + 0.3 * fbm(v.x * 12, v.y * 12, v.z * 12, 91), 0, 1));
        col.push(c.r, c.g, c.b);
      }
    }
  };
  pushGrid(grid, false);
  pushGrid([...inner].reverse(), true);

  const stride = n;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < n; i++) {
      const a = r * stride + i, b = r * stride + (i + 1) % n;
      idx.push(a, a + stride, b, b, a + stride, b + stride);
    }
  }
  const baseIn = (rows + 1) * stride;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < n; i++) {
      const a = baseIn + r * stride + i, b = baseIn + r * stride + (i + 1) % n;
      idx.push(a, a + stride, b, b, a + stride, b + stride);
    }
  }
  const botIn = (rows * 2 + 1) * stride;
  for (let i = 0; i < n; i++) {
    const i2 = (i + 1) % n;
    idx.push(i, i2, botIn + i, i2, botIn + i2, botIn + i);
  }
  const topOut = rows * stride;
  for (let i = 0; i < n; i++) {
    const i2 = (i + 1) % n;
    idx.push(topOut + i, baseIn + i, topOut + i2, topOut + i2, baseIn + i, baseIn + i2);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const useMat = mat.clone();
  useMat.color.setHex(0xffffff);
  useMat.vertexColors = true;
  const m = new T.Mesh(geo, useMat);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function buildProposedSpitter(T) {
  const s = 1.05; // preserves ZOMBIE_TYPES.spitter.scale = 1.05
  const seed = 79;
  const g = new T.Group();
  g.name = 'proposed-spitter-blockout';

  const skinCol = new T.Color(0xa69d6d);
  const decayCol = new T.Color(0x6e6a46);
  const darkSkinCol = new T.Color(0x524c34);
  const socketCol = new T.Color(0x1b1812);
  const bloodCol = new T.Color(0x4b241d);
  const dirtCol = new T.Color(0x48402e);

  const skinMat = new T.MeshStandardMaterial({ color: skinCol, roughness: 0.88, metalness: 0.0 });
  const ragMat = new T.MeshStandardMaterial({ color: 0x8d8259, roughness: 0.95, metalness: 0.0 });
  const ragDarkMat = new T.MeshStandardMaterial({ color: 0x5c5338, roughness: 0.96, metalness: 0.0 });
  const toothMat = new T.MeshStandardMaterial({ color: 0xc5baa0, roughness: 0.72 });
  const hairMat = new T.MeshStandardMaterial({ color: 0x262118, roughness: 0.95 });
  const acidMat = new T.MeshStandardMaterial({
    color: 0x99d81a,
    emissive: 0x62a408,
    emissiveIntensity: 0.88,
    roughness: 0.28,
    metalness: 0.02,
  });
  const eyeMat = new T.MeshStandardMaterial({
    color: 0x9ce056,
    emissive: 0x72b82a,
    emissiveIntensity: 0.9,
    roughness: 0.4,
  });

  // --- Skeleton matching game rig ---
  const hips = new T.Group();
  hips.position.y = 0.55 * s;
  g.add(hips);

  const torso = new T.Group();
  torso.position.y = 0.28 * s;
  torso.rotation.x = 0.14; // gaunt slouch forward
  hips.add(torso);

  // Target CF-15 Tripo proportions:
  // shoulders ~0.55 m (28% H), waist ~0.29 m (15% H), hip ~0.43 m (22% H), head ~0.24 m wide on thin craned neck
  const bw = 0.88; // torso width base -> waist ~0.27-0.29 m, shoulders ~0.54 m
  const bd = 0.82; // torso depth base -> chest ~0.25-0.27 m
  const chestHalfW = 0.165; // ~0.34 m chest width
  const armX = 0.205;       // outer shoulder width ~ 2 * (0.205 + 0.044) * 1.05 = 0.523 m
  const armY = 0.355;
  const legX = 0.106;       // clear thigh gap matching Tripo

  const armLG = new T.Group(), armRG = new T.Group();
  armLG.position.set(-armX * s, armY * s, 0);
  armRG.position.set(armX * s, armY * s, 0);
  armLG.rotation.set(-0.07, 0, -0.10);
  armRG.rotation.set(-0.07, 0, 0.10);
  torso.add(armLG, armRG);

  const legLG = new T.Group(), legRG = new T.Group();
  legLG.position.set(-legX * s, -0.02 * s, 0);
  legRG.position.set(legX * s, -0.02 * s, 0);
  hips.add(legLG, legRG);

  const head = new T.Group();
  head.position.set(0, 0.595 * s, 0.075 * s); // neck craned forward like Tripo
  head.rotation.x = -0.08;
  head.scale.setScalar(0.79);
  torso.add(head);

  // --- TORSO: starved ribcage, hollow concave abdomen, prominent clavicles & spine ---
  const ribField = (t, y) => {
    if (y < 0.09 || y > 0.37) return 0;
    const front = Math.cos(t);
    const flank = G((Math.abs(angd(t, 0)) - 1.05) / 0.72);
    const ph = (y - 0.055 * front - 0.1) / 0.036;
    return 0.0085 * flank * Math.max(0, Math.cos(ph * TAU)) * G((y - 0.24) / 0.11);
  };
  const spineField = (t, y) =>
    y > -0.04 && y < 0.49
      ? 0.008 * G(angd(t, Math.PI) / 0.085) * Math.max(0, Math.cos(((y - 0.02) / 0.042) * TAU))
      : 0;
  const gutHollow = (t, y) => {
    const front = Math.max(0, Math.cos(t)) ** 2;
    const back = Math.max(0, -Math.cos(t)) ** 2;
    return (
      front * (0.012 * G((y - 0.28) / 0.075) - 0.022 * G((y - 0.05) / 0.08)) +
      back * (0.018 * G((y - 0.34) / 0.08) - 0.014 * G((y - 0.04) / 0.06))
    );
  };

  const torsoBumps = [
    ...[-1, 1].flatMap((k) => [
      { t: k * 0.52, y: 0.435, at: 0.55, ay: 0.013, a: 0.010 }, // prominent clavicles
      { t: k * (Math.PI - 0.52), y: 0.36, at: 0.32, ay: 0.07, a: 0.018 }, // bony scapulae
      { t: k * 0.52, y: 0.52, at: 0.28, ay: 0.03, a: 0.007 },
    ]),
    { t: 0, y: 0.31, at: 0.12, ay: 0.09, a: -0.010 }, // sunken sternum hollow
    { t: Math.PI, y: 0.24, at: 0.09, ay: 0.28, a: -0.010 },
  ];

  const torsoVpaint = [
    { color: decayCol, w: (t, y, x, z) => 0.8 * Math.max(0, fbm(x * 11 + 3, y * 11, z * 11, seed) - 0.44) / 0.56 },
    { color: darkSkinCol, w: (t, y) => 0.55 * G(angd(t, 0) / 0.25) * G((y - 0.33) / 0.09) }, // sternal / sub-clavicle AO
    { color: darkSkinCol, w: (t, y) => 0.50 * G((y - 0.05) / 0.07) * Math.max(0, Math.cos(t)) }, // hollow gut AO
    { color: darkSkinCol, w: (t, y) => (y > 0.09 && y < 0.36 ? 0.38 * Math.max(0, -Math.cos(((y - 0.055 * Math.cos(t) - 0.1) / 0.036) * TAU)) * G((Math.abs(angd(t, 0)) - 1.05) / 0.72) : 0) }, // intercostal rib shadows
  ];

  const torsoTube = makeTube(T, s, torso, skinMat, {
    n: 30,
    sub: 2,
    bumps: torsoBumps,
    field: (t, y, x, z) => ribField(t, y) + spineField(t, y) + gutHollow(t, y),
    vpaint: torsoVpaint,
    keys: [
      { y: -0.10, w: 0.132, d: 0.105, cz: 0.002 },
      { y: 0.00, w: 0.132, d: 0.102, cz: 0.002 }, // starved narrow waist (~0.277 m wide!)
      { y: 0.10, w: 0.140, d: 0.108, cz: 0.004 },
      { y: 0.19, w: chestHalfW * 0.96, d: 0.120, cz: 0.006, p: 2.2 },
      { y: 0.27, w: chestHalfW, d: 0.128, cz: 0.008, p: 2.3 },
      { y: armY - 0.04, w: armX - 0.015, d: 0.118, cz: 0.002, p: 2.3 },
      { y: armY, w: armX - 0.012, d: 0.104, cz: -0.004, p: 2.15 },
      { y: armY + 0.035, w: 0.142, d: 0.090, cz: -0.006, p: 2.05 }, // sloped traps
      { y: armY + 0.075, w: 0.092, d: 0.078, cz: 0.004, p: 2.0 },
      { y: 0.51, w: 0.068, d: 0.064, cz: 0.032 }, // lean craned neck (~0.14 m wide)
      { y: 0.555, w: 0.058, d: 0.058, cz: 0.055 },
      { y: 0.595, w: 0.050, d: 0.050, cz: 0.070 },
    ],
  });

  // Neck tendons (sternocleidomastoid cords running from clavicles up to skull behind ears)
  for (const side of [-1, 1]) {
    makeCord(
      T, s, torso, skinMat,
      [
        [side * 0.52, 0.57],
        [side * 0.36, 0.51],
        [side * 0.14, 0.44],
      ].map(([t, y]) => torsoTube.at(t, y).p.addScaledVector(torsoTube.at(t, y).n, 0.0015).toArray()),
      [0.0065, 0.0075, 0.0045],
      5
    );
  }

  // --- PELVIS & TATTERED RAGS (loincloth skirt, NO black briefs!) ---
  const pelvisTube = makeTube(T, s, hips, ragMat, {
    n: 24,
    sub: 2,
    vpaint: [{ color: dirtCol, w: (t, y, x, z) => 0.75 * Math.max(0, fbm(x * 9, y * 9, z * 9, seed + 5) - 0.45) / 0.55 }],
    keys: [
      { y: -0.04, w: 0.050, d: 0.052, cz: -0.01 },
      { y: -0.015, w: legX + 0.056, d: 0.094, cz: -0.004 },
      { y: 0.035, w: legX + 0.076, d: 0.114, p: 2.2 },
      { y: 0.12, w: legX + 0.070, d: 0.112, cz: 0.003, p: 2.2 },
      { y: 0.20, w: 0.138, d: 0.106, cz: 0.003 },
      { y: 0.245, w: 0.132, d: 0.104, cz: 0.003 },
    ],
  });

  // Tattered loincloth skirt reaching mid-thigh in front & back, slit at sides for walk clearance
  const ragFlapLo = (t) => {
    const sideSplit = Math.abs(Math.sin(t)) ** 2.6;
    const jag = 0.055 * Math.sin(t * 5 + 0.4) + 0.035 * Math.cos(t * 9 - 0.7) + 0.02 * Math.sin(t * 13);
    return -0.26 + 0.19 * sideSplit + jag;
  };
  const ragBase = makeTube(T, s, hips, ragMat, {
    n: 30,
    sub: 2,
    keys: [
      { y: -0.34, w: legX + 0.118, d: 0.148, cz: 0.012, p: 2.2 },
      { y: -0.15, w: legX + 0.106, d: 0.138, cz: 0.008, p: 2.2 },
      { y: 0.03, w: legX + 0.090, d: 0.126, cz: 0.004, p: 2.2 },
      { y: 0.22, w: 0.142, d: 0.114, cz: 0.003 },
    ],
  });
  ragBase.mesh.removeFromParent();
  makeRagSkirt(T, s, hips, ragMat, dirtCol, ragBase, {
    n: 32,
    rows: 12,
    lo: ragFlapLo,
    hi: (t) => 0.215 + 0.012 * Math.cos(t * 3),
    off: (t, y, u) => 0.005 + 0.014 * (1 - u) + 0.005 * Math.sin(t * 7 + y * 20),
  });
  makeCord(
    T, s, hips, ragDarkMat,
    Array.from({ length: 19 }, (_, i) => {
      const h = pelvisTube.at((i / 18) * TAU, 0.205);
      return h.p.addScaledVector(h.n, 0.008).toArray();
    }),
    [0.009],
    5
  );

  // --- ARMS & HANDS (thin gaunt arms, bony elbows, narrow wrists, long clawed hands) ---
  const mu = 0.76;
  for (const side of [-1, 1]) {
    const arm = side < 0 ? armLG : armRG;
    const o = side * Math.PI / 2;
    makeTube(T, s, arm, skinMat, {
      n: 16,
      sub: 2,
      bumps: [
        { t: o, y: -0.025, at: 0.9, ay: 0.055, a: 0.009 * mu },
        { t: 0, y: -0.16, at: 0.55, ay: 0.06, a: 0.005 * mu },
      ],
      vpaint: [{ color: decayCol, w: (t, y, x, z) => 0.65 * Math.max(0, fbm(x * 12, y * 12, z * 12, seed + side + 3) - 0.45) / 0.55 }],
      keys: [
        { y: -0.365, w: 0.036 * mu, d: 0.038 * mu },
        { y: -0.29, w: 0.038 * mu, d: 0.041 * mu },
        { y: -0.18, w: 0.043 * mu, d: 0.047 * mu, cx: side * 0.002 },
        { y: -0.08, w: 0.049 * mu, d: 0.052 * mu, cx: side * 0.003 },
        { y: -0.02, w: 0.054 * mu, d: 0.055 * mu, cx: side * 0.002 },
        { y: 0.025, w: 0.046 * mu, d: 0.049 * mu, cx: -side * 0.012 },
        { y: 0.052, w: 0.024, d: 0.030, cx: -side * 0.024 },
      ],
    });

    const el = new T.Group();
    el.position.y = -0.34 * s;
    el.rotation.x = -0.24;
    arm.add(el);

    const foreTube = makeTube(T, s, el, skinMat, {
      n: 16,
      sub: 2,
      bumps: [{ t: Math.PI, y: 0.004, at: 0.36, ay: 0.02, a: 0.016 }],
      vpaint: [{ color: decayCol, w: (t, y, x, z) => 0.65 * Math.max(0, fbm(x * 12, y * 12, z * 12, seed + side + 9) - 0.45) / 0.55 }],
      keys: [
        { y: -0.322, w: 0.026 * mu, d: 0.017 }, // thin wrist (~4 cm!)
        { y: -0.28, w: 0.028 * mu, d: 0.019 },
        { y: -0.19, w: 0.035 * mu, d: 0.027 * mu },
        { y: -0.09, w: 0.044 * mu, d: 0.039 * mu },
        { y: -0.01, w: 0.046 * mu, d: 0.044 * mu, cz: -0.004 },
        { y: 0.038, w: 0.035, d: 0.035, cz: -0.007 },
      ],
    });

    const hw = 0.98;
    makeTube(T, s, el, skinMat, {
      n: 14,
      sub: 2,
      keys: [
        { y: -0.405, w: 0.040 * hw, d: 0.016, cz: 0.006, p: 2.5 },
        { y: -0.365, w: 0.044 * hw, d: 0.019, cz: 0.004, p: 2.5 },
        { y: -0.33, w: 0.038 * hw, d: 0.020, p: 2.3 },
        { y: -0.298, w: 0.028, d: 0.018 },
      ],
    });
    for (let f = 0; f < 4; f++) {
      const x = (f - 1.5) * 0.0225 * hw;
      const L = [0.85, 1.0, 0.96, 0.78][f] * 1.18;
      const p0 = [x, -0.40, 0.006];
      const p1 = [x * 1.05, -0.40 - 0.042 * L, 0.018];
      const p2 = [x * 1.07, -0.40 - 0.072 * L, 0.046];
      const p3 = [x * 1.07, -0.40 - 0.094 * L, 0.076];
      makeCord(T, s, el, skinMat, [p0, p1, p2, p3], [0.0085, 0.0074, 0.0064, 0.0050], 5);
      if (f === 1 || f === 2) {
        makeCord(T, s, el, acidMat, [p2, p3, [p3[0], p3[1] - 0.024, p3[2] + 0.004]], [0.0042, 0.0038, 0.0012], 4);
      }
    }
    makeCord(
      T, s, el, skinMat,
      [[side * 0.026 * hw, -0.315, 0.01], [side * 0.044 * hw, -0.35, 0.026], [side * 0.047 * hw, -0.38, 0.046], [side * 0.037 * hw, -0.405, 0.062]],
      [0.011, 0.0095, 0.008, 0.006],
      6
    );
    makeCord(
      T, s, el, acidMat,
      [[-side * 0.15, -0.13], [-side * 0.05, -0.22], [0, -0.30]].map(([t, y]) => {
        const h = foreTube.at(t, y);
        return h.p.addScaledVector(h.n, 0.0018).toArray();
      }),
      [0.003, 0.0045, 0.0035],
      4
    );
  }

  // --- LEGS & BARE FEET (lean thighs, knobby knees, thin calves, 5-toed bare feet) ---
  for (const side of [-1, 1]) {
    const leg = side < 0 ? legLG : legRG;
    makeTube(T, s, leg, skinMat, {
      n: 18,
      sub: 2,
      vpaint: [{ color: dirtCol, w: (t, y, x, z) => 0.55 * Math.max(0, fbm(x * 10, y * 10, z * 10, seed + side + 17) - 0.45) / 0.55 }],
      keys: [
        { y: -0.42, w: 0.048, d: 0.052, cz: 0.004 },
        { y: -0.37, w: 0.053, d: 0.058, cz: 0.005 },
        { y: -0.28, w: 0.060 * 0.85, d: 0.066 * 0.85, cz: 0.003 },
        { y: -0.16, w: 0.072 * 0.83, d: 0.079 * 0.83 },
        { y: -0.05, w: 0.082 * 0.83, d: 0.088 * 0.83, cz: -0.003 },
        { y: 0.04, w: 0.080, d: 0.088, cz: -0.006 },
        { y: 0.09, w: 0.062, d: 0.070, cz: -0.006 },
      ],
    });

    const shin = new T.Group();
    shin.position.y = -0.38 * s;
    leg.add(shin);

    makeTube(T, s, shin, skinMat, {
      n: 16,
      sub: 2,
      bumps: [
        { t: 0, y: -0.005, at: 0.42, ay: 0.028, a: 0.011 },
        { t: Math.PI, y: -0.12, at: 0.55, ay: 0.06, a: 0.009 },
      ],
      vpaint: [{ color: dirtCol, w: (t, y) => clamp((-0.15 - y) * 2.2, 0, 0.75) }],
      keys: [
        { y: -0.375, w: 0.032, d: 0.035, cz: 0.004 },
        { y: -0.33, w: 0.031, d: 0.034, cz: 0.004 },
        { y: -0.25, w: 0.034, d: 0.038, cz: -0.002 },
        { y: -0.13, w: 0.045, d: 0.054, cz: -0.007 },
        { y: -0.05, w: 0.046, d: 0.052, cz: -0.002 },
        { y: 0.005, w: 0.050, d: 0.054, cz: 0.007 },
        { y: 0.052, w: 0.045, d: 0.049, cz: 0.004 },
      ],
    });

    makeTube(T, s, shin, skinMat, {
      axis: 'z',
      n: 14,
      sub: 2,
      vpaint: [{ color: dirtCol, w: (t, y) => (Math.cos(t) < -0.1 || y > 0.07 ? 0.65 : 0.25) }],
      keys: [
        { y: -0.06, w: 0.030, d: 0.028, cz: -0.385 },
        { y: -0.035, w: 0.037, d: 0.034, cz: -0.378 },
        { y: 0.01, w: 0.037, d: 0.033, cz: -0.375 },
        { y: 0.06, w: 0.043, d: 0.024, cz: -0.392 },
        { y: 0.10, w: 0.047, d: 0.018, cz: -0.40 },
        { y: 0.118, w: 0.041, d: 0.014, cz: -0.404 },
      ].map((q) => ({ ...q, cx: side * 0.004 })),
      capBulge: [0.004, 0.002],
    });
    for (let k = 0; k < 5; k++) {
      const x = side * (-0.032 + k * 0.016);
      const L = [0.034, 0.031, 0.027, 0.023, 0.019][k];
      const r = [0.0078, 0.0062, 0.0056, 0.0052, 0.0048][k];
      const z0 = 0.105 - k * 0.004;
      makeCord(
        T, s, shin, skinMat,
        [[x, -0.402, z0], [x * 1.04, -0.405, z0 + L * 0.55], [x * 1.06, -0.41, z0 + L]],
        [r, r * 0.9, r * 0.72],
        5
      );
    }
  }

  // --- HEAD: gaunt skull, sunken sockets, hollow cheeks, open dripping jaw, sparse hair ---
  const w = 0.145, D = 1.02, J = 0.88, gp = 0.068;
  const sock = [-1, 1].map((k) => ({ t: k * 0.42, y: 0.04, at: 0.23, ay: 0.025 }));
  const mouthBump = { t: 0, y: -0.083 - gp * 0.5, at: 0.45, ay: 0.012 + gp * 0.45 };
  const headBumps = [
    ...sock.map((b) => ({ ...b, a: -0.046 })),
    ...[-1, 1].flatMap((k) => [
      { t: k * 0.28, y: 0.065, at: 0.2, ay: 0.011, a: 0.016 },
      { t: k * 0.56, y: 0.080, at: 0.22, ay: 0.012, a: 0.014 },
      { t: k * 0.78, y: -0.004, at: 0.22, ay: 0.017, a: 0.014 },
      { t: k * 0.66, y: -0.058, at: 0.25, ay: 0.028, a: -0.025 },
    ]),
    { t: 0, y: -0.032, at: 0.075, ay: 0.012, a: -0.008 },
    { ...mouthBump, a: -0.040 },
    { t: 0, y: -0.13 - gp, at: 0.28, ay: 0.016, a: 0.007 },
  ];
  const Rt = (y) => (y > 0.1 ? 0.1 + (y - 0.1) * 0.78 : y);
  const R = (y) => (y < -0.07 ? -0.07 + (y + 0.07) * (y > -0.165 ? 0.82 : 1) - gp * clamp((-0.07 - y) / 0.04, 0, 1) : y);
  const headKeys = [
    [-0.2, 0.3, 0.045, -0.02], [-0.17, 0.4 * J, 0.06, 0], [-0.153, 0.5 * J, 0.085, 0.026],
    [-0.13, 0.62 * J, 0.1, 0.02], [-0.095, 0.78 * J, 0.112, 0.004], [-0.06, 0.88, 0.122, -0.01],
    [-0.02, 0.95, 0.128, -0.02], [0.04, 1, 0.134, -0.028], [0.1, 0.99, 0.14, -0.034],
    [0.155, 0.9, 0.13, -0.04], [0.198, 0.66, 0.1, -0.045], [0.222, 0.3, 0.05, -0.045],
  ].map(([y, ww, d, cz]) => ({ y: R(Rt(y)), w: ww * w, d: d * D, cz, p: y > -0.08 && y < 0.15 ? 2.25 : 2 }));

  const eyeE = (x, y) => Math.hypot((Math.abs(x) - 0.058) / 0.029, (y - 0.04) / 0.019);
  const mouthE = (x, y) => Math.hypot(x / 0.047, (y + 0.083 + gp * 0.5) / (0.012 + gp * 0.45));
  const headTube = makeTube(T, s, head, skinMat, {
    n: 36,
    sub: 3,
    bumps: headBumps,
    vpaint: [
      { color: socketCol, w: (t, y, x) => (Math.cos(t) > 0.35 ? 1 - clamp((eyeE(x, y) - 0.85) / 0.55, 0, 1) : 0) },
      { color: socketCol, w: (t, y, x) => (Math.cos(t) > 0.35 ? 1 - clamp((mouthE(x, y) - 0.85) / 0.45, 0, 1) : 0) },
      { color: bloodCol, w: (t, y, x) => (Math.cos(t) > 0.35 ? 0.55 * (1 - clamp((mouthE(x, y) - 1.05) / 0.45, 0, 1)) : 0) },
      { color: decayCol, w: (t, y, x, z) => 0.7 * Math.max(0, fbm(x * 16 + 5, y * 16, z * 16, seed + 40) - 0.5) / 0.5 },
    ],
    keys: headKeys,
  });

  for (const side of [-1, 1]) {
    const so = headTube.at(side * 0.42, 0.04);
    const eye = new T.Mesh(new T.SphereGeometry(0.019 * s, 8, 6), eyeMat);
    eye.position.copy(so.p.clone().addScaledVector(so.n, -0.002)).multiplyScalar(s);
    eye.scale.set(0.75, 0.55, 0.4);
    head.add(eye);
  }

  for (let k = 0; k < 8; k++) {
    if (k === 2 || k === 5) continue;
    const t = (k - 3.5) * 0.075;
    const atU = headTube.at(t, -0.071);
    const toothU = new T.Mesh(new T.CylinderGeometry(0.0025 * s, 0.005 * s, 0.02 * s, 5), toothMat);
    toothU.position.copy(atU.p.clone().addScaledVector(atU.n, -0.004).add(new T.Vector3(0, -0.008, 0))).multiplyScalar(s);
    head.add(toothU);

    if (k !== 6) {
      const atL = headTube.at(t, -0.095 - gp * 0.9);
      const toothL = new T.Mesh(new T.CylinderGeometry(0.0045 * s, 0.002 * s, 0.017 * s, 5), toothMat);
      toothL.position.copy(atL.p.clone().addScaledVector(atL.n, -0.004).add(new T.Vector3(0, 0.007, 0))).multiplyScalar(s);
      head.add(toothL);
    }
  }

  for (let i = 0; i < 14; i++) {
    const t0 = ((i - 6.5) / 7) * 1.15 + Math.PI * (i % 3 === 0 ? 0.12 : 0.95);
    const y0 = 0.145 + (i % 3) * 0.016;
    const ln = 0.065 + (i % 4) * 0.024;
    const pts = [
      headTube.at(t0, y0).p.clone().addScaledVector(headTube.at(t0, y0).n, 0.001).toArray(),
      headTube.at(t0 + 0.05, y0 + 0.014).p.clone().addScaledVector(headTube.at(t0 + 0.05, y0 + 0.014).n, 0.015).toArray(),
      headTube.at(t0 + 0.08, y0 - ln * 0.5).p.clone().addScaledVector(headTube.at(t0 + 0.08, y0 - ln * 0.5).n, 0.019).toArray(),
    ];
    makeCord(T, s, head, hairMat, pts, [0.0038, 0.0026, 0.0008], 4);
  }

  // --- ACID VISUALS: glowing throat maw + chin drool + sternum/chest/rib streaks ---
  const mawCore = headTube.at(0, -0.095 - gp * 0.5);
  const throatPool = new T.Mesh(new T.SphereGeometry(0.038 * s, 10, 8), acidMat);
  throatPool.position.copy(mawCore.p.clone().addScaledVector(mawCore.n, -0.010)).multiplyScalar(s);
  throatPool.scale.set(1.25, 0.82, 0.9);
  head.add(throatPool);

  const droolSpecs = [
    { x: -0.018, len: 0.095, r0: 0.0075 },
    { x: 0.002, len: 0.125, r0: 0.009 },
    { x: 0.022, len: 0.080, r0: 0.007 },
  ];
  for (const ds of droolSpecs) {
    const lip = headTube.at(ds.x / 0.12, -0.105 - gp * 0.95);
    const p0 = lip.p.clone().addScaledVector(lip.n, 0.002);
    const p1 = p0.clone().add(new T.Vector3(ds.x * 0.2, -ds.len * 0.45, 0.008));
    const p2 = p0.clone().add(new T.Vector3(ds.x * 0.35, -ds.len, 0.002));
    makeCord(T, s, head, acidMat, [p0.toArray(), p1.toArray(), p2.toArray()], [ds.r0, ds.r0 * 0.72, ds.r0 * 0.24], 5);
  }

  const chestStreaks = [
    [[0.02, 0.46], [0.03, 0.36], [0.01, 0.24], [-0.03, 0.12], [-0.02, 0.01], [-0.04, -0.08]],
    [[-0.08, 0.44], [-0.14, 0.34], [-0.22, 0.23], [-0.28, 0.13]],
    [[0.11, 0.43], [0.18, 0.33], [0.26, 0.22], [0.32, 0.14], [0.35, 0.04]],
    [[0.06, 0.31], [0.12, 0.22], [0.09, 0.12], [0.15, 0.03]],
  ];
  for (const st of chestStreaks) {
    const pts = st.map(([t, y]) => {
      const h = torsoTube.at(t, y);
      return h.p.addScaledVector(h.n, 0.003).toArray();
    });
    const radii = st.map((_, idx2) => 0.0078 * (1 - 0.56 * (idx2 / (st.length - 1))));
    makeCord(T, s, torso, acidMat, pts, radii, 5);
  }

  g.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(g);
  if (Number.isFinite(box.min.y)) {
    hips.position.y -= box.min.y;
    g.updateMatrixWorld(true);
  }

  return g;
}
