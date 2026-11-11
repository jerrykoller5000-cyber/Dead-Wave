// combat/training-wreck.js - CB-250 / AG-296 (Jerry's J120 and J122, 9 Nov playtest).
// J120: "If you shoot a target with a flamethrower, the target should burn up and turn to a pile of ash. The player will no
// longer be able to use the range computer. He can still free shoot other targets he has yet to burn."
// J122: "Grenade launcher needs to blow range targets to pieces. The player will not longer be able to use the range computer."
//
// AG-296 upgrades:
// - Licking multi-tongue flame sheets on burning plates (renderOrder 4, depthWrite false, NormalBlending with rich core & dark
//   heat rim so flames read vividly on bright white noon range tiles as well as at night).
// - Authentic irregular multi-mound charred ash & flaky grey cinder heap seated flush on the stand top (y = 0.240, 0.0 mm gap),
//   with blackened soot apron, curled charred board fragments, and sparse pinpoint ember crevices that cool to dark ash (fixing
//   the uniform glowing coral-orange cone).
// - GP-20089 coordination: sets/clears `t.burned`, clears decal marks on burned plates, and exposes `isBurned`, `restore(index)`,
//   `reset()`, and `prepareWarmup()`.

export const BURN_IGNITE_S = 0.75;
export const BURN_S = 2.8;
const SINK_FROM = 1.65, ASH_GLOW_S = 3.2;
const GRAVITY = 9.8, PIECES = 9, STAND_TOP = 0.24;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (u) => u * u * (3 - 2 * u);

