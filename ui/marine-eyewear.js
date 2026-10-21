// CL-139 (Jerry, 2026-10-09: "the eyewear does not really fit the player's head anymore"). The four eyewear styles,
// built from the head they sit on instead of fixed boxes. CL-97 placed them for the old head; GP-105/GP-163 rebuilt
// the face ~3 cm further back, so the lenses floated in front of the eyes and their lower edges ran into the mask.
//
// Coordinates are makeMarine's head: x across (+ is his left), y the absolute height (the caller's group sits at
// -HEAD_PIVOT_Y, as eyeG does), z forward. Every piece is placed against:
//   HEAD_RINGS  the skull, copied from ui/marine-face.js (marine-eyewear.test.mjs checks they still match)
//   the balaclava's top edge (hemY), so nothing goes into the mask
//   the nose ridge, the brows (y 1.44), the ears (top at y 1.436, x 0.129-0.143, z -0.021..0.023)
// The caller owns the materials (mats) and the groups (group(style) returns the style's Group).

export const HEAD_RINGS = [
  [1.275,.035,.09,.048], [1.283,.052,.110,.060], [1.291,.065,.127,.07],
  [1.309,.084,.141,.083], [1.323,.094,.149,.09], [1.343,.106,.151,.101],
  [1.365,.115,.152,.111], [1.383,.122,.151,.118],
  [1.402,.124,.151,.122], [1.428,.125,.150,.124], [1.455,.125,.148,.125],
  [1.481,.122,.140,.123], [1.50,.118,.13,.12], [1.521,.104,.115,.107],
  [1.534,.085,.094,.087], [1.544,.045,.050,.046], [1.548,.001,.001,.001]
];
export const EYE = { x: .06, y: 1.419 };   // eye centres (marine-face.js buildMarineFeatures)

// [half width, front, back] of the skull at height y.
export function ringAt(y) {
  const R = HEAD_RINGS;
  if (y <= R[0][0]) return R[0].slice(1);
  let i = 1; while (i < R.length - 1 && R[i][0] < y) i++;
  const a = R[i - 1], b = R[i], t = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0])));
  return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
}
// The skull's surface at angle a round the head (0 is straight ahead, +pi/2 his left side), height y.
export function headXZ(a, y) {
  const [w, f, b] = ringAt(y), c = Math.cos(a), s = Math.sin(a);
  return [w * s, c >= 0 ? f * Math.pow(c, .55) : -b * Math.pow(-c, .8)];
}
// The same point pushed out d along the surface normal (in the horizontal plane), with that normal.
export function headOff(a, y, d) {
  const e = 1e-3, p = headXZ(a, y), p0 = headXZ(a - e, y), p1 = headXZ(a + e, y);
  let nx = p1[1] - p0[1], nz = -(p1[0] - p0[0]);
  const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
  if (nx * p[0] + nz * p[1] < 0) { nx = -nx; nz = -nz; }
  return { x: p[0] + nx * d, z: p[1] + nz * d, nx, nz };
}
// The face's depth at (x, y) (marine-face.js faceZ): where the eyes, brows and cheeks are.
export function faceZ(x, y) {
  const [w, f] = ringAt(y);
  return f * Math.pow(Math.max(0, 1 - (x / w) ** 2), .275);
}
// The balaclava's top edge (marine-face.js buildBalaclava's hem): its height above x, and how far forward it is.
export function hemAt(x) {
  const s = Math.max(-1, Math.min(1, x / .131)), c = Math.sqrt(1 - s * s);
  return { y: 1.355 + .046 * c ** 5, z: .178 * c ** .55 };
}
export const hemY = (x) => hemAt(x).y;

