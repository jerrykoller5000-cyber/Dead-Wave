import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(ROOT, 'qa/2026-10-19-AG-94');
await fs.promises.mkdir(OUT_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720']
});

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 120000 });
  await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => {
      if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
      else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
      return true;
    })()`);
    await sleep(300);
  }
  const ready = await page.waitFor('!!window.TT', { timeout: 120000 });
  if (!ready) throw new Error('window.TT never initialized');
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await sleep(500);

  // Use exact startMatch recipe from tools/tests/lib.js
  await page.evaluate(`(async () => {
    const T = window.TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const nameEl = document.getElementById('playerName');
    if (nameEl) nameEl.value = 'AG94';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
    const firstRun = document.getElementById('firstRunCard');
    const playAnyway = document.getElementById('firstRunPlay');
    if (firstRun && !firstRun.hidden && playAnyway) playAnyway.click();
    for (let i = 0; i < 80; i++) {
      await wait(200);
      if (T.getPhase && T.getPhase() === 'prep') break;
    }
    await wait(300);
    for (let i = 0; i < 600; i++) {
      if (!document.body.classList.contains('deploying')) break;
      await wait(100);
    }
    await wait(300);
    T.clearZombies();
    T.setHp(100000);
    T.runDevCommand('godmode');
    T.setWorldTime(0.42);
  })()`, 120000);

  await page.waitFor(`window.TT.truckDbg && window.TT.truckDbg.truck && window.TT.truckDbg.truck.built`, { timeout: 10000 });

  const results = {};

  // 1. Teleport to utility truck ("site truck") before taking cutters
  results.step1 = await page.evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    TT.setShotView(null);
    TT.runDevCommand('site truck');
    await wait(350);
    const D = TT.truckDbg;
    const promptEl = document.getElementById('prompt');
    return {
      built: D.truck.built,
      off: D.truck.off,
      locked: D.locked(),
      stage: D.state().stage,
      cuttersTaken: D.state().cutters,
      chainVisible: D.truck.chain ? D.truck.chain.visible : false,
      chainNodes: D.truck.chain ? (() => { let n = 0; D.truck.chain.traverse(() => n++); return n; })() : 0,
      prompt: D.prompt(),
      hudPrompt: promptEl ? promptEl.textContent : '',
      reachBlockedBy: D.reach() && D.reach().blockedBy
    };
  })()`);
  await page.screenshot(path.join(OUT_DIR, '01-truck-chained-gameplay.png'));

  // Close-up shot of the chained toolbox on the utility truck
  await page.evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const THREE = TT.THREE;
    const chain = TT.truckDbg.truck.chain;
    chain.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(chain);
    const c = box.getCenter(new THREE.Vector3());
    const propGroup = chain.parent;
    const forward = new THREE.Vector3(0.35, 0.32, 0.85).applyQuaternion(propGroup.quaternion).normalize();
    TT.setShotView({
      x: c.x + forward.x * 1.15,
      y: c.y + 0.35,
      z: c.z + forward.z * 1.15,
      tx: c.x,
      ty: c.y + 0.04,
      tz: c.z,
      fov: 32
    });
    await wait(250);
  })()`);
  await page.screenshot(path.join(OUT_DIR, '02-truck-chained-closeup.png'));

  // 2. Teleport to bolt cutters at the iron cave mouth ("site truck cutters")
  results.step2 = await page.evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    TT.setShotView(null);
    TT.runDevCommand('site truck cutters');
    await wait(350);
    const D = TT.truckDbg;
    const promptEl = document.getElementById('prompt');
    const c = D.truck.cutters;
    return {
      cuttersVisible: c ? c.visible : false,
      cuttersNodes: c ? (() => { let n = 0; c.traverse(() => n++); return n; })() : 0,
      cuttersMatrixAutoUpdate: c ? c.matrixAutoUpdate : null,
      pos: c ? { x: +c.position.x.toFixed(2), y: +c.position.y.toFixed(2), z: +c.position.z.toFixed(2) } : null,
      prompt: D.prompt(),
      hudPrompt: promptEl ? promptEl.textContent : ''
    };
  })()`);
  await page.screenshot(path.join(OUT_DIR, '03-iron-cave-cutters-gameplay.png'));

  // Close-up shot of the bolt cutters by the iron bars at the mine mouth
  await page.evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const c = TT.truckDbg.truck.cutters.position;
    const iron = (TT.POI.caves || []).find((cv) => cv && cv.theme === 'iron');
    const yaw = iron ? iron.yaw : 0;
    TT.setShotView({
      x: c.x + Math.sin(yaw) * 1.35 + Math.cos(yaw) * 0.4,
      y: c.y + 0.72,
      z: c.z + Math.cos(yaw) * 1.35 - Math.sin(yaw) * 0.4,
      tx: c.x - Math.sin(yaw) * 0.3,
      ty: c.y + 0.12,
      tz: c.z - Math.cos(yaw) * 0.3,
      fov: 38
    });
    await wait(250);
  })()`);
  await page.screenshot(path.join(OUT_DIR, '04-iron-cave-cutters-closeup.png'));

  // 3. Take the bolt cutters, return to the truck, and hold E halfway through cutting the chain
  results.step3 = await page.evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    TT.setShotView(null);
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
    await wait(80);
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
    await wait(150);
    TT.runDevCommand('site truck');
    await wait(250);
    const D = TT.truckDbg;
    const beforeHoldPrompt = D.prompt();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
    const t0 = Date.now();
    while (Date.now() - t0 < 4000 && D.mission.progress() < 0.48) {
      await wait(40);
    }
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
    await wait(100);
    const promptEl = document.getElementById('prompt');
    return {
      cuttersTaken: D.state().cutters,
      beforeHoldPrompt,
      midCutProgress: +D.mission.progress().toFixed(2),
      midCutPrompt: D.prompt(),
      hudPrompt: promptEl ? promptEl.textContent : '',
      chainVisible: D.truck.chain.visible
    };
  })()`);
  await page.screenshot(path.join(OUT_DIR, '05-truck-cutting-chain.png'));

  // 4. Hold E to finish cutting the chain, triggering the alarm and calling the dead
  results.step4 = await page.evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const D = TT.truckDbg;
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
    const t0 = Date.now();
    while (Date.now() - t0 < 5000 && D.state().stage !== 'alarm') {
      await wait(40);
    }
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
    await wait(450);
    const called = (TT.zombies || []).filter((z) => z.alive && z.truckCalled);
    const centre = TT.getObjectiveProps().props['objective:wreck-salvage'].centre;
    const dists = called.map((z) => +Math.hypot(z.mesh.position.x - centre.x, z.mesh.position.z - centre.z).toFixed(1));
    if (called.length > 0) {
      const z0 = called[0].mesh.position;
      const dx = z0.x - centre.x, dz = z0.z - centre.z, len = Math.hypot(dx, dz) || 1;
      TT.setShotView({
        x: centre.x - (dx / len) * 6.5,
        y: centre.y + 4.2,
        z: centre.z - (dz / len) * 6.5,
        tx: centre.x + (dx / len) * 12,
        ty: centre.y + 0.8,
        tz: centre.z + (dz / len) * 12,
        fov: 50
      });
    }
    await wait(250);
    return {
      stage: D.state().stage,
      alarmRemainingS: +D.state().alarm.toFixed(1),
      chainVisible: D.truck.chain.visible,
      locked: D.locked(),
      reachBlockedBy: D.reach() && D.reach().blockedBy,
      truckPromptAfterCut: D.prompt(),
      calledAliveCount: called.length,
      expectedTotalForDay1: D.mission.calledFor(1),
      remainingToCall: D.truck.toCall,
      calledTypes: called.map((z) => z.typeKey),
      calledDistancesM: dists,
      pageErrors: []
    };
  })()`);
  results.pageErrors = page.errors;
  await page.screenshot(path.join(OUT_DIR, '06-truck-cut-alarm-and-dead.png'));

  await fs.promises.writeFile(
    path.join(OUT_DIR, 'truck-results.json'),
    JSON.stringify(results, null, 2),
    'utf8'
  );
  console.log('verify-truck complete:', JSON.stringify(results));
} finally {
  await browser.close();
  await server.close();
}