function buildAshHeapGeometry(T) {
  const pos = [], nrm = [], col = [], uvs = [];
  const pushTri = (a, b, c, ca, cb, cc, ua, ub, uc) => {
    const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
    const acx = c[0] - a[0], acy = c[1] - a[1], acz = c[2] - a[2];
    let nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    for (const [p, cl, uv] of [[a, ca, ua], [b, cb, ub], [c, cc, uc]]) {
      pos.push(p[0], p[1], p[2]);
      nrm.push(nx, ny, nz);
      col.push(cl[0], cl[1], cl[2]);
      uvs.push(uv[0], uv[1]);
    }
  };

  // 1. Scorched black soot apron seated flush on the stand hazard plate (y = 0.0018 above STAND_TOP)
  const apronSegs = 18;
  const centerP = [0, 0.004, 0], centerC = [0.05, 0.048, 0.046], centerUV = [0.5, 0.5];
  for (let i = 0; i < apronSegs; i++) {
    const a0 = (i / apronSegs) * Math.PI * 2, a1 = ((i + 1) / apronSegs) * Math.PI * 2;
    const r0 = 1 + 0.14 * Math.sin(a0 * 3 + 0.7) + 0.08 * Math.cos(a0 * 5 - 0.4);
    const r1 = 1 + 0.14 * Math.sin(a1 * 3 + 0.7) + 0.08 * Math.cos(a1 * 5 - 0.4);
    const p0 = [Math.cos(a0) * 0.43 * r0, 0.0018, Math.sin(a0) * 0.29 * r0];
    const p1 = [Math.cos(a1) * 0.43 * r1, 0.0018, Math.sin(a1) * 0.29 * r1];
    const rimC = [0.11, 0.105, 0.098];
    pushTri(
      centerP, p1, p0,
      centerC, rimC, rimC,
      centerUV, [0.5 + Math.cos(a1) * 0.46, 0.5 + Math.sin(a1) * 0.46], [0.5 + Math.cos(a0) * 0.46, 0.5 + Math.sin(a0) * 0.46]
    );
  }

  // 2. Three overlapping organic slumped ash mounds (central pile + flanking shoulders), bottom strictly y = 0.001
  const mounds = [
    { ox: 0.0, oz: 0.01, rx: 0.33, rz: 0.23, h: 0.145, ph: 0.3 },
    { ox: -0.19, oz: -0.02, rx: 0.21, rz: 0.17, h: 0.092, ph: 2.1 },
    { ox: 0.18, oz: 0.03, rx: 0.22, rz: 0.16, h: 0.086, ph: 4.0 },
    { ox: 0.03, oz: -0.09, rx: 0.18, rz: 0.14, h: 0.072, ph: 5.2 }
  ];
  const rings = 5, segs = 14;
  for (const m of mounds) {
    const grid = [];
    for (let r = 0; r <= rings; r++) {
      const u = r / rings; // 0 = crest, 1 = base skirt
      const row = [];
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        const lobe = 1 + 0.15 * Math.sin(a * 3 + m.ph) + 0.09 * Math.cos(a * 4 - m.ph * 1.4) + 0.05 * Math.sin(a * 7 + u * 3);
        const rad = u * lobe;
        const px = m.ox + Math.cos(a) * m.rx * rad;
        const pz = m.oz + Math.sin(a) * m.rz * rad;
        const profile = Math.pow(1 - u * u, 1.35);
        const lump = 1 + 0.12 * Math.sin(a * 2 + u * 4 + m.ph) * (1 - u);
        const py = r === rings ? 0.001 : Math.max(0.002, m.h * profile * lump);
        // Ash color: deep charcoal-black in lower skirt & crevices, flaky grey-ash on upper ridges
        const grey = (1 - u) * (0.55 + 0.45 * Math.max(0, Math.sin(a * 3 + u * 5 + m.ph)));
        const cr = 0.08 + grey * 0.34;
        const cg = 0.076 + grey * 0.33;
        const cb = 0.072 + grey * 0.31;
        row.push({ p: [px, py, pz], c: [cr, cg, cb], uv: [0.5 + (px / 0.9), 0.5 + (pz / 0.7)] });
      }
      grid.push(row);
    }
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < segs; s++) {
        const s1 = (s + 1) % segs;
        const v00 = grid[r][s], v10 = grid[r + 1][s], v11 = grid[r + 1][s1], v01 = grid[r][s1];
        pushTri(v00.p, v11.p, v10.p, v00.c, v11.c, v10.c, v00.uv, v11.uv, v10.uv);
        if (r > 0) pushTri(v00.p, v01.p, v11.p, v00.c, v01.c, v11.c, v00.uv, v01.uv, v11.uv);
      }
    }
  }

  // 3. Charred curled silhouette flakes resting on the ash slopes
  const flakes = [
    [-0.14, 0.078, 0.06, 0.11, 0.055, 0.35, 0.4, -0.28],
    [0.13, 0.072, 0.05, 0.10, 0.050, -0.5, -0.35, 0.32],
    [0.02, 0.125, -0.02, 0.09, 0.048, 0.2, 0.22, 0.14],
    [-0.24, 0.044, -0.04, 0.095, 0.045, 0.9, 0.32, 0.25],
    [0.23, 0.042, 0.04, 0.09, 0.042, -0.8, -0.28, -0.22],
    [-0.05, 0.062, -0.12, 0.10, 0.044, 1.4, -0.38, 0.12],
    [0.07, 0.058, 0.12, 0.085, 0.040, -1.2, 0.42, -0.15]
  ];
  for (const [fx, fy, fz, fw, fd, ry, rx, rz] of flakes) {
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx), cz = Math.cos(rz), sz = Math.sin(rz);
    const xf = (lx, ly, lz) => {
      const y1 = ly * cx - lz * sx, z1 = ly * sx + lz * cx;
      const x2 = lx * cz - y1 * sz, y2 = lx * sz + y1 * cz;
      const x3 = x2 * cy + z1 * sy, z3 = -x2 * sy + z1 * cy;
      return [fx + x3, Math.max(0.004, fy + y2), fz + z3];
    };
    const p0 = xf(-fw * 0.5, 0, -fd * 0.5), p1 = xf(fw * 0.5, 0.006, -fd * 0.5);
    const p2 = xf(fw * 0.5, 0.010, fd * 0.5), p3 = xf(-fw * 0.5, 0.004, fd * 0.5);
    const fcDark = [0.07, 0.065, 0.062], fcEdge = [0.22, 0.21, 0.195];
    pushTri(p0, p2, p1, fcDark, fcEdge, fcDark, [0.2, 0.2], [0.8, 0.8], [0.8, 0.2]);
    pushTri(p0, p3, p2, fcDark, fcEdge, fcEdge, [0.2, 0.2], [0.2, 0.8], [0.8, 0.8]);
    // Underside so no angle sees backface cull
    pushTri(p0, p1, p2, fcDark, fcDark, fcDark, [0.2, 0.2], [0.8, 0.2], [0.8, 0.8]);
    pushTri(p0, p2, p3, fcDark, fcDark, fcDark, [0.2, 0.2], [0.8, 0.8], [0.2, 0.8]);
  }

  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  return geo;
}

