import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AI_MASS, massOf, CONTACT, FLAG_AI, FLAG_HZ, FLAG_AIR, FLAG_PLAYER, createContactSolver, solveContacts, queueSteer, shoveDecay } from './zombie-ai.js';

// A crowd in the solver's arrays: [x, z, type, {vx, vz, ai, hz, hzD, air, y, pinned}]
function crowd(list, cap = 96) {
  const S = createContactSolver(cap);
  S.n = list.length;
  list.forEach(([x, z, type, o = {}], i) => {
    S.x[i] = x; S.z[i] = z; S.y[i] = o.y || 0; S.r[i] = o.r || ({ brute: 0.64, demon: 0.66, colossus: 1.05, feral: 0.37 }[type] || 0.42);
    S.im[i] = o.pinned ? 0 : 1 / massOf(type); S.vx[i] = o.vx || 0; S.vz[i] = o.vz || 0; S.hzD[i] = o.hzD != null ? o.hzD : 10;
    S.flag[i] = (o.ai === false ? 0 : FLAG_AI) | (o.hz ? FLAG_HZ : 0) | (o.air ? FLAG_AIR : 0) | (o.player ? FLAG_PLAYER : 0);
  });
  return S;
}
const d = (S, a, b) => Math.hypot(S.x[a] - S.x[b], S.z[a] - S.z[b]);

test('the masses: a brute and a demon are 3.5 shamblers, the colossus 12, a feral lighter than a shambler', () => {
  assert.equal(massOf('shambler'), 1); assert.equal(AI_MASS.brute, 3.5); assert.equal(AI_MASS.demon, 3.5);
  assert.equal(AI_MASS.colossus, 12); assert.ok(AI_MASS.feral < 1); assert.equal(massOf('nobody'), 1);
});

test('two shamblers overlapping are split evenly, to within the slack, in one call', () => {
  const S = crowd([[0, 0, 'shambler'], [0.5, 0, 'shambler']]);
  solveContacts(S, 1 / 60);
  assert.ok(Math.abs(S.x[0] + S.x[1] - 0.5) < 1e-9, 'the midpoint stays put');
  const gap = d(S, 0, 1), minD = 0.84;
  assert.ok(gap > 0.5 && gap < minD, 'pushed apart, not past touching: ' + gap.toFixed(3));
  assert.ok((minD - gap) / minD < 0.2, 'the overlap after one call is small: ' + ((minD - gap) / minD).toFixed(3));
});

test('a brute and a shambler: the shambler takes 3.5 times the brute\'s share of the push', () => {
  const S = crowd([[0, 0, 'brute'], [0.6, 0, 'shambler']]);
  solveContacts(S, 1 / 60);
  const mb = Math.abs(S.x[0] - 0), ms = Math.abs(S.x[1] - 0.6);
  assert.ok(ms > 0 && mb > 0);
  assert.ok(Math.abs(ms / mb - 3.5) < 0.05, 'ratio ' + (ms / mb).toFixed(2));
});

test('a walking brute into a standing shambler: the shambler is shoved on (a velocity), the brute barely', () => {
  const S = crowd([[0, 0, 'brute', { vx: 2.0 }], [1.0, 0, 'shambler']]);
  solveContacts(S, 1 / 60);
  assert.ok(S.shx[1] > 1.2, 'the shambler carries the brute\'s walk on: ' + S.shx[1].toFixed(2) + ' m/s');
  assert.ok(Math.abs(S.shx[0]) < S.shx[1] / 3, 'the brute loses little: ' + S.shx[0].toFixed(2));
  assert.equal(S.ev[1], 1, 'and staggers (2 m/s, mass x3.5)'); assert.equal(S.ev[0], 0);
});

