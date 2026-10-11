// CL-139: the eyewear sits on the head it is built for. node --test ui/marine-eyewear.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three/three.core.js';
import { buildMarineEyewear, HEAD_RINGS, ringAt, faceZ, hemAt } from './marine-eyewear.js';

const STYLES = ['aviators', 'wayfarer', 'pitViper', 'goggles'];
const build = () => {
  const mats = new Proxy({}, { get: (o, k) => (o[k] ||= new T.MeshStandardMaterial()) }), groups = {};
  buildMarineEyewear(T, { mats, group: (s) => (groups[s] = new T.Group()) });
  return groups;
};
const verts = (g) => { const out = [], v = new T.Vector3(); g.updateMatrixWorld(true);
  g.traverse((o) => { if (!o.isMesh) return; const P = o.geometry.attributes.position;
    for (let i = 0; i < P.count; i++) out.push([o.name, v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld).clone()]); });
  return out; };
const inSkull = (p) => {
  if (p.y <= 1.275 || p.y >= 1.548) return false;
  const [w, f, b] = ringAt(p.y), pts = [];
  for (let j = 0; j < 96; j++) { const a = -Math.PI + j / 96 * 2 * Math.PI, c = Math.cos(a); pts.push([w * Math.sin(a), c >= 0 ? f * c ** .55 : -b * (-c) ** .8]); }
  let inn = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > p.z) !== (zj > p.z) && p.x < (xj - xi) * (p.z - zi) / (zj - zi) + xi) inn = !inn; }
  return inn;
};

test('the skull the eyewear is fitted to is still the one marine-face.js builds', () => {
  const src = fs.readFileSync(new URL('./marine-face.js', import.meta.url), 'utf8');
  const m = src.match(/const HEAD_RINGS = (\[[\s\S]*?\n\]);/);
  assert.ok(m, 'HEAD_RINGS not found in marine-face.js');
  assert.deepEqual(Function('return ' + m[1])(), HEAD_RINGS, 'marine-face.js changed the head: refit the eyewear (ui/marine-eyewear.js)');
});

test('every style is built, and nothing is inside the head', () => {
  const groups = build();
  for (const s of STYLES) {
    assert.ok(groups[s] && groups[s].children.length > 0, s + ' built');
    const bad = verts(groups[s]).filter(([, p]) => inSkull(p));
    assert.equal(bad.length, 0, s + ': ' + bad.length + ' vertices inside the skull, first ' + (bad[0] && bad[0][0]));
  }
});

test('nothing goes into the mask: every front vertex below the hem is in front of the cloth', () => {
  const groups = build();
  for (const s of STYLES) for (const [name, p] of verts(groups[s])) {
    if (p.z <= .05 || Math.abs(p.x) > .125) continue;
    const h = hemAt(p.x);
    assert.ok(p.y > h.y || p.z > h.z, `${s} ${name} at ${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)} is under the mask`);
  }
});

test('the lenses sit in front of the eyes, close (10 to 30 mm), not floating', () => {
  const groups = build();
  for (const s of STYLES) {
    const gaps = verts(groups[s]).filter(([n, p]) => /lens|shield/.test(n) && Math.abs(Math.abs(p.x) - .06) < .006 && Math.abs(p.y - 1.419) < .006)
      .map(([, p]) => p.z - faceZ(p.x, p.y));
    assert.ok(gaps.length > 0, s + ' has lens in front of each eye');
    assert.ok(Math.min(...gaps) > .010 && Math.max(...gaps) < .030, `${s}: lens ${(Math.min(...gaps) * 1000).toFixed(1)}..${(Math.max(...gaps) * 1000).toFixed(1)} mm off the eye`);
  }
});
