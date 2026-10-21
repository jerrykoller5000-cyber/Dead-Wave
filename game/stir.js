// GB-108 (P-139, D-67): the stir. Noise below fills a meter (0-100); the Hush, while its battery lasts, lets it
// settle when he keeps quiet; flat, it climbs on its own. Full, the rock gives ten seconds' warning, then the
// guardian comes through it. Pure (no three.js, no DOM): index.html feeds it the noise and acts on what it says.
//
//   createStir() -> {
//     shot(rawRadius, suppressed)   a shot (rawRadius: the gun's hearing radius before any suppressor)
//     blast()                       a grenade, a launcher round, a nest blown
//     wake(n)                       n dead getting up
//     tick(dt, { running, hush })   one frame; hush: the Hush still has battery. Returns the events of the frame:
//                                   { kind: 'warning' } when it fills, { kind: 'arrive' } ten seconds later
//     kicked()                      he kicked free: the meter drops to 50 and the guardian goes back into the rock
//     over()                        the delve is over (he got out, or the run ended)
//     read() -> { stir, phase, left }
//   }
//
// The numbers are hollows.md 5 and 11 (Grokbot's): +3.5 a shot unsuppressed (scaled by the gun's hearing radius against
// the rifle's 45 m), +0.9 suppressed; +10 a blast; +1.5 a dead waking; +0.3 a second running; after 3 s with
// nothing, -2 a second while the Hush has battery; flat, +1.5 a second on its own. A 10 s warning; 50 after a kick-free.

export const STIR = Object.freeze({
  MAX: 100, SHOT: 3.5, RIFLE_R: 45, SUPPRESSED: 0.9, BLAST: 10, WAKE: 1.5, RUN: 0.3,
  QUIET_S: 3, QUIET: 2, FLAT: 1.5, WARN_S: 10, AFTER_KICK: 50,
});

export function createStir() {
  let stir = 0, quietT = 0, phase = 'calm', left = 0, noisy = false;
  const add = (v) => {
    if (!(v > 0)) return;
    noisy = true;
    if (phase !== 'calm') return;   // full already: the warning runs whatever he does now
    stir = Math.min(STIR.MAX, stir + v);
  };
  return {
    shot(rawRadius, suppressed) { add(suppressed ? STIR.SUPPRESSED : STIR.SHOT * Math.max(0, rawRadius || STIR.RIFLE_R) / STIR.RIFLE_R); },
    blast() { add(STIR.BLAST); },
    wake(n = 1) { add(STIR.WAKE * Math.max(0, n | 0)); },
    tick(dt, see = {}) {
      const out = [];
      if (phase === 'done' || phase === 'grab') { noisy = false; return out; }
      if (see.running) add(STIR.RUN * dt);
      if (noisy) quietT = 0; else quietT += dt;
      noisy = false;
      if (phase === 'calm') {
        if (!see.hush) stir = Math.min(STIR.MAX, stir + STIR.FLAT * dt);   // flat: quiet no longer helps, and it climbs
        else if (quietT >= STIR.QUIET_S) stir = Math.max(0, stir - STIR.QUIET * dt);
        if (stir >= STIR.MAX) { stir = STIR.MAX; phase = 'warning'; left = STIR.WARN_S; out.push({ kind: 'warning', left }); }
      } else if (phase === 'warning') {
        left -= dt;
        if (left <= 0) { left = 0; phase = 'grab'; out.push({ kind: 'arrive' }); }
      }
      return out;
    },
    kicked() { stir = STIR.AFTER_KICK; phase = 'calm'; left = 0; quietT = 0; },
    over() { phase = 'done'; left = 0; },
    read() { return { stir, phase, left }; },
  };
}
