import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
fs.mkdirSync(__dirname, { recursive: true });
fs.mkdirSync(path.join(ROOT, 'review', 'zombie-feet-GP19944'), { recursive: true });

const env = { ...process.env, DW_ALLOW_RAW_CDP: '1' };

function saveDataUrl(filePath, dataUrl) {
  const m = /^data:[^;]+;base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new Error('Invalid data URL for ' + filePath);
  fs.writeFileSync(filePath, Buffer.from(m[1], 'base64'));
}

async function captureBruteWalkSide() {
  console.log('\n=== [AG-107] Capturing GP-19944 Brute walking side view in Marine Inspector (real GPU) ===');
  const srv = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720']
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(`${srv.origin}/index.html?inspect`, { waitUntil: 'none', timeout: 240000 });
    await page.waitFor('!!(window.DWInspect && window.DWInspect.ready)', { timeout: 240000 });

    const bruteInfo = await page.evaluate(`(async () => {
      const D = window.DWInspect;
      await D.show('zombie.brute', { mode: 'walk', view: 'side', instant: true });
      D.overlay('grid', true);
      D.play();
      const ix = D._ix;
      const z = D.zombie.get();
      const ud = z?.mesh?.userData || {};
      const Three = ix.THREE;
      let minSoleRel = Infinity;
      let maxSoleRel = -Infinity;
      const tStart = ix.clock.gameTime;
      while (ix.clock.gameTime - tStart < 1.2) {
        await ix.nextFrame();
        z.mesh.updateMatrixWorld(true);
        for (const side of ['L', 'R']) {
          const ankle = ud['ankle' + side] || ud['leg' + side];
          if (ankle) {
            const box = new Three.Box3().setFromObject(ankle);
            if (Number.isFinite(box.min.y)) {
              const rel = box.min.y - z.mesh.position.y;
              if (rel < minSoleRel) minSoleRel = rel;
              if (rel > maxSoleRel) maxSoleRel = rel;
            }
          }
        }
      }
      D.pause();
      D.view({ yaw: 90, pitch: 4, margin: 1.15 }, { instant: true, follow: true });
      await ix.nextFrame();
      const png = await D.shot({ type: 'image/png' });
      const cur = D.current();
      return {
        id: 'zombie.brute',
        info: cur?.info,
        size: cur?.size,
        minSoleRel: Number.isFinite(minSoleRel) ? +minSoleRel.toFixed(4) : null,
        maxSoleRel: Number.isFinite(maxSoleRel) ? +maxSoleRel.toFixed(4) : null,
        png
      };
    })()`, 60000);
    console.log('[AG-107] Brute inspector info:', {
      id: bruteInfo.id,
      info: bruteInfo.info,
      size: bruteInfo.size,
      minSoleRel: bruteInfo.minSoleRel,
      maxSoleRel: bruteInfo.maxSoleRel
    });

    const outShot1 = path.join(__dirname, 'gp19944-brute-walk-side.png');
    const outShot2 = path.join(ROOT, 'review', 'zombie-feet-GP19944', 'brute-walk-after.png');
    saveDataUrl(outShot1, bruteInfo.png);
    fs.copyFileSync(outShot1, outShot2);
    delete bruteInfo.png;
    console.log('[AG-107] Saved Brute walking side view to:', outShot1, 'and', outShot2);

    // Also inspect why zombie-skin builds new vertex shaders on first draw
    const shaderProbe = await page.evaluate(`(async () => {
      try {
        const T = window.TT;
        const R = T && T.renderer;
        if (!T || !R || !R._pipelines) return { note: 'no TT.renderer._pipelines' };
        const beforeV = [...R._pipelines.programs.vertex.keys()];
        const z1 = T.spawnZombie(-4, 22, 'shambler', true, true);
        const z2 = T.spawnZombie(2, 22, 'shambler', true, true);
        const z3 = T.spawnZombie(8, 22, 'brute', true, true);
        R.render(T.scene, T.camera);
        const afterV = [...R._pipelines.programs.vertex.keys()];
        const addedV = afterV.filter((k) => !beforeV.includes(k));
        const diffs = [];
        if (addedV.length >= 2) {
          const a = addedV[0].split('\\n'), b = addedV[1].split('\\n');
          const maxL = Math.max(a.length, b.length);
          for (let i = 0; i < maxL; i++) {
            if (a[i] !== b[i]) diffs.push({ line: i + 1, a: a[i], b: b[i] });
          }
        }
        const s1 = z1?.mesh?.userData?.skinMesh;
        const s2 = z2?.mesh?.userData?.skinMesh;
        const s3 = z3?.mesh?.userData?.skinMesh;
        return {
          beforeCount: beforeV.length,
          afterCount: afterV.length,
          addedCount: addedV.length,
          skins: [s1, s2, s3].filter(Boolean).map((s) => ({
            bones: s.skeleton?.bones?.length,
            attrs: Object.keys(s.geometry?.attributes || {}).sort().join(','),
            customKey: s.material?.customProgramCacheKey ? s.material.customProgramCacheKey() : null,
            receiveShadow: s.receiveShadow,
            castShadow: s.castShadow
          })),
          diffs: diffs.slice(0, 20)
        };
      } catch (e) {
        return { err: String(e && e.stack || e) };
      }
    })()`);
    console.log('[AG-107] Shader probe:', JSON.stringify(shaderProbe, null, 2));

    return { outShot1, outShot2, bruteInfo, shaderProbe };
  } finally {
    await browser.close();
    await srv.close();
  }
}

