// studio/motion-horde.test.mjs — the horde's reactions (D-42, P-70 to P-72), on the studio's zombie
// stand-ins dressed as the game's zombies. Real three.js maths in Node:
//   node --import ./studio/node-three.mjs --test studio/motion-horde.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { rigs } from './rigs.js';
import { makeZombieRig } from './zombie.js';
import { makeMarineRig } from './marine.js';
import { presets } from './motion/index.js';
import { createHorde, hordePresetFor, HORDE_PARTS } from './motion-horde.js';

const clipOf = (r) => { try { return JSON.parse(fs.readFileSync(new URL(`./clips/${r}.json`, import.meta.url), 'utf8')); } catch { return null; } };

// A studio stand-in (studio/zombie.js) with the userData names the game's makeZombieMesh() gives its
// joints, so the horde adopts it exactly as it adopts a game zombie. Faces +Z; the host's AI would turn it.
function mockZombie(typeKey = 'shambler', x = 0, z = 0) {
  const rigType = ['brute', 'demon', 'feral'].includes(typeKey) ? typeKey : 'shambler';
  const mesh = makeZombieRig({ type: rigType, scale: typeKey === 'brute' ? 1.38 : undefined });
  const r = mesh.userData.rig;
  Object.assign(mesh.userData, { hips: r.pelvis, torso: r.spine, head: r.head, armLG: r.shoulderL, armRG: r.shoulderR, legLG: r.hipL, legRG: r.hipR });
  mesh.position.set(x, 0, z);
  return { mesh, typeKey, alive: true, crawling: false, spider: typeKey === 'spider', partsLost: Object.fromEntries(HORDE_PARTS.map((k) => [k, false])) };
}
// A close shotgun shell: seven pellets of one shot, 0.93 each (docs/studio.md §10.6), from in front.
const shell = (h, z, shot, per = 6.5 / 7) => {
  let ok = true;
  for (let i = 0; i < 7; i++) ok = h.hit(z, { at: [z.mesh.position.x + (i - 3) * 0.02, 1.0, z.mesh.position.z], dir: [0, 0, -1], power: per, kind: 'pellet', shot }) && ok;
  return ok;
};
// Runs the horde at 60 fps for `secs`, collecting events per key.
function run(h, secs, each) {
  const ev = new Map();
  for (let f = 0; f < Math.round(secs * 60); f++) {
    if (each) each(f);
    for (const e of h.update(1 / 60)) { if (!ev.has(e.key)) ev.set(e.key, []); ev.get(e.key).push(e.name); }
  }
  return ev;
}
const names = (ev, k) => ev.get(k) || [];

test('the preset follows the zombie type, and what cannot react is refused', () => {
  assert.equal(hordePresetFor({ typeKey: 'brute' }), 'zombie/brute');
  assert.equal(hordePresetFor({ typeKey: 'demon' }), 'zombie/brute');
  assert.equal(hordePresetFor({ typeKey: 'feral' }), 'zombie/feral');
  for (const t of ['shambler', 'military', 'bomber', 'screamer', 'drowned', 'leaper', 'spitter']) assert.equal(hordePresetFor({ typeKey: t }), 'zombie/shambler', t);
  for (const t of ['spider', 'colossus', 'caveguard']) assert.equal(hordePresetFor({ typeKey: t }), null, t);
  const h = createHorde({ presets });
  assert.equal(h.hit(mockZombie('colossus'), { power: 3 }), false, 'the colossus never reacts');
  const notGame = { mesh: new THREE.Group(), typeKey: 'shambler', partsLost: {} };
  assert.equal(h.hit(notGame, { power: 3 }), false, 'a mesh without the game zombie joints is refused');
  const crawler = mockZombie(); crawler.crawling = true;
  assert.equal(h.hit(crawler, { power: 3 }), false, 'a crawler keeps the old reaction');
  assert.equal(h.hit(mockZombie(), { power: 3, kind: 'laser' }), false, 'an unknown hit kind is refused, not thrown');
  assert.equal(h.stats.attached, 2, 'the crawler and the laser target were adopted (stand-ins with the right joints); nothing else');
});

