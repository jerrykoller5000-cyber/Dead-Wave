// CL-134: the gun sound synth (core/gunsynth.js), in node: every bank builds, is deterministic, is real sound, and the
// guns differ from each other. The in-game half (the worker, the player, the wiring) is t220.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBank, GUN_DEFS, FOLEY_DEFS, SUPPRESSIBLE, defForKey, TAIL_SR, biquad } from './gunsynth.js';

const SR = 48000;
const keys = Object.keys(GUN_DEFS).concat(Object.keys(FOLEY_DEFS), SUPPRESSIBLE.map((k) => k + ':s'));
const rms = (x, a = 0, b = x.length) => { let e = 0; for (let i = a; i < b; i++) e += x[i] * x[i]; return Math.sqrt(e / Math.max(1, b - a)); };
const bank = Object.create(null);
for (const k of keys) bank[k] = buildBank(k, defForKey(k), SR);

test('every bank builds: finite, under full scale, ending in silence, with its tail at the tail rate', () => {
  for (const k of keys) {
    const b = bank[k];
    assert.ok(b.dry.length >= 3, k + ' has variants');
    for (const d of b.dry) {
      let p = 0; for (const v of d) { assert.ok(Number.isFinite(v), k + ' finite'); p = Math.max(p, Math.abs(v)); }
      assert.ok(p > 0.5 && p <= 1.0001, k + ' peak ' + p);
      assert.ok(Math.abs(d[d.length - 1]) < 1e-3, k + ' ends in silence');
    }
    for (const [l, r] of b.tail) { assert.equal(l.length, r.length); assert.ok(l.every(Number.isFinite) && r.every(Number.isFinite), k + ' tail finite'); }
    assert.equal(b.tailSr, TAIL_SR);
    assert.ok(b.level > 0 && b.level < 1, k + ' level ' + b.level);
  }
});

test('a bank is the same every time for the same key and rate, and its variants differ', () => {
  const again = buildBank('m4', GUN_DEFS.m4, SR);
  assert.deepEqual(Array.from(again.dry[1].subarray(0, 2000)), Array.from(bank.m4.dry[1].subarray(0, 2000)));
  const a = bank.m4.dry[0], c = bank.m4.dry[1];
  let xy = 0, xx = 0, yy = 0; for (let i = 0; i < a.length; i++) { xy += a[i] * c[i]; xx += a[i] * a[i]; yy += c[i] * c[i]; }
  assert.ok(xy / Math.sqrt(xx * yy) < 0.97, 'variants differ');
  const at44 = buildBank('m4', GUN_DEFS.m4, 44100);
  assert.equal(at44.dry[0].length, Math.ceil(GUN_DEFS.m4.dryLen * 44100));
});

test('the guns differ: each its own spectrum, louder guns louder, a can takes the crack away', () => {
  const bands = (x) => { const o = []; for (const f of [63, 125, 250, 500, 1000, 2000, 4000, 8000]) { const y = Float32Array.from(x.subarray(0, SR * 0.15)); biquad(y, 'bp', f, 1.4, SR); o.push(10 * Math.log10(rms(y) ** 2 + 1e-12)); } const m = Math.max(...o); return o.map((v) => v - m); };
  const guns = ['pistol', 'uzi', 'm4', 'ak', 'm240', 'minigun', 'shotgun', 'aa12', 'revolver', 'sniper', 'launcher'];
  for (let i = 0; i < guns.length; i++) for (let j = i + 1; j < guns.length; j++) {
    const a = bands(bank[guns[i]].dry[0]), b = bands(bank[guns[j]].dry[0]);
    const d = Math.sqrt(a.reduce((s, v, k) => s + (v - b[k]) ** 2, 0) / a.length);
    assert.ok(d > 1.5, guns[i] + ' and ' + guns[j] + ' differ by ' + d.toFixed(2) + ' dB a band');
  }
  const loud = (g) => 20 * Math.log10(bank[g].level * rms(bank[g].dry[0], 0, Math.min(bank[g].dry[0].length, SR * 0.3)));
  assert.ok(loud('pistol') < loud('m4') && loud('m4') < loud('shotgun') && loud('sniper') > loud('pistol') + 4);
  for (const g of SUPPRESSIBLE) assert.ok(loud(g + ':s') < loud(g) - 3, g + ' suppressed is quieter');
});

// CL-135 (Jerry: the reloads and the guns' high end "sound like bones clinking together or a xylophone"). Nothing
// in a bank may ring like a struck bar: in 2 to 14 kHz, frame by frame, the strongest repeat of the waveform at a
// pitch period (an autocorrelation peak) stays low, as it does for noise, where a ringing sine scores near 1.
const ringScore = (x) => {
  const y = Float32Array.from(x); biquad(y, 'hp', 2000, 0.7, SR); biquad(y, 'hp', 2000, 0.7, SR); biquad(y, 'lp', 14000, 0.7, SR);
  const N = 288, H = 96; let num = 0, den = 0, Em = 0; const fr = [];
  for (let i = 0; i + N + 30 < y.length; i += H) { let e = 0; for (let k = 0; k < N; k++) e += y[i + k] * y[i + k]; fr.push([i, e]); if (e > Em) Em = e; }
  for (const [i, e] of fr) {
    if (e < Em * 1e-3) continue;
    let best = 0;
    for (let L = 3; L < 25; L++) { let xy = 0, yy = 0; for (let k = 0; k < N; k++) { xy += y[i + k] * y[i + k + L]; yy += y[i + k + L] * y[i + k + L]; } best = Math.max(best, xy / Math.sqrt(e * yy + 1e-30)); }
    num += best * e; den += e;
  }
  return den ? num / den : 0;
};
test('nothing rings like a xylophone: the handling, the guns, the impacts, the switch', () => {
  const sine = new Float32Array(SR * 0.1); for (let i = 0; i < sine.length; i++) sine[i] = Math.sin(2 * Math.PI * 3000 * i / SR) * Math.exp(-i / SR / 0.016);
  assert.ok(ringScore(sine) > 0.9, 'the measure hears a ringing bar (' + ringScore(sine).toFixed(2) + ')');
  const skip = { hit: 1, hitHeavy: 1, knifeHit: 1, macheteChop: 1, ricochet: 1 };   // flesh (a formant, not metal) and a ricochet (a whine is right)
  for (const k of Object.keys(GUN_DEFS).concat(Object.keys(FOLEY_DEFS))) {
    if (skip[k]) continue;
    const b = bank[k] || buildBank(k, defForKey(k), SR);
    const s = b.dry.reduce((a, d) => a + ringScore(d), 0) / b.dry.length;
    assert.ok(s < 0.5, k + ' rings: ' + s.toFixed(2));
  }
});
