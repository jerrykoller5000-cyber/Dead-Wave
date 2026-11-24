// AG-415: Real-GPU end-to-end verification and visual proof for the Training Ground
// optional Field Orientation tutorial (1280x720 + 390x844, 3P + 1P, day + dark-ops,
// modals, live state-diff detection across all 10 modules). Zero npm dependencies.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const outDir = 'qa/AG-415';
fs.mkdirSync(outDir, { recursive: true });

const srv = await serve(process.cwd(), 0);
let browser;
let page;
const hardTimer = setTimeout(() => {
  console.error('TIMEOUT: training-tutorial.browser.mjs exceeded 180s');
  process.exit(2);
}, 180000);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function pressKey(p, code, key) {
  await p.evaluate(`(() => {
    const down = new KeyboardEvent('keydown', { code: ${JSON.stringify(code)}, key: ${JSON.stringify(key || code)}, bubbles: true, cancelable: true });
    window.dispatchEvent(down);
    const up = new KeyboardEvent('keyup', { code: ${JSON.stringify(code)}, key: ${JSON.stringify(key || code)}, bubbles: true, cancelable: true });
    window.dispatchEvent(up);
  })()`);
}

async function stepFrames(p, n = 6, dt = 0.05) {
  await p.evaluate(`(() => { for (let i = 0; i < ${n}; i++) TT.trainingDbg.update(${dt}); })()`);
  await wait(80);
}

