import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.core.js';
import * as GPU_THREE from '../vendor/three/three.webgpu.js';
import { createZombieAbilityRuntime } from './zombie-ability-runtime.js';

// The browser's three.tsl wrapper uses an import-map bare 'three/webgpu' name.
// Node can consume the same vendored TSL export directly without an import map.
const GPU_TSL = GPU_THREE.TSL;

// Real vendored Three geometry/scene math, with only the decorative 2D canvas
// stubbed: no browser, renderer, audio, WebGL or GPU is needed for these cases.
const priorDocument = globalThis.document;
globalThis.document = { createElement: name => {
  assert.equal(name, 'canvas');
  return { width: 0, height: 0, getContext: () => ({
    createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, beginPath() {}, arc() {}, fill() {}
  }) };
} };
after(() => { if (priorDocument === undefined) delete globalThis.document; else globalThis.document = priorDocument; });

function box(ax, ay, az, bx, by, bz, cx, cy, cz, hx, hy, hz) {
  let lo = 0, hi = 1;
  for (const [origin, direction, half] of [[ax - cx, bx - ax, hx], [ay - cy, by - ay, hy], [az - cz, bz - az, hz]]) {
    if (Math.abs(direction) < 1e-9) { if (Math.abs(origin) > half) return null; continue; }
    const u = (-half - origin) / direction, v = (half - origin) / direction;
    lo = Math.max(lo, Math.min(u, v)); hi = Math.min(hi, Math.max(u, v));
    if (lo > hi) return null;
  }
  return lo;
}
function zombie(typeKey, x = 24) {
  const mesh = new THREE.Group(); mesh.position.set(x, 0, 0);
  return { typeKey, mesh, alive: true, hitH: typeKey === 'colossus' ? 3 : 2, partsLost: {} };
}
function harness(callbacks = {}, engine = THREE, tsl = null) {
  const h = {
    active: true, domain: 'training', scene: new THREE.Scene(), actors: [], builds: [], events: [],
    target: { position: new THREE.Vector3(), maxHp: 100 }
  };
  const effect = (name, ...args) => { h.events.push({ name, args }); callbacks[name]?.(h, ...args); };
  h.runtime = createZombieAbilityRuntime({
    THREE: engine, TSL: tsl, scene: h.scene, actors: () => h.actors, target: () => h.target,
    players: (x, z, r) => Math.hypot(h.target.position.x - x, h.target.position.z - z) <= r ? [h.target] : [],
    playerRadius: .4, playerHeight: () => 1.7,
    active: () => h.active, domain: () => h.domain, inDomain: () => true, canAct: () => true,
    ground: () => 0, wet: () => false,
    world: () => ({ belowSolids: [], builds: h.builds, buildGrid: 2.5 }),
    box, cylinder: () => null,
    build: (b, ...segment) => box(...segment, b.x, 3, b.z, .2, 3, 2),
    preparePose: z => effect('preparePose', z),
    sound: (z, action) => effect(action, z),
    damage: (...args) => effect('damage', ...args),
    damageBuild: (...args) => effect('damageBuild', ...args),
    impact: (...args) => effect('impact', ...args),
    fireMote: (...args) => effect('fireMote', ...args),
    acidMote: (...args) => effect('acidMote', ...args)
  });
  h.tick = dt => h.runtime.update(dt);
  h.until = (condition, seconds = 6) => {
    for (let t = 0; t < seconds && !condition(); t += .02) h.tick(.02);
    assert(condition(), 'Expected runtime condition within ' + seconds + ' seconds');
  };
  h.ready = type => {
    const z = zombie(type); h.actors.push(z); h.tick(.01); z.rangedAbility.remaining = 0; return z;
  };
  h.count = name => h.events.filter(e => e.name === name).length;
  h.clearProof = () => {
    const state = h.runtime.read(); assert.equal(state.shots, 0); assert.equal(state.trails, 0);
    for (const z of h.actors) { assert.equal(z.abilityBusy, false); assert.equal(z.rangedAbility, undefined); }
    for (const mesh of h.scene.children) if (mesh.userData.enemyAbility) assert.equal(mesh.visible, false);
  };
  return h;
}

