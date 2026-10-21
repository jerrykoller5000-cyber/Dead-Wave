// GB-197 (D-82, docs/specs/day-missions.md section 5): the fuel depot, carry it home. Pure rules: no DOM, no three.
//  at-pump -> (hold E fillS at the pump) carried -> (E) down -> (E) carried ... -> (E at the generator) poured (done)
//  carried | down -> (fire or acid only) blown: the can goes up; a fresh empty can waits at the pump again.
// While carried it leaks: a drip every dripEvery metres he walks, and every callEvery seconds the smell calls the dead.
export const FUEL = Object.freeze({ fillS: 3, slow: 0.62, dripEvery: 1.6, dripLife: 60, callEvery: 14, callFirst: 6,
  pumpR: 2.2, genR: 2.4, pickR: 1.8, touchR: 1.3, boomDamage: 70, boomR: 6 });

// Only fire and acid set it off: flames, a burning zombie, the flamer, a spitter's hit. Never his own stray rounds,
// a fall, a bite or a drop.
const IGNITERS = new Set(['fire', 'flame', 'flamer', 'burning', 'acid', 'spitter', 'napalm']);
export function ignites(cause) { return IGNITERS.has(String(cause || '').toLowerCase()); }

// How many the smell calls at a time, by day (1-2 early, up to 4 late).
export function smellCall(day) { const d = Math.max(1, day | 0); return Math.min(4, 1 + Math.floor((d - 1) / 6)); }

export function createFuelRun({ config = {} } = {}) {
  const rule = { ...FUEL, ...config };
  let phase = 'at-pump', fill = 0, done = false, walked = 0, callT = rule.callFirst, drips = 0, booms = 0, down = null;
  const ev = (kind, extra = {}) => ({ kind, ...extra });
  const read = () => ({ phase, fill, fillShare: Math.min(1, fill / rule.fillS), done, drips, booms, down: down ? { ...down } : null,
    carried: phase === 'carried', slow: phase === 'carried' ? rule.slow : 1 });
  // held: E is down; atPump: he is within pumpR of the pump. Letting go keeps what is in the can (a hold, not a race).
  const holdFill = (dt, held, atPump) => {
    if (phase !== 'at-pump' || done) return [];
    if (!held || !atPump) return [];
    fill += dt;
    if (fill >= rule.fillS) { fill = rule.fillS; phase = 'carried'; walked = 0; callT = rule.callFirst; return [ev('filled')]; }
    return [];
  };
  const putDown = (x, z) => { if (phase !== 'carried') return []; phase = 'down'; down = { x, z }; return [ev('put-down', { x, z })]; };
  const pickUp = (dist) => { if (phase !== 'down' || !(dist <= rule.pickR)) return []; phase = 'carried'; down = null; return [ev('picked-up')]; };
  // Called each frame while carried: moved = metres walked this frame, day for the call size.
  const carry = (dt, moved, day = 1) => {
    if (phase !== 'carried') return [];
    const out = [];
    walked += Math.max(0, moved);
    while (walked >= rule.dripEvery) { walked -= rule.dripEvery; drips++; out.push(ev('drip')); }
    callT -= dt;
    if (callT <= 0) { callT += rule.callEvery; out.push(ev('smell-call', { n: smellCall(day) })); }
    return out;
  };
  const ignite = (cause) => {
    if (!(phase === 'carried' || phase === 'down') || !ignites(cause)) return [];
    const at = phase === 'down' ? { ...down } : null;
    phase = 'at-pump'; fill = 0; down = null; booms++;
    return [ev('boom', { cause: String(cause), at })];
  };
  const pour = (atGenerator) => { if (phase !== 'carried' || !atGenerator || done) return []; phase = 'poured'; done = true; return [ev('poured')]; };
  const reset = () => { phase = 'at-pump'; fill = 0; done = false; walked = 0; callT = rule.callFirst; drips = 0; booms = 0; down = null; };
  return { read, holdFill, putDown, pickUp, carry, ignite, pour, reset, rule };
}