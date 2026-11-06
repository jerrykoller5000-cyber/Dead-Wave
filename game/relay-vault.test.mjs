// game/relay-vault.test.mjs — CL-184/CL-185: the vault is a mystery box of what he does not have, by the day's tier;
// the final day sends up the red katana.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VAULT_TIERS, VAULT_FINAL_DAY, vaultTierFor, vaultReward } from './relay-vault.js';

const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const key = (it) => it.kind + ':' + it.id;

test('tiers climb with the day, from the footlocker to the katana', () => {
  assert.equal(vaultTierFor(0).id, 'footlocker');
  assert.equal(vaultTierFor(1).id, 'footlocker');
  assert.equal(vaultTierFor(4).id, 'quartermaster');
  assert.equal(vaultTierFor(8).id, 'armoury');
  assert.equal(vaultTierFor(12).id, 'heavy');
  assert.equal(vaultTierFor(16).id, 'cache');
  assert.equal(vaultTierFor(VAULT_FINAL_DAY - 1).id, 'cache');
  assert.equal(vaultTierFor(VAULT_FINAL_DAY).id, 'katana');
  for (let i = 1; i < VAULT_TIERS.length; i++) assert.ok(VAULT_TIERS[i].from > VAULT_TIERS[i - 1].from);
});

test('day one is a weapon he does not have', () => {
  for (let s = 1; s < 40; s++) {
    const r = vaultReward(1, (it) => !(it.kind === 'weapon' && it.id === 'uzi'), seeded(s));
    assert.equal(r.items.length, 1);
    assert.equal(r.items[0].kind, 'weapon');
    assert.notEqual(r.items[0].id, 'uzi');
  }
});

test('never something he already has; a full pool reaches up a tier, then down, then cash', () => {
  const has = new Set(VAULT_TIERS[0].pool.map(key));
  const r = vaultReward(2, (it) => !has.has(key(it)), seeded(7));
  assert.equal(r.items[0] && VAULT_TIERS[1].pool.some((it) => key(it) === key(r.items[0])), true, 'from the quartermaster: ' + JSON.stringify(r.items));
  const above = new Set(VAULT_TIERS.slice(4).flatMap((t) => t.pool.map(key)));
  const down = vaultReward(16, (it) => !above.has(key(it)), seeded(3));
  assert.ok(down.items.every((it) => !above.has(key(it))) && down.items.length === 2, 'from below: ' + JSON.stringify(down.items));
  const none = vaultReward(9, () => false);
  assert.deepEqual(none.items, [{ kind: 'cash', amount: vaultTierFor(9).cash }]);
});

test('gated story line filters the machete from vault draws without changing ungated rewards', () => {
  const alwaysMachete = () => 0.3;
  assert.deepEqual(vaultReward(4, () => true, alwaysMachete).items, [{ kind: 'blade', id: 'machete' }]);
  for (let day = 1; day < VAULT_FINAL_DAY; day++) {
    for (let seed = 1; seed <= 25; seed++) {
      const reward = vaultReward(day, (it) => it.kind !== 'blade', seeded(seed));
      assert.ok(reward.items.every((it) => it.kind !== 'blade'), `day ${day}, seed ${seed}: ${JSON.stringify(reward.items)}`);
    }
  }
});

test('the black cache draws two different things; the katana only on the final day', () => {
  for (let s = 1; s < 30; s++) {
    const r = vaultReward(17, () => true, seeded(s));
    assert.equal(r.items.length, 2); assert.notEqual(key(r.items[0]), key(r.items[1]));
  }
  for (let d = 1; d < VAULT_FINAL_DAY; d++) assert.ok(!vaultReward(d, () => true, seeded(d)).items.some((i) => i.kind === 'katana'), 'day ' + d);
  assert.deepEqual(vaultReward(VAULT_FINAL_DAY, () => false).items, [{ kind: 'katana', id: 'katana' }]);
});
