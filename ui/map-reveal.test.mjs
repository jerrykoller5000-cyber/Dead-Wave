import test from 'node:test';
import assert from 'node:assert/strict';
import { createRevealGrid, cardKeyForLandmark, cardKeyForSite } from './map-reveal.js';

test('walking a line reveals the cells along it and not the far valley', () => {
  const g = createRevealGrid();
  for (let x = 0; x <= 80; x += 8) g.revealAround(x, 0);
  assert.equal(g.seen(40, 0), true);
  assert.equal(g.seen(40, 20), true);
  assert.equal(g.seen(200, 200), false);
  assert.equal(g.seen(-200, -200), false);
  const before = g.count();
  g.revealAround(40, 0);
  assert.equal(g.count(), before);
  g.reset();
  assert.equal(g.seen(40, 0), false);
  assert.equal(g.count(), 0);
});

test('a place card is once a run, from a landmark or a site', () => {
  const g = createRevealGrid();
  const rows = [
    { id: 'tower', x: 100, z: 0, key: 'map.tower', z: 0 },
    { id: 'camp:0', x: 0, z: 80, key: 'map.ranger', z: 80 },
  ];
  assert.deepEqual(cardKeyForLandmark(rows[0]), 'firetower');
  assert.equal(cardKeyForSite('fuel-depot'), 'fuel');
  assert.deepEqual(g.visit(rows, [], 100, 0), ['firetower']);
  assert.deepEqual(g.visit(rows, [], 100, 0), []);
  assert.deepEqual(g.visit(rows, [{ id: 'fuel-depot', centre: { x: 10, z: 0 } }], 10, 0), ['fuel']);
  assert.deepEqual(g.visit(rows, [{ id: 'fuel-depot', centre: { x: 10, z: 0 } }], 10, 0), []);
  g.reset();
  assert.deepEqual(g.found(), []);
  assert.deepEqual(g.visit(rows, [], 90, 0), ['firetower']);
});

test('a saved run restores the cells and the cards, and a new run does not', () => {
  const g = createRevealGrid();
  g.revealAround(0, 0);
  g.visit([{ x: 0, z: 0, key: 'map.dock' }], [], 0, 0);
  const packed = g.packed();
  const found = g.found();
  const next = createRevealGrid();
  next.unpack(packed);
  for (const id of found) next.visit([{ x: 0, z: 0, key: 'map.dock' }], [], 0, 0);
  assert.equal(next.seen(0, 0), true);
  assert.deepEqual(next.found(), ['dock']);
  next.reset();
  assert.equal(next.seen(0, 0), false);
});
