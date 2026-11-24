// world/training-hitfx.js - CG-7 step 4 (Jerry D-237 #11: "more effects to feel like you are really shooting the place
// up"). What a round knocks off what it hits, by material: sparks off steel, chips and a puff of dust off concrete,
// splinters off wood, shards off glass and the mug's china, bits of paper, flakes of plastic. Claude 7's file.
//
// Cheap by design: every bit lives in one of three pooled meshes (lit bits, glowing sparks, soft dust), each one draw
// while anything flies and none at rest (hidden, draw range 0). Capacity is fixed (HITFX.max); a new burst takes the oldest bits when
// full. Nothing is allocated per frame. The shell calls spawn() next to the impact mark (training.impacts.add) and
// update(dt) with the rest of Training; clear() on Clear all and on leaving.
//
//   createTrainingHitFx(T, { parent, origin, floorY?, surfaces? }) -> {   surfaces: tg.kitProps.surfaces (the bench's worktop)
//     spawn(kind, point, normal, dir?, scale?) -> bits added     kind: a key of HITFX.kinds, world point and normal
//     hit(hit, dir?, scale?) -> bits added                       a trace hit ({ solid, point, normal }): kind from the solid
//     kindOf(solid) -> kind                                       solid.fx if set, else from its flags
//     (CG-7 s3: hit() asks kindOfHit(hit): a box's top or sides may say their own kind, solid.fxUp / solid.fxFace)
//     update(dt, camera?) -> bits alive (0 at once when none), clear(), count(), dispose(), meshes: [lit, glow, dust]
//   }
//   Dust (Director 22 Nov: the impact puffs read as flat beige hexagons): each puff is a soft round blob, a radial-alpha
//   card, smaller and tinted by what was hit. Given the camera it is one card facing it; without, three crossed cards.

