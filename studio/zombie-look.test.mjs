// CC-366 (Jerry D-237 #7): the per-zombie look record. node --test studio/zombie-look.test.mjs
// The body side (colours, cut-outs, draws, vertex count) is checked in the game: tools/tests/tcc366.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeZombieLook, applyZombieLook, newLookSeed, lookRandom } from './zombie-look.js';

test('the same seed always gives the same look; different seeds differ', () => {
  for (const seed of [1, 2, 0xdeadbeef, 123456789]) assert.deepEqual(makeZombieLook('shambler', seed), makeZombieLook('shambler', seed));
  const a = JSON.stringify(makeZombieLook('shambler', 11)), b = JSON.stringify(makeZombieLook('shambler', 12));
  assert.notEqual(a, b);
});

test('newLookSeed is a 32-bit unsigned number; lookRandom stays in [0, 1)', () => {
  for (let i = 0; i < 200; i++) { const s = newLookSeed(); assert(Number.isInteger(s) && s >= 0 && s < 2 ** 32); }
  const r = lookRandom(42); for (let i = 0; i < 1000; i++) { const v = r(); assert(v >= 0 && v < 1); }
});

test('the spread (Director 00:28Z push): hair, skin tone and build vary enough to read at 8 m', () => {
  const N = 4000, n = { bald: 0, thin: 0, full: 0, thinB: 0, heavy: 0, avg: 0, shirtless: 0, dark: 0, pale: 0 };
  const hairCols = new Set();
  for (let i = 0; i < N; i++) {
    const L = makeZombieLook('shambler', (i * 2654435761) >>> 0);
    n[L.hairStyle]++;
    if (L.hairCol) hairCols.add(L.hairCol.join(','));
    if (L.buildType === 'thin') n.thinB++; else if (L.buildType === 'heavy') n.heavy++; else n.avg++;
    if (L.shirt == null) n.shirtless++;
    const lum = 0.2126 * L.skin[0] + 0.7152 * L.skin[1] + 0.0722 * L.skin[2];
    if (lum < 0.6) n.dark++; if (lum > 1.15) n.pale++;
    // ranges
    assert(L.build >= 0.85 && L.build <= 1.17, 'build in range: ' + L.build);
    assert(L.belly >= -1 && L.belly <= 1, 'belly in range');
    assert(L.teethGone >= 0 && L.teethGone <= 0.7);
    assert(L.wounds.length <= 2);
    assert(L.skin.every((v) => v > 0.2 && v < 1.5), 'skin multiplier in range');
  }
  const pct = (k) => n[k] / N;
  assert(pct('bald') > 0.25 && pct('bald') < 0.4, 'bald ~32%: ' + pct('bald'));
  assert(pct('full') > 0.4 && pct('full') < 0.56, 'full hair ~48%: ' + pct('full'));
  assert(hairCols.size >= 8, 'at least 8 hair colours: ' + hairCols.size);
  assert(pct('thinB') > 0.15 && pct('thinB') < 0.25, 'thin ~20%');
  assert(pct('heavy') > 0.15 && pct('heavy') < 0.25, 'heavy ~20%');
  assert(pct('shirtless') > 0.08 && pct('shirtless') < 0.16, 'shirtless ~12%');
  assert(pct('dark') > 0.2, 'dark skin tones: ' + pct('dark'));
  assert(pct('pale') > 0.08, 'pale skin tones: ' + pct('pale'));
});

test('only the shambler is changed today; other kinds and a missing look return null', () => {
  const g = { userData: {}, traverse() {} };
  for (const k of ['feral', 'military', 'brute', 'bomber', 'spider']) assert.equal(applyZombieLook({}, g, k, makeZombieLook(k, 5)), null);
  assert.equal(applyZombieLook({}, g, 'shambler', null), null);
});

