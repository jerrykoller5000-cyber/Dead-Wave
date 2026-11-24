// world/training-kitprops.test.mjs - CG-7 (Jerry D-226): the Training props are built at real size, and the first three
// (mug, clipboard, brass bucket) can be shot loose: a round's box per prop, the baked still shape folded away and a loose
// copy in its place, pieces pooled and capped, nothing running at rest, everything back on reset.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../tools/tests/fakethree.mjs';
import * as R3 from '../vendor/three/three.core.js';   // CH-3 #18: the switch's seating, with three's real shapes (the fake's torus has no arc)
import { buildTrainingGround } from './training.js';
import { KIT_PROPS, KIT_DEBRIS, buildKitProp, kitReach } from './training-kitprops.js';
import { traceTraining } from './training-ballistics.js';

const mk = (geo, sw, x, y, z, parent) => { const m = new T.Mesh(geo, new T.MeshBasicMaterial()); m.position.set(x, y, z); parent.add(m); return m; };
const sizeOf = (g) => { const b = new T.Box3(); g.updateMatrixWorld(true); const v = new T.Vector3();
  g.traverse((o) => { if (!o.isMesh) return; const P = o.geometry.attributes.position; for (let k = 0; k < P.count; k++) b.expandByPoint(v.fromBufferAttribute(P, k).applyMatrix4(o.matrixWorld)); });
  return b; };

test('every prop is built, at its real size', () => {
  for (const id of Object.keys(KIT_PROPS)) {
    const g = buildKitProp(T, id, { mk, tiny: (m) => m });
    let n = 0; g.traverse((o) => { if (o.isMesh) n++; }); assert.ok(n >= 3, id + ' has its parts (' + n + ')');
    const b = sizeOf(g), h = b.max.y - b.min.y, w = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
    if (id !== 'mop') assert.ok(b.min.y > -0.002, id + ' stands on its base (' + b.min.y.toFixed(4) + ')');   // (the mop's origin is its clamp)
    const K = KIT_PROPS[id];
    if (id === 'mug') assert.ok(Math.abs(h - K.h) < 0.005 && w < 0.12, 'mug ' + h.toFixed(3) + ' x ' + w.toFixed(3));
    if (id === 'brassBucket') assert.ok(Math.abs(h - K.h) < 0.02 && w < 0.4, 'bucket ' + h.toFixed(3));
    if (id === 'clipboard') assert.ok(h < 0.04 && Math.abs(w - K.d) < 0.04, 'clipboard ' + h.toFixed(3) + ' x ' + w.toFixed(3));
    if (id === 'earTray') assert.ok(h < 0.14 && w < 0.56, 'ear tray ' + h.toFixed(3) + ' x ' + w.toFixed(3));
  }
});

test('all eight props have a box each a round meets, and are found in the baked kit mesh', () => {
  const tg = buildTrainingGround(T), kp = tg.kitProps;
  assert.ok(kp, 'tg.kitProps');
  assert.equal(kp.solids.length, 12);   // CG-7 step 3 (D-237 #11): was the first three; + the glove (CH-3 #18); + the board's markers, the sharps bin, the medic's mug (CG-7 s2)
  for (const s of kp.solids) { assert.ok(tg.solids.includes(s), s.kitProp + ' in tg.solids'); assert.ok(s.maxY > s.minY && s.maxX > s.minX, s.kitProp + ' has a box'); assert.ok(!s.mesh); }
  assert.equal(kp.bind(), 12, 'all twelve found in the baked mesh');
  assert.equal(kp.update(1 / 60), 0, 'nothing loose: nothing runs');
});