test('hidden ability warm-up leaves a live acid trail and combat counters untouched', () => {
  const h = harness(), z = zombie('spitter', 3);
  h.actors.push(z); h.tick(.01);
  z.mesh.position.x += .8; h.tick(.02);
  const before = h.runtime.read();
  const trail = h.scene.children.find(m => m.name === 'spitter-acid-trail-batch');
  const vertices = [...trail.geometry.attributes.position.array.slice(0, 18)];
  const restore = h.runtime.primeVisuals(5, 2, 5);
  assert.deepEqual(h.runtime.read(), before);
  assert.deepEqual([...trail.geometry.attributes.position.array.slice(0, 18)], vertices);
  restore();
  assert.deepEqual(h.runtime.read().counts, before.counts);
  assert.equal(trail.visible, true);
  assert.equal(h.runtime.read().pools.fireballs, 1);
  assert.equal(h.runtime.read().pools.stones, 1);
});

test('hidden ability warm-up exposes and restores the actual pooled draw meshes', () => {
  const h = harness(), before = h.runtime.read();
  const restore = h.runtime.primeVisuals(5, 2, 5);
  const fire = h.scene.children.find(m => m.name === 'zombie-fireball');
  const stone = h.scene.children.find(m => m.name === 'zombie-stone');
  const acid = h.scene.children.find(m => m.name === 'spitter-acid-trail-batch');
  assert(fire?.visible && stone?.visible && acid?.visible);
  assert.equal(acid.geometry.drawRange.count, 6);
  assert.deepEqual(h.runtime.read().counts, before.counts);
  restore();
  assert.equal(fire.visible, false);assert.equal(stone.visible, false);assert.equal(acid.visible, false);
  assert.equal(acid.geometry.drawRange.count, 0);
  assert.equal(h.runtime.read().pools.fireballs, 1);assert.equal(h.runtime.read().pools.stones, 1);
});

for (const [type, rawDamage] of [['demon', 24], ['colossus', 80]]) {
  test(type + ' lethal contact can synchronously clear the runtime without double-releasing pooled shots', () => {
    const h = harness({ damage: h => h.runtime.clear() });
    h.ready(type);
    h.until(() => h.count('damage') > 0);
    assert.equal(h.count('damage'), 1); assert.equal(h.events.find(e => e.name === 'damage').args[1], rawDamage);
    assert.equal(h.count('impact'), 0, 'Old-room impact must stop after synchronous reset');
    h.clearProof();
  });
}

test('lethal acid contact clears every trail and prevents remaining puddles from hurting the player again', () => {
  const h = harness({ damage: h => h.runtime.clear() }), z = zombie('spitter', 3);
  h.actors.push(z); h.tick(.01);
  for (let i = 0; i < 4; i++) { z.mesh.position.x += .8; h.tick(.02); }
  assert.equal(h.runtime.read().trails, 4);
  h.target.position.set(5.9, 0, 0); h.tick(.02);
  assert.equal(h.count('damage'), 1); assert.equal(h.events.find(e => e.name === 'damage').args[1], 4);
  assert.equal(h.count('acidMote'), 0); h.clearProof();
});

for (const callback of ['windup', 'cast', 'preparePose', 'impact', 'fireMote']) {
  test('clear during ' + callback + ' stops all remaining actor/projectile side effects in that pass', () => {
    const h = harness({ [callback]: h => h.runtime.clear() });
    const first = h.ready('demon');
    const second = zombie('demon', 25); h.actors.push(second);
    h.until(() => h.count(callback) > 0);
    assert.equal(h.count(callback), 1); h.clearProof();
    if (callback === 'windup' || callback === 'preparePose') assert.equal(h.runtime.read().counts.fireballs, 0);
    assert.equal(first.abilityBusy, false);
  });
}