// --- geometry ----------------------------------------------------------------------------------------------------
// A shell between two loops (or a loop and a centre) laid on a surface. map(u, v, s) gives the point for surface
// coordinates (u, v) lifted s along the surface's outward normal, and that normal. Front (s = s1), back (s = s0) and
// both walls, each with its own vertices so the edges stay crisp.
function shell(T, { map, outer, inner = null, center = null, s0, s1, rows = 3 }) {
  const N = outer.length, pos = [], ix = [];
  const loopAt = (k) => outer.map((o, j) => {
    const i0 = inner ? inner[j] : center;
    return [i0[0] + (o[0] - i0[0]) * k, i0[1] + (o[1] - i0[1]) * k];
  });
  const grid = []; for (let r = 0; r <= rows; r++) grid.push(loopAt(r / rows));
  const v3 = (u, v, s) => map(u, v, s);
  const tri = (a, b, c, want) => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const flip = n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0;
    const base = pos.length / 3;
    for (const p of flip ? [a, c, b] : [a, b, c]) pos.push(p[0], p[1], p[2]);
    ix.push(base, base + 1, base + 2);
  };
  const quad = (a, b, c, d, want) => { tri(a, b, c, want); tri(a, c, d, want); };
  for (const [s, sign] of [[s1, 1], [s0, -1]]) {
    for (let r = 0; r < rows; r++) for (let j = 0; j < N; j++) {
      const j2 = (j + 1) % N, A = grid[r][j], B = grid[r][j2], C = grid[r + 1][j2], D = grid[r + 1][j];
      const pA = v3(A[0], A[1], s), pB = v3(B[0], B[1], s), pC = v3(C[0], C[1], s), pD = v3(D[0], D[1], s);
      const want = [pA.nx * sign, pA.ny * sign, pA.nz * sign];
      if (!inner && r === 0) tri(pA.p, pC.p, pD.p, want);
      else quad(pA.p, pB.p, pC.p, pD.p, want);
    }
  }
  const mid = (loop) => { let u = 0, v = 0; for (const p of loop) { u += p[0]; v += p[1]; } return [u / loop.length, v / loop.length]; };
  const cU = mid(outer);
  const wall = (loop, out) => {
    for (let j = 0; j < N; j++) {
      const j2 = (j + 1) % N, a = loop[j], b = loop[j2];
      const p0 = v3(a[0], a[1], s0).p, p1 = v3(b[0], b[1], s0).p, p2 = v3(b[0], b[1], s1).p, p3 = v3(a[0], a[1], s1).p;
      const c = v3(cU[0], cU[1], (s0 + s1) / 2).p, m = [(p0[0] + p2[0]) / 2 - c[0], (p0[1] + p2[1]) / 2 - c[1], (p0[2] + p2[2]) / 2 - c[2]];
      quad(p0, p1, p2, p3, out ? m : [-m[0], -m[1], -m[2]]);
    }
  };
  wall(outer, true);
  if (inner) wall(inner, false);
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(ix); g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}
// A band between two edges (top[i] over bot[i], same count) on a surface: long straps and bars that wrap round the
// head, where a fan from one centre would cut through it.
function ribbon(T, { map, top, bot, s0, s1 }) {
  const pos = [], ix = [], n = top.length;
  const P = (q, s) => map(q[0], q[1], s);
  const tri = (a, b, c, want) => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const nn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const base = pos.length / 3;
    for (const p of nn[0] * want[0] + nn[1] * want[1] + nn[2] * want[2] < 0 ? [a, c, b] : [a, b, c]) pos.push(p[0], p[1], p[2]);
    ix.push(base, base + 1, base + 2);
  };
  const quad = (a, b, c, d, want) => { tri(a, b, c, want); tri(a, c, d, want); };
  for (let i = 0; i < n - 1; i++) {
    for (const [s, sg] of [[s1, 1], [s0, -1]]) {
      const a = P(top[i], s), b = P(top[i + 1], s), c = P(bot[i + 1], s), d = P(bot[i], s);
      quad(a.p, b.p, c.p, d.p, [a.nx * sg, 0, a.nz * sg]);
    }
    for (const [edge, up] of [[top, 1], [bot, -1]]) {
      const a = P(edge[i], s0).p, b = P(edge[i + 1], s0).p, c = P(edge[i + 1], s1).p, d = P(edge[i], s1).p;
      quad(a, b, c, d, [0, up, 0]);
    }
  }
  for (const [i, k] of [[0, -1], [n - 1, 1]]) {
    const a = P(top[i], s0), b = P(bot[i], s0).p, c = P(bot[i], s1).p, d = P(top[i], s1).p;
    const t = P(top[Math.max(0, Math.min(n - 1, i - k))], s0).p;
    quad(a.p, b, c, d, [a.p[0] - t[0], 0, a.p[2] - t[2]]);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(ix); g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}
