// world/lightning.test.mjs — CL-92: the storm's strikes and their odds.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LIGHTNING, stormTimes, rollStrike, strikeTarget, boltPoints, buildBoltGeometry, buildInsulatedBoots, mulberry } from './lightning.js';

test('five strikes a storm, spread through it, never at its edges', () => {
  for (const dur of [22, 45, 70]) {
    const t = stormTimes(dur, mulberry(dur));
    assert.equal(t.length, 5);
    for (let i = 0; i < t.length; i++) {
      assert.ok(t[i] >= LIGHTNING.EDGE_S && t[i] <= dur - LIGHTNING.EDGE_S, dur + ': ' + t[i]);
      if (i) assert.ok(t[i] > t[i - 1]);
    }
  }
});

test('over 10,000 strikes each outcome comes within 20% of its odds', () => {
  // Fixed seeds, so the test never flakes: 10,000 strikes of a 1-in-200 roll is only 50 hits, and chance alone moves
  // that by 20% now and then. The long run below is the real check of the odds.
  for (const seed of [1, 4, 8]) {
    const r = mulberry(seed), n = { tree: 0, dead: 0, marine: 0 };
    for (let i = 0; i < 10000; i++) { const s = rollStrike(r); for (const k in n) if (s[k]) n[k]++; }
    for (const k in n) {
      const want = 10000 * LIGHTNING.ODDS[k];
      assert.ok(Math.abs(n[k] - want) <= want * 0.2, `seed ${seed} ${k}: ${n[k]} of 10000, want ${want}`);
    }
  }
});

test('over a million strikes the odds are what they say, within 3%', () => {
  const r = mulberry(99), n = { tree: 0, dead: 0, marine: 0 }, N = 1e6;
  for (let i = 0; i < N; i++) { const s = rollStrike(r); for (const k in n) if (s[k]) n[k]++; }
  for (const k in n) assert.ok(Math.abs(n[k] / N - LIGHTNING.ODDS[k]) <= LIGHTNING.ODDS[k] * 0.03, k + ': ' + n[k]);
});

test('odds forced to 1: every outcome; where it lands goes marine, then the dead, then a tree', () => {
  const s = rollStrike(Math.random, { tree: 1, dead: 1, marine: 1 });
  assert.deepEqual(s, { tree: true, dead: true, marine: true });
  assert.equal(strikeTarget(s), 'marine');
  assert.equal(strikeTarget({ tree: true, dead: true, marine: false }), 'dead');
  assert.equal(strikeTarget({ tree: true, dead: false, marine: false }), 'tree');
  assert.equal(strikeTarget({ tree: false, dead: false, marine: false }), 'open');
  assert.equal(LIGHTNING.DAMAGE, 70);
});

test('the bolt runs from the cloud to the very spot, and builds as one geometry', () => {
  const paths = boltPoints({ x: 0, y: 80, z: 0 }, { x: 10, y: 2, z: -4 }, mulberry(3));
  const main = paths[0], end = main[main.length - 1];
  assert.deepEqual([end.x, end.y, end.z], [10, 2, -4]);
  assert.ok(paths.length >= 2 && paths.length <= 3);
  const g = buildBoltGeometry(THREE, paths);
  const segs = paths.reduce((a, p) => a + p.length - 1, 0);
  assert.equal(g.index.count, segs * 2 * 6);
  const boots = buildInsulatedBoots(THREE);
  assert.equal(boots.name, 'insulated-boots');
  assert.equal(boots.children.length, 2);
});
