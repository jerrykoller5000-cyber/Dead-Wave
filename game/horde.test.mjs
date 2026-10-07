// GB-94 (P-79): game/horde.js. Deterministic (a seeded generator): every zombie has its own pace inside its type,
// and a column that comes at him single file arrives round him from several sides.
import test from 'node:test';
import assert from 'node:assert/strict';
import { HORDE, OWN_STEER, profileOf, rollPace, rollWit, rollReact, sprintShare, pickSlot, slotAngle, leadOffset, approachPoint, wanderAngle, speedFor, nextRole, massBearing, roleSlot, refillReady, frontMoved } from './horde.js';

const seeded = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

test('a crowd type rolls shamblers, joggers and the odd sprinter; the mean stays about its type speed', () => {
  const rnd = seeded(94);
  const rolls = Array.from({ length: 400 }, () => rollPace('shambler', rnd(), rnd()));
  const mul = rolls.map((r) => r.mul), bands = new Set(rolls.map((r) => r.band));
  const mean = mul.reduce((a, b) => a + b, 0) / mul.length;
  assert.deepEqual([...bands].sort(), ['jog', 'shamble', 'sprint']);
  assert.ok(Math.min(...mul) < 0.82 && Math.max(...mul) > 1.38, `spread ${Math.min(...mul).toFixed(2)}-${Math.max(...mul).toFixed(2)}`);
  assert.ok(mean > 0.96 && mean < 1.06, `mean ${mean.toFixed(3)}`);
  const sprint = rolls.filter((r) => r.band === 'sprint').length / rolls.length;
  assert.ok(sprint > 0.06 && sprint < 0.2, `sprinters ${(sprint * 100).toFixed(0)}%`);
  // Ten in a row are not ten at one pace.
  assert.ok(new Set(mul.slice(0, 10).map((m) => m.toFixed(2))).size >= 8);
});

test('each type keeps its identity: heavies barely vary, ferals stay the quick ones, bosses and the spider do not vary', () => {
  const rnd = seeded(7);
  for (let i = 0; i < 200; i++) {
    const b = rollPace('brute', rnd(), rnd()).mul; assert.ok(b >= 0.94 && b <= 1.06);
    const f = rollPace('feral', rnd(), rnd()).mul; assert.ok(f >= 0.82 && f <= 1.28);
  }
  for (const k of ['guardian', 'colossus', 'caveguard', 'spider', 'nope']) {
    assert.equal(rollPace(k, 0.99, 0.99).mul, 1, k);
    assert.equal(profileOf(k), null, k);
  }
  // The slowest feral (5.4 x 0.82) is still quicker than a jogging shambler (3.19 x 1.14), and the quickest brute
  // (1.85 x 1.06) slower than the slowest shambler (3.19 x 0.78).
  assert.ok(5.4 * 0.82 > 3.19 * 1.14);
  assert.ok(1.85 * 1.06 < 3.19 * 0.78);
  assert.ok(rollWit('feral', 0) > rollWit('shambler', 1) - 0.01 && rollWit('shambler', 0.5) > 0);
  assert.ok(OWN_STEER.includes('spit') && OWN_STEER.includes('boss'));
});

test('slots: a column all on one bearing spreads over the emptiest angles within 80 degrees of it', () => {
  const loads = new Array(HORDE.SLOTS).fill(0);
  const got = [];
  for (let k = 0; k < 10; k++) { const s = pickSlot(Math.PI / 2, loads); loads[s]++; got.push(s); }
  const angs = got.map((s) => wanderAngle(slotAngle(s), Math.PI / 2));
  assert.ok(angs.every((a) => Math.abs(a) <= HORDE.SLOT_SWING + 1e-9));
  assert.ok(new Set(got).size >= 5, `slots ${got.join(',')}`);
  assert.ok(Math.max(...angs) - Math.min(...angs) >= (120 * Math.PI) / 180);
  // Alone, it keeps its own side; an empty slot beside a full one wins.
  assert.equal(pickSlot(0.01, new Array(HORDE.SLOTS).fill(0)), 0);
  const l2 = new Array(HORDE.SLOTS).fill(0); l2[3] = 4;
  assert.notEqual(pickSlot(slotAngle(3), l2), 3);
});

