// GP-167: the countdown and all living room occupants hold the interlock.
// No timers: resets/clears cannot leave a delayed door lock behind.
export function createTrainingSecurity({ x, minZ, maxZ, onChange = () => {} }) {
  let open = true, locked = false, amount = 1;
  const read = () => ({ open, locked, amount, blocked: !open || amount < 1 });
  const emit = () => onChange(read());
  return {
    read,
    reset() { open = true; locked = false; amount = 1; emit(); },
    sync(pending, alive) {
      const next = !!pending || alive > 0;
      if (next === locked) return;
      locked = next;
      // The security interlock seats the shutter immediately, before deployment.
      if (locked) { open = false; amount = 0; }
      emit();
    },
    toggle() { if (locked) return false; open = !open; emit(); return true; },
    tick(dt) {
      if (!(dt > 0) || !Number.isFinite(dt)) return;
      const next = Math.max(0, Math.min(1, amount + (open ? 1 : -1) * dt / .45));
      if (next !== amount) { amount = next; emit(); }
    },
    // Sweep the player's centre across the barrier: fast movement cannot tunnel
    // through it. A closing shutter pushes a threshold occupant to their own side.
    constrain(p, previous = p, radius = .42) {
      if (!read().blocked) return { x: p.x, z: p.z, moved: false };
      const pad = .18 + radius, side = previous.x < x ? -1 : 1;
      const edge = x + side * pad;
      const crosses = side < 0 ? p.x > edge && previous.x <= x : p.x < edge && previous.x >= x;
      const dx = p.x - previous.x;
      const t = Math.abs(dx) > 1e-9 ? Math.max(0, Math.min(1, (edge - previous.x) / dx)) : 1;
      const atZ = previous.z + (p.z - previous.z) * t;
      const inside = Math.abs(p.x - x) < pad && p.z > minZ - radius && p.z < maxZ + radius;
      if (inside || (crosses && atZ > minZ - radius && atZ < maxZ + radius))
        return { x: edge, z: p.z, moved: true };
      return { x: p.x, z: p.z, moved: false };
    }
  };
}
