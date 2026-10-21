// world/lightning.test.mjs — CL-92: the storm's strikes and their odds.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LIGHTNING, stormTimes, rollStrike, strikeTarget, boltPoints, buildBoltGeometry, buildInsulatedBoots, mulberry, MAST_PERCH, mastStrikeFinds, buildWornBoots, buildMastPerchParts, buildRubberBoot } from './lightning.js';

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

// CL-178: the boots on the skeleton up the radio mast, and the mast's 1-in-3.
test('up the mast a strike finds him 1 time in 3', () => {
  assert.equal(LIGHTNING.MAST_ODDS, 1 / 3);
  const r = mulberry(7); let n = 0; const N = 30000;
  for (let i = 0; i < N; i++) if (mastStrikeFinds(r)) n++;
  assert.ok(Math.abs(n / N - 1 / 3) < 0.01, 'found ' + n + ' of ' + N);
  assert.equal(mastStrikeFinds(() => 0.2), true);
  assert.equal(mastStrikeFinds(() => 0.5), false);
});

test('the worn boots stand side by side, toes out, and the perch is plain meshes high on the ladder side', () => {
  const boots = buildWornBoots(THREE);
  assert.equal(boots.name, 'insulated-boots');
  assert.equal(boots.children.length, 2);
  assert.ok(Math.abs(boots.children[0].position.x - boots.children[1].position.x) > 0.2, 'apart');
  const parts = buildMastPerchParts(THREE);
  assert.ok(parts.length > 30 && parts.every((m) => m.isMesh && m.children.length === 0), 'flat meshes, ready to merge');
  const box = new THREE.Box3();
  for (const m of parts) { m.updateMatrixWorld(true); box.expandByObject(m); }
  assert.ok(box.min.y > MAST_PERCH.deckY - 1.2 && box.max.y < MAST_PERCH.deckY + 1.2, 'up by the platform: ' + box.min.y.toFixed(2) + '..' + box.max.y.toFixed(2));
  assert.ok(box.max.z < -0.5, 'on the ladder face (-z): ' + box.max.z.toFixed(2));
  // The boots on his feet are in reach from the top of the climb (within the pickup's 1.3 m and 1.6 m), not from below.
  const b = MAST_PERCH.boots, reach = Math.hypot(b.x, b.z + MAST_PERCH.ladderOut);
  assert.ok(reach < 1.3, 'reach from the ladder ' + reach.toFixed(2));
  assert.ok(MAST_PERCH.climbTop - b.y < 1.6 && b.y > 10, 'at the top, not the ground');
});

// CL-179: the remodelled boot is one vertex-coloured mesh: yellow rubber with black on it, its sole at the ground.
test('a rubber boot is one mesh, yellow and black, standing on its sole', () => {
  const boot = buildRubberBoot(THREE);
  assert.ok(boot.isMesh && boot.material.vertexColors, 'one mesh, vertex-coloured');
  const c = boot.geometry.attributes.color.array;
  let yellow = 0, black = 0;
  for (let i = 0; i < c.length; i += 3) { if (c[i] > 0.6 && c[i + 1] > 0.3 && c[i + 2] < 0.2) yellow++; else if (c[i] < 0.1 && c[i + 1] < 0.1) black++; }
  assert.ok(yellow > 0 && black > 0, 'yellow ' + yellow + ', black ' + black);
  boot.geometry.computeBoundingBox();
  const bb = boot.geometry.boundingBox;
  assert.ok(bb.min.y > -0.02 && bb.min.y < 0.01 && bb.max.y > 0.38 && bb.max.y < 0.45, 'height ' + bb.min.y.toFixed(3) + '..' + bb.max.y.toFixed(3));
  assert.ok(bb.max.z > 0.15, 'toe toward +z');
});
