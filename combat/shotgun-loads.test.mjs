import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHOTGUN_LOADS, SHOTGUN_LOAD_IDS, LOAD_FIELDS, isShotgunLoad, shotgunLoadStats, shotgunLoadParams, shotgunHitBase } from './shotgun-loads.js';
import { listedBodyDamage, HIT_SHELL } from '../game/hit-balance.js';

// The pump shotgun's sheet in index.html (WEAPON_STATS.shotgun) when CB-248 was written.
const base = { name: 'Shotgun', maxAmmo: 8, reload: 1.6, interval: 0.7, damage: 9, speed: 60, range: 22, spin: false, auto: false, pellets: 7, spread: 0.14 };

test('two loads, buckshot and slug, and nothing else is a load', () => {
  assert.deepEqual([...SHOTGUN_LOAD_IDS].sort(), ['buck', 'slug']);
  assert.equal(isShotgunLoad('buck'), true);
  assert.equal(isShotgunLoad('slug'), true);
  for (const id of ['std', 'aa12', '', 'toString', '__proto__', undefined, null]) assert.equal(isShotgunLoad(id), false, String(id));
});

test('the issued shell is the base, whatever is asked that is not a load', () => {
  for (const id of ['std', undefined, null, 'flechette', 'constructor']) assert.deepEqual(shotgunLoadStats(base, id), base, String(id));
});

test('a load never changes the base, and leaves what is not its to change', () => {
  const frozen = Object.freeze({ ...base });
  for (const id of SHOTGUN_LOAD_IDS) {
    const s = shotgunLoadStats(frozen, id);
    assert.deepEqual(frozen, base);
    for (const k of Object.keys(base)) if (!LOAD_FIELDS.includes(k)) assert.equal(s[k], base[k], `${id}.${k}`);
  }
});

test('buckshot: more pellets, a wider pattern, a little further; the pump as it was', () => {
  const s = shotgunLoadStats(base, 'buck');
  assert.ok(s.pellets > base.pellets && s.pellets * s.damage > base.pellets * base.damage);
  assert.ok(s.spread > base.spread);
  assert.ok(s.range > base.range && s.range < 30);
  assert.equal(s.interval, base.interval);
  assert.equal(s.speed, base.speed);
});

test('slug: one round, hits hard, tight, reaches far, pumps slower', () => {
  const s = shotgunLoadStats(base, 'slug');
  assert.equal(s.pellets, 1);
  assert.ok(s.damage >= 60 && s.damage <= 100);
  assert.ok(s.spread > 0 && s.spread < base.spread / 3);
  assert.ok(s.range >= 40 && s.range <= 60);
  assert.ok(s.interval > base.interval);
});

test('neither is a free upgrade: a slug does not out-hit a full shell by more than a quarter, buckshot not by more than two thirds', () => {
  const full = base.pellets * base.damage;
  assert.ok(SHOTGUN_LOADS.slug.damage <= full * 1.25);
  assert.ok(SHOTGUN_LOADS.buck.pellets * SHOTGUN_LOADS.buck.damage <= full * 1.67);
});

test('the shot still travels the range: the sheet\'s range over its speed is under the projectile\'s 2.5 s cap', () => {
  for (const id of SHOTGUN_LOAD_IDS) {
    const s = shotgunLoadStats(base, id);
    assert.ok(s.range / s.speed < 2.5 && s.range / s.speed > 0.15, id);
  }
});

test('every load is priced, named and explained for the bench', () => {
  for (const id of SHOTGUN_LOAD_IDS) {
    const L = SHOTGUN_LOADS[id];
    assert.equal(L.id, id);
    assert.ok(Number.isInteger(L.price) && L.price > 0 && L.price < 200, id);
    assert.ok(L.name.includes('3.5"') && L.tag.includes('3.5"') && L.help.length > 10, id);
  }
});

test('the numbers the bench\'s text is given are the sheet\'s', () => {
  const p = shotgunLoadParams(base, 'buck');
  assert.deepEqual([p.pellets, p.damage, p.range, p.total, p.baseTotal], [10, 10, 26, 100, 63]);
  const q = shotgunLoadParams(base, 'slug');
  assert.deepEqual([q.pellets, q.damage, q.range, q.total], [1, 70, 44, 70]);
});

// What the game does with a shot: each projectile's damage is the sheet's share (listedBodyDamage for the shot's parts) times
// amount / hitBase. Summed over the shot, a load must come out at its shell total over the issued shell's, of the sheet's cell.
test('the hit sheet scores each load by its own shell: issued as listed, buckshot x1.59, the slug x1.11', () => {
  const whole = 270 / 100 * 24;   // a shambler's 24, the shotgun's 270%
  const shot = (id) => {
    const st = shotgunLoadStats(base, id), hb = shotgunHitBase(base, st, HIT_SHELL.shotgun);
    const parts = st.pellets > 1 ? st.pellets : 0;
    const one = listedBodyDamage('shotgun', 'shambler', parts, 24) * (st.damage / hb);
    return one * st.pellets;
  };
  assert.ok(Math.abs(shot('std') - whole) < 1e-9, 'issued ' + shot('std'));
  assert.ok(Math.abs(shot('buck') - whole * 100 / 63) < 1e-9, 'buck ' + shot('buck'));
  assert.ok(Math.abs(shot('slug') - whole * 70 / 63) < 1e-9, 'slug ' + shot('slug'));
});

test('the issued shell is tagged as it always was', () => {
  assert.equal(shotgunHitBase(base, base, 7), 9);
  assert.equal(shotgunHitBase(base, shotgunLoadStats(base, 'buck'), 7), 6.3);
  assert.equal(shotgunHitBase(base, shotgunLoadStats(base, 'slug'), 7), 9);
});
