// game/ranger-cache.js — CL-217 (D-82, docs/specs/day-missions.md §2): the ranger cache's day mission, as rules only
// (no DOM, no three). Jerry: "make sure players have to search but it is not insanely difficult." The rangers'
// lockbox wants three digits, each written somewhere round their camp: the channel their radio was left on, the day
// the search board's log stops at, and the unit number painted on their truck's door. The lid shows three small
// pictures (a radio, a board, a truck) in the order the digits go; the order and the digits are new each run.
//
//   createRangerCache(rand = Math.random) -> { state, reset(rand), digitOf(source), enter(d), unlocked() }
//   state: { code: [d, d, d], order: ['radio' | 'board' | 'truck' x3], clues: { radio, board, truck }, entry: [], unlocked }
//   enter(d) -> 'more' | 'wrong' | 'open' | 'done'      (a wrong code clears the entry; no penalty)
export const RANGER = Object.freeze({ LEN: 3, SOURCES: Object.freeze(['radio', 'board', 'truck']) });

export function createRangerCache(rand = Math.random) {
  const state = { code: [], order: [], clues: {}, entry: [], unlocked: false };
  const pick = (r) => 1 + Math.min(8, Math.floor(r() * 9));   // 1-9: the keypad has no 0
  function reset(r = rand) {
    const clues = { radio: pick(r), board: pick(r), truck: pick(r) };
    const order = RANGER.SOURCES.slice();
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    state.clues = clues;
    state.order = order;
    state.code = order.map((s) => clues[s]);
    state.entry = [];
    state.unlocked = false;
  }
  reset(rand);
  return {
    state,
    reset,
    digitOf: (source) => state.clues[source],
    enter(d) {
      if (state.unlocked) return 'done';
      if (!Number.isInteger(d) || d < 1 || d > 9) return 'more';
      state.entry.push(d);
      if (state.entry.length < RANGER.LEN) return 'more';
      const right = state.entry.every((v, i) => v === state.code[i]);
      state.entry = [];
      if (!right) return 'wrong';
      state.unlocked = true;
      return 'open';
    },
    unlocked: () => state.unlocked,
  };
}
