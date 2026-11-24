import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRevealGrid,
  cardKeyForLandmark,
  cardKeyForSite,
  fillUnknown,
  REVEAL_RADIUS,
} from './map-reveal.js';

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
    { id: 'tower', x: 100, z: 0, key: 'map.tower' },
    { id: 'camp:0', x: 0, z: 80, key: 'map.ranger' },
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

test('reveal frontier has a smooth continuous radial feather, clear inside 25 m and hidden past 46 m', () => {
  const g = createRevealGrid();
  g.revealAround(0, 0, { instant: true });
  assert.equal(g.levelAt(0, 0), 1);
  assert.equal(g.levelAt(20, 0), 1);
  assert.equal(g.levelAt(0, -20), 1);
  for (let a = 0; a < 8; a++) {
    const rad = (a * Math.PI) / 4;
    assert.equal(g.seen(Math.cos(rad) * (REVEAL_RADIUS - 0.5), Math.sin(rad) * (REVEAL_RADIUS - 0.5)), true);
  }
  const midLevels = [
    g.levelAt(34, 0), g.levelAt(-34, 0), g.levelAt(0, 34), g.levelAt(0, -34),
  ];
  assert.ok(midLevels.some((v) => v > 0.1 && v < 0.9), 'expected feathered mid-edge values: ' + midLevels.join(','));
  assert.equal(g.levelAt(48, 0), 0);
  assert.equal(g.seen(48, 0), false);
});

test('walking sweeps a continuous capsule without gaps, while teleport jumps do not streak', () => {
  const g = createRevealGrid();
  g.revealAround(0, 0, { instant: true });
  g.revealAround(18, 0, { instant: true });
  assert.equal(g.levelAt(9, 0), 1);
  g.revealAround(160, 160, { instant: true });
  assert.equal(g.seen(160, 160), true);
  assert.equal(g.seen(85, 80), false);
  assert.equal(g.levelAt(85, 80), 0);
});

test('temporal dissolve smoothly fades newly walked ground in over time and settles cleanly', () => {
  const g = createRevealGrid();
  g.revealAround(0, 0);
  assert.equal(g.isAnimating(), false);
  assert.equal(g.levelAt(0, 0, true), 1);

  g.revealAround(16, 0);
  assert.equal(g.isAnimating(), true);
  const tgtLead = g.levelAt(50, 0, false);
  assert.ok(tgtLead > 0.3, 'leading edge target should be revealed immediately');
  assert.equal(g.levelAt(50, 0, true), 0);

  assert.equal(g.advance(0.08), true);
  const midVis = g.levelAt(50, 0, true);
  assert.ok(midVis > 0.05 && midVis < tgtLead, `expected partial fade, got ${midVis} vs ${tgtLead}`);

  for (let i = 0; i < 60; i++) g.advance(0.025);
  assert.equal(g.isAnimating(), false);
  assert.ok(Math.abs(g.levelAt(50, 0, true) - tgtLead) < 0.01);
});

test('unpack supports both smooth v2 path format and legacy 8 m cell index arrays', () => {
  const g = createRevealGrid();
  for (let x = 0; x <= 60; x += 2) g.revealAround(x, 10);
  const packed = g.packed();
  assert.equal(packed.v, 2);
  assert.ok(packed.s.length <= 60, 'stamp list stays compact during fine walking');
  const g2 = createRevealGrid();
  g2.unpack(packed);
  assert.equal(g2.seen(30, 10), true);
  assert.equal(g2.seen(60, 10), true);
  assert.equal(g2.seen(-180, -180), false);
  assert.equal(g2.isAnimating(), false);

  const legacy = createRevealGrid();
  const mid = Math.floor(legacy.n / 2);
  legacy.unpack([mid * legacy.n + mid]);
  assert.equal(legacy.seen(0, 0), true);
  assert.equal(legacy.seen(150, 150), false);
});

test('fillUnknown falls back safely in headless non-DOM contexts without throwing', () => {
  const g = createRevealGrid({ radius: 40, cell: 8 });
  g.revealAround(0, 0, { instant: true });
  let rects = 0;
  const mockCtx = {
    fillStyle: '',
    fillRect() { rects++; },
  };
  fillUnknown(mockCtx, g, (x, z) => ({ x: 40 - x, y: 40 - z }), 1);
  assert.ok(rects > 0);
});