// A bar of w x h (h vertical-ish) swept along points, ends capped: thick acetate temples.
function bar(T, points, w, h) {
  const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
  const n = 18, pos = [], ix = [], up = new T.Vector3(0, 1, 0);
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = curve.getPoint(t), tan = curve.getTangent(t);
    const side = new T.Vector3().crossVectors(tan, up).normalize(), u = new T.Vector3().crossVectors(side, tan).normalize();
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const q = p.clone().addScaledVector(side, a * w / 2).addScaledVector(u, b * h / 2); pos.push(q.x, q.y, q.z);
    }
  }
  for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) {
    const a = i * 4 + k, b = i * 4 + (k + 1) % 4, c = a + 4, d = b + 4; ix.push(a, b, d, a, d, c);
  }
  ix.push(0, 2, 1, 0, 3, 2); const e = n * 4; ix.push(e, e + 1, e + 2, e, e + 2, e + 3);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(ix); const g2 = g.toNonIndexed(); g2.computeVertexNormals(); return g2;
}
const tube = (T, points, r, closed = false, seg = 20) =>
  new T.TubeGeometry(new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)), closed), seg, r, 6, closed);

// --- the surfaces the eyewear lies on ----------------------------------------------------------------------------
// Glasses: a gently curved front (a parabola across, flat up and down), u = x.
const glassesFront = (z0, k) => (u, v, s) => {
  const z = z0 - k * u * u, nx = 2 * k * u, l = Math.hypot(nx, 1);
  return { p: [u + nx / l * s, v, z + s / l], nx: nx / l, ny: 0, nz: 1 / l };
};
// Wraps and goggles: the skull itself, offset d(a) (+ s), u = the angle round the head at height yRef.
const headFront = (yRef, d) => (u, v, s) => {
  const o = headOff(u, yRef, d(u) + s);
  return { p: [o.x, v, o.z], nx: o.nx, ny: 0, nz: o.nz };
};
// Keep an outline above the mask (and the nose) at its own x.
const clearMask = (pts, xOf, gap) => pts.map(([u, v]) => [u, Math.max(v, hemY(xOf(u)) + gap)]);
// Where a temple runs: along the side of the head at d off the skull, over the top of the ear, behind it.
// half: half the temple's height, so a thick one runs clear over the ear tops (y 1.436, a = pi/2 +- 0.17). The temple
// runs straight back from the hinge, rising to just over the ear, then bends down behind it (a hook for wire ones).
function templePath(side, from, { d = .008, hook = false, half = .002 } = {}) {
  const over = 1.4365 + half + .0025, pts = [from];
  const yAt = (a) => { const t = Math.max(0, Math.min(1, (a - .95) / (1.42 - .95))); return from[1] + (over - from[1]) * t * (2 - t); };
  for (const a of [1.05, 1.22, 1.42, 1.6, 1.74]) { const y = yAt(a), o = headOff(side * a, y, d); pts.push([o.x, y, o.z]); }
  const tail = hook ? [[1.86, over - .01, d - .002], [1.92, over - .03, d - .003], [1.95, over - .042, d - .003]] : [[1.85, over - .003, d - .001], [1.92, over - .009, d - .002]];
  for (const [a, y, dd] of tail) { const o = headOff(side * a, y, dd); pts.push([o.x, y, o.z]); }
  return pts;
}

