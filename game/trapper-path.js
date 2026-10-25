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
export function buildTrapperYardParts(THREE, { groundAtLocal, toWorld, cy0 = 0, trapperPart, trapperBar, rule = TRAPPER }) {
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
  const x0 = -rule.BED_HALF_W - 0.08, x1 = rule.BED_HALF_W + 0.08;
  const z0 = rule.BED_Z_MIN - 0.22, z1 = rule.BED_Z_MAX + 0.14;
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
        const jx = mx + (hd - 0.5) * 0.22;
        const jz = mz + (hash01(ix * 19 + d, iz * 37 + d) - 0.5) * 0.22;
        const ly = groundAtLocal(jx, jz) + 0.026 + (hd * 0.014);
        const rx = 0.11 + hd * 0.09;
        const rz = 0.09 + h2 * 0.08;
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
        const tx = mx + (h1 - 0.5) * 0.16, tz = mz + (h2 - 0.5) * 0.16;
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
    hiddenTrapSpots.push([-0.92, lz + 0.14, r * 1.1 + 0.3]);
    hiddenTrapSpots.push([0.0, lz - 0.38, r * 0.85 - 0.4]);
    hiddenTrapSpots.push([0.92, lz - 0.12, r * 1.3 + 0.9]);
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
  // Threshold flagstones at the cellar apron (z = 1.42) and yard gate entrance (z = 9.02):
  for (const [az, aw, ad] of [
    [1.42, 0.36, 0.28],
    [9.02, 0.40, 0.30],
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
      parts.push(trapperPart(postPlaque.clone(), 0xc8b68e, lx - sgn * 0.015, gy + 0.88, lz + 0.068, 0, -sgn * 0.24, 0));
      const w = toWorld(lx, lz);
      posts.push({ row: r, side, lx, lz, x: w.x, y: cy0 + gy, z: w.z });
    }
  }

  // Heavy gate posts at the yard entrance (lz = rule.BED_Z_MAX + 0.08 = 9.03) and cellar bulkhead posts (lz = 0.42):
  const gateZ = rule.BED_Z_MAX + 0.08;
  const gatePostGeo = new THREE.BoxGeometry(0.22, 2.25, 0.22);
  const gateCapGeo = new THREE.BoxGeometry(0.26, 0.06, 0.26);
  for (const side of [0, 1]) {
    const sgn = sideSign(side);
    const lx = sgn * rule.POST_X;
    // Cellar end anchor post (lz = 0.42):
    const gy0 = groundAtLocal(lx, 0.42);
    parts.push(trapperPart(postBox.clone(), woodPalette[side], lx, gy0 + 0.62, 0.42));
    parts.push(trapperPart(postCap.clone(), barkPalette[0], lx, gy0 + 1.27, 0.42));

    // Tall entrance gate post (lz = gateZ):
    const gyG = groundAtLocal(lx, gateZ);
    parts.push(trapperPart(gatePostGeo.clone(), woodPalette[side], lx, gyG + 1.12, gateZ));
    parts.push(trapperPart(gateCapGeo.clone(), barkPalette[0], lx, gyG + 2.26, gateZ));
    parts.push(trapperPart(new THREE.BoxGeometry(0.235, 0.036, 0.235), ironDark, lx, gyG + 1.95, gateZ));

    // Three split-log fence rails + diagonal bracing connecting all posts from z = 0.42 to gateZ:
    const zList = [0.42];
    for (let r = rule.ROWS - 1; r >= 0; r--) zList.push(rowZ(r, rule));
    zList.push(gateZ);
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

    // Flared wing fence at the yard gate (z = gateZ -> gateZ + 0.45, x = ±1.34 -> ±1.92):
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

  // 5. Trapper's drying frame, stacked firewood, and thorny deadfall hedge flanking the outside of the fence:
  const brambleSpots = [];
  for (const sgn of [-1, 1]) {
    for (let lz = -1.45; lz <= gateZ - 0.15; lz += 0.58) {
      brambleSpots.push([sgn * (rule.POST_X + 0.34), lz]);
    }
    // Stacked split logs along the outer base of the fence rails:
    for (let k = 0; k < 5; k++) {
      const lzA = 1.2 + k * 1.55, lzB = lzA + 1.25;
      const lxLog = sgn * (rule.POST_X + 0.18);
      const ya = groundAtLocal(lxLog, lzA), yb = groundAtLocal(lxLog, lzB);
      trapperBar(parts, [lxLog, ya + 0.09, lzA], [lxLog, yb + 0.09, lzB], 0.085, barkPalette[k % barkPalette.length], 6);
      trapperBar(parts, [lxLog + sgn * 0.06, ya + 0.21, lzA + 0.08], [lxLog + sgn * 0.06, yb + 0.21, lzB - 0.08], 0.072, woodPalette[k % woodPalette.length], 6);
    }
  }
  for (const lx of [-1.25, -0.75, -0.25, 0.25, 0.75, 1.25]) {
    brambleSpots.push([lx, -1.92]);
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

  // Solid colliders closing both sides and behind the root cellar (keeping prop.approach at (0, 1.44) completely clear):
  for (const sgn of [-1, 1]) {
    for (let lz = -1.50; lz <= gateZ; lz += 0.72) {
      colliderSpots.push({ lx: sgn * (rule.POST_X + 0.24), lz, r: 0.44 });
    }
  }
  for (const lx of [-0.88, 0, 0.88]) {
    colliderSpots.push({ lx, lz: -1.85, r: 0.44 });
  }

  // 6. Stacked fieldstone root-cellar bulkhead cheeks & heavy timber framing around objective:trapper-cache (0, 0)
  //    and the iron-strapped cellar hatch seated immediately behind it (0, -0.82):
  for (const sgn of [-1, 1]) {
    for (let c = 0; c < 4; c++) {
      const zS = -1.28 + c * 0.42;
      const gyS = groundAtLocal(sgn * 0.90, zS);
      parts.push(trapperPart(new THREE.BoxGeometry(0.28, 0.24 - c * 0.03, 0.42), stonePalette[(c + (sgn > 0 ? 1 : 0)) % stonePalette.length],
        sgn * 0.90, gyS + 0.11 - c * 0.015, zS, 0, sgn * 0.04, 0));
    }
    const gyD = groundAtLocal(sgn * 0.56, 0.02);
    parts.push(trapperPart(new THREE.BoxGeometry(0.26, 0.04, 0.56), stonePalette[2], sgn * 0.56, gyD + 0.02, 0.02, 0, 0, 0));
  }
  const gyBack = groundAtLocal(0, -1.54);
  parts.push(trapperPart(new THREE.BoxGeometry(2.04, 0.30, 0.30), stonePalette[1], 0, gyBack + 0.15, -1.54));
  parts.push(trapperPart(new THREE.BoxGeometry(1.90, 0.12, 0.24), woodPalette[1], 0, gyBack + 0.34, -1.54));

  return { parts, stones, posts, colliderSpots };
}

/**
 * AG-124 (N28, D-88; docs/world-design.md rules 1, 2, 8, 9, 12):
 * Relocate and build the trapper's 8-row fenced yard in the flat wooded clearing behind his cabin and workbench
 * (17-25.4 m away from bridges[1]), seating objective:trapper-cache and P['cellar-hatch'] together at the head of the yard.
 */
export function setupTrapperMission(THREE, {
  prop, camp, trapper, sampleHeight, addSolid, mergeParts, scene,
  historyProps, foliage, windSwayables, clearFoliageInSquare, trees, rocks, worldSolids,
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
  const groundAtLocal = (lx, lz) => { const w = toWorld(lx, lz); return sampleHeight(w.x, w.z) - cy0; };
  trapper.toWorld = toWorld;
  trapper.toLocal = toLocal;
  trapper.groundAtLocal = groundAtLocal;

  // Seat objective:trapper-cache at the head of the yard (0, 0) with approach at (0, HATCH_APPROACH_Z):
  const appW = toWorld(0, rule.HATCH_APPROACH_Z);
  const appY = sampleHeight(appW.x, appW.z);
  prop.centre.x = cx; prop.centre.y = cy0; prop.centre.z = cz;
  prop.approach.x = appW.x; prop.approach.y = appY; prop.approach.z = appW.z;
  prop.facing = Math.atan2(cx - appW.x, cz - appW.z);
  if (prop.group) {
    prop.group.position.set(cx, cy0, cz);
    prop.group.rotation.y = yaw;
    prop.group.updateMatrixWorld(true);
  }

  // Seat historyProps' cellar hatch right behind the cache inside the bulkhead (7.73 m < 12 m from camp),
  // undoing its old riverbank slope warp and re-seating its vertices to the flat yard ground:
  const ch = historyProps?.parts?.['cellar-hatch'];
  if (ch) {
    const oldX = ch.position.x, oldZ = ch.position.z, oldYaw = ch.rotation.y;
    const oldC = Math.cos(oldYaw), oldS = Math.sin(oldYaw), oldBase = sampleHeight(oldX, oldZ);
    const oldDy = (x, z) => sampleHeight(oldX + oldC * x + oldS * z, oldZ - oldS * x + oldC * z) - oldBase;
    const hw = toWorld(0, -0.82), newBase = sampleHeight(hw.x, hw.z);
    const newDy = (x, z) => sampleHeight(hw.x + cosY * x + sinY * z, hw.z - sinY * x + cosY * z) - newBase;
    if (ch.userData.terrainSeated && ch.children) {
      for (const child of ch.children) {
        if (child.name === 'cellar-ring') {
          child.position.y += newDy(child.position.x, child.position.z) - oldDy(child.position.x, child.position.z);
        } else if (child.isMesh && child.geometry?.attributes?.position) {
          const a = child.geometry.attributes.position;
          for (let i = 0; i < a.count; i++) {
            const x = a.getX(i), z = a.getZ(i);
            a.setY(i, a.getY(i) - oldDy(x, z) + newDy(x, z));
          }
          a.needsUpdate = true;
          child.geometry.computeVertexNormals();
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
        }
      }
    }
    ch.position.set(hw.x, newBase, hw.z);
    ch.rotation.y = yaw;
    ch.updateMatrixWorld(true);
  }
  if (historyProps?.group?.children) {
    const gatePostW = toWorld(-(rule.POST_X + 0.56), rule.BED_Z_MAX + 0.34);
    const gatePostY = sampleHeight(gatePostW.x, gatePostW.z);
    const gateTrapsW = toWorld(rule.POST_X + 0.48, rule.BED_Z_MAX + 0.24);
    let hsIdx = 0;
    for (const child of historyProps.group.children) {
      if (child.name === 'trapper-post') {
        child.position.set(gatePostW.x, gatePostY + 0.8, gatePostW.z);
        child.rotation.y = yaw;
      } else if (child.name === 'horseshoe') {
        child.position.set(gatePostW.x + sinY * 0.08, gatePostY + 0.75 + (hsIdx % 3) * 0.28, gatePostW.z + cosY * 0.08);
        child.rotation.y = yaw;
        hsIdx++;
      } else if (child.name === 'leghold-traps') {
        child.position.set(gateTrapsW.x, sampleHeight(gateTrapsW.x, gateTrapsW.z), gateTrapsW.z);
        child.rotation.y = yaw;
      }
    }
  }

  // Clear scattered trees, rocks, and foliage tufts inside the fenced yard and around the approach:
  const inYard = (wx, wz, pad = 0) => {
    const loc = toLocal(wx, wz);
    return Math.abs(loc.x) < rule.POST_X + 0.92 + pad && loc.z > -1.75 - pad && loc.z < rule.ENTRY_Z + 0.85 + pad;
  };
  if (typeof clearFoliageInSquare === 'function') {
    for (let lz = -1.2; lz <= rule.ENTRY_Z + 0.6; lz += 1.8) {
      const fw = toWorld(0, lz);
      clearFoliageInSquare(fw.x, fw.z, 2.3);
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
  if (Array.isArray(worldSolids)) {
    for (let i = worldSolids.length - 1; i >= 0; i--) {
      const s = worldSolids[i];
      const loc = toLocal(s.x, s.z);
      if (Math.abs(loc.x) < rule.POST_X + 0.25 && loc.z > -0.8 && loc.z < rule.ENTRY_Z + 0.6) {
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

  const built = buildTrapperYardParts(THREE, {
    groundAtLocal, toWorld, cy0, trapperPart, trapperBar, rule
  });
  trapper.stones = built.stones;
  trapper.posts = built.posts;
  trapper.colliders = [];
  for (const col of built.colliderSpots) {
    const w = toWorld(col.lx, col.lz), wy = sampleHeight(w.x, w.z);
    trapper.colliders.push(addSolid(w.x, w.z, col.r, wy - 0.1, wy + 1.65));
  }

  const staticMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.06 });
  const staticMesh = mergeParts(built.parts, staticMat, { castShadow: true, receiveShadow: true });
  for (const p of built.parts) p.geometry.dispose();
  staticMesh.name = 'trapper-path-static';
  staticMesh.matrixAutoUpdate = false;
  staticMesh.updateMatrix();
  group.add(staticMesh);
  trapper.staticMesh = staticMesh;

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
}