test('a charging demon bowls a shambler over; a brute at a walk only staggers it; a shambler bumping a shambler does neither', () => {
  const A = crowd([[0, 0, 'demon', { vx: 13 }], [1.0, 0, 'shambler']]); solveContacts(A, 1 / 60);
  assert.equal(A.ev[1], 2, 'knocked down'); assert.ok(A.evx[1] > 0.99, 'along the charge');
  assert.ok(Math.hypot(A.shx[1], A.shz[1]) <= CONTACT.SHOVE_MAX + 1e-9, 'the shove is capped');
  const B = crowd([[0, 0, 'brute', { vx: 1.6 }], [1.0, 0, 'shambler']]); solveContacts(B, 1 / 60);
  assert.equal(B.ev[1], 1);
  const C = crowd([[0, 0, 'shambler', { vx: 4 }], [0.8, 0, 'shambler']]); solveContacts(C, 1 / 60);
  assert.equal(C.ev[0] + C.ev[1], 0, 'equals push, they don\'t bowl');
  assert.ok(C.shx[1] > 1, 'but the one in front is still shoved on: ' + C.shx[1].toFixed(2));
});

test('the hit runs either way: a shambler walking into a parked brute is the one shoved back', () => {
  const S = crowd([[0, 0, 'shambler', { vx: 2 }], [0.9, 0, 'brute']]);
  solveContacts(S, 1 / 60);
  assert.ok(S.shx[0] < 0, 'bounces back');
  assert.equal(S.ev[0], 0, 'its own walk into a wall of meat is no stagger (the closing speed counts from the heavy side)');
});

test('a pinned body (a window climb) does not move; its neighbour takes all the push', () => {
  const S = crowd([[0, 0, 'shambler', { pinned: true }], [0.5, 0, 'shambler']]);
  solveContacts(S, 1 / 60);
  assert.equal(S.x[0], 0); assert.ok(S.x[1] > 0.7);
});

test('bodies on different floors (a platform over a crowd), or one in the air, don\'t touch', () => {
  const S = crowd([[0, 0, 'shambler'], [0.3, 0, 'shambler', { y: 2.25 }], [0, 0.3, 'shambler', { air: true }]]);
  solveContacts(S, 1 / 60);
  assert.equal(S.x[1], 0.3); assert.equal(S.z[2], 0.3); assert.equal(S.x[0], 0); assert.equal(S.z[0], 0);
});

test('a legacy pair (a TT spawn a test placed) is split exactly as the old pass did: 0.58 of the overlap each way, once', () => {
  const S = crowd([[0, 0, 'brute', { ai: false }], [0.6, 0, 'shambler']]);
  solveContacts(S, 1 / 60);
  const push = (0.64 + 0.42 - 0.6) * 0.58;
  assert.ok(Math.abs(S.x[0] + push) < 1e-12 && Math.abs(S.x[1] - 0.6 - push) < 1e-12);
  assert.equal(S.shx[0] + S.shx[1], 0, 'and no shove');
});

test('GB-94\'s room nudges are kept: heading nudges only, outside 3.5 m of him, between touching and touching + 1.2 m', () => {
  const S = crowd([[0, 0, 'shambler', { hz: true, hzD: 8 }], [1.4, 0, 'shambler', { hz: true, hzD: 2 }]]);
  solveContacts(S, 1 / 60);
  assert.equal(S.x[0], 0); assert.equal(S.x[1], 1.4, 'positions untouched');
  const w = (0.84 + 1.2 - 1.4) / 1.2;
  assert.ok(Math.abs(S.spx[0] + w) < 1e-12, 'the far one is nudged away'); assert.equal(S.spx[1], 0, 'the close one crowds');
});

