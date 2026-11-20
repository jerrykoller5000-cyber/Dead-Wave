// qa/2026-11-18-AG-366/capture-step4b.mjs
// Captures AG-357 STEP 4b (D-209 / Jerry 4b priorities) on RTX 5080 WebGPU via shared game-test slot:
//   node crew/crew.mjs slot run antigravity AG-366 --checks "AG-357 Step 4b shambler WebGPU capture" -- node qa/2026-11-18-AG-366/capture-step4b.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const FRAMES_DIR = path.join(HERE, 'frames-step4b');
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=800,1000', '--window-position=-2400,-2400'] });

let code = 0;
try {
  const page = await browser.newPage({ width: 720, height: 900 });
  const url = `${server.origin}/review/AG-357/index.html?capture=1&step=4&light=noon&w=720&h=900`;
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
  console.log('Step 4b atlas stats:', JSON.stringify(step3Stats));
  console.log('Step 4b 3D Head/Neck Metrics:', JSON.stringify(headMetrics));

  const frames = {};
  const savePng = (key, pngDataUrl, extra = {}) => {
    const buf = Buffer.from(pngDataUrl.split(',')[1], 'base64');
    const fname = `${key}.png`;
    fs.writeFileSync(path.join(FRAMES_DIR, fname), buf);
    const hash = md5(buf);
    frames[key] = { file: `qa/2026-11-18-AG-366/frames-step4b/${fname}`, md5: hash, ...extra };
    return hash;
  };

  const fullViews = [
    'front', '3q', 'side', 'back',
    'head_front', 'head_3q', 'head_side', 'head_back', 'head_3q_back',
    'torso_front', 'torso_3q', 'torso_side', 'torso_back',
    'seam_neck_torso_front', 'seam_neck_torso_back', 'seam_neck_face', 'seam_face_scalp'
  ];

  const noonViews = {
    ours: ['front', '3q', 'side', 'back', 'head_front', 'head_3q', 'head_side', 'head_back'],
    proto_shamble: ['front', '3q', 'side', 'back', 'head_front', 'head_3q', 'head_side', 'head_back', 'head_3q_back'],
    proto_apose: fullViews,
    white_apose: ['head_3q', 'head_back', 'head_front', 'head_side', 'head_3q_back', 'torso_front', 'torso_back'],
    step3_1k: fullViews,
    step3_512: fullViews,
    tripo: fullViews
  };

  for (const [subj, views] of Object.entries(noonViews)) {
    for (const view of views) {
      const res = await page.evaluate(`window.__AG357.snap(${JSON.stringify(subj)}, ${JSON.stringify(view)}, 'noon')`, 60000);
      const h = savePng(`noon-${subj}-${view}`, res.png, res.info);
      console.log(`Captured noon ${subj}-${view} md5=${h}`);
    }
  }

  const nightViews = {
    ours: ['front', '3q', 'back', 'head_3q'],
    proto_shamble: ['front', '3q', 'side', 'back', 'head_3q'],
    step3_1k: ['front', '3q', 'back', 'head_3q'],
    step3_512: ['front', '3q', 'back', 'head_3q'],
    tripo: ['front', '3q', 'back', 'head_3q']
  };
  for (const [subj, views] of Object.entries(nightViews)) {
    for (const view of views) {
      const res = await page.evaluate(`window.__AG357.snap(${JSON.stringify(subj)}, ${JSON.stringify(view)}, 'night')`, 60000);
      const h = savePng(`night-${subj}-${view}`, res.png, res.info);
      console.log(`Captured night ${subj}-${view} md5=${h}`);
    }
  }

  const report = {
    at: new Date().toISOString(),
    step: '4b',
    backend,
    stats,
    protoStats,
    step3Stats,
    headMetrics,
    frames,
    errors: page.errors
  };
  fs.writeFileSync(path.join(HERE, 'step4b-report.json'), JSON.stringify(report, null, 2));
  if (page.errors.length) console.log('Page warnings/errors:', page.errors.join(' | '));
  console.log('DONE AG-357 Step 4b WebGPU capture.');
} catch (err) {
  console.error('FAILED:', err && err.stack ? err.stack : err);
  code = 1;
} finally {
  await browser.close().catch(() => {});
  if (server && server.close) server.close();
}
process.exit(code);
