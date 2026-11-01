// GP-20005: a quiet, positional warning while the dead close through the woods.
// Call ready before the (more expensive) cover lookup, then emit only for real cover.
export function createNightWarnings() {
  const perZombie = new WeakMap();
  const recent = [];
  let now = 0, nextGroup = 0, count = 0;

  function advance(dt) { now += Math.max(0, dt); }
  function ready(z, distance, chasing, moving, unseen, enabled = true) {
    if (!enabled || !chasing || !moving || !unseen || !(distance >= 2.5 && distance <= 15)) return false;
    if (now < nextGroup) return false;
    return now >= (perZombie.get(z) || 0);
  }
  function emit(z, { kind, x, y = 0, z: wz, distance, volume, pan, night, type }) {
    if (kind !== 'branch' && kind !== 'brush' && kind !== 'leaves') return null;
    // Cadence differs per body without a random call in the zombie update loop.
    const spread = ((Math.abs(Math.floor(x * 17 + wz * 31)) % 5) * 0.18);
    perZombie.set(z, now + (night ? 1.25 : 4.5) + spread);
    nextGroup = now + (night ? 0.3 : 0.9);
    const event = { time: +now.toFixed(2), kind, type, x: +x.toFixed(2), y: +y.toFixed(2), z: +wz.toFixed(2),
      distance: +distance.toFixed(2), volume: +volume.toFixed(3), pan: +pan.toFixed(3), night: !!night };
    recent.push(event);
    if (recent.length > 32) recent.shift();
    count++;
    return event;
  }
  return { advance, ready, emit, events: () => recent.slice(), stats: () => ({ count, now: +now.toFixed(2) }) };
}
