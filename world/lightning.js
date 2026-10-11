// world/lightning.js — lightning in the valley's storms (CL-92, P-122, D-63). Claude's.
//
// Every shower is a storm, and every storm throws LIGHTNING.STRIKES bolts down at moments spread through it. Each
// strike rolls its own luck: 1 in 50 it sets a tree burning (the rain still damps it, D-60), 1 in 100 it kills the
// dead where it lands, 1 in 200 it finds the marine (70 damage: he can live through it, at 70 HP or less it kills
// him; never under godmode; a pair of insulated boots hidden on the map makes him immune). Otherwise it comes down
// somewhere off in the trees: a flash, the bolt, thunder a beat later.
//
//   LIGHTNING                       the counts, the odds, the damage, the radius
//   stormTimes(dur, rand)           when a storm's strikes fall, in seconds from its start (pure)
//   rollStrike(rand, odds)          { tree, dead, marine } for one strike (pure; odds default to LIGHTNING.ODDS)
//   strikeTarget(roll)              where it lands: 'marine' | 'dead' | 'tree' | 'open' (the first that rolled)
//   boltPoints(from, to, rand)      a jagged path from the cloud to the ground, and a branch or two (pure)
//   buildBoltGeometry(T, paths, w)  those paths as crossed ribbons, one BufferGeometry
//   buildInsulatedBoots(T)          the boots as a pickup on the ground (yellow rubber, black soles)
//   BOOTS_HEX                       their colour, for the marine's own boots while he wears them
//
// CL-178 (Jerry: "a skeleton that is wearing military fatigues and the boots are attached to his feet. You climb up and
// can reach them ... If you climb during a storm there is a 1 in 3 chance per strike you get killed by lightning. As
// soon as the player gets the boots though he is protected."): the boots are no longer on the ground. A soldier's
// skeleton sits on a small work platform high on the radio mast, clipped to it by his lanyard, legs hanging over the
// edge, still wearing them. The mast's cable ladder can be climbed; while he is up it in a storm, each strike finds him
// 1 time in 3 and kills him, unless he already has the boots.
//   MAST_PERCH                      where the platform, the ladder's top and the boots are, in the mast's own frame
//   mastStrikeFinds(rand)           one strike while he is on the mast: does it find him (1 in 3)?
//   buildRubberBoot(T)              CL-179: one boot, rounded and detailed, merged into one vertex-coloured mesh
//   buildWornBoots(T)               the pair on his feet, side by side, toes out (origin at the soles)
//   buildMastPerchParts(T)          the platform and the skeleton as plain meshes in the mast's frame, ready to merge
import { mulberry } from './first-people.js';

export const LIGHTNING = Object.freeze({
  STRIKES: 5,
  ODDS: Object.freeze({ tree: 1 / 50, dead: 1 / 100, marine: 1 / 200 }),
  DAMAGE: 70,
  KILL_R: 5,             // m round the strike that the dead die in
  TREE_R: 70,            // a burning tree is one within this of the marine, so he sees it
  OPEN_R: [30, 110],     // a strike that finds nothing comes down this far off
  SKY: 70,               // m above the ground that a bolt starts
  BOLT_S: 0.32,          // s the bolt shows (it flickers)
  FLASH: 0.6,            // the screen's flash at its brightest, for a strike close by
  EDGE_S: 3,             // no strike in the first or last few seconds of a shower
  MAST_ODDS: 1 / 3       // CL-178: each strike while he is up the radio mast finds him this often, and kills him
});

// CL-178: the mast's frame: origin at the foot of its centre, +y up; its cable ladder runs up the -z face (z -0.67).
export const MAST_PERCH = Object.freeze({
  ladderOut: 1.0,        // he climbs this far out from the centre, on the ladder's face
  climbTop: 12.35,       // his feet at the top of the climb: his head and hands are up by the platform
  climbSpeed: 2.4,       // m/s up or down the rungs
  minHigh: 1.5,          // above this off the ground he counts as up the mast (a strike can find him)
  deckY: 12.5,           // the platform's top
  boots: Object.freeze({ x: -0.78, y: 11.93, z: -1.6 }),   // the soles of the boots on his hanging feet
  top: 16                // the mast's tip and the dish's pole: where a bolt comes down
});

