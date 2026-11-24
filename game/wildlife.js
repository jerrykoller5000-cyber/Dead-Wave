// Local habitat decisions. Distances are world metres, and clock is a fraction of the day.
export function lowSun(clock) {
  return Math.abs(clock - 0.25) < 0.09 || Math.abs(clock - 0.75) < 0.09;
}

// Start at the bank and search outwards. Checking the shallow end first gives
// the animal a shore it can actually reach, including on bends and islands.
export function waterRefuge(x, z, depthAt, minDepth, reach = 5) {
  for (let r = 0; r <= reach; r += 0.5) {
    const n = r === 0 ? 1 : 12;
    for (let i = 0; i < n; i++) {
      const a = i * Math.PI * 2 / n;
      const tx = x + r * Math.sin(a), tz = z + r * Math.cos(a);
      if (depthAt(tx, tz) >= minDepth) return { x: tx, z: tz };
    }
  }
  return null;
}

// Neighbouring flowers get visited in succession. Distance bias is randomized
// so two close blooms do not trap the whole patch in the same shuttle run.
export function nextBloom(pads, current, x, z, random = Math.random) {
  let best = -1, bestCost = Infinity;
  for (let i = 0; i < pads.length; i++) {
    if (i === current && pads.length > 1) continue;
    const dx = pads[i].x - x, dz = pads[i].z - z;
    const cost = (1 + dx * dx + dz * dz) * (0.25 + 1.5 * random());
    if (cost < bestCost) { bestCost = cost; best = i; }
  }
  return best;
}

// A walker arrives exactly at its refuge even on the last short step. The
// caller supplies the world's collision query and may retry an obstructed leg.
export function walkToward(pos, target, speed, dt) {
  const dx = target.x - pos.x, dz = target.z - pos.z;
  const d = Math.hypot(dx, dz);
  if (!d) return true;
  const t = Math.min(1, speed * dt / d);
  pos.x += dx * t;
  pos.z += dz * t;
  return t === 1;
}

export function clearAnimalPath(from, to, clearAt) {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.23));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!clearAt(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t)) return false;
  }
  return true;
}

// Only called when a new obstacle blocks a known route. Check both legs of a
// detour before committing to it. An enclosed bank has no route until it opens.
export function bankDetour(from, to, clearAt) {
  const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz);
  if (!d) return null;
  for (const reach of [0.65, 1.3, 2.6, 4.2]) {
    for (const side of [-1, 1]) {
      const x = from.x - side * dz / d * reach, z = from.z + side * dx / d * reach;
      const via = { x, z };
      if (clearAnimalPath(from, via, clearAt) && clearAnimalPath(via, to, clearAt)) return via;
    }
  }
  return null;
}

export function fishFeedingDepth(kind, clock, night, roll) {
  if (kind === 'Carp') return 0.17 + roll * 0.15;
  if (lowSun(clock)) return 0.55 + roll * 0.24;
  if (night) return 0.24 + roll * 0.14;
  return 0.35 + roll * 0.24;
}
