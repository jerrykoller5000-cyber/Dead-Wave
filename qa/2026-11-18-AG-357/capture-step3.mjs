// qa/2026-11-18-AG-357/capture-step3.mjs
// Captures updated Step 2 (fixed flat back straps + closed profile jaw) AND Step 3 (1K vs 512 atlas, 15m+ LOD).
// Must run through the shared game-test slot:
//   node crew/crew.mjs slot run antigravity AG-357 --checks "AG-357 Step 2 fixes + Step 3 atlas/LOD WebGPU capture" -- node qa/2026-11-18-AG-357/capture-step3.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const FRAMES_DIR = path.join(HERE, 'frames-step3');
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=800,1000', '--window-position=-2400,-2400'] });

let code = 0;
try {
  const page = await browser.newPage({ width: 720, height: 900 });
  const url = `${server.origin}/review/AG-357/index.html?capture=1&step=3&light=noon&w=720&h=900`;
  await page.goto(url, { timeout: 120000 });
  const ok = await page.waitFor('window.__AG357 && window.__AG357.ready', { timeout: 120000 });
  if (!ok) throw new Error('Viewer did not initialize: ' + page.errors.join(' | '));

  const backend = await page.evaluate('window.__AG357.backend');
  const stats = await page.evaluate('window.__AG357.stats');
  const protoStats = await page.evaluate('window.__AG357.protoStats');
  const step3Stats = await page.evaluate('window.__AG357.step3Stats');
  const headMetrics = await page.evaluate('window.__AG357.headMetrics');
  console.log('Backend:', backend);
  console.log('Model stats:', JSON.stringify(stats));
  console.log('Step 3 stats:', JSON.stringify(step3Stats));
  console.log('Proto 3D Head/Neck Metrics:', JSON.stringify(headMetrics));

  const frames = {};
  const savePng = (key, pngDataUrl, extra = {}) => {
    const buf = Buffer.from(pngDataUrl.split(',')[1], 'base64');
    const fname = `${key}.png`;
    fs.writeFileSync(path.join(FRAMES_DIR, fname), buf);
    const hash = md5(buf);
    frames[key] = { file: `qa/2026-11-18-AG-357/frames-step3/${fname}`, md5: hash, ...extra };
    return hash;
  };

  // 1. Updated Step 2 sheets (Noon + Night + Head/Jaw/Strap detail)
  const step2Views = {
    ours: ['front', '3q', 'side', 'back', 'head'],
    proto_apose: ['front', '3q', 'side', 'back', 'head', 'head_front', 'head_3q', 'head_side', 'head_back', 'torso_front', 'boot_3q'],
    proto_shamble: ['front', '3q', 'side', 'back', 'head', 'head_side', 'head_back'],
    tripo: ['front', '3q', 'side', 'back', 'head', 'head_front', 'head_3q', 'head_side', 'head_back', 'torso_front', 'boot_3q']
  };

  for (const light of ['noon', 'night']) {
    for (const [subj, views] of Object.entries(step2Views)) {
      for (const view of views) {
        if (light === 'night' && (view.startsWith('head_') || view === 'torso_front' || view === 'boot_3q') && subj !== 'proto_apose') continue;
        const res = await page.evaluate(`window.__AG357.snap(${JSON.stringify(subj)}, ${JSON.stringify(view)}, ${JSON.stringify(light)})`, 60000);
        const h = savePng(`${light}-${subj}-${view}`, res.png, res.info);
        console.log(`Captured ${light} ${subj}-${view} md5=${h}`);
      }
    }
  }

  // 2. Step 3 Atlas 1K vs 512 close-up & full-body captures (Noon + Night head/back)
  const step3Views = {
    step3_1k: ['front', '3q', 'side', 'back', 'head', 'head_3q', 'head_side', 'head_back', 'torso_front', 'boot_3q'],
    step3_512: ['front', '3q', 'side', 'back', 'head', 'head_3q', 'head_side', 'head_back', 'torso_front', 'boot_3q']
  };
  for (const [subj, views] of Object.entries(step3Views)) {
    for (const view of views) {
      const res = await page.evaluate(`window.__AG357.snap(${JSON.stringify(subj)}, ${JSON.stringify(view)}, 'noon')`, 60000);
      const h = savePng(`noon-${subj}-${view}`, res.png, res.info);
      console.log(`Captured noon ${subj}-${view} md5=${h}`);
    }
  }
  for (const subj of ['step3_1k', 'step3_512']) {
    for (const view of ['head_3q', 'back']) {
      const res = await page.evaluate(`window.__AG357.snap(${JSON.stringify(subj)}, ${JSON.stringify(view)}, 'night')`, 60000);
      const h = savePng(`night-${subj}-${view}`, res.png, res.info);
      console.log(`Captured night ${subj}-${view} md5=${h}`);
    }
  }

  // 3. Step 3 Distance LOD (5m, 15m, 22m) comparing ours vs Step 3 LOD0 (42k) vs Step 3 LOD1 (~6.5k)
  for (const light of ['noon', 'night']) {
    for (const distM of [5, 15, 22]) {
      for (const subj of ['ours', 'step3_512_shamble', 'step3_lod1']) {
        const res = await page.evaluate(`window.__AG357.snapAtDistance(${JSON.stringify(subj)}, ${distM}, 0.35, ${JSON.stringify(light)}, 55)`, 60000);
        const h = savePng(`lod-${light}-${distM}m-${subj}`, res.png, { distM, fov: 55 });
        console.log(`Captured LOD ${light} ${distM}m ${subj} md5=${h}`);
      }
    }
  }

  const report = {
    at: new Date().toISOString(),
    step: 3,
    backend,
    stats,
    protoStats,
    step3Stats,
    headMetrics,
    frames,
    errors: page.errors
  };
  fs.writeFileSync(path.join(HERE, 'step3-report.json'), JSON.stringify(report, null, 2));
  if (page.errors.length) console.log('Page warnings/errors:', page.errors.join(' | '));
  console.log('DONE AG-357 Step 2 fixes + Step 3 WebGPU capture.');
} catch (err) {
  console.error('FAILED:', err && err.stack ? err.stack : err);
  code = 1;
} finally {
  await browser.close().catch(() => {});
  if (server && server.close) server.close();
}
process.exit(code);