export function mastStrikeFinds(rand = Math.random, odds = LIGHTNING.MAST_ODDS) { return rand() < odds; }

export const BOOTS_HEX = 0xe0b020;

export function stormTimes(dur, rand = Math.random, n = LIGHTNING.STRIKES) {
  const a = LIGHTNING.EDGE_S, b = Math.max(a + 1, dur - LIGHTNING.EDGE_S);
  const out = [];
  // One in each equal slice of the storm, so they never bunch up and the fifth always comes.
  for (let i = 0; i < n; i++) out.push(a + (b - a) * (i + 0.15 + 0.7 * rand()) / n);
  return out;
}

export function rollStrike(rand = Math.random, odds = LIGHTNING.ODDS) {
  return { tree: rand() < odds.tree, dead: rand() < odds.dead, marine: rand() < odds.marine };
}

export function strikeTarget(roll) {
  if (roll.marine) return 'marine';
  if (roll.dead) return 'dead';
  if (roll.tree) return 'tree';
  return 'open';
}

// A path of points from `from` (high) to `to` (the ground): it walks down in uneven steps, each a little off to
// the side, pulled back toward the line so it lands where it should. Then one or two short forks off the upper half.
export function boltPoints(from, to, rand = Math.random) {
  const main = [{ x: from.x, y: from.y, z: from.z }];
  const steps = 11;
  let ox = 0, oz = 0;
  for (let i = 1; i < steps; i++) {
    const u = i / steps + (rand() - 0.5) * 0.04;
    ox = ox * 0.55 + (rand() - 0.5) * 7 * (1 - u);
    oz = oz * 0.55 + (rand() - 0.5) * 7 * (1 - u);
    main.push({ x: from.x + (to.x - from.x) * u + ox, y: from.y + (to.y - from.y) * u, z: from.z + (to.z - from.z) * u + oz });
  }
  main.push({ x: to.x, y: to.y, z: to.z });
  const paths = [main];
  const forks = 1 + (rand() < 0.5 ? 1 : 0);
  for (let f = 0; f < forks; f++) {
    const at = 2 + Math.floor(rand() * 4);
    const p0 = main[at];
    const dx = (rand() - 0.5) * 2, dz = (rand() - 0.5) * 2, len = 8 + rand() * 10;
    const fork = [p0];
    for (let i = 1; i <= 4; i++) {
      const u = i / 4;
      fork.push({ x: p0.x + dx * len * u + (rand() - 0.5) * 2, y: p0.y - len * u * 1.1, z: p0.z + dz * len * u + (rand() - 0.5) * 2 });
    }
    paths.push(fork);
  }
  return paths;
}

