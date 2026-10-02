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
  EDGE_S: 3              // no strike in the first or last few seconds of a shower
});

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

export { mulberry };
