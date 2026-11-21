// AH-5: Training Area Speed Baseline for D-218 Pass 3 (10 spots x 4 directions x 3 conditions, WebGPU & WebGL)
// Usage: node qa/AH-5/bench-training.mjs <webgpu|webgl>
// Must run inside `node crew/crew.mjs slot run antigravity2 AH-5 --exclusive ...`
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Must run inside game-test slot');

const backend = process.argv[2];
assert(backend === 'webgpu' || backend === 'webgl', 'Usage: node qa/AH-5/bench-training.mjs <webgpu|webgl>');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AH-5');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SPOTS = [
  { id: '01-spawn', label: 'Spawn', lx: 0.0, lz: -3.0, useShotView: false },
  { id: '02-firing-line', label: 'Firing Line', lx: 0.0, lz: -0.9, useShotView: false },
  { id: '03-mid-range', label: 'Mid Range', lx: 0.0, lz: 14.0, useShotView: true },
  { id: '04-backstop', label: 'Backstop', lx: 0.0, lz: 27.5, useShotView: true },
  { id: '05-build-centre', label: 'Build Room Centre', lx: -26.0, lz: 6.0, useShotView: false },
  { id: '06-zombie-gate', label: 'Zombie Gate', lx: -26.0, lz: 22.0, useShotView: false },
  { id: '07-infirmary', label: 'Infirmary', lx: -34.2, lz: -7.5, useShotView: false },
  { id: '08-armory', label: 'Armory', lx: 4.8, lz: -3.0, useShotView: false },
  { id: '09-hq-panel', label: 'HQ Panel', lx: -39.5, lz: 3.0, useShotView: false },
  { id: '10-doorway', label: 'Doorway', lx: -8.0, lz: -8.0, zombiesLx: -9.6, useShotView: false },
];

const DIRS = [
  { dir: 'N', yawDeg: 0 },
  { dir: 'E', yawDeg: 90 },
  { dir: 'S', yawDeg: 180 },
  { dir: 'W', yawDeg: -90 },
];

