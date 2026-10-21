// GB-92 (P-97, D-56/D-67; docs/specs/secret-quest.md 5-6): the guardian's fight in the heart under the Marrow, the
// only place it can die. The rules alone (no three.js, no DOM), so node can test them; index.html moves the guardian
// on its CL-78 rig, draws the columns and the source, and acts on the events.
//
//   createHeartFight({ hp, columns }) -> {
//     damage(amount)                  his hit, after the damage table: { taken, phase, phaseChanged, dead }
//     tick(dt, { dist, awake, hush }) one frame: dist to him (m), how many it has called still up, whether the Hush
//                                     still has battery. Returns the frame's events (below)
//     read() -> { hp, maxHp, phase, reach, flat, dead, winding }
//   }
//   events: { kind: 'lunge' } it winds up; { kind: 'grab' } the lunge reaches him (index: the kick-free or the cave
//   death); { kind: 'miss' }; { kind: 'call', n } n dead up out of the source; { kind: 'column', id } a white column
//   comes down (phase 3); { kind: 'phase', phase }; { kind: 'flat' } the Hush ran flat: the source roars and it can't
//   be hurt until he is out; { kind: 'dead' } once.
//
// The numbers (Grokbot's, secret-quest.md 5): three phases by its health (full, two-thirds, a third); its reach grows
// each phase; between lunges it calls the dead out of the source, at most 12 up at once; in the last it pulls the
// columns down. HEART.HP is an estimate, not a measurement (D-71: no medians): an AK's sustained 153 a second, x0.6
// for the guardian's bullet column and x0.7 for its armour, on target about 30% of the time between dodging and
// the called dead, is about 19 a second; three minutes of that is about 3,400.

export const HEART = Object.freeze({
  HP: 3400,
  PHASE_AT: Object.freeze([2 / 3, 1 / 3]),
  REACH: Object.freeze([3.0, 4.2, 5.6]),       // a lunge's reach (m), by phase
  LUNGE_CD: Object.freeze([5.0, 4.2, 3.4]),    // seconds between lunges
  WINDUP: 0.7,                                  // the tell before it lunges
  CALL_CAP: 12,
  CALL_EVERY: Object.freeze([10, 8, 6]),
  CALL_N: Object.freeze([2, 3, 4]),
  COLUMN_EVERY: 9,
});

export function createHeartFight({ hp = HEART.HP, maxHp = HEART.HP, columns = [] } = {}) {
  let HP = Math.max(1, Math.min(maxHp, hp)), phase = 1, flat = false, dead = false, deadSent = false;
  let lungeCd = HEART.LUNGE_CD[0], windT = 0, callT = HEART.CALL_EVERY[0] * 0.5, columnT = HEART.COLUMN_EVERY;
  const standing = columns.map((c, i) => (c && c.id != null ? c.id : i));
  const pending = [];
  const phaseFor = (h) => (h > maxHp * HEART.PHASE_AT[0] ? 1 : h > maxHp * HEART.PHASE_AT[1] ? 2 : 3);
  phase = phaseFor(HP);
  return {
    damage(amount) {
      if (dead || flat || !(amount > 0)) return { taken: 0, phase, phaseChanged: false, dead };
      const taken = Math.min(HP, amount);
      HP -= taken;
      const was = phase;
      phase = phaseFor(HP);
      if (phase !== was) { pending.push({ kind: 'phase', phase }); if (phase === 3) columnT = 1.5; }
      if (HP <= 0) { HP = 0; dead = true; }
      return { taken, phase, phaseChanged: phase !== was, dead };
    },
    tick(dt, see = {}) {
      const out = pending.splice(0);
      if (dead) { if (!deadSent) { deadSent = true; out.push({ kind: 'dead' }); } return out; }
      if (!flat && see.hush === false) { flat = true; out.push({ kind: 'flat' }); }
      const i = phase - 1, dist = see.dist != null ? see.dist : Infinity;
      if (windT > 0) {
        windT -= dt;
        if (windT <= 0) { out.push({ kind: dist <= HEART.REACH[i] ? 'grab' : 'miss' }); lungeCd = HEART.LUNGE_CD[i]; }
        return out;
      }
      lungeCd -= dt;
      if (lungeCd <= 0 && dist <= HEART.REACH[i] + 2.5) { windT = HEART.WINDUP; out.push({ kind: 'lunge' }); return out; }
      // Between its lunges: the dead out of the source.
      callT -= dt;
      if (callT <= 0) {
        callT = HEART.CALL_EVERY[i];
        const n = Math.min(HEART.CALL_N[i], HEART.CALL_CAP - (see.awake | 0));
        if (n > 0) out.push({ kind: 'call', n });
      }
      if (phase === 3 && standing.length) {
        columnT -= dt;
        if (columnT <= 0) { columnT = HEART.COLUMN_EVERY; out.push({ kind: 'column', id: standing.shift() }); }
      }
      return out;
    },
    read() { return { hp: HP, maxHp, phase, reach: HEART.REACH[phase - 1], flat, dead, winding: windT > 0, columns: standing.slice() }; },
  };
}
