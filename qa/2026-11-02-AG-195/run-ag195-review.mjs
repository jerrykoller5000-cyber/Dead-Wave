// qa/2026-11-02-AG-195/run-ag195-review.mjs
// AG-195: Comprehensive GPU visual, ergonomic, geometric, and lighting QA review of
// CL-281 Stage 2 GW-4 (M4) and KR-7 (AK) viewmodel poses on NVIDIA RTX 5080 WebGPU hardware.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Must run under the shared game-test slot');

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT = path.join(ROOT, 'qa', '2026-11-02-AG-195');
fs.mkdirSync(OUT, { recursive: true });

const WIDTH = 1280;
const HEIGHT = 720;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const telemetry = {
  task: 'AG-195',
  agent: 'antigravity',
  weapons: ['m4', 'ak'],
  timestamp: new Date().toISOString(),
  backend: null,
  m4: { shots: {}, reloadCycle: {}, ergonomics: {}, sights: {}, depthTest: {} },
  ak: { shots: {}, reloadCycle: {}, ergonomics: {}, sights: {}, depthTest: {} }
};

console.log('Starting server and browser for AG-195 GW-4 & KR-7 GPU Review...');
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

  // Define in-page telemetry collector
  await page.evaluate(`
    window.agCollectTelemetry = (gunKey) => {
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

      // Gun sockets
      const gripSock = gunKey === 'm4' ? new E.Vector3(0, -0.106, -0.076) : new E.Vector3(0, -0.126, -0.095);
      const hipGripView = vm.viewPoint(gripSock);
      const hipGripNdc = vm.ndc(hipGripView);

      // Sights in gun space:
      // M4: holo dot at [0, 0.134, 0.0455]
      // AK: leaf rear at [0, 0.09, 0.18], front hooded post at [0, 0.088, 0.88]
      const rearPoint = gunKey === 'm4' ? new E.Vector3(0, 0.134, 0.0455) : new E.Vector3(0, 0.09, 0.18);
      const frontPoint = gunKey === 'm4' ? new E.Vector3(0, 0.134, 0.0455) : new E.Vector3(0, 0.088, 0.88);
      const sightRearView = vm.viewPoint(rearPoint);
      const sightFrontView = vm.viewPoint(frontPoint);
      const sightRearNdc = vm.ndc(sightRearView);
      const sightFrontNdc = vm.ndc(sightFrontView);

      const wr = vm.wrists, A = vm.arms;
      const sockErr = (arm, W) => {
        if (!arm || !arm.wrist || !W) return 0;
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

      // Stock check: is gun.userData.fpStock hidden on view gun?
      let stockVisibleInView = false;
      if (vm.gun && vm.gun.gun) {
        vm.gun.gun.traverse((o) => {
          if (o.name === 'fp-stock' && o.visible) stockVisibleInView = true;
        });
      }

      // Work node check
      const workNode = vm.gun && vm.gun.work;
      const workPos = workNode ? [workNode.position.x, workNode.position.y, workNode.position.z] : null;

      // Magazine rock check (for AK)
      const magNode = vm.gun && vm.gun.mag;
      const magRot = magNode ? [magNode.rotation.x, magNode.rotation.y, magNode.rotation.z] : null;

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
        stockVisibleInView,
        workPos,
        magRot,
        near: minVisible()
      };
    };
  `);

  const capture = async (gunKey, name, setupJs, waitMs = 1500) => {
    if (setupJs) await page.evaluate(`(async () => { const T = TT; ${setupJs}; })()`);
    await sleep(waitMs);
    const shotPath = path.join(OUT, `${gunKey}-${name}.png`);
    await page.screenshot(shotPath);
    const data = await page.evaluate(`window.agCollectTelemetry('${gunKey}')`);
    telemetry[gunKey].shots[name] = data;
    console.log(`Captured ${gunKey}-${name}.png: active=${data.active}, ads=${data.ads?.toFixed(2)}, place=${data.handPlace}, mag=${data.magState}`);
    return data;
  };

  for (const gunKey of ['m4', 'ak']) {
    console.log(`\n======================================================`);
    console.log(`EVALUATING WEAPON: ${gunKey.toUpperCase()} (CL-281 Stage 2)`);
    console.log(`======================================================`);

    await page.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'AG195-${gunKey}');
      T.clearZombies && T.clearZombies();
      T.setHp(1e5);
      T.grantAllWeapons();
      T.setWorldTime(0.50);
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== '${gunKey}'; i++) {
        T.setWeapon(T.WEAPON_ORDER.indexOf('${gunKey}'));
        await new Promise(r => setTimeout(r, 150));
      }
      if (T.getCurrentWeapon() !== '${gunKey}') throw new Error('Failed to select ${gunKey}');
      T.setViewFirstDbg(true);
      await new Promise(r => setTimeout(r, 2000));
    })()`);

    // 1. HIP CARRY
    console.log(`\n[${gunKey}] --- 1. Hip Carry ---`);
    await capture(gunKey, '1-hip', `
      TT.setWorldTime(0.50);
      TT.setZoomHeldDbg(false);
      TT.setOtsAimDbg(0, 0);
      if (TT.weather) { TT.weather.overcast = 0; TT.weather.raining = false; }
      if (TT.flashlight) TT.flashlight.intensity = 0;
    `, 2000);

    // 2. ADS DOWN SIGHTS (Jerry J4 Sight Distance Check)
    console.log(`\n[${gunKey}] --- 2. ADS Down Sights ---`);
    await capture(gunKey, '2-ads', `
      TT.setZoomHeldDbg(true);
    `, 2500);

    // 3. RETURN TO HIP
    console.log(`\n[${gunKey}] --- 3. Return to Hip ---`);
    await capture(gunKey, '3-hip-return', `
      TT.setZoomHeldDbg(false);
    `, 2000);

    // 4. RELOAD BEATS 1-4 (Jerry J5 Near-Plane / Camera Crossing Check)
    console.log(`\n[${gunKey}] --- 4. Reload Beats 1-4 ---`);

    // Beat 1: Grab
    const uGrab = gunKey === 'm4' ? 0.12 : 0.12;
    await page.evaluate(`(async () => {
      const T = TT;
      T.setAmmoDbg('${gunKey}', 2);
      T.startReload();
      T.reloadClipDbg.hold(${uGrab});
    })()`);
    await capture(gunKey, '4-reload-grab', null, 800);

    // Beat 2: Pouch
    const uPouch = gunKey === 'm4' ? 0.35 : 0.35;
    await page.evaluate(`(async () => {
      TT.reloadClipDbg.hold(${uPouch});
    })()`);
    await capture(gunKey, '5-reload-pouch', null, 800);

    // Beat 3: Seat
    const uSeat = gunKey === 'm4' ? 0.62 : 0.62;
    await page.evaluate(`(async () => {
      TT.reloadClipDbg.hold(${uSeat});
    })()`);
    await capture(gunKey, '6-reload-seat', null, 800);

    // Beat 4: Work / Cocking pull
    const uWork = gunKey === 'm4' ? 0.78 : 0.79;
    await page.evaluate(`(async () => {
      TT.reloadClipDbg.hold(${uWork});
    })()`);
    await capture(gunKey, '7-reload-work', null, 800);

    // Release reload to finish
    await page.evaluate(`(async () => {
      TT.reloadClipDbg.hold(null);
    })()`);
    await sleep(1500);
    const reloadFinished = await page.evaluate(`!TT.isReloading()`);
    telemetry[gunKey].reloadCycle.finished = reloadFinished;
    console.log(`[${gunKey}] Reload completed cleanly: ${reloadFinished}`);

    // 5. ART PROTOCOL - FOUR LIGHTING MODELS
    console.log(`\n[${gunKey}] --- 5. Art Protocol (Four Lighting Models) ---`);
    // Noon
    await capture(gunKey, '8-art-noon', `
      TT.setWorldTime(0.50);
      if (TT.weather) { TT.weather.overcast = 0; TT.weather.raining = false; TT.weather.intensity = 0; }
      if (TT.fogNightDbg) TT.fogNightDbg.force(false);
      if (TT.flashlight) TT.flashlight.intensity = 0;
    `, 1500);

    // Dusk
    await capture(gunKey, '9-art-dusk', `
      TT.setWorldTime(0.74);
      if (TT.weather) { TT.weather.overcast = 0; TT.weather.raining = false; TT.weather.intensity = 0; }
      if (TT.fogNightDbg) TT.fogNightDbg.force(false);
      if (TT.flashlight) TT.flashlight.intensity = 0;
    `, 1500);

    // Overcast
    await capture(gunKey, '10-art-overcast', `
      TT.setWorldTime(0.50);
      if (TT.weather) { TT.weather.overcast = 1.0; TT.weather.raining = true; TT.weather.intensity = 0.85; }
      if (TT.fogNightDbg) TT.fogNightDbg.force(false);
      if (TT.flashlight) TT.flashlight.intensity = 0;
    `, 1500);

    // Night Ops
    await capture(gunKey, '11-art-night', `
      if (TT.runDevCommand) TT.runDevCommand('night ops');
      TT.setWorldTime(0.02);
      if (TT.fogNightDbg) { TT.fogNightDbg.force(true); TT.fogNightDbg.apply(10.0); }
      if (TT.weather) { TT.weather.overcast = 0; TT.weather.raining = false; }
      if (TT.flashlight) { TT.flashlight.intensity = 1.0; TT.flashlight.visible = true; }
    `, 1500);

    // Reset weather & lights
    await page.evaluate(`
      TT.setWorldTime(0.50);
      if (TT.weather) { TT.weather.overcast = 0; TT.weather.raining = false; }
      if (TT.fogNightDbg) TT.fogNightDbg.force(false);
      if (TT.flashlight) TT.flashlight.intensity = 0;
    `);

    // 6. MOTION DYNAMICS & PITCH LAG
    console.log(`\n[${gunKey}] --- 6. Motion Dynamics ---`);
    // Look Down
    await capture(gunKey, '12-motion-look-down', `
      TT.setOtsAimDbg(null, -0.9);
    `, 1500);

    // Look Up
    await capture(gunKey, '13-motion-look-up', `
      TT.setOtsAimDbg(null, 0.5);
    `, 1500);

    // Yaw Turn Sway
    await capture(gunKey, '14-motion-turn-sway', `
      TT.setOtsAimDbg(null, 0);
      for (let i = 0; i < 6; i++) {
        TT.otsLook && TT.otsLook(-160, 0);
        await new Promise(r => setTimeout(r, 30));
      }
    `, 200);

    // Reset aim
    await page.evaluate(`TT.setOtsAimDbg(0, 0);`);

    // 7. DEPTH COMPRESSION & WALL CHECKS
    console.log(`\n[${gunKey}] --- 7. Depth Compression Wall Check ---`);
    await page.evaluate(`(async () => {
      TT.setOtsAimDbg(0, 0);
      TT.marine.position.set(0, -3.17, -5.42);
      TT.marine.rotation.set(0, Math.PI, 0);
    })()`);
    await capture(gunKey, '15-wall-hip', `TT.setZoomHeldDbg(false);`, 1500);
    await capture(gunKey, '16-wall-ads', `TT.setZoomHeldDbg(true);`, 2000);
    await page.evaluate(`TT.setZoomHeldDbg(false);`);
  }

  telemetry.backend = telemetry.m4.shots['1-hip']?.backend;

  // Record telemetry to JSON
  fs.writeFileSync(path.join(OUT, 'ag195-telemetry.json'), JSON.stringify(telemetry, null, 2));
  console.log('\nTelemetry successfully written to ag195-telemetry.json');

  if (page.errors && page.errors.length) {
    console.warn('Page errors detected:', page.errors);
  }
} finally {
  await browser.close();
  await server.close();
}
