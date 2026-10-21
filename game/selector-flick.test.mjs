import test from 'node:test';
import assert from 'node:assert/strict';
import { createSelectorFlick, SELECTOR_FLICK } from './selector-flick.js';

test('the flick runs only for dual-mode guns, moves the thumb and ends on time', () => {
  let t = 0; const f = createSelectorFlick(() => t);
  assert.equal(f.start('shotgun', false, 'semi'), false);
  assert.equal(f.phase('shotgun'), -1);
  assert.equal(f.start('m4', true, 'auto'), true);
  t = SELECTOR_FLICK.dur * 0.5;
  const pose = { t: [0.9, -0.2, 0.5] }; f.apply(pose, 'm4');
  assert.ok(pose.t[0] < 0.6 && pose.t[1] > 0, 'thumb reached out');
  t = SELECTOR_FLICK.dur + 0.01; assert.equal(f.phase('m4'), -1, 'done');
  assert.ok(SELECTOR_FLICK.dur >= 0.25 && SELECTOR_FLICK.dur <= 0.35);
});
test('switching guns cancels it', () => {
  let t = 0; const f = createSelectorFlick(() => t);
  f.start('ak', true, 'semi'); t = 0.05;
  assert.equal(f.phase('pistol'), -1); assert.equal(f.phase('ak'), -1);
});
