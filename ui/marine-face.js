// CC-340 (Claude 3; Jerry, 10 Nov 2026, J125: "refine the anatomical fidelity of our player model. And the head."):
// the head, the neck, the face and the balaclava are built from one skull measured in metres (studio/marine-skull.js),
// about 22 cm chin to crown and 16 cm across on his 1.58 m body (it was 26.5 and 23.5: the head of a child on a man),
// with a brow, sockets the eyes sit in, cheekbones, a nose, lips, a chin, the jaw's angle and a neck that carries it
// forward. The head group is scaled by HEAD_GROUP_SCALE (index.html makeMarine uses it). The skull above the eyes is
// HEAD_RINGS as it was, so everything fitted to it (the hats, the helmet, the hair, the eyewear) still fits.
import { HEAD_GROUP_SCALE, PIVOT_Y, EYE, lidMargin, skinPoint, offSkin, rowAt, rowSteps, columnAngles, faceZ, sideX, surfaceGeometry, worldGroup, toLocal, ROWS } from '../studio/marine-skull.js';
export { HEAD_GROUP_SCALE };
// GP-105. Head-local surfaces; the existing rig and wardrobe own their materials.
// Rings run bottom to top. Front is +z. A shared vertex grid keeps cloth and skin
// softly shaded without adding an asset loader, texture or per-frame work.
// CL-197 (Jerry, 2026-10-15: "the weird vertical line in the marine's head"): a ring surface runs round from a = -pi to
// +pi, so its first and last columns sit on the same spot at the back of the head but are separate vertices, each
// shaded only from its own side: a crease straight down the back. weldSeam gives both columns one shared normal.
// cols = vertices per ring (segments + 1); the last ring may be a pole, which gets a plain up normal.
export function weldSeam(geo, cols, pole = false) {
  const N = geo.attributes.normal, rows = N.count / cols;
  for (let r = 0; r < rows; r++) {
    const a = r * cols, b = a + cols - 1;
    const x = N.getX(a) + N.getX(b), y = N.getY(a) + N.getY(b), z = N.getZ(a) + N.getZ(b), l = Math.hypot(x, y, z) || 1;
    N.setXYZ(a, x / l, y / l, z / l); N.setXYZ(b, x / l, y / l, z / l);
  }
  if (pole) for (let j = 0; j < cols; j++) N.setXYZ((rows - 1) * cols + j, 0, 1, 0);
  N.needsUpdate = true;
  return geo;
}
// GP-19970: a narrow cloth pocket clears the existing sculpted nose.
// Only the upper/front mask moves; eye-opening height and cheek/collar fit stay fixed.

export const HEAD_RINGS = [
    [1.275,.035,.09,.048], [1.283,.052,.110,.060], [1.291,.065,.127,.07],
    [1.309,.084,.141,.083], [1.323,.094,.149,.09], [1.343,.106,.151,.101],
    [1.365,.115,.152,.111], [1.383,.122,.151,.118],
    [1.402,.124,.151,.122], [1.428,.125,.150,.124], [1.455,.125,.148,.125],
    [1.481,.122,.140,.123], [1.50,.118,.13,.12], [1.521,.104,.115,.107],
    [1.534,.085,.094,.087], [1.544,.045,.050,.046], [1.548,.001,.001,.001]
];
// Half-width, front and back radius of the head at height y (what a hat, hair or an ear is fitted to).
export function headRadiusAt(y) {
  const p = HEAD_RINGS; let i = 1;
  while (i < p.length - 1 && p[i][0] < y) i++;
  const a = p[i - 1], b = p[i], t = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0])));
  return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
}

