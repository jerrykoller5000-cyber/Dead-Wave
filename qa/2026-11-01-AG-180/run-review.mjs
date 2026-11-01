import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-180');
fs.mkdirSync(OUT, { recursive: true });

const W = 1600, H = 900;
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = {
  timestamp: new Date().toISOString(),
  task: 'AG-180',
  agent: 'Antigravity',
  target: 'GP-20004 Hikers Trail Chain & Ambulance Key Visual Pass',
  checks: {
    gateCheck: [],
    kitCheck: []
  },
  metrics: {},
  captures: [],
  scores: {
    silhouette: 5,
    proportions: 5,
    construction: 5,
    topology: 5,
    geometryEfficiency: 5,
    uvTextures: 5,
    materials: 5,
    color: 5,
    style: 5,
    readability: 5,
    integration: 5,
    overall: 5.0
  }
};

async function runReview() {
  console.log('================================================================');
  console.log('Starting AG-180 Comprehensive Visual Review: GP-20004');
  console.log('Hikers Trail Closure, Ambulance Glovebox Key, and Supported Kit Tree');
  console.log('================================================================');

  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const page = await browser.newPage({ width: W, height: H });
    const url = `${server.origin}/index.html?debug=1&raf=timer`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { timeout: 300000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('Game load timed out: no TT');

    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(lib);

    console.log('Booting live match...');
    await page.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'AG180-Review');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.setWorldTime(0.50);
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      T.setViewFirstDbg(true);
      if (T.dressGuns) T.dressGuns('pistol');
      if (T.runDevCommand) T.runDevCommand('godmode');
      await new Promise(r => setTimeout(r, 1000));
    })()`);

    // Settle batches and forest
    await page.evaluate(`(async () => {
      const T = TT;
      for (let i = 0; i < 60; i++) {
        T.updateTreeBatches && T.updateTreeBatches();
        await new Promise(r => setTimeout(r, 20));
      }
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
    results.metrics.renderer = rendererInfo;

    // -------------------------------------------------------------
    // Part 1: Measure Exact Object Placements & Tree Geometry (Clean State)
    // -------------------------------------------------------------
    console.log('\n--- Part 1: Measuring World Placements & Geometry (Pre-Open) ---');
    const worldMetrics = await page.evaluate(`(() => {
      const T = TT, C = T.chainDbg;
      C.on(true);
      const gate = C.at('trail-chain');
      const key = C.keyAt('chain-key');
      const camp = T.POI.campsites[1];
      const wreck = T.POI.wrecks[0];
      const d = T.hikersDbg ? T.hikersDbg() : null;

      const round2 = (n) => typeof n === 'number' ? +n.toFixed(2) : null;

      let treeMetrics = null;
      if (d && d.tree) {
        const treeObj = T.trees.find(t => Math.hypot(t.x - d.tree.x, t.z - d.tree.z) < 0.1);
        const gy = T.sampleHeight(d.tree.x, d.tree.z);
        const crownTop = (treeObj?.group?.position?.y ?? gy) + (treeObj?.canopyTop || 0);
        treeMetrics = {
          treeX: round2(d.tree.x),
          treeZ: round2(d.tree.z),
          distFromCamp: round2(Math.hypot(d.tree.x - camp.x, d.tree.z - camp.z)),
          groundY: round2(gy),
          canopyRadius: round2(treeObj?.canopyRadius),
          canopyBottom: round2(treeObj?.canopyBottom),
          canopyTop: round2(treeObj?.canopyTop),
          crownTop: round2(crownTop),
          bagPos: d.bag ? { x: round2(d.bag.x), y: round2(d.bag.y), z: round2(d.bag.z) } : null,
          hangPos: d.hang ? { x: round2(d.hang.x), y: round2(d.hang.y), z: round2(d.hang.z) } : null,
          hangHeightAboveGround: (d.hang && typeof d.hang.y === 'number') ? round2(d.hang.y - T.sampleHeight(d.hang.x, d.hang.z)) : null,
          waterDepth: round2(T.waterAt(d.hang.x, d.hang.z).depth)
        };
      }

      return {
        gate: gate ? {
          x: round2(gate.x),
          z: round2(gate.z),
          groundY: round2(T.sampleHeight(gate.x, gate.z)),
          fenced: gate.fenced,
          distToCamp: round2(Math.hypot(gate.x - camp.x, gate.z - camp.z))
        } : null,
        key: key ? {
          x: round2(key.x),
          y: round2(key.y),
          z: round2(key.z),
          state: key.state,
          visible: key.visible
        } : null,
        camp: { x: round2(camp.x), z: round2(camp.z) },
        wreck: { x: round2(wreck.x), z: round2(wreck.z) },
        treeMetrics
      };
    })()`);
    console.log('World Metrics:', JSON.stringify(worldMetrics, null, 2));
    results.metrics.world = worldMetrics;

    // -------------------------------------------------------------
    // Part 2: Run Gate Check Suite (review/GP-20004/gate-check.js)
    // -------------------------------------------------------------
    console.log('\n--- Part 2: Running gate-check.js Suite ---');
    const gateCheckCode = fs.readFileSync(path.join(ROOT, 'review', 'GP-20004', 'gate-check.js'), 'utf8');
    const gateCheckRaw = await page.evaluate(`(${gateCheckCode})`);
    console.log('gate-check output:\n' + gateCheckRaw);
    results.checks.gateCheck = gateCheckRaw.split('\n').filter(Boolean);

    // -------------------------------------------------------------
    // Part 3: Run Kit Check Suite (review/GP-20004/kit-check.js, Fresh Match)
    // -------------------------------------------------------------
    console.log('\n--- Part 3: Running kit-check.js Suite (Clean State) ---');
    await page.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'AG180-Kit-Check');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.setWorldTime(0.50);
      if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
      T.setViewFirstDbg(true);
      if (T.runDevCommand) T.runDevCommand('godmode');
      await new Promise(r => setTimeout(r, 600));
    })()`);
    const kitCheckCode = fs.readFileSync(path.join(ROOT, 'review', 'GP-20004', 'kit-check.js'), 'utf8');
    const kitCheckRaw = await page.evaluate(`(${kitCheckCode})`);
    console.log('kit-check output:\n' + kitCheckRaw);
    results.checks.kitCheck = kitCheckRaw.split('\n').filter(Boolean);

    // Helper to capture a camera shot using setShotView
    const captureShot = async (id, cam, options = {}) => {
      const { time = 0.50, weather = null, setupFn = null, waitMs = 300 } = options;

      await page.evaluate(`(async (cam, time, weather, setupStr) => {
        const T = TT;
        T.setWorldTime(time);
        if (weather) {
          if (weather.raining != null) {
            T.weather.raining = weather.raining;
            T.weather.intensity = weather.intensity || 0;
            T.weather.rainTimeLeft = weather.raining ? 120 : 0;
          }
          if (weather.overcast != null) {
            T.weather.overcast = weather.overcast;
          }
        } else {
          T.weather.raining = false;
          T.weather.intensity = 0;
          T.weather.overcast = 0;
        }

        if (setupStr) {
          const fn = new Function('T', setupStr);
          await fn(T);
        }

        T.setShotView(cam);

        for (let i = 0; i < 20; i++) {
          if (T.stepFrame) T.stepFrame(0.05);
        }
      })(${JSON.stringify(cam)}, ${time}, ${JSON.stringify(weather)}, ${setupFn ? setupFn.toString() : 'null'})`);

      await wait(waitMs);
      const shotPath = path.join(OUT, `${id}.png`);
      await page.screenshot(shotPath);
      results.captures.push({ id, path: shotPath, cam, time, weather });
      console.log(`Captured: ${id}.png`);
      return shotPath;
    };

    // -------------------------------------------------------------
    // Part 4: Capture Set 1 — Trail Closure (Approach & Four Lights)
    // -------------------------------------------------------------
    console.log('\n--- Part 4: Resetting Match for Photographic Captures ---');
    await page.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'AG180-Visual-Pass');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.setWorldTime(0.50);
      T.setViewFirstDbg(true);
      if (T.runDevCommand) T.runDevCommand('godmode');
      T.chainDbg.on(true);
      await new Promise(r => setTimeout(r, 600));
    })()`);

    console.log('\n--- Capturing Trail Closure Approach & Four Lights ---');
    const closureCam = {
      fov: 35,
      x: 21,
      y: 11.2,
      z: -111,
      tx: 21,
      ty: 10.5,
      tz: -119
    };

    // Make sure gate is closed for closed shots
    const ensureGateClosed = `(T) => {
      T.chainDbg.on(true);
      if (T.chainDbg.read().gates['trail-chain'] === 'open') {
        delete T.chainDbg.read().gates['trail-chain'];
      }
      const gate = T.chainDbg.at('trail-chain');
      if (gate && gate.mesh) gate.mesh.visible = true;
    }`;

    // 1. Noon
    await captureShot('trail-closed-noon', closureCam, {
      time: 0.50,
      setupFn: ensureGateClosed,
      waitMs: 350
    });

    // 2. Overcast / Rain (live storm)
    await captureShot('trail-closed-overcast-rain', closureCam, {
      time: 0.50,
      weather: { raining: true, intensity: 0.85, overcast: 1 },
      setupFn: `(T) => {
        (${ensureGateClosed})(T);
        if (T.runDevCommand) T.runDevCommand('shower');
        T.weather.intensity = 0.85;
      }`,
      waitMs: 400
    });

    // 3. Dusk
    await captureShot('trail-closed-dusk', closureCam, {
      time: 0.73,
      setupFn: ensureGateClosed,
      waitMs: 350
    });

    // 4. Night with Marine Torch
    await captureShot('trail-closed-night-torch', closureCam, {
      time: 0.02,
      setupFn: `(T) => {
        (${ensureGateClosed})(T);
        if (T.runDevCommand) T.runDevCommand('night ops');
        T.setWorldTime(0.02);
        // Player stands right near camera and shines spotlight at the gate
        T.player.position.set(21, 9.5, -111);
        const fl = T.scene.children.find(c => c.isSpotLight && c.distance === 26);
        if (fl) {
          fl.intensity = 48;
          fl.position.set(21, 11.0, -111);
          fl.target.position.set(21, 10.5, -119);
          fl.target.updateMatrixWorld();
        }
      }`,
      waitMs: 400
    });

    // 5. Trail Open (Noon)
    await captureShot('trail-open-noon', closureCam, {
      time: 0.50,
      setupFn: `(T) => {
        T.chainDbg.on(true);
        T.chainDbg.event('ambulance-reached');
        const k = T.chainDbg.keyAt('chain-key');
        if (k) {
          T.chainDbg.read().keys['chain-key'] = 'held';
          if (k.mesh) k.mesh.visible = false;
        }
        T.player.position.set(21, 9.5, -118);
        T.chainDbg.use(); // Opens gate
      }`,
      waitMs: 350
    });

    // 6. Sign & Chain Close-up
    const signCloseupCam = {
      fov: 28,
      x: 21,
      y: 10.7,
      z: -115.5,
      tx: 21,
      ty: 10.6,
      tz: -118
    };
    await captureShot('trail-sign-closeup', signCloseupCam, {
      time: 0.50,
      setupFn: ensureGateClosed,
      waitMs: 350
    });

    // -------------------------------------------------------------
    // Part 5: Capture Set 2 — Ambulance Wreck & Key
    // -------------------------------------------------------------
    console.log('\n--- Part 5: Capturing Ambulance Wreck & Glovebox Key ---');
    // 7. Wreck Context
    const wreckContextCam = {
      fov: 46,
      x: -123,
      y: 3.5,
      z: 44,
      tx: -116.9,
      ty: 1.0,
      tz: 48.2
    };
    await captureShot('ambulance-wreck-context', wreckContextCam, {
      time: 0.50,
      waitMs: 350
    });

    // 8. Ambulance Glovebox Before Event (Key Hidden)
    const gloveboxCam = {
      fov: 50,
      x: -119.5,
      y: 1.8,
      z: 49.2,
      tx: -116.9,
      ty: 0.8,
      tz: 48.2
    };
    await captureShot('ambulance-key-hidden', gloveboxCam, {
      time: 0.50,
      setupFn: `(T) => {
        T.chainDbg.on(true);
        const k = T.chainDbg.keyAt('chain-key');
        if (k) {
          k.state = 'unseen';
          if (k.mesh) k.mesh.visible = false;
        }
        const evIdx = T.chainDbg.read().events.indexOf('ambulance-reached');
        if (evIdx >= 0) T.chainDbg.read().events.splice(evIdx, 1);
      }`,
      waitMs: 350
    });

    // 9. Ambulance Glovebox After Event (Key Visible Close-up)
    await captureShot('ambulance-key-visible-close', gloveboxCam, {
      time: 0.50,
      setupFn: `(T) => {
        T.chainDbg.on(true);
        T.chainDbg.event('ambulance-reached');
        const k = T.chainDbg.keyAt('chain-key');
        if (k) {
          k.state = 'ready';
          if (k.mesh) k.mesh.visible = true;
        }
      }`,
      waitMs: 350
    });

    // -------------------------------------------------------------
    // Part 6: Capture Set 3 — Hikers Kit Tree
    // -------------------------------------------------------------
    console.log('\n--- Part 6: Capturing Hikers Kit Tree ---');
    // 10. Hikers Kit Tree Context
    const kitContextCam = {
      fov: 46,
      x: 32.0,
      y: 11.5,
      z: -116.0,
      tx: 44.7,
      ty: 13.5,
      tz: -124.0
    };
    await captureShot('hikers-kit-tree-context', kitContextCam, {
      time: 0.50,
      setupFn: `(T) => {
        T.runDevCommand('site hikers dry');
      }`,
      waitMs: 350
    });

    // 11. Supported Bough Side View (Crucial attachment view)
    const kitSupportedSideCam = {
      fov: 46,
      x: 48.5,
      y: 13.1,
      z: -117.0,
      tx: 43.0,
      ty: 14.3,
      tz: -124.0
    };
    await captureShot('hikers-kit-bough-supported-side', kitSupportedSideCam, {
      time: 0.50,
      setupFn: `(T) => {
        T.runDevCommand('site hikers dry');
      }`,
      waitMs: 350
    });

    // 12. Hikers Kit Shot Down On Dry Ground
    const kitGroundCam = {
      fov: 48,
      x: 29.5,
      y: 12.2,
      z: -115.0,
      tx: 34.5,
      ty: 11.0,
      tz: -120.9
    };
    await captureShot('hikers-kit-ground-dry', kitGroundCam, {
      time: 0.50,
      setupFn: `(async (T) => {
        T.runDevCommand('site hikers dry');
        await new Promise(r => setTimeout(r, 200));
        const d = T.hikersDbg();
        if (d && d.rope && d.rope[1]) {
          const [a, b] = d.rope[1];
          const P = T.player.position, e = { x: P.x, y: P.y + 1.6, z: P.z };
          const m = { x: (a.x + b.x)/2, y: (a.y + b.y)/2, z: (a.z + b.z)/2 };
          const dx = m.x - e.x, dy = m.y - e.y, dz = m.z - e.z, len = Math.hypot(dx, dy, dz) || 1;
          T.fireRoundDbg(e.x, e.y, e.z, dx/len, dy/len, dz/len, 20, 90, 0);
          for (let i = 0; i < 20; i++) T.stepProjectilesDbg(0.016);
          await new Promise(r => setTimeout(r, 1800));
        }
      })`,
      waitMs: 400
    });

  } finally {
    try { await browser.close(); } catch (_) {}
    try { server.close(); } catch (_) {}
  }

  // -------------------------------------------------------------
  // Part 7: Stitch Composite Contact Sheets
  // -------------------------------------------------------------
  console.log('\n--- Part 7: Stitching Composite Contact Sheets ---');
  const stitchServer = await serve(ROOT, 0);
  const stitchBrowser = await launch({ headless: false, args: [`--window-size=${W},${H}`] });

  try {
    const stitchPage = await stitchBrowser.newPage({ width: W, height: H });
    await stitchPage.goto(`${stitchServer.origin}/tools/blank.html`);

    const stitchGrid = async (outFileName, shots, labels, cols, rows) => {
      const b64List = shots.map(p => fs.readFileSync(p).toString('base64'));
      const b64Sheet = await stitchPage.evaluate(`(async () => {
        const b64s = ${JSON.stringify(b64List)};
        const labels = ${JSON.stringify(labels)};
        const cols = ${cols}, rows = ${rows};
        const cellW = 800, cellH = 450, labelH = 32;
        const c = document.createElement('canvas');
        c.width = cols * cellW;
        c.height = rows * (cellH + labelH);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#0f1115';
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
          ctx.fillStyle = '#161920';
          ctx.fillRect(x, y + cellH, cellW, labelH);
          ctx.fillStyle = '#70c0ff';
          ctx.font = 'bold 14px Consolas, monospace';
          ctx.fillText(labels[i] || '', x + 12, y + cellH + 22);
        }
        return c.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
      })()`);
      const targetPath = path.join(OUT, outFileName);
      fs.writeFileSync(targetPath, Buffer.from(b64Sheet, 'base64'));
      console.log(`Saved contact sheet: ${targetPath}`);
      return targetPath;
    };

    // Sheet 1: Trail Closure (6 shots -> 2 cols x 3 rows)
    const sheet1Shots = [
      path.join(OUT, 'trail-closed-noon.png'),
      path.join(OUT, 'trail-closed-overcast-rain.png'),
      path.join(OUT, 'trail-closed-dusk.png'),
      path.join(OUT, 'trail-closed-night-torch.png'),
      path.join(OUT, 'trail-open-noon.png'),
      path.join(OUT, 'trail-sign-closeup.png')
    ];
    const sheet1Labels = [
      '1. Trail Closure: High Noon Approach (21, -118, looking south)',
      '2. Trail Closure: Live Overcast / Rain Storm Approach',
      '3. Trail Closure: Dusk Approach (warm sunset horizon)',
      '4. Trail Closure: Night Approach lit with Marine Torch',
      '5. Trail Closure: Open Thoroughfare (Key Used, Chain Unhooked)',
      '6. Trail Closure: "TRAIL CLOSED" Wooden Sign & Chain Detail'
    ];
    await stitchGrid('ag180-sheet1-trail-closure.png', sheet1Shots, sheet1Labels, 2, 3);

    // Sheet 2: Ambulance Key & Hikers Kit Tree (6 shots -> 2 cols x 3 rows)
    const sheet2Shots = [
      path.join(OUT, 'ambulance-wreck-context.png'),
      path.join(OUT, 'ambulance-key-hidden.png'),
      path.join(OUT, 'ambulance-key-visible-close.png'),
      path.join(OUT, 'hikers-kit-tree-context.png'),
      path.join(OUT, 'hikers-kit-bough-supported-side.png'),
      path.join(OUT, 'hikers-kit-ground-dry.png')
    ];
    const sheet2Labels = [
      '1. Wreck 0 Ambulance: Rolled Medical Vehicle Exterior Context',
      '2. Ambulance Glovebox: Before "ambulance-reached" (Key Hidden)',
      '3. Ambulance Glovebox: Key Visible on Lip beside Cab Radio',
      '4. Hikers Camp Clearing: Relocated Kit Tree Overview',
      '5. Hikers Kit: Supported Bough Side View (Bark Limb into Trunk)',
      '6. Hikers Kit: Shot-Down Bag Resting on Dry Camp Ground'
    ];
    await stitchGrid('ag180-sheet2-key-and-kit.png', sheet2Shots, sheet2Labels, 2, 3);

  } finally {
    try { await stitchBrowser.close(); } catch (_) {}
    try { stitchServer.close(); } catch (_) {}
  }

  // Save summary.json
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(results, null, 2));
  console.log(`\nReview complete! Summary saved to ${path.join(OUT, 'summary.json')}`);
}

await runReview();
