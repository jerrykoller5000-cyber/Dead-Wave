// node --test combat/ammo-types.test.mjs   (CB-294: J133 the ammo system, J134 no types on full-auto guns)
import test from 'node:test';
import assert from 'node:assert/strict';
import { AMMO_TYPES, SWITCH_TIMING, hasTypes, typeIds, issuedType, canonType, typeOf, typeStats, typeHitBase, typeEffect,
  typeUnitPrice, nextType, createTypeSwitch, j134Breaches, typedGuns } from './ammo-types.js';

const BASE = Object.freeze({ name: 'Shotgun', maxAmmo: 8, reload: 1.6, interval: 0.7, damage: 9, speed: 60, range: 22, auto: false, pellets: 7, spread: 0.14 });

test('the pump shotgun has three types, birdshot issued, in Jerry\'s order', () => {
  assert.deepEqual(typedGuns(), ['shotgun'], 'only the pump shotgun has types for now');
  assert.deepEqual(typeIds('shotgun'), ['birdshot', 'buckshot', 'slug']);
  assert.equal(issuedType('shotgun'), 'birdshot');
  for (const g of ['aa12', 'pistol', 'm4', 'ak', 'uzi', 'minigun', 'revolver', 'sniper']) { assert.equal(hasTypes(g), false, g); assert.deepEqual(typeIds(g), []); }
});

test('J134: no gun with types can fire full-auto', () => {
  // the game's own sheet: every gun that can fire auto (its sheet, a selector, the sear pistol) - here the rule's list
  const AUTO = new Set(['m4', 'ak', 'aa12', 'pistol', 'uzi', 'minigun', 'flamer', 'chainsaw']);
  assert.deepEqual(j134Breaches((g) => AUTO.has(g)), []);
  assert.deepEqual(j134Breaches(() => true), ['shotgun'], 'the check does catch one');
});

test('slug > buckshot > birdshot, in effect and in price', () => {
  const e = ['birdshot', 'buckshot', 'slug'].map((k) => typeEffect('shotgun', k));
  assert.equal(e[0], 1, 'birdshot is the measure');
  assert.ok(e[1] > e[0] && e[1] < 1.5, 'buckshot a little more effective (' + e[1].toFixed(2) + ')');
  assert.ok(e[2] > e[1], 'the slug the most (' + e[2].toFixed(2) + ')');
  const p = ['birdshot', 'buckshot', 'slug'].map((k) => typeUnitPrice('shotgun', k));
  assert.ok(p[0] < p[1] && p[1] < p[2], 'and dearer in that order: ' + p.join(' < '));
  assert.ok(typeOf('shotgun', 'slug').range > typeOf('shotgun', 'buckshot').range && typeOf('shotgun', 'buckshot').range >= typeOf('shotgun', 'birdshot').range, 'reach in the same order');
  assert.ok(typeOf('shotgun', 'slug').spread < typeOf('shotgun', 'buckshot').spread && typeOf('shotgun', 'buckshot').spread <= typeOf('shotgun', 'birdshot').spread, 'tighter in the same order');
});

test('each type is a different hull colour (J133: the spent hull shows what was fired)', () => {
  const hx = typeIds('shotgun').map((k) => typeOf('shotgun', k).hullHex);
  assert.equal(new Set(hx).size, 3);
  const lum = (h) => 0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const a = hx[i], b = hx[j];
    const d = Math.hypot(((a >> 16) & 255) - ((b >> 16) & 255), ((a >> 8) & 255) - ((b >> 8) & 255), (a & 255) - (b & 255));
    assert.ok(d > 60, 'hulls ' + i + ' and ' + j + ' far apart in colour (' + d.toFixed(0) + ')');
  }
  assert.ok(Math.abs(lum(hx[2]) - lum(hx[1])) > 60, 'the slug\'s hull and the buckshot\'s apart in lightness too (read in the dark)');
});

test('the sheet: birdshot is the gun as it always was; the others lay their fields over it', () => {
  assert.deepEqual(typeStats(BASE, 'shotgun', 'birdshot'), { ...BASE });
  const b = typeStats(BASE, 'shotgun', 'buckshot');
  assert.equal(b.pellets, 8); assert.equal(b.damage, 10); assert.equal(b.range, 26); assert.equal(b.interval, BASE.interval); assert.equal(b.maxAmmo, 8);
  const s = typeStats(BASE, 'shotgun', 'slug');
  assert.equal(s.pellets, 1); assert.equal(s.damage, 100); assert.equal(s.reload, BASE.reload);
  assert.deepEqual(typeStats(BASE, 'shotgun', 'nonsense'), { ...BASE });
  assert.equal(BASE.pellets, 7, 'the base is never changed');
  // the hit sheet counts a type by its shell total
  // a shell's share of the sheet's cell: each pellet is 1/pellets of a shell (a lone round 1/7, one pellet of the issued shell),
  // times its damage over the tag; summed over the shell's pellets
  const tag = (st) => (st.pellets > 1 ? st.pellets * (1 / st.pellets) : 1 / 7) * st.damage / typeHitBase(BASE, st, 7);
  assert.ok(Math.abs(tag(typeStats(BASE, 'shotgun', 'birdshot')) - 1) < 1e-9);
  assert.ok(Math.abs(tag(b) - 80 / 63) < 1e-9, 'buckshot x1.27');
  assert.ok(Math.abs(tag(s) - 100 / 63) < 1e-9, 'slug x1.59');
});