// s50 (ChatGPT GP-20226: native tcc366 1920 mismatched): a cut-out must stay ONE point with ONE skinning after the belly
// reshaping and after the joins write their bind copy back (refreshZombieJoinLoss on every pool reset / dismemberment).
function fakeBody(tris = 600) {
  const n = tris * 3, P = new Float32Array(n * 3), U = new Float32Array(n * 2), C = new Float32Array(n * 3).fill(0.6), N = new Float32Array(n * 3);
  const SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4);
  let seed = 7; const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);
  for (let t = 0; t < tris; t++) {
    const tank = t % 3 !== 0, cx = rnd() - 0.5, cy = 0.2 + rnd() * 1.4, cz = rnd() * 0.3 - 0.15;
    for (let j = 0; j < 3; j++) {
      const i = t * 3 + j;
      P[i * 3] = cx + (rnd() - 0.5) * 0.05; P[i * 3 + 1] = cy + (rnd() - 0.5) * 0.05; P[i * 3 + 2] = cz + (rnd() - 0.5) * 0.05;
      U[i * 2] = tank ? 0.1 + rnd() * 0.3 : 0.6 + rnd() * 0.3; U[i * 2 + 1] = 0.1 + rnd() * 0.3;
      N[i * 3 + 2] = 1;
      const w = rnd();   // corners of one triangle blend torso/hips differently (a join band)
      SI.set([1, 0, 2, 0], i * 4); SW.set([w, 1 - w, 0, 0], i * 4);
    }
  }
  const at = (array, itemSize) => ({ array, itemSize, count: array.length / itemSize });
  const A = { position: at(P, 3), uv: at(U, 2), color: at(C, 3), normal: at(N, 3), skinIndex: at(SI, 4), skinWeight: at(SW, 4) };
  const hips = { userData: {} }, torso = { userData: {} };
  const jb = { owners: new Uint16Array(n), indices: SI.slice(), weights: SW.slice(), changed: n };
  for (let i = 0; i < n; i++) jb.owners[i] = SI[i * 4];
  const skin = { isSkinnedMesh: true, userData: { zombieSkin: true, joinBlend: jb }, geometry: { attributes: A }, skeleton: { bones: [hips, torso, { userData: {} }] } };
  const g = { userData: { hips, torso, variant: { width: 1, height: 1 } }, traverse(f) { f(g); f(skin); } };
  return { g, skin, A, jb, n };
}
const fakeT = { Color: class { constructor(h) { const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; this.r = f((h >> 16) & 255); this.g = f((h >> 8) & 255); this.b = f(h & 255); } } };
const fakeAtlas = { rects: { tank: { u0: 0, u1: 0.5, v0: 0, v1: 0.5 }, skin: { u0: 0.5, u1: 1, v0: 0, v1: 0.5 } }, options: {} };
function checkCuts(A, jb, n, label) {
  const P = A.position.array, SI = A.skinIndex.array, SW = A.skinWeight.array;
  let cut = 0, bad = 0, badJ = 0;
  for (let t = 0; t < n / 3; t++) {
    const a = t * 3; let same = true;
    for (let j = 1; j < 3 && same; j++) for (let q = 0; q < 3; q++) if (P[(a + j) * 3 + q] !== P[a * 3 + q]) { same = false; break; }
    if (!same) continue;
    cut++;
    for (let j = 1; j < 3; j++) {
      for (let q = 0; q < 4; q++) { if (SI[(a + j) * 4 + q] !== SI[a * 4 + q] || SW[(a + j) * 4 + q] !== SW[a * 4 + q]) bad++;
        if (jb.indices[(a + j) * 4 + q] !== jb.indices[a * 4 + q] || jb.weights[(a + j) * 4 + q] !== jb.weights[a * 4 + q]) badJ++; }
      if (jb.owners[a + j] !== jb.owners[a]) badJ++;
    }
  }
  return { cut, bad, badJ };
}
test('s50: shirtless + belly: every cut-out stays a point with one skinning, in the joins copy too (pool reset)', () => {
  for (const belly of [0.9, -0.8, 0]) {
    const { g, skin, A, jb, n } = fakeBody();
    const look = { ...makeZombieLook('shambler', 99), shirt: null, rips: 0, belly, wounds: [], teethGone: 0, noJaw: false, hairStyle: 'thin', hairCol: [0.1, 0.1, 0.1] };
    const rep = applyZombieLook(fakeT, g, 'shambler', look, { atlas: fakeAtlas });
    assert(rep && rep.collapsed === 400, 'the 400 tank triangles collapse once each: ' + (rep && rep.collapsed));
    const a = checkCuts(A, jb, n);
    assert.equal(a.cut, 400, 'belly ' + belly + ': all 400 still points after the reshaping');
    assert.equal(a.bad, 0); assert.equal(a.badJ, 0);
    // what refreshZombieJoinLoss does on a pool reset: the joins' copy back into the live skinning
    A.skinIndex.array.set(jb.indices); A.skinWeight.array.set(jb.weights);
    const b = checkCuts(A, jb, n);
    assert.equal(b.cut, 400); assert.equal(b.bad, 0, 'after the pool reset: ' + b.bad + ' mismatched');
    // and a lost bone (dismemberment): owners for every corner
    for (let i = 0; i < n; i++) if (A.skinIndex.array[i * 4] === 1 || A.skinIndex.array[i * 4 + 1] === 1) { A.skinIndex.array.set([jb.owners[i], 0, 0, 0], i * 4); A.skinWeight.array.set([1, 0, 0, 0], i * 4); }
    assert.equal(checkCuts(A, jb, n).bad, 0, 'after a dismemberment');
  }
});
test('s50: rips collapse some of the shirt, each once, all points', () => {
  const { g, A, jb, n } = fakeBody(3000);
  const look = { ...makeZombieLook('shambler', 1234), shirt: 0x8c887b, rips: 1, belly: 0.8, wounds: [], teethGone: 0, noJaw: false };
  const rep = applyZombieLook(fakeT, g, 'shambler', look, { atlas: fakeAtlas });
  const c = checkCuts(A, jb, n);
  assert(rep.collapsed > 0 && rep.collapsed < 2000, 'some rips: ' + rep.collapsed);
  assert.equal(c.cut, rep.collapsed); assert.equal(c.bad + c.badJ, 0);
});
test('s50: a wound paints (its band walk finds the vertices) and keeps the cut-outs whole', () => {
  const { g, A, jb, n } = fakeBody(3000);
  const look = { ...makeZombieLook('shambler', 77), shirt: null, rips: 0, belly: 0.5, teethGone: 0, noJaw: false, wounds: [{ at: 'chest', side: 1, size: 1.4, u: 0.3, v: 0.5 }] };
  const rep = applyZombieLook(fakeT, g, 'shambler', look, { atlas: fakeAtlas });
  const painted = +String(rep.wounds && rep.wounds[0]).split(' ').pop();
  assert(painted > 0, 'the chest wound painted: ' + rep.wounds);
  assert.equal(checkCuts(A, jb, n).bad, 0);
});