test('cut-off: it aims where he is going, up to a second and 6 m ahead, scaled by its wits', () => {
  assert.deepEqual(leadOffset(0, 0, 10, 4, 1), { x: 0, z: 0 });
  const a = leadOffset(7.4, 0, 20, 4, 1); assert.ok(Math.abs(a.x - 6) < 1e-9 && a.z === 0);
  const b = leadOffset(7.4, 0, 2, 4, 0.5); assert.ok(Math.abs(b.x - 7.4 * 0.5 * 0.5) < 1e-9);
  const p = approachPoint(0, 0, 0, 40, Math.PI, 0, 0);
  assert.ok(Math.abs(p.r - HORDE.SLOT_R_MAX) < 1e-9 && p.x < -HORDE.SLOT_R_MAX + 0.01);
  assert.equal(approachPoint(0, 0, 0, 2.4, 0).r, 0);
  // With an out object it writes into that one and makes nothing new.
  const o = { x: 9, z: 9 }, q = { x: 0, z: 0, r: 0 };
  assert.equal(leadOffset(0, 0, 10, 4, 1, o), o); assert.deepEqual(o, { x: 0, z: 0 });
  assert.equal(approachPoint(0, 0, 0, 40, Math.PI, 0, 0, q), q); assert.ok(Math.abs(q.r - HORDE.SLOT_R_MAX) < 1e-9);
});

// A column of ten walks at him from 30 m, single file, on open ground. Before GB-94 (straight at him, one pace)
// they arrive one behind the other on one bearing; now they arrive round him from several sides, at different times.
function column(gb94) {
  const rnd = seeded(2026);
  const zs = Array.from({ length: 10 }, (_, k) => {
    const pace = gb94 ? rollPace('shambler', rnd(), rnd()).mul : 1;
    return { x: 0, z: 30 + k * 1.2, spd: 3.19 * 1.15 * pace, slot: -1, rethink: 0, arrived: null, at: null };
  });
  const loads = new Array(HORDE.SLOTS).fill(0);
  const dt = 0.05;
  for (let step = 0; step < 400 && zs.some((z) => z.arrived === null); step++) {
    for (const z of zs) {
      if (z.arrived !== null) continue;
      const d = Math.hypot(z.x, z.z);
      if (d < 1.0) { z.arrived = Math.atan2(z.z, z.x); z.at = step * dt; if (z.slot >= 0) loads[z.slot]--; continue; }
      let tx = 0, tz = 0;
      if (gb94) {
        z.rethink -= dt;
        if (z.slot < 0 || z.rethink <= 0) {
          if (z.slot >= 0) loads[z.slot]--;
          z.slot = pickSlot(Math.atan2(z.z, z.x), loads); loads[z.slot]++;
          z.rethink = HORDE.SLOT_RETHINK_S;
        }
        if (d > HORDE.CLOSE) { const p = approachPoint(0, 0, z.x, z.z, slotAngle(z.slot)); tx = p.x; tz = p.z; }
      }
      const dx = tx - z.x, dz = tz - z.z, L = Math.hypot(dx, dz) || 1;
      z.x += (dx / L) * z.spd * dt; z.z += (dz / L) * z.spd * dt;
    }
  }
  return zs;
}