// Each segment as two ribbons crossed at right angles (so it reads from any side), `w` wide; forks thinner.
export function buildBoltGeometry(T, paths, w = 0.5) {
  const pos = [], idx = [];
  paths.forEach((pts, pi) => {
    const hw = (pi === 0 ? w : w * 0.5) / 2;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      const taper = pi === 0 ? 1 : 1 - i / pts.length;
      for (const [sx, sz] of [[1, 0], [0, 1]]) {
        const base = pos.length / 3, h = hw * taper;
        pos.push(a.x - sx * h, a.y, a.z - sz * h, a.x + sx * h, a.y, a.z + sz * h,
          b.x + sx * h, b.y, b.z + sz * h, b.x - sx * h, b.y, b.z - sz * h);
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
  });
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

// The boots on the ground: a pair of tall yellow rubber boots, black soles, one stood up and one fallen on its side.
export function buildInsulatedBoots(T) {
  const g = new T.Group();
  g.name = 'insulated-boots';
  const rubber = new T.MeshStandardMaterial({ color: BOOTS_HEX, roughness: 0.55 });
  const sole = new T.MeshStandardMaterial({ color: 0x161512, roughness: 0.9 });
  const band = new T.MeshStandardMaterial({ color: 0x1d1d1a, roughness: 0.6 });
  const boot = () => {
    const b = new T.Group();
    const add = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; b.add(m); return m; };
    add(new T.BoxGeometry(0.13, 0.36, 0.14), rubber, 0, 0.21, -0.02);     // the shaft
    add(new T.BoxGeometry(0.135, 0.03, 0.145), band, 0, 0.36, -0.02);     // a black band at the top
    add(new T.BoxGeometry(0.13, 0.1, 0.26), rubber, 0, 0.07, 0.04);       // the foot
    add(new T.BoxGeometry(0.14, 0.03, 0.28), sole, 0, 0.015, 0.04);       // the sole
    return b;
  };
  const a = boot(); a.position.set(-0.1, 0, 0); a.rotation.y = 0.2; g.add(a);
  const b = boot(); b.position.set(0.16, 0.07, 0.05); b.rotation.set(0, -0.5, Math.PI / 2); g.add(b);
  g.userData.mats = [rubber, sole, band];
  return g;
}

// CL-179 (Jerry: "Let us improve the quality of the skeleton model and the boots"): a rounder, more detailed pair and
// skeleton. Small pieces are merged into one vertex-coloured mesh per boot here (mergeColoured), and the perch's parts
// are still handed to the host as plain meshes to merge into one draw.
function mergeColoured(T, meshes, roughness = 0.6) {
  const pos = [], nor = [], col = [];
  for (const m of meshes) {
    m.updateMatrix();
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
    const p = g.attributes.position.array, n = g.attributes.normal.array, c = m.material.color;
    for (let i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); nor.push(n[i], n[i + 1], n[i + 2]); col.push(c.r, c.g, c.b); }
    g.dispose(); m.geometry.dispose();
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  const mesh = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness }));
  mesh.castShadow = true;
  return mesh;
}
// Shape helpers shared by the boots and the perch: each makes one plain mesh and pushes it on `out`.
function shaper(T, out) {
  const up = new T.Vector3(0, 1, 0), dir = new T.Vector3();
  const place = (o, x, y, z, rx = 0, ry = 0, rz = 0, s = null) => {
    o.position.set(x, y, z); o.rotation.set(rx, ry, rz); if (s) o.scale.set(s[0], s[1], s[2]); out.push(o); return o;
  };
  return {
    box: (w, h, d, m, x, y, z, rx, ry, rz) => place(new T.Mesh(new T.BoxGeometry(w, h, d), m), x, y, z, rx, ry, rz),
    ball: (r, m, x, y, z, s, ws = 10, hs = 8) => place(new T.Mesh(new T.SphereGeometry(r, ws, hs), m), x, y, z, 0, 0, 0, s),
    cylAt: (rt, rb, h, m, x, y, z, rx, ry, rz, s, seg = 12) => place(new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), m), x, y, z, rx, ry, rz, s),
    ring: (r, tube, m, x, y, z, rx, ry, rz, s, arc = Math.PI * 2) => place(new T.Mesh(new T.TorusGeometry(r, tube, 5, 14, arc), m), x, y, z, rx, ry, rz, s),
    // A tapered rod from a (radius ra) to b (radius rb).
    seg: (a, b, ra, rb, m, n = 8) => {
      dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const len = Math.max(1e-4, dir.length());
      const o = new T.Mesh(new T.CylinderGeometry(rb, ra, len, n), m);
      o.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      o.quaternion.setFromUnitVectors(up, dir.normalize());
      out.push(o); return o;
    },
    // A tube through points (a strap, a rib, a chain).
    tube: (pts, r, m, n = 12) => {
      const curve = new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(p[0], p[1], p[2])));
      const o = new T.Mesh(new T.TubeGeometry(curve, n, r, 5, false), m);
      out.push(o); return o;
    }
  };
}