test('the art\'s keys: std, issued and buck are aliases (ChatGPT 2\'s GT-20080 boundary)', () => {
  assert.equal(canonType('shotgun', 'std'), 'birdshot'); assert.equal(canonType('shotgun', 'issued'), 'birdshot');
  assert.equal(canonType('shotgun', 'buck'), 'buckshot'); assert.equal(canonType('shotgun', 'slug'), 'slug');
  assert.equal(canonType('shotgun', 'flechette'), null); assert.equal(canonType('m4', 'birdshot'), null);
});

test('X goes to the next type he carries any of, round the order, skipping what he has none of', () => {
  assert.equal(nextType('shotgun', 'birdshot', { birdshot: 30, buckshot: 5, slug: 5 }), 'buckshot');
  assert.equal(nextType('shotgun', 'buckshot', { birdshot: 30, buckshot: 5, slug: 5 }), 'slug');
  assert.equal(nextType('shotgun', 'slug', { birdshot: 30, buckshot: 5, slug: 5 }), 'birdshot');
  assert.equal(nextType('shotgun', 'birdshot', { birdshot: 30, buckshot: 0, slug: 5 }), 'slug');
  assert.equal(nextType('shotgun', 'birdshot', { birdshot: 30 }), null, 'nothing else to change to');
  assert.equal(nextType('shotgun', 'slug', { birdshot: 0, buckshot: 0, slug: 9 }), null);
  assert.equal(nextType('m4', 'birdshot', { buckshot: 9 }), null);
});

test('a change unloads every round first, at the unload pace, then loads, then settles', () => {
  const T = SWITCH_TIMING.shotgun, sw = createTypeSwitch('shotgun');
  assert.equal(sw.start('birdshot', 'slug', 5, 12, 8), true);
  const st = sw.state();
  assert.equal(st.phase, 'unload'); assert.equal(st.unload, 5); assert.equal(st.load, 8, 'loads up to the tube');
  assert.ok(Math.abs(st.total - (5 * T.unload + 8 * T.load + T.settle)) < 1e-9, 'a real time: ' + st.total.toFixed(2) + ' s');
  let un = 0, ld = 0, t = 0, firstLoadAt = null, lastUnloadAt = 0, done = false;
  for (let i = 0; i < 2000 && !done; i++) {
    const r = sw.step(1 / 60); t += 1 / 60;
    if (r.unload) { un += r.unload; lastUnloadAt = t; assert.equal(ld, 0, 'no load while any is still to come out'); }
    if (r.load) { ld += r.load; if (firstLoadAt == null) firstLoadAt = t; }
    done = r.done;
  }
  assert.ok(done, 'it ends'); assert.equal(un, 5); assert.equal(ld, 8);
  assert.ok(Math.abs(lastUnloadAt - 5 * T.unload) < 1 / 30, 'the fifth round out at ' + lastUnloadAt.toFixed(2) + ' s');
  assert.ok(firstLoadAt > lastUnloadAt, 'the first in after the last out');
  assert.ok(Math.abs(t - st.total) < 1 / 30, 'done at ' + t.toFixed(2) + ' s');
  assert.equal(sw.active(), false); assert.equal(sw.state(), null);
});

test('loads only what he carries; an empty gun goes straight to loading; one big step moves several rounds', () => {
  const sw = createTypeSwitch('shotgun');
  sw.start('birdshot', 'buckshot', 0, 3, 8);
  assert.equal(sw.state().phase, 'load'); assert.equal(sw.state().load, 3);
  const r = sw.step(1.0);
  assert.equal(r.load, 2, 'two rounds in a second at 0.42 s');
  assert.equal(sw.start('slug', 'slug', 3, 3, 8), false, 'no change to the same type');
  assert.equal(createTypeSwitch('shotgun').start('birdshot', 'slug', 0, 0, 8), false, 'nothing to do');
});

test('cancel stops where it is: rounds moved stay moved', () => {
  const sw = createTypeSwitch('shotgun');
  sw.start('birdshot', 'slug', 4, 10, 8);
  let un = 0; for (let i = 0; i < 50; i++) un += sw.step(1 / 60).unload;   // 0.83 s: two out
  assert.equal(un, 2);
  const c = sw.cancel();
  assert.deepEqual(c, { from: 'birdshot', to: 'slug', phase: 'unload', unloaded: 2, loaded: 0 });
  assert.equal(sw.active(), false); assert.deepEqual(sw.step(1), { unload: 0, load: 0, done: false });
  assert.equal(sw.count(), 1);
});

test('the table is frozen: nothing changes the numbers at run time', () => {
  assert.ok(Object.isFrozen(AMMO_TYPES) && Object.isFrozen(AMMO_TYPES.shotgun.types.slug));
});
