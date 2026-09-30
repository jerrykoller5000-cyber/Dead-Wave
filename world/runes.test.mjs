import test from 'node:test';
import assert from 'node:assert/strict';
import { RUNE_COUNT, traceGlyph, pulseAt, PULSE } from './runes.js';

test('eight glyphs, each a different drawing', () => {
  const shapes = new Set();
  for (let k = 0; k < RUNE_COUNT; k++) {
    const calls = [];
    const ctx = new Proxy({}, { get: (_, name) => (...a) => calls.push(name + a.map((x) => Math.round(x * 10)).join(',')) });
    traceGlyph(ctx, k);
    assert.ok(calls.length > 2, 'glyph ' + k + ' draws something');
    shapes.add(calls.join('|'));
  }
  assert.equal(shapes.size, RUNE_COUNT);
});

test('the stones pulse the word in order, then rest', () => {
  const word = [3, 0, 6, 1, 5];
  const step = PULSE.ON + PULSE.GAP;
  const seen = [];
  for (let t = 0; t < word.length * step + PULSE.REST; t += 0.05) {
    const p = pulseAt(word, t);
    if (p.stone >= 0 && p.glow > 0.5 && seen[seen.length - 1] !== p.stone) seen.push(p.stone);
  }
  assert.deepEqual(seen, word);
  assert.equal(pulseAt(word, word.length * step + 1).stone, -1, 'dark in the rest');
  assert.equal(pulseAt(word, PULSE.ON + 0.1).stone, -1, 'dark in the gap');
  const cycle = word.length * step + PULSE.REST;
  assert.deepEqual(pulseAt(word, 0.4), pulseAt(word, 0.4 + cycle), 'and again');
  assert.equal(pulseAt(null, 1).stone, -1);
});