test('a zombie is adopted on its first hit, once per mesh, and reacts through update()', () => {
  const h = createHorde({ presets });
  const z = mockZombie();
  assert.equal(h.has(z), false);
  assert.ok(h.hit(z, { at: 'chest', dir: [0, 0, -1], power: 2.5, kind: 'bullet' }));
  assert.equal(h.has(z), true);
  const inst = z.mesh.userData.hordeBody.inst;
  assert.equal(h.state(z), 'animated', 'the hit waits for update()');
  const ev = run(h, 3);
  assert.ok(names(ev, z).includes('hit') && names(ev, z).includes('recovered'), names(ev, z).join(' '));
  assert.ok(!names(ev, z).includes('fall'), 'a rifle round is a flinch: ' + names(ev, z).join(' '));
  h.release(z);
  const z2 = { ...mockZombie(), mesh: z.mesh };                  // the pool hands the mesh to a new zombie
  assert.ok(h.hit(z2, { power: 2.5 }));
  assert.equal(z2.mesh.userData.hordeBody.inst, inst, 'the mesh adopted once: its rig is reused');
});

test('a shell\'s pellets on one body in one frame are one hit: a close shell drops a shambler, and it gets up', () => {
  const h = createHorde({ presets });
  const z = mockZombie();
  assert.ok(shell(h, z, 1));
  const powers = [];
  const busy = [];
  const ev = new Map();
  for (let f = 0; f < 6 * 60; f++) {
    for (const e of h.update(1 / 60)) {
      if (!ev.has(e.key)) ev.set(e.key, []);
      ev.get(e.key).push(e.name);
      if (e.name === 'hit') powers.push(e.data.power);
    }
    busy.push(h.busy(z));
  }
  assert.equal(powers.length, 1, 'seven pellets, one hit');
  assert.ok(Math.abs(powers[0] - 6.5) < 1e-9, `summed to ${powers[0]}`);
  const order = ['fall', 'down', 'getup', 'recovered'].map((e) => names(ev, z).indexOf(e));
  assert.ok(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])), names(ev, z).join(' '));
  assert.ok(busy.some((b) => b) && !busy[busy.length - 1], 'busy while down, free again after');
  assert.equal(h.state(z), 'animated');
  // The drift went to the host: it was shoved back (it faces +Z, the shell came from in front).
  assert.ok(z.mesh.position.z < -0.1, `moved back by the shell (${z.mesh.position.z.toFixed(2)} m)`);
});

test('a shell far off (fewer pellets, less each) staggers but does not drop it; a brute shrugs off a close one', () => {
  const h = createHorde({ presets });
  const far = mockZombie('shambler', 0, 0), brute = mockZombie('brute', 4, 0);
  for (let i = 0; i < 4; i++) h.hit(far, { at: [0, 1, 0], dir: [0, 0, -1], power: 0.8, kind: 'pellet', shot: 7 });
  shell(h, brute, 8);
  const ev = run(h, 3);
  assert.ok(names(ev, far).includes('stagger') && !names(ev, far).includes('fall'), names(ev, far).join(' '));
  assert.ok(!names(ev, brute).includes('fall') && !names(ev, brute).includes('stagger'), names(ev, brute).join(' '));
});

test('a kill leaves a ragdoll that lies on the ground, settles, and is reported so the host freezes it', () => {
  const seen = [];
  const h = createHorde({ presets, onEvent: (k, name) => seen.push(name) });
  const z = mockZombie();
  // Two pellets land, then the third kills: the corpse is thrown by all three.
  h.hit(z, { at: [0, 1, 0], dir: [0, 0, -1], power: 1, kind: 'pellet', shot: 3 });
  h.hit(z, { at: [0, 1, 0], dir: [0, 0, -1], power: 1, kind: 'pellet', shot: 3 });
  assert.ok(h.kill(z, { at: [0, 1, 0], dir: [0, 0, -1], power: 1, kind: 'pellet', shot: 3 }));
  assert.ok(h.kill(z, { power: 1 }), 'a second kill is a no-op');
  const kills = [], hits = [];
  const b = z.mesh.userData.hordeBody.body, bk = b.kill, bh = b.hit;
  b.kill = (o) => { kills.push(o); return bk(o); };
  b.hit = (o) => { hits.push(o); return bh(o); };
  const ev = run(h, 5);
  assert.ok(names(ev, z).includes('dead') && names(ev, z).includes('settled'), names(ev, z).join(' '));
  assert.equal(hits.length, 0, 'no separate hits');
  assert.equal(kills.length, 1);
  assert.ok(Math.abs(kills[0].power - 3) < 1e-9 && kills[0].kind === 'pellet', `the kill took its shell's pellets with it (${kills[0].power})`);
  assert.ok(h.frozen(z), 'frozen once settled');
  assert.ok(seen.includes('settled'), 'onEvent heard it');
  const p = h.body(z).points();
  assert.ok(p.pelvis[1] < 0.3 && p.chest[1] < 0.35, `lying (pelvis ${p.pelvis[1].toFixed(2)}, chest ${p.chest[1].toFixed(2)})`);
  // Frozen: it costs nothing and its joints stay as they lie.
  const q = z.mesh.userData.hips.quaternion.clone();
  h.update(1 / 60);
  assert.equal(h.stats.awake, 0);
  assert.ok(z.mesh.userData.hips.quaternion.equals(q));
  assert.equal(h.hit(z, { power: 3 }), false, 'a corpse takes no more hits');
});

