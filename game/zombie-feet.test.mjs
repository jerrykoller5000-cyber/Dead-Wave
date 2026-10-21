// game/zombie-feet.test.mjs — CL-187: the roll of a zombie's step.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ZFEET as F, stepRoll, legSolve } from './zombie-feet.js';

test('the heel lands toe-up, the sole is flat mid-stance, the heel comes off ahead of the toe', () => {
  assert.ok(stepRoll(0.03, null) < -0.1, 'toe up at the strike: ' + stepRoll(0.03, null));
  assert.ok(Math.abs(stepRoll(0.4, null)) < 0.02, 'flat mid-stance: ' + stepRoll(0.4, null));
  assert.ok(stepRoll(0.95, null) > 0.3, 'the heel up late in the stance: ' + stepRoll(0.95, null));
});

test('the swing carries the push-off into a hanging toe and lands heel first, with no jump at either end', () => {
  assert.ok(Math.abs(stepRoll(1, null) - stepRoll(null, 0)) < 1e-9, 'toe-off is continuous');
  assert.ok(Math.abs(stepRoll(null, 1) - stepRoll(0, null)) < 1e-9, 'the strike is continuous');
  assert.ok(stepRoll(null, 0.5) > 0.05 && stepRoll(null, 0.5) < 0.25, 'the toe hangs mid-swing: ' + stepRoll(null, 0.5));
  assert.ok(stepRoll(null, 0.97) < -0.1, 'toe up before the heel lands: ' + stepRoll(null, 0.97));
});

test('the leg solve puts the ankle where it was asked', () => {
  const A = 0.38, B = 0.36;
  for (const [ry, rz] of [[-0.7, 0.1], [-0.6, -0.25], [-0.73, 0]]) {
    const p = legSolve(ry, rz, A, B);
    const y = -(A * Math.cos(p.thigh) + B * Math.cos(p.thigh + p.knee)), z = -(A * Math.sin(p.thigh) + B * Math.sin(p.thigh + p.knee));
    assert.ok(Math.abs(y - ry) < 1e-6 && Math.abs(z - rz) < 1e-6, `${ry},${rz} -> ${y},${z}`);
    assert.ok(p.knee >= -1e-9, 'the knee bends the right way');
  }
});
