// qa/2026-10-20-AG-99/run-ag99.mjs
// AG-99: Visual and functional GPU inspection of the last two day missions:
// 1. Hikers' kit (`~ site hikers`: bag on rope, shoot rope, frayed ends, drop, river float, pool snag, E to grab; plus dry landing).
// 2. Fuel depot (`~ site fuel`: hold E at pump, carry can + FPS measurement while carrying/walking, drip trail, E to put down, E to pick up, fire sets it off, pour at HQ generator).
// Also inspects all 3D meshes in both missions for floating, clipping, or placeholder geometry.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = path.join(ROOT, 'qa', '2026-10-20-AG-99');
fs.mkdirSync(OUT_DIR, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const summary = {
  realtestT264: null,
  realtestT267: null,
  hikersAudit: {},
  fuelAudit: {},
  carryFps: null,
  consoleErrors: [],
  pageErrors: [],
};

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1920,1080'],
});

try {
  // First run t264 and t267 on the real WebGPU renderer (as t267 specifically notes: gunShown pose pass is verified on real renderer)
  for (const tName of ['t264', 't267']) {
    console.log(`=== Running ${tName} on real GPU renderer ===`);
    const code = fs.readFileSync(path.join(ROOT, 'tools', 'tests', `${tName}.js`), 'utf8');
    const page = await browser.newPage({ width: 1280, height: 720 });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
    } catch { /* ignore */ }
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
    await page.waitFor('!!window.TT', { timeout: 240000 });
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
    await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8'));
    const out = await page.evaluate(code, 300000);
    const lines = String(out || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const pass = lines.filter((l) => l.startsWith('PASS')).length;
    const fail = lines.filter((l) => l.startsWith('FAIL')).length;
    const fails = lines.filter((l) => !l.startsWith('PASS'));
    summary[tName === 't264' ? 'realtestT264' : 'realtestT267'] = { pass, fail, fails, lines };
    console.log(`${tName} (real GPU): ${pass} pass, ${fail} fail`);
    for (const f of fails) console.log('  ', f);
    try { await page.send('Page.close', {}); } catch { /* ignore */ }
  }

  // Now open a 1920x1080 real GPU session for visual inspection & screenshots
  console.log('=== Starting 1920x1080 visual inspection session ===');
  const page = await browser.newPage({ width: 1920, height: 1080 });
  await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 240000 });
  await page.waitFor('!!window.TT', { timeout: 240000 });
  await page.evaluate(`(() => {
    const dsc = document.getElementById('disclaimer');
    if (dsc && dsc.dataset.state !== 'done') {
      const s = document.getElementById('disclaimerSkip');
      if (s) s.click(); else dsc.click();
    }
    if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
  })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8'));

  // Start Day 1 match
  await page.evaluate(`(async () => {
    await startMatch(window.TT, 'AG99Look');
    TT.clearZombies();
    TT.setHp(100000);
    TT.runDevCommand('godmode');
  })()`);
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 60000 });
  await wait(1500);

  // Helper to run ~ console command
  async function runConsole(cmd) {
    await page.evaluate(`TT.runDevCommand(${JSON.stringify(cmd)})`);
  }

  // =========================================================================
  // PART 1: HIKERS' KIT (~ site hikers)
  // =========================================================================
  console.log('=== Part 1: Hikers Kit (~ site hikers) ===');
  await runConsole('site hikers river');
  await page.waitFor(`!!(TT.hikersDbg && TT.hikersDbg().bag && TT.hikersDbg().kit.phase === 'hanging')`, { timeout: 10000 });
  await wait(800);

  // Audit hanging geometry & capture overview shot
  summary.hikersAudit.hanging = await page.evaluate(`(() => {
    const THREE = TT.THREE;
    const d = TT.hikersDbg();
    const groundY = TT.sampleHeight(d.hang.x, d.hang.z);
    const treeGroundY = d.tree ? TT.sampleHeight(d.tree.x, d.tree.z) : null;
    const water = TT.waterAt(d.hang.x, d.hang.z);
    // Position player to see the tree bough, rope, and hanging bag clearly
    const P = TT.player.position;
    const dx = d.hang.x - d.tree.x, dz = d.hang.z - d.tree.z;
    const sideX = -dz, sideZ = dx;
    const sl = Math.hypot(sideX, sideZ) || 1;
    const px = d.hang.x + (sideX / sl) * 7.5;
    const pz = d.hang.z + (sideZ / sl) * 7.5;
    P.set(px, TT.sampleHeight(px, pz), pz);
    TT.player.rotation.y = Math.atan2(-(d.hang.x - px), -(d.hang.z - pz));
    return {
      phase: d.kit.phase,
      river: d.river,
      tree: d.tree,
      treeGroundY,
      hang: d.hang,
      bag: d.bag,
      groundY,
      heightAboveGround: +(d.hang.y - groundY).toFixed(3),
      waterAtHang: water,
      ropeSegments: d.rope,
      prompt: ((document.getElementById('kioskPrompt') || {}).textContent || '').trim(),
      bannerTitle: ((document.getElementById('bannerTitle') || {}).textContent || '').trim(),
      bannerSub: ((document.getElementById('bannerSub') || {}).textContent || '').trim(),
    };
  })()`);
  await wait(500);
  await page.screenshot(path.join(OUT_DIR, '01-hikers-hanging-overview.png'));

  // Capture a close-up eye-level shot of the hanging bag, bough knot, and rope using a temporary camera override
  await page.evaluate(`(() => {
    const d = TT.hikersDbg();
    window.__savedCam = {
      pos: TT.camera.position.clone(),
      quat: TT.camera.quaternion.clone(),
    };
    // Pause normal camera update for 1 frame render by rendering directly from a close perspective
    const cx = d.bag.x + 2.2, cy = d.bag.y + 0.8, cz = d.bag.z + 2.2;
    TT.camera.position.set(cx, cy, cz);
    TT.camera.lookAt(d.bag.x, d.bag.y + 0.6, d.bag.z);
    TT.renderer.render(TT.scene, TT.camera);
  })()`);
  await page.screenshot(path.join(OUT_DIR, '02-hikers-hanging-closeup.png'));

  // Shoot the rope!
  console.log('Shooting the hikers rope...');
  summary.hikersAudit.cutAndFall = await page.evaluate(`(() => {
    const T = window.TT;
    const d = T.hikersDbg();
    const [a, b] = d.rope[1];
    const P = T.player.position;
    const e = { x: P.x, y: P.y + 1.6, z: P.z };
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
    const dx = m.x - e.x, dy = m.y - e.y, dz = m.z - e.z, L = Math.hypot(dx, dy, dz) || 1;
    T.fireRoundDbg(e.x, e.y, e.z, dx / L, dy / L, dz / L, 20, 90, 0);
    for (let i = 0; i < 12; i++) T.stepProjectilesDbg(0.016);
    const after = T.hikersDbg();
    // Render close-up of the parted rope (frayTop + stub + falling bag)
    const cx = after.bag.x + 2.4, cy = after.bag.y + 0.9, cz = after.bag.z + 2.4;
    T.camera.position.set(cx, cy, cz);
    T.camera.lookAt(after.bag.x, after.bag.y + 0.5, after.bag.z);
    T.renderer.render(T.scene, T.camera);
    return {
      phaseAfterShot: after.kit.phase,
      cutInfo: after.cut,
      bagPos: after.bag,
    };
  })()`);
  await page.screenshot(path.join(OUT_DIR, '03-hikers-cut-falling-fray.png'));

  // Wait for bag to splash into the river and start floating
  await page.waitFor(`TT.hikersDbg().kit.phase === 'floating'`, { timeout: 8000 });
  await wait(800);
  summary.hikersAudit.floating = await page.evaluate(`(() => {
    const T = window.TT;
    const d = T.hikersDbg();
    const w = T.waterAt(d.bag.x, d.bag.z);
    const gY = T.sampleHeight(d.bag.x, d.bag.z);
    // Move player along bank near floating bag
    T.player.position.set(d.bag.x + 3.2, T.sampleHeight(d.bag.x + 3.2, d.bag.z + 2.0), d.bag.z + 2.0);
    T.player.rotation.y = Math.atan2(-(d.bag.x - T.player.position.x), -(d.bag.z - T.player.position.z));
    return {
      phase: d.kit.phase,
      bag: d.bag,
      water: w,
      groundY: gY,
      bagMinusWaterY: +(d.bag.y - w.level).toFixed(3),
      grabbableAt3m: d.grabbable,
    };
  })()`);
  await wait(400);
  await page.screenshot(path.join(OUT_DIR, '04-hikers-floating-river.png'));

  // Also capture close-up of floating bag in the water
  await page.evaluate(`(() => {
    const T = window.TT;
    const d = T.hikersDbg();
    T.camera.position.set(d.bag.x + 1.8, d.bag.y + 1.2, d.bag.z + 1.8);
    T.camera.lookAt(d.bag.x, d.bag.y, d.bag.z);
    T.renderer.render(T.scene, T.camera);
  })()`);
  await page.screenshot(path.join(OUT_DIR, '04b-hikers-floating-closeup.png'));

  // Move within 1.3m of the floating bag, check prompt, press E to grab it
  await page.evaluate(`(() => {
    const T = window.TT;
    const d = T.hikersDbg();
    T.player.position.set(d.bag.x + 1.1, T.sampleHeight(d.bag.x + 1.1, d.bag.z), d.bag.z);
    T.player.rotation.y = Math.atan2(-(d.bag.x - T.player.position.x), -(d.bag.z - T.player.position.z));
  })()`);
  await wait(300);
  summary.hikersAudit.beforeGrab = await page.evaluate(`(() => {
    const d = TT.hikersDbg();
    return {
      phase: d.kit.phase,
      grabbable: d.grabbable,
      prompt: ((document.getElementById('kioskPrompt') || {}).textContent || '').trim(),
      medkitsBefore: TT.getMedkits(),
    };
  })()`);
  await page.screenshot(path.join(OUT_DIR, '05-hikers-in-reach-prompt.png'));

  // Press E to grab the kit
  await page.evaluate(`(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
  })()`);
  await wait(100);
  await page.evaluate(`(() => {
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
  })()`);
  await wait(500);
  summary.hikersAudit.afterGrab = await page.evaluate(`(() => {
    const d = TT.hikersDbg();
    return {
      phase: d.kit.phase,
      done: d.kit.done,
      site: d.site,
      medkitsAfter: TT.getMedkits(),
      bannerTitle: ((document.getElementById('bannerTitle') || {}).textContent || '').trim(),
      bannerSub: ((document.getElementById('bannerSub') || {}).textContent || '').trim(),
    };
  })()`);
  await page.screenshot(path.join(OUT_DIR, '06-hikers-grabbed-claimed.png'));

  // Reset match to also inspect `site hikers dry` (landing on dry bank)
  await page.evaluate(`(async () => {
    await startMatch(window.TT, 'AG99HikersDry');
    TT.clearZombies();
    TT.setHp(100000);
    TT.runDevCommand('godmode');
  })()`);
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 60000 });
  await runConsole('site hikers dry');
  await page.waitFor(`!!(TT.hikersDbg && TT.hikersDbg().bag && TT.hikersDbg().kit.phase === 'hanging')`, { timeout: 10000 });
  await wait(400);
  await page.evaluate(`(() => {
    const T = window.TT;
    const d = T.hikersDbg();
    const [a, b] = d.rope[1];
    const P = T.player.position;
    const e = { x: P.x, y: P.y + 1.6, z: P.z };
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
    const dx = m.x - e.x, dy = m.y - e.y, dz = m.z - e.z, L = Math.hypot(dx, dy, dz) || 1;
    T.fireRoundDbg(e.x, e.y, e.z, dx / L, dy / L, dz / L, 20, 90, 0);
    for (let i = 0; i < 15; i++) T.stepProjectilesDbg(0.016);
  })()`);
  await page.waitFor(`TT.hikersDbg().kit.phase === 'ground'`, { timeout: 8000 });
  await wait(400);
  summary.hikersAudit.dryGround = await page.evaluate(`(() => {
    const T = window.TT;
    const d = T.hikersDbg();
    const gY = T.sampleHeight(d.bag.x, d.bag.z);
    T.player.position.set(d.bag.x + 1.6, T.sampleHeight(d.bag.x + 1.6, d.bag.z + 1.6), d.bag.z + 1.6);
    T.player.rotation.y = Math.atan2(-(d.bag.x - T.player.position.x), -(d.bag.z - T.player.position.z));
    return {
      phase: d.kit.phase,
      bag: d.bag,
      groundY: gY,
      bagMinusGroundY: +(d.bag.y - gY).toFixed(3),
      grabbable: d.grabbable,
      prompt: ((document.getElementById('kioskPrompt') || {}).textContent || '').trim(),
    };
  })()`);
  await wait(300);
  await page.screenshot(path.join(OUT_DIR, '07-hikers-dry-ground.png'));

  // =========================================================================
  // PART 2: FUEL DEPOT (~ site fuel)
  // =========================================================================
  console.log('=== Part 2: Fuel Depot (~ site fuel) ===');
  await runConsole('site fuel');
  await page.waitFor(`!!(TT.fuelDbg && TT.fuelDbg.props())`, { timeout: 10000 });
  await wait(600);

  summary.fuelAudit.atPump = await page.evaluate(`(() => {
    const T = window.TT;
    const F = T.fuelDbg;
    const pr = F.props();
    const run = F.run();
    const can = F.can();
    const pumpGroundY = pr && pr.pump ? T.sampleHeight(pr.pump.x, pr.pump.z) : null;
    const genGroundY = pr && pr.gen ? T.sampleHeight(pr.gen.x, pr.gen.z) : null;
    const canGroundY = can ? T.sampleHeight(can.x, can.z) : null;
    return {
      phase: run.phase,
      fill: run.fill,
      prompt: F.prompt(),
      kioskPrompt: ((document.getElementById('kioskPrompt') || {}).textContent || '').trim(),
      gunShownBeforeCarry: F.gunShown(),
      props: pr,
      canPos: can,
      pumpGroundY,
      genGroundY,
      canGroundY,
      reach: F.reach(),
    };
  })()`);
  await page.screenshot(path.join(OUT_DIR, '08-fuel-at-pump.png'));

  // Close-up shot of the fuel pump and jerrycan at the depot
  await page.evaluate(`(() => {
    const T = window.TT;
    const F = T.fuelDbg;
    const pr = F.props();
    if (pr && pr.pump) {
      T.camera.position.set(pr.pump.x + 2.0, T.sampleHeight(pr.pump.x, pr.pump.z) + 1.4, pr.pump.z + 2.0);
      T.camera.lookAt(pr.pump.x, T.sampleHeight(pr.pump.x, pr.pump.z) + 0.6, pr.pump.z);
      T.renderer.render(T.scene, T.camera);
    }
  })()`);
  await page.screenshot(path.join(OUT_DIR, '08b-fuel-pump-closeup.png'));

  // Hold E to fill the can: capture mid-fill (~1.5s) and then full ('carried')
  console.log('Holding E at the fuel pump...');
  await page.evaluate(`(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
  })()`);
  await wait(1400);
  summary.fuelAudit.filling = await page.evaluate(`(() => ({
    phase: TT.fuelDbg.run().phase,
    fill: +TT.fuelDbg.run().fill.toFixed(2),
    prompt: TT.fuelDbg.prompt(),
    kioskPrompt: ((document.getElementById('kioskPrompt') || {}).textContent || '').trim(),
  }))()`);
  await page.screenshot(path.join(OUT_DIR, '09-fuel-filling-hold-e.png'));

  await page.waitFor(`TT.fuelDbg.run().phase === 'carried'`, { timeout: 10000 });
  await page.evaluate(`(() => {
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
  })()`);
  await wait(400);
  await page.screenshot(path.join(OUT_DIR, '10-fuel-carried-overview.png'));

  // Close-up of the marine carrying the jerrycan (check hand pose, gun hidden, no floating/clipping)
  await page.evaluate(`(() => {
    const T = window.TT;
    const P = T.player.position;
    T.camera.position.set(P.x + 1.6, P.y + 1.2, P.z + 1.6);
    T.camera.lookAt(P.x, P.y + 0.85, P.z);
    T.renderer.render(T.scene, T.camera);
  })()`);
  await page.screenshot(path.join(OUT_DIR, '10b-fuel-carried-closeup.png'));

  // Measure FPS over 3.5 seconds while carrying the jerrycan and walking (generating the drip trail)
  console.log('Measuring FPS while carrying the jerrycan and walking...');
  summary.carryFps = await page.evaluate(`(async () => {
    const T = window.TT;
    const F = T.fuelDbg;
    T.clearZombies();
    const dripsBefore = F.drips();
    const frameIntervals = [];
    let lastT = performance.now();
    let walking = true;
    // Hold W to walk forward while carrying the can
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
    const startPos = { x: T.player.position.x, z: T.player.position.z };
    await new Promise((resolve) => {
      function tick(now) {
        const dt = now - lastT;
        lastT = now;
        if (dt > 0 && dt < 500) frameIntervals.push(dt);
        if (walking) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
      setTimeout(() => { walking = false; }, 3500);
    });
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }));
    const endPos = { x: T.player.position.x, z: T.player.position.z };
    const distWalked = Math.hypot(endPos.x - startPos.x, endPos.z - startPos.z);
    // If synthetic KeyW was not consumed by pointer-lock movement, also step position smoothly to ensure drip trail is laid
    if (distWalked < 4) {
      for (let i = 0; i < 24; i++) {
        T.player.position.x += 0.55;
        T.player.position.y = T.sampleHeight(T.player.position.x, T.player.position.z);
        await new Promise((r) => setTimeout(r, 40));
      }
    }
    const sorted = frameIntervals.slice().sort((a, b) => b - a); // descending frame time (worst first)
    const meanMs = frameIntervals.reduce((s, v) => s + v, 0) / (frameIntervals.length || 1);
    const meanFps = 1000 / meanMs;
    const p99Idx = Math.max(0, Math.floor(sorted.length * 0.01));
    const low1PctFps = sorted.length ? 1000 / sorted[p99Idx] : 0;
    const worstFps = sorted.length ? 1000 / sorted[0] : 0;
    return {
      framesSampled: frameIntervals.length,
      meanFps: +meanFps.toFixed(1),
      meanFrameMs: +meanMs.toFixed(2),
      low1PctFps: +low1PctFps.toFixed(1),
      worstFps: +worstFps.toFixed(1),
      slowFactor: F.slow(),
      fireBlocked: F.fireBlocked(),
      gunShownWhileCarrying: F.gunShown(),
      dripsBefore,
      dripsAfter: F.drips(),
      dripsAdded: F.drips() - dripsBefore,
      draws: T.renderer.info.render.calls,
      tris: T.renderer.info.render.triangles,
    };
  })()`);
  console.log('Carry FPS:', JSON.stringify(summary.carryFps));

  // Press E to put the jerrycan down and inspect the drip trail + dropped can + gun back in hand
  await page.evaluate(`(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
  })()`);
  await wait(80);
  await page.evaluate(`(() => {
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
  })()`);
  await wait(400);

  // Step 1.1m back so prompt shows "E Pick up..." and both the dropped can and drip trail are visible
  summary.fuelAudit.putDownAndDrips = await page.evaluate(`(() => {
    const T = window.TT;
    const F = T.fuelDbg;
    const cp = F.can();
    if (cp) {
      T.player.position.set(cp.x - 1.0, T.sampleHeight(cp.x - 1.0, cp.z + 0.8), cp.z + 0.8);
      T.player.rotation.y = Math.atan2(-(cp.x - T.player.position.x), -(cp.z - T.player.position.z));
    }
    const gY = cp ? T.sampleHeight(cp.x, cp.z) : null;
    return {
      phase: F.run().phase,
      slowFactor: F.slow(),
      fireBlocked: F.fireBlocked(),
      gunShownWhenDown: F.gunShown(),
      canPos: cp,
      groundY: gY,
      canMinusGroundY: cp && gY !== null ? +(cp.y - gY).toFixed(3) : null,
      dripsCount: F.drips(),
      prompt: F.prompt(),
      kioskPrompt: ((document.getElementById('kioskPrompt') || {}).textContent || '').trim(),
    };
  })()`);
  await wait(300);
  await page.screenshot(path.join(OUT_DIR, '11-fuel-put-down-and-drip-trail.png'));

  // Close-up of the dropped jerrycan and fuel drip trail on the ground
  await page.evaluate(`(() => {
    const T = window.TT;
    const cp = T.fuelDbg.can();
    if (cp) {
      T.camera.position.set(cp.x + 1.5, cp.y + 1.2, cp.z + 1.8);
      T.camera.lookAt(cp.x - 1.2, cp.y, cp.z);
      T.renderer.render(T.scene, T.camera);
    }
  })()`);
  await page.screenshot(path.join(OUT_DIR, '11b-fuel-drip-trail-closeup.png'));

  // Pick the jerrycan back up with E, then set it off with fire!
  await page.evaluate(`(() => {
    const T = window.TT;
    const cp = T.fuelDbg.can();
    T.player.position.set(cp.x + 0.8, cp.y, cp.z);
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
  })()`);
  await wait(80);
  await page.evaluate(`(() => {
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
  })()`);
  await wait(300);

  console.log('Triggering fire on carried jerrycan...');
  summary.fuelAudit.fireExplosion = await page.evaluate(`(() => {
    const T = window.TT;
    const F = T.fuelDbg;
    const beforePhase = F.run().phase;
    // Spawn and ignite a zombie right next to the marine (or apply fire damage) to set off the can
    const P = T.player.position;
    const zb = T.spawnZombie(P.x + 0.5, P.z + 0.2, 'shambler', true, true);
    if (zb) T.igniteZombie(zb, 4);
    T.damagePlayer(1, 'fire');
    return { beforePhase };
  })()`);
  await wait(250);
  summary.fuelAudit.fireExplosionAfter = await page.evaluate(`(() => {
    const T = window.TT;
    const F = T.fuelDbg;
    return {
      phaseAfterFire: F.run().phase,
      booms: F.run().booms,
      lastBoom: F.lastBoom(),
      burningPools: F.pools(),
    };
  })()`);
  await page.screenshot(path.join(OUT_DIR, '12-fuel-fire-sets-it-off.png'));
  await page.evaluate(`TT.clearZombies()`);

  // Finally, test pouring the jerrycan into the HQ generator (`~ site fuel carry`, then `~ site fuel hq`)
  console.log('Testing HQ generator pour...');
  await runConsole('site fuel carry');
  await wait(250);
  await runConsole('site fuel hq');
  await wait(300);
  summary.fuelAudit.atHqGenerator = await page.evaluate(`(() => {
    const T = window.TT;
    const F = T.fuelDbg;
    const g = F.props().gen;
    const gx = g.x + 1.35, gz = g.z;
    T.player.position.set(gx, T.sampleHeight(gx, gz) + 0.05, gz);
    T.player.rotation.y = Math.atan2(-(g.x - gx), -(g.z - gz));
    return {
      genPos: g,
      genGroundY: T.sampleHeight(g.x, g.z),
      phase: F.run().phase,
      prompt: F.prompt(),
      kioskPrompt: ((document.getElementById('kioskPrompt') || {}).textContent || '').trim(),
    };
  })()`);
  await wait(300);
  await page.screenshot(path.join(OUT_DIR, '13-fuel-at-hq-generator.png'));

  // Close-up of the HQ generator and marine holding the jerrycan
  await page.evaluate(`(() => {
    const T = window.TT;
    const g = T.fuelDbg.props().gen;
    const gY = T.sampleHeight(g.x, g.z);
    T.camera.position.set(g.x + 2.4, gY + 1.6, g.z + 2.2);
    T.camera.lookAt(g.x, gY + 0.6, g.z);
    T.renderer.render(T.scene, T.camera);
  })()`);
  await page.screenshot(path.join(OUT_DIR, '13b-fuel-hq-generator-closeup.png'));

  // Press E to pour into the generator
  await page.evaluate(`(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
  })()`);
  await wait(80);
  await page.evaluate(`(() => {
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true }));
  })()`);
  await wait(600);
  summary.fuelAudit.afterPour = await page.evaluate(`(() => {
    const F = TT.fuelDbg;
    return {
      phase: F.run().phase,
      done: F.run().done,
      siteState: F.site(),
      reach: F.reach(),
      gunShownAfterPour: F.gunShown(),
      bannerTitle: ((document.getElementById('bannerTitle') || {}).textContent || '').trim(),
      bannerSub: ((document.getElementById('bannerSub') || {}).textContent || '').trim(),
    };
  })()`);
  await page.screenshot(path.join(OUT_DIR, '14-fuel-poured-complete.png'));

  summary.consoleErrors = page.console.filter((c) => c.type === 'error');
  summary.pageErrors = page.errors.slice();
  try { await page.send('Page.close', {}); } catch { /* ignore */ }
} finally {
  fs.writeFileSync(path.join(OUT_DIR, 'ag99-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  await browser.close?.();
  server.close?.();
}
console.log('=== AG-99 visual inspection complete ===');