test('at most `max` simulate at once; a corpse on the ground gives up its slot, a body in the air never does', () => {
  const h = createHorde({ presets, max: 3 });
  const zs = [0, 1, 2, 3, 4].map((i) => mockZombie('shambler', i * 3, 0));
  assert.ok(h.kill(zs[0], { at: 'head', dir: [0, 0, -1], power: 3 }));
  assert.ok(h.hit(zs[1], { power: 4.5, kind: 'pellet' }) && h.hit(zs[2], { power: 4.5, kind: 'pellet' }));
  assert.equal(h.stats.active, 3);
  assert.equal(h.hit(zs[3], { power: 4.5, kind: 'pellet' }), false, 'full, and the corpse is still in the air: refused');
  assert.equal(h.stats.refused, 1);
  // The corpse lands (and has not settled yet: it has to lie still for half a second first).
  let lying = 1;
  for (let f = 0; f < 120 && lying >= 0.4; f++) { h.update(1 / 60); lying = h.body(zs[0]).points().pelvis[1]; }
  assert.ok(h.state(zs[0]) === 'dead' && !h.frozen(zs[0]), 'still settling');
  assert.ok(lying < 0.4, `down on the ground (${lying.toFixed(2)})`);
  assert.ok(h.hit(zs[3], { power: 4.5, kind: 'pellet' }), 'the lying corpse gives up its slot');
  assert.ok(h.frozen(zs[0]), 'and is frozen where it lies');
  const ev = run(h, 0.1);
  assert.ok(names(ev, zs[0]).includes('frozen'));
  assert.ok(h.stats.active <= 3);
});

test('lod comes from lodFor(x, z) and goes to the engine; lost parts go to lose() when the engine has it', () => {
  const seen = [];
  const h = createHorde({ presets, lodFor: (x, z) => { seen.push([x, z]); return x > 10 ? 2 : 0; } });
  const near = mockZombie('shambler', 0, 0), far = mockZombie('shambler', 20, 0);
  h.hit(near, { power: 2.5 }); h.hit(far, { power: 2.5 });
  const lods = new Map();
  for (const z of [near, far]) {
    // Stand in for an engine with contracts 3 and 4: record what the horde hands it.
    const b = z.mesh.userData.hordeBody.body, up = b.update;
    b.update = (dt, o) => { lods.set(z, o && o.lod); return up(dt, o); };
    b.lose = (part) => { (b.lostParts ||= []).push(part); };
  }
  far.partsLost.armL = true;
  h.update(1 / 60);
  assert.equal(lods.get(near), 0);
  assert.equal(lods.get(far), 2);
  assert.ok(seen.some(([x]) => Math.abs(x - 20) < 1e-6), 'asked at the body\'s own place');
  assert.deepEqual(far.mesh.userData.hordeBody.body.lostParts, ['armL']);
  assert.equal(h.stats.lod[2], 1);
  far.partsLost.head = true;
  h.update(1 / 60);
  assert.deepEqual(far.mesh.userData.hordeBody.body.lostParts, ['armL', 'head'], 'each part once');
});

