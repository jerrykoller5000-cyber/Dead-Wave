// Capture shotgun and AA-12 (Breacher) in 4 outdoor lights comparing baseline vs +0.25 hip yaw
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-02-AG-209/shotguns');
fs.mkdirSync(OUT_DIR, { recursive: true });

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1920,1080']
});

try {
  const page = await browser.newPage({ width: 1920, height: 1080 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 120000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
    throw new Error('TT did not boot');
  }

  await page.evaluate(`(() => {
    if (window.DWOpening?.dismissForTesting) window.DWOpening.dismissForTesting();
    else if (window.DWOpening?.skip) window.DWOpening.skip();
  })()`);

  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

  // Start match on Woods Trail gameplay eye
  await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'GP20017');
    T.clearZombies && T.clearZombies();
    T.setHp(100000);
    T.grantAllWeapons();
    T.setViewFirstDbg(true);
    if (T.isUnarmed()) T.toggleHolster();

    if (T.trainingDbg.state().active) T.trainingDbg.leave();
    T.player.position.set(0.48, -3.17, 13.91);
    T.player.rotation.y = 1.05;
    T.setAimYawDbg(1.05);
    T.setOtsAimDbg(1.05, 0.0);
    T.setVelDbg(0, 0);
  })()`);

  const lights = [
    { name: 'noon', time: 0.42 },
    { name: 'overcast', time: 0.55 },
    { name: 'dusk', time: 0.82 },
    { name: 'night', time: 0.02 }
  ];

  const targets = [
    { key: 'shotgun', label: 'Shotgun', baselineYaw: 0.025, candidateYaw: 0.25 },
    { key: 'aa12', label: 'Breacher (AA-12)', baselineYaw: 0.03, candidateYaw: 0.25 }
  ];

  const metadata = {};

  for (const tgt of targets) {
    console.log(`\nCapturing 4-light stills for ${tgt.label} (${tgt.key})...`);
    metadata[tgt.key] = { baseline: {}, candidate: {} };

    // Equip target weapon
    await page.evaluate(`(async () => {
      const T = window.TT;
      const idx = T.WEAPON_ORDER.indexOf(${JSON.stringify(tgt.key)});
      T.setWeapon(idx);
      for (let i = 0; i < 100; i++) {
        const vm = T.viewmodelDbg();
        if (vm && vm.root && vm.root.visible && vm.info.active && vm.info.raise >= 0.99 && vm.info.key === ${JSON.stringify(tgt.key)}) break;
        await new Promise(r => setTimeout(r, 50));
      }
    })()`);

    // 1. Capture Baseline Yaw
    console.log(`  -> Baseline Yaw (${tgt.baselineYaw})...`);
    for (const lt of lights) {
      const meta = await page.evaluate(`(async () => {
        const T = window.TT;
        const key = ${JSON.stringify(tgt.key)};
        const poses = (await import('./game/viewmodel-poses.js')).VM_POSES;
        poses[key].hip.yaw = ${tgt.baselineYaw};
        T.setTimeOfDay && T.setTimeOfDay(${lt.time});
        await new Promise(r => setTimeout(r, 300));
        const vm = T.viewmodelDbg();
        return {
          key,
          active: vm.info.active,
          rootVisible: vm.root && vm.root.visible,
          raise: vm.info.raise,
          ads: vm.info.ads,
          hipYaw: poses[key].hip.yaw,
          muzzle: vm.ndc(vm.viewPoint(T.weaponMeshes[key].userData.muzzleLocal.clone()))
        };
      })()`);

      const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
      const filename = `${tgt.key}-baseline-${lt.name}.jpg`;
      fs.writeFileSync(path.join(OUT_DIR, filename), Buffer.from(shot.data, 'base64'));
      metadata[tgt.key].baseline[lt.name] = meta;
    }

    // 2. Capture Candidate +0.25 Yaw
    console.log(`  -> Candidate Yaw (${tgt.candidateYaw})...`);
    for (const lt of lights) {
      const meta = await page.evaluate(`(async () => {
        const T = window.TT;
        const key = ${JSON.stringify(tgt.key)};
        const poses = (await import('./game/viewmodel-poses.js')).VM_POSES;
        poses[key].hip.yaw = ${tgt.candidateYaw};
        T.setTimeOfDay && T.setTimeOfDay(${lt.time});
        await new Promise(r => setTimeout(r, 300));
        const vm = T.viewmodelDbg();
        return {
          key,
          active: vm.info.active,
          rootVisible: vm.root && vm.root.visible,
          raise: vm.info.raise,
          ads: vm.info.ads,
          hipYaw: poses[key].hip.yaw,
          muzzle: vm.ndc(vm.viewPoint(T.weaponMeshes[key].userData.muzzleLocal.clone()))
        };
      })()`);

      const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
      const filename = `${tgt.key}-candidate-${lt.name}.jpg`;
      fs.writeFileSync(path.join(OUT_DIR, filename), Buffer.from(shot.data, 'base64'));
      metadata[tgt.key].candidate[lt.name] = meta;
    }
  }

  // Restore active candidate yaws in VM_POSES before exiting
  await page.evaluate(`(async () => {
    const poses = (await import('./game/viewmodel-poses.js')).VM_POSES;
    poses.shotgun.hip.yaw = 0.25;
    poses.aa12.hip.yaw = 0.25;
  })()`);

  fs.writeFileSync(path.join(OUT_DIR, 'shotguns-metadata.json'), JSON.stringify(metadata, null, 2));
  console.log('[AG-209] Shotgun and Breacher 4-light captures complete!');
} finally {
  await browser.close();
  await server.close();
}