test('a 48-body crush round one point: the grid sees every pair the all-pairs does, and two seconds of everyone walking into the middle leave less overlap than the old pass did (worst under 12%)', () => {
  const make = (legacy) => {
    const list = []; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 48; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 3; list.push([Math.cos(a) * r, Math.sin(a) * r, i % 12 === 0 ? 'brute' : (i % 7 === 0 ? 'bomber' : 'shambler'), { r: i % 12 === 0 ? 0.64 : (i % 7 === 0 ? 0.78 : 0.42), ai: !legacy }]); }
    return crowd(list);
  };
  const S = make(false);
  let want = 0; for (let i = 0; i < 48; i++) for (let j = i + 1; j < 48; j++) if (Math.hypot(S.x[i] - S.x[j], S.z[i] - S.z[j]) < S.r[i] + S.r[j]) want++;
  const st = solveContacts(S, 1 / 60, { K: { ...CONTACT, POS_K: 0 } });   // positions held this call, so the count is the grid's alone
  assert.equal(st.touching, want, 'touching pairs: grid ' + st.touching + ', all-pairs ' + want);
  const crush = (S) => {
    let worst = 0;
    for (let f = 0; f < 120; f++) {   // everyone walks to the middle at 2 m/s, the shove applied the way the walk does
      for (let i = 0; i < 48; i++) {
        const l = Math.hypot(S.x[i], S.z[i]) || 1; S.vx[i] = -S.x[i] / l * 2; S.vz[i] = -S.z[i] / l * 2;
        S.x[i] += (S.vx[i] + S.shx[i]) / 60; S.z[i] += (S.vz[i] + S.shz[i]) / 60;
      }
      solveContacts(S, 1 / 60);
      if (f >= 60) for (let i = 0; i < 48; i++) for (let j = i + 1; j < 48; j++) { const o = (S.r[i] + S.r[j] - d(S, i, j)) / (S.r[i] + S.r[j]); if (o > worst) worst = o; }
    }
    return worst;
  };
  const now = crush(make(false)), old = crush(make(true));
  assert.ok(now < 0.12 && now < old, 'worst overlap ' + (now * 100).toFixed(1) + '% of the radii (the old pass: ' + (old * 100).toFixed(1) + '%)');
});

test('the colossus (wider than the grid takes) still meets the crowd', () => {
  const S = crowd([[0, 0, 'colossus'], [1.2, 0, 'shambler'], [-1.2, 0.1, 'shambler']]);
  solveContacts(S, 1 / 60);
  assert.ok(S.x[1] > 1.3 && S.x[2] < -1.3); assert.ok(Math.abs(S.x[0]) < 0.02, 'it barely notices');
});

test('NaN bodies are skipped, never spread (the 2026-09-28 rule)', () => {
  const S = crowd([[NaN, 0, 'shambler'], [0.3, 0, 'shambler'], [0.6, 0, 'shambler']]);
  solveContacts(S, 1 / 60);
  assert.ok(Number.isFinite(S.x[1]) && Number.isFinite(S.x[2]));
});

test('queueSteer: pressed back against its heading it turns along the crowd, to its side; unpressed it walks on', () => {
  const o = queueSteer(1, 0, -0.3, 0, 1);
  assert.ok(o.pressed && o.z > 0.4 && Math.abs(Math.hypot(o.x, o.z) - 1) < 1e-9, JSON.stringify(o));
  const p = queueSteer(1, 0, -0.3, 0, -1); assert.ok(p.z < -0.4);
  const q = queueSteer(1, 0, 0.3, 0, 1); assert.ok(!q.pressed && q.x === 1 && q.z === 0, 'pushed from behind: no turn');
  const r = queueSteer(1, 0, -0.02, 0, 1); assert.ok(!r.pressed, 'a brush is nothing');
});

test('a shove dies away over its tau', () => {
  assert.ok(Math.abs(shoveDecay(CONTACT.SHOVE_TAU) - Math.exp(-1)) < 1e-12); assert.equal(shoveDecay(0), 1);
});