test('clear during a build impact does not release the same projectile twice or add a stale impact', () => {
  const h = harness({ damageBuild: h => h.runtime.clear() });
  h.ready('colossus'); h.until(() => h.runtime.read().shots > 0);
  h.builds.push({ x: 12, z: 0, hp: 100, radius: 2, type: 'wall', mesh: new THREE.Group() });
  h.until(() => h.count('damageBuild') > 0);
  assert.equal(h.count('damageBuild'), 1); assert.equal(h.count('damage'), 0); assert.equal(h.count('impact'), 0);
  h.clearProof();
});

test('clear during acid particles stops older trails in the same pass', () => {
  const h = harness({ acidMote: h => h.runtime.clear() }), z = zombie('spitter', 3);
  h.actors.push(z); h.tick(.01);
  for (let i = 0; i < 4; i++) { z.mesh.position.x += .8; h.tick(.02); }
  h.target.position.set(5.9, 0, 0); h.tick(.02);
  assert.equal(h.count('damage'), 1); assert.equal(h.count('acidMote'), 1); h.clearProof();
});

test('becoming inactive in a callback immediately aborts the current pass without further sound or impact', () => {
  const h = harness({ cast: h => { h.active = false; } });
  h.ready('demon'); h.until(() => h.count('cast') > 0);
  const before = h.runtime.read();
  assert.equal(h.count('fireMote'), 0); assert.equal(h.count('impact'), 0); assert.equal(h.count('damage'), 0);
  h.tick(1); assert.equal(h.runtime.read().clock, before.clock); assert.equal(h.runtime.read().shots, before.shots);
  h.runtime.clear(); h.clearProof();
});

test('clear resets busy attacks, pending cooldown state and acid immunity for a fresh encounter', () => {
  const h = harness(), demon = h.ready('demon'); h.tick(.1);
  assert.equal(demon.abilityBusy, true); assert.equal(demon.rangedAbility.stage, 'windup');
  const oldState = demon.rangedAbility;
  h.runtime.clear(); h.runtime.clear(); h.clearProof();
  h.tick(.01); assert.notEqual(demon.rangedAbility, oldState); assert.equal(demon.rangedAbility.stage, 'cooldown');
  assert(demon.rangedAbility.remaining > 1.9); assert.equal(demon.abilityBusy, false);
  const spitter = zombie('spitter', 3); h.actors.push(spitter); h.tick(.01);
  spitter.mesh.position.x += .8; h.tick(.01); h.target.position.set(3.75, 0, 0); h.tick(.01);
  assert.equal(h.count('damage'), 1);
  h.runtime.clear(); h.tick(.01); spitter.mesh.position.x += .8; h.tick(.01);
  h.target.position.set(4.55, 0, 0); h.tick(.01);
  assert.equal(h.count('damage'), 2, 'Prior encounter cooldown cannot suppress the new trail');
});

test('a room/domain transition clears live shots before any new room damage or movement', () => {
  const h = harness(); h.ready('demon'); h.until(() => h.runtime.read().shots > 0);
  h.domain = 'world'; h.tick(.01);
  assert.equal(h.runtime.read().shots, 0); assert.equal(h.runtime.read().trails, 0);
  assert.equal(h.count('damage'), 0); assert.equal(h.count('impact'), 0);
  assert.equal(h.actors[0].abilityBusy, false);
});

test('non-finite or non-positive frame times cannot launch attacks or enter an infinite substep loop', () => {
  const h = harness(), z = h.ready('demon'), before = h.runtime.read();
  for (const dt of [Infinity, NaN, 0, -1]) h.tick(dt);
  assert.equal(h.runtime.read().clock, before.clock); assert.equal(h.runtime.read().shots, 0);
  assert.equal(z.rangedAbility.remaining, 0); assert.equal(h.count('windup'), 0);
});

