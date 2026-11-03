// GB-273 (docs/specs/sector-cull.md): the walls' cull. A prop behind a wall from a seat is hidden, the same prop through
// a gap is shown, a prop at the wall's near foot is never hidden, and two hidden reads hide while one seen read shows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWallBand } from './wall-bands.js';
import { createWallCull, wallSegmentsFromBand } from './wall-cull.js';

const flat = () => 0;
const pts = [{ x: 0, z: -40 }, { x: 0, z: 40 }];
const band = makeWallBand({ pts, width: 4, gaps: [{ id: 'g', kind: 'walk', at: 40, width: 10, clearWidth: 4 }], heightAt: flat });
const segs = wallSegmentsFromBand(band, flat);
const make = () => createWallCull(segs);

test('the band becomes straight segments of at most 6 m, none across the gap', () => {
  assert.ok(segs.length > 8);
  for (const s of segs) {
    assert.ok(Math.hypot(s.bx - s.ax, s.bz - s.az) <= 6 + 1e-9);
    assert.ok(!(Math.min(s.az, s.bz) < 0 && Math.max(s.az, s.bz) > 0), 'a segment spans the gap at z 0');
    assert.ok(s.top >= 1.75);
  }
});

test('behind the wall: hidden on the second read, not the first', () => {
  const W = make(), id = W.include(6, 0.7, 12, 0.5);
  W.update(-10, 1.7, 12); assert.equal(W.isHidden(id), false, 'one read never hides');
  W.update(-10, 1.7, 12); assert.equal(W.isHidden(id), true, 'two reads hide');
});

test('through the gap: shown', () => {
  const W = make(), id = W.include(6, 0.7, 0, 0.5);
  for (let i = 0; i < 4; i++) W.update(-10, 1.7, 0);
  assert.equal(W.isHidden(id), false);
});

test('at the wall foot on the near side: never hidden', () => {
  const W = make(), id = W.include(-2.6, 0.7, 12, 0.5);
  for (let i = 0; i < 4; i++) W.update(-10, 1.7, 12);
  assert.equal(W.isHidden(id), false);
});

test('a tall thing seen over the wall is shown', () => {
  const W = make(), id = W.include(8, 6, 12, 2);
  for (let i = 0; i < 4; i++) W.update(-10, 1.7, 12);
  assert.equal(W.isHidden(id), false);
});

test('one seen read shows it again (walking round the end)', () => {
  const W = make(), id = W.include(6, 0.7, 12, 0.5);
  W.update(-10, 1.7, 12); W.update(-10, 1.7, 12); assert.equal(W.isHidden(id), true);
  W.update(10, 1.7, 12); assert.equal(W.isHidden(id), false);
});

test('far cells round-robin within the budget, re-tested when the eye moves', () => {
  const W = make(), ids = [];
  for (let i = 0; i < 40; i++) ids.push(W.include(30 + (i % 8) * 8, 0.7, -30 + Math.floor(i / 8) * 8, 0.5));
  const s = W.update(-60, 1.7, 12, 10);
  assert.ok(s.tested <= 10 + 0, 'budget held: ' + s.tested);
  for (let k = 0; k < 20; k++) W.update(-60, 1.7, 12, 10);
  const settled = W.update(-60, 1.7, 12, 10).tested;
  assert.equal(settled, 0, 'a still eye re-tests nothing once every cell is settled');
  assert.ok(W.update(-59, 1.7, 12, 10).tested > 0, 'a moved eye re-tests');
});

test('an empty wall list hides nothing', () => {
  const W = createWallCull([]), id = W.include(6, 0.7, 12, 0.5);
  W.update(-10, 1.7, 12); W.update(-10, 1.7, 12);
  assert.equal(W.isHidden(id), false);
});
