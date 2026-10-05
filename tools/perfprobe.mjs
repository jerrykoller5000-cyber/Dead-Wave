// tools/perfprobe.mjs — CL-116: where the frame goes. Real renderer (index.html), headless.
//   node tools/perfprobe.mjs training|hunt [seconds]
// Reports frames, draw calls, triangles, lights, visible meshes, and the main thread's top JS by self time.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const mode = process.argv[2] || 'training';
const secs = +(process.argv[3] || 8);
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${srv.origin}/index.html?debug=1`, { timeout: 240000 });
  await page.waitFor('!!window.TT', { timeout: 240000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));
  const run = (code, ms = 900000) => page.evaluate(`(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
  if (mode === 'training') {
    await run(`document.getElementById('playerName').value = 'Probe'; document.getElementById('modeTraining').click(); const t0 = Date.now(); while (!T.trainingDbg.state().active && Date.now() - t0 < 60000) await wait(200); await wait(${+(process.env.WARM || 6000)}); return true;`);
  } else {
    await run(`document.getElementById('playerName').value = 'Probe'; document.getElementById('modeHunt').click(); const t1 = Date.now(); while ((T.getPhase() !== 'prep' || document.body.classList.contains('deploying')) && Date.now() - t1 < 1500000) await wait(500); await wait(4000); return true;`);
  }
  const stats = `(() => { const T = window.TT, r = T.renderer, s = T.scene; let lights = 0, shadowLights = 0, meshes = 0, visMeshes = 0, tri = 0;
    s.traverse((o) => { if (o.isLight) { lights++; if (o.castShadow) shadowLights++; } if (o.isMesh) { meshes++; } });
    s.traverseVisible((o) => { if (o.isMesh || o.isInstancedMesh) visMeshes++; });
    const inf = (r.info && r.info.render) || {}; return { lights, shadowLights, meshes, visMeshes, calls: inf.drawCalls ?? inf.calls, tris: inf.triangles, far: T.camera ? T.camera.far : null }; })()`;
  console.log('scene', JSON.stringify(await page.evaluate(stats)));
  await page.send('Profiler.enable', {});
  await page.send('Profiler.setSamplingInterval', { interval: 500 });
  await page.evaluate(`window.__f = 0; window.__on = true; (function tick() { window.__f++; if (window.__on) requestAnimationFrame(tick); })(); window.__t0 = performance.now();`);
  await page.send('Profiler.start', {});
  await new Promise((r) => setTimeout(r, secs * 1000));
  const { profile } = await page.send('Profiler.stop', {});
  const fr = await page.evaluate(`(() => { window.__on = false; return { frames: window.__f, ms: performance.now() - window.__t0 }; })()`);
  console.log('frames', fr.frames, 'in', (fr.ms / 1000).toFixed(1), 's =', (fr.frames / fr.ms * 1000).toFixed(1), 'fps');
  console.log('scene', JSON.stringify(await page.evaluate(stats)));
  // Self time per function.
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  const dt = profile.timeDeltas; let total = 0;
  profile.samples.forEach((id, i) => { const n = byId.get(id); const d = dt[i] || 0; total += d; const f = n.callFrame; const k = (f.functionName || '(anon)') + ' ' + path.basename(f.url || '') + ':' + (f.lineNumber + 1); self.set(k, (self.get(k) || 0) + d); });
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  for (const [k, v] of top) console.log((v / total * 100).toFixed(1).padStart(5) + '%  ' + k);
  fs.writeFileSync(`/tmp/claude-0/profile-${mode}.json`, JSON.stringify(profile));
} finally {
  await browser.close();
  await srv.close();
}
process.exit(0);   // the server keeps the process alive otherwise