async function main() {
  // 1. Run node tools/realtest.mjs t270 --all (or reuse existing t270.log)
  const t270LogPath = path.join(__dirname, 't270.log');
  let t270Out = '';
  if (fs.existsSync(t270LogPath) && fs.readFileSync(t270LogPath, 'utf8').includes('4 pass   0 fail')) {
    console.log('\n=== [AG-107] Reusing completed t270.log ===');
    t270Out = fs.readFileSync(t270LogPath, 'utf8');
    console.log(t270Out);
  } else {
    console.log('\n=== [AG-107] Running: node tools/realtest.mjs t270 --all ===');
    const t270Res = spawnSync('node', ['tools/realtest.mjs', 't270', '--all'], {
      cwd: ROOT,
      env,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024
    });
    t270Out = (t270Res.stdout || '') + (t270Res.stderr || '');
    fs.writeFileSync(t270LogPath, t270Out, 'utf8');
    console.log(t270Res.stdout);
    if (t270Res.status !== 0) {
      throw new Error(`realtest.mjs t270 exited with ${t270Res.status}: ${t270Res.stderr}`);
    }
  }

  // 2. Run 3x Night 20 High --prof (or reuse completed run-N.log)
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
      console.log(`\n=== [AG-107] Reusing completed ${r.id}.log ===`);
      stdoutText = fs.readFileSync(runLogPath, 'utf8');
    } else {
      console.log(`\n=== [AG-107] Starting ${r.id}: node ${r.args.join(' ')} ===`);
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
    console.log(`[AG-107] ${r.id}: fps=${item.fps}, low=${item.low}, tick=${item.tickMs}ms`);
    console.log(`[AG-107] ${r.id} spikeCauses:`, JSON.stringify(item.spikeCauses));
    console.log(`[AG-107] ${r.id} pipelines:`, JSON.stringify(item.pipelines, null, 2));
  }

  // 3. Capture GP-19944 Brute walking side view in Marine Inspector
  const bruteCheck = await captureBruteWalkSide();

  const summary = {
    t270Output: t270Out.trim(),
    benchRuns: benchSummary,
    bruteCheck
  };
  const outPath = path.join(__dirname, 'ag107-summary.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`\n[AG-107] Wrote summary to ${outPath}`);
}

main().catch((err) => {
  console.error('[AG-107] ERROR:', err);
  process.exit(1);
});
