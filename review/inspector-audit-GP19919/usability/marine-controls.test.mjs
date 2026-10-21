import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMarineDesk } from '../../../studio/inspector/marine.js';
import { readListSetting, readChoiceSetting } from '../../../studio/inspector/ui.js';

class KeyEvent extends Event { constructor(type, options) { super(type, options); this.code = options.code; this.key = options.key; } }
globalThis.KeyboardEvent = KeyEvent;

function fixture() {
  const events = [], waits = [], log = [], active = { weapon: 'm4', unarmed: false, akimbo: false, charging: false };
  const body = { dispatchEvent(e) { events.push(e.type + ':' + e.code); if (e.code === 'KeyG') { if (e.type === 'keydown') active.charging = true; else if (active.charging) { active.charging = false; log.push('throw'); } } } };
  globalThis.document = { body };
  globalThis.window = { dispatchEvent(e) { events.push(e.type); if (e.type === 'blur') active.charging = false; } };
  const T = {
    WEAPON_ORDER: ['m4', 'pistol', 'chainsaw'], getCurrentWeapon: () => active.weapon, isUnarmed: () => active.unarmed,
    toggleHolster: () => { active.unarmed = !active.unarmed; }, setWeapon: (i) => { active.weapon = T.WEAPON_ORDER[i]; log.push('weapon:' + active.weapon); },
    player: { position: { x: 0, z: 0 }, rotation: { y: 0 } },
    setMouseFireDbg: (on) => log.push('fire:' + on), setZoomHeldDbg: (on) => log.push('aim:' + on),
    setDiveMeterDbg: (n) => log.push('meter:' + n), setGrenadesDbg: (n) => log.push('grenades:' + n), setAmmoDbg: () => {},
    gaitDbg: { GAIT: { holdU: null, holdRun: 0 } }, reloadClipDbg: { hold: (n) => log.push('reload:' + n) },
    handsDbg: { knifeHold: (n) => log.push('knife:' + n), drawHold: (n) => log.push('draw:' + n) },
    holdGrenadeAnim: (phase, time) => log.push('grenadeHold:' + phase + ':' + time),
    getCamo: () => 'm81', isKatanaOwned: () => false, isMacheteOwned: () => false,
    spawnBuild: () => { log.push('spawn'); return { x: 0, z: 1, mesh: { rotation: { y: 0 } } }; },
    builds: [], removeBuild: () => log.push('removeBuild'), mountMortar: () => log.push('mount'), shoulderMortar: () => log.push('carry'),
    setHp: () => {}, buyMedkit: () => {},
  };
  const ix = {
    T, host: { keys: { KeyW: false, KeyS: false, Space: false }, state: () => active, placePlayer: () => log.push('home') },
    stage: { center: { x: 0, z: 0 } }, clock: { gameTime: 0 }, errors: [],
    waitGame(sec, signal) {
      return new Promise((resolve, reject) => {
        const w = { sec, signal, resolve: () => { signal?.removeEventListener('abort', abort); w.done = true; resolve(); }, done: false };
        function abort() { w.done = true; reject(new DOMException('Move cancelled', 'AbortError')); }
        if (signal?.aborted) abort(); else { signal?.addEventListener('abort', abort, { once: true }); waits.push(w); }
      });
    },
  };
  const desk = createMarineDesk(ix);
  const advance = async () => { const w = waits.find((x) => !x.done); assert.ok(w, 'move has a pending game wait'); w.resolve(); await tick(); };
  return { desk, ix, T, events, waits, log, active, advance };
}
const tick = () => new Promise((r) => setImmediate(r));