test('getting up: with a clip for its side, the rig turns to the heading and plays it from the start (contract 1)', () => {
  // The engine package authors zombie/getup-back; zombie/idle stands in for it here.
  const withClip = { names: presets.names, json: (r) => r === 'zombie/test-getup' ? { ...presets.json('zombie/shambler'), name: 'test-getup', getup: { time: 1.0, back: 'zombie/idle' } } : presets.json(r) };
  const h = createHorde({ presets: withClip, clips: clipOf, presetFor: () => 'zombie/test-getup' });
  const z = mockZombie();
  assert.ok(shell(h, z, 5));
  h.update(1 / 60);
  const b = z.mesh.userData.hordeBody.body, up = b.update;
  // Stand in for an engine with contract 1: its getup event says which way it lies and faces.
  b.update = (dt, o) => up(dt, o).map((e) => (e[0] === 'getup' ? ['getup', { side: 'back', heading: 1.2 }] : e));
  let played = false, yawAt = null;
  const ev = run(h, 6, () => {
    const c = z.mesh.userData.hordeBody;
    if (h.state(z) === 'getup' && c.player && c.player.clip) { played = true; if (yawAt === null) yawAt = z.mesh.rotation.y; }
  });
  assert.ok(names(ev, z).includes('getup') && names(ev, z).includes('recovered'), names(ev, z).join(' '));
  assert.ok(played, 'the clip played while it got up');
  assert.ok(Math.abs(yawAt - 1.2) < 1e-6, `faced the heading (${yawAt})`);
  // The engine's own getup event (contract 1 is in: it says which side and which way) plays the clip too.
  const h2 = createHorde({ presets: withClip, clips: clipOf, presetFor: () => 'zombie/test-getup' });
  const z2 = mockZombie();
  shell(h2, z2, 6);
  let played2 = false;
  run(h2, 6, () => { const c = z2.mesh.userData.hordeBody; if (h2.state(z2) === 'getup' && c.player && c.player.clip) played2 = true; });
  assert.ok(played2, 'the clip played on the engine\'s own getup event');
});

test('the hips go back where the host keeps them: after a reaction, and on release', () => {
  // The game poses its zombie's hips height every frame and never their place across the ground; a
  // reaction moves all three. Played like the game: hips.y set each frame before the horde's update.
  const h = createHorde({ presets, max: 2 });
  const a = mockZombie('shambler', 0, 0), b = mockZombie('shambler', 3, 0);
  const hips = a.mesh.userData.hips;
  h.hit(a, { at: 'chest', dir: [0.6, 0, -1], power: 4.5, kind: 'pellet' });
  let moved = 0;
  const ev = run(h, 3, () => { hips.position.y = 0.55; moved = Math.max(moved, Math.hypot(hips.position.x, hips.position.z)); });
  assert.ok(names(ev, a).includes('stagger') && names(ev, a).includes('recovered'), names(ev, a).join(' '));
  assert.ok(moved > 0.005, `the reaction moved the hips (${moved.toFixed(3)} m)`);
  assert.equal(hips.position.x, 0); assert.equal(hips.position.z, 0);
  // Released mid-fall: the slot goes back, and so do the hips.
  h.hit(a, { power: 6.5, kind: 'pellet' }); h.hit(b, { power: 6.5, kind: 'pellet' });
  run(h, 0.5);
  assert.equal(h.stats.active, 2);
  hips.position.x = 0.2;
  h.release(a);
  assert.equal(hips.position.x, 0); assert.equal(hips.position.z, 0);
  assert.equal(h.stats.active, 1);
  assert.equal(h.has(a), false);
  h.releaseAll();
  assert.equal(h.stats.attached, 0);
  assert.equal(h.stats.active, 0);
});

test('at most three meshes adopt a frame (it costs about 0.4 ms each); the rest keep the old reaction till later', () => {
  const h = createHorde({ presets });
  const zs = [0, 1, 2, 3, 4].map((i) => mockZombie('shambler', i * 2, 0));
  const first = zs.map((z) => h.hit(z, { power: 2.5 }));
  assert.deepEqual(first, [true, true, true, false, false]);
  assert.equal(h.stats.attached, 3);
  h.update(1 / 60);
  assert.ok(h.hit(zs[3], { power: 2.5 }) && h.hit(zs[4], { power: 2.5 }), 'next frame they adopt');
  // An adopted mesh (back from the pool on a new zombie) doesn't count: it is already paid for.
  h.update(1 / 60);
  h.release(zs[0]);
  const again = { ...mockZombie(), mesh: zs[0].mesh };
  const more = [5, 6, 7].map((i) => mockZombie('shambler', i * 2, 0));
  assert.deepEqual([...more.map((z) => h.hit(z, { power: 2.5 })), h.hit(again, { power: 2.5 })], [true, true, true, true]);
});

