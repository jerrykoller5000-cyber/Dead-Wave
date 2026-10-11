import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAKNESS, COUNTER } from './weaknesses.js';

const kinds = ['brute','shambler','feral','leaper','spider','drowned','military','spitter','screamer','bomber','demon','colossus','guardian'];
const types = ['bullet','pellet','fire','blast','blade','crush'];

test('all thirteen fightable kinds share the six approved damage columns and counters', () => {
  assert.deepEqual(Object.keys(WEAKNESS), kinds);
  assert.deepEqual(Object.keys(COUNTER), kinds);
  for (const kind of kinds) {
    assert.deepEqual(Object.keys(WEAKNESS[kind]).filter(type => type !== 'burn'), types);
    assert.equal(COUNTER[kind].length, 2);
    assert(COUNTER[kind].every(type => types.includes(type)));
    assert(COUNTER[kind][0] !== COUNTER[kind][1]);
    assert(Object.entries(WEAKNESS[kind]).every(([type,share]) => share >= (kind === 'drowned' && (type === 'fire' || type === 'burn') ? 0.1 : 0.2) && share <= 1.6));
    assert(Object.isFrozen(WEAKNESS[kind]) && Object.isFrozen(COUNTER[kind]));
  }
  assert(Object.isFrozen(WEAKNESS) && Object.isFrozen(COUNTER));
  assert.equal(WEAKNESS.caveguard, undefined);
});

test('the distinct approved weaknesses and resistances retain their combat shares', () => {
  assert.deepEqual(WEAKNESS.brute, {bullet:.45,pellet:.45,fire:.9,blast:.9,blade:.45,crush:.9,burn:1});
  assert.deepEqual(COUNTER.brute, ['blast','bullet']);
  assert.equal(WEAKNESS.spider.fire, 1.6);
  assert.equal(WEAKNESS.spider.pellet, 1.1);
  assert.equal(WEAKNESS.demon.fire, .2);
  assert.equal(WEAKNESS.drowned.fire, .1); // Jerry GP-19860: most flame resistant; burn inherits Fire
  assert.equal(WEAKNESS.screamer.pellet, .6);
  assert.equal(WEAKNESS.colossus.blast, 1.3);
  assert.equal(WEAKNESS.guardian.fire, 1.4);
  assert.equal(WEAKNESS.shambler.blade, 1.5);
  assert.equal(WEAKNESS.feral.blast, .6);
  assert.equal(WEAKNESS.military.bullet, .8); // Jerry GP-19864: unarmored bullet baseline
  assert.equal(WEAKNESS.military.pellet, .8); // shotgun rounds use the same localized armor
  assert.equal(WEAKNESS.military.blast, .6); // the vest is also a flak jacket
  assert.deepEqual(COUNTER.military, ['blade', 'blast']);
});
