// AG-415: Pure Node unit tests for the Training Ground optional interactive tutorial.
// Run: node --test game/training-tutorial.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TUTORIAL_STORAGE_KEY,
  TUTORIAL_MODULES,
  TUTORIAL_STEPS,
  AUTO_ADVANCE_S,
  createTrainingTutorial,
} from './training-tutorial.js';
import { hasText, text } from '../ui/strings.js';

function memoryStorage(initial = null) {
  let raw = initial;
  return {
    load: () => raw,
    save: (v) => { raw = v; },
    raw: () => raw,
  };
}

test('curriculum defines 10 frozen modules covering all core game systems with unique step IDs', () => {
  assert.equal(TUTORIAL_MODULES.length, 10);
  assert.ok(TUTORIAL_STEPS.length >= 35);
  assert.ok(Object.isFrozen(TUTORIAL_MODULES));
  assert.ok(Object.isFrozen(TUTORIAL_STEPS));

  const modIds = TUTORIAL_MODULES.map((m) => m.id);
  assert.deepEqual(modIds, [
    'movement',
    'marksmanship',
    'armory',
    'gear',
    'supplies',
    'hangar',
    'building',
    'emplacements',
    'combat',
    'campaign',
  ]);

  const seenSteps = new Set();
  for (const s of TUTORIAL_STEPS) {
    assert.ok(!seenSteps.has(s.id), `duplicate step id: ${s.id}`);
    seenSteps.add(s.id);
    assert.match(s.titleKey, /^tutorial\.step\./);
    assert.match(s.bodyKey, /^tutorial\.step\./);
    assert.match(s.noteKey, /^tutorial\.step\./);
    if (!s.manualContinue) {
      assert.ok(s.tasks.length >= 1, `interactive step ${s.id} must have tasks`);
    }
  }
});

test('tutorial starts idle, offers once, and respects dismissOffer persistence', () => {
  const store = memoryStorage();
  const tut = createTrainingTutorial({ load: store.load, save: store.save });
  assert.equal(tut.isActive(), false);
  assert.equal(tut.snapshot().shouldOffer, true);

  tut.dismissOffer();
  assert.equal(tut.snapshot().shouldOffer, false);
  assert.ok(store.raw());

  const tut2 = createTrainingTutorial({ load: store.load, save: store.save });
  assert.equal(tut2.snapshot().shouldOffer, false);
  assert.equal(tut2.snapshot().dismissedOffer, true);
});

test('corrupt or incompatible storage safely falls back to clean profile', () => {
  for (const bad of ['not-json', '{}', '{"version":99,"completedSteps":["move.walk"]}', 'null']) {
    const tut = createTrainingTutorial({ load: () => bad });
    const snap = tut.snapshot();
    assert.equal(snap.completedCount, 0);
    assert.equal(snap.graduated, false);
    assert.equal(snap.shouldOffer, true);
  }
});

