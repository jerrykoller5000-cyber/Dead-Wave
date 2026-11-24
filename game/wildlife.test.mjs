import test from 'node:test';
import assert from 'node:assert/strict';
import { lowSun, nextBloom, walkToward, waterRefuge, fishFeedingDepth, clearAnimalPath, bankDetour } from './wildlife.js';

test('the daily feeding window covers both transitions around the game clock', () => {
  for (const t of [0.21, 0.27, 0.71, 0.79]) assert.ok(lowSun(t));
  for (const t of [0, 0.5, 0.99]) assert.equal(lowSun(t), false);
  assert.ok(fishFeedingDepth('Trout', 0.25, false, 0.5) > fishFeedingDepth('Trout', 0.5, false, 0.5));
  assert.ok(fishFeedingDepth('Carp', 0.25, false, 1) < fishFeedingDepth('Trout', 0.25, false, 0));
});

test('a startled frog finds actual water on either bank, including when already in water', () => {
  const depth = x => x >= 2 && x <= 4 ? 0.4 : 0;
  for (const x of [0, 3, 6]) {
    const site = waterRefuge(x, 1, depth, 0.17);
    assert.ok(depth(site.x, site.z) >= 0.17);
  }
  assert.equal(waterRefuge(12, 1, depth, 0.17), null);
});

test('a pollinator visits the nearest alternative, revisits an isolated flower, and handles a cleared patch', () => {
  const pads = [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 50, z: 6 }];
  assert.equal(nextBloom(pads, 0, 0, 0, () => 0.5), 1);
  assert.equal(nextBloom(pads.slice(0, 1), 0, 0, 0), 0);
  assert.equal(nextBloom([], -1, 0, 0), -1);
});

test('arrival covers the same distance at different frame rates without overshooting', () => {
  const site = { x: 3, z: 4 };
  for (const hz of [20, 60, 120]) {
    const pos = { x: 0, y: 2, z: 0 };
    for (let frame = 0; frame < hz * 4; frame++) walkToward(pos, site, 1, 1 / hz);
    assert.ok(Math.abs(Math.hypot(pos.x, pos.z) - 4) < 1e-9);
    assert.ok(walkToward(pos, site, 1, 2));
    assert.deepEqual(pos, { x: 3, y: 2, z: 4 });
    assert.ok(walkToward(pos, site, 1, 1));
  }
});

test('a newly fenced bank reroutes around a wall and waits if completely enclosed', () => {
  const from = { x: 0, z: 0 }, to = { x: 3, z: 0 };
  const free = (x, z) => !(x > 0.8 && x < 1.4 && Math.abs(z) < 0.85);
  assert.equal(clearAnimalPath(from, to, free), false);
  const via = bankDetour(from, to, free);
  assert.ok(via && clearAnimalPath(from, via, free) && clearAnimalPath(via, to, free));
  assert.equal(bankDetour(from, to, () => false), null);
});
