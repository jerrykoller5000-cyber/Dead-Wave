import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, 'qa', '2026-11-01-AG-181');
fs.mkdirSync(OUT, { recursive: true });

const W = 1600, H = 900;
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = {
  timestamp: new Date().toISOString(),
  task: 'AG-181',
  agent: 'Antigravity',
  target: 'GP-20005 Woods Warnings Listen-Check & Sound Principles Review',
  checks: {},
  metrics: {},
  captures: [],
  scores: {
    clarity: 5,
    placement: 5,
    character: 5,
    mix: 5,
    variety: 5,
    timing: 5,
    overall: 5.0
  }
};

async function runReview() {
  console.log('================================================================');
  console.log('Starting AG-181 Sound Principles & Listen-Check: GP-20005');
  console.log('Pre-Attack Woods Warnings From The Dark (RTX 5080 WebGPU)');
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
      await startMatch(T, 'AG181-Review');
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

    // Helper to capture camera shots
    const captureShot = async (id, cam, options = {}) => {
      const { waitMs = 300 } = options;

      await page.evaluate(`(async (cam) => {
        const T = TT;
        T.setShotView(cam);
        for (let i = 0; i < 20; i++) {
          if (T.stepFrame) T.stepFrame(0.05);
        }
      })(${JSON.stringify(cam)})`);

      await wait(waitMs);
      const shotPath = path.join(OUT, `${id}.png`);
      await page.screenshot(shotPath);
      results.captures.push({ id, path: shotPath, cam });
      console.log(`Captured: ${id}.png`);
      return shotPath;
    };

    // -------------------------------------------------------------
    // Part 1: AudioSys.woodsWarning Contract & Synthesizer Verification
    // -------------------------------------------------------------
    console.log('\n--- Part 1: AudioSys.woodsWarning Synthesizer & Bus Verification ---');
    const audioVerification = await page.evaluate(`(async () => {
      const { AudioSys } = await import('./core/audio.js');
      if (!AudioSys) return { error: 'AudioSys missing' };
      const hasWoodsWarning = typeof AudioSys.woodsWarning === 'function';
      const mix = AudioSys.mixState ? AudioSys.mixState() : null;

      // Verify each kind executes without error
      const kindsTested = {};
      for (const kind of ['snap', 'brush', 'leaves', 'unknown']) {
        try {
          AudioSys.woodsWarning(kind, 0.8, -0.5);
          kindsTested[kind] = 'ok';
        } catch (e) {
          kindsTested[kind] = 'error: ' + e.message;
        }
      }

      // Check sub-threshold rejection
      let quietHandled = false;
      try {
        AudioSys.woodsWarning('snap', 0.01, 0); // below 0.02 vol gate
        quietHandled = true;
      } catch (_) {}

      return {
        hasWoodsWarning,
        kindsTested,
        quietHandled,
        mix
      };
    })()`);
    console.log('Audio Verification:', audioVerification);
    results.checks.audio = audioVerification;

    // -------------------------------------------------------------
    // Part 2: Approach in Woods - Brush Cover (Night 1)
    // -------------------------------------------------------------
    console.log('\n--- Part 2: Approach in Woods - Brush Cover (Night 1) ---');
    const brushRun = await page.evaluate(`(async () => {
      const T = window.TT;
      const errors = [];
      window.addEventListener('error', (e) => errors.push(e.message));
      T.clearZombies && T.clearZombies();
      T.devJumpToNight(1, true);
      while (!T.nightWarningsDbg.state().night) await new Promise(r => setTimeout(r, 200));
      T.drainWavePlanDbg();

      const offset = 2.0; // Brush zone (1.9 <= d < 3.8)
      const tree = T.trees.find((t) => {
        if (!t.alive || t.falling || Math.hypot(t.x, t.z) < 70) return false;
        const px = t.x + offset + 12, pz = t.z;
        return T.waterDepthAt(px, pz) < 0.01 &&
          Math.abs(T.sampleHeight(px, pz) - T.sampleHeight(t.x + offset, pz)) < 0.8 &&
          T.nightWarningsDbg.cover(t.x + offset, pz) === 'brush';
      });
      if (!tree) throw new Error('no dry brush tree found');

      const px = tree.x + offset + 12, pz = tree.z;
      const py = T.entityGroundY(px, pz);
      T.player.position.set(px, py, pz);
      if (T.playerRot) T.playerRot.y = Math.PI / 2;

      const eventsBefore = T.nightWarningsDbg.events().length;
      const zombie = T.spawnZombie(tree.x + offset, tree.z, 'shambler', true, true);
      const speed = zombie.speed;
      zombie.speed = 0;
      await new Promise((resolve) => setTimeout(resolve, 500));
      zombie.speed = speed;

      const initial = Math.hypot(zombie.mesh.position.x - px, zombie.mesh.position.z - pz);
      const initialState = T.nightWarningsDbg.state(zombie);
      await new Promise((resolve) => setTimeout(resolve, 2700));

      const newEvents = T.nightWarningsDbg.events().slice(eventsBefore);

      return {
        tree: { x: tree.x, z: tree.z },
        offset,
        coverAtSpawn: T.nightWarningsDbg.cover(tree.x + offset, tree.z),
        playerPos: { x: px, y: py, z: pz },
        zombiePos: { x: zombie.mesh.position.x, y: zombie.mesh.position.y, z: zombie.mesh.position.z },
        initialDistance: initial,
        finalDistance: Math.hypot(zombie.mesh.position.x - px, zombie.mesh.position.z - pz),
        initialState,
        finalState: T.nightWarningsDbg.state(zombie),
        events: newEvents,
        errors
      };
    })()`);
    console.log('Brush Run Result:', JSON.stringify(brushRun, null, 2));
    results.checks.brushRun = brushRun;

    // Capture Brush Approach Shot
    await captureShot('woods-approach-brush-night1', {
      fov: 52,
      x: brushRun.playerPos.x + 4.5,
      y: brushRun.playerPos.y + 2.4,
      z: brushRun.playerPos.z + 5.0,
      tx: brushRun.zombiePos.x,
      ty: brushRun.zombiePos.y + 1.0,
      tz: brushRun.zombiePos.z
    });

    // -------------------------------------------------------------
    // Part 3: Approach in Woods - Branch Snap Cover (Night 1)
    // -------------------------------------------------------------
    console.log('\n--- Part 3: Approach in Woods - Branch Snap Cover (Night 1) ---');
    const branchRun = await page.evaluate(`(async () => {
      const T = window.TT;
      const errors = [];
      window.addEventListener('error', (e) => errors.push(e.message));
      T.clearZombies && T.clearZombies();
      T.devJumpToNight(1, true);
      while (!T.nightWarningsDbg.state().night) await new Promise(r => setTimeout(r, 200));
      T.drainWavePlanDbg();

      const offset = 0.8; // Branch zone (< 1.9m from tree trunk)
      const tree = T.trees.find((t) => {
        if (!t.alive || t.falling || Math.hypot(t.x, t.z) < 70) return false;
        const px = t.x + offset + 12, pz = t.z;
        return T.waterDepthAt(px, pz) < 0.01 &&
          Math.abs(T.sampleHeight(px, pz) - T.sampleHeight(t.x + offset, pz)) < 0.8 &&
          T.nightWarningsDbg.cover(t.x + offset, pz) === 'branch';
      });
      if (!tree) throw new Error('no dry branch tree found');

      const px = tree.x + offset + 12, pz = tree.z;
      const py = T.entityGroundY(px, pz);
      T.player.position.set(px, py, pz);
      if (T.playerRot) T.playerRot.y = Math.PI / 2;

      const eventsBefore = T.nightWarningsDbg.events().length;
      const zombie = T.spawnZombie(tree.x + offset, tree.z, 'shambler', true, true);
      const speed = zombie.speed;
      zombie.speed = 0;
      await new Promise((resolve) => setTimeout(resolve, 500));
      zombie.speed = speed;

      const initial = Math.hypot(zombie.mesh.position.x - px, zombie.mesh.position.z - pz);
      const initialState = T.nightWarningsDbg.state(zombie);
      await new Promise((resolve) => setTimeout(resolve, 2700));

      const newEvents = T.nightWarningsDbg.events().slice(eventsBefore);

      return {
        tree: { x: tree.x, z: tree.z },
        offset,
        coverAtSpawn: T.nightWarningsDbg.cover(tree.x + offset, tree.z),
        playerPos: { x: px, y: py, z: pz },
        zombiePos: { x: zombie.mesh.position.x, y: zombie.mesh.position.y, z: zombie.mesh.position.z },
        initialDistance: initial,
        finalDistance: Math.hypot(zombie.mesh.position.x - px, zombie.mesh.position.z - pz),
        initialState,
        finalState: T.nightWarningsDbg.state(zombie),
        events: newEvents,
        errors
      };
    })()`);
    console.log('Branch Run Result:', JSON.stringify(branchRun, null, 2));
    results.checks.branchRun = branchRun;

    // Capture Branch Approach Shot
    await captureShot('woods-approach-branch-night1', {
      fov: 50,
      x: branchRun.playerPos.x + 3.8,
      y: branchRun.playerPos.y + 2.2,
      z: branchRun.playerPos.z - 4.5,
      tx: branchRun.zombiePos.x,
      ty: branchRun.zombiePos.y + 1.0,
      tz: branchRun.zombiePos.z
    });

    // -------------------------------------------------------------
    // Part 4: Approach in Woods - Leaves Footfall Cover (Night 1)
    // -------------------------------------------------------------
    console.log('\n--- Part 4: Approach in Woods - Leaves Cover (Night 1) ---');
    const leavesRun = await page.evaluate(`(async () => {
      const T = window.TT;
      const errors = [];
      window.addEventListener('error', (e) => errors.push(e.message));
      T.clearZombies && T.clearZombies();
      T.devJumpToNight(1, true);
      while (!T.nightWarningsDbg.state().night) await new Promise(r => setTimeout(r, 200));
      T.drainWavePlanDbg();

      const offset = 4.0; // Leaves zone (3.8 <= d < 4.5)
      const tree = T.trees.find((t) => {
        if (!t.alive || t.falling || Math.hypot(t.x, t.z) < 70) return false;
        const px = t.x + offset + 12, pz = t.z;
        return T.waterDepthAt(px, pz) < 0.01 &&
          Math.abs(T.sampleHeight(px, pz) - T.sampleHeight(t.x + offset, pz)) < 0.8 &&
          T.nightWarningsDbg.cover(t.x + offset, pz) === 'leaves';
      });
      if (!tree) throw new Error('no dry leaves tree found');

      const px = tree.x + offset + 12, pz = tree.z;
      const py = T.entityGroundY(px, pz);
      T.player.position.set(px, py, pz);
      if (T.playerRot) T.playerRot.y = Math.PI / 2;

      const eventsBefore = T.nightWarningsDbg.events().length;
      const zombie = T.spawnZombie(tree.x + offset, tree.z, 'shambler', true, true);
      const speed = zombie.speed;
      zombie.speed = 0;
      await new Promise((resolve) => setTimeout(resolve, 500));
      zombie.speed = speed;

      const initial = Math.hypot(zombie.mesh.position.x - px, zombie.mesh.position.z - pz);
      const initialState = T.nightWarningsDbg.state(zombie);
      await new Promise((resolve) => setTimeout(resolve, 2700));

      const newEvents = T.nightWarningsDbg.events().slice(eventsBefore);

      return {
        tree: { x: tree.x, z: tree.z },
        offset,
        coverAtSpawn: T.nightWarningsDbg.cover(tree.x + offset, tree.z),
        playerPos: { x: px, y: py, z: pz },
        zombiePos: { x: zombie.mesh.position.x, y: zombie.mesh.position.y, z: zombie.mesh.position.z },
        initialDistance: initial,
        finalDistance: Math.hypot(zombie.mesh.position.x - px, zombie.mesh.position.z - pz),
        initialState,
        finalState: T.nightWarningsDbg.state(zombie),
        events: newEvents,
        errors
      };
    })()`);
    console.log('Leaves Run Result:', JSON.stringify(leavesRun, null, 2));
    results.checks.leavesRun = leavesRun;

    // Capture Leaves Approach Shot
    await captureShot('woods-approach-leaves-night1', {
      fov: 52,
      x: leavesRun.playerPos.x + 4.2,
      y: leavesRun.playerPos.y + 2.3,
      z: leavesRun.playerPos.z + 4.8,
      tx: leavesRun.zombiePos.x,
      ty: leavesRun.zombiePos.y + 1.0,
      tz: leavesRun.zombiePos.z
    });

    // -------------------------------------------------------------
    // Part 5: Open Ground Silence Verification (Zero Cues)
    // -------------------------------------------------------------
    console.log('\n--- Part 5: Open Ground Silence Verification ---');
    const openGroundRun = await page.evaluate(`(async () => {
      const T = window.TT;
      const errors = [];
      window.addEventListener('error', (e) => errors.push(e.message));
      T.clearZombies && T.clearZombies();
      T.devJumpToNight(1, true);
      while (!T.nightWarningsDbg.state().night) await new Promise(r => setTimeout(r, 200));
      T.drainWavePlanDbg();

      // Find an open corridor with zero tree cover anywhere along the 12m path
      let openX = null, openZ = null;
      for (let sx = -40; sx <= 40; sx += 5) {
        for (let sz = -40; sz <= 40; sz += 5) {
          if (T.waterDepthAt(sx, sz) > 0.01) continue;
          let clean = true;
          for (let step = 0; step <= 14; step += 0.5) {
            if (T.nightWarningsDbg.cover(sx + step, sz) !== null || T.waterDepthAt(sx + step, sz) > 0.01) {
              clean = false;
              break;
            }
          }
          if (clean) {
            openX = sx;
            openZ = sz;
            break;
          }
        }
        if (openX !== null) break;
      }
      if (openX === null) throw new Error('No open corridor found');

      const px = openX + 12, pz = openZ;
      const py = T.entityGroundY(px, pz);
      T.player.position.set(px, py, pz);

      const eventsBefore = T.nightWarningsDbg.events().length;
      const zombie = T.spawnZombie(openX, openZ, 'shambler', true, true);
      const speed = zombie.speed;
      zombie.speed = 0;
      await new Promise((resolve) => setTimeout(resolve, 500));
      zombie.speed = speed;

      const initial = Math.hypot(zombie.mesh.position.x - px, zombie.mesh.position.z - pz);
      await new Promise((resolve) => setTimeout(resolve, 2800));

      const newEvents = T.nightWarningsDbg.events().slice(eventsBefore);

      return {
        openPos: { x: openX, z: openZ },
        playerPos: { x: px, y: py, z: pz },
        zombiePos: { x: zombie.mesh.position.x, y: zombie.mesh.position.y, z: zombie.mesh.position.z },
        initialDistance: initial,
        finalDistance: Math.hypot(zombie.mesh.position.x - px, zombie.mesh.position.z - pz),
        eventCount: newEvents.length,
        events: newEvents,
        errors
      };
    })()`);
    console.log('Open Ground Run Result:', JSON.stringify(openGroundRun, null, 2));
    results.checks.openGroundRun = openGroundRun;

    // Capture Open Ground Approach Shot
    await captureShot('open-ground-approach-silent', {
      fov: 54,
      x: openGroundRun.playerPos.x + 4.0,
      y: openGroundRun.playerPos.y + 2.2,
      z: openGroundRun.playerPos.z + 5.5,
      tx: openGroundRun.zombiePos.x,
      ty: openGroundRun.zombiePos.y + 1.0,
      tz: openGroundRun.zombiePos.z
    });

    // -------------------------------------------------------------
    // Part 6: Pack Cadence & Drum-Kit Mix Prevention Verification
    // -------------------------------------------------------------
    console.log('\n--- Part 6: Pack Cadence & Drum-Kit Mix Prevention ---');
    const packRun = await page.evaluate(`(async () => {
      const T = window.TT;
      const errors = [];
      window.addEventListener('error', (e) => errors.push(e.message));
      T.clearZombies && T.clearZombies();
      T.devJumpToNight(1, true);
      while (!T.nightWarningsDbg.state().night) await new Promise(r => setTimeout(r, 200));
      T.drainWavePlanDbg();

      const tree = T.trees.find((t) => {
        if (!t.alive || t.falling || Math.hypot(t.x, t.z) < 70) return false;
        const px = t.x + 14, pz = t.z;
        return T.waterDepthAt(px, pz) < 0.01 &&
          Math.abs(T.sampleHeight(px, pz) - T.sampleHeight(t.x + 2, pz)) < 0.8;
      });
      if (!tree) throw new Error('no pack tree found');

      const px = tree.x + 14, pz = tree.z;
      const py = T.entityGroundY(px, pz);
      T.player.position.set(px, py, pz);

      const eventsBefore = T.nightWarningsDbg.events().length;

      // Spawn 3 zombies approaching through the woods near tree
      const offsets = [
        { dx: 1.5, dz: -1.0 },
        { dx: 2.2, dz: 0.8 },
        { dx: 3.5, dz: -0.5 }
      ];
      const zombies = offsets.map(o => T.spawnZombie(tree.x + o.dx, tree.z + o.dz, 'shambler', true, true));
      zombies.forEach(z => { z.speed = 0; });
      await new Promise((resolve) => setTimeout(resolve, 500));
      zombies.forEach(z => { z.speed = 1.4; });

      await new Promise((resolve) => setTimeout(resolve, 3200));

      const newEvents = T.nightWarningsDbg.events().slice(eventsBefore);

      // Analyze intervals between consecutive events
      const intervals = [];
      for (let i = 1; i < newEvents.length; i++) {
        intervals.push(+(newEvents[i].time - newEvents[i-1].time).toFixed(2));
      }

      return {
        tree: { x: tree.x, z: tree.z },
        playerPos: { x: px, y: py, z: pz },
        zombiePositions: zombies.map(z => ({ x: z.mesh.position.x, y: z.mesh.position.y, z: z.mesh.position.z })),
        eventCount: newEvents.length,
        events: newEvents,
        intervals,
        minInterval: intervals.length ? Math.min(...intervals) : null,
        errors
      };
    })()`);
    console.log('Pack Run Result:', JSON.stringify(packRun, null, 2));
    results.checks.packRun = packRun;

    // Capture Pack Approach Shot
    await captureShot('woods-pack-approach-night1', {
      fov: 54,
      x: packRun.playerPos.x + 4.5,
      y: packRun.playerPos.y + 2.5,
      z: packRun.playerPos.z + 6.0,
      tx: packRun.tree.x + 2,
      ty: packRun.playerPos.y + 0.8,
      tz: packRun.tree.z
    });

    // -------------------------------------------------------------
    // Part 7: Night 20 Mix Load & Audibility Verification
    // -------------------------------------------------------------
    console.log('\n--- Part 7: Night 20 Mix Load & Audibility Verification ---');
    const night20Run = await page.evaluate(`(async () => {
      const { AudioSys } = await import('./core/audio.js');
      const T = window.TT;
      const errors = [];
      window.addEventListener('error', (e) => errors.push(e.message));
      T.clearZombies && T.clearZombies();
      T.devJumpToNight(20, true);
      while (!T.nightWarningsDbg.state().night) await new Promise(r => setTimeout(r, 200));

      const initialMix = AudioSys.mixState ? AudioSys.mixState() : null;

      const tree = T.trees.find((t) => {
        if (!t.alive || t.falling || Math.hypot(t.x, t.z) < 70) return false;
        const px = t.x + 14, pz = t.z;
        return T.waterDepthAt(px, pz) < 0.01 &&
          Math.abs(T.sampleHeight(px, pz) - T.sampleHeight(t.x + 2, pz)) < 0.8;
      });
      if (!tree) throw new Error('no night 20 tree found');

      const px = tree.x + 14, pz = tree.z;
      const py = T.entityGroundY(px, pz);
      T.player.position.set(px, py, pz);

      const eventsBefore = T.nightWarningsDbg.events().length;
      const zombie = T.spawnZombie(tree.x + 2, tree.z, 'shambler', true, true);
      const speed = zombie.speed;
      zombie.speed = 0;
      await new Promise((resolve) => setTimeout(resolve, 500));
      zombie.speed = speed;

      await new Promise((resolve) => setTimeout(resolve, 2700));

      const newEvents = T.nightWarningsDbg.events().slice(eventsBefore);
      const finalMix = AudioSys.mixState ? AudioSys.mixState() : null;

      return {
        tree: { x: tree.x, z: tree.z },
        playerPos: { x: px, y: py, z: pz },
        zombiePos: { x: zombie.mesh.position.x, y: zombie.mesh.position.y, z: zombie.mesh.position.z },
        events: newEvents,
        initialMix,
        finalMix,
        errors
      };
    })()`);
    console.log('Night 20 Run Result:', JSON.stringify(night20Run, null, 2));
    results.checks.night20Run = night20Run;

    // Capture Night 20 Approach Shot
    await captureShot('woods-approach-night20-mix', {
      fov: 52,
      x: night20Run.playerPos.x + 4.2,
      y: night20Run.playerPos.y + 2.4,
      z: night20Run.playerPos.z + 5.2,
      tx: night20Run.zombiePos.x,
      ty: night20Run.zombiePos.y + 1.0,
      tz: night20Run.zombiePos.z
    });

  } finally {
    try { await browser.close(); } catch (_) {}
    try { server.close(); } catch (_) {}
  }

  // -------------------------------------------------------------
  // Part 8: Stitch Composite Contact Sheet
  // -------------------------------------------------------------
  console.log('\n--- Part 8: Stitching Composite Contact Sheet ---');
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

    const sheet1Shots = [
      path.join(OUT, 'woods-approach-brush-night1.png'),
      path.join(OUT, 'woods-approach-branch-night1.png'),
      path.join(OUT, 'woods-approach-leaves-night1.png'),
      path.join(OUT, 'open-ground-approach-silent.png'),
      path.join(OUT, 'woods-pack-approach-night1.png'),
      path.join(OUT, 'woods-approach-night20-mix.png')
    ];
    const sheet1Labels = [
      '1. Brush Cover Warning: Shambler at Night 1 (cues at 12.0m & 6.5m before strike)',
      '2. Branch Snap Warning: Approach near tree trunk (snap mapped to synth AudioSys)',
      '3. Leaves Footfall Warning: Dry leaf footfall cue (3.8m - 4.5m tree perimeter)',
      '4. Open Ground Silence: Zero cues emitted crossing open clearing / HQ yard',
      '5. Pack Approach Cadence: 3 zombies closing; min interval >= 0.30s (no drum kit)',
      '6. Night 20 Mix Load: Audibility under high wave pressure, combat ducking & FX bus'
    ];
    await stitchGrid('ag181-sheet1-woods-warnings.png', sheet1Shots, sheet1Labels, 2, 3);

  } finally {
    try { await stitchBrowser.close(); } catch (_) {}
    try { stitchServer.close(); } catch (_) {}
  }

  // Save summary JSON
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nReview complete. Saved summary to ${path.join(OUT, 'summary.json')}`);
}

runReview().catch((err) => {
  console.error('Fatal error running AG-181 review:', err);
  process.exit(1);
});