test('a capped acid trail uses one single-pass mesh and fixed vertex buffers rather than 96 transparent meshes', () => {
  const h = harness(), z = zombie('spitter', 3); h.actors.push(z); h.tick(.01);
  for (let i = 0; i < 125; i++) { z.mesh.position.x += .8; h.tick(.001); }
  const meshes = h.scene.children.filter(o => o.name === 'spitter-acid-trail-batch');
  assert.equal(meshes.length, 1); assert.equal(h.runtime.read().trails, 96);
  assert(h.runtime.read().counts.trailDrops > 96);
  const mesh = meshes[0], geometry = mesh.geometry;
  assert.equal(mesh.material.forceSinglePass, true); assert.equal(mesh.material.side, THREE.DoubleSide);
  assert.equal(mesh.material.depthWrite, false); assert.equal(mesh.frustumCulled, false);
  assert.equal(geometry.groups.length, 0); assert.equal(geometry.drawRange.count, 96 * 6);
  assert.equal(geometry.getAttribute('position').count, 96 * 6); assert.equal(geometry.getAttribute('color').itemSize, 4);
  const positions = geometry.getAttribute('position').array, colors = geometry.getAttribute('color').array;
  for (let i = 0; i < 100; i++) { z.mesh.position.x += .8; h.tick(.001); }
  assert.equal(h.scene.children.length, 1); assert.equal(h.runtime.read().trails, 96);
  assert.equal(geometry.getAttribute('position').array, positions); assert.equal(geometry.getAttribute('color').array, colors);
  assert([...positions].every(Number.isFinite));
  h.runtime.clear(); h.clearProof(); assert.equal(geometry.drawRange.count, 0);
  assert.equal(h.runtime.read().pools.trails, 96);
});

test('individual acid patches fade, expire, hide their slot and reuse it without another scene allocation', () => {
  const h = harness(), z = zombie('spitter', 3); h.actors.push(z); h.tick(.01);
  z.mesh.position.x += .8; h.tick(.01);
  const mesh = h.scene.children[0], colors = mesh.geometry.getAttribute('color'), positions = mesh.geometry.getAttribute('position');
  assert(Math.abs(colors.getW(0) - .8) < 1e-6); assert.equal(colors.getW(6), 0);
  const firstX = positions.getX(0);
  h.tick(5); z.mesh.position.x += .8; h.tick(.01); h.tick(.9);
  assert(colors.getW(0) > 0 && colors.getW(0) < .1); assert(Math.abs(colors.getW(6) - .8) < 1e-6);
  h.tick(.2); assert.equal(h.runtime.read().trails, 1); assert.equal(h.runtime.read().pools.trails, 1);
  for (let i = 0; i < 6; i++) assert.equal(colors.getW(i), 0);
  z.mesh.position.x += .8; h.tick(.01);
  assert.equal(h.runtime.read().trails, 2); assert.equal(h.runtime.read().pools.trails, 0);
  assert(Math.abs(colors.getW(0) - .8) < 1e-6); assert.notEqual(positions.getX(0), firstX);
  assert.equal(h.scene.children.length, 1);
  h.tick(6); assert.equal(h.runtime.read().trails, 0); assert.equal(mesh.visible, false); assert.equal(mesh.geometry.drawRange.count, 0);
  assert.equal(h.runtime.read().pools.trails, 2);
  for (let i = 0; i < colors.count; i++) assert.equal(colors.getW(i), 0);
});

test('vendored GPU basic material explicitly consumes vertex alpha through its opacity node', () => {
  const h = harness({}, GPU_THREE, GPU_TSL), z = zombie('spitter', 3); h.actors.push(z); h.tick(.01);
  z.mesh.position.x += .8; h.tick(.01);
  const mesh = h.scene.children[0];
  assert.equal(mesh.material.isMeshBasicNodeMaterial, true); assert.equal(mesh.material.vertexColors, true);
  assert.equal(mesh.material.opacity, 1); assert.equal(mesh.material.opacityNode.isNode, true);
  assert.equal(mesh.geometry.getAttribute('color').itemSize, 4);
  assert.equal(mesh.material.forceSinglePass, true); h.runtime.clear(); h.clearProof();
});

