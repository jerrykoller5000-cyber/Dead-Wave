// qa/2026-10-31-AG-168/run-ag168-rest.mjs
// Completes AG-168 GPU verification in a single game-test slot session (--jobs 1):
// 1. Rerun realtest t284 (post-GB-262)
// 2. Capture wall-clipping check (vm-wall-hip, vm-wall-ads, old-wall-hip),
//    HQ roof shade vs outdoor sun check (vm-hq-roof-hip, vm-hq-roof-ads, vm-outdoor-sun-hip),
//    Night 20 + NVG shots (vm-night20-hip, vm-night20-ads, vm-night20-nvg-hip, vm-night20-nvg-ads),
//    plus mesh diagnostics for receiveShadow and stowed carryRig visibility.
// 3. Run 4 x 30s Night-20 --gfx high --prof-all benchmarks:
//    - 3p-default (?debug=1)
//    - 3p-vm0 (?debug=1&vm=0)
//    - 1p-pistol-default (?debug=1, first person with pistol)
//    - 1p-pistol-vm0 (?debug=1&vm=0, first person with pistol)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const ROOT = path.resolve(OUT, '..', '..');
const TESTS = path.join(ROOT, 'tools', 'tests');
const W = 1280, H = 720;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (nums) => {
  if (!nums.length) return 0;
  const s = nums.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', `--window-size=${W},${H}`, '--enable-precise-memory-info']
});

const summary = {
  t284: null,
  diagnostics: null,
  shots: [],
  benches: {}
};