test('the marine as a pinned body: a crowd walking into him is solved round him (no overlap with him past a hair), he never moves, and a legacy body is left to the walk\'s ring', () => {
  const list = [[0, 0, 'shambler', { player: true, pinned: true, r: 0.46 }]];
  for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283, r = 1.2 + (i % 3) * 0.9; list.push([Math.cos(a) * r, Math.sin(a) * r, i % 8 === 0 ? 'brute' : 'shambler', { hz: true, hzD: r }]); }
  const S = crowd(list), n = list.length;
  for (let f = 0; f < 90; f++) {
    for (let i = 1; i < n; i++) { const l = Math.hypot(S.x[i], S.z[i]) || 1; S.vx[i] = -S.x[i] / l * 3; S.vz[i] = -S.z[i] / l * 3; S.x[i] += (S.vx[i] + S.shx[i]) / 60; S.z[i] += (S.vz[i] + S.shz[i]) / 60; }
    solveContacts(S, 1 / 60);
  }
  assert.equal(S.x[0], 0); assert.equal(S.z[0], 0);
  let worstP = 0; for (let i = 1; i < n; i++) worstP = Math.max(worstP, (S.r[0] + S.r[i] - d(S, 0, i)) / (S.r[0] + S.r[i]));
  assert.ok(worstP < 0.05, 'into him (the walk\'s contact ring then holds him exactly): ' + (worstP * 100).toFixed(1) + '%');
  const L = crowd([[0, 0, 'shambler', { player: true, pinned: true, r: 0.46 }], [0.5, 0, 'shambler', { ai: false, hz: true, hzD: 0.5 }]]);
  solveContacts(L, 1 / 60);
  assert.equal(L.x[1], 0.5, 'a legacy body by him is left to the walk\'s ring'); assert.equal(L.spx[1], 0);
  const C = crowd([[0, 0, 'shambler', { player: true, pinned: true, r: 0.46 }], [0.9, 0, 'demon', { vx: -13 }]]);
  solveContacts(C, 1 / 60);
  assert.equal(C.ev[1], 0, 'a demon charging into him is not bowled by him'); assert.equal(C.shx[1], 0, 'nor bounced');
});

// ---- stage 2: the senses ----
import { AI_TYPES, aiType, SENSE, sightRange, hearRange, inCone, stepAware, newAware, tracking, TRACK_S } from './zombie-ai.js';

test('every kind in ZOMBIE_TYPES has senses, a role, a tell and idles; the bosses always know', () => {
  for (const k of ['shambler', 'feral', 'leaper', 'spider', 'drowned', 'military', 'brute', 'spitter', 'screamer', 'bomber', 'demon', 'colossus', 'guardian', 'caveguard']) {
    const t = AI_TYPES[k]; assert.ok(t && t.role && t.tell && t.idle.length && t.sight.length === 2, k);
    assert.ok(t.notice <= 1, k + ': its tell reads inside a second (the Director\'s bar)');
  }
  assert.equal(aiType('nobody'), AI_TYPES.shambler);
  const a = newAware(); assert.equal(stepAware(a, 'colossus', 0.25, { now: 0 }), 'hunt'); assert.equal(a.state, 'hunting');
});

test('sight: night cuts it, his light in its beam lengthens it, crouched in cover halves it, the fog caps it (never under 6 m)', () => {
  assert.equal(sightRange('shambler', { night: 0 }), 30); assert.equal(sightRange('shambler', { night: 1 }), 12);
  assert.equal(sightRange('shambler', { night: 1, lit: true }), 30);
  assert.equal(sightRange('feral', { night: 0, crouchCover: true }), 17.5);
  assert.equal(sightRange('screamer', { night: 0, fogFar: 20 }), 20); assert.equal(sightRange('screamer', { night: 0, fogFar: 2 }), 6);
  assert.ok(sightRange('screamer', { night: 1 }) > sightRange('shambler', { night: 1 }), 'the spotter sees further');
});

test('hearing scales a sound\'s radius; a feral hears his walk at 10.5 m, a brute at 5.6', () => {
  assert.equal(hearRange('feral', SENSE.STEP.walk), 10.5); assert.ok(Math.abs(hearRange('brute', SENSE.STEP.walk) - 5.6) < 1e-12);
});

test('the cone: a shambler (140 deg) does not see him straight behind it; the spider (200 deg) sees a little behind its shoulders', () => {
  assert.equal(inCone('shambler', 0, 1, 0, 5), true); assert.equal(inCone('shambler', 0, 1, 0, -5), false);
  assert.equal(inCone('shambler', 0, 1, 5, 0.1), false); assert.equal(inCone('spider', 0, 1, 5, -0.5), true);
});

