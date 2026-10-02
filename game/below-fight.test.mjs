// GB-107: the rules of fighting below (game/below-fight.js), hollows.md 4 and 11.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BELOW, SET_PIECES, createBelowFight, navField, navStep, navOpen, sleeperKind } from './below-fight.js';

const O = { x: 0, y: -400, z: 0 };
// A little warren: a chamber of sleepers at depth 1, a nest at depth 2, a 2 x 2 Deep.
function warren(theme = 'shale', extra = {}) {
  const cells = [{ i: 0, j: 0, kind: 'chamber' }, { i: 1, j: 0, kind: 'tunnel' }, { i: 2, j: 0, kind: 'deep' }, { i: 3, j: 0, kind: 'deep' }, { i: 2, j: 1, kind: 'deep' }, { i: 3, j: 1, kind: 'deep' }];
  const points = {
    sleepers: [{ x: 1, y: -400, z: 1 }, { x: 4, y: -400, z: 1 }, { x: 1, y: -400, z: 4.5 }, { x: 30, y: -400, z: 30 }],
    nests: [{ x: 40, y: -400, z: 40, depth: 2 }],
    set: { kind: 'x', x: 18, y: -408, z: 6 },
  };
  return createBelowFight({ points, cells, theme, origin: O, ...extra });
}
const run = (f, secs, see, step = 0.1) => { const all = { wake: [], spawn: [], events: [] }; for (let t = 0; t < secs - 1e-9; t += step) { const o = f.tick(step, see()); all.wake.push(...o.wake); all.spawn.push(...o.spawn); all.events.push(...o.events); } return all; };

test('a shot within its hearing radius wakes a sleeper; one outside it sleeps on', () => {
  const f = warren();
  assert.equal(f.noise(2, 2, 3), 3);   // the three in the chamber, not the one at (30, 30)
  const o = run(f, 0.2, () => ({ x: 60, z: 60 }));
  assert.deepEqual(o.wake.sort(), [0, 1, 2]);
  assert.equal(f.sleepers[3].state, 'asleep');
  // a suppressed shot's radius is a third of it: from 12 m away it wakes nobody (GB-105's 45 m x 0.3 would)
  const g = warren();
  assert.equal(g.noise(1, 13.5, 12 * 0.3), 0);
});

test('he walks within 2.5 m: it wakes; its neighbours within 4 m follow a moment later, not at once', () => {
  const f = warren();
  const o = f.tick(0.05, { x: 1, z: -1.2 });   // 2.2 m from sleeper 0: it gets up that frame
  assert.deepEqual(o.wake, [0]);
  assert.equal(f.sleepers[1].state, 'waking');   // 3 m away
  assert.equal(f.sleepers[2].state, 'waking');   // 3.5 m away
  assert.equal(f.sleepers[3].state, 'asleep');
  const later = run(f, 1, () => ({ x: 1, z: -1.2 }));
  assert.deepEqual(later.wake.sort(), [1, 2]);
});

test('the gun light held on one for 1.5 s within 8 m wakes it; 1.4 s, off target or past 8 m does not', () => {
  const at = { x: 1, z: -5 };   // 6 m south of sleeper 0
  const aim = (dx, dz) => () => ({ ...at, light: { on: true, x: at.x, z: at.z, dx, dz } });
  let f = warren();
  assert.equal(run(f, 1.4, aim(0, 1)).wake.length, 0);
  f = warren(); assert.ok(run(f, 1.6, aim(0, 1)).wake.includes(0));
  f = warren(); assert.equal(run(f, 3, aim(1, 0)).wake.length, 0);   // aimed away
  f = warren(); assert.equal(run(f, 3, () => ({ x: 1, z: -9, light: { on: true, x: 1, z: -9, dx: 0, dz: 1 } })).wake.length, 0);   // 10 m
  f = warren(); assert.equal(run(f, 3, () => ({ ...at, light: { on: false, dx: 0, dz: 1 } })).wake.length, 0);   // light off
});

test('a nest wakes one every 12 s while he is within 20 m, never more than 3 of its own; blown, it stops', () => {
  const f = warren();
  const near = { x: 40, y: -400, z: 25 };
  let own = 0;
  const all = [];
  for (let t = 0; t < 60; t += 0.5) { const o = f.tick(0.5, { ...near, nestOwn: { 0: own } }); for (const s of o.spawn) if (s.from === 'nest') { all.push(t); own++; } }
  assert.equal(all.length, 3);   // 12, 24, 36 s: then it holds at its three
  assert.ok(Math.abs(all[0] - 11.5) < 0.6 && Math.abs(all[1] - all[0] - 12) < 0.6);
  own = 1;   // one of them dies: it sends another
  let more = 0; for (let t = 0; t < 1; t += 0.5) more += f.tick(0.5, { ...near, nestOwn: { 0: own } }).spawn.length;
  assert.equal(more, 1);
  // far away it does nothing
  const g = warren(); assert.equal(run(g, 40, () => ({ x: 40, y: -400, z: 0, nestOwn: { 0: 0 } }), 0.5).spawn.length, 0);
  // 400 HP; rounds count once, a blast twice
  assert.equal(f.hitNest(0, 150).blown, false);
  assert.equal(f.hitNest(0, 120, 'blast').hp, 10);   // 250 - 2 x 120
  assert.equal(f.hitNest(0, 5, 'fire').blown, true);   // fire counts twice too
  assert.equal(f.hitNest(0, 50), null);
  const after = f.tick(0.1, { ...near, nestOwn: { 0: 0 } });
  assert.deepEqual(after.events.map((e) => e.kind), ['nest-blown']);
  assert.equal(run(f, 30, () => ({ ...near, nestOwn: { 0: 0 } }), 0.5).spawn.length, 0);
  assert.equal(BELOW.NEST_HP, 400);
});