async function openGamePage(query = '', rafTimer = false) {
  const page = await browser.newPage({ width: W, height: H });
  const url = `${server.origin}/index.html?debug=1${rafTimer ? '&raf=timer' : ''}${query}`;
  await page.goto(url, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) {
    throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
  }
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
    })()`);
    await wait(200);
  }
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  return page;
}

try {
  // --- 1. Run t284 on real renderer (post-GB-262) ---
  console.log('=== [1/3] Running t284 on real renderer ===');
  {
    const page = await openGamePage('', true);
    await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));
    const code = fs.readFileSync(path.join(TESTS, 't284.js'), 'utf8');
    const t0 = Date.now();
    const out = await page.evaluate(code, 300000);
    const lines = String(typeof out === 'string' ? out : JSON.stringify(out)).split('\n').map((l) => l.trim()).filter(Boolean);
    const pass = lines.filter((l) => l.startsWith('PASS')).length;
    const fail = lines.filter((l) => l.startsWith('FAIL')).length;
    summary.t284 = { pass, fail, elapsedSec: +((Date.now() - t0) / 1000).toFixed(1), lines };
    console.log(`t284: ${pass} pass, ${fail} fail (${summary.t284.elapsedSec}s)`);
    for (const l of lines) console.log('  ', l);
    await page.send('Page.close', {});
  }

  // --- 2. Capture Wall, HQ Roof Shade vs Sun, and Night 20 + NVG shots ---
  console.log('=== [2/3] Capturing Wall, HQ Roof Shade, Outdoor Sun, and Night 20 / NVG shots ===');
  {
    const page = await openGamePage('', true);
    await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));
    await page.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'AG168');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.grantAllWeapons();
      if (T.setWorldTime) T.setWorldTime(0.42);
      const w = 'pistol';
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) {
        T.setWeapon(T.WEAPON_ORDER.indexOf(w));
        await new Promise((r) => setTimeout(r, 150));
      }
      T.setViewFirstDbg(true);
      await new Promise((r) => setTimeout(r, 3500));
      return 1;
    })()`, 300000);

    const takeShot = async (p, name, js = '', settle = 2000) => {
      if (js) await p.evaluate(`(async () => { const T = TT; ${js}; return 1; })()`, 300000);
      await wait(settle);
      const meta = await p.evaluate(`(() => {
        const v = TT.viewmodelDbg && TT.viewmodelDbg();
        const pos = TT.player ? { x: +TT.player.position.x.toFixed(2), y: +TT.player.position.y.toFixed(2), z: +TT.player.position.z.toFixed(2) } : null;
        return {
          pos,
          vm: v ? { active: v.info.active, raise: +v.info.raise.toFixed(2), ads: +v.info.ads.toFixed(2), mag: v.info.magState, hand: v.info.handPlace, wristR: +v.info.wrist.r.toFixed(3), wristL: +v.info.wrist.l.toFixed(3) } : null
        };
      })()`);
      const file = path.join(OUT, name + '.png');
      await p.screenshot(file);
      console.log('  shot:', name.padEnd(22), JSON.stringify(meta));
      summary.shots.push({ name, file: path.relative(ROOT, file), ...meta });
    };

    // Collect diagnostics on viewmodel meshes, receiveShadow, and stowed carryRig meshes
    summary.diagnostics = await page.evaluate(`(() => {
      const v = TT.viewmodelDbg && TT.viewmodelDbg();
      if (!v) return null;
      const gunMeshes = [];
      v.gun.root.traverse((o) => {
        if (o.isMesh) gunMeshes.push({ name: o.name, receiveShadow: o.receiveShadow, castShadow: o.castShadow, mat: o.material ? o.material.name : '' });
      });
      const armMeshes = [];
      for (const side of ['r', 'l']) {
        v.arms[side].root.traverse((o) => {
          if (o.isMesh && o.visible) armMeshes.push({ side, name: o.name, receiveShadow: o.receiveShadow, castShadow: o.castShadow });
        });
      }
      // Check visible meshes on marine that are NOT eye-hidden
      const marineVisibleNotHidden = [];
      TT.marine.traverse((o) => {
        if (!o.isMesh) return;
        let vis = true;
        for (let p = o; p; p = p.parent) if (!p.visible) { vis = false; break; }
        if (!vis) return;
        if (o.userData && o.userData.vmEyeHide) return;
        const chain = [];
        for (let p = o; p && p !== TT.marine; p = p.parent) chain.push(p.name || p.type);
        marineVisibleNotHidden.push(chain.reverse().join('/'));
      });
      return {
        hack: v.info.hack,
        filter: v.info.filter,
        gunNodes: v.gun.nodes,
        socketsR: v.sockets.r,
        socketsL: v.sockets.l,
        wristsView: {
          rPos: v.wrists.r.p,
          rYDir: new TT.THREE.Vector3(0, 1, 0).applyQuaternion(v.wrists.r.q),
          lPos: v.wrists.l.p,
          lYDir: new TT.THREE.Vector3(0, 1, 0).applyQuaternion(v.wrists.l.q),
          armRElbowRootPos: v.arms.r.root.position,
          armRYDir: new TT.THREE.Vector3(0, 1, 0).applyQuaternion(v.arms.r.root.quaternion),
          armLElbowRootPos: v.arms.l.root.position,
          armLYDir: new TT.THREE.Vector3(0, 1, 0).applyQuaternion(v.arms.l.root.quaternion)
        },
        gunMeshesReceiveShadow: gunMeshes.filter((m) => m.receiveShadow).length + '/' + gunMeshes.length,
        gunMeshesSample: gunMeshes.slice(0, 10),
        armMeshesSample: armMeshes,
        marineVisibleNotHiddenCount: marineVisibleNotHidden.length,
        marineVisibleNotHiddenSample: marineVisibleNotHidden.slice(0, 40)
      };
    })()`);
    console.log('  diagnostics collected: gunMeshesReceiveShadow =', summary.diagnostics?.gunMeshesReceiveShadow);

    // 2a. Under HQ roof by day (hip and ADS)
    await takeShot(page, 'vm-hq-roof-hip', 'T.setZoomHeldDbg(false); T.setOtsAimDbg(0, 0);', 1500);
    await takeShot(page, 'vm-hq-roof-ads', 'T.setZoomHeldDbg(true);', 2500);
    await page.evaluate('TT.setZoomHeldDbg(false)');
    await wait(2000);

    // 2b. Walk marine right into the HQ south wall (z increases toward south wall at z ~ 3.25)
    await takeShot(page, 'vm-wall-hip', `
      T.setOtsAimDbg(0, 0);
      for (let i = 0; i < 60; i++) {
        T.stepFrame(1/60);
        T.player.position.z += 0.08;
        if (T.resolveHardBuildCollisions) T.resolveHardBuildCollisions(T.player.position, T.PLAYER_RADIUS_DBG || 0.38);
      }
    `, 1500);
    await takeShot(page, 'vm-wall-ads', 'T.setZoomHeldDbg(true);', 2500);
    const wallPos = await page.evaluate('({ x: TT.player.position.x, y: TT.player.position.y, z: TT.player.position.z })');
    await page.evaluate('TT.setZoomHeldDbg(false)');
    await wait(1500);

    // 2c. Outdoor in direct sunlight by day (move outside HQ cabin to z = 10.0, facing south yaw=0)
    await takeShot(page, 'vm-outdoor-sun-hip', `
      T.player.position.set(0, T.sampleHeight(0, 10), 10);
      T.setOtsAimDbg(0, 0);
    `, 2000);

    // 2d. Night 20 (without NVG and with NVG, both hip and ADS)
    await takeShot(page, 'vm-night20-hip', `
      T.runDevCommand('godmode');
      T.devJumpToNight(20, true);
      T.clearZombies && T.clearZombies();
      T.player.position.set(0, T.sampleHeight(0, 10), 10);
      T.setOtsAimDbg(0, 0);
      T.setZoomHeldDbg(false);
    `, 4000);
    // Clear any newly spawned zombies before screenshot
    await takeShot(page, 'vm-night20-hip', 'T.clearZombies && T.clearZombies();', 500);
    await takeShot(page, 'vm-night20-ads', 'T.clearZombies && T.clearZombies(); T.setZoomHeldDbg(true);', 2500);

    // Turn on NVG goggles
    await takeShot(page, 'vm-night20-nvg-ads', `
      T.clearZombies && T.clearZombies();
      T.setGearDbg('nvg');
      T.toggleNvgDbg();
    `, 1500);
    await takeShot(page, 'vm-night20-nvg-hip', 'T.clearZombies && T.clearZombies(); T.setZoomHeldDbg(false);', 2500);

    await page.send('Page.close', {});

    // 2e. Also capture old-wall-hip (&vm=0) at the exact same wall position for comparison
    const oldPage = await openGamePage('&vm=0', true);
    await oldPage.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));
    await oldPage.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'AG168OLD');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.grantAllWeapons();
      if (T.setWorldTime) T.setWorldTime(0.42);
      const w = 'pistol';
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) {
        T.setWeapon(T.WEAPON_ORDER.indexOf(w));
        await new Promise((r) => setTimeout(r, 150));
      }
      T.setViewFirstDbg(true);
      await new Promise((r) => setTimeout(r, 3500));
      return 1;
    })()`, 300000);
    await takeShot(oldPage, 'old-wall-hip', `
      T.setOtsAimDbg(0, 0);
      T.player.position.set(${wallPos.x}, ${wallPos.y}, ${wallPos.z});
    `, 1500);
    await takeShot(oldPage, 'old-wall-ads', 'T.setZoomHeldDbg(true);', 2500);
    await oldPage.send('Page.close', {});
  }

  // --- 3. Run the 4 Night-20 --gfx high --prof-all 30s benchmarks ---
  console.log('=== [3/3] Running 4 x 30s Night-20 --gfx high --prof benchmarks ===');
  const SAMPLE_JS = `(() => {
    const read = () => {
      const info = (TT.renderer && TT.renderer.info && TT.renderer.info.render) || {};
      const draws = info.drawCalls != null ? info.drawCalls : (info.calls || 0);
      return { draws, triangles: info.triangles || 0 };
    };
    let best = read();
    const again = read();
    if (again.draws > best.draws) best = again;
    const snap = TT.perfSnapshot() || { fps: 0, low: 0, worst: 0, hitches: 0, frames: 0 };
    const P = TT.profDbg;
    const prof = P && P.on ? { frame: P.frame, t: Object.assign({}, P.t) } : null;
    return Object.assign({}, snap, best, { prof });
  })()`;

  const ADVANCE_JS = `(() => {
    const st = () => TT.getWaveDirectorState();
    const up = () => (TT.zombies || []).filter((z) => z.alive && !z.dying).length;
    const cap = TT.MAX_ZOMBIES || 48;
    let steps = 0;
    while (steps++ < 250) {
      const pc = st().pace;
      const onLast = !!(pc && pc.pushes > 0 && pc.push === pc.pushes - 1 && !pc.inLull);
      if (onLast) {
        if (up() >= cap) break;
        if (pc.left <= 0 && up() > 0) break;
        TT.spawnWaveBatch(0.25);
        continue;
      }
      if (!pc || pc.inLull || up() > 6) TT.clearZombies();
      TT.spawnWaveBatch(0.5);
    }
    const pc = st().pace;
    const onLast = !!(pc && pc.pushes > 0 && pc.push === pc.pushes - 1 && !pc.inLull);
    const out = up() >= cap || (pc && pc.left <= 0 && up() > 0);
    return { done: onLast && out, day: st().day, phase: st().phase, push: pc ? pc.push : null, pushes: pc ? pc.pushes : null, zombies: up() };
  })()`;

  async function runBench(label, query, firstPersonPistol) {
    console.log(`--- Bench [${label}] (query="${query}", fp=${firstPersonPistol}) ---`);
    const page = await openGamePage(query, false);
    // Apply High preset
    const applied = await page.evaluate(`(() => {
      TT.applyGraphicsPreset('high');
      return TT.getGfx();
    })()`);
    if (applied !== 'high') throw new Error('Failed to apply high preset: ' + applied);

    // Start match
    await page.evaluate(`(() => {
      const name = document.getElementById('playerName');
      if (name) name.value = 'Bench';
      const play = document.getElementById('modeHunt');
      if (play) play.click();
    })()`);
    await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
    await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });

    if (firstPersonPistol) {
      await page.evaluate(`(async () => {
        const T = TT;
        T.grantAllWeapons();
        const w = 'pistol';
        for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) {
          T.setWeapon(T.WEAPON_ORDER.indexOf(w));
          await new Promise((r) => setTimeout(r, 120));
        }
        T.setViewFirstDbg(true);
        await new Promise((r) => setTimeout(r, 2500));
      })()`, 60000);
    }

    // Jump to Night 20 last push
    await page.evaluate(`(() => {
      TT.runDevCommand('godmode');
      TT.devJumpToNight(20, true);
    })()`);
    let state = null;
    for (let i = 0; i < 40; i++) {
      state = await page.evaluate(ADVANCE_JS, 180000);
      if (state.done) break;
    }
    await wait(3000);

    // Start profiler
    await page.evaluate(`(() => {
      const P = TT.profDbg;
      P.reset(); P.spikeMs = 25; P.on = true;
      const be = TT.renderer && TT.renderer.backend;
      const G = window.__benchGpu = { on: false, samples: [], busy: false };
      if (be && be.isWebGPUBackend && be.device && be.device.features && be.device.features.has('timestamp-query')) {
        be.trackTimestamp = true;
        G.on = true;
        const tickGpu = () => {
          if (!G.on) return;
          if (!G.busy) {
            G.busy = true;
            Promise.resolve(TT.renderer.resolveTimestampsAsync('render')).then((ms) => {
              if (typeof ms === 'number' && ms > 0 && ms < 1000) G.samples.push(ms);
            }).catch(() => {}).finally(() => { G.busy = false; });
          }
          requestAnimationFrame(tickGpu);
        };
        requestAnimationFrame(tickGpu);
      }
      TT.resetPerf();
    })()`);

    const SECONDS = 30;
    const t0 = Date.now();
    const windows = [];
    while (Date.now() - t0 < SECONDS * 1000) {
      const snap = await page.evaluate(SAMPLE_JS);
      if (snap) windows.push(snap);
      await wait(1000);
    }

    const got = await page.evaluate(`(() => {
      const P = TT.profDbg;
      const rep = P.report();
      P.on = false;
      const G = window.__benchGpu || { samples: [] };
      G.on = false;
      const be = TT.renderer && TT.renderer.backend;
      if (be && be.isWebGPUBackend) be.trackTimestamp = false;
      const vm = TT.viewmodelDbg && TT.viewmodelDbg();
      return {
        rep,
        gpu: G.samples.slice(),
        vmActive: vm ? vm.info.active : false,
        vmNodes: vm && vm.gun ? vm.gun.nodes : null,
        firstPerson: TT.fpDbg ? TT.fpDbg().first : false,
        weapon: TT.getCurrentWeapon ? TT.getCurrentWeapon() : null
      };
    })()`);

    const tail = windows.slice(-10);
    const paced = tail.filter((w) => w.fps > 0);
    const use = paced.length ? paced : tail;
    const avg = (k) => use.reduce((s, w) => s + (w[k] || 0), 0) / (use.length || 1);
    const final = windows.at(-1) || { worst: 0, hitches: 0 };
    const counted = (use.some((w) => w.draws > 0) ? use : windows).filter((w) => w.draws > 0);
    const drawRows = counted.length ? counted : use;
    const r1 = (n) => Math.round(n * 10) / 10;
    const r2 = (n) => Math.round(n * 100) / 100;
    const r3 = (n) => Math.round(n * 1000) / 1000;

    const phases = (got.rep && got.rep.phases) || [];
    const tickMs = phases.reduce((s, p) => s + p.avg, 0);
    const fps = r1(avg('fps'));
    const low = r1(avg('low'));
    const frameMs = fps > 0 ? 1000 / fps : 0;

    let last10 = null;
    const snaps = windows.filter((x) => x.prof);
    if (snaps.length > 10) {
      const base = snaps[snaps.length - 11].prof, end = snaps[snaps.length - 1].prof, n = end.frame - base.frame;
      if (n > 0) {
        const ph = Object.keys(end.t).map((k) => ({ k, avg: ((end.t[k] || 0) - (base.t[k] || 0)) / n })).sort((a, b) => b.avg - a.avg);
        const tick10 = ph.reduce((s, p) => s + p.avg, 0);
        const vm10 = ph.find((p) => p.k === 'viewmodel');
        last10 = {
          frames: n,
          frameMs: r2(frameMs),
          tickMs: r2(tick10),
          outsideMs: r2(frameMs - tick10),
          viewmodelMs: vm10 ? r3(vm10.avg) : 0,
          top: ph.slice(0, 15).map((p) => ({ k: p.k, avg: r3(p.avg) }))
        };
      }
    }
    const vmWhole = phases.find((p) => p.k === 'viewmodel');
    const res = {
      label,
      query,
      firstPerson: got.firstPerson,
      weapon: got.weapon,
      vmActive: got.vmActive,
      vmNodes: got.vmNodes,
      fps,
      low,
      worst: r1(final.worst || 0),
      hitches: final.hitches || 0,
      draws: Math.round(median(drawRows.map((w) => w.draws || 0))),
      triangles: Math.round(median(drawRows.map((w) => w.triangles || 0))),
      gpuMs: got.gpu.length ? r2(median(got.gpu)) : 'unavailable',
      wholeRun: {
        frames: got.rep ? got.rep.frames : 0,
        tickMs: r2(tickMs),
        viewmodelAvgMs: vmWhole ? r3(vmWhole.avg) : 0,
        viewmodelMaxMs: vmWhole ? r3(vmWhole.max) : 0
      },
      last10
    };
    summary.benches[label] = res;
    console.log(`  Result [${label}]: fps=${res.fps}, low=${res.low}, worst=${res.worst}ms, draws=${res.draws}, tris=${res.triangles}, vmActive=${res.vmActive}, viewmodelMark=${res.wholeRun.viewmodelAvgMs}ms (last10: ${res.last10?.viewmodelMs}ms, max: ${res.wholeRun.viewmodelMaxMs}ms)`);
    await page.send('Page.close', {});
  }

  await runBench('3p-default', '', false);
  await runBench('3p-vm0', '&vm=0', false);
  await runBench('1p-pistol-default', '', true);
  await runBench('1p-pistol-vm0', '&vm=0', true);

  fs.writeFileSync(path.join(OUT, 'ag168-results.json'), JSON.stringify(summary, null, 2));
  console.log('=== AG-168 GPU run complete! Saved qa/2026-10-31-AG-168/ag168-results.json ===');
} finally {
  await browser.close?.();
  await server.close?.();
}
process.exit(0);
