import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultWardrobe, normalizeWardrobe, withItem, withBody, withGun, resetTab } from './wardrobe.js';

test('a first visit wears the saved camo, and the mask stays coyote', () => {
  const seeded = defaultWardrobe('dcu');
  assert.equal(seeded.items.shirt.camo, 'dcu');
  assert.equal(seeded.items.mask.camo, 'coyoteBrown');
  assert.equal(seeded.items.boots.colour, 'black');
  assert.equal(seeded.body.hair, 'darkBrown');
});

test('a bad save falls back per item and never throws the marine out', () => {
  const known = (key) => key !== 'nope';
  const bad = normalizeWardrobe({ version: 1, items: { shirt: { camo: 'nope' }, boots: { colour: 'pink' } }, guns: { m4: 'flecktarn', nope: 'm81' } }, 'm81', known);
  assert.equal(bad.items.shirt.camo, 'm81');
  assert.equal(bad.items.trousers.camo, 'm81');
  assert.equal(bad.items.boots.colour, 'black');
  assert.equal(bad.guns.m4, 'flecktarn');
  assert.equal(bad.guns.nope, undefined);
  assert.equal(normalizeWardrobe({ version: 2 }).items.shirt.camo, 'm81');
  assert.equal(normalizeWardrobe(null).items.mask.camo, 'coyoteBrown');
});

test('a pick, a boot colour, a reset and a gun stay on the profile', () => {
  let w = defaultWardrobe('m81');
  w = withItem(w, 'shirt', { camo: 'flecktarn' });
  w = withItem(w, 'boots', { colour: 'tan' });
  w = withBody(w, 'eyes', 'green');
  w = withGun(w, 'm4', 'multicam');
  assert.equal(w.items.shirt.camo, 'flecktarn');
  assert.equal(w.items.boots.colour, 'tan');
  assert.equal(w.body.eyes, 'green');
  assert.equal(w.guns.m4, 'multicam');
  assert.equal(withItem(w, 'shirt', { camo: '' }), null);
  assert.equal(withGun(w, 'saber', 'm81'), null);
  const reset = resetTab(w, 'body', 'm81');
  assert.equal(reset.items.shirt.camo, 'm81');
  assert.equal(reset.items.boots.colour, 'black');
  assert.equal(reset.items.cap.camo, 'm81');
  assert.equal(reset.guns.m4, 'multicam');
  assert.equal(resetTab(w, 'guns').guns.m4, undefined);
});
