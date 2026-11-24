// AG-415: Full-fledged optional interactive tutorial state machine for the Training Ground.
// Pure ES module: no DOM, Three.js, timers or direct localStorage access (inject load/save).
// Covers all 10 core pillars of Grave Shift across 37 hands-on, skippable, jumpable steps.

export const TUTORIAL_STORAGE_KEY = 'tt_training_tutorial_v1';
export const AUTO_ADVANCE_S = 1.15;

export const SELECTOR_WEAPONS = Object.freeze(['m4', 'ak', 'aa12', 'pistol']);
export const AKIMBO_WEAPONS = Object.freeze(['pistol', 'uzi', 'revolver']);
export const STACK_BUILD_KINDS = Object.freeze(['platform', 'floor', 'stairs', 'window', 'door', 'railing', 'pillar']);
export const TRAP_BUILD_KINDS = Object.freeze(['wire', 'spikes', 'mine', 'barrel', 'lure', 'gate']);
export const TURRET_BUILD_KINDS = Object.freeze(['light', 'flame', 'heavy']);
export const CREW_BUILD_KINDS = Object.freeze(['mortar', 'm240']);
export const COVER_BUILD_KINDS = Object.freeze(['sandbag', 'barricade', 'wire', 'window']);

// Helper to create a clean task entry checked against (ctx: { frame, stepEvents, stepTime, baseline }).
function task(id, labelKey, check, progress = null) {
  return Object.freeze({ id, labelKey, check, progress });
}

