import test from 'node:test';
import assert from 'node:assert/strict';
import { makeShortcutBand, setShortcutCut, stepShortcutCut, shortcutBlocks,
  shortcutInReach, nearestShortcut, shortcutLogPieces, SHORTCUT_CUT_SECONDS } from './shortcut-bands.js';

test('a ten metre deadfall blocks its centre, then opens a three metre kerf', () => {
  const band = makeShortcutBand({ id: 'woods', a: { x: -5, z: 0 }, b: { x: 5, z: 0 } });
  assert.equal(shortcutBlocks(band, 0, 0), true);
  assert.equal(shortcutBlocks(band, 4, 0), true);
  const before = band.solids;
  const delta = setShortcutCut(band, true);
  assert.equal(delta.removed, before);
  assert.equal(delta.added, band.solids);
  assert.equal(shortcutBlocks(band, 0, 0), false);
  assert.equal(shortcutBlocks(band, 1.4, 0), false);
  assert.equal(shortcutBlocks(band, 2, 0), true);
  assert.equal(shortcutBlocks(band, 4, 0), true);
  assert.equal(setShortcutCut(band, true), null);
  setShortcutCut(band, false);
  assert.equal(shortcutBlocks(band, 0, 0), true);
});

test('a cut stays on its own band and the nearest uncut band is targeted', () => {
  const a = makeShortcutBand({ id: 'a', a: { x: 0, z: 0 }, b: { x: 10, z: 0 } });
  const b = makeShortcutBand({ id: 'b', a: { x: 0, z: 20 }, b: { x: 10, z: 20 } });
  assert.equal(shortcutInReach(a, 5, 2), true);
  assert.equal(nearestShortcut([a, b], 5, 2), a);
  setShortcutCut(a, true);
  assert.equal(nearestShortcut([a, b], 5, 2), null);
  assert.equal(nearestShortcut([a, b], 5, 18), b);
});

test('four seconds of running saw completes the cut; a missed bite pauses it', () => {
  const band = makeShortcutBand({ id: 'b', a: { x: -5, z: 0 }, b: { x: 5, z: 0 } });
  const active = { held: true, inReach: true, bite: true };
  let r = stepShortcutCut(band, 1.5, active);
  assert.equal(r.progress, 1.5);
  r = stepShortcutCut(band, 1, { ...active, bite: false });
  assert.equal(r.progress, 1.5);
  r = stepShortcutCut(band, 2.5, active);
  assert.equal(r.progress, SHORTCUT_CUT_SECONDS);
  assert.equal(r.completed, true);
  r = stepShortcutCut(band, 0.1, { ...active, held: false });
  assert.equal(r.progress, 0);
});

test('three stacked trunks keep their end pieces when the centre is sawn out', () => {
  const band = makeShortcutBand({ id: 'north', a: { x: -5, z: 0 }, b: { x: 5, z: 0 },
    heightAt: (x) => x * 0.1 });
  const before = shortcutLogPieces(band);
  assert.equal(before.length, 9);
  assert.equal(before.filter((p) => p.visible).length, 9);
  assert.equal(before.filter((p) => p.section === 'kerf').length, 3);
  setShortcutCut(band, true);
  const after = shortcutLogPieces(band);
  assert.equal(after.filter((p) => p.visible).length, 6);
  assert.equal(after.filter((p) => !p.visible).length, 3);
  assert.ok(after.every((p) => p.length > 0 && p.radius > 0));
});