// One lineman's rubber boot, toe toward +z, sole at y 0: a tapered shaft with creases at the ankle, a black top band
// and pull loops, a rounded foot and toe bumper, a thick sole with a heel and tread lugs. One mesh.
export function buildRubberBoot(T) {
  const parts = [], S = shaper(T, parts);
  const mat = (hex) => new T.MeshStandardMaterial({ color: hex });
  const Y = mat(BOOTS_HEX), Yd = mat(0xb98f12), K = mat(0x151412), Kb = mat(0x232220);
  S.box(0.128, 0.03, 0.29, K, 0, 0.015, 0.035);                                 // the sole
  S.box(0.122, 0.035, 0.085, K, 0, 0.022, -0.075);                              // the heel
  for (let i = 0; i < 5; i++) S.box(0.13, 0.012, 0.022, Kb, 0, -0.004, -0.085 + i * 0.058);   // tread lugs
  S.cylAt(0.058, 0.058, 0.15, Y, 0, 0.072, 0.05, Math.PI / 2, 0, 0, [1, 1, 0.8], 12);          // the foot
  S.ball(0.058, Y, 0, 0.072, 0.125, [1, 0.8, 1.05]);                            // the rounded toe
  S.ball(0.061, K, 0, 0.058, 0.138, [1.02, 0.62, 0.95]);                        // the black toe bumper
  S.ball(0.058, Y, 0, 0.075, -0.03, [1, 0.85, 1]);                              // the heel's round
  S.box(0.112, 0.07, 0.02, K, 0, 0.065, -0.088);                                // the heel counter
  S.cylAt(0.067, 0.061, 0.29, Y, 0, 0.235, -0.015, 0, 0, 0, [1, 1, 1.12], 14);  // the shaft
  for (const y of [0.125, 0.152]) S.ring(0.063, 0.006, Yd, 0, y, -0.012, Math.PI / 2, 0, 0, [1, 1.14, 1]);   // ankle creases
  S.cylAt(0.07, 0.069, 0.032, K, 0, 0.375, -0.015, 0, 0, 0, [1, 1, 1.12], 14);  // the top band
  for (const x of [-0.07, 0.07]) S.ring(0.016, 0.0045, K, x, 0.4, -0.015, 0, Math.PI / 2, 0);   // pull loops
  const boot = mergeColoured(T, parts, 0.5);
  boot.name = 'rubber-boot';
  return boot;
}

// CL-178/179: the pair on his feet, side by side, toes toward -z (the way he faces), soles at the origin.
export function buildWornBoots(T) {
  const g = new T.Group();
  g.name = 'insulated-boots';
  const a = buildRubberBoot(T), b = buildRubberBoot(T);
  a.position.set(-0.13, 0, 0); a.rotation.set(0.04, Math.PI - 0.12, 0);
  b.position.set(0.14, 0, 0); b.rotation.set(-0.03, Math.PI + 0.18, 0);
  g.add(a, b);
  g.userData.mats = [a.material, b.material];
  return g;
}

