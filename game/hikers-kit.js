// GB-196 (D-82, docs/specs/day-missions.md 3): the hikers' first-aid kit, hung in a bag from a branch.
// Pure game-time rules (no DOM, no three). The caller owns the tree, the river's flow, sound, the dead and the reward.
//  hanging -> (a round cuts the rope) falling -> ground | floating (a river run, landing in the water)
//  floating -> (FLOAT_S unclaimed) snagged in the pool, where the drowned rise once he comes near
//  ground | floating | snagged -> (E within GRAB_R) caught
export const HIKERS = Object.freeze({ ropeH: 5, gravity: 9.8, grabR: 2, floatS: 40, drownedMin: 3, drownedMax: 5, treeNear: 50, treeFar: 120,
  poolWakeR: 14, ropeR: 0.09 });

// A run's seed: the same run always rolls the same.
export function hikersSeed(run) {
  let h = 2166136261 >>> 0; const s = String(run);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12;
  return h >>> 0;
}
// About half the runs the bag swings out over the water (when there is a river).
export function riverRun(seed) { return ((seed >>> 7) & 1) === 1; }
export function drownedCount(seed, rule = HIKERS) { return rule.drownedMin + ((seed >>> 3) % (rule.drownedMax - rule.drownedMin + 1)); }

// Closest distance between segments a0-a1 and b0-b1 (points {x,y,z}).
export function segmentDistance(a0, a1, b0, b1) {
  const d1 = [a1.x - a0.x, a1.y - a0.y, a1.z - a0.z], d2 = [b1.x - b0.x, b1.y - b0.y, b1.z - b0.z], r = [a0.x - b0.x, a0.y - b0.y, a0.z - b0.z];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r), cl = (v) => Math.max(0, Math.min(1, v));
  let s, t;
  if (a < 1e-12 && e < 1e-12) { s = 0; t = 0; }
  else if (a < 1e-12) { s = 0; t = cl(f / e); }
  else {
    const c = dot(d1, r);
    if (e < 1e-12) { t = 0; s = cl(-c / a); }
    else { const b = dot(d1, d2), den = a * e - b * b; s = den > 1e-12 ? cl((b * f - c * e) / den) : 0; t = (b * s + f) / e;
      if (t < 0) { t = 0; s = cl(-c / a); } else if (t > 1) { t = 1; s = cl((b - c) / a); } }
  }
  const p = [a0.x + d1[0] * s - (b0.x + d2[0] * t), a0.y + d1[1] * s - (b0.y + d2[1] * t), a0.z + d1[2] * s - (b0.z + d2[2] * t)];
  return Math.sqrt(dot(p, p));
}
// Does a round's step (from, to) cross the rope (its pieces: [[p, q], ...])?
export function roundCutsRope(from, to, pieces, rule = HIKERS) {
  for (const [p, q] of pieces) if (segmentDistance(from, to, p, q) <= rule.ropeR) return true;
  return false;
}

// GB-196 follow-up (Claude): the tree. trees: [{ tree, d (to the camp), bank (a river-bank tree whose bough reaches the
// water) }]. The nearest bank tree within treeNear wins; else the nearest bank tree within treeFar; only when there is
// none, the nearest tree at the camp (3 m to treeNear), and then no river. Returns { tree, river } or null.
export function pickHikersTree(trees, rule = HIKERS) {
  let near = null, far = null, camp = null;
  for (const c of trees) {
    if (!c || !(c.d >= 0)) continue;
    if (c.bank && c.d <= rule.treeNear && (!near || c.d < near.d)) near = c;
    else if (c.bank && c.d <= rule.treeFar && (!far || c.d < far.d)) far = c;
    if (c.d > 3 && c.d <= rule.treeNear && (!camp || c.d < camp.d)) camp = c;
  }
  const bank = near || far;
  if (bank) return { tree: bank.tree, river: true };
  return camp ? { tree: camp.tree, river: false } : null;
}

export function createHikersKit({ seed = 1, river = true, config = {} } = {}) {
  const rule = { ...HIKERS, ...config };
  let phase, height, vy, floatT, risen, done;
  const toRiver = river && riverRun(seed), drowned = drownedCount(seed, rule);
  const reset = () => { phase = 'hanging'; height = rule.ropeH; vy = 0; floatT = 0; risen = false; done = false; };
  reset();
  const ev = (kind, extra = {}) => ({ kind, ...extra });
  const read = () => ({ phase, height, floatT, risen, done, toRiver, drowned,
    loose: phase === 'ground' || phase === 'floating' || phase === 'snagged', untilSnag: phase === 'floating' ? Math.max(0, rule.floatS - floatT) : null });
  const cut = () => { if (phase !== 'hanging') return []; phase = 'falling'; vy = 0; return [ev('cut')]; };
  // dt: game seconds. inWater: the bag's landing spot (or where it floats) is in the river.
  // poolDist: his distance to the bag once snagged.
  const step = (dt, { inWater = false, poolDist = Infinity } = {}) => {
    const out = [];
    if (phase === 'falling') {
      vy += rule.gravity * dt; height -= vy * dt;
      if (height <= 0) { height = 0; if (toRiver && inWater) { phase = 'floating'; floatT = 0; out.push(ev('splash')); } else { phase = 'ground'; out.push(ev('land')); } }
    } else if (phase === 'floating') {
      floatT += dt;
      if (floatT >= rule.floatS) { phase = 'snagged'; out.push(ev('snag')); }
    }
    if (phase === 'snagged' && !risen && poolDist <= rule.poolWakeR) { risen = true; out.push(ev('drowned-rise', { n: drowned })); }
    return out;
  };
  const grab = (dist) => {
    if (!(phase === 'ground' || phase === 'floating' || phase === 'snagged') || !(dist <= rule.grabR)) return [];
    phase = 'caught'; done = true; return [ev('caught')];
  };
  return { read, cut, step, grab, reset, rule };
}
