// qa/2026-11-18-AG-357/run-bench-step3.mjs
// Exclusive 5080 WebGPU 30-shambler (and 120-shambler stress) benchmark runner for AG-357 Step 3.
// Must run through the exclusive game-test slot:
//   node crew/crew.mjs slot run antigravity AG-357 --exclusive --checks "AG-357 Step 3 exclusive 5080 WebGPU 30-shambler benchmark" -- node qa/2026-11-18-AG-357/run-bench-step3.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const FRAMES_DIR = path.join(HERE, 'frames-step3');
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: [
    '--window-size=1280,820',
    '--window-position=40,40',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    '--disable-gpu-vsync'
  ]
});

let code = 0;
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  const url = `${server.origin}/qa/2026-11-18-AG-357/bench-step3.html?w=1280&h=720`;
  await page.goto(url, { timeout: 120000 });
  const ok = await page.waitFor('window.__AG357Bench && window.__AG357Bench.ready', { timeout: 120000 });
  if (!ok) throw new Error('Bench page did not initialize: ' + page.errors.join(' | '));

  const backend = await page.evaluate('window.__AG357Bench.backend');
  const adapter = await page.evaluate('window.__AG357Bench.gpuAdapterInfo');
  const hasTs = await page.evaluate('window.__AG357Bench.hasGpuTimestamp');
  const vp = { w: 1280, h: 720 };
  console.log(`Backend=${backend} Adapter=${adapter} gpuTimestamp=${hasTs}`);

  const screenshots = {};
  const results30 = [];
  const modes30 = [
    'OURS_NOW',
    'STEP2_UNMERGED',
    'STEP3_ATLAS_1K',
    'STEP3_ATLAS_512',
    'STEP3_LOD1_15M',
    'STEP3_MIXED_HORDE'
  ];

  console.log('\n=== RUNNING 30 SHAMBLERS (1280x720 WebGPU w/ Shadows) ===');
  for (const m of modes30) {
    const capture = (m === 'OURS_NOW' || m === 'STEP3_MIXED_HORDE');
    const r = await page.evaluate(
      `window.__AG357Bench.runMode(${JSON.stringify(m)}, 30, 35, 90, ${capture})`,
      120000
    );
    if (r.pngDataUrl) {
      const buf = Buffer.from(r.pngDataUrl.split(',')[1], 'base64');
      const fname = m === 'OURS_NOW' ? 'bench-30-ours.png' : 'bench-30-step3-mixed.png';
      fs.writeFileSync(path.join(FRAMES_DIR, fname), buf);
      screenshots[m] = `qa/2026-11-18-AG-357/frames-step3/${fname}`;
      delete r.pngDataUrl;
    }
    results30.push(r);
    console.log(
      `${r.mode.padEnd(18)} | tris=${String(r.totalTris).padStart(7)} | draws=${String(r.renderCallsSample).padStart(4)} | mats=${r.uniqueMats} | tex=${String(r.texMB).padStart(5)}MB | rAF=${String(r.fps).padStart(5)}fps (1%:${r.low1PctFps}) | cpu=${r.cpuSubmitAvgMs}ms | gpu=${r.gpuPassAvgMs}ms`
    );
  }

  console.log('\n=== RUNNING 120 SHAMBLERS STRESS (4x Horde, 1280x720 WebGPU w/ Shadows — Step 2 omitted, >150s @ 60+) ===');
  const resultsStress = [];
  const stressModes = ['OURS_NOW', 'STEP3_ATLAS_512', 'STEP3_MIXED_HORDE'];
  for (const m of stressModes) {
    const r = await page.evaluate(
      `window.__AG357Bench.runMode(${JSON.stringify(m)}, 120, 25, 75, false)`,
      90000
    );
    delete r.pngDataUrl;
    resultsStress.push(r);
    console.log(
      `${r.mode.padEnd(18)} | tris=${String(r.totalTris).padStart(7)} | draws=${String(r.renderCallsSample).padStart(4)} | mats=${r.uniqueMats} | tex=${String(r.texMB).padStart(5)}MB | rAF=${String(r.fps).padStart(5)}fps (1%:${r.low1PctFps}) | cpu=${r.cpuSubmitAvgMs}ms | gpu=${r.gpuPassAvgMs}ms`
    );
  }

  const report = {
    at: new Date().toISOString(),
    viewport: vp,
    backend,
    gpuAdapterInfo: adapter,
    hasGpuTimestamp: hasTs,
    stressCount: 120,
    results30,
    resultsStress,
    screenshots,
    errors: page.errors
  };
  fs.writeFileSync(path.join(HERE, 'bench-step3-report.json'), JSON.stringify(report, null, 2));

  if (page.errors.length) console.log('Page errors:', page.errors.join(' | '));
  console.log('DONE AG-357 Step 3 exclusive 5080 WebGPU benchmark.');
} catch (err) {
  console.error('BENCH FAILED:', err && err.stack ? err.stack : err);
  code = 1;
} finally {
  await browser.close().catch(() => {});
  if (server && server.close) server.close();
}
process.exit(code);