test('damaged and incompatible persisted settings use safe defaults', () => {
  for (const raw of ['{', 'null', '{}', '9', 'true', '"Marine"']) assert.deepEqual(readListSetting(raw, ['Marine', 'Weapons']), []);
  assert.deepEqual(readListSetting('["Marine", "bad", "Marine", 7, "Weapons"]', ['Marine', 'Weapons']), ['Marine', 'Weapons']);
  assert.equal(readChoiceSetting('removed-tab', ['Moves', 'Kit'], 'Moves'), 'Moves');
  assert.equal(readChoiceSetting('Kit', ['Moves', 'Kit'], 'Moves'), 'Kit');
});
test('move and loop getters reflect the running desk rather than copied initial values', async () => {
  const f = fixture(); await f.desk.play('walk'); assert.equal(f.desk.move.id, 'walk');
  f.desk.setLoop(false); assert.equal(f.desk.loop, false); assert.equal(f.desk.state().loop, false);
  f.desk.stop(); assert.equal(f.desk.move, null); assert.equal(f.ix.host.keys.KeyW, false);
});
test('stop clears each debug hold, and values stay finite and within the control domain', () => {
  const f = fixture();
  f.desk.hold('walk', .3); f.desk.hold('run', .7); assert.equal(f.desk.holdState('walk'), null); assert.equal(f.T.gaitDbg.GAIT.holdRun, 1);
  for (const k of ['reload', 'knife', 'draw']) f.desk.hold(k, 4);
  f.desk.hold('grenade', ['throw', 4]);
  assert.equal(f.desk.holdState('reload'), 1); assert.equal(f.desk.holdState('draw'), 1.2); assert.deepEqual(f.desk.holdState('grenade'), ['throw', .6]);
  assert.throws(() => f.desk.hold('knife', NaN)); assert.throws(() => f.desk.hold('grenade', ['broken', .2]));
  f.desk.stop(); assert.deepEqual(f.desk.state().holds, {}); assert.equal(f.T.gaitDbg.GAIT.holdU, null);
  for (const k of ['reload', 'knife', 'draw']) assert.ok(f.log.includes(k + ':null'));
  assert.ok(f.log.includes('grenadeHold:null:0'));
});
test('a cancelled dive cannot press V or release a new move key later', async () => {
  const f = fixture(), old = f.desk.play('dive-forward'); await f.advance();
  assert.equal(f.ix.host.keys.KeyW, true); f.desk.stop(); await old; await f.desk.play('walk');
  assert.ok(!f.events.includes('keydown:KeyV')); assert.equal(f.ix.host.keys.KeyW, true); assert.equal(f.desk.move.id, 'walk');
});
test('cancelling a charged grenade cancels via blur before releasing G, without throwing', async () => {
  const f = fixture(), old = f.desk.play('grenade'); await f.advance(); assert.equal(f.active.charging, true);
  f.desk.stop(); await old; assert.equal(f.active.charging, false); assert.ok(!f.log.includes('throw'));
  assert.ok(f.events.indexOf('blur') < f.events.indexOf('keyup:KeyG')); assert.equal(f.ix.errors.length, 0);
});
test('cancelling aimed fire prevents the delayed old burst', async () => {
  const f = fixture(), old = f.desk.play('fire-aimed'); await tick(); assert.ok(f.log.includes('aim:true'));
  f.desk.stop(); await old; assert.ok(!f.log.includes('fire:true'));
});
test('cancelled prop and medpen sequences cannot mount or use gear after switching subjects', async () => {
  for (const [id, forbidden] of [['m240', 'mount'], ['m240-carry', 'carry'], ['medpen', 'keydown:KeyH']]) {
    const f = fixture(), old = f.desk.play(id); await tick(); f.desk.stop(); await old;
    assert.ok(!f.log.includes(forbidden) && !f.events.includes(forbidden), id); assert.ok(f.waits.every((w) => w.done));
  }
});
test('a failed setup rejects to its caller and leaves a visible error without continuing the move', async () => {
  const f = fixture();
  await assert.rejects(f.desk.play('reload-ak'), /no gun/); assert.equal(f.desk.move, null);
  assert.match(f.desk.state().error, /no gun/); assert.equal(f.ix.errors.length, 1); assert.ok(!f.events.includes('keydown:KeyR'));
});