test('a round shatters the mug; the shards settle and fade; reset puts it back', () => {
  const tg = buildTrainingGround(T), kp = tg.kitProps, s = kp.solids.find((q) => q.kitProp === 'mug'), e = kp.entries[s.kitIndex];
  const P = e.range ? e.range.mesh.geometry.attributes.position : null;
  kp.bind(); const before = e.range.mesh.geometry.attributes.position.array.slice(e.range.start * 3, (e.range.start + e.range.count) * 3);
  const c = { x: (s.minX + s.maxX) / 2, y: (s.minY + s.maxY) / 2, z: (s.minZ + s.maxZ) / 2 };
  assert.equal(kp.hit(s, c, { x: 0, y: 0, z: 1 }, 30, 'bullet'), true);
  assert.equal(e.state, 'broken');
  assert.ok(kp.loose() >= 4, 'shards: ' + kp.loose());
  const a = e.range.mesh.geometry.attributes.position.array, st = e.range.start * 3;
  assert.ok(a[st + 3] === a[st] && a[st + 7] === a[st + 1], 'the still mug is folded away');
  assert.ok(s.minY < -1e8, 'its box is gone');
  assert.equal(kp.hit(s, c, { x: 0, y: 0, z: 1 }, 30), false, 'a broken mug takes no more');
  let t = 0; while (kp.loose() && t < 30) { kp.update(1 / 30); t += 1 / 30; }
  assert.equal(kp.loose(), 0, 'every shard settled and faded (' + t.toFixed(1) + ' s)');
  assert.ok(t > KIT_DEBRIS.fadeAfter, 'they lay a while first');
  kp.reset();
  const after = e.range.mesh.geometry.attributes.position.array.slice(e.range.start * 3, (e.range.start + e.range.count) * 3);
  assert.deepEqual(Array.from(after), Array.from(before), 'reset: the mug is back');
  assert.equal(e.state, 'still'); assert.ok(s.minY > -1e8, 'and its box'); void P;
});

test('the clipboard is knocked off and its sheets fly; the bucket tips, spills and dents but never breaks', () => {
  const tg = buildTrainingGround(T), kp = tg.kitProps;
  const cb = kp.solids.find((q) => q.kitProp === 'clipboard'), bk = kp.solids.find((q) => q.kitProp === 'brassBucket');
  const ctr = (s) => ({ x: (s.minX + s.maxX) / 2, y: (s.minY + s.maxY) / 2, z: (s.minZ + s.maxZ) / 2 });
  assert.ok(kp.hit(cb, ctr(cb), { x: 0.2, y: 0, z: 1 }, 30));
  assert.equal(kp.entries[cb.kitIndex].state, 'loose'); assert.ok(kp.loose() >= 4, 'the board and its sheets');
  for (let i = 0; i < 6; i++) assert.ok(kp.hit(bk, ctr(bk), { x: 1, y: 0, z: 0 }, 30) !== false || i > 0);
  assert.notEqual(kp.entries[bk.kitIndex].state, 'broken', 'steel: knocked and dented, not broken');
  assert.ok(kp.loose() <= KIT_DEBRIS.max, 'capped at ' + KIT_DEBRIS.max + ' (' + kp.loose() + ')');
  for (let i = 0; i < 600; i++) kp.update(1 / 60);
  const p = kp.entries[bk.kitIndex].piece; assert.ok(p, 'the bucket lies where it fell');
  assert.ok(p.mesh.position.y > -0.01 && p.mesh.position.y < 0.4, 'on the floor (' + p.mesh.position.y.toFixed(3) + ')');
  const bs = bk; assert.ok(Math.abs((bs.minY + bs.maxY) / 2 - (tg.origin.y + p.mesh.position.y)) < 0.3, 'its box followed it');
  kp.reset(); assert.equal(kp.loose(), 0);
  for (const e of kp.entries) assert.equal(e.state, 'still');
});

test('a blast throws everything in reach; still capped', () => {
  const tg = buildTrainingGround(T), kp = tg.kitProps, s = kp.solids.find((q) => q.kitProp === 'clipboard');
  assert.ok(kp.blast({ x: (s.minX + s.maxX) / 2, y: s.maxY, z: (s.minZ + s.maxZ) / 2 - 0.5 }, 4, 1) >= 2);
  assert.ok(kp.loose() <= KIT_DEBRIS.max);
});

test('no blast or blade through a wall (GP-20208 repro); the same room still reaches', () => {
  const tg = buildTrainingGround(T), kp = tg.kitProps, reach = kitReach(tg, traceTraining);
  const P = { x: tg.origin.x - 10, y: tg.origin.y + 0.908, z: tg.origin.z + 0.6 };   // ChatGPT's point, behind the wall at x -8
  assert.equal(kp.blast(P, 4.5, 1, reach), 0, 'nothing thrown through the wall');
  for (const e of kp.entries) assert.equal(e.state, 'still');
  assert.equal(kp.cut({ x: P.x + 1.5, z: P.z }, { x: 1, z: 0 }, 1.6, reach), 0, 'no blade through it');
  const s = kp.solids.find((q) => q.kitProp === 'clipboard');
  assert.ok(kp.blast({ x: (s.minX + s.maxX) / 2, y: s.maxY, z: (s.minZ + s.maxZ) / 2 - 0.5 }, 4, 1, reach) >= 2, 'same room: thrown');
  kp.reset(); assert.equal(kp.loose(), 0);
  assert.ok(kp.blast(P, 4.5, 1) >= 3, 'no predicate: as before, it reaches (the shell passes one)');
});