// 10 comprehensive modules taking a player from first footsteps through live combat, building & campaign readiness.
const RAW_MODULES = [
  {
    id: 'movement',
    titleKey: 'tutorial.mod.movement.title',
    descKey: 'tutorial.mod.movement.desc',
    steps: [
      {
        id: 'move.walk',
        titleKey: 'tutorial.step.move.walk.title',
        bodyKey: 'tutorial.step.move.walk.body',
        noteKey: 'tutorial.step.move.walk.note',
        keys: ['move', 'run'],
        waypoint: { kind: 'point', localX: 0, localZ: -4.2, labelKey: 'tutorial.wp.rangeFloor' },
        tasks: [
          task('walk', 'tutorial.task.walk', (c) => c.stepDist >= 3.0, (c) => ({ cur: Math.min(3, Math.floor(c.stepDist)), max: 3, unit: 'm' })),
          task('sprint', 'tutorial.task.sprint', (c) => c.stepSprintDist >= 2.2, (c) => ({ cur: Math.min(2, Math.floor(c.stepSprintDist)), max: 2, unit: 'm' })),
        ],
      },
      {
        id: 'move.posture',
        titleKey: 'tutorial.step.move.posture.title',
        bodyKey: 'tutorial.step.move.posture.body',
        noteKey: 'tutorial.step.move.posture.note',
        keys: ['jump', 'crouch'],
        waypoint: null,
        tasks: [
          task('jump', 'tutorial.task.jump', (c) => c.count('jump') >= 1),
          task('crouch', 'tutorial.task.crouch', (c) => c.count('crouch') >= 1 || c.stepCrouchTime >= 0.35),
        ],
      },
      {
        id: 'move.slowmo',
        titleKey: 'tutorial.step.move.slowmo.title',
        bodyKey: 'tutorial.step.move.slowmo.body',
        noteKey: 'tutorial.step.move.slowmo.note',
        keys: ['slowTime'],
        onEnterAction: 'refillSlowmo',
        tasks: [
          task('slowmo', 'tutorial.task.slowmo', (c) => c.count('slowmo') >= 1 || !!c.frame.slowmoActive),
        ],
      },
      {
        id: 'move.camera',
        titleKey: 'tutorial.step.move.camera.title',
        bodyKey: 'tutorial.step.move.camera.body',
        noteKey: 'tutorial.step.move.camera.note',
        keys: ['view', 'aim'],
        tasks: [
          task('view', 'tutorial.task.viewToggle', (c) => c.count('view-toggle') >= 1 || c.frame.viewFirst !== c.baseline.viewFirst),
          task('zoom', 'tutorial.task.aimZoom', (c) => c.count('zoom-used') >= 1 || !!c.frame.zoomHeld),
          task('orbit', 'tutorial.task.cameraAdjust', (c) =>
            c.count('camera-zoom') >= 1 || c.count('camera-rotate') >= 1 ||
            c.count('view-toggle') >= 2 || c.stepCameraDelta >= 0.45),
        ],
      },
    ],
  },
  {
    id: 'marksmanship',
    titleKey: 'tutorial.mod.marksmanship.title',
    descKey: 'tutorial.mod.marksmanship.desc',
    steps: [
      {
        id: 'range.draw',
        titleKey: 'tutorial.step.range.draw.title',
        bodyKey: 'tutorial.step.range.draw.body',
        noteKey: 'tutorial.step.range.draw.note',
        keys: ['holster'],
        waypoint: { kind: 'point', localX: 0, localZ: -0.9, labelKey: 'tutorial.wp.firingLine' },
        tasks: [
          task('draw', 'tutorial.task.drawWeapon', (c) => !c.frame.unarmed || c.count('holster-toggle') >= 1),
        ],
      },
      {
        id: 'range.targets',
        titleKey: 'tutorial.step.range.targets.title',
        bodyKey: 'tutorial.step.range.targets.body',
        noteKey: 'tutorial.step.range.targets.note',
        keys: ['fire', 'aim'],
        waypoint: { kind: 'point', localX: 0, localZ: -0.9, labelKey: 'tutorial.wp.firingLine' },
        tasks: [
          task('hits', 'tutorial.task.dropTargets', (c) => c.count('target-hit') >= 3,
            (c) => ({ cur: Math.min(3, c.count('target-hit')), max: 3 })),
        ],
      },
      {
        id: 'range.reload',
        titleKey: 'tutorial.step.range.reload.title',
        bodyKey: 'tutorial.step.range.reload.body',
        noteKey: 'tutorial.step.range.reload.note',
        keys: ['fire', 'reload'],
        tasks: [
          task('reload', 'tutorial.task.reload', (c) => c.count('reload') >= 1 || (!!c.frame.reloading && !c.baseline.reloading)),
        ],
      },
      {
        id: 'range.melee',
        titleKey: 'tutorial.step.range.melee.title',
        bodyKey: 'tutorial.step.range.melee.body',
        noteKey: 'tutorial.step.range.melee.note',
        keys: ['melee'],
        waypoint: { kind: 'dummy', labelKey: 'tutorial.wp.dummy' },
        tasks: [
          task('strike', 'tutorial.task.strikeDummy', (c) => c.count('dummy-hit') >= 1),
        ],
      },
      {
        id: 'range.console',
        titleKey: 'tutorial.step.range.console.title',
        bodyKey: 'tutorial.step.range.console.body',
        noteKey: 'tutorial.step.range.console.note',
        keys: ['interact'],
        waypoint: { kind: 'station', station: 'rangeConsole', labelKey: 'tutorial.wp.rangeConsole' },
        tasks: [
          task('openConsole', 'tutorial.task.openRangeConsole', (c) => c.count('range-console-open') >= 1 || !!c.frame.rangeConsoleOpen),
        ],
      },
    ],
  },
  {
    id: 'armory',
    titleKey: 'tutorial.mod.armory.title',
    descKey: 'tutorial.mod.armory.desc',
    steps: [
      {
        id: 'armory.visit',
        titleKey: 'tutorial.step.armory.visit.title',
        bodyKey: 'tutorial.step.armory.visit.body',
        noteKey: 'tutorial.step.armory.visit.note',
        keys: ['interact'],
        waypoint: { kind: 'station', station: 'armory', labelKey: 'tutorial.wp.armory' },
        tasks: [
          task('openArmory', 'tutorial.task.openArmory', (c) => c.count('armory-open') >= 1 || !!c.frame.armoryOpen),
        ],
      },
      {
        id: 'armory.rifle',
        titleKey: 'tutorial.step.armory.rifle.title',
        bodyKey: 'tutorial.step.armory.rifle.body',
        noteKey: 'tutorial.step.armory.rifle.note',
        keys: ['weaponWheel'],
        waypoint: { kind: 'station', station: 'armory', labelKey: 'tutorial.wp.armory' },
        assist: { id: 'issueRifle', labelKey: 'tutorial.assist.issueRifle' },
        tasks: [
          task('ownRifle', 'tutorial.task.ownAutoRifle', (c) => !!(c.frame.weaponOwned?.m4 || c.frame.weaponOwned?.ak || c.frame.weaponOwned?.aa12)),
          task('switchGun', 'tutorial.task.useWeaponWheel', (c) =>
            c.count('weapon-wheel') >= 1 || c.count('weapon-switch') >= 1 ||
            (c.frame.currentWeapon && c.frame.currentWeapon !== c.baseline.currentWeapon && !c.frame.unarmed)),
        ],
      },
      {
        id: 'armory.firemode',
        titleKey: 'tutorial.step.armory.firemode.title',
        bodyKey: 'tutorial.step.armory.firemode.body',
        noteKey: 'tutorial.step.armory.firemode.note',
        keys: ['fireMode'],
        assist: { id: 'equipSelectorRifle', labelKey: 'tutorial.assist.equipSelectorRifle' },
        tasks: [
          task('selector', 'tutorial.task.toggleFireMode', (c) => c.count('fire-mode-toggle') >= 1),
        ],
      },
      {
        id: 'armory.shotgun',
        titleKey: 'tutorial.step.armory.shotgun.title',
        bodyKey: 'tutorial.step.armory.shotgun.body',
        noteKey: 'tutorial.step.armory.shotgun.note',
        keys: ['ammoType'],
        waypoint: { kind: 'station', station: 'armory', labelKey: 'tutorial.wp.armory' },
        assist: { id: 'issueShotgunShells', labelKey: 'tutorial.assist.issueShotgunShells' },
        tasks: [
          task('ownShotgun', 'tutorial.task.ownShotgun', (c) => !!c.frame.weaponOwned?.shotgun),
          task('ownShells', 'tutorial.task.ownAltShells', (c) => (c.frame.shotgunAltShells || 0) > 0),
          task('switchShells', 'tutorial.task.switchShotgunAmmo', (c) =>
            c.count('ammo-switch') >= 1 || (c.frame.shotgunLoadedType && c.frame.shotgunLoadedType !== c.baseline.shotgunLoadedType)),
        ],
      },
      {
        id: 'armory.akimbo',
        titleKey: 'tutorial.step.armory.akimbo.title',
        bodyKey: 'tutorial.step.armory.akimbo.body',
        noteKey: 'tutorial.step.armory.akimbo.note',
        keys: ['akimbo'],
        waypoint: { kind: 'station', station: 'armory', labelKey: 'tutorial.wp.armory' },
        assist: { id: 'issuePairedPistol', labelKey: 'tutorial.assist.issuePairedPistol' },
        tasks: [
          task('ownPair', 'tutorial.task.ownPair', (c) => !!c.frame.hasAnyPair),
          task('toggleAkimbo', 'tutorial.task.toggleAkimbo', (c) => c.count('akimbo-toggle') >= 1 || !!c.frame.akimboActive),
        ],
      },
      {
        id: 'armory.workbench',
        titleKey: 'tutorial.step.armory.workbench.title',
        bodyKey: 'tutorial.step.armory.workbench.body',
        noteKey: 'tutorial.step.armory.workbench.note',
        keys: ['interact'],
        waypoint: { kind: 'station', station: 'armory', labelKey: 'tutorial.wp.armory' },
        assist: { id: 'fitSampleMods', labelKey: 'tutorial.assist.fitSampleMods' },
        tasks: [
          task('fitMod', 'tutorial.task.fitAnyMod', (c) => c.count('mod-fitted') >= 1 || (c.frame.fittedModCount || 0) > (c.baseline.fittedModCount || 0)),
        ],
      },
    ],
  },
  {
    id: 'gear',
    titleKey: 'tutorial.mod.gear.title',
    descKey: 'tutorial.mod.gear.desc',
    steps: [
      {
        id: 'gear.cif',
        titleKey: 'tutorial.step.gear.cif.title',
        bodyKey: 'tutorial.step.gear.cif.body',
        noteKey: 'tutorial.step.gear.cif.note',
        keys: ['interact'],
        waypoint: { kind: 'station', station: 'cif', labelKey: 'tutorial.wp.cif' },
        assist: { id: 'issueHelmetNvg', labelKey: 'tutorial.assist.issueHelmetNvg' },
        tasks: [
          task('openCif', 'tutorial.task.openCif', (c) => c.count('cif-open') >= 1 || !!c.frame.cifOpen || (!!c.frame.gearOwned?.helmet && !!c.frame.gearOwned?.nvg)),
          task('buyHelmet', 'tutorial.task.ownHelmet', (c) => !!c.frame.gearOwned?.helmet),
          task('buyNvg', 'tutorial.task.ownNvg', (c) => !!c.frame.gearOwned?.nvg),
        ],
      },
      {
        id: 'gear.lights',
        titleKey: 'tutorial.step.gear.lights.title',
        bodyKey: 'tutorial.step.gear.lights.body',
        noteKey: 'tutorial.step.gear.lights.note',
        keys: ['interact'],
        waypoint: { kind: 'station', station: 'lightSwitch', labelKey: 'tutorial.wp.lightSwitch' },
        tasks: [
          task('lightsOff', 'tutorial.task.turnLightsOff', (c) => !!c.frame.lightsOff || c.count('lights-toggle') >= 1),
        ],
      },
      {
        id: 'gear.darkops',
        titleKey: 'tutorial.step.gear.darkops.title',
        bodyKey: 'tutorial.step.gear.darkops.body',
        noteKey: 'tutorial.step.gear.darkops.note',
        keys: ['nightVision', 'flashlight', 'laser'],
        assist: { id: 'issueDarkOpsKit', labelKey: 'tutorial.assist.issueDarkOpsKit' },
        tasks: [
          task('nvg', 'tutorial.task.toggleNvg', (c) => c.count('nvg-toggle') >= 1 || !!c.frame.nvgDown),
          task('flashlight', 'tutorial.task.toggleFlashlight', (c) => c.count('flashlight-toggle') >= 1 || !!c.frame.flashlightOn),
          task('laser', 'tutorial.task.toggleLaser', (c) => c.count('laser-toggle') >= 1 || !!c.frame.lasersEnabled),
        ],
      },
    ],
  },
  {
    id: 'supplies',
    titleKey: 'tutorial.mod.supplies.title',
    descKey: 'tutorial.mod.supplies.desc',
    steps: [
      {
        id: 'supplies.kiosk',
        titleKey: 'tutorial.step.supplies.kiosk.title',
        bodyKey: 'tutorial.step.supplies.kiosk.body',
        noteKey: 'tutorial.step.supplies.kiosk.note',
        keys: ['interact'],
        onEnterAction: 'restoreRoomLights',
        waypoint: { kind: 'station', station: 'kiosk', labelKey: 'tutorial.wp.kiosk' },
        assist: { id: 'issueFieldSupplies', labelKey: 'tutorial.assist.issueFieldSupplies' },
        tasks: [
          task('openKiosk', 'tutorial.task.openKiosk', (c) => c.count('shop-open') >= 1 || !!c.frame.kioskOpen || (c.frame.medkits || 0) >= 1),
          task('buyMedpen', 'tutorial.task.ownMedpen', (c) => (c.frame.medkits || 0) >= 1),
        ],
      },
      {
        id: 'supplies.grenade',
        titleKey: 'tutorial.step.supplies.grenade.title',
        bodyKey: 'tutorial.step.supplies.grenade.body',
        noteKey: 'tutorial.step.supplies.grenade.note',
        keys: ['grenade'],
        onEnterAction: 'ensurePracticeGrenades',
        assist: { id: 'ensurePracticeGrenades', labelKey: 'tutorial.assist.issueGrenades' },
        tasks: [
          task('throwGrenade', 'tutorial.task.throwGrenade', (c) => c.count('grenade-thrown') >= 1),
        ],
      },
      {
        id: 'supplies.medpen',
        titleKey: 'tutorial.step.supplies.medpen.title',
        bodyKey: 'tutorial.step.supplies.medpen.body',
        noteKey: 'tutorial.step.supplies.medpen.note',
        keys: ['heal'],
        onEnterAction: 'prepareMedpenDrill',
        assist: { id: 'prepareMedpenDrill', labelKey: 'tutorial.assist.simInjury' },
        tasks: [
          task('useMedpen', 'tutorial.task.useMedpen', (c) => c.count('medpen-used') >= 1),
        ],
      },
    ],
  },
  {
    id: 'hangar',
    titleKey: 'tutorial.mod.hangar.title',
    descKey: 'tutorial.mod.hangar.desc',
    steps: [
      {
        id: 'hangar.door',
        titleKey: 'tutorial.step.hangar.door.title',
        bodyKey: 'tutorial.step.hangar.door.body',
        noteKey: 'tutorial.step.hangar.door.note',
        keys: ['interact'],
        waypoint: { kind: 'keypad', labelKey: 'tutorial.wp.keypad' },
        tasks: [
          task('toggleDoor', 'tutorial.task.toggleKeypad', (c) => c.count('door-toggle') >= 1),
        ],
      },
      {
        id: 'hangar.enter',
        titleKey: 'tutorial.step.hangar.enter.title',
        bodyKey: 'tutorial.step.hangar.enter.body',
        noteKey: 'tutorial.step.hangar.enter.note',
        keys: ['move'],
        onEnterAction: 'ensureDoorOpen',
        waypoint: { kind: 'point', localX: -22, localZ: -4, labelKey: 'tutorial.wp.buildFloor' },
        tasks: [
          task('enterHangar', 'tutorial.task.enterBuildRoom', (c) => !!c.frame.inBuildRoom),
        ],
      },
    ],
  },
  {
    id: 'building',
    titleKey: 'tutorial.mod.building.title',
    descKey: 'tutorial.mod.building.desc',
    steps: [
      {
        id: 'build.wheel',
        titleKey: 'tutorial.step.build.wheel.title',
        bodyKey: 'tutorial.step.build.wheel.body',
        noteKey: 'tutorial.step.build.wheel.note',
        keys: ['buildWheel'],
        onEnterAction: 'clearForBuilding',
        assist: { id: 'unlockPracticeBlueprints', labelKey: 'tutorial.assist.unlockBlueprints' },
        waypoint: { kind: 'point', localX: -24, localZ: 2, labelKey: 'tutorial.wp.buildZone' },
        tasks: [
          task('openBuild', 'tutorial.task.openBuildMode', (c) => c.count('build-wheel') >= 1 || !!c.frame.inBuildMode || c.frame.wheelKind === 'build'),
          task('browsePages', 'tutorial.task.browseBuildPages', (c) => c.count('build-page') >= 1 || (c.frame.wheelKind === 'build' && c.frame.wheelPage !== c.baseline.wheelPage)),
        ],
      },
      {
        id: 'build.place',
        titleKey: 'tutorial.step.build.place.title',
        bodyKey: 'tutorial.step.build.place.body',
        noteKey: 'tutorial.step.build.place.note',
        keys: ['fire', 'rotate'],
        assist: { id: 'unlockPracticeBlueprints', labelKey: 'tutorial.assist.unlockBlueprints' },
        tasks: [
          task('rotatePiece', 'tutorial.task.rotateBuild', (c) => c.count('build-rotate') >= 1),
          task('placePiece', 'tutorial.task.placeStructure', (c) => c.count('build-place') >= 1 || (c.frame.buildCount || 0) > (c.baseline.buildCount || 0)),
        ],
      },
      {
        id: 'build.stack',
        titleKey: 'tutorial.step.build.stack.title',
        bodyKey: 'tutorial.step.build.stack.body',
        noteKey: 'tutorial.step.build.stack.note',
        keys: ['buildWheel', 'fire'],
        assist: { id: 'unlockPracticeBlueprints', labelKey: 'tutorial.assist.unlockBlueprints' },
        tasks: [
          task('stackOrCut', 'tutorial.task.stackOrOpening', (c) =>
            c.eventsOf('build-place').some((e) => STACK_BUILD_KINDS.includes(e.kind)) ||
            c.count('build-place') >= 2),
        ],
      },
      {
        id: 'build.maintain',
        titleKey: 'tutorial.step.build.maintain.title',
        bodyKey: 'tutorial.step.build.maintain.body',
        noteKey: 'tutorial.step.build.maintain.note',
        keys: ['repair', 'scrap'],
        onEnterAction: 'prepareMaintainBuild',
        assist: { id: 'prepareMaintainBuild', labelKey: 'tutorial.assist.wearBuild' },
        tasks: [
          task('upgradePiece', 'tutorial.task.upgradeBuild', (c) => c.count('build-upgrade') >= 1),
          task('repairPiece', 'tutorial.task.repairBuild', (c) => c.count('build-repair') >= 1),
          task('scrapPiece', 'tutorial.task.scrapBuild', (c) => c.count('build-scrap') >= 1),
        ],
      },
      {
        id: 'build.vault',
        titleKey: 'tutorial.step.build.vault.title',
        bodyKey: 'tutorial.step.build.vault.body',
        noteKey: 'tutorial.step.build.vault.note',
        keys: ['jump'],
        onEnterAction: 'ensureVaultCover',
        assist: { id: 'ensureVaultCover', labelKey: 'tutorial.assist.placeCover' },
        tasks: [
          task('vault', 'tutorial.task.vaultCover', (c) => c.count('vault') >= 1 || !!c.frame.isVaulting),
        ],
      },
    ],
  },
  {
    id: 'emplacements',
    titleKey: 'tutorial.mod.emplacements.title',
    descKey: 'tutorial.mod.emplacements.desc',
    steps: [
      {
        id: 'emplace.trap',
        titleKey: 'tutorial.step.emplace.trap.title',
        bodyKey: 'tutorial.step.emplace.trap.body',
        noteKey: 'tutorial.step.emplace.trap.note',
        keys: ['buildWheel', 'fire'],
        assist: { id: 'unlockPracticeBlueprints', labelKey: 'tutorial.assist.unlockBlueprints' },
        tasks: [
          task('placeTrap', 'tutorial.task.placeTrap', (c) =>
            c.eventsOf('build-place').some((e) => TRAP_BUILD_KINDS.includes(e.kind))),
        ],
      },
      {
        id: 'emplace.turret',
        titleKey: 'tutorial.step.emplace.turret.title',
        bodyKey: 'tutorial.step.emplace.turret.body',
        noteKey: 'tutorial.step.emplace.turret.note',
        keys: ['buildWheel', 'fire'],
        assist: { id: 'unlockPracticeBlueprints', labelKey: 'tutorial.assist.unlockBlueprints' },
        tasks: [
          task('placeTurret', 'tutorial.task.placeTurret', (c) =>
            c.eventsOf('build-place').some((e) => TURRET_BUILD_KINDS.includes(e.kind))),
        ],
      },
      {
        id: 'emplace.crew',
        titleKey: 'tutorial.step.emplace.crew.title',
        bodyKey: 'tutorial.step.emplace.crew.body',
        noteKey: 'tutorial.step.emplace.crew.note',
        keys: ['interact', 'fire', 'carry'],
        assist: { id: 'unlockPracticeBlueprints', labelKey: 'tutorial.assist.issueEmplacements' },
        tasks: [
          task('placeCrew', 'tutorial.task.placeCrewWeapon', (c) =>
            c.eventsOf('build-place').some((e) => CREW_BUILD_KINDS.includes(e.kind)) || !!c.frame.hasCrewEmplacement),
          task('mountCrew', 'tutorial.task.mountCrewWeapon', (c) => c.count('mortar-mount') >= 1 || !!c.frame.mortarMounted),
          task('fireCrew', 'tutorial.task.fireCrewWeapon', (c) => c.count('mortar-fire') >= 1),
          task('carryCrew', 'tutorial.task.carryCrewWeapon', (c) => c.count('mortar-carry') >= 1 || !!c.frame.mortarCarried),
        ],
      },
    ],
  },
  {
    id: 'combat',
    titleKey: 'tutorial.mod.combat.title',
    descKey: 'tutorial.mod.combat.desc',
    steps: [
      {
        id: 'combat.panel',
        titleKey: 'tutorial.step.combat.panel.title',
        bodyKey: 'tutorial.step.combat.panel.body',
        noteKey: 'tutorial.step.combat.panel.note',
        keys: ['interact'],
        waypoint: { kind: 'station', station: 'hqPanel', labelKey: 'tutorial.wp.hqPanel' },
        tasks: [
          task('openPanel', 'tutorial.task.openHqPanel', (c) => c.count('hq-panel-open') >= 1 || !!c.frame.hqPanelOpen),
        ],
      },
      {
        id: 'combat.wave',
        titleKey: 'tutorial.step.combat.wave.title',
        bodyKey: 'tutorial.step.combat.wave.body',
        noteKey: 'tutorial.step.combat.wave.note',
        keys: ['interact', 'fire'],
        waypoint: { kind: 'station', station: 'hqPanel', labelKey: 'tutorial.wp.hqPanel', hideWhenActiveWave: true },
        assist: { id: 'callPracticeWave', labelKey: 'tutorial.assist.callPracticeWave' },
        tasks: [
          task('launchWave', 'tutorial.task.launchWave', (c) =>
            c.count('wave-launch') >= 1 || !!c.frame.waveQueued || (c.frame.zombiesAlive || 0) > 0),
          task('clearWave', 'tutorial.task.clearWave', (c) =>
            (c.count('wave-launch') >= 1 || c.sawLiveZombie) &&
            (c.count('zombie-kill') >= 1 || c.count('wave-cleared') >= 1) &&
            !c.frame.waveQueued &&
            (c.frame.zombiesAlive || 0) === 0),
        ],
      },
      {
        id: 'combat.skulls',
        titleKey: 'tutorial.step.combat.skulls.title',
        bodyKey: 'tutorial.step.combat.skulls.body',
        noteKey: 'tutorial.step.combat.skulls.note',
        keys: ['interact'],
        onEnterAction: 'ensurePracticeSkull',
        assist: { id: 'ensurePracticeSkull', labelKey: 'tutorial.assist.dropSkull' },
        waypoint: { kind: 'station', station: 'skullWindow', labelKey: 'tutorial.wp.skullWindow' },
        tasks: [
          task('collectSkull', 'tutorial.task.collectSkull', (c) =>
            c.count('skull-pickup') >= 1 || (c.frame.skullBagCount || 0) > 0 || c.count('skull-bank') >= 1),
          task('bankSkull', 'tutorial.task.bankSkull', (c) => c.count('skull-bank') >= 1),
        ],
      },
    ],
  },
  {
    id: 'campaign',
    titleKey: 'tutorial.mod.campaign.title',
    descKey: 'tutorial.mod.campaign.desc',
    steps: [
      {
        id: 'campaign.infirmary',
        titleKey: 'tutorial.step.campaign.infirmary.title',
        bodyKey: 'tutorial.step.campaign.infirmary.body',
        noteKey: 'tutorial.step.campaign.infirmary.note',
        keys: ['move'],
        waypoint: { kind: 'infirmary', labelKey: 'tutorial.wp.infirmary' },
        tasks: [
          task('visitInfirmary', 'tutorial.task.visitInfirmary', (c) => !!c.frame.nearInfirmary),
        ],
      },
      {
        id: 'campaign.briefing',
        titleKey: 'tutorial.step.campaign.briefing.title',
        bodyKey: 'tutorial.step.campaign.briefing.body',
        noteKey: 'tutorial.step.campaign.briefing.note',
        keys: ['map', 'pause'],
        manualContinue: true,
        briefingBullets: [
          'tutorial.briefing.prep',
          'tutorial.briefing.map',
          'tutorial.briefing.skills',
          'tutorial.briefing.threats',
          'tutorial.briefing.specials',
        ],
        tasks: [],
      },
      {
        id: 'campaign.graduate',
        titleKey: 'tutorial.step.campaign.graduate.title',
        bodyKey: 'tutorial.step.campaign.graduate.body',
        noteKey: 'tutorial.step.campaign.graduate.note',
        keys: [],
        manualContinue: true,
        isGraduation: true,
        tasks: [],
      },
    ],
  },
];

