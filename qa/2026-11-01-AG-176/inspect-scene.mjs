import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  console.log('Loading Tiny Trek with ?debug=1&bundles=1 ...');
  await page.goto(`${server.origin}/index.html?debug=1&bundles=1&raf=timer`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);

  const initData = await page.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'AG176-probe');
    T.clearZombies && T.clearZombies();
    T.setHp(1e5);
    T.setWorldTime(0.42);
    if (T.weather) { T.weather.raining = false; T.weather.intensity = 0; }
    T.setViewFirstDbg(true);
    if (T.runDevCommand) T.runDevCommand('godmode');
    await new Promise((r) => setTimeout(r, 1500));

    // Inspect trees
    const treeCounts = {};
    for (const t of T.trees) {
      treeCounts[t.kind] = (treeCounts[t.kind] || 0) + 1;
    }

    // Find autumn trees and nearby pine/birch
    const autumns = T.trees.filter(t => t.kind === 'autumn' && t.alive && !t.stump && !t.falling);
    const pines = T.trees.filter(t => t.kind === 'pine' && t.alive && !t.stump && !t.falling);
    const birches = T.trees.filter(t => t.kind === 'birch' && t.alive && !t.stump && !t.falling);

    // Tree batch stats
    const tbStats = T.treeBatchStats();

    // Foliage stats
    const chunks = T.foliageChunks || [];
    const bundleGroup = T.scene.children.find(c => c.name === 'ground-foliage-bundle');

    return {
      renderer: T.renderer.backend ? (T.renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL') : 'Unknown',
      treeCounts,
      autumnCount: autumns.length,
      pineCount: pines.length,
      birchCount: birches.length,
      autumnSample: autumns.slice(0, 5).map(t => ({ x: +t.x.toFixed(1), z: +t.z.toFixed(1), scale: +t.scale.toFixed(2) })),
      tbStats,
      foliageChunksCount: chunks.length,
      hasBundleGroup: !!bundleGroup,
      bundleGroupChildren: bundleGroup ? bundleGroup.children.length : 0
    };
  })()`);

  console.log('Inspection Data:', JSON.stringify(initData, null, 2));

} finally {
  try { await browser.close(); } catch (_) {}
  try { server.close(); } catch (_) {}
}
