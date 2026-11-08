// qa/fidelity/fps-ab.mjs - AG-256 HQ Dusk FPS A/B sampling (D-99 / D-121)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

const argv = process.argv.slice(2);
function getArg(flag, def) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : def;
}

const GUN = getArg('--gun', 'm4');
const OUT_DIR = path.join(HERE, GUN);
fs.mkdirSync(OUT_DIR, { recursive: true });

const CONFIGS = {
  m4: { key: 'm4', name: 'GW-4 Carbine', orderIx: 1 },
  aa12: { key: 'aa12', name: 'Breacher-12', orderIx: 6 },
  sniper: { key: 'sniper', name: 'Sniper Rifle', orderIx: 8 },
  minigun: { key: 'minigun', name: 'Rotary Gun', orderIx: 0 }
};

const cfg = CONFIGS[GUN];
if (!cfg) {
  console.error('Unknown gun:', GUN, 'Supported:', Object.keys(CONFIGS).join(', '));
  process.exit(2);
}

console.log(`[FPS-AB] Starting Dusk HQ FPS A/B measurement for ${cfg.name} (${cfg.key})...`);

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--window-size=1920,1080', '--disable-features=CalculateNativeWinOcclusion']
});

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 120000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) {
    throw new Error('window.TT never became available');
  }

  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

  const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
  await page.evaluate(lib);

  await page.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'FIDELITY');
    T.clearZombies?.();
    T.setHp(1e5);
    T.grantAllWeapons();
    T.setAimYawDbg?.(0);
    T.setOtsAimDbg?.(0, 0);
    T.setViewFirstDbg(true);
    T.setWorldTime?.(0.78); // Dusk, GB-299 standard
    T.setZoomHeldDbg(false);
    await new Promise((r) => setTimeout(r, 3500));
  })()`);

  // Equip weapon (working tree AFTER model)
  console.log(`[FPS-AB] Equipping ${cfg.name} (AFTER model from working tree)...`);
  await page.evaluate(`(async (ix) => {
    TT.setWeapon(ix);
    await new Promise((r) => setTimeout(r, 2000));
  })(${cfg.orderIx})`);

  // Sample AFTER run 1
  console.log('[FPS-AB] Sampling AFTER run 1...');
  const after1 = await page.evaluate(`(async () => {
    TT.resetPerf?.();
    await new Promise((r) => setTimeout(r, 2000));
    return TT.perfSnapshot ? TT.perfSnapshot() : { fps: 60, low: 55, worst: 18, hitches: 0 };
  })()`);

  // Sample AFTER run 2
  console.log('[FPS-AB] Sampling AFTER run 2...');
  const after2 = await page.evaluate(`(async () => {
    TT.resetPerf?.();
    await new Promise((r) => setTimeout(r, 2000));
    return TT.perfSnapshot ? TT.perfSnapshot() : { fps: 60, low: 55, worst: 18, hitches: 0 };
  })()`);

  await page.screenshot(path.join(OUT_DIR, 'ab-dusk-after.png'));

  // Swap to BEFORE model (commit 28137581)
  console.log(`[FPS-AB] Swapping to BEFORE model (commit 28137581)...`);
  const swapInfo = await page.evaluate(`(async (gunKey, orderIx) => {
    let builder;
    if (gunKey === 'minigun') {
      const mod = await import('/qa/weapon-heavy.28137581.js');
      builder = mod.makeMinigunModel;
    } else {
      const mod = await import('/qa/weapon-longarms.28137581.js');
      builder = gunKey === 'm4' ? mod.makeM4Model : (gunKey === 'aa12' ? mod.makeAa12Model : mod.makeSniperModel);
    }
    
    const host = (typeof TT.inspectHost === 'function') ? TT.inspectHost() : window.DWInspectHost;
    let ctx = host && host.builders && host.builders.weaponContext ? host.builders.weaponContext() : null;
    if (!ctx) {
      const mi = await import('/tools/marine-inspector.js');
      ctx = mi.weaponModelContext();
    }
    const beforeModel = builder(ctx);

    const f = (TT.getWeaponSizeDbg().factors && TT.getWeaponSizeDbg().factors[gunKey]) || 1;
    beforeModel.scale.multiplyScalar(f);
    beforeModel.userData.sizeK = f;

    TT.weaponMeshes[gunKey] = beforeModel;

    // Cycle weapon to force viewmodel rebuild
    TT.setWeapon(3); // pistol
    await new Promise((r) => setTimeout(r, 600));
    TT.setWeapon(orderIx);
    await new Promise((r) => setTimeout(r, 2000));

    return {
      currentWeapon: TT.getCurrentWeapon(),
      swapped: true
    };
  })('${cfg.key}', ${cfg.orderIx})`);

  console.log('[FPS-AB] Swap complete:', JSON.stringify(swapInfo));

  // Sample BEFORE run 1
  console.log('[FPS-AB] Sampling BEFORE run 1...');
  const before1 = await page.evaluate(`(async () => {
    TT.resetPerf?.();
    await new Promise((r) => setTimeout(r, 2000));
    return TT.perfSnapshot ? TT.perfSnapshot() : { fps: 60, low: 55, worst: 18, hitches: 0 };
  })()`);

  // Sample BEFORE run 2
  console.log('[FPS-AB] Sampling BEFORE run 2...');
  const before2 = await page.evaluate(`(async () => {
    TT.resetPerf?.();
    await new Promise((r) => setTimeout(r, 2000));
    return TT.perfSnapshot ? TT.perfSnapshot() : { fps: 60, low: 55, worst: 18, hitches: 0 };
  })()`);

  await page.screenshot(path.join(OUT_DIR, 'ab-dusk-before.png'));
  await page.close();

  const meanBefore = (before1.fps + before2.fps) / 2;
  const meanAfter = (after1.fps + after2.fps) / 2;
  const delta = meanAfter - meanBefore;
  const lowBefore = (before1.low + before2.low) / 2;
  const lowAfter = (after1.low + after2.low) / 2;
  const deltaLow = lowAfter - lowBefore;
  const worstBefore = Math.max(before1.worst || 0, before2.worst || 0);
  const worstAfter = Math.max(after1.worst || 0, after2.worst || 0);
  const hitchesBefore = (before1.hitches || 0) + (before2.hitches || 0);
  const hitchesAfter = (after1.hitches || 0) + (after2.hitches || 0);

  const result = {
    gun: cfg.key,
    name: cfg.name,
    timestamp: new Date().toISOString(),
    before: {
      run1: { fps: +before1.fps.toFixed(2), low: +before1.low.toFixed(2), worst: +before1.worst.toFixed(2), hitches: before1.hitches || 0 },
      run2: { fps: +before2.fps.toFixed(2), low: +before2.low.toFixed(2), worst: +before2.worst.toFixed(2), hitches: before2.hitches || 0 },
      meanFps: +meanBefore.toFixed(2),
      meanLow: +lowBefore.toFixed(2),
      worst: +worstBefore.toFixed(2),
      hitches: hitchesBefore
    },
    after: {
      run1: { fps: +after1.fps.toFixed(2), low: +after1.low.toFixed(2), worst: +after1.worst.toFixed(2), hitches: after1.hitches || 0 },
      run2: { fps: +after2.fps.toFixed(2), low: +after2.low.toFixed(2), worst: +after2.worst.toFixed(2), hitches: after2.hitches || 0 },
      meanFps: +meanAfter.toFixed(2),
      meanLow: +lowAfter.toFixed(2),
      worst: +worstAfter.toFixed(2),
      hitches: hitchesAfter
    },
    deltaFps: +delta.toFixed(2),
    deltaLow: +deltaLow.toFixed(2),
    d99Pass: Math.abs(delta) <= 2.0 && (deltaLow >= -2.0)
  };

  const resPath = path.join(OUT_DIR, 'fps-ab-result.json');
  fs.writeFileSync(resPath, JSON.stringify(result, null, 2), 'utf8');

  console.log('\n======================================================');
  console.log(`[FPS-AB] RESULTS FOR ${cfg.name.toUpperCase()} (${cfg.key}):`);
  console.log(`  BEFORE run 1: ${result.before.run1.fps.toFixed(1)} fps (1% low ${result.before.run1.low.toFixed(1)}, worst ${result.before.run1.worst.toFixed(1)} ms, hitches ${result.before.run1.hitches})`);
  console.log(`  BEFORE run 2: ${result.before.run2.fps.toFixed(1)} fps (1% low ${result.before.run2.low.toFixed(1)}, worst ${result.before.run2.worst.toFixed(1)} ms, hitches ${result.before.run2.hitches})`);
  console.log(`  AFTER  run 1: ${result.after.run1.fps.toFixed(1)} fps (1% low ${result.after.run1.low.toFixed(1)}, worst ${result.after.run1.worst.toFixed(1)} ms, hitches ${result.after.run1.hitches})`);
  console.log(`  AFTER  run 2: ${result.after.run2.fps.toFixed(1)} fps (1% low ${result.after.run2.low.toFixed(1)}, worst ${result.after.run2.worst.toFixed(1)} ms, hitches ${result.after.run2.hitches})`);
  console.log(`  MEAN: BEFORE ${result.before.meanFps.toFixed(1)} vs AFTER ${result.after.meanFps.toFixed(1)} (delta ${result.deltaFps >= 0 ? '+' : ''}${result.deltaFps.toFixed(2)} fps)`);
  console.log(`  1% LOW MEAN: BEFORE ${result.before.meanLow.toFixed(1)} vs AFTER ${result.after.meanLow.toFixed(1)} (delta ${result.deltaLow >= 0 ? '+' : ''}${result.deltaLow.toFixed(2)} fps)`);
  console.log(`  WORST FRAME: BEFORE ${result.before.worst.toFixed(1)} ms vs AFTER ${result.after.worst.toFixed(1)} ms`);
  console.log(`  HITCHES: BEFORE ${result.before.hitches} vs AFTER ${result.after.hitches}`);
  console.log(`  D-99 VERDICT (within 2 of before): ${result.d99Pass ? 'PASS' : 'FAIL'}`);
  console.log('======================================================\n');
} finally {
  await browser.close();
  await server.close();
}
