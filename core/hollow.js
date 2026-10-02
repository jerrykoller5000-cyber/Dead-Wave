// CU-71 (P-136, D-67): one marine below at a time. The warren itself is Claude's
// buildWarren. This only remembers that he went down, and which floor he is on.
export function createHollow() {
  let warren = null;
  let cave = -1;
  let theme = null;
  const explored = new Set();
  const cleared = new Set();

  function state() {
    let depth = 1;
    if (warren && warren.entry) {
      const g = warren.groundAt(warren.entry.x, warren.entry.z);
      if (g != null && warren.entry.y < g - 2) depth = 2;
    }
    return {
      below: !!warren,
      cave,
      theme,
      depth,
      explored: [...explored],
      cleared: cleared.has(cave),
    };
  }

  return {
    state,
    below: () => !!warren,
    warren: () => warren,
    groundAt(x, z) {
      if (!warren) return null;
      return warren.groundAt(x, z);
    },
    enter(next, built) {
      if (warren && warren.dispose) warren.dispose();
      warren = built;
      cave = next.cave;
      theme = next.theme;
      explored.clear();
      return warren;
    },
    leave(how) {
      if (!warren) return null;
      const back = { cave, theme, how };
      if (warren.group && warren.group.parent) warren.group.parent.remove(warren.group);
      if (warren.dispose) warren.dispose();
      warren = null;
      theme = null;
      return back;
    },
    markCleared() { if (cave >= 0) cleared.add(cave); },
    note(x, z) {
      if (!warren) return;
      const cell = 6;
      const i = Math.floor((x - (warren.plan ? 0 : 0)) / cell);
      explored.add(i + ',' + Math.floor(z / cell));
    },
  };
}
