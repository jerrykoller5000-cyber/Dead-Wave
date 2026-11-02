// qa/2026-11-02-AG-193/run-ag193-review.mjs
// AG-193: Comprehensive GPU visual, ergonomic, geometric, and lighting QA review of
// CL-281 Stage 2 Wasp SMG (Uzi) viewmodel poses on NVIDIA RTX 5080 WebGPU hardware.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Must run under the shared game-test slot');

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT = path.join(ROOT, 'qa', '2026-11-02-AG-193');
fs.mkdirSync(OUT, { recursive: true });

const WIDTH = 1280;
const HEIGHT = 720;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const telemetry = {
  task: 'AG-193',
  agent: 'antigravity',
  weapon: 'uzi',
  timestamp: new Date().toISOString(),
  backend: null,
  shots: {},
  reloadCycle: {},
  ergonomics: {},
  depthTest: {},
  baselineComparison: {},
  scores: {}
};

console.log('Starting server and browser for AG-193 Wasp GPU Review...');
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: [`--window-size=${WIDTH},${HEIGHT}`] });

try {
  const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
  console.log('Navigating to game with WebGPU & debug=1...');
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!await page.waitFor('!!window.TT', { timeout: 600000 })) throw new Error('TT did not boot');
  await page.evaluate('DWOpening?.dismissForTesting?.()');
  await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

  console.log('Starting match and equipping Wasp (uzi)...');
  await page.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'AG193');
    T.clearZombies && T.clearZombies();
    T.setHp(1e5);
    T.grantAllWeapons();
    T.setWorldTime(0.50);
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'uzi'; i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf('uzi'));
      await new Promise(r => setTimeout(r, 150));
    }
    if (T.getCurrentWeapon() !== 'uzi') throw new Error('Failed to select uzi');
    T.setViewFirstDbg(true);
    await new Promise(r => setTimeout(r, 2500));
  })()`);

  // Define in-page telemetry collector
  await page.evaluate(`
    window.agCollectTelemetry = () => {
      const T = TT, E = T.THREE || window.THREE;
      const vm = T.viewmodelDbg();
      if (!vm || !vm.info.active) return { active: false };

      const inView = (o, p) => {
        o.updateWorldMatrix(true, false);
        vm.space.updateMatrixWorld(true);
        return p.clone().applyMatrix4(o.matrixWorld).applyMatrix4(vm.space.matrixWorld.clone().invert());
      };

      const minVisible = () => {
        let closest = Infinity, seen = 0;
        vm.root.traverse((o) => {
          const pa = o.isMesh && o.geometry?.attributes?.position;
          if (!pa) return;
          for (let q = o; q && q !== vm.root; q = q.parent) if (!q.visible) return;
          o.updateWorldMatrix(true, false);
          vm.space.updateMatrixWorld(true);
          const mat = vm.space.matrixWorld.clone().invert().multiply(o.matrixWorld);
          const v = new E.Vector3();
          for (let i = 0; i < pa.count; i += Math.max(1, Math.floor(pa.count / 150))) {
            v.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(mat);
            const n = vm.ndc(v);
            if (n.d > 0 && Math.abs(n.x) < 1.02 && Math.abs(n.y) < 1.02) {
              closest = Math.min(closest, n.d);
              seen++;
            }
          }
        });
        return { closest, seen };
      };

      const hipGripView = vm.viewPoint(new E.Vector3(0, -0.088, -0.027));
      const hipGripNdc = vm.ndc(hipGripView);

      const sightRearView = vm.viewPoint(new E.Vector3(0, 0.156, -0.25));
      const sightFrontView = vm.viewPoint(new E.Vector3(0, 0.156, 0.25));
      const sightRearNdc = vm.ndc(sightRearView);
      const sightFrontNdc = vm.ndc(sightFrontView);

      const wr = vm.wrists, A = vm.arms;
      const sockErr = (arm, W) => {
        const p = inView(arm.wrist, new E.Vector3());
        return p.distanceTo(W.p);
      };
      const eR = A && wr ? sockErr(A.r, wr.r) : 0;
      const eL = A && wr ? sockErr(A.l, wr.l) : 0;

      const bend = (arm) => {
        if (!arm || !arm.root || !arm.wrist) return 0;
        const a = new E.Vector3(0, 1, 0).applyQuaternion(arm.root.quaternion);
        const b = new E.Vector3(0, 1, 0).applyQuaternion(arm.root.quaternion.clone().multiply(arm.wrist.quaternion));
        return Math.acos(Math.max(-1, Math.min(1, a.dot(b))));
      };
      const bR = A ? bend(A.r) : 0;
      const bL = A ? bend(A.l) : 0;

      const endOn = (arm) => {
        if (!arm || !arm.root || !arm.wrist) return { ang: 0, ey: 0, ex: 0 };
        const w = inView(arm.wrist, new E.Vector3());
        const e = inView(arm.root, new E.Vector3());
        const d = e.clone().sub(w).normalize();
        const toEye = w.clone().multiplyScalar(-1).normalize();
        return {
          ang: Math.acos(Math.max(-1, Math.min(1, d.dot(toEye)))),
          ey: vm.ndc(e).y,
          ex: vm.ndc(e).x
        };
      };
      const fr = A ? endOn(A.r) : { ang: 0, ey: 0, ex: 0 };
      const fl = A ? endOn(A.l) : { ang: 0, ey: 0, ex: 0 };

      return {
        backend: T.getRendererBackend(),
        key: vm.info.key,
        active: vm.info.active,
        raise: vm.info.raise,
        ads: vm.info.ads,
        magState: vm.info.magState,
        handPlace: vm.info.handPlace,
        reloadU: vm.info.reloadU,
        wristMax: vm.info.wristMax,
        wrist: { ...vm.info.wrist },
        sockErr: { r: eR, l: eL },
        bend: { r: bR, l: bL },
        forearm: { r: fr, l: fl },
        hipGripNdc: { x: hipGripNdc.x, y: hipGripNdc.y },
        sightRearNdc: { x: sightRearNdc.x, y: sightRearNdc.y },
        sightFrontNdc: { x: sightFrontNdc.x, y: sightFrontNdc.y },
        near: minVisible()
      };
    };
  `);

  const capture = async (name, setupJs, waitMs = 1500) => {
    if (setupJs) await page.evaluate(`(async () => { const T = TT; ${setupJs}; })()`);
    await sleep(waitMs);
    const shotPath = path.join(OUT, `${name}.png`);
    await page.screenshot(shotPath);
    const data = await page.evaluate('window.agCollectTelemetry()');
    telemetry.shots[name] = data;
    console.log(`Captured ${name}.png: active=${data.active}, ads=${data.ads?.toFixed(2)}, place=${data.handPlace}, mag=${data.magState}`);
    return data;
  };

  // =========================================================================
  // 1. HIP CARRY (Standard Daylight)
  // =========================================================================
  console.log('\n--- 1. Hip Carry ---');
  await capture('1-wasp-hip', `
    TT.setWorldTime(0.50);
    TT.setZoomHeldDbg(false);
    TT.setOtsAimDbg(0, 0);
    if (TT.weather) { TT.weather.overcast = 0; TT.weather.raining = false; }
    if (TT.flashlight) TT.flashlight.intensity = 0;
  `, 2000);

  // =========================================================================
  // 2. ADS DOWN SIGHTS (Jerry J4 Sight Distance Check)
  // =========================================================================
  console.log('\n--- 2. ADS Down Sights ---');
  await capture('2-wasp-ads', `
    TT.setZoomHeldDbg(true);
  `, 3000);

  // =========================================================================
  // 3. RETURN TO HIP
  // =========================================================================
  console.log('\n--- 3. Return to Hip ---');
  await capture('3-wasp-hip-return', `
    TT.setZoomHeldDbg(false);
  `, 2500);

  // =========================================================================
  // 4. RELOAD BEATS 1-4 (Jerry J5 Near-Plane / Camera Crossing Check)
  // =========================================================================
  console.log('\n--- 4. Reload Beats 1–4 ---');

  // Beat 1: Grab (hand reaches to well, cups mag base)
  await page.evaluate(`
    TT.setAmmoDbg('uzi', 2);
    TT.startReload();
    TT.reloadClipDbg.hold(0.10);
  `);
  await capture('4-wasp-reload-grab', '', 1000);

  // Beat 2: Pouch (support hand and magazine lowered to pouch)
  await page.evaluate(`
    TT.reloadClipDbg.hold(0.34);
  `);
  await capture('5-wasp-reload-pouch', '', 1000);

  // Beat 3: Seat (fresh magazine seated home into grip well)
  await page.evaluate(`
    TT.reloadClipDbg.hold(0.58);
  `);
  await capture('6-wasp-reload-seat', '', 1000);

  // Beat 4: Work (support hand rises to top charging knob and racks bolt)
  await page.evaluate(`
    TT.reloadClipDbg.hold(0.74);
  `);
  await capture('7-wasp-reload-work', '', 1000);

  // Release reload hold and verify completion
  console.log('\n--- Releasing reload hold and verifying recovery ---');
  await page.evaluate(`
    TT.reloadClipDbg.hold(null);
  `);
  await sleep(1500);
  const reloadFinished = await page.evaluate(`!TT.isReloading()`);
  telemetry.reloadCycle.finished = reloadFinished;
  console.log(`Reload completed cleanly: ${reloadFinished}`);

  // =========================================================================
  // 5. ART PROTOCOL: FOUR LIGHTING MODELS
  // =========================================================================
  console.log('\n--- 5. Four Lighting Models Art Protocol ---');

  // Noon
  await capture('8-art-noon', `
    TT.setWorldTime(0.50);
    if (TT.weather) { TT.weather.overcast = 0; TT.weather.raining = false; TT.weather.intensity = 0; }
    if (TT.fogNightDbg) TT.fogNightDbg.force(false);
    if (TT.flashlight) TT.flashlight.intensity = 0;
  `, 1200);

  // Dusk
  await capture('9-art-dusk', `
    TT.setWorldTime(0.74);
    if (TT.weather) { TT.weather.overcast = 0; TT.weather.raining = false; TT.weather.intensity = 0; }
    if (TT.fogNightDbg) TT.fogNightDbg.force(false);
    if (TT.flashlight) TT.flashlight.intensity = 0;
  `, 1200);

  // Overcast (Storm)
  await capture('10-art-overcast', `
    TT.setWorldTime(0.50);
    if (TT.weather) { TT.weather.overcast = 1.0; TT.weather.raining = true; TT.weather.intensity = 0.85; }
    if (TT.fogNightDbg) TT.fogNightDbg.force(false);
    if (TT.flashlight) TT.flashlight.intensity = 0;
  `, 1200);

  // Night (Night Ops + Flashlight)
  await capture('11-art-night', `
    if (TT.runDevCommand) TT.runDevCommand('night ops');
    TT.setWorldTime(0.02);
    if (TT.fogNightDbg) { TT.fogNightDbg.force(true); TT.fogNightDbg.apply(10.0); }
    if (TT.weather) { TT.weather.overcast = 0; TT.weather.raining = false; }
    if (TT.flashlight) TT.flashlight.intensity = 1.0;
  `, 1200);

  // =========================================================================
  // 6. MOTION DYNAMICS & PITCH LAG CHECKS
  // =========================================================================
  console.log('\n--- 6. Motion Dynamics & Pitch Lag ---');

  // Reset to Noon
  await page.evaluate(`
    TT.setWorldTime(0.50);
    if (TT.weather) { TT.weather.overcast = 0; TT.weather.raining = false; }
    if (TT.flashlight) TT.flashlight.intensity = 0;
  `);

  // Look down pitch (-0.9 rad)
  await capture('12-motion-look-down', `
    TT.setOtsAimDbg(null, -0.9);
  `, 1500);

  // Look up pitch (+0.5 rad)
  await capture('13-motion-look-up', `
    TT.setOtsAimDbg(null, 0.5);
  `, 1500);

  // Yaw Turn Sway
  await capture('14-motion-turn-sway', `
    TT.setOtsAimDbg(null, 0);
    for (let i = 0; i < 6; i++) {
      TT.otsLook && TT.otsLook(-160, 0);
      await new Promise(r => setTimeout(r, 30));
    }
  `, 60);

  // =========================================================================
  // 7. DEPTH BUFFER & HQ WALL CLIPPING TEST
  // =========================================================================
  console.log('\n--- 7. Depth Range & HQ Wall Test ---');

  // Reset aim and walk straight into HQ South Wall at (0, -3.17, -5.42)
  await page.evaluate(`
    TT.setOtsAimDbg(0, 0);
    TT.marine.position.set(0, -3.17, -5.42);
    TT.marine.rotation.set(0, Math.PI, 0);
  `);
  await capture('15-wall-hip', `
    TT.setZoomHeldDbg(false);
  `, 1500);

  await capture('16-wall-ads', `
    TT.setZoomHeldDbg(true);
  `, 2500);

  await page.evaluate('TT.setZoomHeldDbg(false)');

  // Save telemetry collected so far
  telemetry.backend = telemetry.shots['1-wasp-hip']?.backend;

} finally {
  await browser.close();
  await server.close();
}

// =========================================================================
// 8. BASELINE COMPARISON: OLD FIRST PERSON (?vm=0)
// =========================================================================
console.log('\n--- 8. Baseline Comparison: Old First Person (?vm=0) ---');
const serverOld = await serve(ROOT, 0);
const browserOld = await launch({ headless: false, args: [`--window-size=${WIDTH},${HEIGHT}`] });

try {
  const pageOld = await browserOld.newPage({ width: WIDTH, height: HEIGHT });
  await pageOld.goto(`${serverOld.origin}/index.html?debug=1&raf=timer&vm=0`, { timeout: 300000 });
  if (!await pageOld.waitFor('!!window.TT', { timeout: 600000 })) throw new Error('TT did not boot on ?vm=0');
  await pageOld.evaluate('DWOpening?.dismissForTesting?.()');
  await pageOld.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 });
  await pageOld.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

  await pageOld.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'VM0');
    T.clearZombies && T.clearZombies();
    T.setHp(1e5);
    T.grantAllWeapons();
    T.setWorldTime(0.50);
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'uzi'; i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf('uzi'));
      await new Promise(r => setTimeout(r, 150));
    }
    T.setViewFirstDbg(true);
    await new Promise(r => setTimeout(r, 2500));
  })()`);

  // Old Hip
  await sleep(1500);
  await pageOld.screenshot(path.join(OUT, '17-old-hip.png'));
  console.log('Captured 17-old-hip.png');

  // Old ADS
  await pageOld.evaluate('TT.setZoomHeldDbg(true)');
  await sleep(2500);
  await pageOld.screenshot(path.join(OUT, '18-old-ads.png'));
  console.log('Captured 18-old-ads.png');

  // Old Wall Hip
  await pageOld.evaluate(`
    TT.setZoomHeldDbg(false);
    TT.marine.position.set(0, -3.17, -5.42);
    TT.marine.rotation.set(0, Math.PI, 0);
  `);
  await sleep(1500);
  await pageOld.screenshot(path.join(OUT, '19-old-wall-hip.png'));
  console.log('Captured 19-old-wall-hip.png');

} finally {
  await browserOld.close();
  await serverOld.close();
}

// Write telemetry JSON
fs.writeFileSync(path.join(OUT, 'ag193-telemetry.json'), JSON.stringify(telemetry, null, 2));
console.log('\nTelemetry saved to qa/2026-11-02-AG-193/ag193-telemetry.json');
console.log('All 19 captures complete!');