test('the same hits play the same way every time (no randomness in the horde)', () => {
  const once = () => {
    const h = createHorde({ presets });
    const zs = [mockZombie('shambler', 0, 0), mockZombie('feral', 2, 0), mockZombie('brute', 4, 0)];
    run(h, 2, (f) => { if (f === 5) for (const z of zs) shell(h, z, 1); if (f === 40) h.kill(zs[1], { power: 3 }); });
    return zs.map((z) => [z.mesh.position.x, z.mesh.position.z, ...h.body(z).points().pelvis]);
  };
  assert.deepEqual(once(), once());
});

test('the marine: a brute\'s blow staggers him and he keeps his feet; a bomber at 1 m puts him down and he is up fast', () => {
  const moved = [];
  const h = createHorde({ presets });
  const swiped = makeMarineRig(), blasted = makeMarineRig();
  swiped.userData = { ...swiped.userData, ...rigNames(swiped) };
  blasted.userData = { ...blasted.userData, ...rigNames(blasted) };
  blasted.position.set(5, 0, 0);
  assert.ok(h.adopt('swiped', { rig: 'marine', preset: 'marine/marine', group: swiped, move: (dx, dz) => moved.push([dx, dz]) }));
  assert.ok(h.adopt('blasted', { rig: 'marine', preset: 'marine/marine', group: blasted }));
  assert.ok(h.hit('swiped', { at: 'shoulderR', dir: [-0.2, 0.1, -1], power: 4, kind: 'crush' }));
  assert.ok(h.hit('blasted', { at: 'pelvis', dir: [0, 0.3, -1], power: 7, kind: 'blast' }));
  let downAt = -1, upAt = -1, f = 0;
  const ev = run(h, 4, (k) => { f = k; if (downAt < 0 && h.state('blasted') === 'down') downAt = k; if (downAt >= 0 && upAt < 0 && h.state('blasted') === 'animated') upAt = k; });
  assert.ok(names(ev, 'swiped').includes('step') && !names(ev, 'swiped').includes('fall'), names(ev, 'swiped').join(' '));
  assert.ok(names(ev, 'blasted').includes('down') && names(ev, 'blasted').includes('recovered'), names(ev, 'blasted').join(' '));
  assert.ok(upAt - downAt < 1.5 * 60, `up ${((upAt - downAt) / 60).toFixed(2)} s after he went down`);
  assert.ok(moved.length > 0, 'his drift went to the host\'s move()');
  assert.equal(h.stats.active, 0, 'the marine has no pool slot; both recovered');
  void f;
});
test('a host that poses only some Euler angles each frame (as the game does) calls beginFrame, and the reaction stays a reaction', () => {
  // updateMarinePose sets the hips' yaw, roll and height, the torso's lean, roll, twist and height, and
  // each leg's and knee's swing, and never the hips' pitch. Without beginFrame the reaction's pitch stayed
  // in what the body read as the animation, fed on itself, and a brute's blow threw him metres up.
  const h = createHorde({ presets });
  const g = makeMarineRig();
  g.userData = { ...g.userData, ...rigNames(g) };
  const u = g.userData;
  h.adopt('m', { rig: 'marine', preset: 'marine/marine', group: g });
  h.hit('m', { at: 'shoulderR', dir: [-1, 0.1, 0], power: 4.29, kind: 'crush' });
  const ev = [];
  let top = 0;
  for (let f = 0; f < 300; f++) {
    h.beginFrame();
    u.lowerBody.rotation.y = 0; u.lowerBody.rotation.z = 0; u.lowerBody.position.y = 0;
    u.torsoG.rotation.x = 0; u.torsoG.rotation.z = 0; u.torsoG.rotation.y = 0; u.torsoG.position.y = 0.7;
    u.legLG.rotation.x = 0; u.legRG.rotation.x = 0; u.kneeLG.rotation.x = 0; u.kneeRG.rotation.x = 0;
    for (const e of h.update(1 / 60)) ev.push(e.name);
    top = Math.max(top, h.body('m').points().pelvis[1]);
  }
  assert.ok(ev.includes('recovered') && !ev.includes('fall'), ev.join(' '));
  assert.ok(top < 1, `the pelvis never went above ${top.toFixed(2)} m`);
  assert.ok(Math.abs(u.lowerBody.rotation.x) < 1e-6, `and the hips are the animation's again (pitch ${u.lowerBody.rotation.x})`);
});

