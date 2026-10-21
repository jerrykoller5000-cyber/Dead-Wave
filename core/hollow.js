// CU-71 (P-136, D-67): one marine below at a time. The warren itself is Claude's
// buildWarren. This only remembers that he went down, and which floor he is on.
//
// CU-86 (P-141, for GP-84): state() is the snapshot the HUD and the HQ board read.
//   - depth is live: 1 the Galleries, 2 the Narrows, 3 the Deep, from where the marine stands now (`where()`)
//     against the warren's mouth. Floors are 4 m apart (world/hollows.js); a ramp counts as the floor it leads to
//     from its middle on. The secret's heart counts as 3: it lies beyond the Deep.
//   - warrens lists every warren in compass order, with its clearance for the run and the passage it opens to the
//     next one round the compass once it is cleared (CU-72 builds the tunnel; the clearance is here already).
//   - reset() closes them all: a new run starts with every warren shut.
const FLOOR_STEP = 4;

export function createHollow({ where = null, ring = null } = {}) {
  let warren = null;
  let cave = -1;
  let theme = null;
  let place = 'warren';
  const explored = new Set();
  const cleared = new Set();

  // ring() -> [{ cave, theme }] in compass order, one per warren. Until the shell gives one there are none.
  function warrens() {
    const list = ring ? ring() || [] : [];
    return list.map((w, i) => {
      const next = list[(i + 1) % list.length];
      return {
        cave: w.cave,
        theme: w.theme,
        cleared: cleared.has(w.cave),
        passage: list.length > 1 ? { to: next.cave, open: cleared.has(w.cave) } : null,
      };
    });
  }

  function depthNow() {
    if (!warren) return 1;
    if (place === 'heart') return 3;
    const p = where ? where() : null;
    if (!p || !warren.entry || !Number.isFinite(p.y)) return 1;
    const d = 1 + Math.floor((warren.entry.y - p.y + FLOOR_STEP / 2) / FLOOR_STEP);
    return d < 1 ? 1 : d > 3 ? 3 : d;
  }

  function state() {
    return {
      below: !!warren,
      cave,
      theme,
      place: warren ? place : null,
      depth: depthNow(),
      explored: [...explored],
      cleared: !!warren && cleared.has(cave),
      clearedCaves: [...cleared].sort((a, b) => a - b),
      warrens: warrens(),
    };
  }

  return {
    state,
    below: () => !!warren,
    depth: depthNow,   // state().depth without the lists, for the frame loop
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
      place = next.place === 'heart' ? 'heart' : 'warren';
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
      place = 'warren';
      return back;
    },
    markCleared() { if (cave >= 0) cleared.add(cave); },
    // A new run: every warren shut again, nothing explored. The caller brings him up first.
    reset() { cleared.clear(); explored.clear(); },
    note(x, z) {
      if (!warren) return;
      const cell = 6;
      const i = Math.floor((x - (warren.plan ? 0 : 0)) / cell);
      explored.add(i + ',' + Math.floor(z / cell));
    },
  };
}
