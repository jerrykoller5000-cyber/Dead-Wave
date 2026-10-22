import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
fs.mkdirSync(__dirname, { recursive: true });

const env = { ...process.env, DW_ALLOW_RAW_CDP: '1' };

async function startMatchOnPage(page) {
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 250))');
  }
  await page.waitFor('!!window.TT && !!window.TT.spawnMegaswarm', { timeout: 180000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });

  await page.evaluate(`(() => {
    TT.applyGraphicsPreset('high');
    const name = document.getElementById('playerName');
    if (name) name.value = 'AG108';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 60000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  await page.evaluate(`(() => {
    TT.runDevCommand('godmode');
    TT.unlockAllBuilds();
    TT.addCash(200000);
  })()`);
}

async function runVisualChecks() {
  console.log('\n=== [AG-108] Running High-graphics visual checks after CL-229 ===');
  const srv = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720']
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(`${srv.origin}/index.html?debug=1`, { waitUntil: 'none', timeout: 240000 });
    await startMatchOnPage(page);

    await page.evaluate(`(() => {
      window.__ag108Errs = [];
      window.addEventListener('error', (e) => window.__ag108Errs.push(String(e.message || e.error)));
      window.addEventListener('unhandledrejection', (e) => window.__ag108Errs.push(String(e.reason)));
    })()`);

    // 1. Marine, built walls, turrets (light, flame, heavy, m240), and trees
    const shot1Info = await page.evaluate(`(async () => {
      const T = window.TT;
      T.clearZombies();
      const p = T.player.position;
      const gx = T.gridIndex(p.x), gz = T.gridIndex(p.z);
      const placeAt = (mode, cx, cz) => {
        T.setPlaceMode(mode);
        const tx = T.gridCentre(cx), tz = T.gridCentre(cz), ty = T.sampleHeight(tx, tz);
        const c = T.camera.position;
        T.setAimRay(c.x, c.y, c.z, tx - c.x, ty - c.y, tz - c.z);
        T.updateGhostPreview();
        T.tryPlace();
      };
      placeAt('wall', gx - 2, gz - 3);
      placeAt('wall', gx - 1, gz - 3);
      placeAt('barricade', gx, gz - 3);
      placeAt('light', gx + 1, gz - 3);
      placeAt('flame', gx + 2, gz - 3);
      placeAt('heavy', gx - 2, gz - 2);
      placeAt('m240', gx + 2, gz - 2);
      T.setPlaceMode(null);
      await new Promise((r) => setTimeout(r, 800));
      return { builds: T.builds ? T.builds.length : 0, gfx: T.getGfx() };
    })()`);
    const shot1Path = path.join(__dirname, '01-marine-walls-turrets-trees.png');
    await page.screenshot(shot1Path);
    console.log('[AG-108] Saved 01-marine-walls-turrets-trees.png:', shot1Info);

    // 1b. Trees (tree-batch) near perimeter
    const shot1bInfo = await page.evaluate(`(async () => {
      const T = window.TT;
      const origX = T.player.position.x, origZ = T.player.position.z;
      let tx = -32, tz = -20;
      if (T.scene) {
        T.scene.traverse((o) => {
          if (o.name === 'tree-batch' && o.isInstancedMesh && o.count > 0 && o.instanceMatrix) {
            const m = o.instanceMatrix.array;
            if (m && m.length >= 16) { tx = m[12]; tz = m[14] + 3.5; }
          }
        });
      }
      T.player.position.set(tx, T.sampleHeight(tx, tz), tz);
      await new Promise((r) => setTimeout(r, 600));
      return { origX, origZ, treeViewX: tx, treeViewZ: tz };
    })()`);
    const shot1bPath = path.join(__dirname, '01b-trees-batch.png');
    await page.screenshot(shot1bPath);
    console.log('[AG-108] Saved 01b-trees-batch.png:', shot1bInfo);

    // 2. Zombies of common/special kinds walking
    const shot2Info = await page.evaluate(`(async () => {
      const T = window.TT;
      T.player.position.set(${JSON.stringify(0)}, T.sampleHeight(0, 14), 14);
      while (T.builds && T.builds.length) {
        const b = T.builds.pop();
        if (b && b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh);
      }
      T.clearZombies();
      await new Promise((r) => setTimeout(r, 300));
      const px = T.player.position.x, pz = T.player.position.z;
      const kinds = ['shambler', 'feral', 'drowned', 'military', 'brute', 'spitter', 'bomber', 'leaper', 'spider'];
      const spawned = [];
      kinds.forEach((k, i) => {
        const offset = (i - (kinds.length - 1) / 2) * 1.45;
        const z = T.spawnZombie(px + offset, pz - 2.8 - (i % 2) * 1.3, k, true, true);
        if (z) spawned.push(z.typeKey);
      });
      await new Promise((r) => setTimeout(r, 800));
      return { spawned };
    })()`);
    const shot2Path = path.join(__dirname, '02-zombies-walking.png');
    await page.screenshot(shot2Path);
    console.log('[AG-108] Saved 02-zombies-walking.png:', shot2Info);

    // 3. Demon's fire fists
    const shot3Info = await page.evaluate(`(async () => {
      const T = window.TT;
      T.clearZombies();
      const px = T.player.position.x, pz = T.player.position.z;
      const d1 = T.spawnZombie(px - 1.2, pz - 4.8, 'demon', true, true);
      const d2 = T.spawnZombie(px + 1.2, pz - 5.4, 'demon', true, true);
      await new Promise((r) => setTimeout(r, 900));
      const checkDemon = (z) => {
        if (!z || !z.mesh) return null;
        let fists = null;
        z.mesh.traverse((o) => { if (o.name === 'demon-fire-fists') fists = { visible: o.visible, count: o.count, castShadow: o.castShadow }; });
        return { alive: z.alive, fists };
      };
      return { d1: checkDemon(d1), d2: checkDemon(d2) };
    })()`);
    const shot3Path = path.join(__dirname, '03-demon-fire-fists.png');
    await page.screenshot(shot3Path);
    console.log('[AG-108] Saved 03-demon-fire-fists.png:', shot3Info);

    // 4. Screamer's vapour and shield
    const shot4Info = await page.evaluate(`(async () => {
      const T = window.TT;
      T.clearZombies();
      const px = T.player.position.x, pz = T.player.position.z;
      const s1 = T.spawnZombie(px - 1.1, pz - 4.6, 'screamer', true, true);
      const s2 = T.spawnZombie(px + 1.1, pz - 5.2, 'screamer', true, true);
      if (s1) { s1.sonicOpenT = 0; s1.sonicHitT = 0.16; }
      if (s2) { s2.sonicOpenT = 0; s2.sonicHitT = 0.16; }
      await new Promise((r) => setTimeout(r, 700));
      if (s1) s1.sonicHitT = 0.16;
      if (s2) s2.sonicHitT = 0.16;
      await new Promise((r) => setTimeout(r, 100));
      const checkScreamer = (z) => {
        if (!z || !z.mesh) return null;
        let shield = null, vapor = null;
        z.mesh.traverse((o) => {
          if (o.name === 'screamer-sonic-shield') shield = { visible: o.visible };
          if (o.name === 'screamer-black-vapor') vapor = { visible: o.visible, count: o.count };
        });
        return { alive: z.alive, shield, vapor };
      };
      return { s1: checkScreamer(s1), s2: checkScreamer(s2) };
    })()`);
    const shot4Path = path.join(__dirname, '04-screamer-vapour-shield.png');
    await page.screenshot(shot4Path);
    console.log('[AG-108] Saved 04-screamer-vapour-shield.png:', shot4Info);

    // 5. Bosses (Colossus + Guardian) walking
    const shot5Info = await page.evaluate(`(async () => {
      const T = window.TT;
      T.clearZombies();
      const px = T.player.position.x, pz = T.player.position.z;
      const c1 = T.spawnZombie(px - 2.6, pz - 3.2, 'colossus', true, true);
      const g1 = T.spawnZombie(px + 2.6, pz - 3.2, 'guardian', true, true);
      await new Promise((r) => setTimeout(r, 800));
      return { colossus: !!c1?.alive, guardian: !!g1?.alive };
    })()`);
    const shot5Path = path.join(__dirname, '05-bosses-colossus-guardian.png');
    await page.screenshot(shot5Path);
    console.log('[AG-108] Saved 05-bosses-colossus-guardian.png:', shot5Info);

    // 6. Night 20 push 6/6 live view at High
    const shot6Info = await page.evaluate(`(async () => {
      const T = window.TT;
      T.clearZombies();
      T.devJumpToNight(20, true);
      const st = () => T.getWaveDirectorState();
      const up = () => (T.zombies || []).filter((z) => z.alive && !z.dying).length;
      const cap = T.MAX_ZOMBIES || 48;
      for (let i = 0; i < 40; i++) {
        let steps = 0;
        while (steps++ < 250) {
          const pc = st().pace;
          const onLast = !!(pc && pc.pushes > 0 && pc.push === pc.pushes - 1 && !pc.inLull);
          if (onLast) {
            if (up() >= cap || (pc.left <= 0 && up() > 0)) break;
            T.spawnWaveBatch(0.25);
            continue;
          }
          if (!pc || pc.inLull || up() > 6) T.clearZombies();
          T.spawnWaveBatch(0.5);
        }
        const pc = st().pace;
        if (pc && pc.push === pc.pushes - 1 && !pc.inLull && up() >= cap) break;
      }
      await new Promise((r) => setTimeout(r, 6500));
      return { alive: up(), errs: window.__ag108Errs || [] };
    })()`, 120000);
    const shot6Path = path.join(__dirname, '06-night20-high-horde.png');
    await page.screenshot(shot6Path);
    console.log('[AG-108] Saved 06-night20-high-horde.png:', shot6Info);

    return {
      shot1Info,
      shot1bInfo,
      shot2Info,
      shot3Info,
      shot4Info,
      shot5Info,
      shot6Info
    };
  } finally {
    await browser.close();
    await srv.close();
  }
}

async function main() {
  const runs = [
    { id: 'run-1', args: ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof'] },
    { id: 'run-2', args: ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof'] },
    { id: 'run-3', args: ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof'] }
  ];

  const benchSummary = [];
  for (const r of runs) {
    const runLogPath = path.join(__dirname, `${r.id}.log`);
    let stdoutText = '';
    if (fs.existsSync(runLogPath) && fs.readFileSync(runLogPath, 'utf8').trim().endsWith('}')) {
      console.log(`\n=== [AG-108] Reusing completed ${r.id}.log ===`);
      stdoutText = fs.readFileSync(runLogPath, 'utf8');
    } else {
      console.log(`\n=== [AG-108] Starting ${r.id}: node ${r.args.join(' ')} ===`);
      const res = spawnSync('node', r.args, {
        cwd: ROOT,
        env,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024
      });
      stdoutText = res.stdout || '';
      fs.writeFileSync(runLogPath, stdoutText, 'utf8');
      if (res.stderr) {
        fs.writeFileSync(path.join(__dirname, `${r.id}.stderr.log`), res.stderr, 'utf8');
      }
      if (res.status !== 0) {
        throw new Error(`${r.id} exited with ${res.status}: ${res.stderr}`);
      }
    }
    const lines = stdoutText.trim().split(/\r?\n/);
    const parsed = JSON.parse(lines[lines.length - 1]);
    const item = {
      id: r.id,
      fps: parsed.fps,
      low: parsed.low,
      worst: parsed.worst,
      hitches: parsed.hitches,
      draws: parsed.draws,
      triangles: parsed.triangles,
      frameMs: parsed.prof?.frameMs,
      tickMs: parsed.prof?.tickMs,
      outsideMs: parsed.prof?.outsideMs,
      gpuMs: parsed.prof?.gpuMs,
      spikeCauses: parsed.prof?.spikeCauses,
      spikes: parsed.prof?.spikes,
      pipelines: parsed.prof?.pipelines
    };
    benchSummary.push(item);
    console.log(`[AG-108] ${r.id}: fps=${item.fps}, low=${item.low}, tick=${item.tickMs}ms`);
    console.log(`[AG-108] ${r.id} spikeCauses:`, JSON.stringify(item.spikeCauses));
    console.log(`[AG-108] ${r.id} pipelines:`, JSON.stringify(item.pipelines, null, 2));
  }

  const visualChecks = await runVisualChecks();

  const summary = {
    benchRuns: benchSummary,
    visualChecks
  };
  const outPath = path.join(__dirname, 'ag108-summary.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`\n[AG-108] Wrote summary to ${outPath}`);
}

main().catch((err) => {
  console.error('[AG-108] ERROR:', err);
  process.exit(1);
});
