// GP-20122 (claude2): what the ~830 MB live heap at the CIF station is, by where it was allocated. Sampling heap
// profiler on from before the page loads; Training, the CIF front, 10 s idle, a full GC, then the live samples by site
// and by file. Writes review/GP-20122/heapsites-<label>.json.
// Run through the slot: node crew/crew.mjs slot run claude2 GP-20122 --checks "heap sites" -- node review/GP-20122/heapsites.mjs <label>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20122');
const label = process.argv[2] || 'now';
const headless = process.env.HEADLESS === '1';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const result = { at: new Date().toISOString(), label, errors: [] };
const server = await serve(root, 0);
const browser = await launch({ headless, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.send('HeapProfiler.enable', {});
  await page.send('HeapProfiler.startSampling', { samplingInterval: 65536 });
  await page.goto(server.origin + '/index.html?debug=1', { timeout: 400000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 400000 })) throw Error('Load not ready');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('!window.DWOpening || window.DWOpening.active===false', { timeout: 500000 });
  await page.evaluate('(()=>{document.getElementById("playerName").value="GP-20122 heap";document.getElementById("modeTraining").click()})()');
  if (!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 400000 })) throw Error('Training entry not ready');
  await page.evaluate('(()=>{const t=TT.trainingDbg.tg(),f=t.stations.cif.front;TT.player.position.set(f.x,t.floorY,f.z)})()');
  await pause(10000);
  await page.send('HeapProfiler.collectGarbage', {});
  await pause(1000);
  result.mem = await page.evaluate('({usedMB:+(performance.memory.usedJSHeapSize/1e6).toFixed(1), totalMB:+(performance.memory.totalJSHeapSize/1e6).toFixed(1), geometries:TT.renderer.info.memory.geometries, textures:TT.renderer.info.memory.textures, backend:TT.renderer.backend?.constructor?.name})');
  const prof = (await page.send('HeapProfiler.getSamplingProfile', {}, 300000)).profile;
  await page.send('HeapProfiler.stopSampling', {}, 300000);
  const strip = (u) => String(u || '').replace(/^https?:\/\/127\.0\.0\.1:\d+\//, '').replace(/\?.*$/, '');
  const bySite = new Map(), byFile = new Map(), byStack = new Map();
  let total = 0;
  const walk = (n, stack) => {
    const f = n.callFrame || {};
    const site = `${f.functionName || '(anon)'} ${strip(f.url)}:${(f.lineNumber || 0) + 1}`;
    const st = [...stack, site];
    if (n.selfSize) {
      total += n.selfSize;
      bySite.set(site, (bySite.get(site) || 0) + n.selfSize);
      const file = strip(f.url) || '(native)';
      byFile.set(file, (byFile.get(file) || 0) + n.selfSize);
      // the nearest frame in game code (not vendor) names who asked for it
      const own = [...st].reverse().find((s) => !/vendor\/|^\(|:0$/.test(s)) || site;
      const k = own + '  >>  ' + site;
      byStack.set(k, (byStack.get(k) || 0) + n.selfSize);
    }
    for (const c of n.children || []) walk(c, st);
  };
  walk(prof.head, []);
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ mb: +(v / 1e6).toFixed(2), k }));
  result.liveSampledMB = +(total / 1e6).toFixed(1);
  result.byFile = top(byFile, 30); result.bySite = top(bySite, 60); result.byOwner = top(byStack, 80);
  result.errors = page.errors.slice();
  console.log(JSON.stringify({ label, mem: result.mem, liveSampledMB: result.liveSampledMB, byFile: result.byFile.slice(0, 15), bySite: result.bySite.slice(0, 25) }, null, 1).slice(0, 12000));
} catch (error) {
  result.failure = String(error?.stack || error); console.error(result.failure); process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(out, `heapsites-${label}.json`), JSON.stringify(result, null, 1) + '\n', 'utf8');
  await browser.close(); await server.close();
}
