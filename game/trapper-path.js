// game/trapper-path.js — AG-93 (D-82, docs/specs/day-missions.md §4): the trapper's safe path day mission, as pure
// rules (no DOM, no Three.js). Jerry: "almost like a little platformer."
// Six rows of two stepping stones in a bed of leaves, from the trapper's fence to his cellar hatch (objective:trapper-cache).
// A fence and brambles close both sides; each row has a post on each side, and a horseshoe is nailed to the post on the
// safe stone's side (0 = left, 1 = right). A new pattern each run. A wrong step, or a step off the stones into the leaves,
// snaps a bear trap: 25 damage, held 3 s (he can still shoot), and calls 4 to 6 dead. Once opened in a run, the site stays
// open for restocks.

export const TRAPPER = Object.freeze({
  ROWS: 6,
  SIDES: Object.freeze(['left', 'right']),
  DAMAGE: 25,
  HOLD_S: 3.0,
  CALLED_MIN: 4,
  CALLED_MAX: 6,
  // Local coordinates in the path frame (origin at prop.centre, +z out through prop.approach to the fence gate,
  // -x = left side (0), +x = right side (1) when looking from the fence entrance towards the hatch):
  ROW_Z0: 5.45,       // Row 0 (at the fence gate)
  ROW_STEP: 0.66,     // Rows at z = 5.45, 4.79, 4.13, 3.47, 2.81, 2.15
  STONE_X: 0.42,      // Left stone at x = -0.42, Right stone at x = +0.42
  POST_X: 1.08,       // Fence posts at x = -1.08 and x = +1.08 beside each row
  STONE_R: 0.36,      // Safe stepping stone radius
  BRIDGE_R: 0.25,     // Safe walking corridor between consecutive safe stones
  WRONG_R: 0.34,      // Wrong stone trigger radius
  BED_Z_MAX: 5.80,    // Outer edge of the leaf bed at the fence gate
  BED_Z_MIN: 1.80,    // Inner edge of the leaf bed by the hatch apron (prop.approach is at z = 1.502)
  BED_HALF_W: 0.96,   // Leaf bed half-width inside the fence/brambles
  ENTRY_Z: 6.35,      // Where `site trapper` stands him outside the fence gate
});

export function rowZ(row, rule = TRAPPER) {
  return rule.ROW_Z0 - row * rule.ROW_STEP;
}

export function sideSign(side) {
  return side === 1 || side === 'right' ? 1 : -1;
}

export function sideName(side) {
  return side === 1 || side === 'right' ? 'right' : 'left';
}

export function calledForDay(day, rule = TRAPPER) {
  const d = Math.max(1, Math.min(20, Number.isFinite(day) ? day | 0 : 1));
  return Math.round(rule.CALLED_MIN + (rule.CALLED_MAX - rule.CALLED_MIN) * (d - 1) / 19);
}

function hypot2(dx, dz) {
  return Math.sqrt(dx * dx + dz * dz);
}

function distToSegment2D(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  if (l2 < 1e-9) return hypot2(px - ax, pz - az);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return hypot2(px - (ax + dx * t), pz - (az + dz * t));
}

