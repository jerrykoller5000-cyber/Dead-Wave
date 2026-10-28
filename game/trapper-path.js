// game/trapper-path.js — AG-93 / AG-124 (D-82, D-88, docs/specs/day-missions.md §4): the trapper's safe path day mission,
// as pure rules (no DOM, no Three.js). Jerry: "almost like a little platformer."
// Eight rows of two stepping stones in a deep bed of leaves inside the trapper's fenced yard, leading to his cellar
// hatch (objective:trapper-cache). A split-rail fence and brambles close both sides; each row has a post on each side,
// and a horseshoe is nailed to the post on the safe stone's side (0 = left, 1 = right). A new pattern each run. A wrong
// step, or a step off the stones into the leaves, snaps a bear trap: 25 damage, held 3 s (he can still shoot), and calls
// 4 to 6 dead. Once opened in a run, the site stays open for restocks.

export const TRAPPER = Object.freeze({
  ROWS: 8,
  SIDES: Object.freeze(['left', 'right']),
  DAMAGE: 25,
  HOLD_S: 3.0,
  CALLED_MIN: 4,
  CALLED_MAX: 6,
  // Local coordinates in the path frame (origin at prop.centre, +z out through prop.approach to the fence gate,
  // -x = left side (0), +x = right side (1) when looking from the fence entrance towards the hatch):
  ROW_Z0: 8.45,       // Row 0 (at the yard fence gate)
  ROW_STEP: 0.90,     // Rows at z = 8.45, 7.55, 6.65, 5.75, 4.85, 3.95, 3.05, 2.15
  STONE_X: 0.54,      // Left stone at x = -0.54, Right stone at x = +0.54
  POST_X: 1.34,       // Fence posts at x = -1.34 and x = +1.34 beside each row
  STONE_R: 0.42,      // Safe stepping stone radius
  BRIDGE_R: 0.30,     // Safe walking corridor between consecutive safe stones
  WRONG_R: 0.38,      // Wrong stone trigger radius
  BED_Z_MAX: 8.95,    // Outer edge of the leaf bed at the fence gate
  BED_Z_MIN: 1.80,    // Inner edge of the leaf bed by the hatch apron (prop.approach is at z ~ 1.44)
  BED_HALF_W: 1.20,   // Leaf bed half-width inside the fence/brambles
  ENTRY_Z: 9.60,      // Where `site trapper` stands him outside the yard gate
  // Yard placement relative to campsites[2] (away from bridges[1], on the flat wooded side behind his cabin/workbench):
  YARD_OFF_X: 8.0,
  YARD_OFF_Z: -2.6,
  YARD_YAW: 2.0944,   // 120 deg: yard runs from the root cellar behind his cabin out toward the trail from HQ
  HATCH_APPROACH_Z: 1.44,
  // AG-135 (story-chain.md §4 day 8, CL-263): the trapper's iron-lined cellar under the bulkhead doors:
  CELLAR_FLOOR_Y: -2.15,
  CELLAR_CEIL_UNDER_Y: -0.14,
  CELLAR_ROOF_Y: 0.06,
  STAIR_Z_TOP: -0.34,
  STAIR_Z_BOT: -1.86,
  STAIR_HALF_W: 0.62,
  ROOM_Z_FRONT: -2.28,
  ROOM_Z_BACK: -5.06,
  ROOM_HALF_W: 1.62,
  CELLAR_SPOT_X: -0.45,
  CELLAR_SPOT_Z: -3.65,
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
      x: Math.max(-0.88, Math.min(0.88, lx)),
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

// Deterministic hash in [0, 1) for natural scatter without touching any shared RNG stream.
function hash01(a, b) {
  let n = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) ^ 0xc2b2ae35, 0x27d4eb2f);
  n = Math.imul(n ^ (n >>> 15), 0x85ebca6b);
  n = (n ^ (n >>> 13)) >>> 0;
  return (n & 0xffffff) / 0x1000000;
}

