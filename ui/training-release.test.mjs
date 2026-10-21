import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrainingRelease } from './training-release.js';
import { createTrainingDeployment } from './training-deployment.js';

test('warning flashes and gate opens before the existing five-second deployment', () => {
  let spawned = 0, entering = 0;
  const release = createTrainingRelease();
  const deployment = createTrainingDeployment({ onDeploy() {
    assert.equal(release.read().amount, 1); spawned++; entering = 10;
  } });
  deployment.start('shambler', 10); release.begin();
  const light = new Set();
  for (let i = 0; i < 50; i++) {
    release.tick(.1, deployment.read(), entering); deployment.tick(.1);
    light.add(release.read().lit);
    if (i < 37) assert.equal(release.read().amount, 0);
  }
  assert.equal(spawned, 1); assert.equal(light.size, 2);
  release.tick(2, null, entering); assert.equal(release.read().amount, 1);
  release.tick(.6, null, 0); assert.equal(release.read().amount, .5);
  release.tick(.6, null, 0); assert.equal(release.read().active, false);
});
test('clear, blackout and leave can reset a partially open gate without delayed activity', () => {
  const r = createTrainingRelease(); r.begin(); r.tick(.6, { remaining: 1 });
  assert(r.read().amount > 0); r.reset(); r.tick(10, null);
  assert.deepEqual(r.read(), { active: false, amount: 0, flashing: false, lit: false });
});
test('invalid and paused time cannot animate the release', () => {
  const r = createTrainingRelease(); r.begin(); const before = r.read();
  for (const dt of [0, -1, NaN, Infinity]) r.tick(dt, { remaining: 5 });
  assert.deepEqual(r.read(), before);
});
test('a second call while the gate is closing reopens without snapping it shut', () => {
  const r = createTrainingRelease(); r.begin(); r.tick(5, { remaining: 5 });
  r.tick(.3, null); const amount = r.read().amount;
  r.begin(); r.tick(.1, { remaining: 5 }); assert.equal(r.read().amount, amount);
  r.tick(5, { remaining: 4.9 }); assert.equal(r.read().amount, 1);
});