try {
  const headless = process.argv.includes('--headless');
  browser = await launch({ headless });
  page = await browser.newPage({ width: 1280, height: 720 });

  await page.goto(srv.origin + '/index.html?debug=1', { waitUntil: 'load', timeout: 120000 });
  const ready = await page.waitFor('!!window.TT', { timeout: 90000 });
  assert.equal(ready, true, 'Game failed to expose window.TT');
  try { await page.send('Page.bringToFront', {}); } catch { /* already in front */ }

  // Dismiss opening splash cleanly the same way tools/tests/run-all.mjs does, then wait until DWOpening.active === false
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  const splashCleared = await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
  assert.equal(splashCleared, true, 'Opening splash failed to clear');
  await page.waitFor('window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 60000 });

  // Enter Training Ground cleanly and await warm-up completion + real rendered frames
  await page.evaluate(`(() => {
    localStorage.removeItem('tt_training_tutorial_v1');
    document.getElementById('playerName').value = 'Orientation Check';
    document.getElementById('modeTraining').click();
  })()`);
  const entered = await page.waitFor('TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 90000 });
  assert.equal(entered, true, 'Failed to enter Training Ground');
  const rendered = await page.waitFor('(TT.renderer?.info?.render?.calls || 0) > 0', { timeout: 30000 });
  assert.equal(rendered, true, '3D renderer should render live Training Ground frames');
  await wait(900);

  // 1. Verify debug mode keeps Offer Card hidden while HUD button is visible
  const initState = await page.evaluate(`(() => ({
    offerHidden: document.getElementById('trainingTutorialOffer')?.hidden,
    trackerHidden: document.getElementById('trainingTutorial')?.hidden,
    hudBtnVisible: !document.getElementById('trainingTutorialHudBtn')?.hidden,
    snap: TT.trainingTutorialDbg.snapshot(),
    backend: TT.renderer?.backend?.isWebGPUBackend ? 'webgpu' : 'webgl2',
  }))()`);
  assert.equal(initState.offerHidden, true, 'debug entry should not auto-show offer overlay');
  assert.equal(initState.trackerHidden, true, 'tutorial starts idle');
  assert.equal(initState.hudBtnVisible, true, 'HUD Orientation button visible in Training');
  assert.equal(initState.snap.shouldOffer, true, 'fresh profile marks shouldOffer=true');

  // Show Offer Card to inspect & photograph how normal players see it
  await page.evaluate('TT.trainingTutorialDbg.showOffer(true)');
  await wait(240);
  assert.equal(await page.evaluate('document.getElementById("trainingTutorialOffer").hidden'), false);
  await page.screenshot(path.join(outDir, '01-offer-card.png'));

  // 2. Pause menu exposes Field Orientation button inside Training
  await pressKey(page, 'Escape', 'Escape');
  await wait(180);
  assert.equal(
    await page.evaluate('!document.getElementById("pauseTutorialBtn")?.hidden && document.getElementById("pause")?.classList.contains("show")'),
    true,
    'Pause menu exposes Field Orientation button in Training'
  );
  await page.screenshot(path.join(outDir, '02-pause-menu.png'));
  await pressKey(page, 'Escape', 'Escape');
  await wait(180);

  // 3. Shortcut 'O' opens CRT Syllabus Drawer, Esc closes it cleanly
  await pressKey(page, 'KeyO', 'o');
  await wait(240);
  const drawerInfo = await page.evaluate(`(() => ({
    open: TT.trainingTutorialDbg.ui().isDrawerOpen(),
    moduleCards: document.querySelectorAll('#trainingTutorialDrawer .tt-mod-card').length,
    stepChips: document.querySelectorAll('#trainingTutorialDrawer .tt-step-chip').length,
  }))()`);
  assert.equal(drawerInfo.open, true, 'O opens Syllabus Drawer');
  assert.equal(drawerInfo.moduleCards, 10, 'Syllabus shows all 10 modules');
  assert.ok(drawerInfo.stepChips >= 35, 'Syllabus lists all steps');
  await page.screenshot(path.join(outDir, '03-syllabus-drawer.png'));
  await pressKey(page, 'Escape', 'Escape');
  await wait(180);
  assert.equal(await page.evaluate('TT.trainingTutorialDbg.ui().isDrawerOpen()'), false, 'Esc closes Syllabus Drawer');

  // 4. Module 1: Start Orientation -> move.walk + 3D Beacon + HUD non-overlap check
  await page.evaluate('TT.trainingTutorialDbg.start("move.walk")');
  await stepFrames(page, 6);
  const m1 = await page.evaluate(`(() => {
    const tr = document.getElementById('trainingTutorial').getBoundingClientRect();
    const hud = document.getElementById('trainingHud').getBoundingClientRect();
    const hp = document.getElementById('hudTopLeft').getBoundingClientRect();
    const ammo = document.getElementById('ammo').getBoundingClientRect();
    const overlap = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    return {
      stepId: TT.trainingTutorialDbg.snapshot().step.id,
      beaconVisible: TT.trainingTutorialDbg.beacon().isVisible(),
      overlapHud: overlap(tr, hud),
      overlapHp: overlap(tr, hp),
      overlapAmmo: overlap(tr, ammo),
      trRect: { x: Math.round(tr.left), y: Math.round(tr.top), w: Math.round(tr.width), h: Math.round(tr.height) },
    };
  })()`);
  assert.equal(m1.stepId, 'move.walk');
  assert.equal(m1.beaconVisible, true, '3D beacon visible on move.walk');
  assert.equal(m1.overlapHud, false, 'tracker must not overlap #trainingHud');
  assert.equal(m1.overlapHp, false, 'tracker must not overlap #hudTopLeft');
  assert.equal(m1.overlapAmmo, false, 'tracker must not overlap #ammo');
  await page.screenshot(path.join(outDir, '04-step-movement-3p.png'));

  // 5. First-Person view (5) toggle & readability in 1P
  await page.evaluate('TT.trainingTutorialDbg.jumpToStep("move.camera")');
  await stepFrames(page, 4);
  await pressKey(page, 'Digit5', '5');
  await wait(450);
  await stepFrames(page, 6);
  assert.equal(
    await page.evaluate('TT.trainingTutorialDbg.snapshot().step.tasks.find(t => t.id === "view")?.done'),
    true,
    'Pressing 5 completes viewToggle task via live state diff'
  );
  await page.screenshot(path.join(outDir, '05-first-person-view.png'));
  await pressKey(page, 'Digit5', '5');
  await wait(350);

  // 6. Module 2: Draw pistol & drop 3 firing-line targets via live hooks
  await page.evaluate('TT.trainingTutorialDbg.jumpToStep("range.draw")');
  await stepFrames(page, 3);
  await pressKey(page, 'Digit4', '4');
  await stepFrames(page, 12, 0.15);
  assert.equal(await page.evaluate('TT.trainingTutorialDbg.snapshot().step.id'), 'range.targets', 'Drawing pistol auto-advances to range.targets');
  await page.evaluate(`(() => {
    const tg = TT.trainingDbg.tg();
    for (let i = 0; i < 3; i++) {
      const b = tg.targets[i].box;
      TT.trainingDbg.hitTarget(i, { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, z: (b.minZ + b.maxZ) / 2 });
    }
  })()`);
  await stepFrames(page, 12, 0.15);
  assert.equal(await page.evaluate('TT.trainingTutorialDbg.snapshot().step.id'), 'range.reload', 'Dropping 3 targets auto-advances to range.reload');

  // 7. Module 3: Armory modal-open compact dock + live fire selector + shotgun shells + akimbo + workbench
  await page.evaluate(`(() => {
    TT.trainingTutorialDbg.jumpToStep('armory.visit');
    const tg = TT.trainingDbg.tg(), f = tg.stations.armory.front;
    TT.player.position.set(f.x, tg.floorY, f.z);
    TT.doAction();
  })()`);
  const armoryShown = await page.waitFor('!!document.querySelector("#armoryPanel:not([hidden])")', { timeout: 15000 });
  assert.equal(armoryShown, true, 'Armory panel opened');
  await stepFrames(page, 4);
  const armoryDock = await page.evaluate(`(() => {
    const tr = document.getElementById('trainingTutorial').getBoundingClientRect();
    const ap = document.getElementById('armoryPanel')?.querySelector('.arm-card, .arm-shell, .arm-head, header') || document.getElementById('armoryPanel');
    const btns = Array.from(document.querySelectorAll('#armoryPanel button')).filter((b) => {
      const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0;
    });
    const overlapsBtn = btns.some((b) => {
      const r = b.getBoundingClientRect();
      return !(tr.right <= r.left || tr.left >= r.right || tr.bottom <= r.top || tr.top >= r.bottom);
    });
    return {
      modalClass: document.body.classList.contains('training-tutorial-modal-open'),
      trackerVisible: !document.getElementById('trainingTutorial').hidden,
      openDone: TT.trainingTutorialDbg.snapshot().step.tasks[0]?.done,
      overlapsBtn,
      trRect: { x: Math.round(tr.left), y: Math.round(tr.top), w: Math.round(tr.width), h: Math.round(tr.height) },
      apTop: ap ? Math.round(ap.getBoundingClientRect().top) : -1,
    };
  })()`);
  assert.equal(armoryDock.modalClass, true, 'Modal-open dock class applied when Armory is open');
  assert.equal(armoryDock.trackerVisible, true, 'Compact objective tracker stays visible alongside Armory');
  assert.equal(armoryDock.overlapsBtn, false, 'Top-center modal ribbon must not overlap Armory buttons: ' + JSON.stringify(armoryDock));
  await page.screenshot(path.join(outDir, '06-modal-armory-dock.png'));
  await page.evaluate('TT.closeShop(); TT.armoryDbg.ui().close(); TT.closeCIF();');
  await wait(180);

  // Fire selector live test
  await page.evaluate('TT.trainingTutorialDbg.jumpToStep("armory.firemode"); TT.trainingTutorialDbg.assist("equipSelectorRifle");');
  await stepFrames(page, 3);
  await pressKey(page, 'KeyX', 'x');
  await stepFrames(page, 12, 0.15);
  assert.equal(await page.evaluate('TT.trainingTutorialDbg.snapshot().step.id'), 'armory.shotgun', 'X fire mode auto-advances to armory.shotgun');

  // Shotgun shell switch live test
  await page.evaluate('TT.trainingTutorialDbg.assist("issueShotgunShells");');
  await stepFrames(page, 3);
  await pressKey(page, 'KeyX', 'x');
  await stepFrames(page, 12, 0.15);
  assert.equal(await page.evaluate('TT.trainingTutorialDbg.snapshot().step.id'), 'armory.akimbo', 'X shotgun ammo switch auto-advances to armory.akimbo');

  // Akimbo live test
  await page.evaluate('TT.trainingTutorialDbg.assist("issuePairedPistol");');
  await stepFrames(page, 3);
  await pressKey(page, 'KeyY', 'y');
  await stepFrames(page, 12, 0.15);
  assert.equal(await page.evaluate('TT.trainingTutorialDbg.snapshot().step.id'), 'armory.workbench', 'Y akimbo toggle auto-advances to armory.workbench');

  // Workbench assist test
  await page.evaluate('TT.trainingTutorialDbg.assist("fitSampleMods");');
  await stepFrames(page, 12, 0.15);
  assert.equal(await page.evaluate('TT.trainingTutorialDbg.snapshot().step.id'), 'gear.cif', 'Fitting workbench mod auto-advances to gear.cif');

  // 8. Module 4: Dark-Ops Night Test (Lights OFF + NVG + Flashlight + Laser)
  await page.evaluate('TT.trainingTutorialDbg.jumpToStep("gear.lights"); TT.trainingDbg.toggleLights();');
  await stepFrames(page, 12, 0.15);
  assert.equal(await page.evaluate('TT.trainingTutorialDbg.snapshot().step.id'), 'gear.darkops', 'Lights switch advances to gear.darkops');
  await page.evaluate('TT.trainingTutorialDbg.assist("issueDarkOpsKit");');
  await stepFrames(page, 3);
  await pressKey(page, 'Digit1', '1');
  await pressKey(page, 'Digit2', '2');
  await pressKey(page, 'Digit3', '3');
  await stepFrames(page, 4);
  await page.screenshot(path.join(outDir, '07-darkops-nvg-night.png'));
  await stepFrames(page, 12, 0.15);
  assert.equal(await page.evaluate('TT.trainingTutorialDbg.snapshot().step.id'), 'supplies.kiosk', 'NVG+Light+Laser advances to supplies.kiosk');
  assert.equal(await page.evaluate('TT.trainingDbg.lights().on'), true, 'Entering supplies.kiosk restores room lights');
  await pressKey(page, 'Digit1', '1');

  // 9. Module 5: MedPen simulated injury & live H heal
  await page.evaluate('TT.trainingTutorialDbg.jumpToStep("supplies.medpen");');
  await stepFrames(page, 3);
  const preHealHp = await page.evaluate('TT.getHp()');
  assert.ok(preHealHp <= 40, `prepareMedpenDrill should drop HP safely to <=40 (got ${preHealHp})`);
  await pressKey(page, 'KeyH', 'h');
  await stepFrames(page, 12, 0.15);
  assert.equal(await page.evaluate('TT.trainingTutorialDbg.snapshot().step.id'), 'hangar.door', 'MedPen jab advances to hangar.door');

  // 10. Module 6 & 7: Build Hangar entry, placement, rotation, maintenance
  await page.evaluate(`(() => {
    TT.trainingTutorialDbg.jumpToStep('hangar.enter');
    const tg = TT.trainingDbg.tg();
    TT.player.position.set(tg.origin.x - 22, tg.floorY, tg.origin.z - 2);
  })()`);
  await stepFrames(page, 12, 0.15);
  assert.equal(await page.evaluate('TT.trainingTutorialDbg.snapshot().step.id'), 'build.wheel', 'Entering hangar advances to build.wheel');

  await page.evaluate('TT.trainingTutorialDbg.jumpToStep("build.place"); TT.trainingTutorialDbg.assist("unlockPracticeBlueprints"); TT.setPlaceMode("wall");');
  await stepFrames(page, 4);
  await page.screenshot(path.join(outDir, '08-build-hangar-3p.png'));
  await page.evaluate(`(() => {
    TT.rotateBuildDbg();
    const tg = TT.trainingDbg.tg();
    const gx = TT.gridIndex(tg.origin.x - 24), gz = TT.gridIndex(tg.origin.z + 4);
    TT.placeBuildAt('wall', gx, gz, 0);
  })()`);
  await stepFrames(page, 12, 0.15);
  assert.equal(await page.evaluate('TT.trainingTutorialDbg.snapshot().step.id'), 'build.stack', 'Rotate + place wall advances to build.stack');

  // Maintenance wear check
  await page.evaluate('TT.setPlaceMode(null); TT.trainingTutorialDbg.jumpToStep("build.maintain");');
  await stepFrames(page, 3);
  assert.equal(await page.evaluate('TT.trainingTutorialDbg.frame().buildCount > 0'), true, 'prepareMaintainBuild ensures structure exists');

  // 11. Module 9: Live Combat wave launch + Skull drop
  await page.evaluate('TT.trainingTutorialDbg.jumpToStep("combat.wave"); TT.trainingTutorialDbg.assist("callPracticeWave");');
  await stepFrames(page, 4);
  await page.screenshot(path.join(outDir, '09-combat-wave-hud.png'));
  assert.equal(await page.evaluate('TT.trainingTutorialDbg.snapshot().step.tasks[0].done'), true, 'Launching wave completes launchWave task');
  await page.evaluate('TT.trainingDbg.clear()');

  await page.evaluate('TT.trainingTutorialDbg.jumpToStep("combat.skulls")');
  await stepFrames(page, 4);
  assert.equal(await page.evaluate('TT.cashDrops.some(c => c.skull && !c.taken)'), true, 'ensurePracticeSkull spawns a glowing skull drop');

  // 12. Module 10: Field Briefing + Graduation + Syllabus review
  await page.evaluate('TT.trainingTutorialDbg.jumpToStep("campaign.briefing")');
  await stepFrames(page, 4);
  const briefingBtn = await page.evaluate(`(() => {
    const tr = document.getElementById('trainingTutorial').getBoundingClientRect();
    const btn = document.querySelector('#trainingTutorial .tt-primary')?.getBoundingClientRect();
    return { inCard: !!btn && btn.bottom <= tr.bottom + 2 && btn.top >= tr.top, inView: !!btn && btn.bottom <= window.innerHeight && btn.top >= 0 };
  })()`);
  assert.equal(briefingBtn.inCard && briefingBtn.inView, true, 'Briefing Continue button must stay pinned inside card & viewport: ' + JSON.stringify(briefingBtn));
  await page.screenshot(path.join(outDir, '10-campaign-briefing.png'));
  await page.evaluate('document.querySelector("#trainingTutorial .tt-primary").click()');
  await wait(220);
  const gradSnap = await page.evaluate('TT.trainingTutorialDbg.snapshot()');
  assert.equal(gradSnap.step.id, 'campaign.graduate', 'Continue on briefing leads to graduation');
  assert.equal(gradSnap.graduated, true, 'Graduation sets graduated=true');

  await page.evaluate('TT.trainingTutorialDbg.openDrawer()');
  await wait(240);
  assert.equal(await page.evaluate('document.getElementById("trainingTutorial").hidden'), true, 'Tracker hides cleanly while Syllabus Drawer is open');
  await page.screenshot(path.join(outDir, '11-graduation-syllabus.png'));
  await page.evaluate('TT.trainingTutorialDbg.closeDrawer()');
  await wait(160);

  // 13. Narrow 390x844 viewport responsiveness check (docs/ui-principles.md §6)
  await page.setViewport(390, 844);
  await page.evaluate('(() => { const pf = document.getElementById("perf"); if (pf) pf.style.display = "none"; TT.trainingTutorialDbg.jumpToStep("armory.rifle"); })()');
  await stepFrames(page, 4);
  const narrow = await page.evaluate(`(() => {
    const tr = document.getElementById('trainingTutorial').getBoundingClientRect();
    return { left: Math.round(tr.left), right: Math.round(tr.right), width: Math.round(tr.width), vw: window.innerWidth, overflow: tr.right > window.innerWidth + 1 || tr.left < -1 };
  })()`);
  assert.equal(narrow.overflow, false, '390px viewport must not clip or overflow: ' + JSON.stringify(narrow));
  await page.screenshot(path.join(outDir, '12-narrow-390px.png'));

  // 14. Clean exit to menu leaves zero tutorial artifacts active
  await page.setViewport(1280, 720);
  await page.evaluate('(() => { const pf = document.getElementById("perf"); if (pf) pf.style.display = ""; TT.resetGame(); })()');
  await wait(260);
  const afterLeave = await page.evaluate(`(() => ({
    inTraining: TT.trainingDbg.state().active,
    tutorialActive: TT.trainingTutorialDbg.snapshot().active,
    trackerVisible: getComputedStyle(document.getElementById('trainingTutorial')).display !== 'none',
  }))()`);
  assert.equal(afterLeave.inTraining, false);
  assert.equal(afterLeave.tutorialActive, false);
  assert.equal(afterLeave.trackerVisible, false, 'Tutorial HUD must be completely hidden outside Training');

  const consoleErrors = page.console.filter((c) => c.type === 'error').map((c) => c.text);
  const allErrors = [...page.errors, ...consoleErrors];
  assert.deepEqual(allErrors, [], 'Zero page/console errors expected: ' + allErrors.join(' | '));

  const summary = { pass: true, backend: initState.backend, errors: allErrors, screenshots: 12, narrow, m1, drawerInfo };
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(summary, null, 2));
  console.log('PASS AG-415 training-tutorial.browser.mjs (' + initState.backend + '): 14/14 checks green, 12 GPU screenshots saved, 0 errors.');
} finally {
  clearTimeout(hardTimer);
  await page?.close().catch(() => {});
  await browser?.close().catch(() => {});
  srv.close();
}