export const HITFX = Object.freeze({
  max: 384,            // bits at once, all three meshes together (a little bigger than life: they read at play distance)
  g: 9.8, paperG: 1.4,
  kinds: Object.freeze({
    //          n: bits a hit, speed m/s [min, max], life s [min, max], size m [long, wide, thin], colours, how it moves
    steel: Object.freeze([
      { n: 1, glow: true, speed: [0, 0], life: [0.04, 0.06], size: [0.07, 0.07, 0.07], col: [0xfff0c8], cone: 0, spin: 0 },   // the hot flash where it struck (Claude 10's pick)
      { n: 12, glow: true, speed: [3.5, 8], life: [0.1, 0.28], size: [0.09, 0.007, 0.007], col: [0xffe2b0, 0xffb860, 0xff9a40], stretch: true, cone: 0.9 },
      { n: 3, speed: [1, 2], life: [0.5, 0.8], size: [0.014, 0.011, 0.003], col: [0x55575a, 0x6e6a62], cone: 0.7 },
      { n: 2, dust: true, speed: [0.2, 0.4], life: [0.3, 0.45], size: [0.05, 0.05, 0.05], col: [0x8e8a82], cone: 0.8 }]),
    concrete: Object.freeze([
      { n: 10, speed: [1.4, 3.4], life: [0.8, 1.3], size: [0.026, 0.02, 0.014], col: [0x8f8b84, 0xa39f97, 0x77736d], cone: 0.75, bounce: 0.3 },
      { n: 6, dust: true, speed: [0.3, 0.9], life: [0.6, 1.1], size: [0.09, 0.09, 0.09], col: [0xa9a59d, 0x99958d], cone: 1.1 }]),
    wood: Object.freeze([
      { n: 10, speed: [1.6, 3.6], life: [0.9, 1.4], size: [0.075, 0.01, 0.005], col: [0xa47c4f, 0xc8a26c, 0x8a6440], cone: 0.8, spin: 18, bounce: 0.2 },
      { n: 3, dust: true, speed: [0.2, 0.6], life: [0.45, 0.8], size: [0.06, 0.06, 0.06], col: [0x9c8263], cone: 1.0 }]),
    glass: Object.freeze([
      { n: 14, speed: [1.5, 3.8], life: [1.0, 1.7], size: [0.036, 0.026, 0.002], col: [0xd8e6ea, 0xbfd3d9, 0xeef4f5], cone: 0.95, spin: 15, bounce: 0.35, shine: 0.28 }]),
    amberGlass: Object.freeze([
      { n: 12, speed: [1.6, 3.8], life: [1.0, 1.6], size: [0.036, 0.024, 0.003], col: [0xf2b845, 0xffd272, 0xd48e22], cone: 0.95, spin: 14, bounce: 0.32, shine: 0.3 },
      { n: 6, glow: true, speed: [2.5, 6.0], life: [0.1, 0.24], size: [0.075, 0.007, 0.007], col: [0xffe8a6, 0xffb848], stretch: true, cone: 0.9 }]),
    phosphor: Object.freeze([
      { n: 14, speed: [0.9, 3.0], life: [1.0, 1.7], size: [0.034, 0.02, 0.002], col: [0xe6f2f6, 0xd2e4ec, 0xffffff], cone: 1.0, spin: 16, bounce: 0.3, shine: 0.3 },
      { n: 8, dust: true, speed: [0.2, 0.85], life: [0.8, 1.5], size: [0.16, 0.16, 0.16], col: [0xeaf2f6, 0xd8e4ea], cone: 1.2 },
      { n: 5, glow: true, speed: [2.2, 5.2], life: [0.08, 0.2], size: [0.07, 0.006, 0.006], col: [0xd4f2ff, 0xfff4d0], stretch: true, cone: 1.0 }]),
    china: Object.freeze([
      { n: 10, speed: [1.4, 3.2], life: [0.9, 1.4], size: [0.028, 0.02, 0.004], col: [0xece8df, 0xd9d4c8], cone: 0.85, spin: 12, bounce: 0.3 }]),
    coffee: Object.freeze([
      { n: 12, speed: [1.2, 3.2], life: [0.45, 0.85], size: [0.048, 0.012, 0.012], col: [0x2b170b, 0x452613, 0x1e0f07], stretch: true, cone: 1.1, bounce: 0.05 },
      { n: 4, dust: true, speed: [0.15, 0.55], life: [0.45, 0.85], size: [0.075, 0.075, 0.075], col: [0x6e4e38, 0xc8bfb4], cone: 0.9 }]),
    water: Object.freeze([
      { n: 16, speed: [1.4, 3.8], life: [0.45, 0.85], size: [0.058, 0.013, 0.013], col: [0x8ea6ae, 0xa8bcc4, 0x748c94], stretch: true, cone: 1.1, bounce: 0.05 },
      { n: 6, dust: true, speed: [0.3, 0.9], life: [0.5, 0.95], size: [0.11, 0.11, 0.11], col: [0xb2c4ca, 0x9ab0b8], cone: 1.0 }]),
    saline: Object.freeze([
      { n: 18, speed: [1.5, 4.0], life: [0.45, 0.9], size: [0.054, 0.011, 0.011], col: [0xcceef6, 0xe8f9fc, 0x9cd6e4], stretch: true, cone: 1.15, bounce: 0.06, shine: 0.2 },
      { n: 6, dust: true, speed: [0.25, 0.85], life: [0.5, 0.9], size: [0.1, 0.1, 0.1], col: [0xd6f0f6, 0xeaf8fc], cone: 1.1 }]),
    electronics: Object.freeze([
      { n: 1, glow: true, speed: [0, 0], life: [0.05, 0.08], size: [0.11, 0.11, 0.11], col: [0xdcf6ff], cone: 0, spin: 0 },
      { n: 14, glow: true, speed: [2.8, 7.2], life: [0.12, 0.34], size: [0.095, 0.008, 0.008], col: [0xc2f0ff, 0xffda84, 0xffa642, 0x8ad8ff], stretch: true, cone: 1.1 },
      { n: 8, speed: [1.2, 3.0], life: [0.9, 1.4], size: [0.026, 0.018, 0.004], col: [0x1e2326, 0x225a34, 0x3a4044, 0xb8893a], cone: 0.9, spin: 15, bounce: 0.28 },
      { n: 6, dust: true, speed: [0.25, 0.85], life: [0.9, 1.7], size: [0.14, 0.14, 0.14], col: [0x3c4146, 0x52585e], cone: 1.0 }]),
    gas: Object.freeze([
      { n: 4, dust: true, speed: [2.8, 5.6], life: [0.22, 0.48], size: [0.13, 0.13, 0.13], col: [0xebf7fc, 0xd4eaf4], cone: 0.22 },
      { n: 2, glow: true, speed: [4.5, 7.5], life: [0.06, 0.12], size: [0.08, 0.008, 0.008], col: [0xe6f8ff], stretch: true, cone: 0.16 }]),
    brass: Object.freeze([
      { n: 1, glow: true, speed: [0, 0], life: [0.04, 0.06], size: [0.065, 0.065, 0.065], col: [0xfff0c8], cone: 0, spin: 0 },
      { n: 8, glow: true, speed: [3.0, 6.8], life: [0.1, 0.24], size: [0.08, 0.006, 0.006], col: [0xffe09a, 0xffb858], stretch: true, cone: 0.9 },
      { n: 8, speed: [1.4, 3.4], life: [0.9, 1.5], size: [0.028, 0.008, 0.008], col: [0xc89a42, 0xb8893a, 0xdfc068], cone: 1.0, spin: 20, bounce: 0.42, shine: 0.2 }]),
    chalk: Object.freeze([
      { n: 7, dust: true, speed: [0.2, 0.75], life: [0.65, 1.2], size: [0.11, 0.11, 0.11], col: [0xeeece6, 0xd6dce8], cone: 1.1 },
      { n: 5, speed: [1.0, 2.4], life: [0.7, 1.1], size: [0.018, 0.012, 0.005], col: [0x2c3236, 0x1b3c8c, 0xb3261e], cone: 0.85, spin: 12, bounce: 0.3 }]),
    paper: Object.freeze([
      { n: 10, paper: true, speed: [0.9, 2], life: [1.6, 2.6], size: [0.03, 0.022, 0.001], col: [0xeae4d2, 0xf3efe2, 0xd9d2bd], cone: 1.0, spin: 6 }]),
    sand: Object.freeze([
      { n: 7, dust: true, speed: [0.3, 1.0], life: [0.6, 1.2], size: [0.09, 0.09, 0.09], col: [0xa8956f, 0x96855f], cone: 1.0 },
      { n: 8, speed: [1, 2.4], life: [0.6, 1.0], size: [0.008, 0.007, 0.006], col: [0x9c8a6a, 0x8a7a5c], cone: 0.8, bounce: 0.1 }]),
    burlap: Object.freeze([
      { n: 12, dust: true, speed: [0.35, 1.4], life: [0.9, 1.8], size: [0.18, 0.18, 0.18], col: [0xb29e78, 0x9c8a66], cone: 1.2 },
      { n: 14, speed: [1.2, 3.2], life: [0.7, 1.2], size: [0.014, 0.012, 0.010], col: [0xab9770, 0x8f7d5b, 0xbfa982], cone: 1.0, bounce: 0.1 },
      { n: 7, paper: true, speed: [1.0, 2.4], life: [1.3, 2.1], size: [0.048, 0.026, 0.003], col: [0x8c7b58, 0x736344], cone: 1.0, spin: 8 }]),
    ember: Object.freeze([
      { n: 10, glow: true, speed: [1.2, 3.8], life: [0.35, 0.85], size: [0.026, 0.01, 0.01], col: [0xffd270, 0xff8a2c, 0xff5214], stretch: true, cone: 1.1 },
      { n: 8, paper: true, speed: [0.4, 1.4], life: [1.2, 2.2], size: [0.026, 0.018, 0.002], col: [0x22201e, 0x36322e, 0x181614], cone: 1.0, spin: 7 },
      { n: 5, dust: true, speed: [0.2, 0.65], life: [0.7, 1.3], size: [0.13, 0.13, 0.13], col: [0x383430, 0x4c4844], cone: 1.0 }]),
    cloth: Object.freeze([
      { n: 6, paper: true, speed: [0.6, 1.4], life: [1.0, 1.6], size: [0.014, 0.008, 0.002], col: [0x4a4535, 0x5a5444], cone: 0.9, spin: 5 }]),
    plastic: Object.freeze([
      { n: 8, speed: [1.4, 3], life: [0.8, 1.2], size: [0.022, 0.016, 0.004], col: [0x3a3d3b, 0x4a4e4a], cone: 0.8, spin: 12, bounce: 0.35 }]),
    // CG-7 s3: the firing bench's ribbed mat (black crumbs that bounce, a dark puff, no sparks) and its painted kick panel
    // (the steel flash and fewer sparks, and flecks of its green paint)
    rubber: Object.freeze([
      { n: 9, speed: [1.2, 2.8], life: [0.7, 1.1], size: [0.012, 0.009, 0.006], col: [0x1e2422, 0x2a302d, 0x343a37], cone: 0.8, spin: 10, bounce: 0.45 },
      { n: 3, dust: true, speed: [0.2, 0.5], life: [0.35, 0.6], size: [0.055, 0.055, 0.055], col: [0x4a4d4a], cone: 0.9 }]),
    paint: Object.freeze([
      { n: 1, glow: true, speed: [0, 0], life: [0.04, 0.06], size: [0.06, 0.06, 0.06], col: [0xfff0c8], cone: 0, spin: 0 },
      { n: 8, glow: true, speed: [3, 7], life: [0.08, 0.22], size: [0.08, 0.006, 0.006], col: [0xffe2b0, 0xffb860], stretch: true, cone: 0.9 },
      { n: 6, speed: [1, 2.4], life: [0.7, 1.1], size: [0.016, 0.012, 0.0015], col: [0x39463e, 0x4b5a50, 0x2f3a33], cone: 0.8, spin: 14, bounce: 0.25 },
      { n: 2, dust: true, speed: [0.2, 0.4], life: [0.3, 0.45], size: [0.05, 0.05, 0.05], col: [0x7e8278], cone: 0.8 }])
  }),
  // kit props (world/training-kitprops.js) by id
  kit: Object.freeze({ mug: 'china', medMug: 'china', clipboard: 'paper', brassBucket: 'brass', pushBroom: 'wood', earTray: 'plastic', mopBucket: 'plastic', mop: 'wood', squeegee: 'wood', glove: 'cloth', sharpsBin: 'plastic', markers: 'chalk' })
});