// The game marine's userData names (makeMarine), from the stand-in's rig, so adoptMarine() finds them.
function rigNames(g) {
  const r = g.userData.rig;
  return { lowerBody: r.pelvis, legLG: r.hipL, kneeLG: r.kneeL, ankleLG: r.ankleL, legRG: r.hipR, kneeRG: r.kneeR, ankleRG: r.ankleR, torsoG: r.spine, armLG: r.shoulderL, elbowLG: r.elbowL, gripL: r.handL, armRG: r.shoulderR, elbowRG: r.elbowR, gripR: r.handR, headG: r.head };
}

test('48 zombies with 8 reacting cost well under a millisecond or two a frame', () => {
  const h = createHorde({ presets, max: 8 });
  const zs = [];
  for (let i = 0; i < 48; i++) zs.push(mockZombie(i % 6 === 0 ? 'feral' : 'shambler', (i % 8) * 2.5, Math.floor(i / 8) * 2.5));
  // Everyone adopted (three a frame, a hit each: the first eight react, the rest are refused but kept),
  // then eight at a time hit again and simulating together.
  run(h, 1.5, (f) => { if (f < 20) for (const z of zs) if (!h.has(z)) h.hit(z, { power: 0.5 }); });
  assert.equal(h.stats.attached, 48);
  let ms = 0, frames = 0, awake = 0;
  run(h, 2, (f) => {
    if (f % 20 === 0) for (let i = 0; i < 8; i++) shell(h, zs[(i * 5 + f) % 48], 100 + f * 10 + i, 4 / 7);
    const t0 = performance.now(); h.update(1 / 60); ms += performance.now() - t0; frames++;
    awake = Math.max(awake, h.stats.awake);
  });
  const avg = ms / frames;
  console.log(`  48 attached, up to ${awake} awake: ${avg.toFixed(3)} ms a frame`);
  assert.ok(h.stats.active <= 8 && awake <= 8 + 1, `awake ${awake}`);
  assert.ok(avg < 2, `${avg.toFixed(3)} ms a frame`);
  assert.equal(rigs.names().includes('zombie'), true);
});

// --- Review fixes (GB-65 to GB-67 review, 2026-09-26) ----------------------------------------------

test('a corpse frozen between beginFrame() and update() stays lying (a full pool\'s new hit, or the host\'s freeze)', () => {
  for (const how of ['pool', 'host']) {
    const h = createHorde({ presets, max: 1 });
    const dead = mockZombie('shambler', 0, 0), next = mockZombie('shambler', 4, 0);
    assert.ok(h.kill(dead, { at: 'chest', dir: [0, 0, -1], power: 3 }));
    const head = new THREE.Vector3();
    const headY = () => { dead.mesh.updateWorldMatrix(true, true); return dead.mesh.userData.head.getWorldPosition(head).y; };
    // Down on the ground and not yet settled, the way the game runs a frame: beginFrame, hits, update.
    for (let f = 0; f < 120 && (f < 10 || h.body(dead).points().head[1] >= 0.35); f++) { h.beginFrame(); h.update(1 / 60); }
    assert.ok(!h.frozen(dead), how + ': still settling');
    h.beginFrame();
    if (how === 'pool') assert.ok(h.hit(next, { power: 4.5, kind: 'pellet' }), 'the corpse gives up its slot');
    else h.freeze(dead);
    assert.ok(h.frozen(dead));
    let worst = 0;
    for (let f = 0; f < 40; f++) { if (f) h.beginFrame(); h.update(1 / 60); worst = Math.max(worst, headY()); }
    assert.ok(worst < 0.5, `${how}: its head drawn ${worst.toFixed(2)} m up (lying is under 0.5 m)`);
  }
});