function makeLickingFlameTexture(T) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  // Subtle dark heat-soot outer feather so flames stand out sharply against white range tiles in bright noon light
  const halo = c.createRadialGradient(64, 76, 8, 64, 64, 58);
  halo.addColorStop(0, 'rgba(60, 18, 4, 0.42)');
  halo.addColorStop(0.68, 'rgba(42, 12, 4, 0.24)');
  halo.addColorStop(1, 'rgba(20, 8, 4, 0)');
  c.fillStyle = halo; c.fillRect(0, 0, 128, 128);

  // Upward-licking turbulent flame tongues
  const tongues = [
    [64, 114, 60, 12, 28],
    [44, 110, 34, 26, 20],
    [84, 110, 92, 24, 20],
    [54, 106, 48, 18, 16],
    [75, 106, 80, 20, 16]
  ];
  for (const [bx, by, tx, ty, w] of tongues) {
    const g = c.createLinearGradient(bx, by, tx, ty);
    g.addColorStop(0, 'rgba(255, 248, 205, 0.95)');
    g.addColorStop(0.28, 'rgba(255, 182, 48, 0.92)');
    g.addColorStop(0.62, 'rgba(242, 76, 14, 0.80)');
    g.addColorStop(0.88, 'rgba(165, 26, 6, 0.36)');
    g.addColorStop(1, 'rgba(90, 14, 4, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(bx - w, by);
    c.bezierCurveTo(bx - w * 0.95, (by + ty) * 0.58, tx - w * 0.45, ty + 22, tx, ty);
    c.bezierCurveTo(tx + w * 0.45, ty + 22, bx + w * 0.95, (by + ty) * 0.58, bx + w, by);
    c.closePath();
    c.fill();
  }
  // White-gold incandescent core at base
  const core = c.createRadialGradient(64, 92, 2, 64, 84, 28);
  core.addColorStop(0, 'rgba(255, 253, 232, 0.98)');
  core.addColorStop(0.45, 'rgba(255, 214, 92, 0.82)');
  core.addColorStop(1, 'rgba(255, 120, 20, 0)');
  c.fillStyle = core; c.fillRect(24, 48, 80, 72);
  const tex = new T.CanvasTexture(cv);
  if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

function makeAshTextures(T) {
  if (typeof document === 'undefined') return { ashTex: null, emberTex: null };
  let s = 90296;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = '#5a5752'; c.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    const v = Math.floor(42 + rnd() * 98);
    c.fillStyle = `rgba(${v},${Math.max(0, v - 3)},${Math.max(0, v - 7)},${(0.25 + rnd() * 0.45).toFixed(2)})`;
    c.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 3.5, 1 + rnd() * 2.5);
  }
  for (let i = 0; i < 65; i++) {
    c.fillStyle = `rgba(18,16,15,${(0.35 + rnd() * 0.4).toFixed(2)})`;
    c.beginPath(); c.arc(rnd() * 128, rnd() * 128, 1.5 + rnd() * 4, 0, Math.PI * 2); c.fill();
  }
  const ashTex = new T.CanvasTexture(cv);
  if (T.SRGBColorSpace) ashTex.colorSpace = T.SRGBColorSpace;

  // Sparse pinpoint cinders ONLY in tiny crevices (<6% area) so ash never glows uniform orange
  const ecv = document.createElement('canvas'); ecv.width = ecv.height = 128;
  const ec = ecv.getContext('2d');
  ec.fillStyle = '#000000'; ec.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 26; i++) {
    const ex = 26 + rnd() * 76, ey = 26 + rnd() * 76, er = 1.2 + rnd() * 2.6;
    const g = ec.createRadialGradient(ex, ey, 0.2, ex, ey, er);
    g.addColorStop(0, 'rgba(255, 165, 48, 1)');
    g.addColorStop(0.5, 'rgba(210, 52, 8, 0.65)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ec.fillStyle = g; ec.beginPath(); ec.arc(ex, ey, er, 0, Math.PI * 2); ec.fill();
  }
  const emberTex = new T.CanvasTexture(ecv);
  if (T.SRGBColorSpace) emberTex.colorSpace = T.SRGBColorSpace;
  return { ashTex, emberTex };
}

