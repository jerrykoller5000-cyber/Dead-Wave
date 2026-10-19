// game/truck-mission.js — CL-216 (D-82, docs/specs/day-missions.md §6): the utility truck's day mission, as rules only
// (no DOM, no three). Jerry: "This one is good." The truck's toolbox is chained shut. The bolt cutters lie at the mine
// mouth, by the iron bars the hikers cut (Pike's note: "Somebody cut the old bars off this mine. Recently. Bolt
// cutters."). With them, E held at the chain cuts it; that trips the truck's alarm, which calls the dead in while he
// grabs the supplies. Once a run: after the cut the site is an ordinary cache, restocks and all.
//
//   createTruckMission()  -> { state, reset(), takeCutters(), hold(dt), release(), tick(dt), unlocked(), calledFor(day) }
//   state: { stage: 'chained' | 'alarm' | 'open', cutters, cut (s held so far), alarm (s left) }
//   hold(dt) -> 'need-cutters' | 'cutting' | 'cut' | 'done'     the cut's progress is kept if he lets go
//   tick(dt) -> 'alarm' while it wails, 'quiet' the frame it stops, null otherwise
export const TRUCK = Object.freeze({
  CUT_S: 1.5,        // E held at the chain
  ALARM_S: 20,       // the truck's alarm
  CALLED_MIN: 6,     // the dead it calls on day 1 ...
  CALLED_MAX: 10,    // ... and from day 20
  FIRST_SHARE: 0.5,  // half of them at once, the rest through the alarm
});

export function createTruckMission() {
  const state = { stage: 'chained', cutters: false, cut: 0, alarm: 0 };
  const api = {
    state,
    reset() { state.stage = 'chained'; state.cutters = false; state.cut = 0; state.alarm = 0; },
    takeCutters() {
      if (state.cutters || state.stage !== 'chained') return false;
      state.cutters = true;
      return true;
    },
    hold(dt) {
      if (state.stage !== 'chained') return 'done';
      if (!state.cutters) return 'need-cutters';
      const d = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.25) : 0;
      state.cut = Math.min(TRUCK.CUT_S, state.cut + d);
      if (state.cut < TRUCK.CUT_S) return 'cutting';
      state.stage = 'alarm';
      state.alarm = TRUCK.ALARM_S;
      return 'cut';
    },
    release() { /* the cut so far is kept (as the relay's old hold was) */ },
    tick(dt) {
      if (state.stage !== 'alarm') return null;
      const d = Number.isFinite(dt) && dt > 0 ? dt : 0;
      state.alarm = Math.max(0, state.alarm - d);
      if (state.alarm > 0) return 'alarm';
      state.stage = 'open';
      return 'quiet';
    },
    unlocked() { return state.stage !== 'chained'; },
    progress() { return state.cut / TRUCK.CUT_S; },
    calledFor(day) {
      const d = Math.max(1, Math.min(20, Number.isFinite(day) ? day | 0 : 1));
      return Math.round(TRUCK.CALLED_MIN + (TRUCK.CALLED_MAX - TRUCK.CALLED_MIN) * (d - 1) / 19);
    },
  };
  return api;
}
