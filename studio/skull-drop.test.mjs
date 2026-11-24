// CJ-2 (D-233): the real skull drops. Each kind builds once, under 1.5k triangles, no more draws than the old skull
// (bone, dark, eye + its own extra materials), real size, the bone with its age colours, normals that point out.
//   node --import ./studio/node-three.mjs --test studio/skull-drop.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { skullDropParts, skullDropSpecimen } from './skull-drop.js';

const LOOK = {   // index.html SKULL_LOOK's flags (the colours don't matter here)
  shambler: {}, feral: { fangs: true }, leaper: { long: true }, spider: { eyes: 4 }, drowned: { weed: true },
  military: { helmet: true }, brute: { size: 1.3, brow: true }, spitter: { drool: true }, screamer: { gape: true },
  bomber: { fuse: true }, demon: { horns: true, size: 1.15 }, colossus: { size: 1.8, brow: true, crack: true },
};
// the old skull's materials per kind (index.html makeSkullMesh before CJ-2): bone, dark, eye + these
const OLD_EXTRA = { drowned: ['weed'], military: ['olive'], spitter: ['acid'], bomber: ['glow'], demon: ['horn'], colossus: ['glow'] };

for (const [kind, L] of Object.entries(LOOK)) {
  test(kind + ': built once, < 1.5k triangles, draws not more than before', () => {
    const p = skullDropParts(THREE, kind, L);
    assert.equal(skullDropParts(THREE, kind, L), p, 'cached: the same geometry every time');
    assert.ok(p.tris < 1500, 'triangles ' + p.tris);
    const mats = ['bone', p.dark && 'dark', p.eye && 'eye', ...p.extras.map((e) => e.mat)].filter(Boolean);
    const old = ['bone', 'dark', 'eye', ...(OLD_EXTRA[kind] || [])];
    assert.ok(mats.length <= old.length, 'draws ' + mats.join(',') + ' vs before ' + old.join(','));
    for (const m of mats) assert.ok(old.includes(m), m + ' was one of the old materials');
    assert.ok(p.bone.attributes.color && p.bone.attributes.normal, 'bone has age colours and normals');
  });
}

test('real size: a human skull 14 cm wide, about 20 long, 21 high, chin on y = 0, centred', () => {
  const b = new THREE.Box3().setFromBufferAttribute(skullDropParts(THREE, 'shambler', LOOK.shambler).bone.attributes.position);
  const s = b.getSize(new THREE.Vector3());
  assert.ok(Math.abs(s.x - 0.14) < 0.01 && Math.abs(s.y - 0.21) < 0.012 && Math.abs(s.z - 0.205) < 0.015, JSON.stringify(s));
  assert.ok(Math.abs(b.min.y) < 0.006 && Math.abs(b.min.x + b.max.x) < 0.004 && Math.abs(b.min.z + b.max.z) < 0.01, JSON.stringify(b));
});

test('the bone is closed and faces out (positive volume)', () => {
  for (const kind of ['shambler', 'brute', 'leaper', 'spider']) {
    const g = skullDropParts(THREE, kind, LOOK[kind]).bone, P = g.attributes.position, I = g.index.array;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let vol = 0;
    for (let k = 0; k < I.length; k += 3) { a.fromBufferAttribute(P, I[k]); b.fromBufferAttribute(P, I[k + 1]); c.fromBufferAttribute(P, I[k + 2]); vol += a.dot(b.clone().cross(c)) / 6; }
    assert.ok(vol > 0, kind + ' volume ' + vol);
  }
});

test("builds on the test page's stand-in three too (tools/tests/fakethree.mjs: the game gates run on it)", async () => {
  const F = await import('../tools/tests/fakethree.mjs');
  for (const [kind, L] of Object.entries(LOOK)) { const q = skullDropParts(F, kind, L); assert.ok(q.tris > 500 && q !== skullDropParts(THREE, kind, L), kind); }
});

test('the tubes (horns, weed, fangs, drool) face out', () => {
  const p = skullDropParts(THREE, 'demon', LOOK.demon), g = p.extras.find((e) => e.mat === 'horn').geo;
  const P = g.attributes.position, N = g.attributes.normal, I = g.index.array;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  let out = 0, inn = 0;
  for (let k = 0; k < I.length; k += 3) {
    a.fromBufferAttribute(P, I[k]); b.fromBufferAttribute(P, I[k + 1]); c.fromBufferAttribute(P, I[k + 2]);
    const f = b.clone().sub(a).cross(c.clone().sub(a)); n.fromBufferAttribute(N, I[k]);
    if (f.dot(n) > 0) out++; else inn++;
  }
  assert.ok(out > inn * 20, 'faces out ' + out + ' / in ' + inn);
});

test('CJ-3: the display specimen is one geometry with the colours baked in, the same skull', () => {
  for (const [kind, tint] of [['shambler', 0xd4c4a8], ['demon', 0x8e1c12]]) {
    const L = { ...LOOK[kind], tint, eye: 0xffb020 }, g = skullDropSpecimen(THREE, kind, L), p = skullDropParts(THREE, kind, L);
    assert.equal(g.index.count / 3, p.tris, kind + ': every part in it');
    assert.ok(g.attributes.color && g.attributes.normal, kind);
    assert.equal(skullDropSpecimen(THREE, kind, L), g, 'cached');
  }
});
