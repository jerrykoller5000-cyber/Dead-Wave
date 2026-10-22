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
    if (name) name.value = 'AG109';
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

async function runNightGlowChecks() {
  console.log('\n=== [AG-109] Running night close-look glow checks (zombie eyes + demon embers) ===');
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
      window.__ag109Errs = [];
      window.addEventListener('error', (e) => window.__ag109Errs.push(String(e.message || e.error)));
      window.addEventListener('unhandledrejection', (e) => window.__ag109Errs.push(String(e.reason)));
    })()`);

    // Jump to night 20 so it is pitch dark at night, clear wave zombies, and spawn zombies close to the camera/marine facing the camera
    const shot1Info = await page.evaluate(`(async () => {
      const T = window.TT;
      T.devJumpToNight(20, true);
      await new Promise((r) => setTimeout(r, 400));
      T.clearZombies();
      T.player.position.set(0, T.sampleHeight(0, 14), 14);
      await new Promise((r) => setTimeout(r, 250));
      const px = T.player.position.x, pz = T.player.position.z;
      const kinds = ['shambler', 'feral', 'drowned', 'military', 'brute', 'spitter', 'bomber', 'screamer'];
      const spawned = [];
      kinds.forEach((k, i) => {
        const offset = (i - (kinds.length - 1) / 2) * 1.35;
        const z = T.spawnZombie(px + offset, pz - 1.6 - (i % 2) * 1.1, k, true, true);
        if (z) {
          z.speed = 0;
          if (z.mesh) z.mesh.rotation.y = Math.PI; // face the camera so eyes/chest glow are directly visible
          spawned.push({
            kind: z.typeKey,
            emissiveIntensity: z.bodySkinMat ? z.bodySkinMat._emissiveIntensity : null
          });
        }
      });
      // Zoom camera in slightly for a close look at the glowing eyes at night
      const origCamPos = T.camera.position.clone();
      T.camera.position.set(px, T.player.position.y + 5.2, pz - 5.8);
      T.camera.lookAt(px, T.player.position.y + 1.1, pz - 1.8);
      await new Promise((r) => setTimeout(r, 400));
      return { spawned, origCam: [origCamPos.x, origCamPos.y, origCamPos.z], errs: window.__ag109Errs || [] };
    })()`);
    const shot1Path = path.join(__dirname, '01-night-zombies-eyes-glow.png');
    await page.screenshot(shot1Path);
    console.log('[AG-109] Saved 01-night-zombies-eyes-glow.png:', JSON.stringify(shot1Info));

    // Close look at Demon at night: glowing eyes, chest/body embers, and fire fists
    const shot2Info = await page.evaluate(`(async () => {
      const T = window.TT;
      T.clearZombies();
      const px = T.player.position.x, pz = T.player.position.z;
      const d1 = T.spawnZombie(px - 1.1, pz - 1.8, 'demon', true, true);
      const d2 = T.spawnZombie(px + 1.1, pz - 1.8, 'demon', true, true);
      if (d1) { d1.speed = 0; if (d1.mesh) d1.mesh.rotation.y = Math.PI - 0.25; }
      if (d2) { d2.speed = 0; if (d2.mesh) d2.mesh.rotation.y = Math.PI + 0.25; }
      T.camera.position.set(px, T.player.position.y + 4.2, pz - 4.8);
      T.camera.lookAt(px, T.player.position.y + 1.2, pz - 1.8);
      await new Promise((r) => setTimeout(r, 500));
      const inspectDemon = (z) => {
        if (!z || !z.mesh) return null;
        let fists = null;
        let bodyEmissive = z.bodySkinMat ? z.bodySkinMat._emissiveIntensity : null;
        z.mesh.traverse((o) => {
          if (o.name === 'demon-fire-fists') {
            fists = { visible: o.visible, count: o.count, castShadow: o.castShadow };
          }
        });
        return { alive: z.alive, bodyEmissive, fists };
      };
      return { d1: inspectDemon(d1), d2: inspectDemon(d2), errs: window.__ag109Errs || [] };
    })()`);
    const shot2Path = path.join(__dirname, '02-night-demon-embers-glow.png');
    await page.screenshot(shot2Path);
    console.log('[AG-109] Saved 02-night-demon-embers-glow.png:', JSON.stringify(shot2Info));

    return { shot1Info, shot2Info };
  } finally {
    await browser.close();
    await srv.close();
  }
}

async function main() {
  // 1. Run t270 (5 checks)
  const t270LogPath = path.join(__dirname, 't270.log');
  console.log('\n=== [AG-109] Running node tools/realtest.mjs t270 --all ===');
  const t270Res = spawnSync('node', ['tools/realtest.mjs', 't270', '--all'], {
    cwd: ROOT,
    env,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
  const t270Out = (t270Res.stdout || '') + (t270Res.stderr || '');
  fs.writeFileSync(t270LogPath, t270Out, 'utf8');
  console.log(t270Out.trim());
  if (t270Res.status !== 0) {
    throw new Error(`t270 failed with status ${t270Res.status}`);
  }

  // 2. 3x Night 20 High --prof
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
      console.log(`\n=== [AG-109] Reusing completed ${r.id}.log ===`);
      stdoutText = fs.readFileSync(runLogPath, 'utf8');
    } else {
      console.log(`\n=== [AG-109] Starting ${r.id}: node ${r.args.join(' ')} ===`);
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
      builds: parsed.prof?.builds,
      pipelines: parsed.prof?.pipelines
    };
    benchSummary.push(item);
    console.log(`[AG-109] ${r.id}: fps=${item.fps}, low=${item.low}, tick=${item.tickMs}ms`);
    console.log(`[AG-109] ${r.id} spikeCauses:`, JSON.stringify(item.spikeCauses));
    console.log(`[AG-109] ${r.id} builds:`, JSON.stringify(item.builds, null, 2));
    console.log(`[AG-109] ${r.id} pipelines.made:`, item.pipelines?.made);
  }

  // 3. Night close look at zombie eyes glow and demon embers glow
  const nightGlowChecks = await runNightGlowChecks();

  const summary = {
    t270Summary: t270Out.trim(),
    benchRuns: benchSummary,
    nightGlowChecks
  };
  const outPath = path.join(__dirname, 'ag109-summary.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`\n[AG-109] Wrote summary to ${outPath}`);
}

main().catch((err) => {
  console.error('[AG-109] ERROR:', err);
  process.exit(1);
});