// Freeze normalized modules & flat steps list with stable indices.
const _flatSteps = [];
export const TUTORIAL_MODULES = Object.freeze(RAW_MODULES.map((mod, moduleIndex) => {
  const steps = Object.freeze(mod.steps.map((step, stepIndex) => {
    const frozen = Object.freeze({
      ...step,
      moduleId: mod.id,
      moduleIndex,
      stepIndex,
      globalIndex: _flatSteps.length,
      keys: Object.freeze(step.keys ? [...step.keys] : []),
      tasks: Object.freeze(step.tasks ? [...step.tasks] : []),
      briefingBullets: step.briefingBullets ? Object.freeze([...step.briefingBullets]) : null,
      waypoint: step.waypoint ? Object.freeze({ ...step.waypoint }) : null,
      assist: step.assist ? Object.freeze({ ...step.assist }) : null,
    });
    _flatSteps.push(frozen);
    return frozen;
  }));
  return Object.freeze({
    id: mod.id,
    index: moduleIndex,
    titleKey: mod.titleKey,
    descKey: mod.descKey,
    steps,
  });
}));

export const TUTORIAL_STEPS = Object.freeze(_flatSteps);
const STEP_BY_ID = new Map(TUTORIAL_STEPS.map((s) => [s.id, s]));
const MODULE_BY_ID = new Map(TUTORIAL_MODULES.map((m) => [m.id, m]));