test('stopping carried M240 uses the existing set-down export and removes the fresh owned piece', async () => {
  const f = fixture(), foreign = { type: 'wall' }; let mounted = null, carried = null, ghost = false, buildMode = false, dropped = null;
  f.T.builds.push(foreign);
  f.T.spawnBuild = (type, x, z) => { const b = { type, x, z, mesh: { rotation: { y: 0 } } }; f.T.builds.push(b); return b; };
  f.T.removeBuild = (b) => { const i = f.T.builds.indexOf(b); if (i >= 0) f.T.builds.splice(i, 1); };
  f.T.mountMortar = (b) => { mounted = b; f.active.mortar = b.type; };
  f.T.dismountMortar = () => { mounted = null; f.active.mortar = null; };
  f.T.shoulderMortar = () => { carried = { kind: mounted.type }; f.active.carried = true; f.T.removeBuild(mounted); f.T.dismountMortar(); ghost = buildMode = true; };
  f.T.getMortarCarried = () => carried;
  f.T.m240VisDbg = () => ({ setDown(x, z, immediate) { assert.equal(immediate, true); dropped = f.T.spawnBuild(carried.kind, x, z); carried = null; f.active.carried = false; buildMode = false; } });
  f.T.updateGhostPreview = () => { if (!buildMode) ghost = false; };
  const move = f.desk.play('m240-carry'); await tick(); await f.advance(); await f.advance(); await move;
  assert.equal(f.active.carried, true); assert.equal(ghost, true); assert.equal(buildMode, true);
  f.desk.stop();
  assert.equal(f.active.carried, false); assert.equal(f.active.mortar, null); assert.equal(ghost, false); assert.equal(buildMode, false);
  assert.equal(dropped._dwi, true); assert.deepEqual(f.T.builds, [foreign]);
  const next = f.desk.play('mortar'); await tick(); await f.advance(); await next;
  assert.equal(f.active.mortar, 'mortar'); assert.equal(f.active.carried, false);
  f.desk.stop(); assert.equal(f.active.mortar, null); assert.deepEqual(f.T.builds, [foreign]);
});

test('silent mount failure rejects rather than reporting that a crew-served move ran', async () => {
  const f = fixture(), move = f.desk.play('m240'); const rejection = assert.rejects(move, /did not mount the m240/);
  await tick(); await f.advance(); await rejection; assert.equal(f.desk.move, null); assert.match(f.desk.state().error, /did not mount/);
});

test('silent shoulder failure rejects rather than reporting a carried weapon', async () => {
  const f = fixture(); f.T.mountMortar = () => { f.active.mortar = 'm240'; }; f.T.dismountMortar = () => { f.active.mortar = null; };
  const move = f.desk.play('m240-carry'); const rejection = assert.rejects(move, /did not shoulder the m240/);
  await tick(); await f.advance(); await f.advance(); await rejection; assert.equal(f.desk.move, null); assert.equal(f.active.mortar, null);
});

test('stopping knockout restores the captured live body transforms and clears blackout and wake', async () => {
  const f = fixture();
  class Value { constructor(v) { this.v = v; } clone() { return new Value(this.v); } copy(o) { this.v = o.v; return this; } }
  const obj = (n) => ({ position: new Value(n), quaternion: new Value(n + 1), scale: new Value(1), visible: true });
  const pivot = obj(4), marine = obj(6), mount = obj(8); f.ix.host.rollPivot = pivot; f.T.marine = marine; marine.userData = { weaponMount: mount };
  const classes = new Set(), training = { wake: null, blackout: { classList: { add: (s) => classes.add(s), remove: (s) => classes.delete(s) } } }; let backdrop = 'studio', audioEnded = false;
  f.ix.host.training = () => training; f.ix.host.audio = { knockoutEnd: () => { audioEnded = true; } };
  f.ix.stage.backdrop = (value) => value == null ? backdrop : (backdrop = value);
  f.T.trainingDbg = { blackout() { training.wake = {}; classes.add('on'); for (const node of [pivot, marine, mount]) { node.position.v = 100; node.quaternion.v = 200; node.visible = false; } } };
  await f.desk.play('knockout'); assert.ok(classes.has('on')); f.desk.stop();
  assert.equal(training.wake, null); assert.equal(classes.has('on'), false); assert.equal(audioEnded, true); assert.equal(backdrop, 'studio');
  assert.equal(pivot.position.v, 4); assert.equal(pivot.quaternion.v, 5); assert.equal(marine.position.v, 6); assert.equal(mount.position.v, 8); assert.equal(mount.visible, true);
});