// --- the styles --------------------------------------------------------------------------------------------------
const extraMats = new WeakMap();
export function buildMarineEyewear(T, { mats: E, group, mesh = (geo, mat) => new T.Mesh(geo, mat) }) {
  let X = extraMats.get(T);
  if (!X) {
    X = {
      stud: new T.MeshStandardMaterial({ color: 0xc8ccd0, roughness: .3, metalness: .9 }),
      pad: new T.MeshStandardMaterial({ color: 0xd8dccf, roughness: .4, metalness: 0, transparent: false }),
      gogFoam: new T.MeshStandardMaterial({ color: 0x23211c, roughness: .98, metalness: 0 }),
    };
    extraMats.set(T, X);
  }
  const add = (grp, geo, mat, name) => { const m = mesh(geo, mat); m.name = name; m.castShadow = true; m.receiveShadow = true; grp.add(m); return m; };
  const loop = (n, f) => { const out = []; for (let j = 0; j < n; j++) out.push(f(j / n * Math.PI * 2)); return out; };

  // Aviators: gold wire teardrops, a double bridge, nose pads, wire temples hooked behind the ears.
  {
    const g = group('aviators'), F = glassesFront(.166, 1.9);
    for (const side of [-1, 1]) {
      const cx = side * .058, cy = 1.417;
      const lens = clearMask(loop(32, (t) => {
        const u = Math.cos(t), v = Math.sin(t);
        let x = u * .039, y = v >= 0 ? .029 * Math.pow(v, .7) * (1 - .1 * u) : .032 * v * (1 + .36 * u);
        if (v < 0) x += .004 * (-v) * u;
        return [cx + side * x, cy + y];
      }), (u) => u, .006).map(([u, v]) => [u, Math.abs(u) < .03 ? Math.max(v, 1.402 + (.03 - Math.abs(u)) * .45) : v]);
      add(g, shell(T, { map: F, outer: lens, center: [cx, cy], s0: .0004, s1: .0024 }), E.aviLens, 'aviator-lens');
      add(g, tube(T, lens.map(([u, v]) => F(u, v, .0016).p), .0021, true, 48), E.gold, 'aviator-rim');
      // the hinge: the lens's outermost point near its top
      let hi = -1; lens.forEach(([u, v], j) => { if (v >= 1.432 && (hi < 0 || side * u > side * lens[hi][0])) hi = j; });
      const hp = F(lens[hi][0], lens[hi][1], .0016).p;
      add(g, tube(T, templePath(side, hp, { d: .0085, hook: true, half: .002 }), .0019, false, 28), E.gold, 'aviator-temple');
      // nose pad on its arm, resting on the bridge of the nose
      const px = side * .0135, py = 1.414, pz = faceZ(px, py) + .0052;
      const pad = add(g, new T.SphereGeometry(1, 10, 8), X.pad, 'aviator-nose-pad');
      pad.position.set(px, py, pz); pad.scale.set(.0026, .0062, .0042); pad.rotation.set(0, side * .5, side * .18);
      const rimIn = F(side * .026, 1.424, .0016).p;
      add(g, tube(T, [rimIn, [side * .019, 1.419, (rimIn[2] + pz) / 2 + .002], [px, py + .002, pz + .002]], .0011, false, 8), E.gold, 'aviator-pad-arm');
    }
    // the double bridge: a straight brow bar and a lower bridge arched over the nose
    add(g, tube(T, [-.035, -.018, 0, .018, .035].map((x) => F(x, 1.4405, .0016).p), .0019, false, 16), E.gold, 'aviator-brow-bar');
    add(g, tube(T, [[-.026, 1.425], [-.012, 1.430], [0, 1.4315], [.012, 1.430], [.026, 1.425]].map(([x, y]) => F(x, y, .0016).p), .0018, false, 16), E.gold, 'aviator-bridge');
  }

  // Wayfarers: heavy black acetate, a brow line that lifts at the outer corners, keyhole bridge, two silver studs.
  {
    const g = group('wayfarer'), F = glassesFront(.169, 1.6);
    // a rounded trapezoid: wide top, the base narrower at the nose, the top outer corner lifted. xl > 0 is outward.
    const rr = (cx, cy, side, hw, top, bot, grow) => loop(36, (t) => {
      const u = Math.cos(t), v = Math.sin(t);
      const su = Math.sign(u) * Math.pow(Math.abs(u), .45), sv = Math.sign(v) * Math.pow(Math.abs(v), .45);
      const xl = su * (hw + grow) * (v < 0 && su < 0 ? 1 + .22 * v : 1);
      const yl = sv >= 0 ? sv * (top + grow * 1.35) + (su > 0 ? .0055 * sv * su : 0) : sv * (bot + grow);
      return [cx + side * xl, cy + yl];
    });
    for (const side of [-1, 1]) {
      const cx = side * .058, cy = 1.4205;
      const lensL = clearMask(rr(cx, cy, side, .031, .0195, .0215, 0), (u) => u, .009);
      const frameL = clearMask(rr(cx, cy, side, .031, .0195, .0215, .0072), (u) => u, .005);
      add(g, shell(T, { map: F, outer: frameL, inner: lensL, s0: 0, s1: .0062, rows: 2 }), E.wayFrame, 'wayfarer-frame');
      add(g, shell(T, { map: F, outer: lensL, center: [cx, cy], s0: .0018, s1: .0034 }), E.wayLens, 'wayfarer-lens');
      for (const dy of [.011]) {
        const p = F(side * (.058 + .036), cy + dy, .0063).p;
        const st = add(g, new T.CylinderGeometry(.0024, .0024, .0012, 10), X.stud, 'wayfarer-stud');
        st.position.set(p[0], p[1], p[2]); st.rotation.set(Math.PI / 2, 0, 0);
      }
      const hp = F(side * .099, 1.437, .003).p;
      add(g, bar(T, templePath(side, hp, { d: .0105, half: .0058 }), .0042, .0115), E.wayFrame, 'wayfarer-temple');
    }
    { const bT = [], bB = []; for (let k = 0; k <= 6; k++) { const x = -.03 + k * .01, arch = .0035 * Math.cos(x / .03 * Math.PI / 2); bT.push([x, 1.4405]); bB.push([x, 1.428 + arch]); }
      add(g, ribbon(T, { map: F, top: bT, bot: bB, s0: 0, s1: .0062 }), E.wayFrame, 'wayfarer-bridge'); }
  }

  // Wraparounds: one mirrored shield round the eyes on the skull's own curve, a white bar on top, thick white temples.
  {
    const g = group('pitViper'), A = 1.12, d = (a) => .0165 - .0055 * (a / A) ** 2, yRef = 1.42, F = headFront(yRef, d);
    const xOf = (a) => headOff(a, yRef, d(a)).x;
    const shield = [];
    const n = 40;
    for (let j = 0; j <= n; j++) {   // top, outer end to outer end
      const a = -A + 2 * A * j / n; shield.push([a, 1.452 - .006 * (a / A) ** 2]);
    }
    for (const t of [.35, .7]) shield.push([A + .02 * Math.sin(t * Math.PI), 1.452 - .006 + (1.397 + .012 - 1.446) * t]);
    for (let j = n; j >= 0; j--) {   // bottom, back across, with the nose cut
      const a = -A + 2 * A * j / n;
      shield.push([a, Math.max(1.397 + .012 * (a / A) ** 2, 1.394 + .026 * Math.exp(-((a / .1) ** 2)), hemY(xOf(a)) + .007)]);
    }
    for (const t of [.35, .7]) shield.push([-A - .02 * Math.sin(t * Math.PI), 1.409 + (1.446 - 1.409) * t]);
    const cen = [0, 1.424];
    add(g, shell(T, { map: F, outer: shield, center: cen, s0: 0, s1: .0022, rows: 8 }), E.viperLens, 'viper-shield');
    const barTop = [], barBot = [];
    for (let j = 0; j <= n; j++) { const a = -A - .015 + 2 * (A + .015) * j / n; barTop.push([a, 1.4585 - .006 * (a / A) ** 2]); barBot.push([a, 1.446 - .006 * (a / A) ** 2]); }
    add(g, ribbon(T, { map: F, top: barTop, bot: barBot, s0: -.0015, s1: .0062 }), E.viperFrame, 'viper-top-bar');
    for (const side of [-1, 1]) {
      const p = F(side * (A + .005), 1.451 - .006, .002).p;
      add(g, bar(T, templePath(side, p, { d: .011, half: .0073 }), .0055, .0145), E.viperFrame, 'viper-temple');
    }
  }

  // Ballistic goggles: a foam-backed frame sealed round the eyes on the skull's curve, one wide smoke lens with a nose
  // cut, a strap round the head over the tops of the ears.
  {
    const g = group('goggles'), A = 1.28, yRef = 1.42, d = (a) => .0035 + .0025 * (a / A) ** 2, F = headFront(yRef, d);
    const xOf = (a) => headOff(a, yRef, d(a)).x;
    const ring = (inset, gapMask) => {
      const out = [], n = 36, AA = A - inset * 1.05;
      for (let j = 0; j <= n; j++) { const a = -AA + 2 * AA * j / n; out.push([a, 1.459 - inset - .007 * (a / A) ** 2]); }
      for (const t of [.3, .65]) out.push([AA + .035 * Math.sin(t * Math.PI) * (1 - inset * 20), 1.452 - inset - (1.452 - 1.40 - inset) * t]);
      for (let j = n; j >= 0; j--) {
        const a = -AA + 2 * AA * j / n;
        out.push([a, Math.max(1.385 + inset + .013 * (a / A) ** 2, 1.392 + inset + .045 * Math.exp(-((a / .13) ** 2)), hemY(xOf(a)) + gapMask + inset * .4)]);
      }
      for (const t of [.35, .7]) out.push([-AA - .035 * Math.sin((1 - t) * Math.PI) * (1 - inset * 20), 1.40 + inset + (1.452 - 1.40 - inset) * t]);
      return out;
    };
    const outer = ring(0, .006), inner = ring(.0085, .006);
    add(g, shell(T, { map: F, outer, inner, s0: .0015, s1: .006, rows: 1 }), X.gogFoam, 'goggle-foam');
    add(g, shell(T, { map: F, outer, inner, s0: .006, s1: .0225, rows: 2 }), E.gogFrame, 'goggle-frame');
    add(g, shell(T, { map: F, outer: inner, center: [0, 1.428], s0: .0185, s1: .0205, rows: 8 }), E.gogLens, 'goggle-lens');
    // the strap: round the head at 1.452 (the ear tops are at 1.436), a little off the hair
    const yS = 1.452, sTop = [], sBot = [], m = 72, a0 = A - .06;
    for (let j = 0; j <= m; j++) { const a = a0 + (2 * Math.PI - 2 * a0) * j / m; sTop.push([a, yS + .012]); sBot.push([a, yS - .012]); }
    const S = headFront(yS, () => .0055);
    add(g, ribbon(T, { map: S, top: sTop, bot: sBot, s0: 0, s1: .0028 }), E.gogStrap, 'goggle-strap');
    for (const side of [-1, 1]) {   // the clips where the strap meets the frame
      const cT = [], cB = []; for (let k = 0; k <= 4; k++) { const a = side * (A - .02 + k * .025); cT.push([a, yS + .0145]); cB.push([a, yS - .0145]); }
      add(g, ribbon(T, { map: S, top: cT, bot: cB, s0: .0025, s1: .0075 }), E.gogFrame, 'goggle-strap-clip');
    }
  }
}