// CG-7 s3: one box can be several materials by face: solid.fxUp on its top (from solid.fxUpMinZ on, world z), solid.fxFace
// on its sides below solid.fxFaceBelow (world y). Anything else: kindOfSolid.
export function kindOfHit(h) {
  const s = h && h.solid, n = h && h.normal, p = h && h.point;
  if (s && n && p) {
    if (s.fxUp && HITFX.kinds[s.fxUp] && n.y > 0.7 && (s.fxUpMinZ == null || p.z >= s.fxUpMinZ)) return s.fxUp;
    if (s.fxFace && HITFX.kinds[s.fxFace] && Math.abs(n.y) < 0.5 && (s.fxFaceBelow == null || p.y < s.fxFaceBelow)) return s.fxFace;
  }
  return kindOfSolid(s);
}

export function kindOfSolid(solid) {
  if (!solid) return 'concrete';
  if (solid.fx && HITFX.kinds[solid.fx]) return solid.fx;
  if (solid.kitProp) return HITFX.kit[solid.kitProp] || 'wood';
  if (solid.metal || solid.target != null || solid.firingLine || solid.lockerDoor || solid.containment) return 'steel';
  if (solid.wall || solid.column || solid.backstop || solid.floor) return 'concrete';
  // CG-7 step 5: a prop's box keeps the mesh it came from (world/training.js propSolids): its own say (userData.fx, set by
  // training-wear.js from its swatch), else its material: metal reads as steel; anything else unknown as concrete chips
  const m = solid.mesh, u = m && m.userData;
  if (u && u.fx && HITFX.kinds[u.fx]) return u.fx;
  const mt = m && m.material;
  if (mt && !Array.isArray(mt) && mt.metalness >= 0.35) return 'steel';
  return 'concrete';
}