test('step 3: the broom snaps, the ear defenders fly, the mop goes over with its bucket; reset puts all back', () => {
  const tg = buildTrainingGround(T), kp = tg.kitProps, by = (id) => kp.solids.find((q) => q.kitProp === id);
  const ctr = (s) => ({ x: (s.minX + s.maxX) / 2, y: (s.minY + s.maxY) / 2, z: (s.minZ + s.maxZ) / 2 });
  const br = by('pushBroom'), et = by('earTray'), mb = by('mopBucket'), mo = by('mop'), sq = by('squeegee');
  for (const s of [br, et, mb, mo, sq]) assert.ok(s, 'a box for each');
  for (let i = 0; i < KIT_DEBRIS.hp.pushBroom; i++) kp.hit(br, ctr(br), { x: 0, y: 0, z: 1 }, 30);
  assert.equal(kp.entries[br.kitIndex].state, 'broken'); assert.ok(br.minX < -1e8, 'its box gone');
  kp.reset();
  kp.hit(et, ctr(et), { x: 1, y: 0, z: 0 }, 30);
  assert.equal(kp.entries[et.kitIndex].state, 'loose'); assert.ok(kp.loose() >= 4, 'the tray and its three defenders (' + kp.loose() + ')');
  kp.reset();
  for (let i = 0; i < 5; i++) kp.hit(mb, ctr(mb), { x: 1, y: 0, z: 0 }, 30);
  assert.equal(kp.entries[mb.kitIndex].state, 'loose', 'plastic tub: knocked about, never broken');
  assert.equal(kp.entries[mo.kitIndex].state, 'loose', 'the mop went with it');
  for (let i = 0; i < 600; i++) kp.update(1 / 60);
  for (const p of kp.pieces()) assert.ok(p.mesh.position.y > -0.02, 'nothing under the floor');
  assert.ok(kp.loose() <= KIT_DEBRIS.max);
  kp.reset(); assert.equal(kp.loose(), 0); for (const e of kp.entries) assert.equal(e.state, 'still');
});

test('r2.1: a fence in front of the wall does not hide it (ChatGPT native r2); a fence alone does not block', () => {
  const tg = buildTrainingGround(T), kp = tg.kitProps, reach = kitReach(tg, traceTraining), O = tg.origin;
  // the east perimeter fence as the live shell has it: x -10.045..-9.955, the grenade point inside its box
  const fence = { minX: O.x - 10.045, maxX: O.x - 9.955, minY: O.y, maxY: O.y + 3, minZ: O.z - 30, maxZ: O.z + 30, perimeterFence: true };
  tg.solids.push(fence);
  const P = { x: O.x - 10, y: O.y + 0.908, z: O.z + 0.6 };
  assert.equal(kp.blast(P, 4.5, 1, reach), 0, 'the wall behind the fence still stops it');
  const mug = kp.solids.find((q) => q.kitProp === 'mug'), M = { x: (mug.minX + mug.maxX) / 2, y: (mug.minY + mug.maxY) / 2, z: (mug.minZ + mug.maxZ) / 2 };
  fence.minX = M.x + 0.7; fence.maxX = M.x + 0.8;   // a fence alone between the blast and the mug, in the same room
  assert.equal(reach({ x: M.x + 1.2, y: M.y, z: M.z }, M, mug), true, 'a fence alone: shrapnel gets through');
  tg.solids.pop();
});

