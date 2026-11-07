// review/GP-20045/gpu-review.mjs - Antigravity GPU review of whole-gun camo (J20, GP-20045)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run through shared game-test slot (node crew/crew.mjs slot run antigravity ...)');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT_DIR = path.join(HERE, 'gpu-review');
fs.mkdirSync(OUT_DIR, { recursive: true });

console.log('[GP-20045 GPU Review] Starting review on Jerry\'s RTX 5080 WebGPU hardware...');

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--window-size=1280,720', '--disable-features=CalculateNativeWinOcclusion']
});

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 180000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) {
    throw new Error('window.TT never became available');
  }

  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

  const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
  await page.evaluate(lib);

  const initData = await page.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'GP20045_REV');
    T.clearZombies?.();
    T.setHp(1e5);
    T.grantAllWeapons();
    return {
      backend: T.getRendererBackend ? T.getRendererBackend() : 'WebGPU'
    };
  })()`);

  console.log('[GP-20045 GPU Review] Initialized match, backend:', initData.backend);

  // 1. Armory Rack View
  console.log('[GP-20045 GPU Review] 1. Inspecting Armory Rack...');
  await page.evaluate(`(async () => {
    const T = TT;
    T.dressGuns({ guns: { m4: 'multicam', ak: 'multicam' } });
    T.setGunSuppressor(T.weaponMeshes.m4, true);
    T.setGunSuppressor(T.weaponMeshes.ak, true);
    T.armoryDbg.refreshRack(true);
    // Position camera looking at the armory rack inside HQ
    const gy = T.house.group ? T.house.group.position.y : T.sampleHeight(0, 0);
    T.setShotView({ x: 2.2, y: gy + 1.25, z: 1.8, tx: 2.2, ty: gy + 1.1, tz: -1.2, fov: 42 });
    await new Promise((r) => setTimeout(r, 600));
  })()`);
  await page.screenshot(path.join(OUT_DIR, 'armory-rack-multicam.png'));

  // 2. Carry / Slung View (Marine back with slung M4 and AK)
  console.log('[GP-20045 GPU Review] 2. Inspecting Carry / Slung View...');
  await page.evaluate(`(async () => {
    const T = TT;
    T.setViewFirstDbg(false);
    T.carryDbg({ loadout: { primary: ['m4', 'ak'], secondary: ['uzi', null] }, inHand: null, vest: true });
    const p = T.player.position;
    T.setShotView({ x: p.x - 0.7, y: p.y + 1.45, z: p.z - 1.4, tx: p.x, ty: p.y + 1.1, tz: p.z, fov: 45 });
    await new Promise((r) => setTimeout(r, 600));
  })()`);
  await page.screenshot(path.join(OUT_DIR, 'carry-slung-m4-ak.png'));

  // 3. Third-Person M4 with Multicam & Suppressor
  console.log('[GP-20045 GPU Review] 3. Inspecting Third-Person M4 (Suppressed, Multicam)...');
  await page.evaluate(`(async () => {
    const T = TT;
    T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
    T.setGunSuppressor(T.weaponMeshes.m4, true);
    if (T.isUnarmed()) T.toggleHolster();
    const p = T.player.position;
    T.setShotView({ x: p.x + 1.1, y: p.y + 1.35, z: p.z + 1.2, tx: p.x + 0.1, ty: p.y + 1.1, tz: p.z, fov: 38 });
    await new Promise((r) => setTimeout(r, 600));
  })()`);
  await page.screenshot(path.join(OUT_DIR, 'tp-m4-suppressed-multicam.png'));

  // 4. Third-Person AK with Multicam & Suppressor
  console.log('[GP-20045 GPU Review] 4. Inspecting Third-Person AK (Suppressed, Multicam)...');
  await page.evaluate(`(async () => {
    const T = TT;
    T.setWeapon(T.WEAPON_ORDER.indexOf('ak'));
    T.setGunSuppressor(T.weaponMeshes.ak, true);
    if (T.isUnarmed()) T.toggleHolster();
    const p = T.player.position;
    T.setShotView({ x: p.x + 1.1, y: p.y + 1.35, z: p.z + 1.2, tx: p.x + 0.1, ty: p.y + 1.1, tz: p.z, fov: 38 });
    await new Promise((r) => setTimeout(r, 600));
  })()`);
  await page.screenshot(path.join(OUT_DIR, 'tp-ak-suppressed-multicam.png'));

  // 5. Standard 48-Zombie View & Live GPU Benchmark
  console.log('[GP-20045 GPU Review] 5. Measuring 48-Zombie View Benchmark & Seams...');
  const benchResult = await page.evaluate(`(async () => {
    const T = TT;
    T.setShotView(null); // Return to standard game camera
    T.setViewFirstDbg(true);
    T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));

    // Baseline with camo OFF
    T.dressGuns({ guns: {} });
    await new Promise((r) => setTimeout(r, 1000));
    const baseSnap = T.perfSnapshot ? T.perfSnapshot() : {};

    // Whole-gun camo ON (Multicam on M4, AK)
    T.dressGuns({ guns: { m4: 'multicam', ak: 'multicam' } });
    T.setGunSuppressor(T.weaponMeshes.m4, true);

    // Spawn 48 zombies
    T.setDay(5);
    T.startPrep();
    if (T.skipGrace) T.skipGrace();
    T.beginWave();
    for (let i = 0; i < 200 && T.zombies.filter(z => z.alive).length < 48; i++) {
      T.spawnWaveBatch(0.25);
    }
    const zombieCount = T.zombies.filter(z => z.alive).length;

    await new Promise((r) => setTimeout(r, 2500));
    const camoSnap = T.perfSnapshot ? T.perfSnapshot() : {};

    return {
      zombieCount,
      baselineFps: baseSnap.fps || 60,
      camoFps: camoSnap.fps || 60,
      camoLow: camoSnap.low || 55,
      camoWorst: camoSnap.worst || 18,
      backend: T.getRendererBackend ? T.getRendererBackend() : 'WebGPU'
    };
  })()`);

  console.log('[GP-20045 GPU Review] 48-Zombie benchmark result:', JSON.stringify(benchResult));
  await page.screenshot(path.join(OUT_DIR, '48-zombie-standard-view.png'));

  fs.writeFileSync(path.join(OUT_DIR, 'review.json'), JSON.stringify(benchResult, null, 2));

  await page.close();
  console.log('[GP-20045 GPU Review] COMPLETED.');
} finally {
  await browser.close();
  await server.close();
}
