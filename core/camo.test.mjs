import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMO_KEYS, CAMO_SOLID_KEYS, CAMO_DEFAULT, isCamoKey, paintCamo } from './camo.js';

test('24 patterns and 25 plain colours, M81 Woodland the default and left to the game', () => {
  assert.equal(CAMO_KEYS.length, 49);
  assert.equal(new Set(CAMO_KEYS).size, 49);
  assert.equal(CAMO_SOLID_KEYS.length, 25);
  assert.ok(CAMO_SOLID_KEYS.every((k) => isCamoKey(k)));
  assert.equal(CAMO_DEFAULT, 'm81');
  assert.ok(isCamoKey('marpat') && !isCamoKey('pink'));
  assert.equal(paintCamo('m81', new Uint8ClampedArray(64 * 64 * 4), 64), false);
  assert.equal(paintCamo('nope', new Uint8ClampedArray(64 * 64 * 4), 64), false);
});

test('every other pattern fills the tile, opaque, with at least two colours (Giraffe is two-tone)', () => {
  for (const k of CAMO_KEYS) {
    if (k === 'm81') continue;
    const out = new Uint8ClampedArray(128 * 128 * 4);
    assert.equal(paintCamo(k, out, 128), true, k);
    const cols = new Set();
    for (let i = 0; i < out.length; i += 4) { assert.equal(out[i + 3], 255, k + ' alpha'); cols.add(out[i] << 16 | out[i + 1] << 8 | out[i + 2]); }
    assert.ok(cols.size >= 2, k + ' has ' + cols.size + ' colours');
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

test('a plain colour is its chart colour, with only a faint grain', () => {
  const n = 64, out = new Uint8ClampedArray(n * n * 4);
  paintCamo('coyoteBrown', out, n);
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < out.length; i += 4) { r += out[i]; g += out[i + 1]; b += out[i + 2]; }
  const px = n * n;
  // #81613c
  assert.ok(Math.abs(r / px - 0x81) < 6 && Math.abs(g / px - 0x61) < 6 && Math.abs(b / px - 0x3c) < 6, 'mean ' + [r, g, b].map((v) => (v / px).toFixed(0)).join(','));
});

test('the new patterns look their part', () => {
  const n = 128, count = (k) => { const out = new Uint8ClampedArray(n * n * 4); paintCamo(k, out, n); const s = new Set(); for (let i = 0; i < out.length; i += 4) s.add(out[i] << 16 | out[i + 1] << 8 | out[i + 2]); return s; };
  assert.equal(count('giraffe').size, 2, 'Giraffe is two-tone');
  assert.ok(count('sumpftarn').size > 20, 'Sumpftarn has blurred edges');
  assert.ok(count('teloMimetico').size > 20, 'Telo Mimetico has soft edges');
  assert.ok(count('zaireLeopard').has(0x111310), 'the leopard has black rosettes');
  assert.equal(count('swissTaz').size, 4, 'Swiss TAZ: grey, sage, mauve and maroon');
  assert.ok(count('papDigital').has(0x2b2f4e) && count('papDigital').has(0xb2cdbd), 'PAP: navy and mint clusters');
});
