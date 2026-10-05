// CL-90 part 2 (P-116, D-61, docs/loadout.md §3): the draw and holster moves. Where each gun lives on him
// decides the reach: the base pistol on the hip (the drop-leg holster), the secondaries across the chest (the
// cross-draw holsters under his arms), the primaries off his back (slung over his shoulders). A switch is two
// moves in one: the gun in his hand goes back where it lives (stow), then his hand goes to the next one and brings
// it up (draw). Going unarmed is a stow alone; drawing from unarmed is a draw alone.
//
// Cosmetic only: nothing here delays a shot. A shot, a reload or a blade cuts the move short and the gun is
// simply up, so the game plays exactly as it did (the quick dip is what it was before).
//
// Pure: the clock and the reach points. The game solves the arms with its own IK (index.html, the CL-90 block).

export const DRAW_TIMES = Object.freeze({
  stow: 0.18,                                         // the gun in hand goes back where it lives
  reach: Object.freeze({ hip: 0.16, chest: 0.15, back: 0.2 }),   // the hand to the next gun, and takes it
  raise: 0.18,                                        // and brings it up into the hold
});

// Where each carried gun lives, from the loadout ({ primary: [a, b], secondary: [c, d] }, kinds or null).
// Returns { at: 'hip' | 'chest' | 'back' | null, slot: 0 | 1 }.
export function drawSourceOf(kind, loadout) {
  if (!kind) return { at: null, slot: 0 };
  const load = loadout || {};
  const sec = load.secondary || [], pri = load.primary || [];
  if (kind === 'pistol') {
    // The base pistol is the hip's; a second pistol (akimbo) sits in a chest holster, handled with akimbo.
    return { at: 'hip', slot: 0 };
  }
  const s = sec.indexOf(kind);
  if (s >= 0) return { at: 'chest', slot: s };
  const p = pri.indexOf(kind);
  if (p >= 0) return { at: 'back', slot: p };
  return { at: null, slot: 0 };
}

// The right hand's reach for each place, in marine space (he faces +z; his right arm is on +x, the drop-leg
// holster on -x). `twist` turns and bends his torso toward the reach so the hand gets there without stretching.
const REACH = {
  hip: [{ x: -0.17, y: 0.67, z: 0.11, twistY: 0.42, bend: 0.22 }],
  chest: [
    { x: 0.17, y: 1.02, z: -0.32, twistY: -0.32, bend: 0.08 }, // pack-mounted secondary
    { x: -0.17, y: 1.02, z: -0.36, twistY: 0.36, bend: 0.08 },
  ],
  back: [
    { x: 0.29, y: 1.36, z: -0.21, twistY: -0.12, bend: -0.05 }, // right edge of pack
    { x: -0.27, y: 1.36, z: -0.21, twistY: 0.30, bend: -0.06 }, // left edge of pack
  ],
};
export function reachPoint(at, slot = 0) {
  const list = REACH[at];
  if (!list) return null;
  return list[Math.min(slot | 0, list.length - 1)];
}
// The left hand lets go of the foregrip and hangs forward while the right is busy.
export const LEFT_REST = Object.freeze({ x: -0.27, y: 0.84, z: 0.13 });

const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

// The move from `from` (the gun in hand, or null) to `to` (the next, or null for unarmed).
// frame() gives what the pose needs this instant:
//   w       how far the arms leave the hold (0 = the game's hold, 1 = at the reach point)
//   target  the reach point the hand is heading for (a blend between the old place and the new one)
//   inHand  which gun is in his hand right now: `from` until it is put away, then nothing, then `to`
//   events  'release' (the old gun is on him again) and 'grab' (the new one is in his hand), once each
export function createDraw() {
  const s = { active: false, from: null, to: null, fromAt: null, toAt: null, segs: [], t: 0, total: 0, fired: new Set() };
  function start(from, to, loadout) {
    const a = drawSourceOf(from, loadout), b = drawSourceOf(to, loadout);
    const segs = [];
    if (from && a.at) segs.push({ kind: 'stow', dur: DRAW_TIMES.stow, at: a.at, slot: a.slot });
    if (to && b.at) segs.push({ kind: 'reach', dur: DRAW_TIMES.reach[b.at], at: b.at, slot: b.slot });
    if (!segs.length) { s.active = false; return false; }
    segs.push({ kind: 'raise', dur: DRAW_TIMES.raise });
    Object.assign(s, { active: true, from, to, fromAt: a.at, toAt: b.at, segs, t: 0, fired: new Set() });
    s.total = segs.reduce((n, g) => n + g.dur, 0);
    return true;
  }
  function cancel() { s.active = false; s.segs = []; s.t = 0; }
  function step(dt) {
    if (!s.active) return [];
    s.t += Math.max(0, dt || 0);
    const events = [];
    const f = frame();
    for (const e of f.passed) if (!s.fired.has(e)) { s.fired.add(e); events.push(e); }
    if (s.t >= s.total) s.active = false;
    return events;
  }
  function frame() {
    const out = { w: 0, target: null, inHand: s.to, passed: [], twistY: 0, bend: 0 };
    if (!s.active) return out;
    let t = s.t, prev = null;
    const hasStow = s.segs[0].kind === 'stow';
    const hasReach = s.segs.some((g) => g.kind === 'reach');
    out.inHand = s.from;
    for (let i = 0; i < s.segs.length; i++) {
      const g = s.segs[i];
      const k = g.dur > 0 ? Math.min(1, t / g.dur) : 1;
      const here = reachPoint(g.at, g.slot);
      if (g.kind === 'stow') {
        out.w = smooth(k); out.target = here;
        if (k >= 1) { out.passed.push('release'); out.inHand = null; }
      } else if (g.kind === 'reach') {
        const from = prev || here;
        out.w = hasStow ? 1 : smooth(k);
        out.target = blend(from, here, hasStow ? smooth(k) : 1);
        if (k >= 1) { out.passed.push('grab'); out.inHand = s.to; }
        else out.inHand = null;
      } else {
        out.w = 1 - smooth(k);
        out.target = prev;
        out.inHand = hasReach ? s.to : null;
      }
      if (here) prev = here;
      if (t < g.dur) break;
      t -= g.dur;
    }
    if (out.target) { out.twistY = out.target.twistY * out.w; out.bend = out.target.bend * out.w; }
    return out;
  }
  return { state: s, start, cancel, step, frame };
}

function blend(a, b, k) {
  if (!a) return b;
  if (!b) return a;
  const l = (p, q) => p + (q - p) * k;
  return { x: l(a.x, b.x), y: l(a.y, b.y), z: l(a.z, b.z), twistY: l(a.twistY, b.twistY), bend: l(a.bend, b.bend) };
}
