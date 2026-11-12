import { viewCrossesPlane } from '../../world/training-cutaway.js';

function reference(camera, focus, axis, at, bounds, margin = .6) {
  const delta = focus[axis] - camera[axis];
  let t = Math.abs(delta) > 1e-9 ? (at - camera[axis]) / delta : -1;
  if (t < 0 || t > 1) {
    if (Math.abs(camera[axis] - at) > margin) return false;
    t = 0;
  }
  for (const [key, lo, hi] of bounds) {
    const p = camera[key] + (focus[key] - camera[key]) * t;
    if (p < lo - margin || p > hi + margin) return false;
  }
  return true;
}

let seed = 0x20122;
const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
for (let i = 0; i < 10000; i++) {
  const camera = { x: rnd() * 100 - 50, y: rnd() * 30, z: rnd() * 100 - 50 };
  const focus = { x: rnd() * 100 - 50, y: rnd() * 30, z: rnd() * 100 - 50 };
  const axis = i % 2 ? 'x' : 'z', at = rnd() * 100 - 50, margin = rnd() * 2;
  const bounds = axis === 'x' ? [['z', -12, 30], ['y', 0, 24]] : [['x', -44, -8], ['y', 0, 24]];
  const got = viewCrossesPlane(camera, focus, axis, at, bounds, margin);
  const want = reference(camera, focus, axis, at, bounds, margin);
  if (got !== want) throw Error(`cutaway crossing differs on case ${i}`);
}
console.log('PASS 10000 cutaway plane cases match prior result');