test('r2.2 (Claude 2 speed bar): a hit makes nothing: no geometry, no material, no mesh; Clear all reuses the same shapes', () => {
  let made = 0;
  const C = { ...T };
  for (const k of Object.keys(T)) if (/(Geometry|Material|^Mesh)$/.test(k) && typeof T[k] === 'function') C[k] = class extends T[k] { constructor(...a) { super(...a); made++; } };
  const tg = buildTrainingGround(C), kp = tg.kitProps, ctr = (s) => ({ x: (s.minX + s.maxX) / 2, y: (s.minY + s.maxY) / 2, z: (s.minZ + s.maxZ) / 2 });
  assert.ok(kp.warm() >= 9, 'every prop ready at the build');
  kp.update(1 / 60);
  const shapes = () => new Set(kp.pieces().map((p) => p.mesh.geometry));
  made = 0;
  for (const s of kp.solids) for (let i = 0; i < 4; i++) kp.hit(s, ctr(s), { x: 0.3, y: 0, z: 1 }, 30);
  assert.ok(kp.blast(ctr(kp.solids[0]), 4, 1) >= 0);
  for (let i = 0; i < 30; i++) kp.update(1 / 60);
  assert.equal(made, 0, 'nothing made on a hit, a blast or a frame (' + made + ')');
  const first = shapes(); assert.ok(first.size >= 8, 'bits loose (' + first.size + ')');
  for (const p of kp.pieces()) assert.notEqual(p.mesh.geometry.attributes.position.count, 0);
  kp.reset(); assert.equal(kp.loose(), 0);
  for (const s of kp.solids) for (let i = 0; i < 4; i++) kp.hit(s, ctr(s), { x: 0.3, y: 0, z: 1 }, 30);
  assert.equal(made, 0, 'and again after Clear all');
  for (const g of shapes()) assert.ok(g.userData.kitShape, 'a ready shape');
  kp.reset();
});

test('r2.2b (ChatGPT native: first break uploaded 0.5 MB in one frame): every ready shape is drawn once before any hit, then gone', () => {
  const tg = buildTrainingGround(T), kp = tg.kitProps;
  const n = kp.prime(true); assert.ok(n >= 40, 'a primer mesh a shape (' + n + ')');
  const pr = tg.group.getObjectByName ? tg.group.getObjectByName('training-kit-primer') : null;
  let g = null; tg.group.traverse((o) => { if (o.name === 'training-kit-primer') g = o; });
  assert.ok(g && g.children.every((m) => m.frustumCulled === false && m.scale.x < 1e-3), 'never culled, nothing to see'); void pr;
  assert.equal(kp.prime(false), 0); g = null; tg.group.traverse((o) => { if (o.name === 'training-kit-primer') g = o; }); assert.equal(g, null, 'gone after');
  const tg2 = buildTrainingGround(T), kp2 = tg2.kitProps, has = () => { let f = false; tg2.group.traverse((o) => { if (o.name === 'training-kit-primer') f = true; }); return f; };
  kp2.update(1 / 60); assert.ok(has(), 'no warm-up call: primed on the first frame');
  kp2.update(1 / 60); assert.ok(!has(), 'and cleared on the second');
});

test('CH-3 #18: the light switch is a real switch box: seated on the wall, a named lever that turns, a pilot lens', () => {
  const mk3 = (geo, sw, x, y, z, parent) => { const m = new R3.Mesh(geo, new R3.MeshBasicMaterial()); m.position.set(x, y, z); parent.add(m); return m; };
  const size3 = (g) => { const b = new R3.Box3(), v = new R3.Vector3(); g.updateMatrixWorld(true); g.traverse((o) => { if (!o.isMesh) return; const P = o.geometry.attributes.position; for (let k = 0; k < P.count; k++) b.expandByPoint(v.fromBufferAttribute(P, k).applyMatrix4(o.matrixWorld)); }); return b; };
  const g = buildKitProp(R3, 'lightSwitch', { mk: mk3 });
  let n = 0; g.traverse((o) => { if (o.isMesh) n++; }); assert.ok(n >= 25, 'its parts (' + n + ')');
  const lever = g.userData.lever; assert.ok(lever && lever.name === 'training-light-switch-lever', 'the lever, named (the bake leaves it)');
  assert.ok(g.userData.pilot && g.userData.pilot.isMesh, 'the pilot lens');
  const b = size3(g);
  assert.ok(b.min.z >= 0 && b.min.z < 0.0006, 'back seated on the wall plane, not through it (' + b.min.z.toFixed(5) + ')');
  assert.ok(b.max.x - b.min.x < 0.62 && b.max.z < 0.15, 'switch-box size ' + [b.max.x - b.min.x, b.max.z].map((v) => v.toFixed(3)));
  // under the LIGHTS sign (x +-0.3, its bottom at +0.265); only the conduit goes up, beside it, to the ceiling (opts.up)
  g.updateMatrixWorld(true); const v = new R3.Vector3(); let over = 0;
  g.traverse((o) => { if (!o.isMesh) return; const P = o.geometry.attributes.position; for (let k = 0; k < P.count; k++) { v.fromBufferAttribute(P, k).applyMatrix4(o.matrixWorld); if (v.y > 0.26 && Math.abs(v.x) < 0.31) over++; } });
  assert.equal(over, 0, 'nothing under the sign rises into it');
  const tall = size3(buildKitProp(R3, 'lightSwitch', { mk: mk3, opts: { up: 4.85 } }));
  assert.ok(Math.abs(tall.max.y - 4.9) < 0.02, 'the conduit ends in its pull box, up high (' + tall.max.y.toFixed(3) + ')');
  // the conduit lies on the wall: nothing of it behind the wall plane
  assert.ok(tall.min.z >= 0, 'nothing through the wall');
  const tip = () => { lever.updateMatrixWorld(true); const v = new R3.Vector3(0, 0, 0.043); return v.applyMatrix4(lever.matrixWorld); };
  lever.rotation.x = -0.5; const up = tip(); lever.rotation.x = 0.5; const dn = tip();
  assert.ok(up.y > dn.y + 0.03, 'on is up, off is down');
});