test('the set piece comes once, when he steps into the Deep; the Deep is cleared when it is dead and the box open', () => {
  const f = warren('iron');
  assert.equal(run(f, 2, () => ({ x: 9, y: -400, z: 3 })).spawn.length, 0);   // the tunnel before it
  const o = run(f, 0.3, () => ({ x: 15, y: -408, z: 3 }));
  assert.equal(o.spawn.length, SET_PIECES.iron.bodies.length);
  assert.deepEqual(o.spawn.map((s) => s.kind).sort(), ['brute', 'military', 'military', 'military', 'military']);
  assert.equal(o.events.filter((e) => e.kind === 'set-piece').length, 1);
  assert.equal(run(f, 3, () => ({ x: 15, y: -408, z: 3 })).spawn.length, 0);   // never twice
  assert.equal(f.cleared(true), false);   // the crew still stands
  f.setKilled(4); assert.equal(f.cleared(true), false);
  f.setKilled(1); assert.equal(f.cleared(false), false);   // box shut
  assert.equal(f.cleared(true), true);
  assert.equal(f.cleared(true), false);   // once
  // a second delve the same run: no set piece; the box alone clears it
  const g = warren('iron', { setDone: true });
  assert.equal(run(g, 1, () => ({ x: 15, y: -408, z: 3 })).spawn.length, 0);
  assert.equal(g.cleared(true), true);
});

test("the root knot drops when he opens the strongbox, not when he walks in", () => {
  const f = warren('root');
  assert.equal(run(f, 1, () => ({ x: 15, y: -408, z: 3 })).spawn.length, 0);
  f.strongboxOpened();
  const o = run(f, 0.2, () => ({ x: 15, y: -408, z: 3 }));
  assert.equal(o.spawn.length, SET_PIECES.root.bodies.length);
  assert.ok(o.spawn.every((s) => s.drop && s.y > -408));
});

test('every theme has its set piece from kinds that exist; the barrow king is a colossus', () => {
  const kinds = new Set(['shambler', 'feral', 'leaper', 'spider', 'drowned', 'military', 'brute', 'spitter', 'screamer', 'bomber', 'demon', 'colossus']);
  for (const t of ['root', 'shale', 'iron', 'wet', 'hill']) {
    assert.ok(SET_PIECES[t] && SET_PIECES[t].bodies.length >= 5, t);
    for (const [k] of SET_PIECES[t].bodies) assert.ok(kinds.has(k), t + ' ' + k);
    for (let i = 0; i < 12; i++) assert.ok(kinds.has(sleeperKind(t, i)));
  }
  assert.equal(SET_PIECES.hill.bodies[0][0], 'colossus');
  assert.equal(SET_PIECES.wet.rise, true);
  assert.equal(new Set(SET_PIECES.shale.bodies.map(([, x]) => Math.sign(x))).size, 2);   // two groups, two sides
});

test('at most 24 awake: past the cap the rest lie stirring, and get up as room is made', () => {
  const sleepers = []; for (let i = 0; i < 30; i++) sleepers.push({ x: (i % 6) * 1.2, y: -400, z: Math.floor(i / 6) * 1.2 });
  const f = createBelowFight({ points: { sleepers, nests: [], set: null }, cells: [], theme: 'hill', origin: O });
  f.noise(3, 3, 50);
  let awake = 20;
  const o = f.tick(0.1, { x: 80, z: 80, awake });
  assert.equal(o.wake.length, BELOW.AWAKE_CAP - awake);
  awake += o.wake.length;
  assert.equal(f.tick(0.1, { x: 80, z: 80, awake }).wake.length, 0);
  awake -= 3;
  assert.equal(f.tick(0.1, { x: 80, z: 80, awake }).wake.length, 3);
});

test("the warren's flow field walks round a wall, and nothing steps into one", () => {
  // 8 x 8 nav of 1.5 m, a wall down column 4 with a gap at the bottom row
  const w = 8, h = 8, walkable = new Uint8Array(w * h).fill(1);
  for (let b = 0; b < 7; b++) walkable[b * w + 4] = 0;
  const nav = { cell: 1.5, w, h, ox: 0, oz: -10, walkable };
  const F = navField(nav, 7 * 1.5 + 0.7, -10 + 0.7);   // target top right
  const out = { x: 0, z: 0 };
  let x = 0.7, z = -10 + 0.7;
  let steps = 0;
  while (Math.hypot(x - (7 * 1.5 + 0.7), z - (-10 + 0.7)) > 1 && steps < 400) {
    assert.ok(navStep(nav, F, x, z, out));
    x += out.x * 0.3; z += out.z * 0.3; steps++;
    assert.ok(navOpen(nav, x, z), 'stepped into the wall at ' + x.toFixed(2) + ',' + z.toFixed(2));
  }
  assert.ok(steps < 400, 'it got there');
  assert.ok(steps > 30, 'by the gap, not through the wall');
});