const fadeTextures = new WeakMap();
// CL-197 (Jerry, 2026-10-15: "improvement to the marine's hair"). The old crop was one dark dome with a hard rim and a
// dotted line where its two meshes met. This one follows the head surface itself: a short, thick top with swept clumps
// and a little lift at the front, a real hairline (a crisp forehead line, a sideburn, a clear gap above and behind
// each ear, a tapered nape) and a medium fade up the back and sides. The fade shares the live hair colour; only its
// coverage thins toward the skin. A single small local texture is reused by every marine, with no frame updates.
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const HAIRLINE = [[0, 1.4895], [.5, 1.4835], [.95, 1.4725], [1.12, 1.462], [1.27, 1.43], [1.40, 1.447], [1.57, 1.452], [1.78, 1.446], [2.05, 1.428], [2.5, 1.411], [3.1416, 1.402]];
function hairline(phi) {
  let i = 1; while (i < HAIRLINE.length - 1 && HAIRLINE[i][0] < phi) i++;
  const a = HAIRLINE[i - 1], b = HAIRLINE[i], t = Math.max(0, Math.min(1, (phi - a[0]) / (b[0] - a[0])));
  return a[1] + (b[1] - a[1]) * (.5 - .5 * Math.cos(t * Math.PI));
}
export function buildMarineHair(T, hairMaterial) {
  const group = new T.Group(); group.name = 'medium-fade';
  const n = 64, APEX = HEAD_RINGS[HEAD_RINGS.length - 2][0] + .004;
  function grid(rows, rowY, rowLift, name, cast, mat, alphaV) {
    const p = [], uv = [], ix = [];
    for (let row = 0; row <= rows; row++) for (let j = 0; j <= n; j++) {
      const a = -Math.PI + j / n * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), phi = Math.abs(a);
      const t = row / rows, yh = rowY(phi, t), lift = rowLift(phi, t, yh, a);
      // CC-340: on the new skull itself (studio/marine-skull.js), its lift in metres (the old head's units were 0.7 m)
      const yw = (Math.min(yh, APEX - .004) - PIVOT_Y) * HEAD_GROUP_SCALE[1];
      const q = toLocal(offSkin(a, yw, lift * .7, lift * sstep(1.46, 1.548, yh) * .9 * HEAD_GROUP_SCALE[1]));
      p.push(q[0], q[1], q[2]);
      uv.push(j / n, alphaV ? t : t * .5);
    }
    for (let r = 0; r < rows; r++) for (let j = 0; j < n; j++) { const a = r * (n + 1) + j, b = a + n + 1; ix.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(ix); g.computeVertexNormals();
    weldSeam(g, n + 1, rows > 0 && !alphaV);
    const m = new T.Mesh(g, mat); m.name = name; m.castShadow = cast; m.receiveShadow = true; return m;
  }
  // The solid hair starts where the fade ends: no fade at the forehead, most of it up the back.
  const solidY = (phi) => hairline(phi) + .006 + .047 * sstep(.9, 1.75, phi);
  const top = grid(14,
    (phi, t) => { const y0 = solidY(phi) - .004; return y0 + (HEAD_RINGS[HEAD_RINGS.length - 2][0] - y0) * Math.sin(t * Math.PI / 2); },
    (phi, t, yh, a) => {
      const vol = .0032 + .0082 * sstep(1.50, 1.545, yh);                 // short at the sides, fuller on top
      const clump = .0016 * Math.sin(a * 11 + yh * 70) * Math.sin(t * Math.PI) ** .5 * sstep(1.49, 1.52, yh);
      const front = .004 * Math.max(0, Math.cos(a)) ** 6 * sstep(.25, .7, t) * (1 - sstep(.8, 1, t));   // a little lift in the fringe
      return .0007 + (vol - .0007) * sstep(0, .32, t) + clump + front;
    }, 'hair-top', true, hairMaterial, false);
  let fadeTexture = fadeTextures.get(T);
  if (!fadeTexture) {
    const size = 64, data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4, t = y / (size - 1), grain = ((x * 17 + y * 31) % 23) / 23;
      const coverage = Math.max(0, Math.min(1, .1 + .9 * t ** 1.25 + (grain - .5) * .07));
      data[i] = data[i + 1] = data[i + 2] = Math.round(coverage * 255); data[i + 3] = 255;
    }
    fadeTexture = new T.DataTexture(data, size, size); fadeTexture.magFilter = T.LinearFilter; fadeTexture.minFilter = T.LinearFilter; fadeTexture.needsUpdate = true; fadeTextures.set(T, fadeTexture);
  }
  const fade = hairMaterial.clone(); fade.color = hairMaterial.color; fade.alphaMap = fadeTexture; fade.transparent = true; fade.depthWrite = false; fade.roughness = 1;
  const band = grid(7,
    (phi, t) => hairline(phi) + (solidY(phi) + .003 - hairline(phi)) * t,
    (phi, t) => .0009 + .0026 * sstep(0, .5, t) + .0006, 'hair-fade', false, fade, true);
  group.add(top, band); return group;
}

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Built once and copied for every marine: the surfaces don't change between them.
const built = new Map();
function cached(key, make) {
  let src = built.get(key); if (!src) { src = make(); built.set(key, src); }
  return src;
}
const copyGeo = (T, src) => { const g = src.clone(); g.computeBoundingSphere(); return g; };
// Where his mouth is, in the head group's own space (for what he puts in it: studio/marine-idle.js's cigarette).
// dx: metres to his left of the middle (a cigarette sits at a corner, about 1.5 cm out).
export function mouthPoint(dx = 0) { const z = faceZ(dx, .1088); const q = toLocal([dx, .1088, z + .002]); return { x: q[0], y: q[1], z: q[2] }; }
export const MOUTH = mouthPoint(0);