test('a single-file column arrives round him from several sides, not on one bearing', () => {
  const before = column(false), after = column(true);
  assert.ok(before.every((z) => z.arrived !== null) && after.every((z) => z.arrived !== null), 'all of them got there');
  const spread = (zs) => { const a = zs.map((z) => wanderAngle(z.arrived, Math.PI / 2)); return Math.max(...a) - Math.min(...a); };
  const sectors = (zs) => new Set(zs.map((z) => Math.round(((z.arrived + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 6)) % 12)).size;
  assert.ok(spread(before) < 0.05 && sectors(before) === 1, 'before: one bearing');
  assert.ok(spread(after) >= (100 * Math.PI) / 180, `after: arrival bearings span ${(spread(after) * 180 / Math.PI).toFixed(0)} degrees`);
  assert.ok(sectors(after) >= 5, `after: ${sectors(after)} of 12 sides`);
  // And not in lockstep: the first and the last are seconds apart, not one stride.
  const t = after.map((z) => z.at);
  assert.ok(Math.max(...t) - Math.min(...t) > 2, `arrivals over ${(Math.max(...t) - Math.min(...t)).toFixed(1)} s`);
});

// GB-94 follow-up (Jerry 8:27 PM): "Rarer on 1, progressively more common up the higher the night."
test('sprinters: about 3% on night 1, more every night, about 19% by night 20; the mean pace stays sensible', () => {
  assert.ok(Math.abs(sprintShare(1) - 0.03) < 1e-9 && Math.abs(sprintShare(20) - 0.19) < 1e-9 && sprintShare(30) === sprintShare(20));
  for (let n = 1; n < 20; n++) assert.ok(sprintShare(n + 1) > sprintShare(n), 'night ' + n);
  const share = (night, seed) => {
    const rnd = seeded(seed); let sp = 0, sum = 0; const N = 4000;
    for (let i = 0; i < N; i++) { const r = rollPace('shambler', rnd(), rnd(), night); if (r.band === 'sprint') sp++; sum += r.mul; }
    return { sp: sp / N, mean: sum / N };
  };
  const n1 = share(1, 11), n10 = share(10, 12), n20 = share(20, 13);
  assert.ok(n1.sp > 0.015 && n1.sp < 0.045, `night 1: ${(n1.sp * 100).toFixed(1)}%`);
  assert.ok(n20.sp > 0.17 && n20.sp < 0.21, `night 20: ${(n20.sp * 100).toFixed(1)}%`);
  assert.ok(n1.sp < n10.sp && n10.sp < n20.sp);
  for (const m of [n1.mean, n10.mean, n20.mean]) assert.ok(m > 0.95 && m < 1.06, `mean ${m.toFixed(3)}`);
  // Shamble and jog keep their 40:48 split of the rest; the heavies and the flat kinds ignore the night.
  assert.equal(rollPace('brute', 0.99, 0.5, 1).mul, rollPace('brute', 0.99, 0.5, 20).mul);
  assert.equal(rollPace('shambler', 0.96, 0.5, 1).band, 'jog');
  assert.equal(rollPace('shambler', 0.96, 0.5, 20).band, 'sprint');
});

// "Smaller amount that ducks, more that have the stronger stagger."
test('hits: about 28% duck aside, the rest stagger; the heavies, the bombers and the bosses do neither', () => {
  const rnd = seeded(28); let duck = 0, stag = 0;
  for (let i = 0; i < 2000; i++) { const r = rollReact('shambler', rnd()); if (r === 'duck') duck++; else if (r === 'stagger') stag++; }
  assert.equal(duck + stag, 2000);
  assert.ok(duck / 2000 > 0.24 && duck / 2000 < 0.32, `duck ${(duck / 20).toFixed(1)}%`);
  for (const k of ['brute', 'demon', 'bomber', 'guardian', 'colossus', 'spider']) assert.equal(rollReact(k, 0.1), null, k);
  for (const k of ['feral', 'military', 'drowned', 'leaper', 'spitter', 'screamer']) assert.ok(rollReact(k, 0.9) === 'stagger' && rollReact(k, 0.1) === 'duck', k);
  // The stagger rewards the hit without pinning it: under steady fire it is slowed for at most STAGGER_S of each STAGGER_CD.
  assert.ok(HORDE.STAGGER_MUL <= 0.35 && HORDE.STAGGER_S >= 0.35 && HORDE.STAGGER_CD > HORDE.STAGGER_S);
});

// GB-135 (D-77, Jerry's playthrough 1): "Zombies need to all be faster on average... reach up to 90% of players speed
// while sprinting. Sprinters need to outpace player on sprint."
test('D-77 speeds: faster on average, never past 90% of his sprint, and a sprinter outruns his sprint', () => {
  const RUN = 11.8, SH = 3.19 * 1.15, FE = 5.4 * 1.15, BR = 1.85 * 1.15;
  const rnd = seeded(77); let before = 0, after = 0, n = 0, top = 0;
  for (const night of [1, 10, 20]) for (let i = 0; i < 2000; i++) {
    const p = rollPace('shambler', rnd(), rnd(), night), v = speedFor('shambler', SH * p.mul, p, RUN);
    if (p.band === 'sprint') { assert.ok(v.speed >= RUN * 1.04 - 1e-9 && v.speed <= RUN * 1.12 + 1e-9 && v.cap === v.speed, 'sprinter ' + v.speed); continue; }
    assert.ok(v.speed <= RUN * 0.9 + 1e-9 && v.cap === RUN * HORDE.CAP_RUN, 'walker ' + v.speed);
    before += SH * p.mul; after += v.speed; n++;
  }
  assert.ok(after / before > 1.5, 'the walkers are ' + (after / before).toFixed(2) + 'x what they were');
  for (let i = 0; i < 500; i++) { const p = rollPace('feral', rnd(), rnd(), 20); if (p.band !== 'sprint') top = Math.max(top, speedFor('feral', FE * p.mul, p, RUN).speed); }
  assert.ok(Math.abs(top - RUN * 0.9) < 1e-9, 'the quickest ferals reach 90% of his sprint: ' + top.toFixed(2));
  // The kinds keep their order: a brute is still slower than a shambler, a feral quicker.
  const v = (k, s, mul, band = 'flat') => speedFor(k, s * mul, { band, u: 0.5 }, RUN).speed;
  assert.ok(v('brute', BR, 1.06) < v('shambler', SH, 0.78, 'shamble') && v('feral', FE, 0.82, 'shamble') > v('shambler', SH, 1.14, 'jog'));
  // Bosses and the spider are not in it.
  assert.deepEqual(speedFor('spider', 3.45, { band: 'fixed', u: 0.5 }, RUN), { speed: 3.45, cap: Infinity });
});

test('D-77 roles: an even 70/30 split of the mass and the flankers; slot-less kinds take none', () => {
  let acc = 0; const roles = [];
  for (let i = 0; i < 100; i++) { const r = nextRole(i % 5 === 4 ? 'military' : 'shambler', acc); acc = r.acc; roles.push(r.role); }
  assert.equal(roles.filter((r) => r === 'flank').length, 30);
  for (let i = 0; i + 10 <= 100; i++) assert.equal(roles.slice(i, i + 10).filter((r) => r === 'flank').length, 3, 'any ten in a row hold three flankers');
  for (const k of ['guardian', 'colossus', 'spider']) assert.deepEqual(nextRole(k, 0.5), { role: null, acc: 0.5 });
});

test('D-77: the mass comes in on one front, the flankers round his sides', () => {
  assert.equal(massBearing(2, 0, 2), null, 'two is not a mass');
  assert.ok(Math.abs(massBearing(0, 5, 5) - Math.PI / 2) < 1e-9);
  assert.equal(massBearing(1, 0, 4), null, 'spread all round him: no front');
  const loads = new Array(HORDE.SLOTS).fill(0), front = Math.PI / 2;
  const mass = [], flank = [];
  for (let k = 0; k < 7; k++) { const s = roleSlot('mass', front + (k - 3) * 0.05, front, loads); loads[s]++; mass.push(Math.abs(wanderAngle(slotAngle(s), front))); }
  for (let k = 0; k < 3; k++) { const s = roleSlot('flank', front, front, loads); loads[s]++; flank.push(wanderAngle(slotAngle(s), front)); }
  assert.ok(mass.every((a) => a <= HORDE.MASS_SPREAD + 1e-9), 'the mass on its front: ' + mass.map((a) => (a * 180 / Math.PI).toFixed(0)).join(','));
  assert.ok(new Set(mass.map((a) => a.toFixed(3))).size >= 2, 'a front, not one file');
  assert.ok(flank.every((a) => Math.abs(a) >= HORDE.FLANK_MIN - 1e-9 && Math.abs(a) <= HORDE.FLANK_MAX + 1e-9), 'flanks: ' + flank.map((a) => (a * 180 / Math.PI).toFixed(0)).join(','));
  assert.ok(flank.some((a) => a > 0) && flank.some((a) => a < 0), 'on both sides');
  // A mass body far off the front, or anyone before there is a mass, picks as before.
  const l0 = new Array(HORDE.SLOTS).fill(0);
  assert.equal(roleSlot('mass', -Math.PI / 2, front, l0), pickSlot(-Math.PI / 2, l0));
  assert.equal(roleSlot('flank', 1, null, l0), pickSlot(1, l0));
});

test('D-77: a full field refills in a clump of 14, or after 10 s, not one body per death', () => {
  assert.equal(refillReady(48, 48, 0), false);
  assert.equal(refillReady(47, 48, 3), false, 'one death: wait');
  assert.equal(refillReady(34, 48, 1), true, 'fourteen down: the clump comes');
  assert.equal(refillReady(45, 48, 10), true, 'or ten seconds on');
});

test('D-77: a body with a role re-thinks its slot when the front first forms or swings past 30 degrees', () => {
  assert.equal(frontMoved(null, null), false, 'no front: nothing to follow');
  assert.equal(frontMoved(1, null), false);
  assert.equal(frontMoved(null, 0.2), true, 'the front just formed');
  assert.equal(frontMoved(0.2, 0.2 + 25 * Math.PI / 180), false, 'a small swing: keep the slot');
  assert.equal(frontMoved(0.2, 0.2 - 35 * Math.PI / 180), true, 'a big swing: re-think');
  assert.equal(frontMoved(3.1, -3.1), false, 'across the seam is a small swing');
});
