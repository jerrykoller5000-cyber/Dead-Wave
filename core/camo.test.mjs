import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMO_KEYS, CAMO_DEFAULT, isCamoKey, paintCamo } from './camo.js';

test('fifteen patterns, M81 Woodland the default and left to the game', () => {
  assert.equal(CAMO_KEYS.length, 15);
  assert.equal(new Set(CAMO_KEYS).size, 15);
  assert.equal(CAMO_DEFAULT, 'm81');
  assert.ok(isCamoKey('marpat') && !isCamoKey('pink'));
  assert.equal(paintCamo('m81', new Uint8ClampedArray(64 * 64 * 4), 64), false);
  assert.equal(paintCamo('nope', new Uint8ClampedArray(64 * 64 * 4), 64), false);
});

test('every other pattern fills the tile, opaque, with at least three colours', () => {
  for (const k of CAMO_KEYS) {
    if (k === 'm81') continue;
    const out = new Uint8ClampedArray(128 * 128 * 4);
    assert.equal(paintCamo(k, out, 128), true, k);
    const cols = new Set();
    for (let i = 0; i < out.length; i += 4) { assert.equal(out[i + 3], 255, k + ' alpha'); cols.add(out[i] << 16 | out[i + 1] << 8 | out[i + 2]); }
    assert.ok(cols.size >= 3, k + ' has ' + cols.size + ' colours');
  }
});

test('the same key paints the same tile, and the patterns differ', () => {
  const a = new Uint8ClampedArray(64 * 64 * 4), b = new Uint8ClampedArray(64 * 64 * 4), c = new Uint8ClampedArray(64 * 64 * 4);
  paintCamo('marpat', a, 64); paintCamo('marpat', b, 64); paintCamo('dcu', c, 64);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('tiles wrap: the left and right columns are close in colour', () => {
  for (const k of ['marpat', 'ucp', 'dcu', 'cadpat']) {
    const n = 256, out = new Uint8ClampedArray(n * n * 4);
    paintCamo(k, out, n);
    let same = 0;
    for (let y = 0; y < n; y++) { const l = (y * n) * 4, r = (y * n + n - 1) * 4; if (out[l] === out[r] && out[l + 1] === out[r + 1]) same++; }
    assert.ok(same / n > 0.6, k + ' seam match ' + (same / n).toFixed(2));
  }
});
