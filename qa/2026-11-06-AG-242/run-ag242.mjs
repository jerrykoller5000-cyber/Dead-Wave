// qa/2026-11-06-AG-242/run-ag242.mjs
// Task AG-242: ?gates=1, a tour for Jerry's Monday try (CL-296, D-111 order 3)
// Real WebGPU hardware verification on Jerry's RTX 5080
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-06-AG-242');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function captureShot(page, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 92;
  const shot = await page.send('Page.captureScreenshot', params);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`[AG-242] Saved screenshot: ${filename}`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n========================================================================');
  console.log('=== [AG-242] ?gates=1 Tour for Jerry\'s Monday Try (CL-296, D-111)   ===');
  console.log('=== Real WebGPU Verification on Jerry\'s RTX 5080                   ===');
  console.log('========================================================================\n');

  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?gates=1&chaingates=1&solid=1&debug=1&raf=timer`;
  console.log('[AG-242] Serving game from:', url);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion'
    ]
  });

  const page = await browser.newPage({ width: 1920, height: 1080 });
  console.log('[AG-242] Loading game with ?gates=1&chaingates=1...');
  await page.goto(url, { timeout: 180000 });

  if (!await page.waitFor('!!window.TT', { timeout: 300000 })) {
    throw new Error('Game did not boot TT within timeout: ' + (page.errors[0] || ''));
  }

  // Dismiss intro
  await page.evaluate(`(() => {
    if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
    else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
  })()`);

  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

  // Start match with Jerry's launcher equipped in First Person
  console.log('[AG-242] Starting match and equipping Jerry\'s launcher in First Person...');
  await page.evaluate(`(async () => {
    const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
    await startMatch(T, 'AG242');
    if (T.clearZombies) T.clearZombies();
    T.setHp(100000);
    T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster();
    T.setWeapon(T.WEAPON_ORDER.indexOf('launcher'));
    T.setAmmoDbg('launcher', 9999);
    T.setViewFirstDbg(true);
    if (T.setWorldTime) T.setWorldTime(0.50); // High noon daylight for crisp visual inspection
  })()`);

  // Verify storyGatesDbg init
  const initCheck = await page.evaluate(`(() => {
    const T = window.TT, D = T.storyGatesDbg;
    if (!D || !D.on) return { ok: false, reason: 'storyGatesDbg off' };
    const rings = D.rings();
    const gates = D.gates();
    return {
      ok: true,
      on: D.on,
      ringCount: rings.length,
      rings: rings.map(r => ({ place: r.place, gate: r.gate, lead: r.lead, cx: r.cx, cz: r.cz, r: r.r, gates: r.gates })),
      gateCount: gates.length,
      skipped: D.skipped()
    };
  })()`);

  if (!initCheck.ok || initCheck.ringCount !== 4) {
    throw new Error('Failed storyGatesDbg init: ' + JSON.stringify(initCheck));
  }
  console.log('[AG-242] Rings online:', initCheck.rings.map(r => `${r.place} (r=${r.r}m, gates=${r.gates.length})`).join(', '));

  const RINGS_CONFIG = [
    {
      place: 'depot',
      key: 'price-key',
      label: 'Depot Shed Ring',
      lead: 'generator',
      wideDist: 10.5,
      widePitch: -0.05
    },
    {
      place: 'mast',
      key: 'sato-key',
      label: 'Radio Mast Yard Ring',
      lead: 'relay',
      wideDist: 11.0,
      widePitch: -0.05
    },
    {
      place: 'hikers',
      key: 'chain-key',
      label: 'Hikers Camp Trail Ring',
      lead: 'missing',
      wideDist: 11.5,
      widePitch: -0.04
    },
    {
      place: 'rangers',
      key: 'ranger-gate-key',
      label: 'Rangers Cache Ring',
      lead: 'search',
      wideDist: 11.0,
      widePitch: -0.05
    }
  ];

  const telemetry = {
    testDate: new Date().toISOString(),
    task: 'AG-242',
    leadTask: 'CL-296 (D-111 order 3)',
    hardware: 'NVIDIA GeForce RTX 5080 WebGPU',
    resolution: '1920x1080',
    lighting: 'Noon Daylight (worldTime = 0.50)',
    weapon: 'Launcher (First Person)',
    rings: {}
  };

  for (const cfg of RINGS_CONFIG) {
    console.log(`\n------------------------------------------------------------------------`);
    console.log(`[AG-242] Processing Ring: ${cfg.label} (${cfg.place})...`);
    console.log(`------------------------------------------------------------------------`);

    // Reset chain to shut state
    await page.evaluate(`window.TT.chainDbg.reset()`);
    await wait(300);

    // -------------------------------------------------------------
    // SHOT 1: Wide shot showing the ring of stone and its gate shut
    // -------------------------------------------------------------
    console.log(`[AG-242] Positioning player for Wide Shot (distance ~${cfg.wideDist}m)...`);
    const wideData = await page.evaluate(`(async (place, distOut, pitch) => {
      const T = window.TT, D = T.storyGatesDbg;
      const ring = D.rings().find(r => r.place === place);
      const g = ring.gates[0];
      const a = Math.atan2(g.z - ring.cz, g.x - ring.cx);

      // Stand distOut outside gate along outward vector
      const wx = g.x + Math.cos(a) * distOut;
      const wz = g.z + Math.sin(a) * distOut;
      const wy = T.sampleHeight(wx, wz);

      T.player.position.set(wx, wy, wz);
      const lookYaw = Math.atan2(g.x - wx, g.z - wz);
      T.setAimYawDbg(lookYaw);
      T.setOtsAimDbg(lookYaw, pitch);
      T.setVelDbg(0, 0);

      for (let i = 0; i < 30; i++) T.stepFrame(1/60);

      const gatesState = D.gates().filter(q => q.place === place);
      const prompt = T.chainDbg.prompt();
      const near = D.near();
      const isShut = D.shut(ring.cx, ring.cz);

      return {
        playerPos: [wx, wy, wz],
        gatePos: [g.x, g.z],
        ringCenter: [ring.cx, ring.cz],
        ringRadius: ring.r,
        distanceToGate: Math.hypot(wx - g.x, wz - g.z),
        lookYaw,
        pitch,
        gatesState,
        prompt,
        near,
        isShut
      };
    })('${cfg.place}', ${cfg.wideDist}, ${cfg.widePitch})`);

    const wideFilename = `${cfg.place}-01-wide-shut.jpg`;
    await captureShot(page, wideFilename);
    console.log(`[AG-242] Wide shot captured at distance ${wideData.distanceToGate.toFixed(1)}m`);

    // -------------------------------------------------------------
    // SHOT 2: From the gate looking in (gate shut)
    // -------------------------------------------------------------
    console.log(`[AG-242] Positioning player at gate looking in (gate shut, 2.2m outside)...`);
    const gateShutData = await page.evaluate(`(async (place) => {
      const T = window.TT, D = T.storyGatesDbg;
      const ring = D.rings().find(r => r.place === place);
      const g = ring.gates[0];
      const a = Math.atan2(g.z - ring.cz, g.x - ring.cx);

      // Stand 2.2m outside gate in interaction reach
      const ox = g.x + Math.cos(a) * 2.2;
      const oz = g.z + Math.sin(a) * 2.2;
      const oy = T.sampleHeight(ox, oz);

      T.player.position.set(ox, oy, oz);
      const lookYaw = Math.atan2(g.x - ox, g.z - oz);
      T.setAimYawDbg(lookYaw);
      T.setOtsAimDbg(lookYaw, -0.04);
      T.setVelDbg(0, 0);

      for (let i = 0; i < 30; i++) T.stepFrame(1/60);

      const gatesState = D.gates().filter(q => q.place === place);
      const prompt = T.chainDbg.prompt();
      const near = D.near();
      const isShut = D.shut(ring.cx, ring.cz);

      return {
        playerPos: [ox, oy, oz],
        gatePos: [g.x, g.z],
        distanceToGate: Math.hypot(ox - g.x, oz - g.z),
        lookYaw,
        gatesState,
        prompt,
        near,
        isShut
      };
    })('${cfg.place}')`);

    const gateShutFilename = `${cfg.place}-02-gate-shut.jpg`;
    await captureShot(page, gateShutFilename);
    console.log(`[AG-242] Gate shut shot captured. Prompt: "${gateShutData.prompt}"`);

    // -------------------------------------------------------------
    // SHOT 3: Same gate open after its key (from gate looking in)
    // -------------------------------------------------------------
    console.log(`[AG-242] Supplying key ${cfg.key} and opening gate...`);
    const gateOpenData = await page.evaluate(`(async (place, key) => {
      const T = window.TT, D = T.storyGatesDbg;
      const ring = D.rings().find(r => r.place === place);
      const g = ring.gates[0];
      const a = Math.atan2(g.z - ring.cz, g.x - ring.cx);

      // Acquire key into held state (using debug hooks tcl296 uses)
      const st = T.chainDbg.read();
      st.keys[key] = 'held';
      T.chainDbg.load(st);

      // Position player at interaction reach (2.2m)
      const ox = g.x + Math.cos(a) * 2.2;
      const oz = g.z + Math.sin(a) * 2.2;
      const oy = T.sampleHeight(ox, oz);
      T.player.position.set(ox, oy, oz);

      const lookYaw = Math.atan2(g.x - ox, g.z - oz);
      T.setAimYawDbg(lookYaw);
      T.setOtsAimDbg(lookYaw, -0.04);
      T.setVelDbg(0, 0);

      for (let i = 0; i < 15; i++) T.stepFrame(1/60);

      const promptWithKey = T.chainDbg.prompt();

      // Trigger gate open via E
      T.chainDbg.use();

      // Wait for gate leaves to fully swing open (w > 0.98)
      const t0 = Date.now();
      while (Date.now() - t0 < 6000) {
        T.stepFrame(1/30);
        const gates = D.gates().filter(q => q.place === place);
        if (gates.every(q => q.w > 0.98)) break;
      }

      // Step additional frames to settle physics and view
      for (let i = 0; i < 30; i++) T.stepFrame(1/60);

      const gatesState = D.gates().filter(q => q.place === place);
      const promptAfter = T.chainDbg.prompt();
      const near = D.near();
      const isShut = D.shut(ring.cx, ring.cz);

      return {
        playerPos: [ox, oy, oz],
        gatePos: [g.x, g.z],
        distanceToGate: Math.hypot(ox - g.x, oz - g.z),
        lookYaw,
        promptWithKey,
        promptAfter,
        gatesState,
        near,
        isShut
      };
    })('${cfg.place}', '${cfg.key}')`);

    const gateOpenFilename = `${cfg.place}-03-gate-open.jpg`;
    await captureShot(page, gateOpenFilename);
    console.log(`[AG-242] Gate open shot captured. Gate open=${gateOpenData.gatesState[0]?.open}, w=${gateOpenData.gatesState[0]?.w?.toFixed(2)}`);

    telemetry.rings[cfg.place] = {
      label: cfg.label,
      place: cfg.place,
      lead: cfg.lead,
      key: cfg.key,
      radius: cfg.wideDist,
      wide: {
        file: wideFilename,
        distance: wideData.distanceToGate,
        playerPos: wideData.playerPos,
        gatePos: wideData.gatePos,
        isShut: wideData.isShut,
        gateOpen: wideData.gatesState[0]?.open ?? false,
        gateW: wideData.gatesState[0]?.w ?? 0
      },
      gateShut: {
        file: gateShutFilename,
        distance: gateShutData.distanceToGate,
        playerPos: gateShutData.playerPos,
        prompt: gateShutData.prompt,
        isShut: gateShutData.isShut,
        gateOpen: gateShutData.gatesState[0]?.open ?? false,
        gateW: gateShutData.gatesState[0]?.w ?? 0,
        solids: gateShutData.gatesState[0]?.solids ?? 0,
        blocks: gateShutData.gatesState[0]?.blocks ?? 0
      },
      gateOpen: {
        file: gateOpenFilename,
        distance: gateOpenData.distanceToGate,
        playerPos: gateOpenData.playerPos,
        promptWithKey: gateOpenData.promptWithKey,
        promptAfter: gateOpenData.promptAfter,
        isShut: gateOpenData.isShut,
        gateOpen: gateOpenData.gatesState[0]?.open ?? true,
        gateW: gateOpenData.gatesState[0]?.w ?? 1,
        solids: gateOpenData.gatesState[0]?.solids ?? 0,
        blocks: gateOpenData.gatesState[0]?.blocks ?? 0
      }
    };
  }

  // Save telemetry JSON
  const telemetryPath = path.join(OUT_DIR, 'telemetry.json');
  fs.writeFileSync(telemetryPath, JSON.stringify(telemetry, null, 2), 'utf8');
  console.log(`\n[AG-242] Successfully saved telemetry to: ${telemetryPath}`);

  await browser.close();
  server.close();
  console.log('[AG-242] Captures complete! Ready for sheet compilation.\n');
}

main().catch((err) => {
  console.error('[AG-242] Fatal error:', err);
  process.exit(1);
});
