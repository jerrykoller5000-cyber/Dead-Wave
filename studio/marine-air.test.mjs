// studio/marine-air.test.mjs — CL-189: the air pose by the way he jumped.
import test from 'node:test';
import assert from 'node:assert/strict';
import { airPose, key3 } from './marine-air.js';

test('straight up: both knees come up over the top and reach down to land', () => {
  const top = airPose(0, 0, 0), land = airPose(-1, 0, 0), go = airPose(1, 0, 0);
  assert.ok(top.kneeL > 0.8 && top.kneeR > 0.8 && top.thighL < -0.35, 'tucked at the top');
  assert.ok(land.kneeL < 0.4 && go.kneeL < 0.3, 'extended leaving and landing');
  assert.ok(Math.abs(top.kneeL - top.kneeR) > 0.02, 'not quite in step');
  assert.ok(Math.abs(top.legZL) < 1e-9 && Math.abs(top.side) < 1e-9, 'no side swing');
});

test('a running leap is a stride in the air', () => {
  const p = airPose(0, 11.8, 0, -1);   // the left leg led
  assert.ok(p.thighL < -0.6 && p.thighR > 0.3, 'the lead knee forward, the trail leg behind: ' + p.thighL + ' ' + p.thighR);
  assert.ok(p.kneeR > 1.0, 'the trailing heel up');
  assert.ok(p.lean > 0.1, 'leaning into it');
  assert.ok(p.swR > p.swL + 0.6, 'the arm opposite the lead forward');
  const q = airPose(0, 11.8, 0, 1);
  assert.ok(q.thighR < -0.6 && q.thighL > 0.3, 'mirrored when the right led');
  const land = airPose(-1, 11.8, 0, -1);
  assert.ok(land.kneeL < 0.35 && land.thighL < -0.3, 'the lead reaches out to land on');
});

test('backward: hips back, knees up in front, feet back under to land', () => {
  const p = airPose(0, -7.4, 0, -1), land = airPose(-1, -7.4, 0, -1);
  assert.ok(p.lean < -0.08, 'leaning back: ' + p.lean);
  assert.ok(p.thighL < -0.4 && p.thighR < -0.3 && p.kneeL > 0.8, 'both knees up in front');
  assert.ok(land.thighL > 0 && land.thighR > 0, 'the feet reach back under him');
  assert.ok(p.swL > 0.5 && p.swR > 0.5, 'arms forward');
});

test('sideways: the leg on that side reaches out, the other tucks, he leans into it', () => {
  const r = airPose(0, 0, 7.4), l = airPose(0, 0, -7.4);
  assert.ok(r.legZR > 0.25 && r.kneeL > r.kneeR, 'toward +x: the right leg out, the left tucked');
  assert.ok(l.legZL < -0.25 && l.kneeR > l.kneeL, 'toward -x: mirrored');
  assert.ok(r.side > 0.03 && l.side < -0.03, 'leaning into it');
  assert.ok(r.outR > r.outL, 'the lead arm opens');
});

test('mixes smoothly: a diagonal is between, the keys are continuous', () => {
  const d = airPose(0, 5, 5, -1), f = airPose(0, 7.4, 0, -1), s = airPose(0, 0, 7.4, -1);
  assert.ok(d.legZR > 0 && d.legZR < s.legZR && d.thighR > s.thighR - 1 && d.thighL < 0, 'a diagonal leans on both');
  for (const k of [[0, 1, 0.5], [0.2, -0.4, 0.1]]) assert.ok(Math.abs(key3(k, 0.5 - 1e-9) - key3(k, 0.5 + 1e-9)) < 1e-6);
  let prev = airPose(1, 6, 2, 1);
  for (let u = 0.98; u >= -1; u -= 0.02) { const p = airPose(u, 6, 2, 1); for (const k of ['thighL', 'kneeL', 'thighR', 'kneeR', 'lean', 'swL']) assert.ok(Math.abs(p[k] - prev[k]) < 0.08, k + ' jumps at u ' + u); prev = p; }
});