test('awareness: seen at the edge of its sight it notices first (the tell), then hunts after about a second and a half; seen close it hunts at once', () => {
  const a = newAware(), cue = { now: 0, sees: true, seeD: 12, seeR: 12, seeX: 1, seeZ: 2 };
  assert.equal(stepAware(a, 'shambler', 0.25, cue), 'notice'); assert.equal(a.state, 'suspicious'); assert.ok(a.noticeT > 0);
  let t = 0.25, got = ''; while (a.state !== 'hunting' && t < 5) { got = stepAware(a, 'shambler', 0.25, cue); t += 0.25; }
  assert.equal(got, 'hunt'); assert.ok(t >= 0.75 && t <= 2, 'hunting after ' + t + ' s'); assert.deepEqual([a.known.x, a.known.z], [1, 2]);
  const b = newAware(); assert.equal(stepAware(b, 'feral', 0.25, { now: 0, sees: true, seeD: 2, seeR: 18, seeX: 0, seeZ: 0 }), 'hunt');
  assert.equal(b.state, 'hunting'); assert.equal(b.noticeT, AI_TYPES.feral.notice, 'still with its tell (the snap)');
  const c = newAware(); assert.equal(stepAware(c, 'brute', 0.25, { now: 0, feel: true, seeX: 0, seeZ: 0 }), 'hunt', 'felt at arm\'s length: straight to hunting');
});

test('a heard shot makes it suspicious and sends it to the sound; a friend\'s call makes it hunt where he was', () => {
  const a = newAware();
  assert.equal(stepAware(a, 'shambler', 0.25, { now: 0, heard: { x: 5, z: 6 } }), 'notice');
  assert.equal(a.state, 'suspicious'); assert.deepEqual([a.known.x, a.known.z], [5, 6]); assert.equal(a.aware, SENSE.SUSPECT);
  assert.equal(stepAware(a, 'shambler', 0.25, { now: 1, told: { x: 9, z: 9 } }), 'hunt'); assert.equal(a.known.x, 9);
});

test('lost: a hunter that senses nothing for its memory goes searching, then calms down after the search; a wave never calms', () => {
  const a = newAware(); stepAware(a, 'shambler', 0.25, { now: 0, feel: true, seeX: 0, seeZ: 0 });
  let t = 0, got = ''; while (a.state === 'hunting' && t < 30) { got = stepAware(a, 'shambler', 0.25, { now: t, rnd: 0 }); t += 0.25; }
  assert.equal(got, 'lost'); assert.ok(Math.abs(t - AI_TYPES.shambler.memory) < 0.3, 'after ' + t + ' s');
  while (a.state === 'searching' && t < 120) { got = stepAware(a, 'shambler', 0.25, { now: t, rnd: 0 }); t += 0.25; }
  assert.equal(got, 'calm'); assert.equal(a.state, 'idle');
  const w = newAware(); assert.equal(stepAware(w, 'shambler', 0.25, { now: 0, wave: true, hqX: 3, hqZ: 4 }), 'notice');
  assert.equal(w.state, 'suspicious'); assert.equal(w.known.x, 3);
  for (let i = 0; i < 400; i++) stepAware(w, 'shambler', 0.25, { now: i, wave: true, hqX: 3, hqZ: 4 });
  assert.equal(w.state, 'suspicious', 'still coming');
  assert.equal(stepAware(w, 'shambler', 0.25, { now: 1, wave: true, fightNear: true, seeX: 1, seeZ: 1 }), 'hunt', 'in the fight\'s noise: it knows');
});

test('a hunter that loses him goes on at him only for TRACK_S, then to the last place it knew; a call or a sound refreshes what it knows', () => {
  const a = newAware(); stepAware(a, 'shambler', 0.25, { now: 0, feel: true, seeX: 1, seeZ: 1 });
  assert.equal(tracking(a), true);
  let t = 0; while (tracking(a) && t < 5) { stepAware(a, 'shambler', 0.25, { now: t }); t += 0.25; }
  assert.ok(Math.abs(t - TRACK_S) < 0.3 && a.state === 'hunting', 'stops tracking him after ' + t + ' s, still hunting');
  stepAware(a, 'shambler', 0.25, { now: 3, told: { x: 40, z: 25 } }); assert.deepEqual([a.known.x, a.known.z], [40, 25], 'the spotter\'s call');
  stepAware(a, 'shambler', 0.25, { now: 4, heard: { x: 7, z: 8 } }); assert.deepEqual([a.known.x, a.known.z], [7, 8]); assert.equal(tracking(a), true, 'heard him: has him again');
});