test('the marine keeps walking while a blow staggers him: the body goes where the host moves him', () => {
  const h = createHorde({ presets });
  const g = makeMarineRig();
  g.userData = { ...g.userData, ...rigNames(g) };
  // The host: walking him on at 5 m/s x 0.6 (the game's pace while he reacts), and taking his drift.
  assert.ok(h.adopt('m', { rig: 'marine', preset: 'marine/marine', group: g, move: (dx, dz) => { g.position.x += dx; g.position.z += dz; } }));
  assert.ok(h.hit('m', { at: 'shoulderR', dir: [-0.2, 0.1, -1], power: 4, kind: 'crush' }));
  let asked = 0, reacting = 0;
  const x0 = g.position.x;
  for (let f = 0; f < 120; f++) {
    h.beginFrame();
    if (f > 0 && h.state('m') === 'react') { g.position.x += 5 * 0.6 / 60; asked += 5 * 0.6 / 60; reacting++; }
    h.update(1 / 60);
  }
  assert.ok(reacting > 20, `he reacted for ${reacting} frames`);
  const went = g.position.x - x0;
  assert.ok(went > asked * 0.7, `asked to walk ${asked.toFixed(2)} m, went ${went.toFixed(2)} m (the stagger rooted him before)`);
  const p = h.body('m').points().pelvis;
  assert.ok(Math.abs(p[0] - g.position.x) < 0.4, `his body went with him (pelvis at x ${p[0].toFixed(2)}, group at ${g.position.x.toFixed(2)})`);
});

test('a wall holds a reacting body: a blast beside it leaves the zombie on its own side (the host\'s solve hook)', () => {
  const WALL = 0.5;                                   // a wall along x = 0.5; the zombie stands at 0, blown toward it
  const solve = (key, x, z) => ({ x: Math.min(x, WALL - 0.3), z });
  for (const withWall of [false, true]) {
    const h = createHorde({ presets, solve: withWall ? solve : undefined });
    const z = mockZombie();
    assert.ok(h.hit(z, { at: 'pelvis', dir: [1, 0.3, 0], power: 8, kind: 'blast' }));
    let far = -Infinity;
    for (let f = 0; f < 240; f++) { h.beginFrame(); h.update(1 / 60); far = Math.max(far, h.body(z).points().pelvis[0], z.mesh.position.x); }
    if (withWall) assert.ok(far < WALL, `with the wall it got to x ${far.toFixed(2)} (the wall is at ${WALL})`);
    else assert.ok(far > WALL + 0.5, `with no wall the blast carries it ${far.toFixed(2)} m (so the test means something)`);
  }
});

test('a hit at a point the body lacks, or at no point at all, is refused up front, not thrown inside update()', () => {
  const h = createHorde({ presets });
  const z = mockZombie();
  assert.equal(h.hit(z, { at: 'shoulder', dir: [0, 0, -1], power: 3, kind: 'bullet' }), false, 'no point "shoulder"');
  assert.equal(h.hit(z, { at: [0, NaN, 0], dir: [0, 0, -1], power: 3, kind: 'bullet' }), false, 'not a point');
  assert.equal(h.kill(z, { at: 'tail', power: 3 }), false);
  assert.doesNotThrow(() => run(h, 0.5));
  assert.ok(h.hit(z, { at: 'shoulderR', dir: [0, 0, -1], power: 3, kind: 'bullet' }), 'a real point still takes it');
  assert.doesNotThrow(() => run(h, 0.5));
});

test('reactions switched off mid-game: the living let go, a corpse stays as it lies until the host releases it', () => {
  const h = createHorde({ presets });
  const dead = mockZombie('shambler', 0, 0), live = mockZombie('shambler', 4, 0);
  assert.ok(h.kill(dead, { at: 'chest', dir: [0, 0, -1], power: 3 }));
  assert.ok(h.hit(live, { power: 4.5, kind: 'pellet' }));
  for (let f = 0; f < 120 && (f < 10 || h.body(dead).points().head[1] >= 0.35); f++) { h.beginFrame(); h.update(1 / 60); }
  const headY = () => { dead.mesh.updateWorldMatrix(true, true); return dead.mesh.userData.head.getWorldPosition(new THREE.Vector3()).y; };
  const lying = headY();
  h.releaseLiving();
  assert.equal(h.has(live), false, 'the living body is let go');
  assert.ok(h.has(dead) && h.frozen(dead), 'the corpse is kept, frozen');
  for (let f = 0; f < 10; f++) h.beginFrame();         // the game keeps calling it; update() doesn't run while off
  assert.ok(Math.abs(headY() - lying) < 1e-6 && lying < 0.5, `its head stays at ${lying.toFixed(2)} m`);
  h.release(dead);                                       // finishCorpse: the pose goes back before the pool has the mesh
  assert.equal(h.has(dead), false);
  assert.ok(headY() > 1, 'released, the mesh has its animated pose back for the pool');
});