function parseStored(raw) {
  const empty = { completedSteps: new Set(), dismissedOffer: false, graduated: false, lastStepId: null };
  if (!raw || typeof raw !== 'string') return empty;
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return empty;
    const completedSteps = new Set();
    if (Array.isArray(data.completedSteps)) {
      for (const id of data.completedSteps) if (STEP_BY_ID.has(id)) completedSteps.add(id);
    }
    const lastStepId = typeof data.lastStepId === 'string' && STEP_BY_ID.has(data.lastStepId) ? data.lastStepId : null;
    return {
      completedSteps,
      dismissedOffer: data.dismissedOffer === true,
      graduated: data.graduated === true,
      lastStepId,
    };
  } catch {
    return empty;
  }
}

export function createTrainingTutorial({
  load = () => null,
  save = () => {},
  onStepEnter = () => {},
  onTaskComplete = () => {},
  onStepComplete = () => {},
  onModuleComplete = () => {},
  onComplete = () => {},
  onStateChange = () => {},
} = {}) {
  const stored = parseStored(load());
  const completedSteps = stored.completedSteps;
  let dismissedOffer = stored.dismissedOffer;
  let graduated = stored.graduated;
  let lastStepId = stored.lastStepId;

  let active = false;
  let collapsed = false;
  let currentIndex = 0;
  let autoAdvanceT = 0;
  let stepDoneLatched = false;

  // Per-step runtime accumulator
  let lastFrame = {};
  let baseline = {};
  let stepEvents = [];
  let stepDoneTasks = new Set();
  let stepTime = 0;
  let stepDist = 0;
  let stepSprintDist = 0;
  let stepCrouchTime = 0;
  let stepCameraDelta = 0;
  let prevPos = null;
  let prevCamYaw = null;
  let prevCamR = null;
  let sawLiveZombie = false;

  function persist() {
    try {
      save(JSON.stringify({
        version: 1,
        completedSteps: [...completedSteps],
        dismissedOffer,
        graduated,
        lastStepId,
      }));
    } catch { /* private browsing or quota: continue cleanly in-memory */ }
  }

  function step() {
    return TUTORIAL_STEPS[currentIndex] || null;
  }

  function moduleCompleted(mod) {
    return mod.steps.every((s) => s.isGraduation || completedSteps.has(s.id));
  }

  function resetStepAccumulator(frame = lastFrame) {
    baseline = {
      viewFirst: !!frame.viewFirst,
      currentWeapon: frame.currentWeapon || 'pistol',
      shotgunLoadedType: frame.shotgunLoadedType || 'birdshot',
      fittedModCount: frame.fittedModCount || 0,
      reloading: !!frame.reloading,
      wheelPage: frame.wheelPage ?? 0,
      buildCount: frame.buildCount || 0,
    };
    stepEvents = [];
    stepDoneTasks = new Set();
    stepTime = 0;
    stepDist = 0;
    stepSprintDist = 0;
    stepCrouchTime = 0;
    stepCameraDelta = 0;
    prevPos = frame.pos ? { x: frame.pos.x, z: frame.pos.z } : null;
    prevCamYaw = Number.isFinite(frame.camYaw) ? frame.camYaw : null;
    prevCamR = Number.isFinite(frame.camR) ? frame.camR : null;
    sawLiveZombie = (frame.zombiesAlive || 0) > 0;
    autoAdvanceT = 0;
    stepDoneLatched = false;
  }

  function makeContext(frame = lastFrame) {
    return {
      frame,
      baseline,
      stepTime,
      stepDist,
      stepSprintDist,
      stepCrouchTime,
      stepCameraDelta,
      sawLiveZombie,
      count(type) {
        let n = 0;
        for (let i = 0; i < stepEvents.length; i++) if (stepEvents[i].type === type) n++;
        return n;
      },
      eventsOf(type) {
        return stepEvents.filter((e) => e.type === type);
      },
    };
  }

  function enterStep(index, frame = lastFrame) {
    const clamped = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, index | 0));
    currentIndex = clamped;
    const s = step();
    lastStepId = s.id;
    resetStepAccumulator(frame);
    if (s.isGraduation) {
      graduated = true;
      completedSteps.add(s.id);
    }
    persist();
    onStepEnter(s);
    if (s.isGraduation) onComplete(snapshot());
    onStateChange(snapshot());
    return s;
  }

  function evaluateTasks(frame = lastFrame) {
    const s = step();
    if (!active || !s || s.manualContinue) return false;
    const ctx = makeContext(frame);
    let newlyDone = 0;
    for (const t of s.tasks) {
      if (stepDoneTasks.has(t.id)) continue;
      let passed = false;
      try { passed = !!t.check(ctx); } catch { passed = false; }
      if (passed) {
        stepDoneTasks.add(t.id);
        newlyDone++;
        onTaskComplete(s, t);
      }
    }
    if (newlyDone > 0) onStateChange(snapshot());
    const allDone = s.tasks.length > 0 && s.tasks.every((t) => stepDoneTasks.has(t.id));
    if (allDone && !stepDoneLatched) {
      stepDoneLatched = true;
      autoAdvanceT = AUTO_ADVANCE_S;
      const mod = TUTORIAL_MODULES[s.moduleIndex];
      const wasModDone = moduleCompleted(mod);
      completedSteps.add(s.id);
      persist();
      onStepComplete(s);
      if (!wasModDone && moduleCompleted(mod)) onModuleComplete(mod);
      onStateChange(snapshot());
      return true;
    }
    return newlyDone > 0;
  }

  function start(targetId = null, frame = lastFrame) {
    let idx = 0;
    if (typeof targetId === 'string') {
      if (STEP_BY_ID.has(targetId)) idx = STEP_BY_ID.get(targetId).globalIndex;
      else if (MODULE_BY_ID.has(targetId)) idx = MODULE_BY_ID.get(targetId).steps[0].globalIndex;
    } else if (lastStepId && STEP_BY_ID.has(lastStepId) && !STEP_BY_ID.get(lastStepId).isGraduation) {
      idx = STEP_BY_ID.get(lastStepId).globalIndex;
    } else {
      const firstIncomplete = TUTORIAL_STEPS.find((s) => !completedSteps.has(s.id));
      idx = firstIncomplete ? firstIncomplete.globalIndex : 0;
    }
    active = true;
    collapsed = false;
    dismissedOffer = true;
    enterStep(idx, frame);
    evaluateTasks(frame);
    return snapshot();
  }

  function stop() {
    if (!active) return false;
    active = false;
    autoAdvanceT = 0;
    onStateChange(snapshot());
    return true;
  }

  function dismissOffer() {
    dismissedOffer = true;
    persist();
    onStateChange(snapshot());
  }

  function setCollapsed(v) {
    const next = !!v;
    if (collapsed === next) return;
    collapsed = next;
    onStateChange(snapshot());
  }

  function next(markComplete = false, frame = lastFrame) {
    if (!active) return null;
    const s = step();
    if (s && (markComplete || s.manualContinue)) {
      const mod = TUTORIAL_MODULES[s.moduleIndex];
      const wasModDone = moduleCompleted(mod);
      completedSteps.add(s.id);
      if (s.isGraduation) graduated = true;
      persist();
      if (!wasModDone && moduleCompleted(mod)) onModuleComplete(mod);
    }
    if (currentIndex + 1 >= TUTORIAL_STEPS.length) {
      graduated = true;
      if (s) completedSteps.add(s.id);
      persist();
      stop();
      return null;
    }
    return enterStep(currentIndex + 1, frame);
  }

  function skip(frame = lastFrame) {
    if (!active) return null;
    if (currentIndex + 1 >= TUTORIAL_STEPS.length) { stop(); return null; }
    return enterStep(currentIndex + 1, frame);
  }

  function prev(frame = lastFrame) {
    if (!active || currentIndex <= 0) return null;
    return enterStep(currentIndex - 1, frame);
  }

  function jumpToModule(moduleId, frame = lastFrame) {
    const mod = MODULE_BY_ID.get(moduleId);
    if (!mod) return null;
    active = true;
    collapsed = false;
    dismissedOffer = true;
    const s = enterStep(mod.steps[0].globalIndex, frame);
    evaluateTasks(frame);
    return s;
  }

  function jumpToStep(stepId, frame = lastFrame) {
    const target = STEP_BY_ID.get(stepId);
    if (!target) return null;
    active = true;
    collapsed = false;
    dismissedOffer = true;
    const s = enterStep(target.globalIndex, frame);
    evaluateTasks(frame);
    return s;
  }

  function resetProgress(frame = lastFrame) {
    completedSteps.clear();
    graduated = false;
    lastStepId = null;
    persist();
    if (active) enterStep(0, frame);
    else onStateChange(snapshot());
  }

  function recordEvent(type, detail = {}) {
    if (!active || typeof type !== 'string' || !type) return false;
    stepEvents.push({ ...detail, type });
    if (stepEvents.length > 160) stepEvents.splice(0, stepEvents.length - 160);
    return evaluateTasks(lastFrame);
  }

  function tick(dt, frame = {}) {
    lastFrame = frame || {};
    if (!active) return null;
    const safeDt = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.25) : 0;
    stepTime += safeDt;

    if (frame.pos && Number.isFinite(frame.pos.x) && Number.isFinite(frame.pos.z)) {
      if (prevPos) {
        const d = Math.hypot(frame.pos.x - prevPos.x, frame.pos.z - prevPos.z);
        if (d < 4) {
          stepDist += d;
          if (frame.sprinting) stepSprintDist += d;
        }
      }
      prevPos = { x: frame.pos.x, z: frame.pos.z };
    }
    if (frame.crouching) stepCrouchTime += safeDt;
    if (Number.isFinite(frame.camYaw) && prevCamYaw !== null) {
      let dy = Math.abs(frame.camYaw - prevCamYaw);
      if (dy > Math.PI) dy = Math.abs(dy - Math.PI * 2);
      if (dy < 2) stepCameraDelta += dy;
    }
    if (Number.isFinite(frame.camR) && prevCamR !== null) {
      const dr = Math.abs(frame.camR - prevCamR);
      if (dr < 10) stepCameraDelta += dr * 0.35;
    }
    if (Number.isFinite(frame.camYaw)) prevCamYaw = frame.camYaw;
    if (Number.isFinite(frame.camR)) prevCamR = frame.camR;
    if ((frame.zombiesAlive || 0) > 0) sawLiveZombie = true;

    evaluateTasks(frame);

    if (stepDoneLatched && autoAdvanceT > 0) {
      autoAdvanceT -= safeDt;
      if (autoAdvanceT <= 0) {
        autoAdvanceT = 0;
        next(true, frame);
      }
    }
    return snapshot();
  }

  function snapshot() {
    const s = step();
    const mod = s ? TUTORIAL_MODULES[s.moduleIndex] : null;
    const ctx = makeContext(lastFrame);
    const nonGradSteps = TUTORIAL_STEPS.filter((x) => !x.isGraduation);
    const doneCount = nonGradSteps.filter((x) => completedSteps.has(x.id)).length;
    return {
      active,
      collapsed,
      dismissedOffer,
      graduated,
      shouldOffer: !active && !dismissedOffer && !graduated,
      currentIndex,
      totalSteps: TUTORIAL_STEPS.length,
      completedCount: doneCount,
      totalTrackable: nonGradSteps.length,
      percent: nonGradSteps.length ? Math.round((doneCount / nonGradSteps.length) * 100) : 0,
      stepDone: stepDoneLatched,
      autoAdvanceRemaining: autoAdvanceT,
      module: mod ? {
        id: mod.id,
        index: mod.index,
        total: TUTORIAL_MODULES.length,
        titleKey: mod.titleKey,
        descKey: mod.descKey,
      } : null,
      step: s ? {
        id: s.id,
        moduleId: s.moduleId,
        moduleIndex: s.moduleIndex,
        stepIndex: s.stepIndex,
        moduleStepCount: mod ? mod.steps.length : 1,
        globalIndex: s.globalIndex,
        titleKey: s.titleKey,
        bodyKey: s.bodyKey,
        noteKey: s.noteKey,
        keys: s.keys,
        waypoint: s.waypoint,
        assist: s.assist,
        manualContinue: !!s.manualContinue,
        isGraduation: !!s.isGraduation,
        briefingBullets: s.briefingBullets,
        tasks: s.tasks.map((t) => ({
          id: t.id,
          labelKey: t.labelKey,
          done: stepDoneTasks.has(t.id),
          progress: t.progress ? t.progress(ctx) : null,
        })),
      } : null,
      modules: TUTORIAL_MODULES.map((m) => {
        const trackable = m.steps.filter((x) => !x.isGraduation);
        const done = trackable.filter((x) => completedSteps.has(x.id)).length;
        return {
          id: m.id,
          index: m.index,
          titleKey: m.titleKey,
          descKey: m.descKey,
          done,
          total: trackable.length || m.steps.length,
          complete: moduleCompleted(m),
          steps: m.steps.map((st) => ({
            id: st.id,
            titleKey: st.titleKey,
            complete: completedSteps.has(st.id),
            current: active && st.globalIndex === currentIndex,
            isGraduation: !!st.isGraduation,
          })),
        };
      }),
    };
  }

  return {
    start,
    stop,
    dismissOffer,
    setCollapsed,
    next,
    skip,
    prev,
    jumpToModule,
    jumpToStep,
    resetProgress,
    recordEvent,
    tick,
    snapshot,
    isActive: () => active,
    currentStep: step,
  };
}
