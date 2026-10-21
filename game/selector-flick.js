// GB-167 (Jerry, 2026-10-13): "The X button to switch between semi and full auto needs a little click sound. Also a
// small little thumb animation for each weapon that has both semi and full auto." The firing hand's thumb reaches up
// to the selector, rocks it over and comes back in SELECTOR_FLICK.dur s. Visual only: it adds to the hand pose after
// the grip has been worked out, never touches the fire timing, and drops out the moment the gun changes.
export const SELECTOR_FLICK = Object.freeze({ dur: 0.3, reach: 0.85, swing: 0.55, roll: 0.6 });

export function createSelectorFlick(now = () => performance.now() / 1000) {
  const st = { weapon: null, t0: -1, mode: null, count: 0, hold: null };   // hold: a fixed phase, for shots
  return {
    state: st,
    start(weapon, dual, mode) {
      if (!dual) return false;
      st.weapon = weapon; st.t0 = now(); st.mode = mode; st.count++; return true;
    },
    cancel() { st.weapon = null; st.t0 = -1; },
    // 0..1 through the flick for this gun, or -1 when none is running.
    phase(weapon) {
      if (st.hold != null && st.weapon === weapon) return st.hold;
      if (st.weapon == null || st.t0 < 0) return -1;
      if (weapon !== st.weapon) { this.cancel(); return -1; }
      const p = (now() - st.t0) / SELECTOR_FLICK.dur;
      if (p >= 1 || p < 0) { this.cancel(); return -1; }
      return p;
    },
    // Adds the flick to a hand pose's thumb (t: [curl, swing, tip]) in place.
    apply(pose, weapon) {
      const p = this.phase(weapon);
      if (p < 0 || !pose || !pose.t) return p;
      const reach = Math.sin(Math.PI * Math.min(1, p / 0.85));            // out, then home
      const rock = Math.max(0, Math.sin(Math.PI * (p - 0.3) / 0.4)) * (p > 0.3 && p < 0.7 ? 1 : 0);   // the push on the lever
      pose.t[0] -= SELECTOR_FLICK.reach * reach;
      pose.t[1] += SELECTOR_FLICK.swing * reach;
      pose.t[2] += SELECTOR_FLICK.roll * rock * (st.mode === 'auto' ? 1 : -0.6);
      return p;
    }
  };
}
