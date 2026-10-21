// ui/training-hit-pops.test.mjs — CL-171: the hit numbers over the Training Ground targets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { HIT_POP, hitPopText, hitPopFrame, createHitPops } from './training-hit-pops.js';

function fakeDoc() {
  const mk = (tag) => ({ tag, children: [], style: {}, hidden: false, parentNode: null, className: '', textContent: '', id: '',
    append(...c) { for (const k of c) { k.parentNode = this; this.children.push(k); } } });
  const head = mk('head'), body = mk('body'), byId = {};
  return { head, body, createElement: mk, getElementById: (id) => byId[id] || (head.children.find((c) => c.id === id) || null) };
}

test('a pop says the points, the zone and the lane multiplier', () => {
  assert.deepEqual(hitPopText({ zone: 'bull', points: 10, mult: 2, total: 20 }), { main: '+20', sub: 'Bullseye ×2', tone: 'gold' });
  assert.deepEqual(hitPopText({ zone: 'plate', points: 2, mult: 1, total: 2 }), { main: '+2', sub: 'Plate', tone: 'grey' });
  assert.equal(hitPopText(null), null);
});

test('it pops in, holds, rises and fades to nothing', () => {
  assert.ok(hitPopFrame(0).scale < 1 && hitPopFrame(0.12).scale > 1.1, 'a quick pop');
  assert.equal(hitPopFrame(0.3).opacity, 1);
  assert.ok(hitPopFrame(0.8).opacity > 0 && hitPopFrame(0.8).opacity < 1);
  assert.equal(hitPopFrame(1).opacity, 0);
  assert.ok(hitPopFrame(0.5).lift > hitPopFrame(0.2).lift && hitPopFrame(1).lift === 1);
});

test('pops follow the projection, recycle their elements and go when their time is up', () => {
  const doc = fakeDoc(), pops = createHitPops({ doc });
  for (let i = 0; i < HIT_POP.max + 3; i++) pops.add({ x: i, y: 2, z: 0 }, hitPopText({ zone: 'ring', total: 5, mult: 1 }));
  assert.equal(pops.count(), HIT_POP.max, 'capped');
  let seen = 0;
  pops.update(0.1, (x, y) => { seen++; return { x: 100 + x, y: 200 - y, on: true }; });
  assert.equal(seen, HIT_POP.max);
  const el = doc.body.children[0];
  assert.match(el.style.transform, /translate\(/);
  pops.update(0.1, () => ({ on: false }));
  assert.equal(el.style.opacity, '0', 'off screen: hidden');
  pops.update(HIT_POP.life, () => ({ x: 0, y: 0, on: true }));
  assert.equal(pops.count(), 0);
  assert.ok(doc.body.children.every((c) => c.hidden), 'all put away');
  const before = doc.body.children.length;
  pops.add({ x: 0, y: 0, z: 0 }, hitPopText({ zone: 'head', total: 10, mult: 1 }));
  assert.equal(doc.body.children.length, before, 'an old element is reused');
});
