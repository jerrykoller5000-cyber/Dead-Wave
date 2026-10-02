// GB-92: the heart fight's rules (game/heart-fight.js), secret-quest.md 5.
import test from 'node:test';
import assert from 'node:assert/strict';
import { HEART, createHeartFight } from './heart-fight.js';

const play = (f, secs, see, step = 0.05) => { const ev = []; for (let t = 0; t < secs - 1e-9; t += step) ev.push(...f.tick(step, typeof see === 'function' ? see(t) : see)); return ev; };

test('three phases by its health: full, two-thirds, a third; its reach grows each', () => {
  const f = createHeartFight();
  assert.equal(f.read().phase, 1);
  let r = f.damage(HEART.HP / 3 - 1); assert.equal(r.phase, 1);
  r = f.damage(2); assert.equal(r.phase, 2); assert.equal(r.phaseChanged, true);
  r = f.damage(HEART.HP / 3); assert.equal(r.phase, 3);
  assert.deepEqual(f.tick(0.05, { dist: 30, awake: 0, hush: true }).filter((e) => e.kind === 'phase').map((e) => e.phase), [2, 3]);
  assert.ok(HEART.REACH[0] < HEART.REACH[1] && HEART.REACH[1] < HEART.REACH[2]);
  assert.equal(f.read().reach, HEART.REACH[2]);
});

test('it dies once, and only then: the dead event fires once', () => {
  const f = createHeartFight();
  f.damage(HEART.HP + 500);
  assert.equal(f.read().dead, true);
  const ev = play(f, 2, { dist: 2, awake: 0, hush: true });
  assert.deepEqual(ev.filter((e) => e.kind === 'dead').length, 1);
  assert.equal(f.damage(100).taken, 0);
});

test('a lunge: a tell, then a grab if he is inside its reach, a miss if not', () => {
  const f = createHeartFight();
  let ev = play(f, HEART.LUNGE_CD[0] + 0.1, { dist: 2, awake: 12, hush: true });
  assert.ok(ev.some((e) => e.kind === 'lunge'));
  ev = play(f, HEART.WINDUP + 0.1, { dist: 2, awake: 12, hush: true });
  assert.ok(ev.some((e) => e.kind === 'grab'));
  const g = createHeartFight();
  play(g, HEART.LUNGE_CD[0] + 0.1, { dist: 4, awake: 12, hush: true });   // inside reach + 2.5: it winds up
  ev = play(g, HEART.WINDUP + 0.1, { dist: 4, awake: 12, hush: true });   // but 4 m is past phase 1's 3 m
  assert.ok(ev.some((e) => e.kind === 'miss') && !ev.some((e) => e.kind === 'grab'));
  const h = createHeartFight(); h.damage(HEART.HP * 0.7);   // phase 3: 5.6 m
  play(h, HEART.LUNGE_CD[0] + 0.1, { dist: 4, awake: 12, hush: true });
  ev = play(h, HEART.WINDUP + 0.1, { dist: 4, awake: 12, hush: true });
  assert.ok(ev.some((e) => e.kind === 'grab'), 'its reach has grown');
  const far = createHeartFight();
  assert.equal(play(far, 20, { dist: 30, awake: 12, hush: true }).filter((e) => e.kind === 'lunge').length, 0, 'no lunge from across the cave');
});

test('between lunges it calls the dead out of the source, never past 12 up', () => {
  const f = createHeartFight();
  let awake = 0, most = 0;
  const ev = [];
  for (let t = 0; t < 120; t += 0.05) for (const e of f.tick(0.05, { dist: 30, awake, hush: true })) { ev.push(e); if (e.kind === 'call') { awake += e.n; most = Math.max(most, awake); } }
  assert.ok(ev.filter((e) => e.kind === 'call').length >= 5);
  assert.equal(most, HEART.CALL_CAP);
  const g = createHeartFight();
  assert.equal(play(g, 60, { dist: 30, awake: 12, hush: true }).filter((e) => e.kind === 'call').length, 0);
});

test('in the last phase it pulls the white columns down, one at a time, each once', () => {
  const f = createHeartFight({ columns: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });
  assert.equal(play(f, 30, { dist: 30, awake: 12, hush: true }).filter((e) => e.kind === 'column').length, 0, 'not before');
  f.damage(HEART.HP * 0.7);
  const ev = play(f, 40, { dist: 30, awake: 12, hush: true });
  assert.deepEqual(ev.filter((e) => e.kind === 'column').map((e) => e.id), ['a', 'b', 'c']);
  assert.deepEqual(f.read().columns, []);
});

test('the Hush flat: the source roars and it cannot be hurt', () => {
  const f = createHeartFight();
  const ev = play(f, 0.2, { dist: 30, awake: 0, hush: false });
  assert.deepEqual(ev.filter((e) => e.kind === 'flat').length, 1);
  assert.equal(f.damage(500).taken, 0);
  assert.equal(f.read().hp, HEART.HP);
});

test('its health is the three-minute estimate', () => {
  assert.equal(HEART.HP, 3400);
  const perSec = (30 * 27) / (30 * 0.11 + 2.0) * 0.6 * 0.7 / 3.4;   // the AK sustained (153/s), x0.6 bullet column, x0.7 armour, on target about 30%
  assert.ok(Math.abs(HEART.HP / perSec - 180) < 15, (HEART.HP / perSec).toFixed(0) + ' s');
});
