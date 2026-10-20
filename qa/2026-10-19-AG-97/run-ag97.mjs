import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(ROOT, 'qa/2026-10-19-AG-97');
const PROF_JSONL = path.resolve(ROOT, 'qa/2026-10-19-AG-86/prof-lines.jsonl');
await fs.promises.mkdir(OUT_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const libCode = fs.readFileSync(path.resolve(ROOT, 'tools/tests/lib.js'), 'utf8');

const server = await serve(ROOT, 0);

async function openGamePage(browser, queryExtra = '') {
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
  await page.evaluate(libCode + '\n;true;');
  // Hide UI overlays so screenshots show the 3D canvas cleanly
  await page.evaluate(`(() => {
    const c = [...document.querySelectorAll('canvas')]
      .sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
    if (!c) return false;
    const keep = new Set();
    for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
    for (const child of document.body.children) {
      if (!keep.has(child)) child.style.setProperty('display', 'none', 'important');
    }
    return true;
  })()`);
  return page;
}

const reportData = {};

try {
  // 1. ?fold=0 pass for HQ tag wall and lockdown door before-shots & draw counts
  {
    const browser = await launch({
      headless: false,
      args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720']
    });
    try {
      const page = await openGamePage(browser, '&fold=0');
      const rawBefore = await page.evaluate(`(async () => {
        const T = window.TT;
        await startMatch(T, 'AG97Before');
        T.clearZombies();
        T.setHp(100000);
        T.runDevCommand('godmode');
        if (T.house?.tagWall?.userData?.tags) {
          for (const h of T.house.tagWall.userData.tags) h.visible = true;
        }
        T.player.position.set(45, T.sampleHeight(45, 45), 45);
        T.setWorldTime(0.32);
        await new Promise(r => setTimeout(r, 250));
        const gy = T.house.group.position.y;
        const doorObj = T.house.group.getObjectByName('fob-lockdown-door');
        return JSON.stringify({
          gy,
          houseFolded: T.house.folded || null,
          houseDraws: T.drawsOf(T.house.group).length,
          tagWallDraws: T.drawsOf(T.house.tagWall),
          lockdownDoorDraws: doorObj ? T.drawsOf(doorObj) : []
        });
      })()`, 120000);
      reportData.beforeFold0 = JSON.parse(rawBefore);

      const gy = reportData.beforeFold0.gy;
      // 01-tag-wall-before (South wall: AGAINST WHAT SHOULD NOT BE + all 9 nails and tags)
      await page.evaluate(`(async () => {
        const T = window.TT;
        T.setWorldTime(0.32);
        T.setShotView({ x: 0, y: ${gy} + 1.15, z: -7.6, tx: 0, ty: ${gy} + 1.05, tz: -4.2, fov: 40 });
        await new Promise(r => setTimeout(r, 250));
        return true;
      })()`);
      await page.screenshot(path.join(OUT_DIR, '01-tag-wall-before.png'));

      // 02-lockdown-door-before (North wall: THRESHOLD / LOCKDOWN DO NOT OPEN)
      await page.evaluate(`(async () => {
        const T = window.TT;
        T.setWorldTime(0.32);
        T.setShotView({ x: 0, y: ${gy} + 1.45, z: 8.2, tx: 0, ty: ${gy} + 1.35, tz: 4.2, fov: 42 });
        await new Promise(r => setTimeout(r, 250));
        return true;
      })()`);
      await page.screenshot(path.join(OUT_DIR, '02-lockdown-door-before.png'));
    } finally {
      await browser.close();
    }
  }

  // 2. Default (folded) pass: tag wall, lockdown door, terrain wedges (6x3), foliage cells (45m), marine cloth (run/crouch/roll + hits), CL-219 night shadows
  {
    const browser = await launch({
      headless: false,
      args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720']
    });
    try {
      const page = await openGamePage(browser, '');
      const rawAfter = await page.evaluate(`(async () => {
        const T = window.TT;
        await startMatch(T, 'AG97After');
        T.clearZombies();
        T.setHp(100000);
        T.runDevCommand('godmode');
        if (T.house?.tagWall?.userData?.tags) {
          for (const h of T.house.tagWall.userData.tags) h.visible = true;
        }
        T.player.position.set(45, T.sampleHeight(45, 45), 45);
        T.setWorldTime(0.32);
        await new Promise(r => setTimeout(r, 250));
        const gy = T.house.group.position.y;
        const doorObj = T.house.group.getObjectByName('fob-lockdown-door');
        const groundDraws = T.drawsOf(T.ground, 200);
        const foliageCount = Array.isArray(T.foliageChunks) ? T.foliageChunks.length : -1;
        return JSON.stringify({
          gy,
          houseFolded: T.house.folded || null,
          houseDraws: T.drawsOf(T.house.group).length,
          tagWallDraws: T.drawsOf(T.house.tagWall),
          tagWallVisibleTags: T.house.tagWall?.userData?.tags?.filter(t => t.visible).length || 0,
          lockdownDoorDraws: doorObj ? T.drawsOf(doorObj) : [],
          groundMeshCount: groundDraws.length,
          groundDrawsSample: groundDraws.slice(0, 6),
          foliageChunkCount: foliageCount,
          dock: T.POI?.dock ? { x: T.POI.dock.x, z: T.POI.dock.z, deckY: T.POI.dock.deckY } : null,
          lake: T.LAKE_HOLE ? { x: T.LAKE_HOLE.x, z: T.LAKE_HOLE.z } : null
        });
      })()`, 120000);
      reportData.afterFolded = JSON.parse(rawAfter);

      const gy = reportData.afterFolded.gy;
      // 01-tag-wall-after (South wall)
      await page.evaluate(`(async () => {
        const T = window.TT;
        T.setWorldTime(0.32);
        T.setShotView({ x: 0, y: ${gy} + 1.15, z: -7.6, tx: 0, ty: ${gy} + 1.05, tz: -4.2, fov: 40 });
        await new Promise(r => setTimeout(r, 250));
        return true;
      })()`);
      await page.screenshot(path.join(OUT_DIR, '01-tag-wall-after.png'));

      // 02-lockdown-door-after (North wall)
      await page.evaluate(`(async () => {
        const T = window.TT;
        T.setWorldTime(0.32);
        T.setShotView({ x: 0, y: ${gy} + 1.45, z: 8.2, tx: 0, ty: ${gy} + 1.35, tz: 4.2, fov: 42 });
        await new Promise(r => setTimeout(r, 250));
        return true;
      })()`);
      await page.screenshot(path.join(OUT_DIR, '02-lockdown-door-after.png'));

      // 03-terrain-from-hq (looking across near wedges and far coarse band)
      await page.evaluate(`(async () => {
        const T = window.TT;
        T.setWorldTime(0.36);
        T.setShotView({ x: 18, y: ${gy} + 9.5, z: 22, tx: -65, ty: ${gy} - 1.5, tz: -80, fov: 52 });
        await new Promise(r => setTimeout(r, 300));
        return true;
      })()`);
      await page.screenshot(path.join(OUT_DIR, '03-terrain-from-hq.png'));

      // 04-terrain-from-dock
      await page.evaluate(`(async () => {
        const T = window.TT;
        const d = T.POI.dock;
        T.setWorldTime(0.36);
        T.setShotView({ x: d.x - 14, y: d.deckY + 5.5, z: d.z - 12, tx: d.x + 70, ty: d.deckY + 1.0, tz: d.z + 65, fov: 52 });
        await new Promise(r => setTimeout(r, 300));
        return true;
      })()`);
      await page.screenshot(path.join(OUT_DIR, '04-terrain-from-dock.png'));

      // 05-terrain-from-lake
      await page.evaluate(`(async () => {
        const T = window.TT;
        const L = T.LAKE_HOLE;
        T.setWorldTime(0.36);
        T.setShotView({ x: L.x + 42, y: 4.2, z: L.z - 16, tx: L.x - 60, ty: 1.5, tz: L.z + 55, fov: 52 });
        await new Promise(r => setTimeout(r, 300));
        return true;
      })()`);
      await page.screenshot(path.join(OUT_DIR, '05-terrain-from-lake.png'));

      // 06 & 07: Ground cover 45m cells (walking across x = 45 cell boundary)
      await page.evaluate(`(async () => {
        const T = window.TT;
        T.setWorldTime(0.36);
        const y0 = T.sampleHeight(43.5, 14);
        T.player.position.set(43.5, y0, 14);
        T.setShotView({ x: 41.0, y: y0 + 2.4, z: 14, tx: 58.0, ty: T.sampleHeight(58, 14) + 0.4, tz: 14, fov: 50 });
        await new Promise(r => setTimeout(r, 300));
        return true;
      })()`);
      await page.screenshot(path.join(OUT_DIR, '06-foliage-cell-edge-43m.png'));

      await page.evaluate(`(async () => {
        const T = window.TT;
        const y1 = T.sampleHeight(46.5, 14);
        T.player.position.set(46.5, y1, 14);
        T.setShotView({ x: 41.0, y: T.sampleHeight(43.5, 14) + 2.4, z: 14, tx: 58.0, ty: T.sampleHeight(58, 14) + 0.4, tz: 14, fov: 50 });
        await new Promise(r => setTimeout(r, 300));
        return true;
      })()`);
      await page.screenshot(path.join(OUT_DIR, '07-foliage-cell-edge-46m.png'));

      // 08, 09, 10: Marine cloth in run, crouch, and roll + combat hit check
      await page.evaluate(`(async () => {
        const T = window.TT;
        T.setWorldTime(0.35);
        const px = 18, pz = 0, py = T.sampleHeight(px, pz);
        T.player.position.set(px, py, pz);
        T.player.visible = true;
        T.setVelDbg(5.2, 0);
        await new Promise(r => setTimeout(r, 220));
        T.setShotView({ x: px + 1.1, y: py + 1.35, z: pz + 2.1, tx: px, ty: py + 0.95, tz: pz, fov: 40 });
        await new Promise(r => setTimeout(r, 120));
        return true;
      })()`);
      await page.screenshot(path.join(OUT_DIR, '08-marine-cloth-run.png'));

      await page.evaluate(`(async () => {
        const T = window.TT;
        const px = T.player.position.x, pz = T.player.position.z, py = T.sampleHeight(px, pz);
        T.setVelDbg(0, 0);
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC', key: 'c', bubbles: true }));
        await new Promise(r => setTimeout(r, 260));
        T.setShotView({ x: px - 1.3, y: py + 1.05, z: pz - 1.9, tx: px, ty: py + 0.72, tz: pz, fov: 40 });
        await new Promise(r => setTimeout(r, 120));
        return true;
      })()`);
      await page.screenshot(path.join(OUT_DIR, '09-marine-cloth-crouch.png'));

      await page.evaluate(`(async () => {
        const T = window.TT;
        document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyC', key: 'c', bubbles: true }));
        await new Promise(r => setTimeout(r, 100));
        const px = T.player.position.x, pz = T.player.position.z, py = T.sampleHeight(px, pz);
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
        await new Promise(r => setTimeout(r, 140));
        document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true }));
        T.setShotView({ x: px + 1.4, y: py + 1.25, z: pz - 1.8, tx: px, ty: py + 0.9, tz: pz, fov: 42 });
        await new Promise(r => setTimeout(r, 80));
        return true;
      })()`);
      await page.screenshot(path.join(OUT_DIR, '10-marine-cloth-jump-roll.png'));

      // Verify marine cloth meshes & combat hits (zombie attack + damagePlayer)
      const rawCloth = await page.evaluate(`(async () => {
        const T = window.TT;
        const clothMeshes = [];
        T.marine.traverse(o => {
          if (o.isMesh) {
            const bs = o.geometry?.boundingSphere;
            clothMeshes.push({
              name: o.name || '(unnamed)',
              visible: o.visible,
              frustumCulled: o.frustumCulled,
              bsRadius: bs ? +bs.radius.toFixed(3) : null
            });
          }
        });
        T.runDevCommand('godmode off');
        T.setArmor(0);
        T.setHp(100);
        const px = T.player.position.x, pz = T.player.position.z;
        T.spawnZombie(px + 0.65, pz, 'walker', true, false);
        await new Promise(r => setTimeout(r, 900));
        const hpAfterZombie = T.getHp();
        T.clearZombies();
        T.damagePlayer(10, 'bullet-test');
        const hpAfterRound = T.getHp();
        T.runDevCommand('godmode');
        T.setHp(100000);
        return JSON.stringify({
          clothMeshCount: clothMeshes.length,
          anyInvisibleSkin: clothMeshes.filter(m => !m.visible).map(m => m.name),
          hpAfterZombie,
          hpAfterRound,
          zombieHitWorked: hpAfterZombie < 100,
          roundHitWorked: hpAfterRound < hpAfterZombie
        });
      })()`);
      reportData.marineClothCheck = JSON.parse(rawCloth);

      // 11, 12, 13: CL-219 night shadows (sun < 0.05 redraws once as night comes and every 2.5 s)
      await page.evaluate(`(async () => {
        const T = window.TT;
        T.runDevCommand('night 20');
        await new Promise(r => setTimeout(r, 250));
        T.clearZombies();
        T.player.position.set(45, T.sampleHeight(45, 45), 45);
        T.setWorldTime(0.78);
        T.setShotView({ x: 0, y: ${gy} + 4.2, z: -15.0, tx: 0, ty: ${gy} + 2.2, tz: -2.0, fov: 50 });
        await new Promise(r => setTimeout(r, 250));
        return true;
      })()`);
      await page.screenshot(path.join(OUT_DIR, '11-night20-shadows-t0.png'));
      await sleep(1300);
      await page.screenshot(path.join(OUT_DIR, '12-night20-shadows-t1_3s.png'));
      await sleep(1400);
      await page.screenshot(path.join(OUT_DIR, '13-night20-shadows-t2_7s.png'));

      // 14..20: Follow-up live GPU looks for GP-19938 (ambulance), GP-19939 (merged zombie eyes), and GB-199 (hikers & fuel props)
      try {
        // GP-19938: ambulance at wrecks[0]
        await page.evaluate(`(async () => {
          const T = window.TT;
          T.setWorldTime(0.35);
          T.runDevCommand('site convoy');
          await new Promise(r => setTimeout(r, 220));
          T.player.visible = false;
          const w = T.POI.wrecks[0];
          const cy = T.sampleHeight(w.x, w.z);
          const q = w.mesh.quaternion;
          const eye = new T.THREE.Vector3(4.2, 2.2, -1.8).applyQuaternion(q);
          const look = new T.THREE.Vector3(0.4, 0.9, -0.4).applyQuaternion(q);
          T.setShotView({ x: w.x + eye.x, y: cy + eye.y, z: w.z + eye.z, tx: w.x + look.x, ty: cy + look.y, tz: w.z + look.z, fov: 46 });
          await new Promise(r => setTimeout(r, 200));
          return true;
        })()`);
        await page.screenshot(path.join(OUT_DIR, '14-gp19938-ambulance-closed.png'));

        await page.evaluate(`(async () => {
          const T = window.TT;
          const D = T.convoyDbg;
          if (D) {
            T.doAction();
            T.doAction();
            T.doAction();
            D.step(0.55);
          }
          await new Promise(r => setTimeout(r, 200));
          return true;
        })()`);
        await page.screenshot(path.join(OUT_DIR, '15-gp19938-ambulance-sleeper-open.png'));

        await page.evaluate(`(async () => {
          const T = window.TT;
          const c = T.POI.wrecks[0]?.mesh?.userData?.convoy;
          if (c?.setDoorOpen) c.setDoorOpen(false);
          if (c?.setJackProgress) c.setJackProgress(1);
          await new Promise(r => setTimeout(r, 200));
          return true;
        })()`);
        await page.screenshot(path.join(OUT_DIR, '16-gp19938-ambulance-raised.png'));

        // GP-19939: merged zombie eyes (screamer, spitter, demon, shambler)
        const rawGp19939 = await page.evaluate(`(async () => {
          const T = window.TT;
          T.clearZombies();
          T.setWorldTime(0.78);
          const base = { x: 25, z: 25 };
          const kinds = ['shambler', 'screamer', 'spitter', 'demon'];
          const out = {};
          kinds.forEach((k, i) => {
            const x = base.x + (i - 1.5) * 1.35, z = base.z;
            const zb = T.spawnZombie(x, z, k, true, false);
            if (zb) {
              zb.speed = 0; zb.baseSpeed = 0; zb.riseT = 0;
              zb.mesh.rotation.y = 0;
              out[k] = T.drawsOf(zb.mesh);
            }
          });
          const cy = T.sampleHeight(base.x, base.z);
          T.setShotView({ x: base.x, y: cy + 1.55, z: base.z + 4.4, tx: base.x, ty: cy + 1.15, tz: base.z, fov: 44 });
          await new Promise(r => setTimeout(r, 280));
          return JSON.stringify(out);
        })()`);
        reportData.gp19939 = JSON.parse(rawGp19939);
        await page.screenshot(path.join(OUT_DIR, '17-gp19939-merged-zombie-eyes.png'));

        // GB-199: hikers' kit & fuel depot props
        const rawGb199 = await page.evaluate(`(async () => {
          const T = window.TT;
          T.clearZombies();
          T.setWorldTime(0.36);
          const bag = T.scene.getObjectByName('hikers-bag');
          const bough = T.scene.getObjectByName('hikers-bough');
          const pump = T.scene.getObjectByName('fuel-pump');
          const can = T.scene.getObjectByName('jerrycan');
          const gen = T.scene.getObjectByName('hq-generator');
          const posOf = (o) => {
            if (!o) return null;
            o.updateMatrixWorld(true);
            const v = new T.THREE.Vector3();
            o.getWorldPosition(v);
            return { x: +v.x.toFixed(2), y: +v.y.toFixed(2), z: +v.z.toFixed(2), draws: T.drawsOf(o).length };
          };
          return JSON.stringify({
            bag: posOf(bag),
            bough: posOf(bough),
            pump: posOf(pump),
            can: posOf(can),
            gen: posOf(gen)
          });
        })()`);
        reportData.gb199 = JSON.parse(rawGb199);
        if (reportData.gb199?.bag) {
          const b = reportData.gb199.bag;
          await page.evaluate(`(async () => {
            window.TT.setShotView({ x: ${b.x} + 3.2, y: ${b.y} - 0.6, z: ${b.z} + 3.2, tx: ${b.x}, ty: ${b.y} + 0.1, tz: ${b.z}, fov: 45 });
            await new Promise(r => setTimeout(r, 250));
            return true;
          })()`);
          await page.screenshot(path.join(OUT_DIR, '18-gb199-hikers-bag-and-bough.png'));
        }
        if (reportData.gb199?.pump) {
          const p = reportData.gb199.pump;
          await page.evaluate(`(async () => {
            window.TT.setShotView({ x: ${p.x} + 2.2, y: ${p.y} + 1.35, z: ${p.z} + 2.4, tx: ${p.x}, ty: ${p.y} + 0.75, tz: ${p.z}, fov: 44 });
            await new Promise(r => setTimeout(r, 250));
            return true;
          })()`);
          await page.screenshot(path.join(OUT_DIR, '19-gb199-fuel-pump-and-jerrycan.png'));
        }
        if (reportData.gb199?.gen) {
          const g = reportData.gb199.gen;
          await page.evaluate(`(async () => {
            window.TT.setShotView({ x: ${g.x} + 1.8, y: ${g.y} + 1.1, z: ${g.z} + 1.9, tx: ${g.x}, ty: ${g.y} + 0.35, tz: ${g.z}, fov: 42 });
            await new Promise(r => setTimeout(r, 250));
            return true;
          })()`);
          await page.screenshot(path.join(OUT_DIR, '20-gb199-hq-generator.png'));
        }
      } catch (extraErr) {
        reportData.extraErr = String(extraErr);
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}

// 3. Run 3x Night 20 High bench --prof --cpu sequentially (reuses active DW_GAME_TEST_TOKEN)
fs.writeFileSync(path.join(OUT_DIR, 'bench3.jsonl'), '', 'utf8');
const runs = [];
for (let i = 1; i <= 3; i++) {
  const out = execFileSync(
    process.execPath,
    [path.join(ROOT, 'tools/bench.mjs'), '--night', '20', '--gfx', 'high', '--prof', '--cpu'],
    { cwd: ROOT, encoding: 'utf8', env: process.env, maxBuffer: 50 * 1024 * 1024 }
  );
  const jsonLine = out.split(/\r?\n/).find((l) => l.trim().startsWith('{') && l.trim().endsWith('}'));
  if (!jsonLine) throw new Error(`Run ${i} produced no JSON line:\n${out}`);
  const clean = jsonLine.trim();
  fs.appendFileSync(path.join(OUT_DIR, 'bench3.jsonl'), clean + '\n', 'utf8');
  fs.appendFileSync(PROF_JSONL, clean + '\n', 'utf8');
  const parsed = JSON.parse(clean);
  runs.push(parsed);
  console.log(`Run ${i}: fps=${parsed.fps} low=${parsed.low} frameMs=${parsed.prof?.frameMs} draws=${parsed.draws}`);
}

reportData.benchRuns = runs.map((r, i) => ({
  run: i + 1,
  fps: r.fps,
  low: r.low,
  hitches: r.hitches,
  draws: r.draws,
  tris: r.tris,
  frameMs: r.prof?.frameMs,
  gpuMs: r.prof?.gpuMs,
  top: r.prof?.top,
  censusDrawsByGroup: r.census?.draws?.byGroup?.slice(0, 15),
  censusDrawsByPart: r.census?.draws?.byPart?.slice(0, 15),
  censusNodes: r.census?.nodes,
  cpuTop: r.cpu?.top?.slice(0, 15),
  hasComputeBoundingSphere: JSON.stringify(r.cpu || {}).includes('computeBoundingSphere')
}));

fs.writeFileSync(path.join(OUT_DIR, 'ag97-summary.json'), JSON.stringify(reportData, null, 2), 'utf8');
console.log('Saved qa/2026-10-19-AG-97/ag97-summary.json');