// CL-178/179: the work platform and the skeleton on it, as plain meshes in the mast's frame (origin at the foot of its
// centre, +y up, ladder on the -z face), for the host to merge into one draw. He sits on the platform's outer edge
// facing out (-z), slumped back against the mast: patrol cap tipped over one eye socket, jaw dropped, his jacket open
// on the ribs with his dog tags on them, one hand fallen on the grating and one in his lap, his lanyard still clipped
// to the leg. His trousers are tucked into the boots (their own object), and under the boots his feet are bone.
export function buildMastPerchParts(T) {
  const parts = [], S = shaper(T, parts);
  const mat = (hex) => new T.MeshStandardMaterial({ color: hex, roughness: 0.85 });
  const M = { grate: mat(0x4b5155), steel: mat(0x6b7278), rust: mat(0x6e4a32), olive: mat(0x56603a), oliveDk: mat(0x434b2c),
    oliveLt: mat(0x6a7348), bone: mat(0xdcd3b8), boneDk: mat(0xb9ae90), socket: mat(0x0d0c0a), belt: mat(0x2a2a22),
    brass: mat(0x8f7a45), tag: mat(0xaeb3b6), strap: mat(0x9a5a1e) };
  const D = MAST_PERCH.deckY;
  // --- The platform: a grating off the -z face, left of the ladder, on two struts, a toe board and a rail.
  S.box(0.95, 0.03, 0.85, M.grate, -0.775, D - 0.035, -0.975);
  for (let i = 0; i < 9; i++) S.box(0.95, 0.03, 0.022, M.steel, -0.775, D - 0.005, -0.59 - i * 0.095);
  for (const x of [-1.24, -0.31]) S.box(0.03, 0.05, 0.85, M.steel, x, D - 0.01, -0.975);
  S.box(0.6, 0.08, 0.018, M.steel, -0.95, D + 0.03, -1.39);          // a toe board, where his legs don't hang
  S.seg([-0.55, D - 1.0, -0.56], [-1.2, D - 0.05, -1.36], 0.025, 0.025, M.steel, 6);
  S.seg([-0.42, D - 1.0, -0.56], [-0.36, D - 0.05, -1.36], 0.025, 0.025, M.steel, 6);
  for (const z of [-0.6, -1.36]) S.seg([-1.22, D, z], [-1.22, D + 0.92, z], 0.022, 0.022, M.steel, 6);
  S.seg([-1.22, D + 0.9, -0.58], [-1.22, D + 0.9, -1.38], 0.024, 0.024, M.steel, 6);
  S.seg([-1.22, D + 0.46, -0.6], [-1.22, D + 0.46, -1.36], 0.018, 0.018, M.steel, 6);
  S.box(0.1, 0.03, 0.06, M.rust, -0.47, D - 0.03, -1.12);             // a rust bloom on the grating
  // --- His torso: a frame leaning back against the mast (about 19 degrees), facing -z.
  const th = 0.33, cu = Math.cos(th), su = Math.sin(th);
  const base = [-0.78, D + 0.16, -1.18];
  // P(a, b, c): a across (+x), b up his spine, c forward (out from his chest).
  const P = (a, b, c) => [base[0] + a, base[1] + b * cu + c * su, base[2] + b * su - c * cu];
  // Hips and trousers' seat, the belt with its buckle and a canteen pouch.
  S.box(0.3, 0.16, 0.22, M.olive, -0.78, D + 0.1, -1.22);
  S.seg(P(-0.16, 0.04, 0), P(0.16, 0.04, 0), 0.115, 0.115, M.belt, 10).scale.set(1, 1, 0.82);
  S.box(0.06, 0.05, 0.02, M.brass, ...P(0, 0.04, 0.105));
  S.box(0.08, 0.1, 0.06, M.oliveDk, ...P(-0.17, 0.0, -0.02));
  // The jacket: a back and two front panels hanging open on the ribs, a collar, shoulders and a patch.
  S.box(0.34, 0.46, 0.06, M.olive, ...P(0, 0.27, -0.075)).rotation.x = th;
  for (const s of [-1, 1]) {
    S.box(0.085, 0.44, 0.15, M.olive, ...P(s * 0.13, 0.27, 0.01)).rotation.set(th, 0, -s * 0.06);
    S.box(0.07, 0.1, 0.012, M.oliveDk, ...P(s * 0.13, 0.33, 0.09)).rotation.x = th;   // a breast pocket
    S.ball(0.075, M.olive, ...P(s * 0.17, 0.46, -0.02), [1, 0.8, 1]);                  // a shoulder
  }
  S.box(0.07, 0.05, 0.012, M.oliveLt, ...P(-0.2, 0.38, -0.02)).rotation.set(th, 0, 0.1);   // a shoulder patch
  S.ring(0.065, 0.02, M.oliveDk, ...P(0, 0.5, 0), Math.PI / 2 + th, 0, 0, [1, 1.1, 1]);  // the collar
  // Inside the open jacket: the spine, the sternum, and five pairs of ribs curving round from it.
  S.seg(P(0, 0.08, -0.03), P(0, 0.48, -0.03), 0.018, 0.016, M.boneDk, 6);
  S.box(0.026, 0.2, 0.014, M.bone, ...P(0, 0.31, 0.075)).rotation.x = th;
  for (let i = 0; i < 5; i++) {
    const b = 0.41 - i * 0.055, R = 0.1 - i * 0.004;
    for (const s of [-1, 1]) {
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const a = (k / 6) * 1.75;
        pts.push(P(s * R * Math.sin(a) * 1.15, b - 0.025 * Math.sin(a) - 0.015 * (k / 6), R * 0.8 * Math.cos(a) - 0.005));
      }
      S.tube(pts, 0.0075, M.bone, 8);
    }
  }
  // His dog tags on their chain, lying on the ribs.
  S.tube([P(-0.05, 0.5, 0.02), P(-0.03, 0.4, 0.07), P(0, 0.32, 0.085), P(0.03, 0.4, 0.07), P(0.05, 0.5, 0.02)], 0.003, M.tag, 10);
  S.box(0.022, 0.034, 0.004, M.tag, ...P(-0.006, 0.31, 0.092)).rotation.set(th, 0, 0.2);
  S.box(0.022, 0.034, 0.004, M.tag, ...P(0.012, 0.305, 0.095)).rotation.set(th, 0, -0.25);
  // The neck: three vertebrae.
  for (let i = 0; i < 3; i++) S.cylAt(0.017, 0.017, 0.022, i % 2 ? M.boneDk : M.bone, ...P(0.005 * i, 0.53 + i * 0.03, -0.01 - 0.008 * i), th, 0, 0, null, 8);
  // --- The skull, lolled forward and to his left.
  const H = [-0.72, D + 0.785, -1.1];
  const h = (x, y, z) => [H[0] + x, H[1] + y, H[2] + z];
  S.ball(0.098, M.bone, ...h(0, 0.012, 0.008), [0.9, 0.98, 1.08], 14, 10);         // the cranium
  S.ball(0.072, M.bone, ...h(0, -0.04, -0.035), [1, 0.85, 0.95], 12, 8);            // the face
  for (const s of [-1, 1]) {
    S.ball(0.03, M.socket, ...h(s * 0.034, 0.0, -0.081), [1, 0.95, 0.6]);           // eye sockets
    S.box(0.045, 0.012, 0.03, M.bone, ...h(s * 0.035, 0.03, -0.083));              // the brow over them
    S.ball(0.022, M.bone, ...h(s * 0.06, -0.035, -0.06), [1, 0.8, 1]);             // cheekbones
    S.box(0.012, 0.055, 0.04, M.boneDk, ...h(s * 0.058, -0.085, -0.03), 0.3);      // the jaw's sides, hanging open
  }
  S.cylAt(0.014, 0.004, 0.03, M.socket, ...h(0, -0.04, -0.103), -Math.PI / 2 + 0.3, 0, 0, null, 3);   // the nose
  S.box(0.072, 0.02, 0.02, M.bone, ...h(0, -0.076, -0.083));                      // upper teeth
  for (let i = 0; i < 5; i++) S.box(0.003, 0.021, 0.022, M.socket, ...h(-0.028 + i * 0.014, -0.076, -0.083));
  S.box(0.085, 0.022, 0.06, M.boneDk, ...h(0, -0.125, -0.06), 0.42);             // the jaw, dropped
  S.box(0.062, 0.016, 0.016, M.bone, ...h(0, -0.11, -0.088), 0.42);              // lower teeth
  // The patrol cap, tipped over his right eye.
  const cap = S.cylAt(0.098, 0.104, 0.075, M.oliveDk, ...h(-0.006, 0.09, 0.0), 0.28, 0, 0.22, [1, 1, 1.06], 14);
  void cap;
  S.box(0.2, 0.012, 0.02, M.olive, ...h(-0.01, 0.05, -0.045), 0.28, 0, 0.22);    // its band
  const brim = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.012, 14, 1, false, Math.PI / 2, Math.PI), M.oliveDk);
  brim.position.set(...h(-0.02, 0.055, -0.07)); brim.rotation.set(0.48, 0, 0.22); brim.scale.set(1, 1, 0.75); parts.push(brim);
  // --- Arms: one fallen by his side, its hand on the grating; the other in his lap.
  const arm = (sh, el, wr, hand, palmYaw) => {
    S.seg(sh, el, 0.048, 0.042, M.olive, 8);                                      // the sleeve to the elbow
    S.ball(0.04, M.olive, ...el);
    S.seg(el, [el[0] + (wr[0] - el[0]) * 0.35, el[1] + (wr[1] - el[1]) * 0.35, el[2] + (wr[2] - el[2]) * 0.35], 0.04, 0.036, M.olive, 8);   // the cuff
    S.seg(el, wr, 0.013, 0.011, M.bone, 6);                                       // radius
    S.seg([el[0] + 0.02, el[1], el[2]], [wr[0] + 0.018, wr[1], wr[2]], 0.01, 0.009, M.boneDk, 6);   // ulna
    S.box(0.05, 0.016, 0.055, M.bone, ...hand, 0, palmYaw, 0);                     // the palm
    for (let i = 0; i < 4; i++) {
      const fx = hand[0] + Math.cos(palmYaw) * (-0.018 + i * 0.012), fz = hand[2] - Math.sin(palmYaw) * (-0.018 + i * 0.012);
      const tipX = fx - Math.sin(palmYaw) * 0.05, tipZ = fz - Math.cos(palmYaw) * 0.05;
      S.seg([fx - Math.sin(palmYaw) * 0.026, hand[1], fz - Math.cos(palmYaw) * 0.026], [tipX, hand[1] - 0.012, tipZ], 0.0045, 0.004, M.bone, 4);
    }
  };
  arm(P(-0.19, 0.44, -0.02), [-1.0, D + 0.3, -1.12], [-1.02, D + 0.075, -1.2], [-1.02, D + 0.03, -1.24], 0.2);
  arm(P(0.19, 0.44, -0.02), [-0.6, D + 0.32, -1.16], [-0.72, D + 0.22, -1.31], [-0.76, D + 0.205, -1.36], -0.5);
  // --- Legs over the edge: thighs out, shins hanging, trousers tucked into the boots, bone below.
  const bootX = MAST_PERCH.boots.x, bootZ = MAST_PERCH.boots.z, bootY = MAST_PERCH.boots.y;
  for (const dx of [-0.13, 0.14]) {
    const x = bootX + dx, hipP = [bootX + dx * 0.6, D + 0.1, -1.22], knee = [x, D + 0.11, -1.53];
    S.seg(hipP, knee, 0.075, 0.064, M.olive, 10);                                  // the thigh
    S.box(0.05, 0.11, 0.1, M.oliveDk, x + Math.sign(dx) * 0.06, D + 0.11, -1.4);   // a cargo pocket
    S.ball(0.062, M.olive, ...knee, [1, 1, 1.1]);                                   // the knee
    S.seg(knee, [x, bootY + 0.34, bootZ], 0.058, 0.05, M.olive, 10);                // the shin, into the boot
    S.ring(0.052, 0.012, M.oliveDk, x, bootY + 0.345, bootZ, Math.PI / 2, 0, 0);    // trouser blousing at the top
    S.seg([x, bootY + 0.35, bootZ], [x, bootY + 0.09, bootZ - 0.01], 0.02, 0.016, M.bone, 6);   // the shin bone
    S.ball(0.024, M.boneDk, x, bootY + 0.08, bootZ - 0.008);                         // the ankle
    S.box(0.06, 0.035, 0.08, M.bone, x, bootY + 0.05, bootZ - 0.045);               // the foot's bones
    for (let i = 0; i < 4; i++) S.seg([x - 0.022 + i * 0.015, bootY + 0.045, bootZ - 0.085], [x - 0.024 + i * 0.016, bootY + 0.035, bootZ - 0.135], 0.006, 0.005, M.bone, 4);
  }
  // --- His lanyard, still clipped to the mast's leg: why he never fell.
  S.tube([P(0.08, 0.02, 0.07), [-0.66, D + 0.42, -0.95], [-0.6, D + 0.68, -0.72], [-0.56, D + 0.8, -0.6]], 0.011, M.strap, 12);
  S.ring(0.025, 0.006, M.steel, -0.56, D + 0.8, -0.58, 0, 0.8, 0);                  // the carabiner on the leg
  for (const p of parts) { p.castShadow = true; p.receiveShadow = true; }
  return parts;
}

export { mulberry };