export function createTrainingWreck(T, tg, fx = {}) {
  const base = tg.targets.length;
  const lanes = new Map();   // index -> a lane's record
  const shared = [];
  let flameMat = null, flameGeo = null, ashMat0 = null, ashGeo = null, pieceMat = null;
  let burnFlameInst = null, burnFlameDrawn = 0;
  const burnCap = Math.max(18, base * 18);
  const _v = new T.Vector3();
  const _zeroM = T.Matrix4 ? new T.Matrix4().makeScale(0, 0, 0) : null;
  const _localM = T.Matrix4 ? new T.Matrix4() : null;
  const _groupM = T.Matrix4 ? new T.Matrix4() : null;
  const _tgInv = T.Matrix4 ? new T.Matrix4() : null;
  const _fPos = T.Vector3 ? new T.Vector3() : null;
  const _fScl = T.Vector3 ? new T.Vector3() : null;
  const _fQuat = T.Quaternion ? new T.Quaternion() : null;
  const _fEuler = T.Euler ? new T.Euler() : null;

  // Keep reference to each original lane's solid so restore/clear brings it cleanly back if needed
  const laneSolids = tg.targets.slice(0, base).map((t, i) => tg.solids.find((s) => s.target === i) || { ...t.box, target: i });

  function makeShared() {
    if (flameMat) return;
    const fTex = makeLickingFlameTexture(T);
    const { ashTex, emberTex } = makeAshTextures(T);
    flameMat = new T.MeshBasicMaterial({ map: fTex, transparent: true, depthWrite: false, side: T.DoubleSide, forceSinglePass: true });
    flameGeo = new T.PlaneGeometry(1, 1);
    if (typeof T.InstancedMesh === 'function' && _zeroM && tg.group?.add) {
      burnFlameInst = new T.InstancedMesh(flameGeo, flameMat, burnCap);
      burnFlameInst.name = 'training-burn-flames';
      burnFlameInst.renderOrder = 4;
      burnFlameInst.frustumCulled = false;
      burnFlameInst.castShadow = false;
      burnFlameInst.receiveShadow = false;
      burnFlameInst.visible = false;
      burnFlameInst.instanceMatrix?.setUsage?.(T.DynamicDrawUsage);
      for (let i = 0; i < burnCap; i++) burnFlameInst.setMatrixAt(i, _zeroM);
      tg.group.add(burnFlameInst);
    }
    ashMat0 = new T.MeshStandardMaterial({
      color: 0xffffff,
      map: ashTex,
      vertexColors: true,
      roughness: 0.98,
      metalness: 0,
      emissive: 0xd83a08,
      emissiveMap: emberTex,
      emissiveIntensity: 0.65
    });
    ashGeo = buildAshHeapGeometry(T);
    pieceMat = new T.MeshStandardMaterial({ color: 0x2c2d2a, roughness: 0.7, metalness: 0.6, side: T.DoubleSide });
    for (const x of [fTex, ashTex, emberTex, flameMat, flameGeo, ashMat0, ashGeo, pieceMat]) if (x) shared.push(x);
  }

  function syncBurnFlames() {
    if (!burnFlameInst) return;
    let n = 0;
    tg.group.updateWorldMatrix?.(true, false);
    if (tg.group.matrixWorld) _tgInv.copy(tg.group.matrixWorld).invert();
    else _tgInv.identity();
    for (const lane of lanes.values()) {
      if (lane.kind !== 'burn' || !lane.flames.length) continue;
      lane.root.updateWorldMatrix?.(true, false);
      if (lane.root.matrixWorld) _groupM.multiplyMatrices(_tgInv, lane.root.matrixWorld);
      else _groupM.identity();
      for (let k = 0; k < lane.flames.length; k++) {
        if (n >= burnCap) break;
        const m = lane.flames[k];
        _fPos.set(m.position.x, m.position.y, m.position.z);
        _fEuler.set(0, m.rotation.y, m.rotation.z);
        _fQuat.setFromEuler(_fEuler);
        _fScl.set(m.scale.x, m.scale.y, m.scale.z);
        _localM.compose(_fPos, _fQuat, _fScl);
        _localM.premultiply(_groupM);
        burnFlameInst.setMatrixAt(n++, _localM);
      }
    }
    for (let i = n; i < burnFlameDrawn; i++) burnFlameInst.setMatrixAt(i, _zeroM);
    if (n || burnFlameDrawn) burnFlameInst.instanceMatrix.needsUpdate = true;
    burnFlameDrawn = n;
    burnFlameInst.visible = n > 0;
  }

  function worldXYZ(lane) { _v.set(lane.centre.x, lane.centre.y, lane.centre.z); lane.root.localToWorld(_v); return [_v.x, _v.y, _v.z]; }

  function makeAsh(lane, size) {
    lane.ashMat = ashMat0.clone(); lane.own.push(lane.ashMat);
    const a = new T.Mesh(ashGeo, lane.ashMat);
    a.name = 'training-target-ash';
    a.scale.set(size, size * 0.95, size);
    a.position.set(0, STAND_TOP, 0);
    lane.root.add(a); lane.ash = a; lane.ashT = 0;
  }

  function setPivotDecalsVisible(pivot, vis) {
    if (!pivot || typeof pivot.traverse !== 'function') return;
    pivot.traverse((o) => {
      if (o.name === 'training-impact-marks' || o.name === 'training-char-marks') o.visible = vis;
    });
  }

  function ensureTargetSolid(index, present) {
    const s = laneSolids[index];
    if (!s) return;
    const at = tg.solids.indexOf(s);
    if (present && at < 0) tg.solids.push(s);
    else if (!present && at >= 0) tg.solids.splice(at, 1);
  }

  function begin(index, kind, from) {
    const t = tg.targets[index];
    if (!t || index >= base || lanes.has(index) || t.state !== 'up') return false;
    const root = t.pivot.parent;
    if (!root) return false;
    makeShared();
    t.state = 'wrecked'; t.t = 0;
    if (kind === 'burn') t.burned = true;
    ensureTargetSolid(index, false);
    const lane = { kind, t: 0, root, pivot: t.pivot, plate: t.plate, mat0: t.plate.material, mat: null, ash: null, ashMat: null, ashT: 0, flames: [], pieces: [], own: [], emberT: 0, decalsCleared: false };
    lanes.set(index, lane);
    const w = t.box.maxX - t.box.minX, h = t.box.maxY - t.box.minY;
    t.plate.updateWorldMatrix(true, false); t.plate.getWorldPosition(_v);
    lane.centre = root.worldToLocal(_v.clone());
    if (kind === 'burn') {
      lane.mat = t.plate.material.clone(); lane.own.push(lane.mat); t.plate.material = lane.mat;
      for (let k = 0; k < 6; k++) {
        for (const ry of [0, Math.PI * 0.34, -Math.PI * 0.34]) {
          const ud = {
            ox: ((k - 2.5) / 2.5) * w * 0.36 + (Math.random() - 0.5) * 0.06,
            oy: -h * 0.36 + (k % 3) * h * 0.24 + (Math.random() - 0.5) * 0.1,
            ph: Math.random() * 6.28,
            sz: 0.44 + Math.random() * 0.26
          };
          if (burnFlameInst) {
            lane.flames.push({
              position: new T.Vector3(),
              rotation: { x: 0, y: ry, z: 0 },
              scale: new T.Vector3(1, 1, 1),
              renderOrder: 4,
              userData: ud
            });
          } else {
            const m = new T.Mesh(flameGeo, flameMat); m.rotation.y = ry; m.renderOrder = 4;
            m.userData = ud;
            root.add(m); lane.flames.push(m);
          }
        }
      }
      const [wx, , wz] = worldXYZ(lane);
      // Scorch the floor tiles around the burning target stand
      fx.char?.({ point: { x: wx, y: tg.origin.y, z: wz - 0.32 }, normal: { x: 0, y: 1, z: 0 }, size: 0.95 }, 0.85);
      fx.char?.({ point: { x: wx, y: tg.origin.y, z: wz + 0.28 }, normal: { x: 0, y: 1, z: 0 }, size: 0.88 }, 0.78);
      fx.sound?.('ignite', ...worldXYZ(lane));
    } else {
      setPivotDecalsVisible(t.pivot, false);
      fx.clearTargetMarks?.(index);
      const f = from ? root.worldToLocal(new T.Vector3(from.x, from.y, from.z)) : new T.Vector3(lane.centre.x, lane.centre.y, lane.centre.z - 2);
      t.pivot.visible = false;
      for (let k = 0; k < PIECES; k++) {
        const pw = 0.12 + Math.random() * 0.22, ph = 0.1 + Math.random() * 0.2;
        const geo = new T.BoxGeometry(pw, ph, 0.025); lane.own.push(geo);
        const m = new T.Mesh(geo, pieceMat);
        const x = lane.centre.x + (Math.random() - 0.5) * w * 0.8, y = lane.centre.y + (Math.random() - 0.5) * h * 0.8, z = lane.centre.z;
        m.position.set(x, y, z); m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        let dx = x - f.x, dz = z - f.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
        const sp = 1.4 + Math.random() * 2.6;
        root.add(m);
        lane.pieces.push({ m, vx: dx * sp + (Math.random() - 0.5) * 1.6, vy: 2 + Math.random() * 3.4, vz: dz * sp + (Math.random() - 0.5) * 1.6,
          wx: (Math.random() - 0.5) * 16, wy: (Math.random() - 0.5) * 16, wz: (Math.random() - 0.5) * 16, rest: false, hw: Math.max(pw, ph) / 2 });
      }
      fx.embers?.(...worldXYZ(lane), 18, 0.55);
      fx.sound?.('shatter', ...worldXYZ(lane));
    }
    return true;
  }

  function update(dt) {
    for (const [index, lane] of lanes) {
      const t = tg.targets[index];
      if (t && t.state !== 'wrecked') { t.state = 'wrecked'; if (lane.kind === 'burn') t.burned = true; if (lane.kind === 'blow') t.pivot.visible = false; }
      lane.t += dt;
      if (lane.kind === 'burn') burnStep(index, lane, dt, t); else pieceStep(lane, dt);
      if (lane.ash) {
        lane.ashT += dt;
        lane.ashMat.emissiveIntensity = 0.65 * Math.pow(1 - clamp01(lane.ashT / ASH_GLOW_S), 1.6);
      }
    }
    syncBurnFlames();
  }

  function burnStep(index, lane, dt, t) {
    if (lane.t < BURN_S) {
      const burnU = clamp01(lane.t / SINK_FROM);
      lane.mat.color.setRGB(1 - 0.94 * burnU, 1 - 0.96 * burnU, 1 - 0.97 * burnU);
      if (lane.mat.emissive) {
        lane.mat.emissive.setRGB(0.95, 0.28, 0.04);
        lane.mat.emissiveIntensity = 0.62 * Math.sin(burnU * Math.PI);
      }
      if (!lane.decalsCleared && lane.t > SINK_FROM * 0.55) {
        lane.decalsCleared = true;
        setPivotDecalsVisible(lane.pivot, false);
        fx.clearTargetMarks?.(index);
      }
      const grow = lane.t < SINK_FROM ? Math.min(1, lane.t / 0.28) : 1 - clamp01((lane.t - SINK_FROM) / (BURN_S - SINK_FROM));
      const sinkK = lane.t > SINK_FROM ? ease(clamp01((lane.t - SINK_FROM) / (BURN_S - SINK_FROM))) : 0;
      lane.flames.forEach((m, k) => {
        const d = m.userData;
        const flick = 0.78 + 0.22 * Math.sin(lane.t * 16 + d.ph) + 0.14 * Math.sin(lane.t * 29 + d.ph * 1.9);
        const sway = Math.sin(lane.t * 11 + d.ph) * 0.045;
        const sz = d.sz * grow * flick;
        const curY = (lane.centre.y + d.oy) * (1 - 0.72 * sinkK) + STAND_TOP * 0.72 * sinkK;
        m.position.set(lane.centre.x + d.ox + sway, curY + sz * 0.42, lane.centre.z + ((k % 3) - 1) * 0.035);
        m.rotation.z = sway * 1.8;
        m.scale.set(sz * 0.85, sz * 1.65, 1);
      });
      lane.emberT -= dt;
      if (lane.emberT <= 0) {
        lane.emberT = 0.09;
        const [wx, wy, wz] = worldXYZ(lane);
        fx.embers?.(wx, STAND_TOP + (wy - STAND_TOP) * (1 - 0.7 * sinkK), wz, 3, 0.35);
      }
      if (lane.t > SINK_FROM) {
        lane.pivot.scale.set(1 - 0.18 * sinkK, Math.max(0.001, 1 - sinkK), 1);
        if (!lane.ash) makeAsh(lane, 0.28);
        const size = 0.28 + 0.72 * sinkK;
        lane.ash.scale.set(size, size * 0.95, size);
        lane.ash.position.y = STAND_TOP;
      }
    } else if (lane.flames.length || lane.pivot.visible) {
      for (const m of lane.flames) m.parent?.remove(m);
      lane.flames.length = 0;
      setPivotDecalsVisible(lane.pivot, false);
      fx.clearTargetMarks?.(index);
      lane.pivot.visible = false;
      lane.pivot.scale.set(1, 1, 1);
      if (t) {
        t.plate.material = lane.mat0;
        t.plate.visible = true;
        t.plate.scale.set(1, 1, 1);
      }
      if (!lane.ash) makeAsh(lane, 1);
      lane.ash.scale.set(1, 0.95, 1);
      lane.ash.position.y = STAND_TOP;
      const [wx, , wz] = worldXYZ(lane);
      fx.embers?.(wx, tg.origin.y + STAND_TOP + 0.12, wz, 5, 0.3);
    }
  }

  function pieceStep(lane, dt) {
    const s = Math.min(dt, 0.05);
    for (const p of lane.pieces) {
      if (p.rest) continue;
      p.vy -= GRAVITY * s;
      const drag = Math.exp(-1.1 * s); p.vx *= drag; p.vz *= drag;
      p.m.position.x += p.vx * s; p.m.position.y += p.vy * s; p.m.position.z += p.vz * s;
      p.m.rotation.x += p.wx * s; p.m.rotation.y += p.wy * s; p.m.rotation.z += p.wz * s;
      if (p.m.position.y < p.hw * 0.4 + 0.01) {
        p.m.position.y = p.hw * 0.4 + 0.01;
        if (Math.abs(p.vy) < 1.6) { p.rest = true; p.m.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4; p.m.rotation.z = Math.random() * 6; continue; }
        p.vy *= -0.32; p.vx *= 0.6; p.vz *= 0.6; p.wx *= 0.5; p.wy *= 0.5; p.wz *= 0.5;
      }
    }
  }

  function restore(index) {
    const lane = lanes.get(index);
    const t = tg.targets[index];
    if (lane) {
      for (const m of lane.flames) m.parent?.remove(m);
      for (const p of lane.pieces) p.m.parent?.remove(p.m);
      if (lane.ash) lane.ash.parent?.remove(lane.ash);
      if (t) t.plate.material = lane.mat0;
      for (const o of lane.own) o.dispose?.();
      lanes.delete(index);
    }
    if (t) {
      delete t.burned;
      t.pivot.visible = true;
      t.pivot.scale.set(1, 1, 1);
      t.plate.visible = true;
      t.plate.scale.set(1, 1, 1);
      setPivotDecalsVisible(t.pivot, true);
      if (t.state === 'wrecked') { t.state = 'up'; t.t = 0; t.pivot.rotation.x = 0; }
      ensureTargetSolid(index, true);
    }
    syncBurnFlames();
  }

  function clear() {
    for (const index of [...lanes.keys()]) restore(index);
    for (let i = 0; i < base; i++) {
      const t = tg.targets[i];
      if (t && (t.burned || t.state === 'wrecked')) restore(i);
    }
    syncBurnFlames();
  }

  function prepareWarmup() {
    makeShared();
    const root = tg.group;
    let f = null;
    if (burnFlameInst && !burnFlameDrawn) {
      _fPos.set(0, -5, 0); _fQuat.identity(); _fScl.setScalar(0.01);
      _localM.compose(_fPos, _fQuat, _fScl);
      burnFlameInst.setMatrixAt(0, _localM);
      burnFlameDrawn = 1;
      burnFlameInst.instanceMatrix.needsUpdate = true;
      burnFlameInst.visible = true;
    } else if (!burnFlameInst) {
      f = new T.Mesh(flameGeo, flameMat); f.renderOrder = 4; f.scale.setScalar(0.01); f.position.set(0, -5, 0);
      root.add(f);
    }
    const a = new T.Mesh(ashGeo, ashMat0); a.scale.setScalar(0.01); a.position.set(0, -5, 0);
    const p = new T.Mesh(new T.BoxGeometry(0.05, 0.05, 0.02), pieceMat); p.position.set(0, -5, 0);
    root.add(a); root.add(p);
    return () => {
      if (f) root.remove(f);
      syncBurnFlames();
      root.remove(a); root.remove(p); p.geometry.dispose?.();
    };
  }

  function dispose() {
    clear();
    if (burnFlameInst) {
      burnFlameInst.parent?.remove(burnFlameInst);
      burnFlameInst.dispose?.();
      burnFlameInst = null; burnFlameDrawn = 0;
    }
    for (const o of shared) o.dispose?.();
    shared.length = 0; flameMat = flameGeo = ashMat0 = ashGeo = pieceMat = null;
  }

  return {
    take: (index, kind, from) => begin(index, kind === 'blow' ? 'blow' : 'burn', from),
    isWrecked: (index) => lanes.has(index),
    isBurned: (index) => lanes.get(index)?.kind === 'burn' || !!tg.targets[index]?.burned,
    restore,
    reset: clear,
    prepareWarmup,
    any: () => lanes.size > 0,
    count: () => lanes.size,
    update, clear, dispose,
    debug: () => [...lanes].map(([index, l]) => ({
      index, kind: l.kind, t: l.t, ash: !!l.ash, ashSize: l.ash ? l.ash.scale.x : 0, flames: l.flames.length, pieces: l.pieces.length,
      resting: l.pieces.filter((p) => p.rest).length,
      p0: l.pieces[0] ? { y: +l.pieces[0].m.position.y.toFixed(2), x: +l.pieces[0].m.position.x.toFixed(2), z: +l.pieces[0].m.position.z.toFixed(2), vy: +l.pieces[0].vy.toFixed(2), rest: l.pieces[0].rest } : null,
      plateVisible: l.pivot.visible, plateColor: l.mat ? l.mat.color.r : null,
    })),
  };
}
