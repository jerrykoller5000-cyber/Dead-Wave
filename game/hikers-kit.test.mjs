import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHikersKit, HIKERS, hikersSeed, riverRun, drownedCount, segmentDistance, roundCutsRope, pickHikersTree } from './hikers-kit.js';

test('the tree: a bank tree within 50 m first, else the nearest within 120 m, else the camp tree (no river)', () => {
  const T = (id, d, bank) => ({ tree: { id }, d, bank });
  assert.deepEqual(pickHikersTree([T('camp', 8, false), T('far', 30, true), T('near', 20, true), T('out', 60, true)]), { tree: { id: 'near' }, river: true });
  assert.deepEqual(pickHikersTree([T('camp', 8, false), T('b90', 90, true), T('b70', 70, true), T('b130', 130, true)]), { tree: { id: 'b70' }, river: true });
  assert.deepEqual(pickHikersTree([T('b45', 45, true), T('b10far', 100, true)]), { tree: { id: 'b45' }, river: true });
  assert.deepEqual(pickHikersTree([T('camp', 8, false), T('camp2', 12, false), T('b130', 130, true)]), { tree: { id: 'camp' }, river: false });
  assert.equal(pickHikersTree([T('tooClose', 2, false), T('b200', 200, true)]), null);
});

const kinds = (events) => events.map((e) => e.kind);
const seedWith = (want) => { for (let r = 1; r < 500; r++) { const s = hikersSeed(r); if (riverRun(s) === want) return s; } throw new Error('none'); };
const fall = (kit, opts) => { const out = []; for (let i = 0; i < 200 && kit.read().phase === 'falling'; i++) out.push(...kit.step(0.02, opts)); return out; };

test('it hangs 5 m up until a round cuts the rope; a second cut does nothing', () => {
  const kit = createHikersKit({ seed: seedWith(false) });
  assert.equal(kit.read().phase, 'hanging'); assert.equal(kit.read().height, HIKERS.ropeH);
  assert.deepEqual(kinds(kit.step(5)), []); assert.equal(kit.read().phase, 'hanging');
  assert.deepEqual(kinds(kit.cut()), ['cut']); assert.deepEqual(kit.cut(), []);
});

test('a dry run: the bag drops to the bank and waits there', () => {
  const kit = createHikersKit({ seed: seedWith(false) });
  kit.cut();
  assert.deepEqual(kinds(fall(kit, { inWater: true })), ['land']);
  assert.equal(kit.read().phase, 'ground');
  kit.step(100); assert.equal(kit.read().phase, 'ground');   // it never snags on land
});

test('the fall takes about a second from 5 m', () => {
  const kit = createHikersKit({ seed: seedWith(false) }); kit.cut();
  let t = 0; while (kit.read().phase === 'falling' && t < 3) { kit.step(0.01); t += 0.01; }
  assert.ok(Math.abs(t - Math.sqrt(2 * HIKERS.ropeH / HIKERS.gravity)) < 0.05, 't ' + t);
});

test('a river run: it splashes, floats, and snags after 40 s', () => {
  const kit = createHikersKit({ seed: seedWith(true) });
  kit.cut();
  assert.deepEqual(kinds(fall(kit, { inWater: true })), ['splash']);
  assert.equal(kit.read().phase, 'floating');
  let ev = []; for (let i = 0; i < 39; i++) ev.push(...kit.step(1)); assert.deepEqual(kinds(ev), []);
  assert.ok(kit.read().untilSnag <= 1.0001);
  assert.deepEqual(kinds(kit.step(1)), ['snag']); assert.equal(kit.read().phase, 'snagged');
});

test('a river run whose bag misses the water lands on the bank', () => {
  const kit = createHikersKit({ seed: seedWith(true) }); kit.cut();
  assert.deepEqual(kinds(fall(kit, { inWater: false })), ['land']);
});

test('no river: it always lands on the bank', () => {
  const kit = createHikersKit({ seed: seedWith(true), river: false }); kit.cut();
  assert.deepEqual(kinds(fall(kit, { inWater: true })), ['land']);
});

test('the drowned rise once, 3 to 5 of them, when he comes near the snagged bag', () => {
  const kit = createHikersKit({ seed: seedWith(true) }); kit.cut(); fall(kit, { inWater: true }); kit.step(HIKERS.floatS);
  assert.deepEqual(kinds(kit.step(0.1, { poolDist: 30 })), []);
  const ev = kit.step(0.1, { poolDist: 10 });
  assert.deepEqual(kinds(ev), ['drowned-rise']); assert.ok(ev[0].n >= 3 && ev[0].n <= 5);
  assert.deepEqual(kinds(kit.step(0.1, { poolDist: 5 })), []);
});

test('E grabs it within 2 m, on the bank, floating or snagged; not while it hangs or falls', () => {
  for (const [want, inWater, snag] of [[false, false, false], [true, true, false], [true, true, true]]) {
    const kit = createHikersKit({ seed: seedWith(want) });
    assert.deepEqual(kit.grab(0.5), []);
    kit.cut(); assert.deepEqual(kit.grab(0.5), []);
    fall(kit, { inWater }); if (snag) kit.step(HIKERS.floatS);
    assert.deepEqual(kit.grab(2.3), []);
    assert.deepEqual(kinds(kit.grab(1.9)), ['caught']);
    assert.equal(kit.read().done, true); assert.deepEqual(kit.grab(1), []);
  }
});

test('about half the runs are river runs; the drowned count spans 3-5', () => {
  let n = 0; const counts = new Set();
  for (let r = 1; r <= 400; r++) { const s = hikersSeed(r); if (riverRun(s)) n++; counts.add(drownedCount(s)); }
  assert.ok(n > 160 && n < 240, 'river runs ' + n + '/400');
  assert.deepEqual([...counts].sort(), [3, 4, 5]);
  assert.equal(hikersSeed(7), hikersSeed(7));
});

test('reset puts it back on its branch', () => {
  const kit = createHikersKit({ seed: 3 }); kit.cut(); fall(kit); kit.reset();
  assert.equal(kit.read().phase, 'hanging'); assert.equal(kit.read().done, false);
});

test('a round crossing the rope cuts it; one passing 20 cm off does not', () => {
  const rope = [[{ x: 0, y: 4, z: 0 }, { x: 0, y: 6, z: 0 }]];
  assert.equal(roundCutsRope({ x: -3, y: 5, z: 0.05 }, { x: 3, y: 5, z: 0.05 }, rope), true);
  assert.equal(roundCutsRope({ x: -3, y: 5, z: 0.2 }, { x: 3, y: 5, z: 0.2 }, rope), false);
  assert.equal(roundCutsRope({ x: -3, y: 7, z: 0 }, { x: 3, y: 7, z: 0 }, rope), false);   // over the branch
  assert.ok(Math.abs(segmentDistance({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 1, z: -1 }, { x: 0.5, y: 1, z: 1 }) - 1) < 1e-9);
});
