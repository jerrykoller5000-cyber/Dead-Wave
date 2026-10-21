// Claude (CL-28): how long the frame's matrix pass takes, from the title screen.
// node tools/matbench.mjs <label>
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs'; import { launch } from './cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await serve(ROOT, 0); const browser = await launch({ headless: true });
const page = await browser.newPage({ width: 320, height: 240 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const poll = async (expr, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await page.evaluate(expr)) return true; } catch {} await sleep(500); } return false; };
await page.goto(`${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`, { timeout: 120000 });
await poll('!!window.DWOpening', 60000);
for (let i = 0; i < 2; i++) { await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); else { const b = document.getElementById('openingSkip'); if (b) b.click(); } return true; })()`); await sleep(300); }
await poll('!!window.TT', 300000);
await poll('window.DWOpening.active === false', 120000);
await sleep(3000);
const r = await page.evaluate(`JSON.stringify((() => {
  const S = TT.scene; let n = 0, auto = 0; S.traverse((o) => { n++; if (o.matrixAutoUpdate) auto++; });
  // What the renderer does each frame: scene.updateMatrixWorld(). Time it 200 times, best of 5 runs.
  const runs = [];
  for (let k = 0; k < 5; k++) { const t0 = performance.now(); for (let i = 0; i < 200; i++) S.updateMatrixWorld(); runs.push((performance.now() - t0) / 200); }
  runs.sort((a, b) => a - b);
  const tb = TT.treeBatchStats ? TT.treeBatchStats() : {};
  return { objects: n, autoUpdate: auto, msPerFrame: +runs[0].toFixed(3), msMedian: +runs[2].toFixed(3), batched: tb.batched, live: tb.live };
})())`);
console.log(process.argv[2] || '', r);
try { await browser.close(); } catch {} process.exit(0);
