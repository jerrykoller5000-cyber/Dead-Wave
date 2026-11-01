// qa/2026-10-31-AG-171/run-ag171.mjs
// Single batched GPU slot runner for AG-171 (CL-281 v3: game/vm-flip.js & VM.wristMax = 0.87)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const ROOT = path.resolve(HERE, '..', '..');
const TESTS = path.join(ROOT, 'tools', 'tests');
fs.mkdirSync(HERE, { recursive: true });

const W = 1280, H = 720;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Run realtest tcl281 --all
console.log('\n=== [1/3] Running realtest tcl281 --all ===');
const r281 = spawnSync(process.execPath, ['tools/realtest.mjs', 'tcl281', '--all'], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, DW_SLOT_HELD: '1' }
});
process.stdout.write(r281.stdout || '');
process.stderr.write(r281.stderr || '');
fs.writeFileSync(path.join(HERE, 'tcl281-real.log'), (r281.stdout || '') + '\n' + (r281.stderr || ''));

// 2. Run tools/vmsheet.mjs --out qa/2026-10-31-AG-171
console.log('\n=== [2/3] Running tools/vmsheet.mjs --out qa/2026-10-31-AG-171 ===');
const rvms = spawnSync(process.execPath, ['tools/vmsheet.mjs', '--out', HERE], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, DW_SLOT_HELD: '1' }
});
process.stdout.write(rvms.stdout || '');
process.stderr.write(rvms.stderr || '');
fs.writeFileSync(path.join(HERE, 'vmsheet.log'), (rvms.stdout || '') + '\n' + (rvms.stderr || ''));

// 3. Capture outdoor noon, HQ roof shade, and Night 20 + NVG shots + detailed v3 telemetry
console.log('\n=== [3/3] Capturing outdoor noon, HQ roof, Night 20 NVG & v3 telemetry ===');
const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', `--window-size=${W},${H}`]
});

const summary = {
  tcl281ExitCode: r281.status,
  vmsheetExitCode: rvms.status,
  shots: {}
};

