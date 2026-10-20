import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(ROOT, 'qa/2026-10-19-AG-96');
await fs.promises.mkdir(OUT_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const libCode = fs.readFileSync(path.resolve(ROOT, 'tools/tests/lib.js'), 'utf8');

const server = await serve(ROOT, 0);

async function runMode(suffix, queryExtra = '') {
  const browser = await launch({
    headless: false,
    args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720']
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer${queryExtra}`, { timeout: 120000 });
    await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
        return true;
      })()`);
      await sleep(300);
    }
    await page.waitFor('!!window.TT', { timeout: 120000 });
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await sleep(400);
    await page.evaluate(libCode);

    const stats = await page.evaluate(`(async () => {
      const T = window.TT;
      await startMatch(T, 'AG96');
      T.clearZombies();
      T.setHp(100000);
      T.runDevCommand('godmode');
      T.grantAllWeapons();
      // Show all 9 dog tags on the tag wall so we verify both nails and tags
      if (T.house?.tagWall?.userData?.tags) {
        for (const h of T.house.tagWall.userData.tags) h.visible = true;
      }
      // Move player far from HQ so the marine never occludes any HQ face
      T.player.position.set(45, T.sampleHeight(45, 45), 45);
      await new Promise(r => setTimeout(r, 300));

      let nodes = 0, meshes = 0, visibleMeshes = 0, foldedMeshes = 0;
      T.house.group.traverse(o => {
        nodes++;
        if (o.isMesh) {
          meshes++;
          let v = true;
          for (let p = o; p; p = p.parent) if (!p.visible) v = false;
          if (v) visibleMeshes++;
          if (o.userData?.folded) foldedMeshes++;
        }
      });
      return {
        folded: T.house.folded || null,
        baked: T.house.baked || null,
        nodes,
        meshes,
        visibleMeshes,
        foldedMeshes,
        gy: T.house.group.position.y
      };
    })()`, 120000);

    const gy = stats.gy;
    const shotViewsDay = [
      // Four faces by day
      ['01-south-day', { x: 0, y: gy + 3.4, z: -13.5, tx: 0, ty: gy + 2.8, tz: -4.2, fov: 48 }],
      ['02-east-day',  { x: 13.5, y: gy + 3.4, z: 0, tx: 4.2, ty: gy + 2.6, tz: 0, fov: 48 }],
      ['03-north-day', { x: 0, y: gy + 3.4, z: 13.5, tx: 0, ty: gy + 2.8, tz: 4.2, fov: 48 }],
      ['04-west-day',  { x: -13.5, y: gy + 3.4, z: 0, tx: -4.2, ty: gy + 2.6, tz: 0, fov: 48 }],
      // Station close-ups by day
      ['09-cif-closeup', { x: 6.8, y: gy + 2.0, z: -1.85, tx: 4.22, ty: gy + 1.95, tz: -1.85, fov: 42 }],
      ['10-armory-closeup', { x: 7.4, y: gy + 2.3, z: 1.44, tx: 4.22, ty: gy + 2.25, tz: 1.44, fov: 46 }],
      ['11-skull-intake-closeup', { x: -7.2, y: gy + 2.1, z: -1.8, tx: -4.26, ty: gy + 2.0, tz: -1.8, fov: 44 }],
      ['12-alarm-cabinet-closeup', { x: 2.2, y: gy + 1.9, z: -6.6, tx: 2.2, ty: gy + 1.85, tz: -4.22, fov: 38 }],
      ['13-damaged-terminal-closeup', { x: -3.25, y: gy + 1.95, z: -6.4, tx: -3.25, ty: gy + 1.90, tz: -4.37, fov: 38 }],
      ['14-tag-wall-closeup', { x: 0, y: gy + 1.25, z: -6.2, tx: 0, ty: gy + 1.15, tz: -4.23, fov: 36 }]
    ];

    // Freeze worldTime at 0.32 (bright mid-day) and freeze damagedTerminal spark cycle at 2.0 (inactive) for deterministic shots
    await page.evaluate(`(() => {
      const T = window.TT;
      T.setWorldTime(0.32);
    })()`);

    for (const [name, view] of shotViewsDay) {
      await page.evaluate(`(async () => {
        const T = window.TT;
        T.setWorldTime(0.32);
        if (T.house?.damagedTerminal?.sparks) T.house.damagedTerminal.sparks.visible = false;
        T.setShotView(${JSON.stringify(view)});
        await new Promise(r => setTimeout(r, 200));
      })()`);
      await page.screenshot(path.join(OUT_DIR, `${name}-${suffix}.png`));
    }

    // Switch to Night 20, clear zombies, freeze worldTime at 0.78 (deep night)
    await page.evaluate(`(async () => {
      const T = window.TT;
      T.runDevCommand('night 20');
      await new Promise(r => setTimeout(r, 250));
      T.clearZombies();
      T.player.position.set(45, T.sampleHeight(45, 45), 45);
      T.setWorldTime(0.78);
      if (T.lightPoolDbg?.update) T.lightPoolDbg.update();
      await new Promise(r => setTimeout(r, 250));
    })()`);

    const shotViewsNight = [
      ['05-south-night', { x: 0, y: gy + 3.4, z: -13.5, tx: 0, ty: gy + 2.8, tz: -4.2, fov: 48 }],
      ['06-east-night',  { x: 13.5, y: gy + 3.4, z: 0, tx: 4.2, ty: gy + 2.6, tz: 0, fov: 48 }],
      ['07-north-night', { x: 0, y: gy + 3.4, z: 13.5, tx: 0, ty: gy + 2.8, tz: 4.2, fov: 48 }],
      ['08-west-night',  { x: -13.5, y: gy + 3.4, z: 0, tx: -4.2, ty: gy + 2.6, tz: 0, fov: 48 }]
    ];

    for (const [name, view] of shotViewsNight) {
      await page.evaluate(`(async () => {
        const T = window.TT;
        T.clearZombies();
        T.setWorldTime(0.78);
        if (T.house?.damagedTerminal?.sparks) T.house.damagedTerminal.sparks.visible = false;
        T.setShotView(${JSON.stringify(view)});
        await new Promise(r => setTimeout(r, 200));
      })()`);
      await page.screenshot(path.join(OUT_DIR, `${name}-${suffix}.png`));
    }

    // Enter Training Ground and photograph the 4 hatch copies (`cif`, `armory`, `skullWindow`, `hqPanel`)
    await page.evaluate(`(async () => {
      const T = window.TT;
      T.setShotView(null);
      T.setWorldTime(0.32);
      T.trainingDbg.enter();
      await new Promise(r => setTimeout(r, 350));
      // Move player away from stations
      const tg = T.trainingDbg.tg();
      T.player.position.set(tg.origin.x, tg.origin.y + 0.1, tg.origin.z + 10);
      await new Promise(r => setTimeout(r, 200));
    })()`);

    const tgStations = [
      ['15-training-cif', 'cif', 2.8, 1.9, 1.85, 42],
      ['16-training-armory', 'armory', 3.4, 2.2, 2.15, 46],
      ['17-training-skull-intake', 'skullWindow', 2.8, 1.8, 1.7, 44],
      ['18-training-alarm-cabinet', 'hqPanel', 2.4, 1.8, 1.75, 40]
    ];

    for (const [name, key, dist, camY, lookY, fov] of tgStations) {
      await page.evaluate(`(async () => {
        const T = window.TT;
        const THREE = T.THREE;
        const cp = T.trainingDbg.state().copies['${key}'].copy;
        cp.updateMatrixWorld(true);
        const wPos = new THREE.Vector3();
        cp.getWorldPosition(wPos);
        const q = cp.getWorldQuaternion(new THREE.Quaternion());
        // Local +Z faces outward from each hatch copy (for armory, X offset is +0.76)
        const localLook = new THREE.Vector3(${key === 'armory' ? 0.76 : 0}, ${lookY}, 0.35);
        const localEye  = new THREE.Vector3(${key === 'armory' ? 0.76 : 0}, ${camY}, ${dist});
        const t = wPos.clone().add(localLook.applyQuaternion(q));
        const p = wPos.clone().add(localEye.applyQuaternion(q));
        T.setShotView({ x: p.x, y: p.y, z: p.z, tx: t.x, ty: t.y, tz: t.z, fov: ${fov} });
        await new Promise(r => setTimeout(r, 200));
      })()`);
      await page.screenshot(path.join(OUT_DIR, `${name}-${suffix}.png`));
    }

    return stats;
  } finally {
    await browser.close();
  }
}

try {
  const beforeStats = await runMode('before', '&fold=0');
  const afterStats = await runMode('after', '');
  fs.writeFileSync(path.join(OUT_DIR, 'hq-fold-stats.json'), JSON.stringify({ beforeStats, afterStats }, null, 2), 'utf8');
  console.log('HQ fold stats:', JSON.stringify({ beforeStats, afterStats }));
} finally {
  await server.close();
}