// Builds the static geometry parts, stepping-stone descriptors, fence-post descriptors, and solid collider spots
// for the rebuilt trapper's yard (AG-124, N28; docs/world-design.md rules 1, 2, 9, 12).
export function buildTrapperYardParts(THREE, { groundAtLocal, surfAtLocal, doorPivotY = 0.18, toWorld, cy0 = 0, trapperPart, trapperBar, rule = TRAPPER }) {
  const surfY = typeof surfAtLocal === 'function' ? surfAtLocal : () => 0;
  const parts = [];
  const stones = [];
  const posts = [];
  const colliderSpots = [];

  const leafPalette = [0x6e4220, 0x824f26, 0x965f2d, 0x59361b, 0x784722, 0xa36b32, 0x4b2d17, 0x8c5628];
  const earthPalette = [0x3d2a1b, 0x473120, 0x352417, 0x4f3724];
  const stonePalette = [0x76746b, 0x68665e, 0x838076, 0x5e5c54, 0x706e65];
  const mossPalette = [0x4c5d34, 0x3f4f2b, 0x58693d];
  const woodPalette = [0x594531, 0x4b3a28, 0x665039, 0x3f3021, 0x523f2c];
  const barkPalette = [0x382a1d, 0x2f2318, 0x423223];
  const bramblePalette = [0x324022, 0x3f4e2a, 0x29351b, 0x483825, 0x384626];
  const ironDark = 0x383633;
  const ironMid = 0x524e49;

  // 1. Dark forest humus base & organic multi-layered autumn leaf bed (no checkerboard grid).
  const nx = 10, nz = 28;
  const x0 = -1.00, x1 = 1.00;
  const z0 = 1.24, z1 = 8.68;
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      const u0 = ix / nx, u1 = (ix + 1) / nx;
      const v0 = iz / nz, v1 = (iz + 1) / nz;
      const ax = x0 + (x1 - x0) * u0, bx = x0 + (x1 - x0) * u1;
      const az = z0 + (z1 - z0) * v0, bz = z0 + (z1 - z0) * v1;
      const mx = (ax + bx) * 0.5, mz = (az + bz) * 0.5;
      const h1 = hash01(ix * 13 + 7, iz * 29 + 3);
      const h2 = hash01(ix * 31 + 11, iz * 17 + 19);
      const edgeFade = Math.min(1, (1 - Math.abs(mx) / (rule.BED_HALF_W + 0.14)) * 3.2);
      const lift = 0.014 + 0.012 * edgeFade + (h1 - 0.5) * 0.008;
      const p00 = [ax, groundAtLocal(ax, az) + lift, az];
      const p10 = [bx, groundAtLocal(bx, az) + lift, az];
      const p01 = [ax, groundAtLocal(ax, bz) + lift, bz];
      const p11 = [bx, groundAtLocal(bx, bz) + lift, bz];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([...p00, ...p01, ...p11, ...p00, ...p11, ...p10], 3));
      g.computeVertexNormals();
      const baseCol = (h1 < 0.28)
        ? earthPalette[(ix + iz * 3) % earthPalette.length]
        : leafPalette[Math.floor(h1 * leafPalette.length) % leafPalette.length];
      parts.push(trapperPart(g, baseCol, 0, 0, 0));

      // Overlapping wind-drifted leaf heaps, curled leaves, and fallen pine twigs:
      const driftCount = edgeFade > 0.35 ? 2 : 1;
      for (let d = 0; d < driftCount; d++) {
        const hd = hash01(ix * 41 + d * 13, iz * 53 + d * 7);
        const jx = Math.max(-0.96, Math.min(0.96, mx + (hd - 0.5) * 0.18));
        const jz = Math.max(1.26, Math.min(8.66, mz + (hash01(ix * 19 + d, iz * 37 + d) - 0.5) * 0.18));
        const ly = groundAtLocal(jx, jz) + 0.026 + (hd * 0.014);
        const rx = 0.10 + hd * 0.07;
        const rz = 0.08 + h2 * 0.07;
        const col = leafPalette[Math.floor((hd + h2) * 7) % leafPalette.length];
        parts.push(trapperPart(
          new THREE.DodecahedronGeometry(0.085, 0),
          col,
          jx, ly, jz,
          (hd - 0.5) * 0.35, hd * 6.28, (h2 - 0.5) * 0.35,
          rx / 0.085, 0.22 + hd * 0.12, rz / 0.085
        ));
      }
      if (h2 > 0.68) {
        const tx = Math.max(-0.92, Math.min(0.92, mx + (h1 - 0.5) * 0.14));
        const tz = Math.max(1.28, Math.min(8.64, mz + (h2 - 0.5) * 0.14));
        const ty = groundAtLocal(tx, tz) + 0.032;
        const ang = h1 * Math.PI * 2, tLen = 0.16 + h2 * 0.14;
        trapperBar(parts,
          [tx - Math.cos(ang) * tLen * 0.5, ty, tz - Math.sin(ang) * tLen * 0.5],
          [tx + Math.cos(ang) * tLen * 0.5, ty + 0.012, tz + Math.sin(ang) * tLen * 0.5],
          0.009, barkPalette[(ix + iz) % barkPalette.length], 4);
      }
    }
  }

  // 2. Half-buried iron leghold traps concealed in the leaf drifts (between rows and along the edges):
  const hiddenTrapSpots = [];
  for (let r = 0; r < rule.ROWS; r++) {
    const lz = rowZ(r, rule);
    hiddenTrapSpots.push([-0.84, lz + 0.12, r * 1.1 + 0.3]);
    hiddenTrapSpots.push([0.0, lz - 0.34, r * 0.85 - 0.4]);
    hiddenTrapSpots.push([0.84, lz - 0.10, r * 1.3 + 0.9]);
  }
  for (let i = 0; i < hiddenTrapSpots.length; i++) {
    const [tx, tz, rot] = hiddenTrapSpots[i];
    const gy = groundAtLocal(tx, tz);
    // Open iron jaws & trigger pan peeking through the leaves:
    parts.push(trapperPart(new THREE.CylinderGeometry(0.055, 0.055, 0.012, 8), ironMid, tx, gy + 0.022, tz, 0, rot, 0));
    for (const s of [-1, 1]) {
      parts.push(trapperPart(
        new THREE.TorusGeometry(0.115, 0.012, 4, 10, Math.PI * 0.92),
        ironDark,
        tx, gy + 0.028, tz,
        Math.PI * 0.5 + s * 0.14, 0, rot + (s > 0 ? 0 : Math.PI)
      ));
    }
    // Short anchor chain disappearing into the leaf mound:
    for (let c = 0; c < 3; c++) {
      parts.push(trapperPart(
        new THREE.TorusGeometry(0.02, 0.005, 4, 7),
        ironMid,
        tx + Math.cos(rot) * (0.13 + c * 0.032),
        gy + 0.02,
        tz + Math.sin(rot) * (0.13 + c * 0.032),
        Math.PI / 2, 0, rot
      ));
    }
    // A couple of autumn leaves partially covering each trap:
    parts.push(trapperPart(
      new THREE.DodecahedronGeometry(0.075, 0),
      leafPalette[i % leafPalette.length],
      tx + 0.04, gy + 0.036, tz - 0.03,
      0.18, rot + 0.7, -0.12, 1.35, 0.24, 1.1
    ));
  }

  // 3. Eight rows of two large, natural split-fieldstone stepping slabs (+ gate & cellar apron flagstones):
  const baseSlabGeo = new THREE.CylinderGeometry(0.34, 0.38, 0.072, 9);
  const topSlabGeo = new THREE.CylinderGeometry(0.29, 0.33, 0.042, 8);
  const chipGeo = new THREE.BoxGeometry(0.18, 0.036, 0.15);
  for (let r = 0; r < rule.ROWS; r++) {
    const lz = rowZ(r, rule);
    for (const side of [0, 1]) {
      const sgn = sideSign(side);
      const lx = sgn * rule.STONE_X;
      const gy = groundAtLocal(lx, lz);
      const h = hash01(r * 17 + side * 3, r * 7 + side * 19);
      const colA = stonePalette[(r + side) % stonePalette.length];
      const colB = stonePalette[(r * 2 + side + 1) % stonePalette.length];
      const sx = 1.0 + (h - 0.5) * 0.14;
      const sz = 0.94 + (hash01(r * 23, side * 11) - 0.5) * 0.14;
      const yawA = r * 1.15 + side * 2.05;
      parts.push(trapperPart(baseSlabGeo.clone(), colA, lx, gy + 0.036, lz, 0, yawA, 0, sx, 1, sz));
      parts.push(trapperPart(topSlabGeo.clone(), colB, lx + (h - 0.5) * 0.025, gy + 0.068, lz, 0, yawA + 0.45, 0, sx * 0.95, 1, sz * 0.95));
      parts.push(trapperPart(chipGeo.clone(), stonePalette[(r + 3) % stonePalette.length],
        lx - sgn * 0.11, gy + 0.055, lz + ((r % 2) ? 0.08 : -0.08), 0.04, yawA + 0.9, -0.03));

      // Moss & autumn leaves tucked around the stone's base rim:
      for (let k = 0; k < 4; k++) {
        const a = yawA + k * 1.57 + 0.3;
        const rimR = 0.33;
        const isMoss = (k + r) % 2 === 0;
        parts.push(trapperPart(
          new THREE.DodecahedronGeometry(0.06, 0),
          isMoss ? mossPalette[(r + k) % mossPalette.length] : leafPalette[(r + k + side) % leafPalette.length],
          lx + Math.cos(a) * rimR, gy + 0.03, lz + Math.sin(a) * rimR,
          0.1, a, 0.08, 1.3, 0.35, 1.0
        ));
      }
      const w = toWorld(lx, lz);
      stones.push({ row: r, side, lx, lz, x: w.x, y: cy0 + gy + 0.082, z: w.z });
    }
  }
  // Threshold flagstones at the cellar apron (z = 1.42) and yard gate entrance (z = 8.68):
  for (const [az, aw, ad] of [
    [1.42, 0.36, 0.26],
    [8.68, 0.38, 0.26],
  ]) {
    for (const sx of [-0.30, 0.30]) {
      const gy = groundAtLocal(sx, az);
      parts.push(trapperPart(new THREE.BoxGeometry(aw, 0.054, ad), stonePalette[0], sx, gy + 0.026, az, 0, sx * 0.22, 0));
      parts.push(trapperPart(new THREE.BoxGeometry(aw * 0.86, 0.024, ad * 0.84), stonePalette[2], sx, gy + 0.056, az, 0, -sx * 0.15, 0));
    }
  }

  // 4. Trapper's yard fence: 16 sturdy row posts with chamfered caps, iron bands, and backing boards for the horseshoes;
  //    plus heavy entrance gate posts with overhead crossbeam, hanging lantern, and split-log rails down both sides.
  const postBox = new THREE.BoxGeometry(0.16, 1.28, 0.16);
  const postBase = new THREE.BoxGeometry(0.19, 0.24, 0.19);
  const postCap = new THREE.BoxGeometry(0.19, 0.045, 0.19);
  const postBand = new THREE.BoxGeometry(0.172, 0.028, 0.172);
  const postPlaque = new THREE.BoxGeometry(0.14, 0.25, 0.022);
  for (let r = 0; r < rule.ROWS; r++) {
    const lz = rowZ(r, rule);
    for (const side of [0, 1]) {
      const sgn = sideSign(side);
      const lx = sgn * rule.POST_X;
      const gy = groundAtLocal(lx, lz);
      const wCol = woodPalette[(r + side) % woodPalette.length];
      parts.push(trapperPart(postBase.clone(), barkPalette[(r + side) % barkPalette.length], lx, gy + 0.12, lz));
      parts.push(trapperPart(postBox.clone(), wCol, lx, gy + 0.64, lz));
      parts.push(trapperPart(postCap.clone(), barkPalette[0], lx, gy + 1.29, lz));
      parts.push(trapperPart(postBand.clone(), ironDark, lx, gy + 1.12, lz));
      // Pale weathered backing board facing the approach (+z) and slightly inward toward the path:
      parts.push(trapperPart(postPlaque.clone(), 0xc8b68e, lx - sgn * 0.005, gy + 0.88, lz + 0.068, 0, -sgn * 0.20, 0));
      const w = toWorld(lx, lz);
      posts.push({ row: r, side, lx, lz, x: w.x, y: cy0 + gy, z: w.z });
    }
  }

  // Heavy gate posts at the yard entrance (lz = rule.BED_Z_MAX + 0.08 = 9.03) and cellar bulkhead posts (lz = 0.68):
  const gateZ = rule.BED_Z_MAX + 0.08;
  const gatePostGeo = new THREE.BoxGeometry(0.22, 2.25, 0.22);
  const gateCapGeo = new THREE.BoxGeometry(0.26, 0.06, 0.26);
  for (const side of [0, 1]) {
    const sgn = sideSign(side);
    const lx = sgn * rule.POST_X;
    // Cellar end anchor post (lz = 0.68):
    const gy0 = groundAtLocal(lx, 0.68);
    parts.push(trapperPart(postBox.clone(), woodPalette[side], lx, gy0 + 0.62, 0.68));
    parts.push(trapperPart(postCap.clone(), barkPalette[0], lx, gy0 + 1.27, 0.68));

    // Tall entrance gate post (lz = gateZ):
    const gyG = groundAtLocal(lx, gateZ);
    parts.push(trapperPart(gatePostGeo.clone(), woodPalette[side], lx, gyG + 1.12, gateZ));
    parts.push(trapperPart(gateCapGeo.clone(), barkPalette[0], lx, gyG + 2.26, gateZ));
    parts.push(trapperPart(new THREE.BoxGeometry(0.235, 0.036, 0.235), ironDark, lx, gyG + 1.95, gateZ));

    // Three split-log fence rails + diagonal bracing connecting posts from z = 0.68 to gateZ - 0.18:
    const zList = [0.68];
    for (let r = rule.ROWS - 1; r >= 0; r--) zList.push(rowZ(r, rule));
    zList.push(gateZ - 0.18);
    for (let i = 0; i < zList.length - 1; i++) {
      const za = zList[i], zb = zList[i + 1];
      const ya = groundAtLocal(lx, za), yb = groundAtLocal(lx, zb);
      for (const h of [0.32, 0.64, 0.98]) {
        trapperBar(parts, [lx, ya + h, za], [lx, yb + h, zb], 0.042, woodPalette[(i + side) % woodPalette.length], 6);
      }
      if (i % 2 === side) {
        trapperBar(parts, [lx, ya + 0.32, za], [lx, yb + 0.96, zb], 0.028, barkPalette[(i + side) % barkPalette.length], 5);
      }
    }

    // Flared wing fence at the yard gate (z = gateZ -> gateZ + 0.36, x = ±1.34 -> ±1.92):
    const wxOut = sgn * (rule.POST_X + 0.58), wzOut = gateZ + 0.36;
    const gyOut = groundAtLocal(wxOut, wzOut);
    parts.push(trapperPart(postBox.clone(), woodPalette[2], wxOut, gyOut + 0.60, wzOut));
    parts.push(trapperPart(postCap.clone(), barkPalette[1], wxOut, gyOut + 1.25, wzOut));
    for (const h of [0.34, 0.68, 1.00]) {
      trapperBar(parts, [lx, gyG + h, gateZ], [wxOut, gyOut + h, wzOut], 0.04, woodPalette[1], 6);
    }
  }

  // Overhead timber lintel beam across the entrance gate + weathered wooden warning board & hanging iron lantern:
  {
    const yL = groundAtLocal(-rule.POST_X, gateZ), yR = groundAtLocal(rule.POST_X, gateZ);
    const beamY = Math.max(yL, yR) + 2.12;
    trapperBar(parts, [-rule.POST_X - 0.18, beamY, gateZ], [rule.POST_X + 0.18, beamY, gateZ], 0.075, barkPalette[0], 7);
    // Diagonal knee braces on the gate arch:
    for (const sgn of [-1, 1]) {
      const gyS = sgn < 0 ? yL : yR;
      trapperBar(parts, [sgn * rule.POST_X, gyS + 1.55, gateZ], [sgn * (rule.POST_X - 0.48), beamY - 0.04, gateZ], 0.042, woodPalette[0], 5);
    }
    // Weathered plank sign board on the gate lintel:
    parts.push(trapperPart(new THREE.BoxGeometry(1.18, 0.24, 0.04), 0x6b533b, 0, beamY - 0.18, gateZ + 0.05, 0, 0, -0.02));
    parts.push(trapperPart(new THREE.BoxGeometry(1.10, 0.17, 0.046), 0xb8a37a, 0, beamY - 0.18, gateZ + 0.052, 0, 0, -0.02));
    // Hanging iron lantern & spare leghold trap on the right gate post:
    const lxLan = rule.POST_X - 0.24, lyLan = yR + 1.72;
    trapperBar(parts, [rule.POST_X, yR + 1.82, gateZ + 0.08], [lxLan, lyLan + 0.12, gateZ + 0.22], 0.016, ironDark, 5);
    parts.push(trapperPart(new THREE.CylinderGeometry(0.06, 0.075, 0.16, 7), ironDark, lxLan, lyLan, gateZ + 0.22));
    parts.push(trapperPart(new THREE.CylinderGeometry(0.042, 0.042, 0.09, 7), 0xd9a84e, lxLan, lyLan, gateZ + 0.22));
  }

  // 5. Trapper's drying frame, stacked firewood, and thorny deadfall hedge flanking the outside of the fence
  //    and behind the cellar mound:
  const brambleSpots = [];
  for (const sgn of [-1, 1]) {
    for (let lz = 0.96; lz <= gateZ - 0.75; lz += 0.64) {
      brambleSpots.push([sgn * (rule.POST_X + 0.42), lz]);
    }
    // Stacked split logs along the outer base of the fence rails:
    for (let k = 0; k < 5; k++) {
      const lzA = 1.2 + k * 1.45, lzB = lzA + 1.15;
      const lxLog = sgn * (rule.POST_X + 0.18);
      const ya = groundAtLocal(lxLog, lzA), yb = groundAtLocal(lxLog, lzB);
      trapperBar(parts, [lxLog, ya + 0.09, lzA], [lxLog, yb + 0.09, lzB], 0.085, barkPalette[k % barkPalette.length], 6);
      trapperBar(parts, [lxLog + sgn * 0.06, ya + 0.21, lzA + 0.08], [lxLog + sgn * 0.06, yb + 0.21, lzB - 0.08], 0.072, woodPalette[k % woodPalette.length], 6);
    }
  }
  for (let i = 0; i < brambleSpots.length; i++) {
    const [bx, bz] = brambleSpots[i];
    const gy = groundAtLocal(bx, bz);
    parts.push(trapperPart(new THREE.DodecahedronGeometry(0.38, 0), bramblePalette[i % bramblePalette.length],
      bx, gy + 0.28, bz, (i * 0.7) % 3, (i * 1.3) % 6, 0, 1.18, 0.84, 1.12));
    parts.push(trapperPart(new THREE.DodecahedronGeometry(0.28, 0), bramblePalette[(i + 2) % bramblePalette.length],
      bx + ((i % 2) ? 0.14 : -0.14), gy + 0.56, bz + 0.08, 0.4, i * 1.9, 0.2, 1.08, 0.80, 1.05));
    for (let c = 0; c < 2; c++) {
      const a = i * 1.5 + c * 2.4;
      const x2 = bx + Math.cos(a) * 0.36, z2 = bz + Math.sin(a) * 0.36;
      trapperBar(parts, [bx, gy + 0.08, bz], [x2, gy + 0.72, z2], 0.018, barkPalette[0], 5);
      parts.push(trapperPart(new THREE.ConeGeometry(0.012, 0.048, 4), 0xc2b490, (bx + x2) * 0.5, gy + 0.44, (bz + z2) * 0.5, 0.5, a, 0));
    }
  }

  // Solid colliders closing both fence sides (keeping prop.approach at (0, 1.44), (0, 0), and the cellar stairwell clear):
  for (const sgn of [-1, 1]) {
    for (let lz = 0.42; lz <= gateZ; lz += 0.72) {
      colliderSpots.push({ lx: sgn * (rule.POST_X + 0.34), lz, r: 0.34 });
    }
  }

  // 6. AG-135 / AG-144 (story-chain.md §4 Day 8, docs/art-direction.md §2 Iron rule):
  //    The trapper's iron-lined root cellar under the bulkhead doors at the head of the yard.
  //    - Roof is the natural ground (buildCaveCap style in index.html); no box aprons or protruding slabs
  //    - Sloped fieldstone & timber bulkhead cheek walls + forged-iron sill liner set into the ground at grade
  //    - Hinged double cellar doors (wood + iron strap hinges on top; riveted dark-iron plates on the underside) + iron locking bar
  //    - 8-step timber-and-iron stairwell descending from the threshold to y = -2.15
  //    - Underground iron-lined cellar room (lx in [-1.62, +1.62], lz in [-5.06, -2.28], y = -2.15 .. -0.14):
  //      riveted dark-iron walls (#363b37, #2d322e, #404540) with iron battens (#262a27), rivet heads (#5c615b),
  //      downward rust streaks (#795438), timber stanchions (#4b3a28), nailed horseshoes (horns up),
  //      ceiling beams + 1.20m x 1.20m open iron bar grate skylight overhead, Okafor's bunk & lantern, and storage shelves.
  const ironPlateA = 0x363b37;
  const ironPlateB = 0x2d322e;
  const ironPlateC = 0x404540;
  const ironStrap  = 0x262a27;
  const ironRivet  = 0x5c615b;
  const rustStreak = 0x795438;

  // Helper to stamp an upward-pointing forged-iron horseshoe onto a wall or lintel:
  const addWallHorseshoe = (targetArr, hx, hy, hz, rotY = 0) => {
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const arc = trapperPart(new THREE.TorusGeometry(0.068, 0.015, 5, 12, Math.PI * 1.38), ironPlateC, hx, hy, hz, 0, rotY, Math.PI * 0.81);
    targetArr.push(arc);
    for (const sgn of [-1, 1]) {
      const ox = sgn * 0.055;
      targetArr.push(trapperPart(new THREE.BoxGeometry(0.024, 0.022, 0.020), ironRivet,
        hx + ox * c, hy + 0.042, hz - ox * s, 0, rotY, 0));
      targetArr.push(trapperPart(new THREE.BoxGeometry(0.012, 0.012, 0.014), 0x9aa0a6,
        hx + ox * c + s * 0.01, hy + 0.016, hz - ox * s + c * 0.01, 0, rotY, 0));
    }
  };

  // 6a. Bulkhead stone cheeks, sill beam & rear headwall set into the hillside ground at grade (lz = -2.28 .. -0.30):
  const dY = doorPivotY - 0.18;
  for (const sgn of [-1, 1]) {
    for (let c = 0; c < 5; c++) {
      const zS = -0.46 - c * 0.38;
      const topY = dY + 0.16 + c * 0.055;
      const botY = -0.25;
      const hS = topY - botY;
      parts.push(trapperPart(new THREE.BoxGeometry(0.28, hS, 0.36), stonePalette[(c + (sgn > 0 ? 1 : 0)) % stonePalette.length],
        sgn * 0.84, (topY + botY) * 0.5, zS, 0, sgn * 0.02, 0));
    }
    // Sloped weathered timber sill beam capping each cheek wall (-0.162 rad tilt):
    parts.push(trapperPart(new THREE.BoxGeometry(0.22, 0.10, 1.86), woodPalette[0],
      sgn * 0.80, dY + 0.21, -1.23, -0.162, 0, 0));
    // Forged-iron sill liner & rivet studs along the inner lip of the bulkhead opening:
    parts.push(trapperPart(new THREE.BoxGeometry(0.06, 0.09, 1.84), ironPlateB,
      sgn * 0.69, dY + 0.18, -1.23, -0.162, 0, 0));
    for (let r = 0; r < 5; r++) {
      const rz = -0.46 - r * 0.38;
      const ry = dY + 0.09 + r * 0.06;
      parts.push(trapperPart(new THREE.BoxGeometry(0.022, 0.022, 0.022), ironRivet, sgn * 0.66, ry, rz));
    }
  }
  // Bulkhead front stone threshold sill at lz = -0.30:
  parts.push(trapperPart(new THREE.BoxGeometry(1.68, 0.16, 0.18), stonePalette[2], 0, dY + 0.01, -0.30));
  // Compact weathered stone plinth on the right of the threshold for objective:trapper-cache at (0.58, 0.20):
  const cacheGroundY = surfY(0.58, 0.20);
  parts.push(trapperPart(new THREE.BoxGeometry(0.60, 0.15, 0.44), stonePalette[1], 0.58, cacheGroundY + 0.075, 0.20, 0, -0.18, 0));
  // Bulkhead rear masonry headwall & heavy timber header at lz = -2.18:
  const hwTop = dY + 0.40, hwBot = -0.05;
  parts.push(trapperPart(new THREE.BoxGeometry(2.04, hwTop - hwBot, 0.28), stonePalette[1], 0, (hwTop + hwBot) * 0.5, -2.18));
  parts.push(trapperPart(new THREE.BoxGeometry(1.94, 0.12, 0.24), woodPalette[3], 0, dY + 0.42, -2.18));
  parts.push(trapperPart(new THREE.BoxGeometry(1.62, 0.08, 0.05), ironStrap, 0, dY + 0.34, -2.04));
  addWallHorseshoe(parts, 0, dY + 0.33, -2.01, 0);

  // 6b. Hinged double cellar door leaves (doorLeftParts pivot at (-0.72, doorPivotY, -1.23), doorRightParts pivot at (+0.72, doorPivotY, -1.23)):
  //     Each door mesh has rotation.x = -0.162 (matching the bulkhead sill slope) so rotating around local Z (rotation.z)
  //     swings the leaf cleanly around its sloped hinge line without any front-to-back skew.
  const doorLeftParts = [];
  const doorRightParts = [];
  const addDoorPart = (arr, geo, color, lx, ly, lz, rx = 0, ry = 0, rz = 0) => {
    arr.push(trapperPart(geo, color, lx, ly, lz, rx, ry, rz));
  };
  for (const sgn of [-1, 1]) {
    const arr = sgn < 0 ? doorLeftParts : doorRightParts;
    const inDir = -sgn; // +1 for left leaf (extends +x toward 0), -1 for right leaf (extends -x toward 0)
    // Four weathered longitudinal timber planks on the upper face:
    for (let p = 0; p < 4; p++) {
      const px = inDir * (0.095 + p * 0.172);
      const col = woodPalette[(p + (sgn > 0 ? 2 : 0)) % woodPalette.length];
      addDoorPart(arr, new THREE.BoxGeometry(0.158, 0.042, 1.84), col, px, 0.022, 0);
    }
    // Mismatched repair board & split grain detail (Rule 4 of asset-principles.md):
    if (sgn < 0) {
      addDoorPart(arr, new THREE.BoxGeometry(0.32, 0.016, 0.64), 0x8a7054, inDir * 0.35, 0.048, 0.28, 0, 0.02, 0);
    } else {
      addDoorPart(arr, new THREE.BoxGeometry(0.28, 0.016, 0.52), 0x3e2f20, inDir * 0.52, 0.048, -0.34, 0, -0.02, 0);
    }
    // Two transverse wooden battens on top:
    for (const bz of [-0.58, 0.58]) {
      addDoorPart(arr, new THREE.BoxGeometry(0.68, 0.028, 0.09), woodPalette[3], inDir * 0.35, 0.052, bz);
      // Heavy forged-iron strap hinges with rust halos & rivet studs:
      addDoorPart(arr, new THREE.BoxGeometry(0.64, 0.018, 0.055), ironStrap, inDir * 0.33, 0.068, bz);
      addDoorPart(arr, new THREE.CylinderGeometry(0.022, 0.022, 0.09, 6), ironPlateB, inDir * 0.02, 0.055, bz, 0, 0, Math.PI * 0.5);
      addDoorPart(arr, new THREE.BoxGeometry(0.12, 0.008, 0.085), rustStreak, inDir * 0.52, 0.066, bz);
      for (let r = 0; r < 3; r++) {
        addDoorPart(arr, new THREE.BoxGeometry(0.020, 0.022, 0.020), ironRivet, inDir * (0.14 + r * 0.21), 0.076, bz);
      }
    }
    // Centre seam iron edge strip & pull ring on the upper face:
    addDoorPart(arr, new THREE.BoxGeometry(0.035, 0.052, 1.84), ironStrap, inDir * 0.695, 0.022, 0);
    addDoorPart(arr, new THREE.TorusGeometry(0.048, 0.010, 5, 10), ironPlateC, inDir * 0.61, 0.068, 0.34, Math.PI * 0.35, 0, 0);

    // Underside of each door leaf: full riveted dark-iron liner plate (exposed when the doors fold open on Day 8):
    addDoorPart(arr, new THREE.BoxGeometry(0.68, 0.024, 1.80), ironPlateA, inDir * 0.35, -0.012, 0);
    addDoorPart(arr, new THREE.BoxGeometry(0.62, 0.016, 0.82), ironPlateB, inDir * 0.35, -0.024, -0.44);
    addDoorPart(arr, new THREE.BoxGeometry(0.62, 0.016, 0.82), ironPlateC, inDir * 0.35, -0.024, 0.44);
    // Iron framing battens, rust streaks & rivet heads on the underside:
    for (const bz of [-0.82, 0, 0.82]) {
      addDoorPart(arr, new THREE.BoxGeometry(0.68, 0.020, 0.05), ironStrap, inDir * 0.35, -0.030, bz);
    }
    addDoorPart(arr, new THREE.BoxGeometry(0.18, 0.008, 0.55), rustStreak, inDir * 0.24, -0.032, -0.22);
    for (const rx of [0.12, 0.35, 0.58]) {
      for (const rz of [-0.72, -0.24, 0.24, 0.72]) {
        addDoorPart(arr, new THREE.BoxGeometry(0.022, 0.022, 0.022), ironRivet, inDir * rx, -0.036, rz);
      }
    }
  }

  // Heavy forged-iron locking bar & padlock across the shut cellar doors (hidden once unlocked):
  const doorBarParts = [];
  addDoorPart(doorBarParts, new THREE.BoxGeometry(1.32, 0.032, 0.065), ironStrap, 0, 0.078, 0.38);
  addDoorPart(doorBarParts, new THREE.BoxGeometry(0.09, 0.045, 0.14), ironPlateB, 0, 0.088, 0.38);
  addDoorPart(doorBarParts, new THREE.BoxGeometry(0.075, 0.095, 0.038), ironPlateA, 0, 0.065, 0.46);
  addDoorPart(doorBarParts, new THREE.BoxGeometry(0.055, 0.055, 0.042), rustStreak, 0, 0.058, 0.462);

  // 6c. 8-step timber-and-iron stairwell (lz = -0.34 .. -1.86, descending from y = dY to y = -2.15):
  const numSteps = 8;
  const stairTopY = dY;
  for (let s = 0; s < numSteps; s++) {
    const t0 = s / numSteps, t1 = (s + 1) / numSteps;
    const zStep = rule.STAIR_Z_TOP + (rule.STAIR_Z_BOT - rule.STAIR_Z_TOP) * (t0 + t1) * 0.5;
    const yStep = stairTopY + (rule.CELLAR_FLOOR_Y - stairTopY) * (s + 0.82) / numSteps;
    // Heavy timber tread plank + forged-iron nosing bar + iron riser plate:
    parts.push(trapperPart(new THREE.BoxGeometry(1.24, 0.055, 0.23), woodPalette[s % woodPalette.length], 0, yStep, zStep));
    parts.push(trapperPart(new THREE.BoxGeometry(1.24, 0.058, 0.035), ironPlateB, 0, yStep + 0.002, zStep - 0.10));
    parts.push(trapperPart(new THREE.BoxGeometry(1.22, 0.29, 0.035), ironStrap, 0, yStep - 0.14, zStep + 0.09));
    for (const rx of [-0.46, 0, 0.46]) {
      parts.push(trapperPart(new THREE.BoxGeometry(0.018, 0.018, 0.018), ironRivet, rx, yStep + 0.032, zStep - 0.09));
    }
  }
  // Sloped solid underside carriage of the stairs so nothing ever shows under the treads:
  parts.push(trapperPart(new THREE.BoxGeometry(1.28, 0.24, 1.95), ironStrap, 0, -1.22 + dY * 0.5, -1.12, -0.94, 0, 0));
  // Front retaining wall under the top step (lz = -0.34, y = -2.20 .. dY):
  const retH = 2.22 + dY;
  parts.push(trapperPart(new THREE.BoxGeometry(1.48, retH, 0.12), stonePalette[0], 0, -2.22 + retH * 0.5, -0.34));

  // Left and right stairwell walls (lx = +-0.68, lz = -0.30 .. -2.26, y = -2.22 .. dY + 0.18):
  const swWallH = 2.40 + dY;
  const swWallMidY = -2.22 + swWallH * 0.5;
  for (const sgn of [-1, 1]) {
    // Backing stone wall:
    parts.push(trapperPart(new THREE.BoxGeometry(0.24, swWallH, 1.96), stonePalette[1], sgn * 0.74, swWallMidY, -1.28));
    // Inner riveted iron wall liner plates inside the stairwell:
    const linerH = 2.18 + dY;
    const linerMidY = -2.13 + linerH * 0.5;
    for (let k = 0; k < 3; k++) {
      const pz = -0.62 - k * 0.64;
      const col = k === 1 ? ironPlateB : ironPlateA;
      parts.push(trapperPart(new THREE.BoxGeometry(0.035, linerH, 0.62), col, sgn * 0.62, linerMidY, pz));
      parts.push(trapperPart(new THREE.BoxGeometry(0.048, linerH + 0.02, 0.045), ironStrap, sgn * 0.61, linerMidY, pz - 0.31));
      parts.push(trapperPart(new THREE.BoxGeometry(0.042, 0.38, 0.16), rustStreak, sgn * 0.605, -0.45 - k * 0.25, pz + 0.08));
      for (let ry = -1.85; ry <= -0.25 + dY; ry += 0.40) {
        parts.push(trapperPart(new THREE.BoxGeometry(0.022, 0.022, 0.022), ironRivet, sgn * 0.595, ry, pz - 0.31));
      }
    }
  }
  // Forged-iron handrail along the right stairwell wall:
  trapperBar(parts, [0.55, -0.05 + dY, -0.44], [0.55, -1.48, -1.88], 0.020, ironPlateC, 6);
  trapperBar(parts, [0.62, -0.18 + dY, -0.48], [0.55, -0.05 + dY, -0.44], 0.016, ironStrap, 5);
  trapperBar(parts, [0.62, -1.58, -1.84], [0.55, -1.48, -1.88], 0.016, ironStrap, 5);

  // Doorway header / lintel between stairwell and cellar room (lz = -1.96 .. -2.28, y = -0.14 .. dY + 0.24):
  parts.push(trapperPart(new THREE.BoxGeometry(1.44, 0.42 + dY, 0.36), ironPlateB, 0, 0.05 + dY * 0.5, -2.12));
  parts.push(trapperPart(new THREE.BoxGeometry(1.36, 0.12, 0.38), woodPalette[3], 0, -0.10, -2.12));
  parts.push(trapperPart(new THREE.BoxGeometry(1.38, 0.05, 0.40), ironStrap, 0, -0.14, -2.12));
  addWallHorseshoe(parts, 0, -0.01, -1.92, 0);

  // 6d. Underground Iron-Lined Cellar Room (lx in [-1.62, +1.62], lz in [-5.06, -2.28], y = -2.15 .. -0.14):
  const floorY = rule.CELLAR_FLOOR_Y;       // -2.15
  const ceilY  = rule.CELLAR_CEIL_UNDER_Y;  // -0.14
  const roomH  = ceilY - floorY;            // 2.01 m
  const roomMidY = (floorY + ceilY) * 0.5;  // -1.145

  // Heavy flagstone & riveted iron floor slab (extending under bottom of stairs from lz = -1.72 to -5.16):
  parts.push(trapperPart(new THREE.BoxGeometry(3.56, 0.18, 3.52), stonePalette[0], 0, floorY - 0.09, -3.44));
  for (let ix = -1; ix <= 1; ix++) {
    for (let iz = 0; iz < 3; iz++) {
      const px = ix * 1.04, pz = -2.52 - iz * 0.96;
      const pCol = (ix + iz) % 2 === 0 ? ironPlateB : ironPlateA;
      parts.push(trapperPart(new THREE.BoxGeometry(1.00, 0.024, 0.92), pCol, px, floorY + 0.004, pz));
      parts.push(trapperPart(new THREE.BoxGeometry(1.02, 0.028, 0.04), ironStrap, px, floorY + 0.006, pz - 0.46));
    }
  }
  // Slatted wooden duckboard walkway along the centre aisle (lx = -0.35 .. +0.35, lz = -2.05 .. -4.65):
  for (let d = 0; d < 10; d++) {
    const dz = -2.10 - d * 0.27;
    parts.push(trapperPart(new THREE.BoxGeometry(0.76, 0.024, 0.19), woodPalette[d % woodPalette.length], -0.05, floorY + 0.020, dz));
  }

  // Outer containment stone shell around all 4 underground cellar walls (kept strictly below y = -0.09 so it never pokes through downhill ground):
  const shellH = roomH + 0.14;
  const shellMidY = floorY - 0.09 + shellH * 0.5;
  parts.push(trapperPart(new THREE.BoxGeometry(3.72, shellH, 0.26), stonePalette[0], 0, shellMidY, -5.20));
  for (const sgn of [-1, 1]) {
    parts.push(trapperPart(new THREE.BoxGeometry(0.26, shellH, 3.12), stonePalette[0], sgn * 1.76, shellMidY, -3.68));
    parts.push(trapperPart(new THREE.BoxGeometry(1.16, shellH, 0.26), stonePalette[0], sgn * 1.18, shellMidY, -2.16));
  }

  // Riveted dark-iron wall plates, batten straps, rivet studs, rust streaks, and timber stanchions on all 4 cellar walls:
  // Back wall (lz = -5.06, lx in [-1.62, +1.62]):
  for (let k = -2; k <= 2; k++) {
    const wx = k * 0.64;
    const col = Math.abs(k) % 2 === 0 ? ironPlateA : ironPlateB;
    parts.push(trapperPart(new THREE.BoxGeometry(0.62, roomH, 0.04), col, wx, roomMidY, -5.05));
    parts.push(trapperPart(new THREE.BoxGeometry(0.05, roomH, 0.055), ironStrap, wx + 0.31, roomMidY, -5.03));
    parts.push(trapperPart(new THREE.BoxGeometry(0.22, 0.48, 0.045), rustStreak, wx - 0.06, ceilY - 0.32, -5.035));
    for (let ry = floorY + 0.22; ry <= ceilY - 0.12; ry += 0.38) {
      parts.push(trapperPart(new THREE.BoxGeometry(0.022, 0.022, 0.022), ironRivet, wx + 0.31, ry, -5.00));
      parts.push(trapperPart(new THREE.BoxGeometry(0.022, 0.022, 0.022), ironRivet, wx - 0.24, ry, -5.00));
    }
  }
  // Horizontal iron waist band across the back wall:
  parts.push(trapperPart(new THREE.BoxGeometry(3.24, 0.06, 0.055), ironStrap, 0, roomMidY + 0.12, -5.03));
  // Back wall timber stanchions & central horseshoe:
  for (const tx of [-1.54, 0, 1.54]) {
    parts.push(trapperPart(new THREE.BoxGeometry(0.11, roomH, 0.11), woodPalette[3], tx, roomMidY, -4.98));
  }
  addWallHorseshoe(parts, 0, floorY + 1.38, -4.91, 0);

  // Left and right iron walls (lx = +-1.62, lz in [-5.06, -2.28]):
  for (const sgn of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const wz = -2.62 - k * 0.69;
      const col = (k + (sgn > 0 ? 1 : 0)) % 2 === 0 ? ironPlateA : ironPlateC;
      parts.push(trapperPart(new THREE.BoxGeometry(0.04, roomH, 0.67), col, sgn * 1.62, roomMidY, wz));
      parts.push(trapperPart(new THREE.BoxGeometry(0.055, roomH, 0.05), ironStrap, sgn * 1.60, roomMidY, wz - 0.34));
      parts.push(trapperPart(new THREE.BoxGeometry(0.045, 0.42, 0.22), rustStreak, sgn * 1.605, ceilY - 0.28 - (k % 2) * 0.35, wz + 0.08));
      for (let ry = floorY + 0.22; ry <= ceilY - 0.12; ry += 0.38) {
        parts.push(trapperPart(new THREE.BoxGeometry(0.022, 0.022, 0.022), ironRivet, sgn * 1.57, ry, wz - 0.34));
      }
    }
    // Horizontal iron waist band along each side wall:
    parts.push(trapperPart(new THREE.BoxGeometry(0.055, 0.06, 2.78), ironStrap, sgn * 1.60, roomMidY + 0.12, -3.67));
    // Mid-wall timber stanchion & nailed horseshoe on each side wall:
    parts.push(trapperPart(new THREE.BoxGeometry(0.11, roomH, 0.11), woodPalette[3], sgn * 1.54, roomMidY, -3.65));
    addWallHorseshoe(parts, sgn * 1.47, floorY + 1.38, -3.65, -sgn * Math.PI * 0.5);

    // Front wall iron wings (lz = -2.28, lx in [+-0.62 .. +-1.62]):
    parts.push(trapperPart(new THREE.BoxGeometry(1.02, roomH, 0.04), ironPlateB, sgn * 1.12, roomMidY, -2.28));
    parts.push(trapperPart(new THREE.BoxGeometry(0.05, roomH, 0.06), ironStrap, sgn * 0.64, roomMidY, -2.28));
    parts.push(trapperPart(new THREE.BoxGeometry(0.24, 0.44, 0.045), rustStreak, sgn * 1.08, ceilY - 0.34, -2.30));
    for (let ry = floorY + 0.24; ry <= ceilY - 0.14; ry += 0.40) {
      parts.push(trapperPart(new THREE.BoxGeometry(0.022, 0.022, 0.022), ironRivet, sgn * 0.66, ry, -2.31));
      parts.push(trapperPart(new THREE.BoxGeometry(0.022, 0.022, 0.022), ironRivet, sgn * 1.14, ry, -2.31));
    }
    parts.push(trapperPart(new THREE.BoxGeometry(0.11, roomH, 0.11), woodPalette[3], sgn * 1.54, roomMidY, -2.36));
  }
  addWallHorseshoe(parts, 0, ceilY - 0.14, -2.31, Math.PI);

  // 6e. Ceiling timber joists & central 1.20m x 1.20m open forged-iron bar grate skylight (lx in [-0.60, +0.60], lz in [-4.10, -2.90]):
  for (const jz of [-2.42, -2.88, -4.12, -4.88]) {
    parts.push(trapperPart(new THREE.BoxGeometry(3.26, 0.13, 0.13), woodPalette[3], 0, ceilY - 0.04, jz));
    parts.push(trapperPart(new THREE.BoxGeometry(3.26, 0.03, 0.15), ironStrap, 0, ceilY - 0.10, jz));
  }
  const skySlopeX = (surfY(0.60, -3.50) - surfY(-0.60, -3.50)) / 1.20;
  const skySlopeZ = (surfY(0, -2.90) - surfY(0, -4.10)) / 1.20;
  const skyRotZ = Math.atan(skySlopeX);
  const skyRotX = -Math.atan(skySlopeZ);
  // 9 longitudinal forged-iron grate bars + 3 transverse cross-bars + thin iron rim seated at grade across the 1.20m x 1.20m skylight opening:
  for (const sgn of [-1, 1]) {
    const zRim = -3.50 + sgn * 0.61;
    parts.push(trapperPart(new THREE.BoxGeometry(1.26, 0.04, 0.04), ironStrap, 0, surfY(0, zRim) + 0.01, zRim, 0, 0, skyRotZ));
    const xRim = sgn * 0.61;
    parts.push(trapperPart(new THREE.BoxGeometry(0.04, 0.04, 1.22), ironStrap, xRim, surfY(xRim, -3.50) + 0.01, -3.50, skyRotX, 0, 0));
  }
  for (let b = -4; b <= 4; b++) {
    const bx = b * 0.135;
    parts.push(trapperPart(new THREE.BoxGeometry(0.024, 0.038, 1.22), ironStrap, bx, surfY(bx, -3.50) + 0.01, -3.50, skyRotX, 0, 0));
  }
  for (const czBar of [-3.90, -3.50, -3.10]) {
    parts.push(trapperPart(new THREE.BoxGeometry(1.22, 0.028, 0.032), ironPlateC, 0, surfY(0, czBar), czBar, 0, 0, skyRotZ));
  }

  // 6f. Cellar interior props (Okafor's survival refuge, leaving trapper.cellarSpot at (-0.45, -2.15, -3.65) clear):
  // Left wall: timber cot/bunk (lx = -1.20, lz = -3.92) with olive blanket & canvas bedroll:
  parts.push(trapperPart(new THREE.BoxGeometry(0.68, 0.06, 1.56), woodPalette[0], -1.20, floorY + 0.36, -3.92));
  for (const [lxLeg, lzLeg] of [[-1.48, -3.18], [-0.92, -3.18], [-1.48, -4.66], [-0.92, -4.66]]) {
    parts.push(trapperPart(new THREE.BoxGeometry(0.07, 0.36, 0.07), woodPalette[3], lxLeg, floorY + 0.18, lzLeg));
  }
  parts.push(trapperPart(new THREE.BoxGeometry(0.62, 0.055, 1.46), 0x4a5239, -1.20, floorY + 0.41, -3.92)); // olive wool blanket
  parts.push(trapperPart(new THREE.CylinderGeometry(0.095, 0.095, 0.54, 8), 0x8b7759, -1.20, floorY + 0.48, -4.48, 0, 0, Math.PI * 0.5)); // bedroll pillow

  // Small wooden crate table beside the cot (lx = -1.14, lz = -2.75) with warm oil lantern & enamel mug:
  parts.push(trapperPart(new THREE.BoxGeometry(0.46, 0.48, 0.46), woodPalette[1], -1.14, floorY + 0.24, -2.75, 0, 0.08, 0));
  parts.push(trapperPart(new THREE.BoxGeometry(0.48, 0.03, 0.48), ironStrap, -1.14, floorY + 0.47, -2.75, 0, 0.08, 0));
  parts.push(trapperPart(new THREE.CylinderGeometry(0.075, 0.095, 0.06, 8), ironPlateB, -1.12, floorY + 0.51, -2.75));
  parts.push(trapperPart(new THREE.CylinderGeometry(0.055, 0.065, 0.14, 8), 0xffb84d, -1.12, floorY + 0.60, -2.75));
  parts.push(trapperPart(new THREE.CylinderGeometry(0.075, 0.050, 0.05, 8), ironPlateB, -1.12, floorY + 0.69, -2.75));
  parts.push(trapperPart(new THREE.CylinderGeometry(0.042, 0.042, 0.085, 7), 0x7b8488, -0.98, floorY + 0.52, -2.62));

  // Right wall: two-tier storage shelving (lx = +1.28, lz = -3.65) with crocks, ration tins, water pail & spare iron traps:
  for (const lzPost of [-2.78, -3.65, -4.52]) {
    parts.push(trapperPart(new THREE.BoxGeometry(0.07, 1.48, 0.07), woodPalette[3], 1.04, floorY + 0.74, lzPost));
    parts.push(trapperPart(new THREE.BoxGeometry(0.07, 1.48, 0.07), woodPalette[3], 1.50, floorY + 0.74, lzPost));
  }
  for (const sy of [0.46, 1.02]) {
    parts.push(trapperPart(new THREE.BoxGeometry(0.50, 0.045, 1.84), woodPalette[0], 1.27, floorY + sy, -3.65));
  }
  // Stoneware preserve crocks & ration tins on upper shelf:
  for (let c = 0; c < 3; c++) {
    parts.push(trapperPart(new THREE.CylinderGeometry(0.09, 0.095, 0.24, 8), 0x8c7a64, 1.26, floorY + 1.16, -3.02 - c * 0.34));
    parts.push(trapperPart(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 8), woodPalette[2], 1.26, floorY + 1.29, -3.02 - c * 0.34));
  }
  for (let t = 0; t < 3; t++) {
    parts.push(trapperPart(new THREE.BoxGeometry(0.16, 0.14, 0.20), 0x525852, 1.25, floorY + 1.11, -4.02 - t * 0.22, 0, t * 0.15, 0));
  }
  // Spare iron leghold traps & wooden water bucket on lower shelf / floor:
  for (const tz of [-3.15, -3.65]) {
    parts.push(trapperPart(new THREE.TorusGeometry(0.11, 0.018, 5, 10), ironPlateB, 1.24, floorY + 0.50, tz, Math.PI * 0.5, 0, 0));
    parts.push(trapperPart(new THREE.BoxGeometry(0.24, 0.018, 0.04), ironStrap, 1.24, floorY + 0.49, tz));
  }
  parts.push(trapperPart(new THREE.CylinderGeometry(0.16, 0.13, 0.32, 9), woodPalette[1], 1.24, floorY + 0.16, -4.22));
  parts.push(trapperPart(new THREE.TorusGeometry(0.15, 0.012, 5, 9), ironStrap, 1.24, floorY + 0.24, -4.22, Math.PI * 0.5, 0, 0));

  // Back right corner: iron-hooped supply barrel & stacked split firewood (lx = +0.72, lz = -4.68):
  parts.push(trapperPart(new THREE.CylinderGeometry(0.24, 0.21, 0.68, 10), woodPalette[0], 0.78, floorY + 0.34, -4.68));
  parts.push(trapperPart(new THREE.TorusGeometry(0.235, 0.015, 5, 10), ironStrap, 0.78, floorY + 0.52, -4.68, Math.PI * 0.5, 0, 0));
  parts.push(trapperPart(new THREE.TorusGeometry(0.225, 0.015, 5, 10), ironStrap, 0.78, floorY + 0.18, -4.68, Math.PI * 0.5, 0, 0));

  // 6g. Underground Cellar Ceiling Liner & Skylight Shaft/Curb (roofCapParts -> trapper.cellarRoofCap):
  //     The exterior surface over the cellar is the natural ground (buildTrapperCellarCap in index.html).
  //     roofCapParts provides the interior riveted dark-iron ceiling liner (y = -0.14 .. -0.09, strictly below the ground)
  //     and the riveted iron shaft + low fieldstone curb framing the 1.20m x 1.20m skylight at grade.
  const roofCapParts = [];
  for (const sgn of [-1, 1]) {
    const zShaft = -3.50 + sgn * 0.62;
    const hZ = Math.max(0.18, surfY(0, zShaft) + 0.02 - ceilY);
    roofCapParts.push(trapperPart(new THREE.BoxGeometry(1.36, hZ, 0.08), ironPlateB, 0, ceilY + hZ * 0.5, zShaft, 0, 0, skyRotZ));
    const xShaft = sgn * 0.64;
    const hX = Math.max(0.18, surfY(xShaft, -3.50) + 0.02 - ceilY);
    roofCapParts.push(trapperPart(new THREE.BoxGeometry(0.08, hX, 1.28), ironPlateB, xShaft, ceilY + hX * 0.5, -3.50, skyRotX, 0, 0));
    // Low fieldstone curb stones seated at grade around the skylight opening:
    for (let s = 0; s < 3; s++) {
      const sx = (s - 1) * 0.44;
      const cz = -3.50 + sgn * 0.68;
      roofCapParts.push(trapperPart(new THREE.BoxGeometry(0.42, 0.10, 0.12), stonePalette[(s + (sgn > 0 ? 1 : 0)) % stonePalette.length],
        sx, surfY(sx, cz) - 0.01, cz, skyRotX, 0, skyRotZ));
      const sz = -3.50 + (s - 1) * 0.44;
      const cxCurb = sgn * 0.68;
      roofCapParts.push(trapperPart(new THREE.BoxGeometry(0.12, 0.10, 0.42), stonePalette[(s + (sgn > 0 ? 2 : 1)) % stonePalette.length],
        cxCurb, surfY(cxCurb, sz) - 0.01, sz, skyRotX, 0, skyRotZ));
    }
  }
  // Four underground iron ceiling liner plates framing the skylight opening at y = ceilY + 0.025 = -0.115:
  roofCapParts.push(trapperPart(new THREE.BoxGeometry(3.32, 0.05, 0.66), ironPlateB, 0, ceilY + 0.025, -2.57));
  roofCapParts.push(trapperPart(new THREE.BoxGeometry(3.32, 0.05, 1.00), ironPlateB, 0, ceilY + 0.025, -4.60));
  for (const sgn of [-1, 1]) {
    roofCapParts.push(trapperPart(new THREE.BoxGeometry(1.06, 0.05, 1.24), ironPlateA, sgn * 1.13, ceilY + 0.025, -3.50));
  }

  return { parts, roofCapParts, doorLeftParts, doorRightParts, doorBarParts, stones, posts, colliderSpots };
}