try {
  const page = await browser.newPage({ width: W, height: H });
  const url = `${server.origin}/index.html?debug=1&raf=timer`;
  await page.goto(url, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));

  await page.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'AG171');
    T.clearZombies && T.clearZombies();
    T.setHp(1e5);
    T.grantAllWeapons();
    if (T.weather) { T.weather.rain = 0; T.weather.thunder = 0; }
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'pistol'; i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      await new Promise((r) => setTimeout(r, 150));
    }
    T.setViewFirstDbg(true);
    await new Promise((r) => setTimeout(r, 3500));
  })()`, 180000);

  const readTelemetry = async () => page.evaluate(`(() => {
    const T = TT;
    const THREE = T.THREE;
    const vm = T.viewmodelDbg && T.viewmodelDbg();
    if (!vm || !vm.arms) return null;
    const A = vm.arms, wr = vm.wrists;
    const rootInvNow = () => { const sp = vm.space || vm.root; sp.updateMatrixWorld(true); return sp.matrixWorld.clone().invert(); };
    const inView = (o, p) => { o.updateWorldMatrix(true, false); return p.clone().applyMatrix4(o.matrixWorld).applyMatrix4(rootInvNow()); };
    const endOn = (arm) => {
      const w = inView(arm.wrist, new THREE.Vector3());
      const e = inView(arm.root, new THREE.Vector3());
      const d = e.clone().sub(w).normalize();
      const toEye = w.clone().multiplyScalar(-1).normalize();
      return {
        degOffEyeLine: +(Math.acos(Math.max(-1, Math.min(1, d.dot(toEye)))) * 180 / Math.PI).toFixed(1),
        elbowNdc: { x: +vm.ndc(e).x.toFixed(3), y: +vm.ndc(e).y.toFixed(3) },
        wristNdc: { x: +vm.ndc(w).x.toFixed(3), y: +vm.ndc(w).y.toFixed(3) }
      };
    };
    const bend = (arm) => {
      const a = new THREE.Vector3(0, 1, 0).applyQuaternion(arm.root.quaternion);
      const b = new THREE.Vector3(0, 1, 0).applyQuaternion(arm.root.quaternion.clone().multiply(arm.wrist.quaternion));
      return +(Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * 180 / Math.PI).toFixed(1);
    };
    let flippedMeshes = 0, totalMeshes = 0;
    vm.root.traverse((o) => {
      if (o.isMesh && o.geometry) {
        totalMeshes++;
        if (o.geometry.userData && o.geometry.userData.vmFlipOf) flippedMeshes++;
      }
    });
    return {
      info: {
        active: vm.info.active,
        flip: vm.info.flip,
        wristMaxRad: +vm.info.wristMax.toFixed(3),
        wristMaxDeg: +(vm.info.wristMax * 180 / Math.PI).toFixed(1),
        raise: +vm.info.raise.toFixed(3),
        ads: +vm.info.ads.toFixed(3),
        magState: vm.info.magState,
        handPlace: vm.info.handPlace
      },
      flippedMeshes,
      totalMeshes,
      wristBendDeg: { r: bend(A.r), l: bend(A.l) },
      forearmR: endOn(A.r),
      forearmL: endOn(A.l)
    };
  })()`);

  // Outdoor noon hip & ADS
  await page.evaluate(`(async () => {
    const T = TT;
    T.setWorldTime(0.42);
    T.player.position.set(0, T.sampleHeight(0, 18), 18);
    T.setOtsAimDbg(0, 0);
    T.setZoomHeldDbg(false);
    await new Promise((r) => setTimeout(r, 2000));
  })()`);
  summary.shots.noonOutdoorHip = await readTelemetry();
  await page.screenshot(path.join(HERE, 'vm-noon-outdoor-hip.png'));

  await page.evaluate(`(async () => {
    TT.setZoomHeldDbg(true);
    await new Promise((r) => setTimeout(r, 2500));
  })()`);
  summary.shots.noonOutdoorAds = await readTelemetry();
  await page.screenshot(path.join(HERE, 'vm-noon-outdoor-ads.png'));

  // Under HQ roof shade at noon
  await page.evaluate(`(async () => {
    const T = TT;
    T.setZoomHeldDbg(false);
    T.player.position.set(0, T.sampleHeight(0, 0), 0);
    T.setOtsAimDbg(0, 0);
    await new Promise((r) => setTimeout(r, 2000));
  })()`);
  summary.shots.hqRoofHip = await readTelemetry();
  await page.screenshot(path.join(HERE, 'vm-hq-roof-hip.png'));

  // Night 20 outdoor hip, NVG hip, NVG ADS
  await page.evaluate(`(async () => {
    const T = TT;
    T.setWorldTime(0.05);
    T.player.position.set(0, T.sampleHeight(0, 18), 18);
    T.setOtsAimDbg(0, 0);
    T.setZoomHeldDbg(false);
    await new Promise((r) => setTimeout(r, 2000));
  })()`);
  summary.shots.night20Hip = await readTelemetry();
  await page.screenshot(path.join(HERE, 'vm-night20-hip.png'));

  await page.evaluate(`(async () => {
    const T = TT;
    T.getGearOwned().nvg = true;
    if (!T.isNvgActive || !T.isNvgActive()) {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyN', key: 'n', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyN', key: 'n', bubbles: true }));
    }
    await new Promise((r) => setTimeout(r, 2000));
  })()`);
  summary.shots.night20NvgHip = await readTelemetry();
  await page.screenshot(path.join(HERE, 'vm-night20-nvg-hip.png'));

  await page.evaluate(`(async () => {
    TT.setZoomHeldDbg(true);
    await new Promise((r) => setTimeout(r, 2500));
  })()`);
  summary.shots.night20NvgAds = await readTelemetry();
  await page.screenshot(path.join(HERE, 'vm-night20-nvg-ads.png'));

  fs.writeFileSync(path.join(HERE, 'ag171-summary.json'), JSON.stringify(summary, null, 2));
  console.log('\nSaved ag171-summary.json');
} finally {
  try { await browser.close(); } catch (_) {}
  try { server.close(); } catch (_) {}
}
process.exit(0);