test('full end-to-end playthrough of all 10 modules auto-advances and graduates cleanly', () => {
  const store = memoryStorage();
  const completedMods = [];
  const enteredSteps = [];
  let graduatedEvent = false;
  const tut = createTrainingTutorial({
    load: store.load,
    save: store.save,
    onStepEnter: (s) => enteredSteps.push(s.id),
    onModuleComplete: (m) => completedMods.push(m.id),
    onComplete: () => { graduatedEvent = true; },
  });

  const advance = (frame = {}) => {
    for (let i = 0; i < 8; i++) tut.tick(0.2, frame);
  };

  tut.start();
  assert.equal(tut.currentStep().id, 'move.walk');

  // 1.1 move.walk
  let x = 0;
  tut.tick(0.1, { pos: { x, z: 0 }, sprinting: false });
  for (let i = 0; i < 6; i++) { x += 0.6; tut.tick(0.1, { pos: { x, z: 0 }, sprinting: true }); }
  assert.equal(tut.snapshot().stepDone, true);
  advance({ pos: { x, z: 0 } });
  assert.equal(tut.currentStep().id, 'move.posture');

  // 1.2 move.posture
  tut.recordEvent('jump');
  tut.tick(0.2, { crouching: true });
  tut.tick(0.2, { crouching: true });
  assert.equal(tut.snapshot().stepDone, true);
  advance({});
  assert.equal(tut.currentStep().id, 'move.slowmo');

  // 1.3 move.slowmo
  tut.recordEvent('slowmo');
  assert.equal(tut.snapshot().stepDone, true);
  advance({});
  assert.equal(tut.currentStep().id, 'move.camera');

  // 1.4 move.camera
  tut.recordEvent('view-toggle');
  tut.recordEvent('zoom-used');
  tut.recordEvent('camera-zoom');
  assert.equal(tut.snapshot().stepDone, true);
  advance({ unarmed: true });
  assert.equal(tut.currentStep().id, 'range.draw');
  assert.ok(completedMods.includes('movement'));

  // 2.1 range.draw
  tut.tick(0.1, { unarmed: false });
  assert.equal(tut.snapshot().stepDone, true);
  advance({});
  assert.equal(tut.currentStep().id, 'range.targets');

  // 2.2 range.targets (3 hits, including dw-game detail containing its own .type field)
  tut.recordEvent('target-hit', { type: 'training-target', lane: 1 });
  tut.recordEvent('target-hit', { type: 'training-target', lane: 2 });
  assert.equal(tut.snapshot().stepDone, false);
  tut.recordEvent('target-hit', { type: 'training-target', lane: 3 });
  assert.equal(tut.snapshot().stepDone, true);
  advance({});
  assert.equal(tut.currentStep().id, 'range.reload');

  // 2.3 range.reload
  tut.recordEvent('reload');
  advance({});
  assert.equal(tut.currentStep().id, 'range.melee');

  // 2.4 range.melee
  tut.recordEvent('dummy-hit');
  advance({});
  assert.equal(tut.currentStep().id, 'range.console');

  // 2.5 range.console
  tut.recordEvent('range-console-open');
  advance({});
  assert.equal(tut.currentStep().id, 'armory.visit');
  assert.ok(completedMods.includes('marksmanship'));

  // 3.1 armory.visit
  tut.recordEvent('armory-open');
  advance({ currentWeapon: 'pistol', weaponOwned: { pistol: true } });
  assert.equal(tut.currentStep().id, 'armory.rifle');

  // 3.2 armory.rifle
  tut.tick(0.1, { currentWeapon: 'm4', unarmed: false, weaponOwned: { pistol: true, m4: true } });
  tut.recordEvent('weapon-wheel');
  advance({ currentWeapon: 'm4' });
  assert.equal(tut.currentStep().id, 'armory.firemode');

  // 3.3 armory.firemode
  tut.recordEvent('fire-mode-toggle');
  advance({ shotgunLoadedType: 'birdshot' });
  assert.equal(tut.currentStep().id, 'armory.shotgun');

  // 3.4 armory.shotgun
  tut.tick(0.1, { weaponOwned: { pistol: true, m4: true, shotgun: true }, shotgunAltShells: 20, shotgunLoadedType: 'buckshot' });
  assert.equal(tut.snapshot().stepDone, true);
  advance({});
  assert.equal(tut.currentStep().id, 'armory.akimbo');

  // 3.5 armory.akimbo
  tut.tick(0.1, { hasAnyPair: true, akimboActive: true });
  advance({ fittedModCount: 0 });
  assert.equal(tut.currentStep().id, 'armory.workbench');

  // 3.6 armory.workbench
  tut.recordEvent('mod-fitted', { mod: 'optic:rmr' });
  advance({});
  assert.equal(tut.currentStep().id, 'gear.cif');
  assert.ok(completedMods.includes('armory'));

  // 4.1 gear.cif
  tut.recordEvent('cif-open');
  tut.tick(0.1, { gearOwned: { helmet: true, nvg: true } });
  advance({});
  assert.equal(tut.currentStep().id, 'gear.lights');

  // 4.2 gear.lights
  tut.tick(0.1, { lightsOff: true });
  advance({});
  assert.equal(tut.currentStep().id, 'gear.darkops');

  // 4.3 gear.darkops
  tut.recordEvent('nvg-toggle');
  tut.recordEvent('flashlight-toggle');
  tut.recordEvent('laser-toggle');
  advance({});
  assert.equal(tut.currentStep().id, 'supplies.kiosk');
  assert.ok(completedMods.includes('gear'));

  // 5.1 supplies.kiosk
  tut.recordEvent('shop-open');
  tut.tick(0.1, { medkits: 1 });
  advance({});
  assert.equal(tut.currentStep().id, 'supplies.grenade');

  // 5.2 supplies.grenade
  tut.recordEvent('grenade-thrown');
  advance({});
  assert.equal(tut.currentStep().id, 'supplies.medpen');

  // 5.3 supplies.medpen
  tut.recordEvent('medpen-used');
  advance({});
  assert.equal(tut.currentStep().id, 'hangar.door');
  assert.ok(completedMods.includes('supplies'));

  // 6.1 hangar.door
  tut.recordEvent('door-toggle');
  advance({});
  assert.equal(tut.currentStep().id, 'hangar.enter');

  // 6.2 hangar.enter
  tut.tick(0.1, { inBuildRoom: true });
  advance({ wheelPage: 0 });
  assert.equal(tut.currentStep().id, 'build.wheel');
  assert.ok(completedMods.includes('hangar'));

  // 7.1 build.wheel
  tut.recordEvent('build-wheel');
  tut.recordEvent('build-page', { page: 1 });
  advance({ buildCount: 0 });
  assert.equal(tut.currentStep().id, 'build.place');

  // 7.2 build.place
  tut.recordEvent('build-rotate');
  tut.recordEvent('build-place', { kind: 'wall' });
  advance({});
  assert.equal(tut.currentStep().id, 'build.stack');

  // 7.3 build.stack
  tut.recordEvent('build-place', { kind: 'platform' });
  advance({});
  assert.equal(tut.currentStep().id, 'build.maintain');

  // 7.4 build.maintain
  tut.recordEvent('build-upgrade');
  tut.recordEvent('build-repair');
  tut.recordEvent('build-scrap');
  advance({});
  assert.equal(tut.currentStep().id, 'build.vault');

  // 7.5 build.vault
  tut.recordEvent('vault');
  advance({});
  assert.equal(tut.currentStep().id, 'emplace.trap');
  assert.ok(completedMods.includes('building'));

  // 8.1 emplace.trap
  tut.recordEvent('build-place', { kind: 'barrel' });
  advance({});
  assert.equal(tut.currentStep().id, 'emplace.turret');

  // 8.2 emplace.turret
  tut.recordEvent('build-place', { kind: 'light' });
  advance({});
  assert.equal(tut.currentStep().id, 'emplace.crew');

  // 8.3 emplace.crew
  tut.recordEvent('build-place', { kind: 'mortar' });
  tut.recordEvent('mortar-mount');
  tut.recordEvent('mortar-fire');
  tut.recordEvent('mortar-carry');
  advance({});
  assert.equal(tut.currentStep().id, 'combat.panel');
  assert.ok(completedMods.includes('emplacements'));

  // 9.1 combat.panel
  tut.recordEvent('hq-panel-open');
  advance({});
  assert.equal(tut.currentStep().id, 'combat.wave');

  // 9.2 combat.wave
  tut.recordEvent('wave-launch');
  tut.tick(0.1, { waveQueued: false, zombiesAlive: 3 });
  tut.recordEvent('zombie-kill');
  tut.tick(0.1, { waveQueued: false, zombiesAlive: 0 });
  assert.equal(tut.snapshot().stepDone, true);
  advance({});
  assert.equal(tut.currentStep().id, 'combat.skulls');

  // 9.3 combat.skulls
  tut.recordEvent('skull-pickup');
  tut.recordEvent('skull-bank');
  advance({});
  assert.equal(tut.currentStep().id, 'campaign.infirmary');
  assert.ok(completedMods.includes('combat'));

  // 10.1 campaign.infirmary
  tut.tick(0.1, { nearInfirmary: true });
  advance({});
  assert.equal(tut.currentStep().id, 'campaign.briefing');

  // 10.2 campaign.briefing (manualContinue)
  tut.tick(5, {});
  assert.equal(tut.currentStep().id, 'campaign.briefing');
  tut.next();
  assert.equal(tut.currentStep().id, 'campaign.graduate');
  assert.equal(graduatedEvent, true);
  assert.equal(tut.snapshot().graduated, true);
  assert.equal(tut.snapshot().percent, 100);
  assert.equal(completedMods.length, 10);

  // Persist reload preserves 100% completion and graduation
  const reloaded = createTrainingTutorial({ load: store.load, save: store.save });
  assert.equal(reloaded.snapshot().graduated, true);
  assert.equal(reloaded.snapshot().percent, 100);
  assert.equal(reloaded.snapshot().shouldOffer, false);
});