// The head and the neck, one surface from inside the collar to the crown.
// lite: a lighter head for the survivors (about 3k triangles, was 13k), seen from a few metres away on the roof.
export function buildMarineHead(T, material, { lite = false } = {}) {
  const src = cached(lite ? 'head-lite' : 'head', () => surfaceGeometry(T, lite ? { rows: rowSteps(-.06, .2895, 2.4), cols: columnAngles(40, 1.35) } : { rows: rowSteps(), cols: columnAngles(80, 1.35) }));
  const mesh = new T.Mesh(copyGeo(T, src), material);
  mesh.name = 'marine-shaped-head'; mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

// The balaclava's top edge at angle a (metres above the pivot): over the bridge of the nose in front, under the ears
// at the sides (CC-340: it used to cross the ear lobes, J128), down to the nape behind. In front it is the old edge,
// which the eyewear is fitted to (ui/marine-eyewear.js hemAt).
export function balaclavaHemY(a) {
  const c = Math.max(0, Math.cos(a)), s = Math.abs(Math.sin(a));
  return (1.355 + .046 * c ** 5 + .010 * s ** 4 - PIVOT_Y) * HEAD_GROUP_SCALE[1];
}
export function buildBalaclava(T, material) {
  material.roughness = .98; material.metalness = 0; material.side = T.DoubleSide;
  const group = new T.Group(); group.name = 'balaclava';
  const cols = columnAngles(64, 1.15), bottom = rowAt(0, -.052, true), N = 36;   // its neck tucked into the blouse, so looking up shows no skin under it
  const rows = (a) => { const top = rowAt(a, balaclavaHemY(a), true), out = []; for (let r = 0; r <= N; r++) { const t = r / N; out.push(bottom + (top - bottom) * (1 - (1 - t) ** 1.25)); } return out; };
  // a fabric's thickness off the skin, a little fuller at the edge; shallow tension folds from under the nose to the ears
  const lift = (a, u, p) => {
    const fold = .0007 * Math.sin(p[1] * 260 + Math.abs(a) * 2.2) * smooth(.09, .12, p[1]) * (1 - smooth(.135, .15, p[1])) * Math.max(0, Math.cos(a)) ** 2;
    return .0033 + fold;
  };
  const src = cached('balaclava', () => surfaceGeometry(T, { rows, cols, cloth: true, lift }));
  const front = new T.Mesh(copyGeo(T, src), material);
  front.name = 'cloth-balaclava'; front.castShadow = front.receiveShadow = true; group.add(front);
  // the hem: a rolled edge along the top
  const edge = [];
  for (let j = 0; j < 48; j++) {
    const a = -Math.PI + j / 48 * Math.PI * 2, p = skinPoint(a, rowAt(a, balaclavaHemY(a), true), true);
    const l = Math.hypot(p[0], p[2]) || 1, o = .0036; edge.push(new T.Vector3(...toLocal([p[0] + p[0] / l * o, p[1], p[2] + p[2] / l * o])));
  }
  const hemGeo = new T.TubeGeometry(new T.CatmullRomCurve3(edge, true), 96, .0016, 5, true);
  const hem = new T.Mesh(hemGeo, material); hem.name = 'balaclava-hem'; hem.castShadow = hem.receiveShadow = true; group.add(hem);
  const parts = [front, hem].map((mesh) => ({ mesh, rest: Float32Array.from(mesh.geometry.attributes.position.array) }));
  // Smoking lowers the face panel under the lip (studio/marine-idle.js), rather than a cigarette through fabric.
  // The panel in front of the jaw, above the chin, comes down about 7 cm and a little back. Kept out of rigid merging.
  const [SX, SY, SZ] = HEAD_GROUP_SCALE;
  for (const { mesh } of parts) { mesh.add(new T.Object3D()); mesh.userData.liveShape = true; }
  let last = -1;
  group.userData.mouthOpen = (k) => {
    k = Math.max(0, Math.min(1, k)); if (Math.abs(k - last) < .0001) return; last = k;
    for (const { mesh, rest } of parts) {
      const p = mesh.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2], yw = y * SY, zw = z * SZ;
        const w = smooth(.045, .09, zw) * smooth(.078, .125, yw) * (1 - smooth(.035, .06, Math.abs(x * SX)) * .6);
        p.setXYZ(i, x, y - k * w * .068 / SY, z - k * w * .006 / SZ);
      }
      p.needsUpdate = true; mesh.geometry.computeVertexNormals();
    }
  };
  group.userData.mouthOpen(0); return group;
}

