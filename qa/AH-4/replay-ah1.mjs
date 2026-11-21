// AH-4 Step 2: Full Hands-On Replay of All 22 AH-1 Items + New CG-1 Pass 1 Checks + All Menus (1920x1080 & 1366x768)
// Runs on LIVE NATIVE WEBGPU (index.html?debug=1) on the RTX 5080 inside the game-test slot.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Must run inside game-test slot');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AH-4');
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
  try { await page.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
  await sleep(200);
}

async function shot(page, name, toRoot = false) {
  const file = path.join(toRoot ? OUT_DIR : RAW_DIR, `${name}.png`);
  await page.screenshot(file);
  return toRoot ? `qa/AH-4/${name}.png` : `qa/AH-4/raw/${name}.png`;
}

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--force_high_performance_gpu',
    '--disable-features=CalculateNativeWinOcclusion',
    '--window-size=1936,1168',
  ],
});

const diagnostics = {
  startedAt: new Date().toISOString(),
  backend: null,
  collisionChecks: [],
  menuTextChecks: {},
  infirmaryWakeCheck: null,
  pageErrors: [],
  consoleErrorsAndWarnings: [],
};

try {
  const page = await browser.newPage({ width: 1920, height: 1080 });
  await setWindowAndViewport(page, 1920, 1080);

  console.log('[AH-4] Booting live native WebGPU into Training Ground...');
  await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 180000 });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 3; i++) {
    await page.evaluate(`(() => { window.DWOpening?.dismissForTesting?.(); return true; })()`);
    await sleep(300);
  }
  await page.waitFor('Boolean(window.TT) && !window.DWOpening?.active', { timeout: 120000 });
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
    { timeout: 90000, every: 100 }
  );
  assert(ready, 'WebGPU Training did not become ready');
  await sleep(1600);

  // Item #01: Live WebGPU spawn & move check
  await shot(page, 'item01-webgpu-training-live', true);

  diagnostics.backend = await page.evaluate(`(() => ({
    isWebGPU: Boolean(TT.renderer?.backend?.isWebGPUBackend),
    backendName: String(TT.renderer?.backend?.constructor?.name || ''),
    drawCalls: Number(TT.renderer?.info?.render?.drawCalls ?? -1),
    triangles: Number(TT.renderer?.info?.render?.triangles ?? -1),
  }))()`);
  console.log('[AH-4] Backend:', JSON.stringify(diagnostics.backend));

  // Calibrate true 1P pitch-up sign dynamically via otsLook(0, -400)
  const upSign = await page.evaluate(`(async () => {
    TT.setViewFirstDbg(true);
    await new Promise((r) => setTimeout(r, 500));
    TT.setOtsAimDbg(0, 0);
    TT.otsLook(0, -400);
    await new Promise((r) => setTimeout(r, 120));
    const p = TT.otsDbg().pitch;
    TT.setOtsAimDbg(0, 0);
    return p >= 0 ? 1 : -1;
  })()`);

  // Install JSON-safe helpers
  await page.evaluate(`(() => {
    window.__AH4 = {
      upSign: ${upSign},
      K(code, up = false) {
        window.dispatchEvent(new KeyboardEvent(up ? 'keyup' : 'keydown', { code, key: code, bubbles: true, cancelable: true }));
      },
      async closeAll() {
        const click = (s) => document.querySelector(s)?.click();
        const shown = (s) => { const e = document.querySelector(s); return !!e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0; };
        if (shown('#rangeDrillHud')) { this.K('Escape'); await new Promise((r) => setTimeout(r, 250)); }
        if (document.querySelector('#fullMap.show')) { this.K('Escape'); await new Promise((r) => setTimeout(r, 200)); }
        this.K('Tab', true); this.K('KeyQ', true); this.K('KeyB', true);
        if (TT.closeWheelDbg) TT.closeWheelDbg();
        if (TT.setPlaceMode) TT.setPlaceMode(null);
        document.getElementById('pauseQuitView')?.classList.remove('on');
        document.getElementById('pauseMainView')?.classList.remove('hide');
        click('#shopClose');
        click('#cifClose');
        document.querySelector('#trainingPanel .tp-close')?.click();
        if (shown('#rangeConsole')) click('#rangeConsole [data-close]');
        if (shown('#pause')) {
          click('#resetCancelBtn');
          click('#settingsBackBtn');
          click('#tipsBackBtn');
          click('#skillsBackBtn');
          click('#resumeBtn');
        }
        await new Promise((r) => setTimeout(r, 250));
        return true;
      },
      async look(lx, lz, yawDeg, upDeg, fp = true, waitMs = 380) {
        const O = TT.trainingDbg.tg().origin;
        TT.setViewFirstDbg(fp);
        TT.player.position.set(O.x + lx, O.y, O.z + lz);
        TT.setVelDbg(0, 0);
        const yawRad = yawDeg * Math.PI / 180;
        const pitchRad = this.upSign * upDeg * Math.PI / 180;
        TT.player.rotation.y = yawRad;
        TT.setAimYawDbg(yawRad);
        TT.setOtsAimDbg(yawRad, pitchRad);
        await new Promise((r) => setTimeout(r, waitMs));
        return true;
      },
      async walkBump(name, lx, lz, yawDeg, ms = 900, extraKey = null) {
        const O = TT.trainingDbg.tg().origin;
        TT.setViewFirstDbg(true);
        TT.player.position.set(O.x + lx, O.y, O.z + lz);
        TT.setVelDbg(0, 0);
        const yawRad = yawDeg * Math.PI / 180;
        TT.player.rotation.y = yawRad;
        TT.setAimYawDbg(yawRad);
        TT.setOtsAimDbg(yawRad, 0);
        await new Promise((r) => setTimeout(r, 100));
        const start = { x: +(TT.player.position.x - O.x).toFixed(3), z: +(TT.player.position.z - O.z).toFixed(3) };
        this.K('KeyW', false);
        if (extraKey) this.K(extraKey, false);
        await new Promise((r) => setTimeout(r, ms));
        this.K('KeyW', true);
        if (extraKey) this.K(extraKey, true);
        await new Promise((r) => setTimeout(r, 80));
        const hit = { x: +(TT.player.position.x - O.x).toFixed(3), z: +(TT.player.position.z - O.z).toFixed(3) };
        this.K('KeyS', false);
        await new Promise((r) => setTimeout(r, 400));
        this.K('KeyS', true);
        await new Promise((r) => setTimeout(r, 80));
        const backed = { x: +(TT.player.position.x - O.x).toFixed(3), z: +(TT.player.position.z - O.z).toFixed(3) };
        const backDist = +Math.hypot(backed.x - hit.x, backed.z - hit.z).toFixed(3);
        return { name, start, hit, backed, backDist, stuck: backDist < 0.15 };
      }
    };
    return true;
  })()`);

  // ===========================================================================
  // PART 1: ALL 3D PROP, FENCE, LIGHTING & PLACEMENT ITEMS (AH-1 #3-#9, #13-#16, #21-#22 + NEW)
  // ===========================================================================
  console.log('[AH-4] Capturing 3D Training Area replay views...');
  await page.evaluate('__AH4.closeAll()');

  const worldShots = [
    // Item #04: Doorway open shutter / header box / signs / sprinkler pipe / post stripes
    ['item04a-doorway-open-range-up', -4.2, -8.0, -90, 32, true],
    ['item04b-doorway-open-build-up', -12.0, -8.0, 90, 32, true],
    ['raw-doorway-lightswitch-close', -5.8, -6.0, -90, -4, true],
    // Item #05: Build Room pillars, wall light strips, blue stripe, wall miniguns, ceiling high-bays
    ['item05a-buildroom-pillar-east-up', -12.2, 0.0, 90, 34, true],
    ['item05b-buildroom-pillar-west-up', -39.5, 9.5, -90, 34, true],
    ['item05c-wall-minigun-east-up', -13.5, 8.0, 90, 36, true],
    ['item05d-wall-minigun-north-gate-up', -26.0, 16.5, 0, 26, true],
    ['raw-buildroom-ceiling-highbays', -26.0, 0.0, 0, 48, true],
    // Item #06: Perimeter fence runs, razor wire coils, Infirmary SE corner & NW west-wall join
    ['item06a-perimeter-infirmary-se-corner', -33.2, -7.2, -135, -6, true],
    ['item06b-infirmary-nw-wall-join', -42.2, -5.2, -172, -10, true],
    ['item06c-perimeter-south-pillar-join', -18.0, -9.0, 180, -4, true],
    // Item #07: Wall stations floor clearance & Supply Terminal roof/beacon
    ['item07a-stations-cif-kiosk-armory-wide', 0.2, -6.6, 90, 6, true],
    ['item07b-kiosk-close-roof', 4.3, -6.6, 90, 8, true],
    // Item #08: Skull Window fences & display skulls
    ['item08-skull-window-front', -38.5, -3.0, -90, 4, true],
    // Item #15a: Overhead Drill Board vs ceiling baffle
    ['item15a-drill-board-baffle-up', 0.0, -3.2, 0, 34, true],
    // Item #16: Back-wall lockers (handles, single dent, door swing)
    ['item16-backwall-lockers', -5.8, -9.2, 180, -4, true],
    // Item #21: Infirmary cot, stretcher, worktop (0.90m), E-cylinder O2 cart & 2nd O2 bottle!
    ['item21a-infirmary-cot-o2-cart', -36.8, -7.5, -135, -12, true],
    ['item21b-infirmary-worktop-bottles', -38.2, -6.4, -162, -12, true],
    ['raw-infirmary-inside-closeup', -39.5, -8.5, -135, -15, true],
    // Item #22: Back-wall rack, DAYS WITHOUT INCIDENT board, downrange signs, firing-line screen + sprinkler notch, target backings
    ['item22a-backwall-rack-daysboard', 3.0, -9.2, 180, -2, true],
    ['item22b-downrange-wall-signs', 0.0, -1.2, 22, 6, true],
    ['item22c-firing-screen-notch-left', -5.4, -2.5, -25, 32, true],
    // Item #03b: Containment gate CLOSED
    ['item03b-containment-gate-closed', -26.0, 19.5, 0, 5, true],
  ];

  for (const [name, lx, lz, yaw, up, fp] of worldShots) {
    await page.evaluate(`__AH4.look(${lx}, ${lz}, ${yaw}, ${up}, ${fp}, 380)`);
    await shot(page, name, !name.startsWith('raw-'));
  }

  // Hit targets to inspect new doubled backing plate on fallen target!
  await page.evaluate(`(async () => {
    const tg = TT.trainingDbg.tg();
    tg.hitTarget(0, 1);
    tg.hitTarget(1, -1);
    await new Promise((r) => setTimeout(r, 450));
    await __AH4.look(3.5, -1.2, 12, -4, true, 350);
    return true;
  })()`);
  await shot(page, 'raw-targets-fallen-backing');

  // Item #13: Lights OFF in Range & Build Room
  await page.evaluate(`(async () => {
    const D = TT.trainingDbg;
    if (D.lights().on) D.toggleLights();
    await __AH4.look(-3.2, -5.5, -55, 4, true, 500);
    return true;
  })()`);
  await shot(page, 'item13a-lights-off-range', true);
  await page.evaluate(`__AH4.look(-26.0, 8.0, 0, 5, true, 450)`);
  await shot(page, 'item13b-lights-off-buildroom', true);
  await page.evaluate(`(() => { const D = TT.trainingDbg; if (!D.lights().on) D.toggleLights(); return true; })()`);
  await sleep(300);

  // Item #03a: Spawn Shamblers -> Containment Gate OPEN + Doorway CLOSED shutter
  await page.evaluate(`(async () => {
    await __AH4.closeAll();
    const D = TT.trainingDbg;
    D.act('trainingPanel');
    await new Promise((r) => setTimeout(r, 350));
    document.querySelector('#trainingPanel .tp-spawn')?.click();
    await new Promise((r) => setTimeout(r, 200));
    document.querySelector('#trainingPanel .tp-close')?.click();
    for (let i = 0; i < 35; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const g = D.tg().releaseGate;
      if (g.leaves[0] && Math.abs(g.leaves[0].position.x) > 1.5) break;
    }
    await __AH4.look(-26.0, 20.0, 0, 4, true, 300);
    return true;
  })()`);
  await shot(page, 'item03a-containment-gate-open', true);

  await page.evaluate(`__AH4.look(-11.5, -8.0, 90, 6, true, 300)`);
  await shot(page, 'item04c-doorway-closed-shutter', true);

  // Clear zombies
  await page.evaluate(`(async () => {
    const D = TT.trainingDbg;
    D.act('trainingPanel');
    await new Promise((r) => setTimeout(r, 250));
    document.querySelector('#trainingPanel .tp-clear:not(.tp-clear-layout)')?.click();
    await new Promise((r) => setTimeout(r, 200));
    document.querySelector('#trainingPanel .tp-close')?.click();
    await new Promise((r) => setTimeout(r, 1500));
    return true;
  })()`);

  // Collision sweep across updated props/fences (Infirmary fence NW join, SE corner, gate, doorway, benches, stations)
  const bumps = [
    ['firing-bench-center', 0, -2.0, 0],
    ['back-lockers', -5.8, -9.8, 180],
    ['cif-counter', 5.2, -10.2, 90],
    ['supply-kiosk', 5.2, -6.6, 90],
    ['armory-bench', 5.0, -3.0, 90],
    ['doorway-north-jamb', -6.8, -6.6, -90],
    ['infirmary-fence-east', -35.0, -10.0, -90],
    ['infirmary-fence-nw-wall', -43.1, -6.8, 180],
    ['infirmary-fence-se-wall', -35.0, -11.15, -90],
    ['containment-gate', -26.0, 25.0, 0],
  ];
  for (const [name, lx, lz, yaw] of bumps) {
    diagnostics.collisionChecks.push(await page.evaluate(`__AH4.walkBump(${JSON.stringify(name)}, ${lx}, ${lz}, ${yaw})`));
  }

  // Grant all weapons + lasers ON -> check Item #09 (stocked Armory rack) & Item #14 (Infirmary wake-up with laser!)
  await page.evaluate(`(() => {
    TT.grantAllWeapons();
    if (TT.setLasersDbg) TT.setLasersDbg(true);
    return true;
  })()`);
  await sleep(450);

  await page.evaluate(`__AH4.look(4.8, -3.0, 90, 14, true, 400)`);
  await shot(page, 'item09a-armory-rack-stocked-front', true);
  await page.evaluate(`__AH4.look(5.9, -4.6, 52, 16, true, 400)`);
  await shot(page, 'item09b-armory-rack-stocked-angle', true);

  // Item #14: Die in Build Room with laser on -> capture as soon as blackout lifts WHILE still lying/waking on stretcher!
  const wakeTiming = await page.evaluate(`(async () => {
    await __AH4.look(-26.0, 0.0, 0, 0, false, 200);
    const t0 = performance.now();
    TT.damagePlayer(9999);
    // Wait for blackout to turn ON first
    for (let i = 0; i < 30; i++) {
      if (document.getElementById('trainingBlackout')?.classList.contains('on')) break;
      await new Promise((r) => setTimeout(r, 80));
    }
    // Wait for blackout to lift (.on removed) so the stretcher wake-up cine is visible!
    for (let i = 0; i < 80; i++) {
      if (!document.getElementById('trainingBlackout')?.classList.contains('on')) break;
      await new Promise((r) => setTimeout(r, 80));
    }
    await new Promise((r) => setTimeout(r, 350)); // let fade clear while still lying on stretcher
    const st = TT.trainingDbg.state();
    return { msToLitWake: Math.round(performance.now() - t0), waking: Boolean(st.waking), recovering: Boolean(st.recovering) };
  })()`);
  await shot(page, 'item14-infirmary-wakeup-laser', true);

  // Wait for wake animation to finish & verify walk-out
  const walkOut = await page.evaluate(`(async () => {
    const O = TT.trainingDbg.tg().origin;
    for (let i = 0; i < 40; i++) {
      const st = TT.trainingDbg.state();
      if (!st.waking && !st.recovering) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    const p0 = { x: +(TT.player.position.x - O.x).toFixed(2), z: +(TT.player.position.z - O.z).toFixed(2) };
    TT.player.rotation.y = 0;
    TT.setAimYawDbg(0);
    TT.setOtsAimDbg(0, 0);
    __AH4.K('KeyW', false);
    await new Promise((r) => setTimeout(r, 1300));
    __AH4.K('KeyW', true);
    await new Promise((r) => setTimeout(r, 250));
    const p1 = { x: +(TT.player.position.x - O.x).toFixed(2), z: +(TT.player.position.z - O.z).toFixed(2) };
    return { wakePos: p0, exitedPos: p1, distMoved: +Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2) };
  })()`);
  diagnostics.infirmaryWakeCheck = { wakeTiming, walkOut };

  // ===========================================================================
  // PART 2: ALL MENUS & PANELS REPLAY AT 1920x1080 AND 1366x768 (AH-1 #2, #10-#12, #15b, #17-#20)
  // ===========================================================================
  console.log('[AH-4] Capturing all menu & panel replay checks at 1920x1080 and 1366x768...');

  for (const [w, h, tag] of [[1920, 1080, '1920'], [1366, 768, '1366']]) {
    await setWindowAndViewport(page, w, h);
    await page.evaluate('__AH4.closeAll()');

    // Item #20: Pause
    await page.evaluate(`(async () => { await __AH4.look(0, -1.5, 0, 0, true, 200); __AH4.K('Escape'); await new Promise(r=>setTimeout(r,350)); return true; })()`);
    await shot(page, `item20-pause-${tag}`, true);
    if (tag === '1920') {
      diagnostics.menuTextChecks.pause = await page.evaluate(`(() => ({
        text: document.getElementById('pauseMainView')?.innerText?.replace(/\\s+/g, ' ').trim() || '',
      }))()`);
    }

    // Item #17: Settings & Tips
    await page.evaluate(`(async () => { document.querySelector('#settingsBtn')?.click(); await new Promise(r=>setTimeout(r,350)); return true; })()`);
    await shot(page, `item17a-settings-${tag}`, true);
    await page.evaluate(`(async () => { document.querySelector('#settingsBackBtn')?.click(); await new Promise(r=>setTimeout(r,200)); document.querySelector('#tipsBtn')?.click(); await new Promise(r=>setTimeout(r,350)); return true; })()`);
    await shot(page, `item17b-tips-${tag}`, true);
    await page.evaluate('__AH4.closeAll()');

    // Item #19: HQ Zombie Panel
    await page.evaluate(`(async () => { await __AH4.look(-41.5, 3.0, -90, 0, true, 200); TT.trainingDbg.act('trainingPanel'); await new Promise(r=>setTimeout(r,450)); return true; })()`);
    await shot(page, `item19-hq-zombie-panel-${tag}`, true);
    if (tag === '1920') {
      diagnostics.menuTextChecks.hqPanel = await page.evaluate(`(() => {
        const p = document.getElementById('trainingPanel');
        const h = p?.querySelector('h2, h3, .tp-title');
        return {
          titleFont: h ? getComputedStyle(h).fontFamily : '',
          hasCaveGuard: /cave\\s*guard/i.test(p?.innerText || ''),
          kindButtons: Array.from(p?.querySelectorAll('button') || []).map(b => b.innerText.trim()).filter(Boolean),
        };
      })()`);
    }
    await page.evaluate('__AH4.closeAll()');

    // Item #10: Range Console
    await page.evaluate(`(async () => { await __AH4.look(-5.5, -1.5, -35, -8, true, 200); TT.trainingDbg.act('rangeConsole'); await new Promise(r=>setTimeout(r,500)); return true; })()`);
    await shot(page, `item10-range-console-${tag}`, true);
    if (tag === '1920') {
      diagnostics.menuTextChecks.rangeConsole = await page.evaluate(`(() => ({
        text: document.getElementById('rangeConsole')?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 600) || '',
      }))()`);
    }
    await page.evaluate('__AH4.closeAll()');

    // Item #11: CIF
    await page.evaluate(`(async () => { await __AH4.look(5.5, -10.2, 90, 0, true, 200); TT.trainingDbg.act('cif'); await new Promise(r=>setTimeout(r,800)); return true; })()`);
    await shot(page, `item11-cif-${tag}`, true);
    if (tag === '1920') {
      diagnostics.menuTextChecks.cif = await page.evaluate(`(() => ({
        text: document.getElementById('cif')?.innerText?.replace(/\\s+/g, ' ').trim().slice(0, 600) || '',
      }))()`);
    }
    await page.evaluate('__AH4.closeAll()');

    // Item #02 & #12: Armory (wait 3.5s after selecting GW-4 so Workbench 3D preview settles!)
    await page.evaluate(`(async () => {
      await __AH4.look(5.5, -3.0, 90, 0, true, 200);
      TT.trainingDbg.act('armory');
      await new Promise(r => setTimeout(r, 700));
      const btn = document.querySelector('#cif [data-armory-gun="m4"], #cif [data-gun="m4"], #cif .armory-slot, #cif .armory-card button');
      if (btn) btn.click();
      await new Promise(r => setTimeout(r, 6500));
      return true;
    })()`);
    await shot(page, `item12-armory-settled-${tag}`, true);
    if (tag === '1920') {
      diagnostics.menuTextChecks.armory = await page.evaluate(`(() => {
        const h = document.querySelector('#cif h2, #cif h1');
        return {
          titleFont: h ? getComputedStyle(h).fontFamily : '',
          hasBlockChar: /▮/.test(document.getElementById('cif')?.innerText || ''),
        };
      })()`);
    }
    await page.evaluate('__AH4.closeAll()');

    // Item #18: Supply Terminal (SUPPLIES + BUILDS)
    await page.evaluate(`(async () => { await __AH4.look(5.5, -6.6, 90, 0, true, 200); TT.trainingDbg.act('kiosk'); await new Promise(r=>setTimeout(r,450)); return true; })()`);
    await shot(page, `item18a-kiosk-supplies-${tag}`, true);
    await page.evaluate(`(async () => { [...document.querySelectorAll('#shopTabs button')].at(-1)?.click(); await new Promise(r=>setTimeout(r,400)); return true; })()`);
    await shot(page, `item18b-kiosk-builds-${tag}`, true);
    if (tag === '1920') {
      diagnostics.menuTextChecks.kiosk = await page.evaluate(`(() => ({
        hasBlockChar: /▮/.test(document.getElementById('shop')?.innerText || ''),
        mentionsFortifyTab: /Fortify tab/i.test(document.getElementById('shop')?.innerText || ''),
        hasFieldIntel: /FIELD INTEL/i.test(document.getElementById('shop')?.innerText || ''),
      }))()`);
    }
    await page.evaluate('__AH4.closeAll()');

    // Item #15b: Active Range Drill HUD at bench in 1P
    if (tag === '1920') {
      await page.evaluate(`(async () => {
        await __AH4.look(0, -1.5, 0, 0, true, 200);
        TT.trainingDbg.act('rangeConsole');
        await new Promise(r => setTimeout(r, 400));
        document.querySelector('#rangeConsole [data-start]')?.click();
        for (let i = 0; i < 35; i++) {
          await new Promise(r => setTimeout(r, 200));
          const e = document.getElementById('rangeDrillHud');
          if (e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0) break;
        }
        await new Promise(r => setTimeout(r, 350));
        return true;
      })()`);
      await shot(page, 'item15b-drill-active-hud-1p', true);
      await page.evaluate('__AH4.closeAll()');
    }
  }

  diagnostics.pageErrors = [...page.errors];
  diagnostics.consoleErrorsAndWarnings = page.console.filter((c) => c.type === 'error' || c.type === 'warning').slice(0, 60);
  diagnostics.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT_DIR, 'ah4-diagnostics.json'), JSON.stringify(diagnostics, null, 2), 'utf8');
  console.log('[AH-4] Complete! Wrote qa/AH-4/ah4-diagnostics.json');
  await page.close();
} finally {
  await browser.close();
  await server.close();
}