test('CH-3 #16 follow-up: an ear defender hangs from its crown (the hook top at the origin), cups below it', () => {
  const g = buildKitProp(T, 'earDefender', { mk }), b = sizeOf(g);
  assert.ok(b.max.y > 0.005 && b.max.y < 0.03, 'the crown sits over the hook (' + b.max.y.toFixed(4) + ')');
  assert.ok(b.min.y < -0.15 && b.min.y > -0.22, 'the cups hang below (' + b.min.y.toFixed(3) + ')');
  assert.ok(b.max.z - b.min.z < 0.1, 'thin against the wall: ' + (b.max.z - b.min.z).toFixed(3));
});

test('CG-7 s2 (CF-23): the whiteboard has a frame proud of its face, corner caps and a pen tray; nothing behind the wall', () => {
  const g = buildKitProp(R3, 'whiteboard', { mk: (geo, sw, x, y, z, parent) => { const m = new R3.Mesh(geo); m.position.set(x, y, z); m.userData.sw = sw; parent.add(m); return m; }, tiny: (m) => m, opts: { w: 0.9, h: 0.56 } });
  const b = new R3.Box3().setFromObject(g);
  assert.ok(b.min.z > -0.0005, 'seated on the wall, nothing behind it (' + b.min.z.toFixed(4) + ')');
  assert.ok(b.max.z > 0.0205 + 0.003, 'the frame stands proud of the printed face at 20.5 mm (' + b.max.z.toFixed(4) + ')');
  assert.ok(b.max.x - b.min.x > 0.92 && b.max.x - b.min.x < 0.98, 'the frame laps the 0.9 m face (' + (b.max.x - b.min.x).toFixed(3) + ')');
  let caps = 0, screws = 0; g.traverse((o) => { if (o.isMesh && o.userData.sw === 'earband') caps++; if (o.isMesh && o.userData.sw === 'clip') screws++; });
  assert.ok(caps >= 4 && screws >= 4, 'corner caps and their screws (' + caps + ', ' + screws + ')');
  const ud = g.userData; assert.ok(ud.trayY < -0.28 && ud.trayZ > 0.006 && ud.trayZ < 0.053, 'the tray under the board, its floor inside its lips');
});

test('CG-7 s2: a round sends the markers flying out of the tray; the second breaks the eraser; reset puts them back', () => {
  const tg = buildTrainingGround(T), kp = tg.kitProps, s = kp.solids.find((q) => q.kitProp === 'markers');
  const ctr = (q) => ({ x: (q.minX + q.maxX) / 2, y: (q.minY + q.maxY) / 2, z: (q.minZ + q.maxZ) / 2 });
  assert.ok(s, 'the markers have a box');
  assert.ok(s.minZ - tg.origin.z > TRAINING_R_MINZ() && s.maxY - s.minY < 0.06, 'small, on the range back wall');
  assert.ok(kp.hit(s, ctr(s), { x: 0, y: 0, z: -1 }, 30));
  assert.equal(kp.entries[s.kitIndex].state, 'loose'); assert.ok(kp.loose() >= 3, 'the eraser and two markers (' + kp.loose() + ')');
  assert.ok(kp.hit(s, ctr(s), { x: 0, y: 0, z: 1 }, 30)); assert.equal(kp.entries[s.kitIndex].state, 'broken');
  for (let i = 0; i < 600; i++) kp.update(1 / 60);
  for (const p of kp.pieces()) assert.ok(p.mesh.position.y > -0.02 && p.mesh.position.z > -12.05, 'on the floor, in the room');
  kp.reset(); assert.equal(kp.loose(), 0); for (const e of kp.entries) assert.equal(e.state, 'still');
});

