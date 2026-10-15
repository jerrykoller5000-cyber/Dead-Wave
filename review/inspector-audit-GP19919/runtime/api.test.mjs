import assert from 'node:assert/strict';
import * as THREE from '../../../vendor/three/three.core.js';
import { createApi } from '../../../studio/inspector/api.js';
import { createClock } from '../../../studio/inspector/timeline.js';
import { createOrbit } from '../../../studio/inspector/orbit.js';
import { defaultWardrobe } from '../../../game/wardrobe.js';
import { abortError } from '../../../studio/inspector/async.js';
import { makeCatalog } from '../../../studio/inspector/catalog.js';

let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('PASS ' + name); };
const copy = (v) => JSON.parse(JSON.stringify(v));
globalThis.Image = class { width = 1280; height = 720; set src(v) { queueMicrotask(() => this.onload?.()); } };
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage() {}, fillText() {}, strokeRect() {} }), toDataURL: () => 'data:image/jpeg;base64,eA==' }) };

function fixture() {
  const state = { weapon: 'm4', akimbo: false, blade: 'knife', move: null, loop: true, holds: {}, gear: { helmet: false, vest: false }, mods: { m4: { ext: false, heavy: false }, pistol: { auto: false } } };
  let wardrobe = defaultWardrobe(), mutations = 0, shotView = null, captureHook = null;
  const T = { renderer: { domElement: { clientWidth: 1280, clientHeight: 720 } }, WEAPON_ORDER: ['m4', 'pistol'], marine: {},
    getWardrobe: () => wardrobe, dressMarine: () => mutations++, dressGuns: () => mutations++, getShotView: () => shotView, setShotView: (v) => { shotView = v; } };
  const overlays = { bounds: false, axes: false }, display = { backdrop: 'studio', light: 'studio' };
  const catalog = [{ id: 'marine', kind: 'marine', name: 'Marine' }, { id: 'thing', kind: 'model', name: 'Thing', variants: [{ key: '0' }, { key: '1' }] }, { id: 'zombie.one', kind: 'zombie', name: 'Zombie' }];
  const host = { data: { WEAPON_ORDER: T.WEAPON_ORDER }, scene: new THREE.Scene(), setPointerOnCanvas() {}, loop() {} };
  const ix = { T, host, THREE, version: '1.1.0', GROUPS: ['Models'], ctx: {}, catalog, byId: new Map(catalog.map((e) => [e.id, e])), errors: [], drive: false,
    clock: createClock(), recorder: { info: () => ({ frames: 10 }), span: () => 1, scrubbing: false },
    stage: { BACKDROPS: { studio: 1, dark: 1 }, LIGHTS: { studio: 1, flat: 1 }, backdrop: (v) => v == null ? display.backdrop : display.backdrop = v,
      light: (v) => v == null ? display.light : display.light = v, overlays: { all: () => ({ ...overlays }), get: (k) => overlays[k], set: (k, v) => overlays[k] = v }, measure: () => ({ size: { x: 1, y: 2, z: 1 } }) },
    assertAvailable(token) { if (ix.busy && token !== ix.busy.token) throw Error('Inspector busy'); }, ensureLoop() {},
    async nextFrame(signal) { if (signal?.aborted) throw abortError(); if (!ix.clock.held()) ix.clock.scale(1 / 60); },
    async capture(type, quality, signal) { if (signal?.aborted) throw abortError(); if (captureHook) return captureHook(signal); await ix.nextFrame(signal); return 'data:image/jpeg;base64,eA=='; },
    play() { ix.clock.play(); }, pause() { ix.clock.pause(); }, speed: (v) => ix.clock.speed(v), step: (n) => ix.clock.step(n), scrub() {}, setDrive(v) { ix.drive = v; },
    async show(id, o = {}) { ix.assertAvailable(o._job); if (o.signal?.aborted) throw abortError(); mutations++;
      const e = ix.byId.get(id); if (!e) throw Error('unknown subject'); ix.entry = e; ix.variant = o.variant ?? null; ix.mode = o.mode ?? null;
      const switches = { suppressor: false, finish: 'steel' };
      const holder = new THREE.Group();
      ix.subject = { entry: e, kind: e.kind, mode: ix.mode, turntable: 0, holder, setYaw: (v) => holder.rotation.y = v, focus: () => ({ center: { x: 0, y: 1, z: 0 }, size: { x: 1, y: 2, z: 1 }, yaw: holder.rotation.y }), rig: () => null, info: () => ({ meshes: 1, tris: 12 }),
        controls: e.kind === 'model' ? [
          { id: 'suppressor', type: 'toggle', get: () => switches.suppressor, set: (v) => switches.suppressor = v },
          { id: 'finish', type: 'select', options: [{ key: 'steel' }, { key: 'wood' }], get: () => switches.finish, set: (v) => switches.finish = v },
          { id: 'trigger', type: 'button', set: () => { ix.buttonCalls = (ix.buttonCalls || 0) + 1; } }
        ] : [] };
      await ix.nextFrame(o.signal); return ix.subject;
    } };
  const M = {
    MOVES: [{ id: 'walk', name: 'Walk' }, { id: 'reload-m4', name: 'Reload' }], GEAR_IDS: ['helmet', 'vest'], PRESETS: {},
    state: () => ({ ...state, camo: 'm81' }), weapon: (k) => { if (k != null) { state.weapon = k; mutations++; } return state.weapon; },
    camo: (v) => v == null ? 'm81' : v, mods: (w = state.weapon) => Object.entries(state.mods[w] || {}).map(([id, on]) => ({ id, fitted: on })),
    gear: (id, v) => { if (v != null) state.gear[id] = v; return state.gear[id]; }, finishes: () => [],
    akimbo: (v) => state.akimbo = !!v, blade: (v) => state.blade = v,
    stop: () => { state.move = null; state.holds = {}; }, play: async (id, o) => { state.move = id; state.loop = o?.loop ?? state.loop; return {}; },
    setLoop: (v) => state.loop = v, fit: (id, on, w = state.weapon) => state.mods[w][id] = on,
    hold: (kind, v) => { if (v == null) delete state.holds[kind]; else state.holds[kind] = v; }, holdState: (kind) => state.holds[kind] ?? null
  };
  Object.defineProperty(M, 'loop', { get: () => state.loop }); ix.marine = M; ix.orbit = createOrbit(ix);
  ix.entry = catalog[0]; ix.variant = null; ix.mode = null;
  ix.subject = { entry: ix.entry, focus: () => ({ center: { x: 0, y: 1, z: 0 }, size: { x: 1, y: 2, z: 1 } }), rig: () => null, info: () => ({ meshes: 1, tris: 12 }) };
  ix.orbit.view('full', { instant: true }); ix.orbit.frame();
  const api = createApi(ix);
  return { ix, api, state, mutations: () => mutations, capture: (f) => captureHook = f };
}