/**
 * AG-124 / AG-135 / AG-144 (N28, D-88; story-chain.md §4 Day 8; docs/world-design.md rules 1, 2, 8, 9, 12):
 * Relocate and build the trapper's 8-row fenced yard and iron-lined root cellar in the flat wooded clearing behind his
 * cabin and workbench (17-25.4 m away from bridges[1]), seating objective:trapper-cache and the cellar bulkhead at the
 * head of the yard, with the cellar roof formed by the ground itself (buildCaveCap style) and hinged cellar doors that
 * stay shut until trapperPath.unlocked() and open into the underground iron-lined cellar where Okafor shelters.
 */
export function setupTrapperMission(THREE, {
  prop, camp, trapper, sampleHeight, sampleNaturalHeight, addSolid, mergeParts, scene,
  historyProps, foliage, windSwayables, clearFoliageInSquare, trees, rocks, worldSolids,
  platforms, excavateCellar, buildCellarTerrainCap, trapperPath,
  trapperPart, trapperBar, syncTrapperHorseshoes, rule = TRAPPER
}) {
  const cx = camp.x + rule.YARD_OFF_X, cz = camp.z + rule.YARD_OFF_Z;
  const yaw = rule.YARD_YAW;
  let cy0 = sampleHeight(cx, cz);
  for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4], [0, 0]]) {
    cy0 = Math.min(cy0, sampleHeight(cx + dx, cz + dz));
  }
  const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
  const toWorld = (lx, lz) => ({ x: cx + lx * cosY + lz * sinY, z: cz - lx * sinY + lz * cosY });
  const toLocal = (wx, wz) => { const dx = wx - cx, dz = wz - cz; return { x: dx * cosY - dz * sinY, z: dx * sinY + dz * cosY }; };
  const natAtLocal = (lx, lz) => {
    const w = toWorld(lx, lz);
    const fn = typeof sampleNaturalHeight === 'function' ? sampleNaturalHeight : sampleHeight;
    return fn(w.x, w.z) - cy0;
  };
  const yFront0 = natAtLocal(0, -0.32);
  const yBack0 = natAtLocal(0, -2.18);
  const ySky0 = Math.max(0.02, natAtLocal(0, -3.50));
  const doorPivotY = Math.max(0.18, Math.min(0.42, (yFront0 + yBack0) * 0.5 + 0.02));
  const s01 = (t) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };
  const surfLocalY = (lx, lz) => {
    const nat = natAtLocal(lx, lz);
    const wRoom = s01((2.35 - Math.abs(lx)) / 0.55) * s01((lz + 5.75) / 0.55) * s01((-1.80 - lz) / 0.45);
    let h = Math.max(nat, -0.01 * wRoom + nat * (1 - wRoom));
    const wSkyX = s01((1.65 - Math.abs(lx)) / 0.90);
    const wSkyZ = s01((1.45 - Math.abs(lz + 3.50)) / 0.72);
    const wSky = wSkyX * wSkyZ;
    if (wSky > 0) {
      const skyGradeY = ySky0 + (-3.50 - Math.max(-4.20, Math.min(-2.80, lz))) * 0.06;
      h = h + (skyGradeY - h) * wSky;
    }
    const wBulkX = s01((2.05 - Math.abs(lx)) / 0.95);
    const wBulkZ = s01((lz + 2.85) / 0.65) * s01((0.55 - lz) / 0.83);
    const wBulk = wBulkX * wBulkZ;
    if (wBulk > 0) {
      const lzClamped = Math.max(-2.18, Math.min(-0.30, lz));
      const gradeY = doorPivotY - 0.06 + (-1.23 - lzClamped) * 0.162;
      h = h + (gradeY - h) * wBulk;
    }
    return h;
  };
  const groundAtLocal = (lx, lz) => { const w = toWorld(lx, lz); return sampleHeight(w.x, w.z) - cy0; };
  trapper.toWorld = toWorld;
  trapper.toLocal = toLocal;
  trapper.groundAtLocal = groundAtLocal;
  trapper.surfLocalY = surfLocalY;
  trapper.cy0 = cy0;

  // Seat historyProps' cellar hatch at (0, -0.82) for t167 compatibility, then hide its old flat surface mesh
  // because trapper.doorL / trapper.doorR / trapper.doorBar render the real 3D hinged bulkhead doors:
  const ch = historyProps?.parts?.['cellar-hatch'];
  if (ch) {
    const hw = toWorld(0, -0.82), newBase = sampleHeight(hw.x, hw.z);
    ch.position.set(hw.x, newBase, hw.z);
    ch.rotation.y = yaw;
    ch.visible = false;
    ch.updateMatrixWorld(true);
  }
  if (historyProps?.group?.children) {
    const gatePostW = toWorld(-(rule.POST_X + 1.15), rule.BED_Z_MAX + 0.70);
    const gatePostY = sampleHeight(gatePostW.x, gatePostW.z);
    const gateTrapsW = toWorld(rule.POST_X + 1.15, rule.BED_Z_MAX + 0.70);
    let hsIdx = 0;
    for (const child of historyProps.group.children) {
      if (child.name === 'trapper-post') {
        child.position.set(gatePostW.x, gatePostY + 0.8, gatePostW.z);
        child.rotation.y = 0;
        child.updateMatrixWorld(true);
      } else if (child.name === 'horseshoe') {
        child.position.set(gatePostW.x, gatePostY + 0.75 + (hsIdx % 3) * 0.28, gatePostW.z + 0.08);
        child.rotation.y = 0;
        child.updateMatrixWorld(true);
        hsIdx++;
      } else if (child.name === 'leghold-traps') {
        child.position.set(gateTrapsW.x, sampleHeight(gateTrapsW.x, gateTrapsW.z), gateTrapsW.z);
        child.rotation.y = yaw;
        child.updateMatrixWorld(true);
      }
    }
  }

  // Clear scattered trees, rocks, and foliage tufts inside the fenced yard, over the cellar mound, and around the CL-6 cache site:
  const cl6X = camp.x - 4.0, cl6Z = camp.z + 4.0, cl6Ax = cl6X - 0.57, cl6Az = cl6Z - 1.39;
  const nearCl6 = (wx, wz, pad = 0) => Math.hypot(wx - cl6X, wz - cl6Z) < 1.35 + pad || Math.hypot(wx - cl6Ax, wz - cl6Az) < 1.15 + pad;
  const inYard = (wx, wz, pad = 0) => {
    const loc = toLocal(wx, wz);
    return (Math.abs(loc.x) < Math.max(rule.POST_X + 1.35, 2.70) + pad && loc.z > -5.75 - pad && loc.z < rule.ENTRY_Z + 1.05 + pad) || nearCl6(wx, wz, pad);
  };
  if (typeof clearFoliageInSquare === 'function') {
    for (let lz = -5.2; lz <= rule.ENTRY_Z + 0.6; lz += 1.8) {
      const fw = toWorld(0, lz);
      clearFoliageInSquare(fw.x, fw.z, 2.7);
    }
  }
  if (Array.isArray(foliage)) {
    for (let i = foliage.length - 1; i >= 0; i--) {
      const f = foliage[i];
      if (!inYard(f.x, f.z, 0.35) && Math.hypot(f.x - cx, f.z - cz) >= 1.45) continue;
      if (f.mesh) scene.remove(f.mesh);
      if (Array.isArray(windSwayables)) {
        const w = windSwayables.findIndex((s) => s.mesh === f.mesh);
        if (w >= 0) windSwayables.splice(w, 1);
      }
      foliage.splice(i, 1);
    }
  }
  if (Array.isArray(trees)) {
    for (let i = trees.length - 1; i >= 0; i--) {
      const t = trees[i];
      if (!inYard(t.x, t.z, (t.trunkRadius || 0.35) + 0.45)) continue;
      t.alive = false;
      if (t.group) scene.remove(t.group);
      trees.splice(i, 1);
    }
  }
  if (Array.isArray(rocks)) {
    for (const rock of rocks) {
      if (rock.alive && inYard(rock.x, rock.z, (rock.radius || 0.8) + 0.35)) {
        rock.alive = false;
        if (rock.mesh) scene.remove(rock.mesh);
      }
    }
  }
  trapper.clearedSolids = [];
  if (Array.isArray(worldSolids)) {
    for (let i = worldSolids.length - 1; i >= 0; i--) {
      const s = worldSolids[i];
      const loc = toLocal(s.x, s.z);
      const inYardBox = Math.abs(loc.x) < Math.max(rule.POST_X + 0.25, 2.2) && loc.z > -5.5 && loc.z < rule.ENTRY_Z + 0.6;
      const isNearCl6 = nearCl6(s.x, s.z, s.radius || 0);
      if (inYardBox || isNearCl6) {
        let trianglesBefore = 0;
        let trianglesRemoved = 0;
        let trianglesAfter = 0;
        if (s.landmark) {
          // AG-140 / AG-141 (CL-256 batch 3): strip the offending camp piece's merged mesh triangles together with its
          // collider when it sits on the CL_6 cache stand (e.g. the r=0.48 m curing frame rotated to (-38.43, 45.73),
          // 0.78 m from (-38.06, 46.42)), and remove the collider from spawnColliders/colliders so startMatch() never restores it.
          const geo = s.landmark.mesh?.geometry;
          const posAttr = geo?.attributes?.position;
          if (isNearCl6 && posAttr?.array && !geo.index) {
            const pos = posAttr.array;
            const nrm = geo.attributes.normal?.array || null;
            const col = geo.attributes.color?.array || null;
            const lx0 = s.x - (s.landmark.x || 0), lz0 = s.z - (s.landmark.z || 0);
            const cutR = (s.radius || 0.48) + 0.43;
            const triCount = (pos.length / 9) | 0;
            trianglesBefore = triCount;
            const keepTris = [];
            for (let t = 0; t < triCount; t++) {
              const b = t * 9;
              const cxTri = (pos[b] + pos[b + 3] + pos[b + 6]) / 3;
              const czTri = (pos[b + 2] + pos[b + 5] + pos[b + 8]) / 3;
              if (Math.hypot(cxTri - lx0, czTri - lz0) > cutR) keepTris.push(t);
            }
            trianglesAfter = keepTris.length;
            trianglesRemoved = triCount - keepTris.length;
            if (keepTris.length < triCount && THREE?.BufferAttribute) {
              const nextPos = new Float32Array(keepTris.length * 9);
              const nextNrm = nrm ? new Float32Array(keepTris.length * 9) : null;
              const nextCol = col ? new Float32Array(keepTris.length * 9) : null;
              for (let k = 0; k < keepTris.length; k++) {
                const src = keepTris[k] * 9, dst = k * 9;
                for (let j = 0; j < 9; j++) {
                  nextPos[dst + j] = pos[src + j];
                  if (nextNrm) nextNrm[dst + j] = nrm[src + j];
                  if (nextCol) nextCol[dst + j] = col[src + j];
                }
              }
              geo.setAttribute('position', new THREE.BufferAttribute(nextPos, 3));
              if (nextNrm) geo.setAttribute('normal', new THREE.BufferAttribute(nextNrm, 3));
              if (nextCol) geo.setAttribute('color', new THREE.BufferAttribute(nextCol, 3));
              if (typeof geo.computeBoundingSphere === 'function') geo.computeBoundingSphere();
              if (typeof geo.computeBoundingBox === 'function') geo.computeBoundingBox();
            }
          }
          if (Array.isArray(s.landmark.colliders)) {
            const ci = s.landmark.colliders.indexOf(s);
            if (ci >= 0) s.landmark.colliders.splice(ci, 1);
          }
          if (Array.isArray(s.landmark.spawnColliders)) {
            const si = s.landmark.spawnColliders.indexOf(s);
            if (si >= 0) s.landmark.spawnColliders.splice(si, 1);
          }
        }
        trapper.clearedSolids.push({
          x: Number(s.x.toFixed(3)),
          z: Number(s.z.toFixed(3)),
          localX: Number(loc.x.toFixed(3)),
          localZ: Number(loc.z.toFixed(3)),
          radius: Number((s.radius || 0).toFixed(3)),
          inYardBox,
          nearCl6: isNearCl6,
          landmark: s.landmark ? (s.landmark.kind || s.landmark.type || s.landmark.id || s.landmark.mesh?.name || 'camp-trapper') : null,
          landmarkPos: s.landmark ? [Number((s.landmark.x || 0).toFixed(2)), Number((s.landmark.z || 0).toFixed(2))] : null,
          trianglesBefore,
          trianglesRemoved,
          trianglesAfter
        });
        worldSolids.splice(i, 1);
      }
    }
  }

  const group = new THREE.Group();
  group.name = 'trapper-path';
  group.position.set(cx, cy0, cz);
  group.rotation.y = yaw;
  group.matrixAutoUpdate = false;
  group.updateMatrix();
  scene.add(group);
  trapper.group = group;

  // Build yard & cellar parts before excavateCellar so surface props sample natural clearing terrain:
  const built = buildTrapperYardParts(THREE, {
    groundAtLocal, surfAtLocal: surfLocalY, doorPivotY, toWorld, cy0, trapperPart, trapperBar, rule
  });
  trapper.stones = built.stones;
  trapper.posts = built.posts;
  trapper.colliders = [];
  for (const col of built.colliderSpots) {
    const w = toWorld(col.lx, col.lz), wy = sampleHeight(w.x, w.z);
    trapper.colliders.push(addSolid(w.x, w.z, col.r, wy - 0.1, wy + 1.65));
  }

  const staticMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.14 });
  const staticMesh = mergeParts(built.parts, staticMat, { castShadow: true, receiveShadow: true });
  for (const p of built.parts) p.geometry.dispose();
  staticMesh.name = 'trapper-path-static';
  staticMesh.matrixAutoUpdate = false;
  staticMesh.updateMatrix();
  group.add(staticMesh);
  trapper.staticMesh = staticMesh;

  // Cellar roof cap (underground ceiling liner + skylight curb + caveCapMat natural terrain cap).
  // Built BEFORE excavateCellar so terrainColorAt samples the uncut natural hillside slope and heights:
  const roofCapMesh = mergeParts(built.roofCapParts, staticMat, { castShadow: true, receiveShadow: true });
  for (const p of built.roofCapParts) p.geometry.dispose();
  roofCapMesh.name = 'trapper-cellar-roof-liner';
  roofCapMesh.matrixAutoUpdate = false;
  roofCapMesh.updateMatrix();
  let capPatchDecks = [];
  if (typeof buildCellarTerrainCap === 'function') {
    const roofCapGroup = new THREE.Group();
    roofCapGroup.name = 'trapper-cellar-roof-cap';
    roofCapGroup.matrixAutoUpdate = false;
    roofCapGroup.updateMatrix();
    roofCapGroup.add(roofCapMesh);
    const rawDecks = buildCellarTerrainCap({ toWorld, cy0, surfLocalY, targetGroup: roofCapGroup }) || [];
    capPatchDecks = rawDecks.map((d) => {
      const wc = toWorld(d.lx, d.lz);
      return {
        x: wc.x, z: wc.z, hw: d.hw, hl: d.hl, yaw,
        deckY: cy0 + d.yMin + 0.05, under: cy0 + rule.CELLAR_CEIL_UNDER_Y, landmark: true
      };
    });
    group.add(roofCapGroup);
    trapper.cellarRoofCap = roofCapGroup;
  } else {
    roofCapMesh.name = 'trapper-cellar-roof-cap';
    group.add(roofCapMesh);
    trapper.cellarRoofCap = roofCapMesh;
  }
  trapper.cellarCapDecks = capPatchDecks;

  // Excavate terrain heightField & ground mesh under the stairwell and cellar footprint AFTER buildCellarTerrainCap
  // so playerGroundY prefers the stair ramp and cellar floor decks over natural surface height:
  if (typeof excavateCellar === 'function') {
    excavateCellar(toLocal, cy0, surfLocalY);
  }

  // Seat objective:trapper-cache centre at (cx, cz) with approach at (0, HATCH_APPROACH_Z), and place the visual
  // cache box on the right stone threshold plinth (0.58, 0.20) so the stair entrance at lx = 0 is clear:
  const appW = toWorld(0, rule.HATCH_APPROACH_Z);
  const appY = sampleHeight(appW.x, appW.z);
  const centreGroundY = Math.min(cy0, sampleHeight(cx, cz));
  prop.centre.x = cx; prop.centre.y = centreGroundY; prop.centre.z = cz;
  prop.approach.x = appW.x; prop.approach.y = appY; prop.approach.z = appW.z;
  prop.facing = Math.atan2(cx - appW.x, cz - appW.z);
  if (prop.group) {
    const cacheW = toWorld(0.58, 0.20);
    prop.group.position.set(cacheW.x, cy0 + surfLocalY(0.58, 0.20) + 0.15, cacheW.z);
    prop.group.rotation.y = yaw - 0.18;
    prop.group.updateMatrixWorld(true);
  }

  // Hinged cellar door leaves & locking bar:
  const doorMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.28 });
  const doorLMesh = mergeParts(built.doorLeftParts, doorMat, { castShadow: true, receiveShadow: true });
  for (const p of built.doorLeftParts) p.geometry.dispose();
  doorLMesh.name = 'trapper-cellar-door-left';
  doorLMesh.position.set(-0.72, doorPivotY, -1.23);
  doorLMesh.rotation.set(-0.162, 0, 0);
  group.add(doorLMesh);
  trapper.doorL = doorLMesh;

  const doorRMesh = mergeParts(built.doorRightParts, doorMat, { castShadow: true, receiveShadow: true });
  for (const p of built.doorRightParts) p.geometry.dispose();
  doorRMesh.name = 'trapper-cellar-door-right';
  doorRMesh.position.set(0.72, doorPivotY, -1.23);
  doorRMesh.rotation.set(-0.162, 0, 0);
  group.add(doorRMesh);
  trapper.doorR = doorRMesh;

  const doorBarMesh = mergeParts(built.doorBarParts, doorMat, { castShadow: true, receiveShadow: true });
  for (const p of built.doorBarParts) p.geometry.dispose();
  doorBarMesh.name = 'trapper-cellar-door-bar';
  doorBarMesh.position.set(0, doorPivotY, -1.23);
  doorBarMesh.rotation.set(-0.162, 0, 0);
  group.add(doorBarMesh);
  trapper.doorBar = doorBarMesh;

  // Warm interior oil lantern light inside the cellar:
  const cellarLight = new THREE.PointLight(0xffa84a, 1.35, 6.5, 1.5);
  cellarLight.position.set(-1.05, rule.CELLAR_FLOOR_Y + 0.75, -2.75);
  group.add(cellarLight);
  trapper.cellarLight = cellarLight;

  // Register cellar platforms (floor, stair ramp, overhead skylight/roof decks, surface aprons, and shut-door cover):
  const dY = doorPivotY - 0.18;
  const floorC = toWorld(0, -3.44);
  trapper.cellarFloorDeck = {
    x: floorC.x, z: floorC.z, hw: 1.68, hl: 1.68, yaw,
    deckY: cy0 + rule.CELLAR_FLOOR_Y, under: cy0 + rule.CELLAR_FLOOR_Y - 0.25, landmark: true
  };
  const stairMidZ = (rule.STAIR_Z_TOP + rule.STAIR_Z_BOT) * 0.5;
  const stairHL = (rule.STAIR_Z_TOP - rule.STAIR_Z_BOT) * 0.5;
  const stairC = toWorld(0, stairMidZ);
  trapper.cellarStairRamp = {
    x: stairC.x, z: stairC.z, hw: rule.STAIR_HALF_W, hl: stairHL, yaw,
    deckY: cy0 + rule.CELLAR_FLOOR_Y, rise: (dY - rule.CELLAR_FLOOR_Y), landmark: true
  };
  const roofC = toWorld(0, -3.50);
  trapper.cellarRoofDeck = {
    x: roofC.x, z: roofC.z,
    hw: capPatchDecks.length ? 0.62 : 2.10,
    hl: capPatchDecks.length ? 0.62 : 1.51,
    yaw,
    deckY: cy0 + (capPatchDecks.length ? surfLocalY(0, -3.50) : rule.CELLAR_ROOF_Y),
    under: cy0 + rule.CELLAR_CEIL_UNDER_Y,
    landmark: true
  };
  const frontApronC = toWorld(0, -0.20);
  trapper.cellarFrontApronDeck = {
    x: frontApronC.x, z: frontApronC.z, hw: 0.72, hl: 0.12, yaw,
    deckY: cy0 + surfLocalY(0, -0.20), under: cy0 + rule.CELLAR_FLOOR_Y - 0.25, landmark: true
  };
  const leftApronC = toWorld(-0.84, -1.23);
  trapper.cellarLeftApronDeck = {
    x: leftApronC.x, z: leftApronC.z, hw: 0.16, hl: 0.90, yaw,
    deckY: cy0 + surfLocalY(-0.84, -1.23), under: cy0 + rule.CELLAR_FLOOR_Y - 0.25, landmark: true
  };
  const rightApronC = toWorld(0.84, -1.23);
  trapper.cellarRightApronDeck = {
    x: rightApronC.x, z: rightApronC.z, hw: 0.16, hl: 0.90, yaw,
    deckY: cy0 + surfLocalY(0.84, -1.23), under: cy0 + rule.CELLAR_FLOOR_Y - 0.25, landmark: true
  };
  const shutDoorC = toWorld(0, -1.23);
  trapper.shutDoorDeck = {
    x: shutDoorC.x, z: shutDoorC.z, hw: 0.78, hl: 0.92, yaw,
    deckY: cy0 + doorPivotY - 0.04, under: cy0 + rule.CELLAR_FLOOR_Y - 0.25, landmark: true
  };
  if (Array.isArray(platforms)) {
    platforms.push(
      trapper.cellarFloorDeck,
      trapper.cellarStairRamp,
      trapper.cellarRoofDeck,
      trapper.cellarFrontApronDeck,
      trapper.cellarLeftApronDeck,
      trapper.cellarRightApronDeck,
      ...capPatchDecks
    );
  }

  // Register stairwell and underground cellar colliders:
  // 1) Stairwell side cheek walls (surface + stairwell depth):
  for (const sgn of [-1, 1]) {
    for (const lz of [-0.65, -1.04, -1.44, -1.84]) {
      const w = toWorld(sgn * 0.92, lz);
      trapper.colliders.push(addSolid(w.x, w.z, 0.22, cy0 + rule.CELLAR_FLOOR_Y - 0.15, cy0 + 1.35));
    }
  }
  // 2) Stairwell rear headwall lintel (surface ONLY: y0 = cy0 + 0.10 so the player at y = cy0 - 2.15 walks right under it,
  //    while zombies on the roof at y = cy0 + 0.06 are blocked from dropping into the stairwell):
  for (const lx of [-0.36, 0, 0.36]) {
    const w = toWorld(lx, -2.14);
    trapper.colliders.push(addSolid(w.x, w.z, 0.24, cy0 + 0.10, cy0 + 1.35));
  }
  // 3) Underground cellar room walls (underground ONLY: y1 = cy0 - 0.05 so zombies on the roof at y = cy0 + 0.06
  //    have footY > y1 - 0.3 and walk straight across the cellar roof unhindered):
  const wallY0 = cy0 + rule.CELLAR_FLOOR_Y - 0.15;
  const wallY1 = cy0 - 0.05;
  for (const sgn of [-1, 1]) {
    const fw = toWorld(sgn * 1.25, -2.02);
    trapper.colliders.push(addSolid(fw.x, fw.z, 0.28, wallY0, wallY1));
    for (const lz of [-2.60, -3.25, -3.90, -4.55]) {
      const sw = toWorld(sgn * 1.88, lz);
      trapper.colliders.push(addSolid(sw.x, sw.z, 0.28, wallY0, wallY1));
    }
  }
  for (const lx of [-1.30, -0.65, 0, 0.65, 1.30]) {
    const bw = toWorld(lx, -5.32);
    trapper.colliders.push(addSolid(bw.x, bw.z, 0.28, wallY0, wallY1));
  }

  // 4) Shut-door collider (blocks entry into the stairwell until trapperPath.unlocked()):
  const doorColW = toWorld(0, -0.78);
  trapper.doorCollider = addSolid(doorColW.x, doorColW.z, 0.52, cy0 - 1.50, cy0 + 1.50);

  // Sync cellar doors & colliders with unlocked state:
  trapper.cutaway = false;
  trapper.setCutaway = (cut) => {
    const next = !!cut;
    if (trapper.cutaway === next) return;
    trapper.cutaway = next;
    if (trapper.cellarRoofCap) trapper.cellarRoofCap.visible = !next;
  };
  trapper.syncCellar = (unlocked) => {
    const open = !!unlocked;
    trapper._doorsOpen = open;
    if (trapper.doorL) {
      trapper.doorL.rotation.z = open ? 1.92 : 0;
      trapper.doorL.updateMatrixWorld(true);
    }
    if (trapper.doorR) {
      trapper.doorR.rotation.z = open ? -1.92 : 0;
      trapper.doorR.updateMatrixWorld(true);
    }
    if (trapper.doorBar) {
      trapper.doorBar.visible = !open;
    }
    if (Array.isArray(worldSolids) && trapper.doorCollider) {
      const idx = worldSolids.indexOf(trapper.doorCollider);
      if (open && idx >= 0) worldSolids.splice(idx, 1);
      else if (!open && idx < 0) worldSolids.push(trapper.doorCollider);
    }
    if (Array.isArray(platforms) && trapper.shutDoorDeck) {
      const idx = platforms.indexOf(trapper.shutDoorDeck);
      if (open && idx >= 0) platforms.splice(idx, 1);
      else if (!open && idx < 0) platforms.push(trapper.shutDoorDeck);
    }
  };
  trapper.doorsOpen = () => !!trapper._doorsOpen;
  trapper.inCellar = (wx, wy, wz) => {
    const loc = toLocal(wx, wz);
    if (Math.abs(loc.x) > rule.ROOM_HALF_W + 0.15) return false;
    if (loc.z < rule.ROOM_Z_BACK - 0.15 || loc.z > -1.45) return false;
    return wy < cy0 - 0.35;
  };
  trapper.syncCellar(trapperPath?.unlocked?.() || false);

  // Eight forged iron horseshoes (one per row, moved to the safe post on each run reset):
  const hsMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.68 });
  const hsParts = [];
  const shoeArc = trapperPart(new THREE.TorusGeometry(0.068, 0.016, 5, 14, Math.PI * 1.38), 0x454a4f, 0, 0, 0);
  shoeArc.rotation.z = Math.PI * 0.81;   // U-shape horns pointing UP (luck held in)
  hsParts.push(shoeArc);
  for (const sgn of [-1, 1]) {
    hsParts.push(trapperPart(new THREE.BoxGeometry(0.026, 0.024, 0.022), 0x5c6268, sgn * 0.056, 0.044, 0));
    hsParts.push(trapperPart(new THREE.BoxGeometry(0.012, 0.012, 0.014), 0x9aa0a6, sgn * 0.058, 0.018, 0.012));
    hsParts.push(trapperPart(new THREE.BoxGeometry(0.012, 0.012, 0.014), 0x9aa0a6, sgn * 0.042, -0.036, 0.012));
  }
  const hsProto = mergeParts(hsParts, hsMat, { castShadow: true, receiveShadow: true });
  for (const p of hsParts) p.geometry.dispose();
  trapper.horseshoes = [];
  for (let r = 0; r < rule.ROWS; r++) {
    const hs = new THREE.Mesh(hsProto.geometry, hsMat);
    hs.name = 'trapper-horseshoe';
    hs.castShadow = true; hs.receiveShadow = true;
    group.add(hs);
    trapper.horseshoes.push(hs);
  }
  syncTrapperHorseshoes();

  const sprungGroup = new THREE.Group();
  sprungGroup.name = 'trapper-sprung-traps';
  group.add(sprungGroup);
  trapper.sprungGroup = sprungGroup;

  const entryW = toWorld(0, rule.ENTRY_Z);
  trapper.entrySpot = { x: entryW.x, y: sampleHeight(entryW.x, entryW.z), z: entryW.z };
  const cellarSpotW = toWorld(rule.CELLAR_SPOT_X, rule.CELLAR_SPOT_Z);
  trapper.cellarSpot = {
    x: cellarSpotW.x,
    y: cy0 + rule.CELLAR_FLOOR_Y,
    z: cellarSpotW.z,
    yaw: yaw + 0.35
  };
}