test('CG-7 s2 (CF-23): the sharps bin sits on its bracket; a round knocks it off onto the floor or the cabinet, never into it; three break it', () => {
  const g = buildKitProp(R3, 'sharpsBin', { mk: (geo, sw, x, y, z, parent) => { const m = new R3.Mesh(geo); m.position.set(x, y, z); parent.add(m); return m; }, tiny: (m) => m });
  const b = new R3.Box3().setFromObject(g);
  assert.ok(b.min.y > -0.002 && b.min.z > -0.0005, 'on its base, its back to the wall');
  assert.ok(Math.abs(b.max.y - 0.24) < 0.02 && b.max.x - b.min.x < 0.18, 'a 2 l bin (' + (b.max.y).toFixed(3) + ' tall)');
  for (const dx of [0.6, 1.2, -0.6, 0]) {   // (1.2: it lands on the cabinet top)
    const tg = buildTrainingGround(T), kp = tg.kitProps, s = kp.solids.find((q) => q.kitProp === 'sharpsBin'), O = tg.origin;
    assert.ok(Math.abs(s.minY - O.y - 1.1) < 0.02, 'on the bracket shelf at 1.10 m (' + (s.minY - O.y).toFixed(3) + ')');
    assert.ok(kp.hit(s, { x: (s.minX + s.maxX) / 2, y: (s.minY + s.maxY) / 2, z: (s.minZ + s.maxZ) / 2 }, { x: dx, y: 0, z: -1 }, 30));
    for (let i = 0; i < 600; i++) kp.update(1 / 60);
    const e = kp.entries[s.kitIndex], y = s.minY - O.y, cx = (s.minX + s.maxX) / 2 - O.x, cz = (s.minZ + s.maxZ) / 2 - O.z;
    assert.equal(e.state, 'loose');
    const onCab = cx > -39.02 + 0.0 && cx < -37.24 && cz > -11.7 && cz < -11.04;
    assert.ok(onCab ? y > 0.88 : y > -0.02 && y < 0.12, 'on the floor or on the cabinet top, not inside it (dx ' + dx + ': x ' + cx.toFixed(2) + ' z ' + cz.toFixed(2) + ' y ' + y.toFixed(3) + ')');
    for (let i = 0; i < 2; i++) kp.hit(s, { x: (s.minX + s.maxX) / 2, y: (s.minY + s.maxY) / 2, z: (s.minZ + s.maxZ) / 2 }, { x: 0, y: 0, z: -1 }, 30);
    assert.equal(e.state, 'broken');
  }
});
const TRAINING_R_MINZ = () => -12.01;

test('CG-7 s2: the medic\'s mug is the real mug in white; a round shatters it onto her worktop', () => {
  const tg = buildTrainingGround(T), kp = tg.kitProps, s = kp.solids.find((q) => q.kitProp === 'medMug'), O = tg.origin;
  assert.ok(s && Math.abs(s.minY - O.y - 0.9) < 0.015, 'on the worktop at 0.90 m');
  assert.ok(kp.hit(s, { x: (s.minX + s.maxX) / 2, y: (s.minY + s.maxY) / 2, z: (s.minZ + s.maxZ) / 2 }, { x: -0.3, y: 0, z: -1 }, 30));
  assert.equal(kp.entries[s.kitIndex].state, 'broken'); assert.ok(kp.loose() >= 4, 'shards (' + kp.loose() + ')');
  const bx = -40.85, bz = -11.92;   // (bedAt.x; the bay's panels: B.minZ + 0.08) the monitor behind the mug: no shard through it, any frame
  let through = 0;
  for (let i = 0; i < 300; i++) { kp.update(1 / 60);
    for (const p of kp.pieces()) { const m = p.mesh.position; if (m.x > bx + 2.91 && m.x < bx + 3.49 && m.z > bz + 0.35 && m.z < bz + 0.59 && m.y > 0.9 && m.y < 1.37) through++; } }
  assert.equal(through, 0, 'no shard inside the monitor, any frame (without its block: 137)');
  for (const p of kp.pieces()) assert.ok(p.mesh.position.y > -0.02, 'nothing under the floor');
  kp.reset(); assert.equal(kp.loose(), 0);
});