// GP-19981, CC-340: a survivor's beard grown on the new face: one shell over the jaw, the chin and the cheeks, fullest
// at the chin, thinning up the cheeks to the sideburns, with a moustache over the upper lip; its edges sink into the
// skin instead of ending in a lip of their own.
// lite: for the survivors' lighter head (buildMarineHead's lite): fewer rows and columns, and the edges sink deeper,
// since that head's coarser faces sit further inside the true surface.
export function buildSurvivorBeard(T, material, { lite = false } = {}) {
  const cols = columnAngles(lite ? 32 : 64, 1.15), lo = rowAt(0, .05), hi = rowAt(0, .168), NR = lite ? 20 : 40;
  const rows = []; for (let r = 0; r <= NR; r++) rows.push(lo + (hi - lo) * r / NR);
  const thick = (a, u, p) => {
    const y = p[1], x = Math.abs(p[0]), side = Math.abs(a);
    if (side > 2.0) return -.002;
    const upper = .128 + .038 * smooth(.55, 1.5, side);                  // the cheek line, up to the sideburn
    const lower = .055 + .022 * smooth(.6, 1.7, side);                   // under the jaw, rising to its angle
    const mouth = Math.exp(-(((y - .109) / .0075) ** 2)) * (1 - smooth(.016, .03, x));   // the lips stay clear
    const mo = Math.exp(-(((y - .1185) / .0038) ** 2)) * (1 - smooth(.019, .028, x)) * smooth(.002, .006, x);   // the moustache
    let t = (.0055 + .0045 * Math.exp(-(((y - .074) / .02) ** 2)) * Math.max(0, Math.cos(a))) * smooth(lower, lower + .012, y) * (1 - smooth(upper - .014, upper, y));
    t = Math.max(t * (1 - mouth), .0042 * mo);
    const r = t - .0009 + .0007 * Math.sin(a * 23 + y * 310);   // clumps; below zero it is inside the skin
    return lite ? r - .003 * (1 - smooth(.0005, .004, t)) : r;
  };
  const src = cached(lite ? 'beard-lite' : 'beard', () => surfaceGeometry(T, { rows, cols, lift: thick, weld: false, keep: (a, u) => Math.abs(a) < 2.1 }));
  const beardMaterial = material.clone();
  beardMaterial.color.setHex(0x765247); // muted auburn-brown: 40% HSV saturation
  beardMaterial.roughness = .86; beardMaterial.metalness = 0;
  const mesh = new T.Mesh(copyGeo(T, src), beardMaterial);
  mesh.name = 'survivor-fitted-beard'; mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

// CL-197's lofted ear (a bowl, the antihelix, a groove and a rolled rim, leaned back, a tragus in front), now in metres
// on the new skull's side: 5.5 cm tall, behind the jaw, its top at the brow's height and its lobe at the nose's.
function buildEar(T, side, skinW, M = 28) {
  const cy = .162, cz = -.007, lean = .2, cl = Math.cos(lean), sl = Math.sin(lean);
  const RINGS = [[.0, .0049], [.22, .0037], [.42, .0089], [.6, .0117], [.76, .0078], [.9, .0146], [1.0, .0121], [1.05, -.0021]];
  const p = [], uv = [], ix = [];
  for (let r = 0; r < RINGS.length; r++) {
    const [rho, h] = RINGS[r];
    for (let j = 0; j <= M; j++) {
      const th = j / M * Math.PI * 2, st = Math.sin(th), ct = Math.cos(th), lobe = st < 0 ? 1 : 0;
      const v = .0272 * st * (lobe ? .94 : 1) * rho;
      const u = .0152 * ct * (1 + .1 * Math.max(0, st) - .3 * Math.max(0, -st)) * rho;
      const z = cz + u * cl - v * sl, y = cy + u * sl + v * cl;
      const flare = .0038 * rho * rho * Math.max(0, -Math.cos(th - .5));
      const hh = h * (lobe ? .65 + .35 * Math.min(1, rho) : 1) + (h > 0 ? flare : 0);
      p.push(side * (Math.abs(sideX(y, z)) - .0016 + hh), y, z); uv.push(j / M, rho);
    }
  }
  for (let r = 0; r < RINGS.length - 1; r++) for (let j = 0; j < M; j++) {
    const a = r * (M + 1) + j, b = a + M + 1;
    if (side > 0) ix.push(a, a + 1, b, a + 1, b + 1, b); else ix.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(ix); g.computeVertexNormals();
  weldSeam(g, M + 1);
  { const N = g.attributes.normal; let x = 0, y = 0, z = 0; for (let j = 0; j <= M; j++) { x += N.getX(j); y += N.getY(j); z += N.getZ(j); } const l = Math.hypot(x, y, z) || 1; for (let j = 0; j <= M; j++) N.setXYZ(j, x / l, y / l, z / l); }
  g.computeBoundingSphere();
  const group = new T.Group(); group.name = 'ear-' + side;
  const ear = new T.Mesh(g, skinW); ear.name = 'ear-shell-' + side; ear.castShadow = false; ear.receiveShadow = true; group.add(ear);
  const tragus = new T.Mesh(new T.SphereGeometry(1, 8, 6), skinW);
  tragus.scale.set(.0034, .0064, .0038); tragus.position.set(side * (Math.abs(sideX(cy - .002, cz + .011)) + .0034), cy - .002, cz + .011);
  tragus.name = 'tragus-' + side; tragus.receiveShadow = true; group.add(tragus);
  return group;
}

// GP-163, CC-340. The face's details, in metres (a group scaled back to metres inside the head group): eyeballs in
// their sockets (the skin's lids close round them: studio/marine-skull.js carves the opening), each with its iris,
// pupil and catchlight and a lash line along the upper lid; the brows on the brow ridge; the ears; the nostrils, the
// line of the mouth and the old scar through his right brow. The wardrobe supplies every material.
export function buildMarineFeatures(T, { skinW, skinShade, hairW, irisW, eyeWhite, eyeDark, glint, scarMat, lite = false }) {
  const SEG = lite ? 12 : 28;   // CC-340: the survivors' lighter eyes
  const group = new T.Group(); group.name = 'marine-facial-features';
  const W = worldGroup(T); group.add(W);
  const mesh = (positions, indices, material, name, cast = false) => {
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(positions.length / 3 * 2), 2));
    geo.setIndex(indices); geo.computeVertexNormals(); geo.computeBoundingSphere();
    const m = new T.Mesh(geo, material); m.name = name; m.castShadow = cast; m.receiveShadow = true; W.add(m); return m;
  };
  // a ribbon along points (each [x, y, z]), its half-height width(t), lifted toward +z
  const strip = (points, width, mat, name) => {
    const p = [], ix = [];
    points.forEach(([x, y, z], i) => { const w = width(i / (points.length - 1)); p.push(x, y - w, z, x, y + w, z); if (i) { const a = (i - 1) * 2; ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
    return mesh(p, ix, mat, name);
  };
  const r = EYE.r;
  for (const side of [-1, 1]) {
    const ex = side * EYE.x, ey = EYE.y;
    // the lids' level round the eye (the skin above and below the opening): the cornea sits just behind it
    const lidZ = (faceZ(ex, ey + .0085) + faceZ(ex, ey - .0072)) / 2;
    const zc = EYE.z;
    const eye = new T.Group(); eye.name = 'eye-' + side; eye.position.set(ex, ey, zc);
    eye.rotation.y = -side * .04;   // a touch of convergence, as eyes at rest have
    W.add(eye);
    const ball = new T.Mesh(new T.SphereGeometry(r, SEG, lite ? 8 : 18), eyeWhite); ball.name = 'eyeball-' + side; ball.receiveShadow = true; eye.add(ball);
    const cap = (radius, lift, mat, name) => {
      const g = new T.SphereGeometry(r + lift, SEG, lite ? 3 : 6, 0, Math.PI * 2, 0, Math.asin(radius / r)); g.rotateX(Math.PI / 2);
      const m = new T.Mesh(g, mat); m.name = name; m.receiveShadow = true; eye.add(m); return m;
    };
    cap(.0059, .00012, eyeDark, 'iris-rim-' + side);
    cap(.0053, .00022, irisW, 'iris-' + side);
    cap(.0021, .00032, eyeDark, 'pupil-' + side);
    const gl = new T.Mesh(new T.SphereGeometry(.0007, 8, 6), glint); gl.name = 'eye-glint-' + side;
    gl.position.set(-side * .0015 + .0012, .0019, r * .96); eye.add(gl);
    // the lash line: a dark edge along the upper lid's margin, where the lid meets the eye
    const lash = [];
    for (let jj = 0; jj <= 14; jj++) {
      const j = side > 0 ? jj : 14 - jj, t = j / 14, dx = (t - .5) * 2 * .0104, dy = lidMargin(dx, true) + .0003;
      const dd = Math.min(r * .985, Math.hypot(dx, dy));
      lash.push([ex + side * dx, ey + dy + .0004, Math.max(faceZ(ex + side * dx, ey + dy + .0004), zc + Math.sqrt(r * r - dd * dd)) + .00045]);
    }
    strip(lash, (tt) => .00028 + .00042 * Math.sin(tt * Math.PI) ** .6, eyeDark, 'lash-line-' + side);
    // the brow, on the brow ridge: full at the inner end, tapering out and a little down at the tail
    const brow = [];
    for (let jj = 0; jj <= 16; jj++) { const j = side > 0 ? jj : 16 - jj, t = j / 16, dx = -.019 + .043 * t, x = ex + side * dx, y = ey + .0128 + .0024 * Math.sin(t * Math.PI * .9) - .0018 * t * t; brow.push([x, y, faceZ(x, y) + .0009]); }
    strip(brow, (tt) => { const t = side > 0 ? tt : 1 - tt; return .0009 + .0021 * (1 - t) ** .5 * Math.sin(Math.min(1, t * 6) * Math.PI / 2); }, hairW, 'tapered-brow-' + side);
    W.add(buildEar(T, side, skinW, lite ? 14 : 28));
    // a nostril under each wing of the nose
    const nos = new T.Mesh(new T.SphereGeometry(1, 10, 6), skinShade);
    nos.scale.set(.0029, .0013, .0026); nos.position.set(side * .0072, .1342, faceZ(side * .0072, .1358) - .0032);
    nos.rotation.x = -.35; nos.name = 'nostril-' + side; nos.receiveShadow = true; W.add(nos);
  }
  // the line of the mouth, in the groove between the lips
  const lips = [];
  for (let j = 0; j <= 14; j++) { const t = j / 14, x = (t - .5) * .044, y = .1088 + .0008 * Math.sin(t * Math.PI) - .0006 * (2 * t - 1) ** 2; lips.push([x, y, faceZ(x, y) + .0004]); }
  strip(lips, (t) => .0002 + .00045 * Math.sin(t * Math.PI), skinShade, 'resting-mouth');
  // the old scar through his right brow
  const scar = []; for (let j = 0; j < 5; j++) { const t = j / 4, x = -.0475 + .0028 * t, y = .186 + .0195 * t; scar.push([x, y, faceZ(x, y) + .0007]); }
  strip(scar, (t) => .00024 + .00048 * Math.sin(t * Math.PI), scarMat, 'brow-scar');
  return group;
}