async function prepareWindow(page) {
  try {
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: 0, top: 0, width: 1936, height: 1168 } });
  } catch {}
  await page.setViewport(1920, 1080, 1);
  try { await page.send('Page.bringToFront', {}); } catch {}
  try { await page.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
  await sleep(250);
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

try {
  const page = await browser.newPage({ width: 1920, height: 1080 });
  await prepareWindow(page);

  const rel = backend === 'webgl' ? 'index.html?debug=1&renderer=webgl' : 'index.html?debug=1';
  console.log(`[AH-5] Booting ${backend} -> ${rel}`);
  await page.goto(`${server.origin}/${rel}`, { timeout: 180000 });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 3; i++) {
    await page.evaluate(`(() => { window.DWOpening?.dismissForTesting?.(); return true; })()`);
    await sleep(300);
  }
  await page.waitFor('Boolean(window.TT) && !window.DWOpening?.active', { timeout: 120000 });
  await sleep(400);

  await page.evaluate(`(() => {
    // Keep FPS & HARDWARE overlay ON (#perf.on) as requested by Director!
    document.getElementById('perf')?.classList.add('on');
    const n = document.getElementById('playerName');
    if (n) { n.value = 'PerfQA'; n.blur(); }
    document.getElementById('modeTraining')?.click();
    return true;
  })()`);

  const ready = await page.waitFor(
    'window.TT?.trainingDbg?.state()?.active && !window.TT?.trainingDbg?.state()?.warming && !document.getElementById("trainingBlackout")?.classList.contains("on")',
    { timeout: 90000, every: 100 }
  );
  assert(ready, `${backend}: Training did not become ready`);
  await sleep(2000);

  // Enable godmode so 10 zombies in Build Room never kill the player mid-measurement,
  // and switch to 1st-person (60 deg FOV) so looking N/E/S/W rotates the camera frustum 4 ways!
  const bootInfo = await page.evaluate(`(() => {
    if (TT.runDevCommand) TT.runDevCommand('godmode');
    TT.setViewFirstDbg(true);
    document.getElementById('perf')?.classList.add('on');
    window.__AH5 = {
      placeView(lx, lz, yawDeg, useShotView) {
        const O = TT.trainingDbg.tg().origin;
        TT.setViewFirstDbg(true);
        const yawRad = yawDeg * Math.PI / 180;
        if (useShotView) {
          // Keep player just behind bench while camera stands downrange at (lx, lz)
          TT.player.position.set(O.x, O.y, O.z - 0.9);
          TT.setVelDbg(0, 0);
          TT.player.rotation.y = yawRad;
          TT.setAimYawDbg(yawRad);
          TT.setOtsAimDbg(yawRad, 0);
          const wx = O.x + lx, wy = O.y + 1.62, wz = O.z + lz;
          const fx = Math.sin(yawRad), fz = Math.cos(yawRad);
          TT.setShotView({ x: wx, y: wy, z: wz, tx: wx + fx * 20, ty: wy, tz: wz + fz * 20, fov: 60 });
        } else {
          TT.setShotView(null);
          TT.player.position.set(O.x + lx, O.y, O.z + lz);
          TT.setVelDbg(0, 0);
          TT.player.rotation.y = yawRad;
          TT.setAimYawDbg(yawRad);
          TT.setOtsAimDbg(yawRad, 0);
        }
        return true;
      },
      readOverlayAndPerf() {
        const snap = TT.perfSnapshot();
        const info = TT.renderer?.info?.render || {};
        const draws = info.drawCalls != null ? info.drawCalls : (info.calls != null ? info.calls : 0);
        const tris = info.triangles != null ? info.triangles : 0;
        const overlayText = String(document.getElementById('perf')?.textContent || '');
        const parseLine = (key) => {
          const m = overlayText.match(new RegExp('^' + key + '\\\\s+(.+)$', 'm'));
          return m ? m[1].trim() : '';
        };
        const fpsExact = Number((snap.fps || 0).toFixed(2));
        const frameMsAvg = snap.fps > 0 ? Number((1000 / snap.fps).toFixed(2)) : 0;
        const lowFps = Number((snap.low || 0).toFixed(2));
        const worstMs = Number((snap.worst || 0).toFixed(2));
        return {
          fps: Math.round(snap.fps || 0),
          fpsExact,
          frameMs: frameMsAvg,
          lowFps,
          worstMs,
          hitches: Number(snap.hitches || 0),
          frames: Number(snap.frames || 0),
          draws: Number(draws),
          triangles: Number(tris),
          trisK: Math.round(tris / 1000),
          zombies: Number(TT.zombies?.length || 0),
          overlay: {
            rend: parseLine('rend'),
            fps: Number.parseInt(parseLine('fps'), 10) || Math.round(snap.fps || 0),
            low: Number.parseInt(parseLine('low'), 10) || Math.round(snap.low || 0),
            worst: parseLine('worst'),
            draws: Number.parseInt(parseLine('draws'), 10) || Number(draws),
            tris: parseLine('tris'),
            zombs: Number.parseInt(parseLine('zombs'), 10) || 0,
            raw: overlayText.replace(/\\s+/g, ' ').trim(),
          }
        };
      }
    };
    return {
      backendLabel: String(TT.getRendererBackend?.() || ''),
      isWebGPU: Boolean(TT.renderer?.backend?.isWebGPUBackend),
      gfxPreset: String(TT.getGfx?.() || ''),
    };
  })()`);
  console.log(`[AH-5] Ready:`, JSON.stringify(bootInfo));
  await sleep(600);

  const conditions = [
    {
      id: 'lights-on',
      label: 'Lights ON (0 zombies)',
      setup: `(() => {
        TT.trainingDbg.clear();
        if (!TT.trainingDbg.lights().on) TT.trainingDbg.toggleLights();
        return true;
      })()`,
      settleMs: 500,
    },
    {
      id: 'lights-off',
      label: 'Lights OFF (0 zombies)',
      setup: `(() => {
        TT.trainingDbg.clear();
        if (TT.trainingDbg.lights().on) TT.trainingDbg.toggleLights();
        return true;
      })()`,
      settleMs: 500,
    },
    {
      id: 'zombies-10',
      label: 'Lights ON + 10 Zombies (Build Room)',
      setup: `(() => {
        if (!TT.trainingDbg.lights().on) TT.trainingDbg.toggleLights();
        TT.trainingDbg.clear();
        TT.trainingDbg.deployNow('shambler', 10);
        return true;
      })()`,
      settleMs: 1800,
    },
  ];

  const rows = [];

  for (const cond of conditions) {
    console.log(`[AH-5] Running condition: ${cond.id}...`);
    await page.evaluate(cond.setup);
    await sleep(cond.settleMs);

    for (const spot of SPOTS) {
      const lx = cond.id === 'zombies-10' && spot.zombiesLx != null ? spot.zombiesLx : spot.lx;
      for (const d of DIRS) {
        await page.evaluate(`__AH5.placeView(${lx}, ${spot.lz}, ${d.yawDeg}, ${Boolean(spot.useShotView)})`);
        await sleep(180); // let camera, cutaway, light pool & shadow cadence settle
        await page.evaluate(`(() => { TT.resetPerf(); return true; })()`);
        await sleep(1050); // full 1.0s perfWindow + >=2 overlay refreshes (0.4s cadence)
        const m = await page.evaluate(`__AH5.readOverlayAndPerf()`);
        rows.push({
          backend,
          condition: cond.id,
          conditionLabel: cond.label,
          spotId: spot.id,
          spotLabel: spot.label,
          lx,
          lz: spot.lz,
          dir: d.dir,
          yawDeg: d.yawDeg,
          ...m,
        });
      }
      const spotRows = rows.filter(r => r.condition === cond.id && r.spotId === spot.id);
      const minFps = Math.min(...spotRows.map(r => r.fps));
      const maxDraws = Math.max(...spotRows.map(r => r.draws));
      console.log(`  [${backend} · ${cond.id}] ${spot.id}: fps=[${spotRows.map(r => r.fps).join(',')}] (min ${minFps}), maxDraws=${maxDraws}, zombs=${spotRows[0].zombies}`);
    }
  }

  // Also capture 1 reference 3rd-person spawn reading (Lights ON) for comparison
  await page.evaluate(`(() => {
    TT.trainingDbg.clear();
    if (!TT.trainingDbg.lights().on) TT.trainingDbg.toggleLights();
    TT.setShotView(null);
    TT.setViewFirstDbg(false);
    const O = TT.trainingDbg.tg().origin;
    TT.player.position.set(O.x, O.y, O.z - 3.0);
    TT.setVelDbg(0, 0);
    return true;
  })()`);
  await sleep(400);
  await page.evaluate(`(() => { TT.resetPerf(); return true; })()`);
  await sleep(1100);
  const spawn3P = await page.evaluate(`__AH5.readOverlayAndPerf()`);

  // Find the 5 worst views for this backend (by highest frameMs, tie-breaking by highest draws)
  const worst5 = rows
    .slice()
    .sort((a, b) => (b.frameMs - a.frameMs) || (b.draws - a.draws))
    .slice(0, 5);

  console.log(`[AH-5] Capturing screenshots for 5 worst ${backend} views...`);
  let lastCond = null;
  for (let i = 0; i < worst5.length; i++) {
    const w = worst5[i];
    if (w.condition !== lastCond) {
      const cSpec = conditions.find(c => c.id === w.condition);
      await page.evaluate(cSpec.setup);
      await sleep(cSpec.settleMs);
      lastCond = w.condition;
    }
    const spot = SPOTS.find(s => s.id === w.spotId);
    await page.evaluate(`__AH5.placeView(${w.lx}, ${w.lz}, ${w.yawDeg}, ${Boolean(spot.useShotView)})`);
    await sleep(250);
    await page.evaluate(`(() => { TT.resetPerf(); return true; })()`);
    await sleep(1100);
    const shotMeasure = await page.evaluate(`__AH5.readOverlayAndPerf()`);
    const fileName = `${backend}-worst-${i + 1}-${w.condition}-${w.spotId}-${w.dir}.png`;
    await page.screenshot(path.join(OUT_DIR, fileName));
    w.screenshot = `qa/AH-5/${fileName}`;
    w.screenshotOverlay = shotMeasure.overlay;
  }

  const out = {
    startedAt: new Date().toISOString(),
    backend,
    bootInfo,
    spawn3PReference: spawn3P,
    worst5,
    rows,
    pageErrors: [...page.errors],
  };
  fs.writeFileSync(path.join(OUT_DIR, `bench-${backend}.json`), JSON.stringify(out, null, 2), 'utf8');
  console.log(`[AH-5] Saved qa/AH-5/bench-${backend}.json (${rows.length} views, ${worst5.length} worst shots).`);
  await page.close();
} finally {
  await browser.close();
  await server.close();
}