await test('versioned capabilities and JSON session recipe are discoverable', () => {
  const { api } = fixture(); assert.equal(api.apiVersion, 1); assert.equal(api.capabilities().sessionSchemaVersion, 1); const r = api.session();
  assert.equal(r.schema, 'dw-inspector-session'); assert.deepEqual(copy(r), r); assert.equal(r.marine.mods.m4.ext, false);
});
await test('session round trip restores selection, kit, clock, view and holds', async () => {
  const { api, state } = fixture(); state.move = 'walk'; state.holds = { walk: 0.3 }; state.gear.helmet = true; api.speed(0.25); api.pause();
  const before = api.session(); await api.show('thing', { variant: '1' }); state.weapon = 'pistol'; api.speed(2); api.light('flat');
  await api.restore(before); const after = api.session(); assert.deepEqual(after.subject, before.subject); assert.deepEqual(after.marine, before.marine); assert.deepEqual(after.clock, before.clock);
  assert.deepEqual(after.display, before.display); assert.ok(Math.abs(after.camera.x - before.camera.x) < 1e-8); assert.equal(api.busy(), null);
});
await test('invalid recipes are rejected before any mutation', () => {
  const { api, mutations } = fixture(), source = api.session(), cases = [
    (r) => r.schemaVersion = 2, (r) => r.subject.id = 'missing', (r) => r.camera.x = NaN, (r) => r.camera.z = Infinity,
    (r) => r.marine.weapon = 'bogus', (r) => r.marine.gear.helmet = 'true', (r) => r.marine.holds.knife = Infinity,
    (r) => r.display.backdrop = 'constructor', (r) => r.marine.wardrobe.body.skin = 50, (r) => r.marine.mods.m4.ext = 'yes', (r) => r.marine.holds = [],
    (r) => r.marine.akimbo = true
  ];
  for (const alter of cases) { const r = copy(source); alter(r); const n = mutations(); assert.throws(() => api.restore(r)); assert.equal(mutations(), n); assert.equal(api.busy(), null); }
});
await test('prototype keys cannot enter imported recipes', () => {
  const { api } = fixture(), r = api.session(); r.marine.holds = JSON.parse('{"__proto__":{"evil":true}}'); assert.throws(() => api.restore(r), /unsafe/);
});
await test('camera setters return the requested immediate view and reject NaN', () => {
  const { api, ix } = fixture(); ix.T.setShotView({ x: 50, y: 8, z: 1, tx: 0, ty: 1, tz: 0 });
  const c = api.camera({ x: 2, y: 3, z: 4, tx: 0, ty: 1, tz: 0, fov: 40 }); assert.ok(Math.abs(c.x - 2) < 1e-8); assert.ok(Math.abs(c.z - 4) < 1e-8);
  assert.throws(() => api.camera({ ...c, x: NaN }));
});
await test('stepAsync resolves only after all requested frames have run', async () => {
  const { api } = fixture(); api.pause(); const time = await api.stepAsync(6); assert.equal(time.step, 0); assert.ok(Math.abs(time.gameTime - 0.1) < 1e-8); assert.equal(time.paused, true);
  assert.throws(() => api.stepAsync(601)); assert.throws(() => api.stepAsync(Infinity));
});
await test('zero async steps is a no-op and moves require the live marine', async () => {
  const { api } = fixture(); const before = api.time(); assert.deepEqual(await api.stepAsync(0), before);
  await api.show('thing'); assert.throws(() => api.marine.play('walk'), /live marine/);
});
await test('failed recipe application restores the previous review settings', async () => {
  const { api, ix } = fixture(), before = api.session(), r = api.session(); r.subject = { id: 'thing', variant: '1', mode: null }; r.marine.weapon = 'pistol';
  const original = ix.show; ix.show = async (...args) => { if (args[0] === 'thing') throw Error('builder removed'); return original(...args); };
  await assert.rejects(api.restore(r), /builder removed/); assert.deepEqual(api.session().subject, before.subject); assert.deepEqual(api.session().marine, before.marine); assert.equal(api.busy(), null);
});
await test('catalog checks test every variant and zombie statue geometry, then restore prior recipe', async () => {
  const { api } = fixture(); api.pause(); const before = api.session(), out = await api.check();
  assert.equal(out.length, 4); assert.ok(out.every((r) => r.ok)); assert.deepEqual(out.filter((r) => r.id === 'thing').map((r) => r.variant), ['0', '1']);
  assert.equal(out.find((r) => r.id === 'zombie.one').mode, 'statue'); assert.deepEqual(api.session().subject, before.subject); assert.deepEqual(api.session().clock, before.clock);
});
await test('unmatched catalog filters and invalid bounds fail before changing the stage', () => {
  const { api, mutations } = fixture(), n = mutations(); assert.throws(() => api.check({ only: 'does-not-exist' }), /no inspector/); assert.throws(() => api.check({ thumbs: NaN }));
  assert.throws(() => api.check({ frames: Infinity })); assert.equal(mutations(), n);
});
await test('runtime errors during a check make that variant fail', async () => {
  const { api, ix } = fixture(), original = ix.show; ix.show = async (...args) => { const s = await original(...args); if (args[0] === 'thing') ix.errors.push({ id: 'thing', error: 'bad tick', phase: 'update' }); return s; };
  const out = await api.check({ only: 'thing' }); assert.equal(out.length, 2); assert.ok(out.every((r) => !r.ok && /bad tick/.test(r.error)));
});
await test('screenshot jobs lock mutations but keep getters readable', async () => {
  const { api, capture } = fixture(); let release; capture(() => new Promise((r) => release = r)); const pending = api.shot();
  assert.match(api.busy().label, /Screenshot/); assert.equal(api.marine.weapon(), 'm4'); assert.equal(api.list().length, 3); assert.throws(() => api.marine.weapon('pistol'), /busy/); assert.throws(() => api.camera({ x: 0 }), /busy/);
  await assert.rejects(api.check(), /busy/); release('data:image/png;base64,eA=='); await pending; assert.equal(api.busy(), null);
});
await test('cancelled screenshot rejects and releases the lock', async () => {
  const { api, capture } = fixture(); capture((signal) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(abortError()), { once: true })));
  const pending = api.shot(); assert.equal(api.cancel(), true); await assert.rejects(pending, { name: 'AbortError' }); assert.equal(api.busy(), null); assert.equal(api.cancel(), false);
});
await test('cancelled catalog batch restores the previous subject, kit and holds', async () => {
  const { api, state } = fixture(); state.move = 'walk'; state.holds.walk = 0.6; api.pause(); const before = api.session();
  const pending = api.check({ only: 'thing' }); api.cancel(); await assert.rejects(pending, { name: 'AbortError' }); const after = api.session();
  assert.deepEqual(after.subject, before.subject); assert.deepEqual(after.marine, before.marine); assert.deepEqual(after.clock, before.clock); assert.equal(api.busy(), null);
});
await test('turnaround sheets freeze the pose and restore play/follow/view', async () => {
  const { api, ix, capture } = fixture(); const before = api.camera(); ix.orbit.follow(true); let captures = 0;
  capture(async () => { assert.equal(ix.clock.paused, true); captures++; return 'data:image/jpeg;base64,eA=='; }); await api.sheetData({ n: 4, tile: 96 });
  assert.equal(captures, 4); assert.equal(ix.clock.paused, false); assert.equal(ix.orbit.follow(), true); for (const k of Object.keys(before)) assert.ok(Math.abs(api.camera()[k] - before[k]) < 1e-9); assert.equal(api.busy(), null);
});
await test('turnaround sheets retain the anatomical follow bookmark', async () => {
  const { api, ix } = fixture(); ix.orbit.restoreFollow({ enabled: true, bookmark: 'head', offset: { dx: 0, dy: 0, dz: 0 } }); const before = api.session().view;
  await api.sheetData({ n: 2, tile: 96 }); assert.deepEqual(api.session().view, before);
});
await test('old schema-one recipes remain valid while invalid follow states reject before mutation', async () => {
  const { api, mutations } = fixture(), old = api.session(); delete old.view; await api.restore(old);
  for (const alter of [(r) => r.view.bookmark = 'spine-unknown', (r) => r.view.offset.dx = NaN, (r) => r.view.follow = 'true']) {
    const r = api.session(), n = mutations(); alter(r); assert.throws(() => api.restore(r)); assert.equal(mutations(), n);
  }
});
await test('sheet bounds prevent accidental unbounded canvases and loops', async () => {
  const { api } = fixture(); for (const options of [{ n: Infinity }, { n: 0 }, { n: 33 }, { tile: 10000 }, { cols: 0 }, { pitch: NaN }]) await assert.rejects(api.sheetData(options));
  await assert.rejects(api.contactSheet({ cols: Infinity }));
});
await test('contact sheets retain variant IDs and restore the original selection', async () => {
  const { api } = fixture(), before = api.session(); const out = await api.contactSheet({ only: 'thing', tile: 96, cols: 2 });
  assert.equal(out.results.length, 2); assert.ok(out.data.startsWith('data:image/jpeg')); assert.deepEqual(out.results.map((r) => r.variant), ['0', '1']); assert.deepEqual(api.session().subject, before.subject);
});
await test('notes include a reproducible session recipe', async () => {
  const { api } = fixture(); let body; globalThis.fetch = async (_, request) => { body = JSON.parse(request.body); return { ok: true, status: 200, json: async () => ({ ok: true, path: 'notes.md' }) }; };
  const result = await api.note('Hand clips into vest', { context: 'Frame 22', who: 'test-agent' }); assert.equal(result.ok, true); assert.equal(body.recipe.schemaVersion, 1); assert.match(body.context, /Frame 22/); assert.equal(body.who, 'test-agent');
});
await test('note HTTP and endpoint errors are never reported as success', async () => {
  const { api } = fixture(); globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({ ok: false, error: 'same origin required' }) });
  await assert.rejects(api.note('Test'), /same origin/); assert.equal(api.busy(), null);
});
await test('named head probes use posed head position and actual classifier metadata', async () => {
  const { api, ix } = fixture(); await api.show('zombie.one', { mode: 'live' });
  const mesh = new THREE.Group(), head = new THREE.Group(); mesh.position.y = 4; head.position.y = 2; mesh.add(head); mesh.userData.head = head;
  const z = { alive: true, hp: 50, mesh, hitH: 3, typeKey: 'brute', partsLost: {} }; ix.subject.z = z; let info;
  ix.T.damageZombie = (_, dmg, data) => { info = data; z.hp -= dmg; };
  api.zombie.hit('head', 1); assert.equal(info.hitY, 6); assert.equal(info.headHit, true); assert.equal(info.brutePart, 'head'); assert.equal(info.militaryZone, 'face');
  api.zombie.hit('legs', 1); assert.equal(info.headHit, false); assert.ok(Math.abs(info.hitY - 4.6) < 1e-8); assert.throws(() => api.zombie.hit('bogus'));
});
await test('standalone model switches and turntable survive recipe round trip', async () => {
  const { api } = fixture(); await api.show('thing', { variant: '1' }); api.model.set('suppressor', true); api.model.set('finish', 'wood'); api.model.turntable(0.65); api.pause();
  const recipe = api.session(); assert.deepEqual(recipe.model, { switches: { suppressor: true, finish: 'wood' }, turntable: 0.65, yaw: 0 });
  await api.show('marine'); await api.restore(recipe); const after = api.session(); assert.deepEqual(after.subject, recipe.subject); assert.deepEqual(after.model, recipe.model);
  assert.equal(api.model.controls().find((c) => c.id === 'suppressor').value, true);
});
await test('model setters enforce toggle/select types and stage lock', async () => {
  const { api, capture } = fixture(); await api.show('thing'); assert.throws(() => api.model.set('suppressor', 'true')); assert.throws(() => api.model.set('finish', 'unknown'));
  assert.throws(() => api.model.set('trigger', true), /toggle\/select/); assert.throws(() => api.model.turntable(Infinity));
  let finish; capture(() => new Promise((r) => finish = r)); const shot = api.shot(); assert.throws(() => api.model.set('suppressor', true), /busy/); assert.equal(api.model.controls()[0].value, false); finish('data:image/png;base64,eA=='); await shot;
});
await test('unsupported model switch restores prior variant and switch values', async () => {
  const { api, ix } = fixture(); await api.show('thing', { variant: '0' }); api.model.set('suppressor', true); const before = api.session(), bad = api.session();
  bad.subject.variant = '1'; bad.model.switches.unknown = true;
  await assert.rejects(api.restore(bad), /no switch/); assert.deepEqual(api.session().subject, before.subject); assert.deepEqual(api.session().model, before.model); assert.equal(ix.buttonCalls || 0, 0);
  bad.model.switches = { trigger: true }; await assert.rejects(api.restore(bad), /readable switch|toggle\/select/); assert.equal(ix.buttonCalls || 0, 0);
});
await test('invalid model JSON rejects before any stage mutation and old recipes still load', async () => {
  const { api, mutations } = fixture(); await api.show('thing'); const source = api.session();
  for (const alter of [(r) => r.model.switches.suppressor = {}, (r) => r.model.turntable = Infinity, (r) => r.model.switches.bad = 'x'.repeat(129)]) {
    const r = copy(source), n = mutations(); alter(r); assert.throws(() => api.restore(r)); assert.equal(mutations(), n);
  }
  delete source.model; await api.restore(source); assert.equal(api.current().id, 'thing');
});
await test('geometry smoke checks suppress history and restore its flag after cancel', async () => {
  const { api, ix } = fixture(); ix.skipHistory = false; const original = ix.show;
  ix.show = async (...args) => { if (args[0] === 'thing') assert.equal(ix.skipHistory, true); else assert.equal(ix.skipHistory, false); return original(...args); };
  await api.check({ only: 'thing' }); assert.equal(ix.skipHistory, false); const pending = api.check({ only: 'thing' }); api.cancel(); await assert.rejects(pending, { name: 'AbortError' }); assert.equal(ix.skipHistory, false);
});
await test('the eight canonical catalog switches have stable unique IDs', () => {
  const c = { T: {}, D: { WEAPON_ORDER: ['m4'] }, B: { gunSuppressor() {}, gunExtLook() {}, gunHeavyLook() {} } }, catalog = makeCatalog(c), g = new THREE.Group();
  g.userData = { suppressor: new THREE.Group(), flash: new THREE.Group(), laser: new THREE.Group() };
  assert.deepEqual(catalog.find((e) => e.id === 'weapon.m4').controls(c, g).map((v) => v.id), ['suppressor', 'ext', 'heavy', 'flash', 'laser']);
  g.userData._dwiVault = { setDoor() {}, setLift() {}, setCutaway() {} };
  assert.deepEqual(catalog.find((e) => e.id === 'prop.relay-vault').controls(c, g).map((v) => v.id), ['door', 'lift', 'cutaway']);
});
await test('paused model yaw survives restore and old recipes without yaw remain supported', async () => {
  const { api } = fixture(); await api.show('thing'); api.model.turntable(0.65); api.model.yaw(1.2); api.pause(); const before = api.session();
  api.model.yaw(-1); await api.restore(before); assert.ok(Math.abs(api.model.yaw() - 1.2) < 1e-9); assert.equal(api.model.turntable(), 0.65); assert.equal(api.time().paused, true);
  const old = api.session(); delete old.model.yaw; await api.restore(old); assert.equal(api.model.yaw(), 0); assert.throws(() => api.model.yaw(Infinity));
});
await test('held screenshots draw, fence and publish current pixels before returning; repeated holds are idempotent', async () => {
  const { api, ix } = fixture(), order = [];
  ix.nextFrame = async () => order.push('frame'); ix.host.loop = async (on) => order.push(on ? 'resume' : 'stop'); ix.host.render = async () => order.push('draw');
  ix.host.renderer = { waitForGPU: async () => { order.push('gpu'); await Promise.resolve(); order.push('gpu-done'); } };
  ix.presentFrame = () => order.push('copy'); ix.clearPresentation = () => order.push('clear');
  await api.still(true); assert.deepEqual(order, ['frame', 'stop', 'draw', 'gpu', 'gpu-done', 'copy']); assert.equal(ix._still, true); assert.equal(api.busy(), null);
  await api.still(true); assert.equal(order.length, 6); await api.still(false); assert.deepEqual(order.slice(-2), ['clear', 'resume']); assert.equal(ix._still, false);
  await api.still(false); assert.equal(order.filter((v) => v === 'resume').length, 1);
});
await test('a failed held-frame draw resumes rendering and rejects instead of saving stale pixels', async () => {
  const { api, ix } = fixture(), order = []; ix.host.loop = (on) => order.push(on); ix.host.render = () => { throw Error('draw failed'); };
  await assert.rejects(api.still(true), /draw failed/); assert.deepEqual(order, [false, true]); assert.equal(ix._still, false); assert.equal(api.busy(), null);
});
await test('a failed GPU presentation fence resumes rendering and releases the job lock', async () => {
  const { api, ix } = fixture(), order = []; ix.host.loop = (on) => order.push(on); ix.host.render = () => {};
  ix.host.renderer = { waitForGPU: async () => { throw Error('device lost'); } };
  await assert.rejects(api.still(true), /device lost/); assert.deepEqual(order, [false, true]); assert.equal(ix._still, false); assert.equal(api.busy(), null);
});
await test('held-frame presentation works with renderers that have no GPU fence method', async () => {
  const { api, ix } = fixture(); let rendered = 0; ix.host.render = () => rendered++; ix.host.renderer = {};
  await api.still(true); assert.equal(rendered, 1); assert.equal(ix._still, true); await api.still(false);
});
await test('cancelling a GPU presentation wait resumes the loop promptly', async () => {
  const { api, ix } = fixture(), order = []; let began;
  const started = new Promise((r) => began = r); ix.host.loop = (on) => order.push(on); ix.host.render = () => {};
  ix.host.renderer = { waitForGPU: () => { began(); return new Promise(() => {}); } };
  const pending = api.still(true); await started; assert.equal(ix._still, true); api.cancel(); await assert.rejects(pending, { name: 'AbortError' });
  assert.deepEqual(order, [false, true]); assert.equal(ix._still, false); assert.equal(api.busy(), null);
});
await test('GPU presentation has a real 15-second wall timeout and restores the loop on timeout', async () => {
  const { api, ix } = fixture(), requested = [], order = [], old = globalThis.setTimeout;
  ix.host.loop = (on) => order.push(on); ix.host.render = () => {}; ix.host.renderer = { waitForGPU: () => new Promise(() => {}) };
  globalThis.setTimeout = (fn, ms, ...args) => { requested.push(ms); return old(fn, ms === 15000 ? 1 : ms, ...args); };
  try { await assert.rejects(api.still(true), /GPU presentation timed out after 15000 ms/); assert.ok(requested.includes(15000)); assert.deepEqual(order, [false, true]); assert.equal(ix._still, false); assert.equal(api.busy(), null); }
  finally { globalThis.setTimeout = old; }
});
await test('a failed held pixel copy clears the presentation, resumes and rejects', async () => {
  const { api, ix } = fixture(), order = []; ix.host.loop = (on) => order.push(on ? 'resume' : 'stop'); ix.host.render = () => order.push('draw');
  ix.presentFrame = () => { order.push('copy'); throw Error('readback failed'); }; ix.clearPresentation = () => order.push('clear');
  await assert.rejects(api.still(true), /readback failed/); assert.deepEqual(order, ['stop', 'draw', 'copy', 'clear', 'resume']); assert.equal(ix._still, false); assert.equal(api.busy(), null);
});
await test('cancellation after publishing a held copy removes it before resuming', async () => {
  const { api, ix } = fixture(), order = []; ix.host.loop = (on) => order.push(on ? 'resume' : 'stop'); ix.host.render = () => {};
  ix.presentFrame = () => { order.push('copy'); api.cancel(); }; ix.clearPresentation = () => order.push('clear');
  await assert.rejects(api.still(true), { name: 'AbortError' }); assert.deepEqual(order, ['stop', 'copy', 'clear', 'resume']); assert.equal(ix._still, false); assert.equal(api.busy(), null);
});

console.log('RESULT ' + passed + ' API checks passed');