test('skip, prev, jumpToModule, jumpToStep, collapse, stop and resetProgress work cleanly', () => {
  const store = memoryStorage();
  const tut = createTrainingTutorial({ load: store.load, save: store.save });

  tut.jumpToModule('building');
  assert.equal(tut.isActive(), true);
  assert.equal(tut.currentStep().id, 'build.wheel');

  tut.skip();
  assert.equal(tut.currentStep().id, 'build.place');
  assert.equal(tut.snapshot().completedCount, 0);

  tut.prev();
  assert.equal(tut.currentStep().id, 'build.wheel');

  tut.jumpToStep('combat.skulls');
  assert.equal(tut.currentStep().id, 'combat.skulls');

  tut.setCollapsed(true);
  assert.equal(tut.snapshot().collapsed, true);

  tut.stop();
  assert.equal(tut.isActive(), false);

  // Resume picks up at lastStepId
  tut.start();
  assert.equal(tut.currentStep().id, 'combat.skulls');

  // Reset clears completion and jumps back to step 0 while active
  tut.next(true);
  assert.ok(tut.snapshot().completedCount >= 1);
  tut.resetProgress();
  assert.equal(tut.snapshot().completedCount, 0);
  assert.equal(tut.currentStep().id, 'move.walk');
  assert.equal(TUTORIAL_STORAGE_KEY, 'tt_training_tutorial_v1');
});

test('every string key referenced across all 10 modules and 37 steps exists in ui/strings.js', () => {
  const mustHave = (k) => {
    assert.ok(hasText(k), `missing string key: ${k}`);
    const out = text(k);
    assert.ok(out.length > 0, `empty formatted string: ${k}`);
  };
  for (const mod of TUTORIAL_MODULES) {
    mustHave(mod.titleKey);
    mustHave(mod.descKey);
    for (const s of mod.steps) {
      mustHave(s.titleKey);
      mustHave(s.bodyKey);
      mustHave(s.noteKey);
      for (const k of s.keys) mustHave('tutorial.key.' + k);
      for (const t of s.tasks) mustHave(t.labelKey);
      if (s.waypoint?.labelKey) mustHave(s.waypoint.labelKey);
      if (s.assist?.labelKey) mustHave(s.assist.labelKey);
      if (s.briefingBullets) for (const b of s.briefingBullets) mustHave(b);
    }
  }
});