test('ready demon pack starts casts at least 1.2 seconds apart without cancelling a visible tell', () => {
  const starts = [], h = harness({windup: (h, z) => starts.push({z, time: h.runtime.read().clock})});
  const pack = Array.from({length: 3}, () => zombie('demon'));
  h.actors.push(...pack); h.tick(.01); for (const z of pack) z.rangedAbility.remaining = 0;
  h.tick(.02); assert.equal(starts.length, 1); assert.equal(pack[0].rangedAbility.stage, 'windup');
  assert(pack.slice(1).every(z => z.rangedAbility.stage === 'cooldown' && z.rangedAbility.remaining === 0));
  h.until(() => starts.length === 3, 4);
  for (let i = 1; i < starts.length; i++) assert(starts[i].time - starts[i - 1].time >= 1.2 - 1e-8);
  h.until(() => h.runtime.read().counts.fireballs === 3, 3);
  assert.deepEqual(starts.map(x => x.z), pack);
});

test('a large pack gets fair ready turns even if early actors become ready again', () => {
  const starts = [], h = harness({windup: (h, z) => starts.push({z, time: h.runtime.read().clock})});
  const pack = Array.from({length: 8}, () => zombie('demon'));
  h.actors.push(...pack); h.tick(.01); for (const z of pack) z.rangedAbility.remaining = 0;
  // Re-ready every recovering actor aggressively; FIFO must still serve the original eight.
  for (let t = 0; t < 10 && starts.length < 8; t += .02) {
    for (const z of pack) if (z.rangedAbility.stage === 'cooldown') z.rangedAbility.remaining = 0;
    h.tick(.02);
  }
  assert.deepEqual(starts.slice(0, 8).map(x => x.z), pack);
  assert.equal(new Set(starts.slice(0, 8).map(x => x.z)).size, 8);
});

test('dead or out-of-range queued demons cannot hold up the next valid actor', () => {
  for (const invalid of ['dead', 'range']) {
    const starts = [], h = harness({windup: (h, z) => starts.push(z)}), pack = Array.from({length: 3}, () => zombie('demon'));
    h.actors.push(...pack); h.tick(.01); for (const z of pack) z.rangedAbility.remaining = 0;
    h.tick(.02);
    if (invalid === 'dead') pack[1].alive = false; else pack[1].mesh.position.x = 100;
    h.until(() => starts.length === 2, 2);
    assert.deepEqual(starts, [pack[0], pack[2]]);
  }
});

test('shared turn does not throttle Colossus or stop close-range charge permission', () => {
  const h = harness(), demon = zombie('demon'), stone = zombie('colossus'), close = zombie('demon', 10);
  h.actors.push(demon, stone, close); h.tick(.01);
  for (const z of h.actors) z.rangedAbility.remaining = 0;
  h.tick(.02);
  assert.equal(demon.rangedAbility.stage, 'windup'); assert.equal(stone.rangedAbility.stage, 'windup');
  assert.equal(close.rangedAbility.stage, 'cooldown'); assert.equal(close.abilityBusy, false);
});

test('clear and domain changes erase queued turns and old spacing reservations', () => {
  const starts = [], h = harness({windup: (h, z) => starts.push(z)});
  h.actors.push(zombie('demon'), zombie('demon')); h.tick(.01);
  for (const z of h.actors) z.rangedAbility.remaining = 0;
  h.tick(.02); assert.equal(starts.length, 1);
  h.runtime.clear(); h.actors = [zombie('demon')]; h.tick(.01); h.actors[0].rangedAbility.remaining = 0;
  h.tick(.02); assert.equal(starts.length, 2);
  h.domain = 'world'; h.actors = [zombie('demon')]; h.tick(.01); h.actors[0].rangedAbility.remaining = 0;
  h.tick(.02); assert.equal(starts.length, 3);
});