export function createTrapperPath(rand = Math.random, config = {}) {
  const rule = Object.freeze({ ...TRAPPER, ...config });
  const state = {
    safe: [],           // [0|1 x 6] for rows 0..5
    progress: 0,        // how many rows (0..6) safely stepped in order
    unlocked: false,    // true once all 6 rows are crossed to the hatch
    holdT: 0,           // remaining seconds held in a bear trap
    snaps: 0,           // total bear trap snaps this run
    escapeRow: null,    // row just snapped so he can step off the sprung trap after the 3 s hold
    sprung: [],         // [{ row, reason, x, z }]
  };

  function reset(r = rand, pattern = null) {
    if (Array.isArray(pattern) && pattern.length === rule.ROWS) {
      state.safe = pattern.map((v) => (v === 1 || v === 'right' ? 1 : 0));
    } else {
      const next = [];
      for (let i = 0; i < rule.ROWS; i++) next.push(r() < 0.5 ? 0 : 1);
      // Ensure both sides appear at least once so the horseshoes always form a real pattern.
      if (next.every((v) => v === next[0]) && rule.ROWS >= 2) {
        const flipIdx = 1 + (Math.floor(r() * (rule.ROWS - 1)) % (rule.ROWS - 1));
        next[flipIdx] = 1 - next[0];
      }
      state.safe = next;
    }
    state.progress = 0;
    state.unlocked = false;
    state.holdT = 0;
    state.snaps = 0;
    state.escapeRow = null;
    state.sprung = [];
  }

  reset(rand);

  function stoneLocal(row, side) {
    const s = side === 1 || side === 'right' ? 1 : 0;
    return {
      row,
      side: s,
      x: sideSign(s) * rule.STONE_X,
      z: rowZ(row, rule),
      safe: state.safe[row] === s,
    };
  }

  function postLocal(row, side) {
    const s = side === 1 || side === 'right' ? 1 : 0;
    return {
      row,
      side: s,
      x: sideSign(s) * rule.POST_X,
      z: rowZ(row, rule),
      horseshoe: state.safe[row] === s,
    };
  }

  function nearestRow(lz) {
    const raw = Math.round((rule.ROW_Z0 - lz) / rule.ROW_STEP);
    return Math.max(0, Math.min(rule.ROWS - 1, raw));
  }

  function classifyPoint(lx, lz) {
    if (!Number.isFinite(lx) || !Number.isFinite(lz)) return { zone: 'outside', row: -1 };
    if (Math.abs(lx) > rule.BED_HALF_W || lz >= rule.BED_Z_MAX || lz < -0.6) {
      return { zone: 'outside', row: -1 };
    }
    if (lz <= rule.BED_Z_MIN) {
      return { zone: 'hatch', row: rule.ROWS };
    }
    const row = nearestRow(lz);
    // 1. Check wrong stones first: stepping onto any wrong stone snaps its trap.
    for (let r = 0; r < rule.ROWS; r++) {
      const wSide = 1 - state.safe[r];
      const wx = sideSign(wSide) * rule.STONE_X, wz = rowZ(r, rule);
      if (hypot2(lx - wx, lz - wz) <= rule.WRONG_R) {
        return { zone: 'wrong-stone', row: r, side: wSide, x: wx, z: wz };
      }
    }
    // 2. Check safe stones:
    let bestSafeRow = -1, bestSafeD = Infinity;
    for (let r = 0; r < rule.ROWS; r++) {
      const sSide = state.safe[r];
      const sx = sideSign(sSide) * rule.STONE_X, sz = rowZ(r, rule);
      const d = hypot2(lx - sx, lz - sz);
      if (d <= rule.STONE_R && d < bestSafeD) {
        bestSafeD = d;
        bestSafeRow = r;
      }
    }
    if (bestSafeRow >= 0) {
      return { zone: 'safe-stone', row: bestSafeRow, side: state.safe[bestSafeRow] };
    }
    // 3. Check safe walking bridges between consecutive safe stones (and entry/exit thresholds):
    const s0x = sideSign(state.safe[0]) * rule.STONE_X, s0z = rowZ(0, rule);
    if (distToSegment2D(lx, lz, s0x, rule.BED_Z_MAX, s0x, s0z) <= rule.BRIDGE_R) {
      return { zone: 'safe-stone', row: 0, side: state.safe[0], bridge: true };
    }
    for (let r = 0; r < rule.ROWS - 1; r++) {
      const ax = sideSign(state.safe[r]) * rule.STONE_X, az = rowZ(r, rule);
      const bx = sideSign(state.safe[r + 1]) * rule.STONE_X, bz = rowZ(r + 1, rule);
      if (distToSegment2D(lx, lz, ax, az, bx, bz) <= rule.BRIDGE_R) {
        const nearer = Math.abs(lz - az) <= Math.abs(lz - bz) ? r : r + 1;
        return { zone: 'safe-stone', row: nearer, side: state.safe[nearer], bridge: true };
      }
    }
    const sLast = rule.ROWS - 1;
    const s5x = sideSign(state.safe[sLast]) * rule.STONE_X, s5z = rowZ(sLast, rule);
    if (
      distToSegment2D(lx, lz, s5x, s5z, s5x, rule.BED_Z_MIN) <= rule.BRIDGE_R ||
      distToSegment2D(lx, lz, s5x, s5z, 0, rule.BED_Z_MIN) <= rule.BRIDGE_R
    ) {
      return { zone: 'safe-stone', row: sLast, side: state.safe[sLast], bridge: true };
    }
    // 4. Otherwise he stepped off the stones into the leaf bed!
    return {
      zone: 'leaves',
      row,
      side: lx >= 0 ? 1 : 0,
      x: Math.max(-0.68, Math.min(0.68, lx)),
      z: lz,
    };
  }

  function step(lx, lz, dt = 0, { grounded = true, day = 1 } = {}) {
    const d = Number.isFinite(dt) && dt > 0 ? dt : 0;
    if (state.holdT > 0) {
      state.holdT = Math.max(0, state.holdT - d);
      if (state.holdT > 0) return { kind: 'held', holdT: state.holdT };
    }
    if (state.unlocked) return { kind: 'open' };

    const c = classifyPoint(lx, lz);
    if (c.zone === 'outside') {
      if (lz >= rule.BED_Z_MAX) state.escapeRow = null;
      return { kind: 'outside' };
    }
    if (c.zone === 'hatch') {
      if (state.progress >= rule.ROWS - 1) {
        state.progress = rule.ROWS;
        state.unlocked = true;
        state.escapeRow = null;
        return { kind: 'unlocked' };
      }
      return { kind: 'locked-hatch' };
    }
    if (c.zone === 'safe-stone') {
      if (c.row <= state.progress) {
        state.progress = Math.max(state.progress, c.row + 1);
      }
      state.escapeRow = null;
      if (state.progress >= rule.ROWS && c.row === rule.ROWS - 1 && !c.bridge) {
        state.unlocked = true;
        return { kind: 'unlocked', row: c.row, side: c.side };
      }
      return { kind: 'safe', row: c.row, side: c.side, progress: state.progress };
    }
    // wrong-stone or leaves:
    if (!grounded) return { kind: 'air', row: c.row };
    if (state.escapeRow === c.row) return { kind: 'escaping', row: c.row };

    state.holdT = rule.HOLD_S;
    state.snaps += 1;
    state.escapeRow = c.row;
    state.progress = Math.max(state.progress, c.row);
    const snapRec = { row: c.row, side: c.side, reason: c.zone, x: c.x, z: c.z };
    state.sprung.push(snapRec);
    const called = calledForDay(day, rule);
    return {
      kind: 'snap',
      reason: c.zone,
      row: c.row,
      side: c.side,
      damage: rule.DAMAGE,
      holdS: rule.HOLD_S,
      called,
      x: c.x,
      z: c.z,
    };
  }

  return {
    rule,
    state,
    reset,
    safeSide: (row) => state.safe[row],
    stoneLocal,
    postLocal,
    classifyPoint,
    step,
    unlock() {
      state.progress = rule.ROWS;
      state.unlocked = true;
      state.holdT = 0;
      state.escapeRow = null;
    },
    held: () => state.holdT > 0,
    unlocked: () => state.unlocked,
    calledFor: (day) => calledForDay(day, rule),
  };
}
