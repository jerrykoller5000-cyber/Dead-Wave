// tools/perfsim.mjs — CL-117: where the main thread's time and garbage go during a fight. Real renderer, headless.
//   node tools/perfsim.mjs hunt|training [zombies=40] [seconds=20]
// Starts the game, calls in zombies, then records a CPU profile (self time by function, idle excluded), an allocation
// sampling profile (which functions make the garbage that becomes collector pauses), long tasks, and the sim step's
// own timing from the game's perf window.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const mode = process.argv[2] || 'hunt';
const nz = +(process.argv[3] || 40);
const secs = +(process.argv[4] || 20);
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${srv.origin}/index.html?debug=1`, { timeout: 240000 });
  await page.waitFor('!!window.TT', { timeout: 240000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  const run = (code, ms = 1800000) => page.evaluate(`(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
  if (mode === 'training') {
    await run(`document.getElementById('playerName').value = 'Probe'; document.getElementById('modeTraining').click(); const t0 = Date.now(); while (!T.trainingDbg.state().active && Date.now() - t0 < 60000) await wait(200); await wait(8000);
      const tg = T.trainingDbg.tg(); T.player.position.set(tg.origin.x - 14, tg.floorY, tg.origin.z - 6); T.trainingDbg.spawn('shambler', Math.min(10, ${nz})); if (${nz} > 10) T.trainingDbg.spawn('feral', Math.min(10, ${nz} - 10)); await wait(2000); return T.trainingDbg.alive();`);
  } else {
    await run(`document.getElementById('playerName').value = 'Probe'; document.getElementById('modeHunt').click(); const t1 = Date.now(); while ((T.getPhase() !== 'prep' || document.body.classList.contains('deploying')) && Date.now() - t1 < 1500000) await wait(500);
      T.skipGrace && T.skipGrace(); T.addCash(1e6); T.grantAllWeapons(); T.setWeapon(1);
      const p = T.player.position; let made = 0; for (let i = 0; i < ${nz}; i++) { const a = i / ${nz} * Math.PI * 2, r = 14 + (i % 3) * 3; if (T.spawnZombie(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r, ['shambler', 'feral', 'spider', 'military', 'brute', 'spitter'][i % 6], true, true)) made++; }
      T.setMouseFireDbg && T.setMouseFireDbg(true); await wait(2000); return made;`);
  }
  console.log('zombies', await run(`return T.zombies.filter((z) => z.alive).length;`));
  // Long tasks and the game's own frame samples.
  await page.evaluate(`window.__long = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] }); } catch (e) {} window.__f = 0; window.__on = true; (function tick() { window.__f++; if (window.__on) requestAnimationFrame(tick); })(); window.__t0 = performance.now();`);
  await page.send('Profiler.enable', {});
  await page.send('Profiler.setSamplingInterval', { interval: 250 });
  await page.send('HeapProfiler.enable', {});
  await page.send('HeapProfiler.startSampling', { samplingInterval: 16384 });
  await page.send('Profiler.start', {});
  await new Promise((r) => setTimeout(r, secs * 1000));
  const { profile } = await page.send('Profiler.stop', {});
  const heap = await page.send('HeapProfiler.stopSampling', {});
  const fr = await page.evaluate(`(() => { window.__on = false; return { frames: window.__f, ms: performance.now() - window.__t0, long: window.__long.slice().sort((a, b) => b - a).slice(0, 12), nlong: window.__long.length }; })()`);
  console.log('frames', fr.frames, 'in', (fr.ms / 1000).toFixed(1), 's =', (fr.frames / fr.ms * 1000).toFixed(2), 'fps; long tasks', fr.nlong, 'worst', fr.long.join(','));
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map(); const dt = profile.timeDeltas; let total = 0, busy = 0;
  profile.samples.forEach((id, i) => { const n = byId.get(id); const d = dt[i] || 0; total += d; const f = n.callFrame; const name = f.functionName || '(anon)';
    if (name === '(idle)') return; busy += d;
    const k = name + ' ' + path.basename(f.url || '').replace(/\?.*$/, '') + ':' + (f.lineNumber + 1); self.set(k, (self.get(k) || 0) + d); });
  console.log('\n--- CPU self time (of ' + (busy / 1000).toFixed(0) + ' ms busy, ' + (total / 1000).toFixed(0) + ' ms total)');
  for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 45)) console.log((v / busy * 100).toFixed(1).padStart(5) + '%  ' + (v / 1000).toFixed(0).padStart(6) + 'ms  ' + k);
  // Allocation: bytes sampled per function, with its caller.
  const alloc = new Map(); let atotal = 0;
  const walk = (n, parent) => { const f = n.callFrame; const me = (f.functionName || '(anon)') + ' ' + path.basename(f.url || '').replace(/\?.*$/, '') + ':' + (f.lineNumber + 1);
    const b = n.selfSize || 0; if (b) { atotal += b; const k = me + '   <- ' + (parent || ''); alloc.set(k, (alloc.get(k) || 0) + b); }
    for (const c of n.children || []) walk(c, me); };
  walk(heap.profile.head, '');
  console.log('\n--- allocations (of ' + (atotal / 1048576).toFixed(1) + ' MB sampled)');
  for (const [k, v] of [...alloc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log((v / atotal * 100).toFixed(1).padStart(5) + '%  ' + (v / 1024).toFixed(0).padStart(7) + 'KB  ' + k);
  fs.writeFileSync(`/tmp/claude-0/sim-${mode}.cpu.json`, JSON.stringify(profile));
  fs.writeFileSync(`/tmp/claude-0/sim-${mode}.heap.json`, JSON.stringify(heap.profile));
} finally { await browser.close(); await srv.close(); }
process.exit(0);   // the server keeps the process alive otherwise
