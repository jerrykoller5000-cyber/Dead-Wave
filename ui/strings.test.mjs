// GP-1's pure Node checks. Cursor owns adding this command to the npm test runner.
// Run: node --test ui/strings.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STRINGS, DEFAULT_INPUT_LABELS, hasText, text } from './strings.js';

test('banking distinguishes carried skull value from spendable Cash', () => {
  assert.equal(text('hud.skullValue', { value: 12 }), 'Skull value: 12');
  assert.equal(text('hq.banked', { amount: 12 }), 'Banked 12 Cash');
  assert.match(text('perks.scavenger.description'), /skull value/);
  assert.match(text('wave.bloodMoonHelp', { day: 4 }), /skull value/);
  assert.match(text('wave.colossusReward', { value: 120 }), /turn the skulls in at HQ/);
});

test('plural counts handle zero, one and many without fragments', () => {
  assert.equal(text('hq.deposit', { count: 0 }), 'E — Bank 0 skulls');
  assert.equal(text('hq.deposit', { count: 1 }), 'E — Bank 1 skull');
  assert.equal(text('hq.deposit', { count: 12 }), 'E — Bank 12 skulls');
  assert.equal(text('supply.medpens', { count: 1 }), '+1 MedPen');
  assert.equal(text('supply.medpens', { count: 2 }), '+2 MedPens');
});

test('bad counts are rejected instead of silently selecting a plural', () => {
  for (const count of [undefined, null, '1', -1, 0.5, NaN, Infinity, 2 ** 54]) {
    assert.throws(() => text('hq.deposit', { count }), TypeError);
  }
  assert.throws(() => text('hq.deposit', Object.create({ count: 1 })), TypeError);
});

test('remapped inputs replace only their action and zero is preserved', () => {
  assert.equal(text('hq.deposit', { count: 1, interact: 'Gamepad A' }), 'Gamepad A — Bank 1 skull');
  assert.equal(text('shop.balance', { amount: 0 }), 'Cash $0');
  assert.match(text('mortar.controls', { shells: 0, carry: 'K' }), /K shoulder it · 0 shells/);
  assert.match(text('build.platform.description', { rotate: 'J' }), /Steel deck/);
  assert.equal(text('build.message.upgradePart', { message: 'Stone wall', rotate: 'J', part: 'wall' }), 'Stone wall · J: wall');
});

test('parameters remain literal text: no recursive replacement or dollar expansion', () => {
  const name = '<img src=x onerror=alert(1)> {name} $& $1';
  assert.equal(text('gameOver.rest', { name }), 'Rest easy, ' + name);
  assert.equal(text('common.list', { first: '{second}', second: 'Cash' }), '{second} · Cash');
  // Returned text belongs in textContent, never innerHTML; this API does not parse HTML.
});

test('missing keys and required values are actionable caller errors', () => {
  assert.throws(() => text('missing.example'), /Unknown text key/);
  assert.throws(() => text('shop.buy'), /Missing text parameter price/);
  for (const value of [null, undefined, NaN, Infinity, {}, []]) {
    assert.throws(() => text('shop.buy', { price: value }), TypeError);
  }
  for (const params of [null, [], 'bad', 12]) {
    assert.throws(() => text('menu.play', params), TypeError);
  }
});

test('prototype properties cannot become keys or supplied placeholders', () => {
  for (const key of ['constructor', '__proto__', 'toString', null]) {
    assert.equal(hasText(key), false);
    assert.throws(() => text(key), RangeError);
  }
  assert.throws(() => text('shop.buy', Object.create({ price: 20 })), /Missing text parameter/);
  assert.equal(text('coach.bank', Object.create({ interact: 'wrong' })), 'Press E to bank your skulls.');
});

test('catalogue, plural records and default controls cannot be changed by callers', () => {
  assert.ok(Object.isFrozen(STRINGS));
  assert.ok(Object.isFrozen(STRINGS['hq.deposit']));
  assert.ok(Object.isFrozen(DEFAULT_INPUT_LABELS));
  assert.throws(() => { STRINGS['menu.play'] = 'Changed'; }, TypeError);
  assert.throws(() => { STRINGS['hq.deposit'].one = 'Changed'; }, TypeError);
  assert.throws(() => { DEFAULT_INPUT_LABELS.interact = 'Changed'; }, TypeError);
});

test('every catalogue entry formats completely, including both plural branches', () => {
  for (const [key, entry] of Object.entries(STRINGS)) {
    assert.match(key, /^[a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+$/, key);
    const branches = typeof entry === 'string' ? [entry] : [entry.one, entry.other];
    if (typeof entry !== 'string') assert.deepEqual(Object.keys(entry).sort(), ['one', 'other'], key);
    for (let i = 0; i < branches.length; i++) {
      assert.equal(typeof branches[i], 'string', key);
      const params = Object.fromEntries([...branches[i].matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map(m => [m[1], 7]));
      if (typeof entry !== 'string') params.count = i === 0 ? 1 : 2;
      const rendered = text(key, params);
      assert.doesNotMatch(rendered, /\{[^}]*\}|\bundefined\b|\[object Object\]/, key);
      assert.doesNotMatch(rendered, /<\/?[A-Za-z][^>]*>/, key);
    }
  }
});

test('source cannot silently replace an earlier duplicate key', () => {
  const source = fs.readFileSync(new URL('./strings.js', import.meta.url), 'utf8');
  const keys = [...source.matchAll(/^  "([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+)":/gm)].map(m => m[1]);
  assert.equal(keys.length, new Set(keys).size);
  assert.equal(keys.length, Object.keys(STRINGS).length);
});

test('existing weapon, build, death and approved loading IDs have copy', () => {
  for (const id of ['pistol', 'uzi', 'shotgun', 'm4', 'ak', 'revolver', 'sniper', 'aa12', 'launcher', 'minigun', 'flamer', 'chainsaw']) {
    assert.ok(hasText(`weapon.${id}.name`), id);
    assert.ok(hasText(`weapon.${id}.description`), id);
  }
  for (const id of ['wall', 'floor', 'platform', 'pillar', 'stairs', 'railing', 'window', 'door', 'shovel', 'upgrade', 'barricade', 'sandbag', 'wire', 'gate', 'spikes', 'mine', 'barrel', 'lure', 'light', 'flame', 'heavy', 'mortar']) {
    assert.ok(hasText(`build.${id}.name`), id);
    assert.ok(hasText(`build.${id}.description`), id);
  }
  for (const id of ['terrain', 'world', 'zombies', 'shaders', 'ready', 'load']) assert.ok(hasText(`loading.stage.${id}`), id);
  for (const id of ['shambler', 'feral', 'leaper', 'spider', 'drowned', 'military', 'brute', 'spitter', 'screamer', 'bomber', 'demon', 'colossus', 'blast', 'fire', 'acid', 'tree', 'towerfall', 'bird', 'caveguard', 'tentacles']) {
    assert.ok(hasText(`death.${id}.name`), id);
    assert.ok(hasText(`death.${id}.description`), id);
  }
});
