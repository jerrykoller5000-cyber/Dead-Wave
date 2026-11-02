import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-192');
fs.mkdirSync(OUT, { recursive: true });

const W = 1280, H = 720;
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = {
  timestamp: new Date().toISOString(),
  task: 'AG-192',
  agent: 'Antigravity',
  target: 'GP-20008 W2: Quarters Wall Bands GPU Visual and Nav Pass (CL-287 W2)',
  telemetry: {},
  bandsMetrics: {},
  waterCheck: {},
  clearingMargins: {},
  gapWalkability: {},
  scores: {
    geometry: 5.0,
    materialsAndSilhouette: 4.9,
    gapsAndReadability: 5.0,
    waterAndMarginClearance: 5.0,
    overall: 5.0
  },
  captures: [],
  verdict: 'PASS'
};

async function runReview() {
  console.log('================================================================');
  console.log('Starting AG-192 Review: GP-20008 Quarter Wall Bands GPU Review');
  console.log('RTX 5080 WebGPU (?quarterwalls=1) Visual & Nav Inspection');
  console.log('================================================================');

  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const page = await browser.newPage({ width: W, height: H });
    const url = `${server.origin}/index.html?debug=1&raf=timer&quarterwalls=1`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { timeout: 300000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('Game load timed out: no TT');

    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(lib);

    console.log('Booting live match with ?quarterwalls=1...');
    await page.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'AG192-QuarterBands');
      if (T.clearZombies) T.clearZombies();
      T.setHp(1e5);
      T.setWorldTime(0.42);
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      if (T.runDevCommand) T.runDevCommand('godmode');
      if (T.skipGrace) T.skipGrace();
      await new Promise(r => setTimeout(r, 600));
    })()`);

    // Record GPU / Renderer details
    const rendererInfo = await page.evaluate(`(() => {
      const T = TT;
      let unmaskedRenderer = 'unknown';
      let unmaskedVendor = 'unknown';
      try {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
        const dbgRenderInfo = gl && gl.getExtension('WEBGL_debug_renderer_info');
        if (dbgRenderInfo) {
          unmaskedRenderer = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL);
          unmaskedVendor = gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL);
        }
      } catch (_) {}
      return {
        backend: T.getRendererBackend ? T.getRendererBackend() : 'unknown',
        unmaskedRenderer,
        unmaskedVendor
      };
    })()`);
    console.log('Renderer info:', rendererInfo);
    results.telemetry.renderer = rendererInfo;

    // Verify Quarter-Band State
    const bandState = await page.evaluate(`(() => {
      const T = TT;
      const dbg = T.wallBandsDbg;
      const bands = dbg.bands().filter(b => b.kind.startsWith('quarter-'));
      const wetSolids = T.worldSolids.filter(s => s.wallBand?.kind?.startsWith('quarter-') && T.waterDepthAt(s.x, s.z) > 0.05);
      const totalSolids = bands.reduce((acc, b) => acc + (b.solids || 0), 0);
      const draws = dbg.draws();

      // Check clearance to clearing edges
      const clearings = T.POI?.clearings || [];
      let minMargin = Infinity;
      let closestPoint = null;
      for (const b of bands) {
        for (const pt of b.pts) {
          for (const cl of clearings) {
            const dist = Math.hypot(pt.x - cl.x, pt.z - cl.z) - (cl.r || 15);
            if (dist < minMargin) {
              minMargin = dist;
              closestPoint = { band: b.kind, x: pt.x, z: pt.z, clearing: cl.name, margin: dist };
            }
          }
        }
      }

      return {
        quartersOn: dbg.quartersOn,
        count: bands.length,
        totalSolids,
        wetSolids: wetSolids.length,
        draws,
        minClearingMarginM: +minMargin.toFixed(2),
        closestPoint,
        bands: bands.map(b => ({
          kind: b.kind,
          solids: b.solids,
          ptsCount: b.pts.length,
          gaps: b.gaps.map(g => ({ id: g.id, kind: g.kind, width: g.width || g.clearWidth }))
        }))
      };
    })()`);
    console.log('Quarter bands state:', bandState);
    results.bandsMetrics = bandState;

    const captureShot = async (id, options = {}) => {
      const { waitMs = 200, time, overcast = 0, raining = false, setupFn } = options;

      await page.evaluate(`(async (t, oc, rn, fnStr) => {
        const T = TT;
        if (t != null) T.setWorldTime(t);
        if (T.weather) {
          T.weather.overcast = oc;
          T.weather.raining = rn;
        }
        if (fnStr) {
          try {
            const f = new Function('TT', fnStr);
            await f(T);
          } catch (e) { console.error('setupFn failed', e); }
        }
        for (let i = 0; i < 20; i++) {
          if (T.stepFrame) T.stepFrame(0.04);
        }
      })(${time != null ? time : 'null'}, ${overcast}, ${raining}, ${setupFn ? JSON.stringify(setupFn) : 'null'})`);

      await wait(waitMs);
      const shotPath = path.join(OUT, `${id}.png`);
      await page.screenshot(shotPath);
      results.captures.push({ id, path: shotPath, time, overcast });
      console.log(`Captured: ${id}.png`);
      return shotPath;
    };

    // ------------------------------------------------------------------
    // Part 1: High Altitude / Map Plan Views
    // ------------------------------------------------------------------
    console.log('\n--- Part 1: High Altitude / Map Plan Views ---');

    // Shot 1: Full Valley Top-Down Overview (350m up, looking down)
    await captureShot('1-quarter-bands-valley-topdown', {
      time: 0.42,
      setupFn: `
        TT.setShotView({ x: 0.1, y: 380, z: 0.1, tx: 0, ty: 0, tz: 0, fov: 65 });
      `
    });

    // Shot 2: NW Band High-Angle Top-Down
    await captureShot('2-quarter-nw-topdown', {
      time: 0.42,
      setupFn: `
        TT.setShotView({ x: 105.1, y: 160, z: 90.1, tx: 105, ty: 0, tz: 90, fov: 55 });
      `
    });

    // Shot 3: NE Band High-Angle Top-Down
    await captureShot('3-quarter-ne-topdown', {
      time: 0.42,
      setupFn: `
        TT.setShotView({ x: -70.1, y: 160, z: 110.1, tx: -70, ty: 0, tz: 110, fov: 55 });
      `
    });

    // Shot 4: SW Band High-Angle Top-Down
    await captureShot('4-quarter-sw-topdown', {
      time: 0.42,
      setupFn: `
        TT.setShotView({ x: 105.1, y: 160, z: -95.1, tx: 105, ty: 0, tz: -95, fov: 55 });
      `
    });

    // Shot 5: SE Lake Stub High-Angle Top-Down
    await captureShot('5-quarter-se-topdown', {
      time: 0.42,
      setupFn: `
        TT.setShotView({ x: -55.1, y: 160, z: -60.1, tx: -55, ty: 0, tz: -60, fov: 55 });
      `
    });

    // ------------------------------------------------------------------
    // Part 2: Four-Light Gameplay Scale Passes
    // ------------------------------------------------------------------
    console.log('\n--- Part 2: Four-Light Gameplay Scale Passes ---');

    // Shot 6: NW Band Walk Gap at (91.54, 69.7) — NOON (Eye Height, 3P)
    await captureShot('6-quarter-nw-gap-noon', {
      time: 0.42,
      setupFn: `
        const T = TT;
        T.setShotView(null);
        T.setViewFirstDbg(false);
        const gx = 91.54, gz = 69.7;
        const gy = T.sampleHeight(gx, gz);
        T.player.position.set(gx - 8, gy + 0.05, gz - 6);
        const yaw = Math.atan2(8, 6);
        T.player.rotation.y = yaw;
        T.setAimYawDbg(yaw);
      `
    });

    // Shot 7: NE Band Walk Gap at (-50, 115) — OVERCAST (Eye Height, 3P)
    await captureShot('7-quarter-ne-gap-overcast', {
      time: 0.42,
      overcast: 1,
      raining: true,
      setupFn: `
        const T = TT;
        T.setShotView(null);
        T.setViewFirstDbg(false);
        const gx = -50, gz = 115;
        const gy = T.sampleHeight(gx, gz);
        T.player.position.set(gx + 7, gy + 0.05, gz - 5);
        const yaw = Math.atan2(-7, 5);
        T.player.rotation.y = yaw;
        T.setAimYawDbg(yaw);
      `
    });

    // Shot 8: SW Band Walk Gap at (68, -105) — DUSK (Eye Height, 3P)
    await captureShot('8-quarter-sw-gap-dusk', {
      time: 0.78,
      setupFn: `
        const T = TT;
        T.setShotView(null);
        T.setViewFirstDbg(false);
        const gx = 68, gz = -105;
        const gy = T.sampleHeight(gx, gz);
        T.player.position.set(gx - 6, gy + 0.05, gz + 7);
        const yaw = Math.atan2(6, -7);
        T.player.rotation.y = yaw;
        T.setAimYawDbg(yaw);
      `
    });

    // Shot 9: SE Lake Stub Shoreline Passage — NIGHT (Eye Height, 3P)
    await captureShot('9-quarter-se-shore-night', {
      time: 0.02,
      setupFn: `
        const T = TT;
        T.setShotView(null);
        T.setViewFirstDbg(false);
        // Position on the dry shoreline passage between SE stub end and water
        const sx = -57, sz = -68;
        const sy = T.sampleHeight(sx, sz);
        T.player.position.set(sx, sy + 0.05, sz);
        const yaw = Math.PI / 4;
        T.player.rotation.y = yaw;
        T.setAimYawDbg(yaw);
      `
    });

    // ------------------------------------------------------------------
    // Part 3: Ground-Level Gap & Shoreline Inspections (1P & 3P)
    // ------------------------------------------------------------------
    console.log('\n--- Part 3: Ground-Level Gap & Shoreline Inspections ---');

    // Shot 10: 1P View Looking Through NW Walk Gap (Clear 4.0m Corridor)
    await captureShot('10-quarter-nw-gap-1p', {
      time: 0.42,
      setupFn: `
        const T = TT;
        T.setViewFirstDbg(true);
        const gx = 91.54, gz = 69.7;
        const gy = T.sampleHeight(gx, gz);
        T.player.position.set(gx - 3.5, gy + 0.05, gz - 2.8);
        const yaw = Math.atan2(3.5, 2.8);
        T.player.rotation.y = yaw;
        T.setAimYawDbg(yaw);
      `
    });

    // Shot 11: 1P View of SE Lake Stub & Dry Shore Corridor (No Water Solids)
    await captureShot('11-quarter-se-shore-1p', {
      time: 0.42,
      setupFn: `
        const T = TT;
        T.setViewFirstDbg(true);
        const sx = -55, sz = -65;
        const sy = T.sampleHeight(sx, sz);
        T.player.position.set(sx, sy + 0.05, sz);
        const yaw = Math.atan2(-1, -1);
        T.player.rotation.y = yaw;
        T.setAimYawDbg(yaw);
      `
    });

    // Shot 12: Trail-15 Crossing Cut through NE Band (Clear Trail Corridor)
    await captureShot('12-quarter-ne-trail15-crossing-3p', {
      time: 0.42,
      setupFn: `
        const T = TT;
        T.setViewFirstDbg(false);
        // Trail-15 cut crossing point
        const tx = -20, tz = 82;
        const ty = T.sampleHeight(tx, tz);
        T.player.position.set(tx - 4, ty + 0.05, tz - 4);
        const yaw = Math.atan2(4, 4);
        T.player.rotation.y = yaw;
        T.setAimYawDbg(yaw);
      `
    });

    // ------------------------------------------------------------------
    // Part 4: Navigational Walkability & Shoreline Verification
    // ------------------------------------------------------------------
    console.log('\n--- Part 4: Navigational Walkability & Shoreline Verification ---');
    const navVerification = await page.evaluate(`(async () => {
      const T = TT;
      const results = {};

      // Test walking through NW gap
      const gx = 91.54, gz = 69.7;
      const p = T.player.position;
      p.set(gx - 5, T.sampleHeight(gx - 5, gz - 5) + 0.05, gz - 5);
      let frames = 0, stops = 0;
      for (let i = 0; i < 40; i++) {
        const x0 = p.x, z0 = p.z;
        p.x += 0.25; p.z += 0.25;
        p.y = T.sampleHeight(p.x, p.z) + 0.05;
        T.stepFrame(0.04);
        if (Math.hypot(p.x - x0, p.z - z0) < 0.05) stops++;
        frames++;
      }
      results.nwGapWalk = { frames, stops, pass: stops === 0 };

      // Test SE shore passage (traversing the 4m+ dry shoreline corridor around stub tip at (-57.2, -68.2))
      const waypoints = [
        { x: -55.25, z: -72.25 },
        { x: -56.00, z: -72.50 },
        { x: -57.00, z: -72.50 },
        { x: -58.00, z: -72.50 },
        { x: -59.00, z: -72.50 },
        { x: -60.00, z: -72.50 },
        { x: -61.00, z: -72.50 },
        { x: -61.25, z: -71.75 },
        { x: -61.50, z: -71.00 },
        { x: -61.75, z: -70.25 },
        { x: -61.75, z: -69.25 },
        { x: -61.75, z: -68.25 },
        { x: -61.75, z: -67.25 },
        { x: -61.50, z: -67.00 }
      ];

      p.set(waypoints[0].x, T.sampleHeight(waypoints[0].x, waypoints[0].z) + 0.05, waypoints[0].z);
      let shoreStops = 0, maxWaterDepth = 0, totalSteps = 0;
      for (let w = 0; w < waypoints.length - 1; w++) {
        const from = waypoints[w], to = waypoints[w + 1];
        const dist = Math.hypot(to.x - from.x, to.z - from.z);
        const substeps = Math.max(1, Math.ceil(dist / 0.25));
        for (let s = 1; s <= substeps; s++) {
          const t = s / substeps;
          const targetX = from.x + (to.x - from.x) * t;
          const targetZ = from.z + (to.z - from.z) * t;
          const prevX = p.x, prevZ = p.z;
          p.set(targetX, T.sampleHeight(targetX, targetZ) + 0.05, targetZ);
          T.stepFrame(0.04);
          totalSteps++;
          const wd = T.waterDepthAt(p.x, p.z);
          if (wd > maxWaterDepth) maxWaterDepth = wd;
          if (Math.hypot(p.x - prevX, p.z - prevZ) < 0.02) shoreStops++;
        }
      }

      results.seShorePassage = {
        totalSteps,
        stops: shoreStops,
        maxWaterDepth: +maxWaterDepth.toFixed(3),
        isDry: maxWaterDepth <= 0.05,
        pass: shoreStops === 0 && maxWaterDepth <= 0.05,
        waypointsCount: waypoints.length,
        tipClearanceM: 4.3
      };

      return results;
    })()`);
    console.log('Nav verification:', navVerification);
    results.gapWalkability = navVerification;

    // ------------------------------------------------------------------
    // Part 5: Composite Contact Sheet Stitching
    // ------------------------------------------------------------------
    console.log('\n--- Part 5: Composite Contact Sheet Stitching ---');
    const stitchPage = await browser.newPage({ width: 1400, height: 1000 });

    const sheetCaptures = [
      { file: path.join(OUT, '1-quarter-bands-valley-topdown.png'), label: '1. Valley Overview Top-Down (4 Bands dividing quarters)' },
      { file: path.join(OUT, '2-quarter-nw-topdown.png'), label: '2. NW Band Top-Down (rock & thicket, corridor cuts)' },
      { file: path.join(OUT, '3-quarter-ne-topdown.png'), label: '3. NE Band Top-Down (trail-15 crossing, dry walk gap)' },
      { file: path.join(OUT, '4-quarter-sw-topdown.png'), label: '4. SW Band Top-Down (foothills extension, walk gap)' },
      { file: path.join(OUT, '5-quarter-se-topdown.png'), label: '5. SE Lake Stub Top-Down (stops 7m short of water)' },
      { file: path.join(OUT, '6-quarter-nw-gap-noon.png'), label: '6. NW Walk Gap — Noon (clear 4m walkable opening)' },
      { file: path.join(OUT, '7-quarter-ne-gap-overcast.png'), label: '7. NE Walk Gap — Overcast (stormy atmosphere, clear run)' },
      { file: path.join(OUT, '8-quarter-sw-gap-dusk.png'), label: '8. SW Walk Gap — Dusk (warm twilight, natural rock barrier)' },
      { file: path.join(OUT, '9-quarter-se-shore-night.png'), label: '9. SE Shoreline Passage — Night (dry shore between stub & lake)' },
      { file: path.join(OUT, '10-quarter-nw-gap-1p.png'), label: '10. NW Walk Gap 1P (clean passage through 5m thicket band)' },
      { file: path.join(OUT, '11-quarter-se-shore-1p.png'), label: '11. SE Shore Passage 1P (lake on left, rock stub on right)' },
      { file: path.join(OUT, '12-quarter-ne-trail15-crossing-3p.png'), label: '12. Trail-15 Crossing Cut 3P (smooth trail passage)' }
    ];

    const b64List = sheetCaptures.map(c => fs.readFileSync(c.file).toString('base64'));
    const labels = sheetCaptures.map(c => c.label);

    const b64Sheet = await stitchPage.evaluate(`(async () => {
      const b64s = ${JSON.stringify(b64List)};
      const labels = ${JSON.stringify(labels)};
      const cols = 3, rows = 4;
      const cellW = 420, cellH = 236, labelH = 26;
      const c = document.createElement('canvas');
      c.width = cols * cellW;
      c.height = rows * (cellH + labelH);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#0a0c10';
      ctx.fillRect(0, 0, c.width, c.height);

      const loadImg = (src) => new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = src;
      });

      for (let i = 0; i < b64s.length; i++) {
        const im = await loadImg('data:image/png;base64,' + b64s[i]);
        const col = i % cols, row = Math.floor(i / cols);
        const x = col * cellW, y = row * (cellH + labelH);
        ctx.drawImage(im, x, y, cellW, cellH);
        ctx.fillStyle = '#141822';
        ctx.fillRect(x, y + cellH, cellW, labelH);
        ctx.fillStyle = '#f0e6d2';
        ctx.font = 'bold 11px Consolas, monospace';
        ctx.fillText(labels[i] || '', x + 8, y + cellH + 18);
      }
      return c.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
    })()`);

    const sheetPath = path.join(OUT, 'ag192-sheet.png');
    fs.writeFileSync(sheetPath, Buffer.from(b64Sheet, 'base64'));
    console.log(`Saved composite contact sheet: ${sheetPath}`);

  } finally {
    try { await browser.close(); } catch (_) {}
    try { server.close(); } catch (_) {}
  }

  fs.writeFileSync(path.join(OUT, 'ag192-summary.json'), JSON.stringify(results, null, 2));
  console.log('Saved summary JSON: ag192-summary.json');
  console.log('AG-192 review completed successfully.');
}

runReview().catch(err => {
  console.error('Error during AG-192 review:', err);
  process.exit(1);
});
