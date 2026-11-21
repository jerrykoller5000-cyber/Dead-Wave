// AH-1 QA Playtest — Run 2: Targeted verification of full Armory rack/workbench, Infirmary wake-up, true ceiling angles, and active drill HUD
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Must run inside game-test slot');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AH-1');
const RAW_DIR = path.join(OUT_DIR, 'raw');
fs.mkdirSync(RAW_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function setWindowAndViewport(page, w, h) {
  try {
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: 0, top: 0, width: w + 16, height: h + 88 } });
  } catch {}
  await page.setViewport(w, h, 1);
  try { await page.send('Page.bringToFront', {}); } catch {}
  await sleep(200);
}

async function shot(page, name) {
  const file = path.join(RAW_DIR, `${name}.png`);
  await page.screenshot(file);
  return `qa/AH-1/raw/${name}.png`;
}

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1936,1168'],
});

const diag = {};

try {
  const page = await browser.newPage({ width: 1920, height: 1080 });
  await setWindowAndViewport(page, 1920, 1080);

  await page.goto(`${server.origin}/index.html?debug=1&renderer=webgl`, { timeout: 180000 });
  await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 90000 });
  for (let i = 0; i < 3; i++) {
    await page.evaluate(`(() => {
      if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
      else document.getElementById('openingSkip')?.click();
      return true;
    })()`);
    await sleep(300);
  }
  await page.waitFor('!!window.TT', { timeout: 180000 });
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await sleep(400);

  await page.evaluate(`(() => {
    document.getElementById('perf')?.classList.remove('on');
    const n = document.getElementById('playerName');
    if (n) { n.value = 'QAPlayer'; n.blur(); }
    document.getElementById('modeTraining')?.click();
    return true;
  })()`);

  const ready = await page.waitFor(
    'window.TT?.trainingDbg?.state()?.active && !window.TT?.trainingDbg?.state()?.warming && !document.getElementById("trainingBlackout")?.classList.contains("on")',
    { timeout: 90000 }
  );
  assert(ready, 'Training did not finish loading');
  await sleep(1000);

  // Check sign convention of OTS.pitch with otsLook!
  diag.pitchCheck = await page.evaluate(`(async () => {
    TT.setViewFirstDbg(true);
    await new Promise((r) => setTimeout(r, 300));
    const before = TT.otsDbg();
    TT.otsLook(0, -400); // mouse up
    await new Promise((r) => setTimeout(r, 100));
    const afterUp = TT.otsDbg();
    return { beforePitch: before.pitch, afterMouseUpPitch: afterUp.pitch };
  })()`);
  console.log('[AH-1 Run2] Pitch sign check:', diag.pitchCheck);

  // Helper using negative pitch for looking UP if afterMouseUpPitch < beforePitch, or positive otherwise!
  const upSign = diag.pitchCheck.afterMouseUpPitch < diag.pitchCheck.beforePitch ? -1 : 1;

  await page.evaluate(`(() => {
    window.__R2 = {
      upSign: ${upSign},
      K(code, up = false) {
        window.dispatchEvent(new KeyboardEvent(up ? 'keyup' : 'keydown', { code, key: code, bubbles: true, cancelable: true }));
      },
      async look1P(lx, lz, yawDeg, upDeg, waitMs = 350) {
        const O = TT.trainingDbg.tg().origin;
        TT.setViewFirstDbg(true);
        TT.player.position.set(O.x + lx, O.y, O.z + lz);
        TT.setVelDbg(0, 0);
        const yawRad = yawDeg * Math.PI / 180;
        const pitchRad = this.upSign * upDeg * Math.PI / 180;
        TT.player.rotation.y = yawRad;
        TT.setAimYawDbg(yawRad);
        TT.setOtsAimDbg(yawRad, pitchRad);
        await new Promise((r) => setTimeout(r, waitMs));
        return true;
      }
    };
    return true;
  })()`);

  // 1. True pitch-UP ceiling shots!
  // Range ceiling + drill board + baffles
  await page.evaluate(`__R2.look1P(0, -3.5, 0, 38, 400)`);
  await shot(page, 'r2-range-ceiling-baffle-board');

  // Range east HVAC duct vs Armory top & lamp strip (note: facing +x in 1P — let's check both +90 and -90 so we get exact east wall!)
  await page.evaluate(`__R2.look1P(1.5, -3.0, 90, 36, 350)`);
  await shot(page, 'r2-range-east-armory-ceiling-duct-a');
  await page.evaluate(`__R2.look1P(1.5, -3.0, -90, 36, 350)`);
  await shot(page, 'r2-range-west-pipe-doorway-ceiling-b');

  // Doorway open shutter slab from Range looking UP at lintel (y=3..6m)
  await page.evaluate(`__R2.look1P(-4.2, -8.0, -90, 34, 350)`);
  await shot(page, 'r2-doorway-open-shutter-slab-range-up');
  await page.evaluate(`__R2.look1P(-12.0, -8.0, 90, 34, 350)`);
  await shot(page, 'r2-doorway-open-shutter-slab-build-up');

  // Build room pillar + lamp strip + minigun looking UP
  await page.evaluate(`__R2.look1P(-38.0, 9.5, -90, 34, 350)`);
  await shot(page, 'r2-build-west-pillar-lamp-minigun-up');
  await page.evaluate(`__R2.look1P(-26.0, 17.0, 0, 28, 350)`);
  await shot(page, 'r2-zombie-gate-header-minigun-up');

  // 2. Grant all weapons (simulating player buying guns at Armory with $infinity) & inspect Armory rack + Workbench UI!
  await page.evaluate(`(() => {
    TT.grantAllWeapons();
    return true;
  })()`);
  await sleep(500);
  await page.evaluate(`__R2.look1P(4.8, -3.0, 90, 14, 400)`);
  await shot(page, 'r2-armory-rack-all-guns-front');
  await page.evaluate(`__R2.look1P(5.9, -4.6, 52, 16, 400)`);
  await shot(page, 'r2-armory-rack-all-guns-pegs-angle');

  // Open Armory with guns owned & select Shotgun/GW-4 to inspect Workbench panel at 1920x1080 and 1366x768!
  for (const [w, h, tag] of [[1920, 1080, '1920x1080'], [1366, 768, '1366x768']]) {
    await setWindowAndViewport(page, w, h);
    await page.evaluate(`(async () => {
      TT.trainingDbg.act('armory');
      await new Promise((r) => setTimeout(r, 700));
      // Click first gun card in stored/carried to populate Workbench
      const btn = document.querySelector('#cif [data-armory-gun="m4"], #cif [data-gun="m4"], #cif .armory-slot, #cif .armory-card button');
      if (btn) btn.click();
      await new Promise((r) => setTimeout(r, 500));
      return true;
    })()`);
    await shot(page, `r2-menu-armory-populated-${tag}`);
    await page.evaluate(`(() => { document.querySelector('#cifClose')?.click(); return true; })()`);
    await sleep(300);

    // Also capture Range Drill running HUD (#rangeDrillHud) at 1920x1080 and 1366x768!
    await page.evaluate(`(async () => {
      await __R2.look1P(0, -1.5, 0, 0, 250);
      TT.trainingDbg.act('rangeConsole');
      await new Promise((r) => setTimeout(r, 500));
      document.querySelector('#rangeConsole [data-start]')?.click();
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 250));
        const e = document.querySelector('#rangeDrillHud');
        if (e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0) break;
      }
      await new Promise((r) => setTimeout(r, 400));
      return true;
    })()`);
    await shot(page, `r2-menu-range-drill-hud-${tag}`);
    await page.evaluate(`(async () => { __R2.K('Escape'); await new Promise((r) => setTimeout(r, 350)); document.querySelector('#resumeBtn')?.click(); return true; })()`);
    await sleep(250);
  }

  await setWindowAndViewport(page, 1920, 1080);

  // 3. Infirmary death -> wait for blackout to lift -> capture wake-up & test walking out!
  diag.infirmaryRecovery = await page.evaluate(`(async () => {
    await __R2.look1P(-26, 5, 0, 0, 200);
    TT.damagePlayer(9999);
    const t0 = Date.now();
    // Wait for blackout to turn on then off, and wake state to complete
    await new Promise((r) => setTimeout(r, 800));
    while (Date.now() - t0 < 15000) {
      const bo = document.getElementById('trainingBlackout')?.classList.contains('on');
      const st = TT.trainingDbg.state();
      if (!bo && !st.recovering) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    await new Promise((r) => setTimeout(r, 600));
    const O = TT.trainingDbg.tg().origin;
    const wakePos = { x: +(TT.player.position.x - O.x).toFixed(2), z: +(TT.player.position.z - O.z).toFixed(2) };
    return { elapsedMs: Date.now() - t0, wakePos, state: { active: TT.trainingDbg.state().active } };
  })()`);
  await shot(page, 'r2-infirmary-woken-up-view');

  // Now walk out (+z) from wake spot and verify fence lowers & raises!
  diag.infirmaryWalkOut = await page.evaluate(`(async () => {
    const O = TT.trainingDbg.tg().origin;
    TT.player.rotation.y = 0;
    TT.setAimYawDbg(0);
    TT.setOtsAimDbg(0, 0);
    __R2.K('KeyW', false);
    await new Promise((r) => setTimeout(r, 1500));
    __R2.K('KeyW', true);
    await new Promise((r) => setTimeout(r, 400));
    const outPos = { x: +(TT.player.position.x - O.x).toFixed(2), z: +(TT.player.position.z - O.z).toFixed(2) };
    return { outPos };
  })()`);

  fs.writeFileSync(path.join(OUT_DIR, 'run2-diagnostics.json'), JSON.stringify(diag, null, 2) + '\n', 'utf8');
  console.log('[AH-1 Run2] Complete!', JSON.stringify(diag));
} finally {
  await browser.close().catch(() => {});
  await server.close().catch(() => {});
}