// an octahedron, 8 triangles, 24 vertices (non-indexed): a chip, a sliver, a shard, a spark's streak, all by scale
const OCTA = (() => {
  const v = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const f = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
  const out = []; for (const t of f) for (const k of t) out.push(v[k]); return out;
})();
const PER = OCTA.length;   // 24
// a puff's card corners, two triangles (a puff is 1 card facing the camera, or 3 crossed: 6 or 18 of its 24 vertices;
// the rest sit on its centre, no area)
const CARD = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]], CARD_UV = CARD.map(([a, b]) => [(a + 1) / 2, (b + 1) / 2]);

export function createTrainingHitFx(T, { parent, origin = { x: 0, y: 0, z: 0 }, floorY = null, surfaces = [] } = {}) {
  const N = HITFX.max, O = origin, floor = floorY == null ? O.y : floorY;
  // the bits: state in flat arrays (world coordinates inside parent's frame = world minus origin when parent is the room)
  const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N);
  const vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
  const ax = new Float32Array(N), ay = new Float32Array(N), az = new Float32Array(N), ang = new Float32Array(N), spin = new Float32Array(N);
  const sx = new Float32Array(N), sy = new Float32Array(N), sz = new Float32Array(N);
  const life = new Float32Array(N), age = new Float32Array(N), flags = new Uint8Array(N), bounce = new Float32Array(N);
  const cr = new Float32Array(N), cg = new Float32Array(N), cb = new Float32Array(N);
  const F_GLOW = 1, F_DUST = 2, F_PAPER = 4, F_STRETCH = 8, F_REST = 16;
  let next = 0, alive = 0;

  // the puff's card: white, its alpha a soft round falloff (no edge, no corners), made once
  const puffTex = (() => {
    if (!T.DataTexture) return null;
    const S = 32, d = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const r = Math.hypot((x + 0.5) / S - 0.5, (y + 0.5) / S - 0.5) * 2, a = r >= 1 ? 0 : Math.pow(1 - r * r, 2.2), k = (y * S + x) * 4;
      d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = Math.round(a * 255);
    }
    const tex = new T.DataTexture(d, S, S);
    if (T.LinearFilter != null) { tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearFilter; }
    tex.generateMipmaps = false; tex.name = 'training-hitfx-puff'; tex.needsUpdate = true;
    return tex;
  })();
  const makeMesh = (glow, soft = false) => {
    const geo = new T.BufferGeometry();
    const pos = new T.BufferAttribute(new Float32Array(N * PER * 3), 3), nrm = new T.BufferAttribute(new Float32Array(N * PER * 3), 3), col = new T.BufferAttribute(new Float32Array(N * PER * 3), 3);
    if (pos.setUsage && T.DynamicDrawUsage != null) { pos.setUsage(T.DynamicDrawUsage); nrm.setUsage(T.DynamicDrawUsage); col.setUsage(T.DynamicDrawUsage); }
    geo.setAttribute('position', pos); geo.setAttribute('normal', nrm); geo.setAttribute('color', col);
    let uv = null;
    if (soft) {   // the cards' corners: written once, they never change
      uv = new T.BufferAttribute(new Float32Array(N * PER * 2), 2); const U = uv.array;
      for (let b = 0; b < N; b++) for (let v = 0; v < PER; v++) { const c = CARD_UV[v % 6], q = (b * PER + v) * 2; U[q] = c[0]; U[q + 1] = c[1]; }
      geo.setAttribute('uv', uv);
    }
    if (geo.setDrawRange) geo.setDrawRange(0, 0);
    const mat = glow ? new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
      : soft ? new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: puffTex ? 0.55 : 0.3, depthWrite: false, map: puffTex, side: T.DoubleSide })
      : new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
    mat.name = glow ? 'training-hitfx-sparks' : soft ? 'training-hitfx-dust' : 'training-hitfx-bits';
    const m = new T.Mesh(geo, mat); m.name = mat.name; m.frustumCulled = false; m.visible = false; m.castShadow = false; m.receiveShadow = false;
    m.raycast = () => {};
    if (parent) parent.add(m);
    return { mesh: m, geo, pos, nrm, col, mat, used: 0 };
  };
  const lit = makeMesh(false), glow = makeMesh(true), dust = makeMesh(false, true), MESHES = [lit, glow, dust];

  let seed = 0x2545f491;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; };
  const lerp = (r, a, b) => a + (b - a) * r;

  function take() {   // a free bit, or the oldest one
    for (let k = 0; k < N; k++) { const i = (next + k) % N; if (life[i] <= 0) { next = (i + 1) % N; return i; } }
    let old = 0, oa = -1; for (let i = 0; i < N; i++) if (age[i] / life[i] > oa) { oa = age[i] / life[i]; old = i; }
    alive--; return old;
  }

  function spawn(kind, point, normal, dir = null, scale = 1) {
    const recipe = HITFX.kinds[kind]; if (!recipe || !point) return 0;
    let nx = normal ? normal.x : 0, ny = normal ? normal.y : 1, nz = normal ? normal.z : 0; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    // most bits leave along the surface's normal, some skip along the round's reflection
    let rx = nx, ry = ny, rz = nz;
    if (dir) { const dl = Math.hypot(dir.x, dir.y, dir.z) || 1, dx = dir.x / dl, dy = dir.y / dl, dz = dir.z / dl, d2 = 2 * (dx * nx + dy * ny + dz * nz); rx = dx - d2 * nx; ry = dy - d2 * ny; rz = dz - d2 * nz; }
    let made = 0;
    for (const r of recipe) {
      const n = Math.max(1, Math.round(r.n * scale));
      for (let j = 0; j < n; j++) {
        const i = take();
        const mixR = rnd() * 0.45;
        let ux = nx * (1 - mixR) + rx * mixR + (rnd() - 0.5) * 2 * r.cone, uy = ny * (1 - mixR) + ry * mixR + (rnd() - 0.5) * 2 * r.cone * 0.8 + (r.dust ? 0.35 : 0.15), uz = nz * (1 - mixR) + rz * mixR + (rnd() - 0.5) * 2 * r.cone;
        const ul = Math.hypot(ux, uy, uz) || 1, sp = lerp(rnd(), r.speed[0], r.speed[1]) / ul;
        px[i] = point.x - O.x + nx * 0.004; py[i] = point.y - O.y + ny * 0.004; pz[i] = point.z - O.z + nz * 0.004;
        vx[i] = ux * sp; vy[i] = uy * sp; vz[i] = uz * sp;
        let a1 = rnd() - 0.5, a2 = rnd() - 0.5, a3 = rnd() - 0.5; const al = Math.hypot(a1, a2, a3) || 1; ax[i] = a1 / al; ay[i] = a2 / al; az[i] = a3 / al;
        ang[i] = rnd() * 6.283; spin[i] = (r.spin || 4) * (0.5 + rnd());
        const s = 0.7 + rnd() * 0.6; sx[i] = r.size[0] * s; sy[i] = r.size[1] * s; sz[i] = r.size[2] * s;
        life[i] = lerp(rnd(), r.life[0], r.life[1]); age[i] = 0; bounce[i] = r.bounce || 0.15;
        flags[i] = (r.glow ? F_GLOW : 0) | (r.dust ? F_DUST : 0) | (r.paper ? F_PAPER : 0) | (r.stretch ? F_STRETCH : 0);
        const c = r.col[Math.floor(rnd() * r.col.length) % r.col.length], sh = r.shine ? 1 + r.shine * rnd() : 1;
        cr[i] = Math.min(1, ((c >> 16) & 255) / 255 * sh); cg[i] = Math.min(1, ((c >> 8) & 255) / 255 * sh); cb[i] = Math.min(1, (c & 255) / 255 * sh);
        alive++; made++;
      }
    }
    return made;
  }

  // write one bit's 24 vertices into its mesh at place k
  function write(m, k, i, fade) {
    const P = m.pos.array, Nn = m.nrm.array, C = m.col.array, base = k * PER * 3;
    // its frame: x along the axis (or along the velocity for a streak), turned by ang about the axis
    let ex, ey, ez;
    if (flags[i] & F_STRETCH) { const l = Math.hypot(vx[i], vy[i], vz[i]) || 1; ex = vx[i] / l; ey = vy[i] / l; ez = vz[i] / l; }
    else { ex = ax[i]; ey = ay[i]; ez = az[i]; }
    // two more axes, then a turn by ang about ex
    let tx = Math.abs(ey) < 0.9 ? 0 : 1, ty = Math.abs(ey) < 0.9 ? 1 : 0, tz = 0;
    let fx = ey * tz - ez * ty, fy = ez * tx - ex * tz, fz = ex * ty - ey * tx; const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
    let gx = ey * fz - ez * fy, gy = ez * fx - ex * fz, gz = ex * fy - ey * fx;
    const ca = Math.cos(ang[i]), sa = Math.sin(ang[i]);
    const f2x = fx * ca + gx * sa, f2y = fy * ca + gy * sa, f2z = fz * ca + gz * sa, g2x = gx * ca - fx * sa, g2y = gy * ca - fy * sa, g2z = gz * ca - fz * sa;
    let lx = sx[i] * fade, ly = sy[i] * fade, lz = sz[i] * fade;
    if (flags[i] & F_STRETCH) lx = sx[i] * Math.min(1, 0.3 + Math.hypot(vx[i], vy[i], vz[i]) * 0.12) * fade;
    for (let v = 0; v < PER; v++) {
      const o = OCTA[v], a = o[0] * lx * 0.5, b = o[1] * ly * 0.5, c = o[2] * lz * 0.5, q = base + v * 3;
      P[q] = px[i] + ex * a + f2x * b + g2x * c; P[q + 1] = py[i] + ey * a + f2y * b + g2y * c; P[q + 2] = pz[i] + ez * a + f2z * b + g2z * c;
      Nn[q] = ex * o[0] + f2x * o[1] + g2x * o[2]; Nn[q + 1] = ey * o[0] + f2y * o[1] + g2y * o[2]; Nn[q + 2] = ez * o[0] + f2z * o[1] + g2z * o[2];
      C[q] = cr[i]; C[q + 1] = cg[i]; C[q + 2] = cb[i];
    }
  }

  // a puff: soft cards round its centre (the camera's right and up when it is known)
  let camOn = false; const cR = [1, 0, 0], cU = [0, 1, 0];
  const A1 = [0, 0, 0], B1 = [0, 0, 0], E1 = [0, 0, 0];   // (reused: nothing allocated a frame)
  function writePuff(m, k, i, fade) {
    const P = m.pos.array, Nn = m.nrm.array, C = m.col.array, base = k * PER * 3, r = sx[i] * fade * 0.5;
    E1[0] = ax[i]; E1[1] = ay[i]; E1[2] = az[i];
    if (camOn) { A1[0] = cR[0]; A1[1] = cR[1]; A1[2] = cR[2]; B1[0] = cU[0]; B1[1] = cU[1]; B1[2] = cU[2]; }
    else {   // two axes square to the bit's own, turned by its angle
      let fx = E1[1], fy = -E1[0]; const l = Math.hypot(fx, fy); if (l < 1e-3) { fx = 1; fy = 0; } else { fx /= l; fy /= l; }
      const gx = -E1[2] * fy, gy = E1[2] * fx, gz = E1[0] * fy - E1[1] * fx, ca = Math.cos(ang[i]), sa = Math.sin(ang[i]);
      A1[0] = fx * ca + gx * sa; A1[1] = fy * ca + gy * sa; A1[2] = gz * sa; B1[0] = gx * ca - fx * sa; B1[1] = gy * ca - fy * sa; B1[2] = gz * ca;
    }
    const cards = camOn ? 1 : 3;
    for (let v = 0; v < PER; v++) {
      const q = base + v * 3, card = (v / 6) | 0, c = CARD[v % 6], a = card === 1 ? E1 : A1, b = card === 2 ? E1 : B1, s = card < cards ? r : 0;
      P[q] = px[i] + (a[0] * c[0] + b[0] * c[1]) * s; P[q + 1] = py[i] + (a[1] * c[0] + b[1] * c[1]) * s; P[q + 2] = pz[i] + (a[2] * c[0] + b[2] * c[1]) * s;
      Nn[q] = 0; Nn[q + 1] = 1; Nn[q + 2] = 0;
      C[q] = cr[i]; C[q + 1] = cg[i]; C[q + 2] = cb[i];
    }
  }

  // prime(on): each of the three meshes drawn once with one bit that has no size, so its pipeline and buffers are made at
  // the warm-up, not on the first shot (the same first-use cost ChatGPT measured on the kit props). The shell's Training
  // warm-up calls prime(true) before its compile and prime(false) after; if it does not, update() primes on its first
  // frame and clears on its second.
  let primed = false, priming = false;
  function prime(on) {
    priming = !!on; if (on) primed = true;
    for (const m of MESHES) {
      if (on) { m.pos.array.fill(0, 0, PER * 3); m.pos.needsUpdate = true; if (m.geo.setDrawRange) m.geo.setDrawRange(0, PER); m.mesh.visible = true; }
      else if (!alive) { m.mesh.visible = false; if (m.geo.setDrawRange) m.geo.setDrawRange(0, 0); }
    }
    return on ? MESHES.length : 0;
  }

  function update(dt, camera = null) {
    if (!primed) { if (!alive) return prime(true), 0; primed = true; }   // (bits already flying: their own draw compiles it)
    if (priming) prime(false);
    if (!alive) {
      for (const m of MESHES) if (m.mesh.visible) { m.mesh.visible = false; if (m.geo.setDrawRange) m.geo.setDrawRange(0, 0); }
      return 0;
    }
    dt = Math.min(dt, 1 / 30);
    camOn = false;
    if (camera && camera.matrixWorld) {   // the camera's right and up, in the parent's frame (the room is not turned)
      const e = camera.matrixWorld.elements; cR[0] = e[0]; cR[1] = e[1]; cR[2] = e[2]; cU[0] = e[4]; cU[1] = e[5]; cU[2] = e[6];
      const lr = Math.hypot(cR[0], cR[1], cR[2]) || 1, lu = Math.hypot(cU[0], cU[1], cU[2]) || 1;
      for (let j = 0; j < 3; j++) { cR[j] /= lr; cU[j] /= lu; }
      camOn = true;
    }
    const gy0 = floor - O.y;
    let nl = 0, ng = 0, nd = 0; alive = 0;
    for (let i = 0; i < N; i++) {
      if (life[i] <= 0) continue;
      age[i] += dt;
      if (age[i] >= life[i]) { life[i] = 0; continue; }
      alive++;
      const f = flags[i];
      if (!(f & F_REST)) {
        if (f & F_DUST) { vx[i] *= 1 - Math.min(1, 3 * dt); vz[i] *= 1 - Math.min(1, 3 * dt); vy[i] = vy[i] * (1 - Math.min(1, 3 * dt)) + 0.15 * dt; }
        else if (f & F_PAPER) { vy[i] -= HITFX.paperG * dt; const k = 1 - Math.min(1, 2.2 * dt); vx[i] *= k; vy[i] *= k; vz[i] *= k; vx[i] += Math.sin(age[i] * 7 + i) * 0.5 * dt; vz[i] += Math.cos(age[i] * 6 + i) * 0.5 * dt; }
        else vy[i] -= HITFX.g * dt;
        px[i] += vx[i] * dt; py[i] += vy[i] * dt; pz[i] += vz[i] * dt;
        ang[i] += spin[i] * dt;
        let gy = gy0;   // the floor, or a worktop it is over and came down onto (local surfaces, as world/training-kitprops.js)
        for (let k = 0; k < surfaces.length; k++) { const S = surfaces[k]; if (px[i] > S.minX && px[i] < S.maxX && pz[i] > S.minZ && pz[i] < S.maxZ && py[i] >= S.y - 0.05 && S.y > gy) gy = S.y; }
        if (py[i] < gy + sz[i] * 0.5 && !(f & F_DUST)) {
          py[i] = gy + sz[i] * 0.5;
          if (f & F_GLOW) { vy[i] = Math.abs(vy[i]) * 0.3; vx[i] *= 0.6; vz[i] *= 0.6; }
          else if (vy[i] < -0.5 && !(f & F_PAPER)) { vy[i] = -vy[i] * bounce[i]; vx[i] *= 0.5; vz[i] *= 0.5; spin[i] *= 0.5; }
          else { vx[i] = vy[i] = vz[i] = 0; spin[i] = 0; flags[i] |= F_REST; ax[i] = 0; ay[i] = 1; az[i] = 0; sz[i] = Math.min(sz[i], sy[i]); }
        }
      }
      // fade: sparks shrink from the start, dust grows then goes, the rest shrink over their last 30%
      const t = age[i] / life[i];
      const fade = (f & F_GLOW) ? 1 - t * 0.7 : (f & F_DUST) ? (0.45 + 0.9 * t) * Math.min(1, (1 - t) * 3) : (t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3);
      if (f & F_GLOW) write(glow, ng++, i, fade); else if (f & F_DUST) writePuff(dust, nd++, i, fade); else write(lit, nl++, i, fade);
    }
    for (const [m, n] of [[lit, nl], [glow, ng], [dust, nd]]) {
      m.used = n; m.mesh.visible = n > 0;
      if (m.geo.setDrawRange) m.geo.setDrawRange(0, n * PER);
      if (n) { m.pos.needsUpdate = true; m.nrm.needsUpdate = true; m.col.needsUpdate = true; }
    }
    return alive;
  }

  function spawnJet(kind, point, dir, scale = 1) {
    return spawn(kind, point, dir, null, scale);
  }

  function clear() { life.fill(0); flags.fill(0); alive = 0; next = 0; for (const m of MESHES) { m.used = 0; m.mesh.visible = false; if (m.geo.setDrawRange) m.geo.setDrawRange(0, 0); } }
  function dispose() { clear(); for (const m of MESHES) { if (m.mesh.parent) m.mesh.parent.remove(m.mesh); m.geo.dispose(); m.mat.dispose(); } if (puffTex) puffTex.dispose(); }
  const hit = (h, dir = null, scale = 1) => (h ? spawn(kindOfHit(h), h.point, h.normal, dir, scale) : 0);   // CG-7 s3: by face
  return { spawn, spawnJet, hit, kindOf: kindOfSolid, update, clear, count: () => alive, dispose, prime, meshes: MESHES.map((m) => m.mesh) };
}
