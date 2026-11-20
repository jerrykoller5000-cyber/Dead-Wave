// qa/2026-11-18-AG-374/capture-pass7.mjs
// Captures AG-357 PASS 7 (thick 12-13cm neck ~1.6x, ~5cm overhang, neck join ~39%, chiseled face-first skull)
// across Noon, Same-Scale Side-by-Side, White Clay, and Real Game Night (Moonlight + Flashlight) on WebGPU:
//   node crew/crew.mjs slot run antigravity AG-374 --checks "AG-357 Pass 7 WebGPU capture" -- node qa/2026-11-18-AG-374/capture-pass7.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const FRAMES_DIR = path.join(HERE, 'frames-pass7');
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
  const headComparison = await page.evaluate('window.__AG357.headComparison');
  const aPoseNormScale = await page.evaluate('window.__AG357.aPoseNormScale');
  console.log('Backend:', backend);
  console.log('Pass 7 Head Metrics:', JSON.stringify(headMetrics));
  console.log('Pass 7 Head Comparison:', JSON.stringify(headComparison));

  const frames = {};
  const savePng = (key, pngDataUrl, extra = {}) => {
    const buf = Buffer.from(pngDataUrl.split(',')[1], 'base64');
    const fname = `${key}.png`;
    const dst = path.join(FRAMES_DIR, fname);
    const tmp = path.join(FRAMES_DIR, `.${fname}.tmp`);
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, dst);
    const hash = md5(buf);
    frames[key] = { file: `qa/2026-11-18-AG-374/frames-pass7/${fname}`, md5: hash, ...extra };
    return hash;
  };

  const fullViews = [
    'front', '3q', 'side', 'back',
    'head_front', 'head_3q', 'head_side', 'head_back', 'head_3q_back',
    'seam_neck_torso_front', 'seam_neck_torso_back', 'seam_neck_face', 'seam_face_scalp'
  ];
  const jerryViews = ['front', '3q', 'side', 'back', 'head_3q', 'head_back'];
  const nightViewsList = ['front', '3q', 'side', 'back', 'head_3q', 'head_side', 'head_back'];

  const noonViews = {
    ours: ['front', '3q', 'side', 'back', 'head_front', 'head_3q', 'head_side', 'head_back'],
    proto_shamble: ['front', '3q', 'side', 'back', 'head_front', 'head_3q', 'head_side', 'head_back', 'head_3q_back'],
    proto_apose: fullViews,
    white_apose: ['head_3q', 'head_back', 'head_front', 'head_side', 'head_3q_back'],
    step3_1k: ['front', '3q', 'side', 'back', 'head_front', 'head_3q', 'head_side', 'head_back'],
    step3_512: fullViews,
    step3_512_shamble: [...jerryViews, 'head_side'],
    tripo: fullViews
  };

  for (const [subj, views] of Object.entries(noonViews)) {
    for (const view of views) {
      const res = await page.evaluate(`window.__AG357.snap(${JSON.stringify(subj)}, ${JSON.stringify(view)}, 'noon')`, 60000);
      savePng(`noon-${subj}-${view}`, res.png, res.info);
    }
  }

  for (const subj of ['step3_512', 'step3_512_shamble', 'tripo', 'ours']) {
    for (const mode of ['full', 'head']) {
      const res = await page.evaluate(`window.__AG357.snapSameScaleSide(${JSON.stringify(subj)}, ${JSON.stringify(mode)}, 'noon')`, 60000);
      savePng(`samescale-${subj}-${mode}`, res.png, res.info);
    }
  }

  for (const light of ['game_night', 'game_night_flash']) {
    for (const subj of ['step3_512_shamble', 'step3_512', 'tripo']) {
      for (const view of nightViewsList) {
        const res = await page.evaluate(`window.__AG357.snap(${JSON.stringify(subj)}, ${JSON.stringify(view)}, ${JSON.stringify(light)})`, 60000);
        savePng(`${light}-${subj}-${view}`, res.png, res.info);
      }
    }
  }

  const report = {
    at: new Date().toISOString(),
    step: '4b-pass7',
    backend,
    aPoseNormScale,
    stats,
    protoStats,
    step3Stats,
    headMetrics,
    headComparison,
    frames,
    errors: page.errors
  };
  const repPath = path.join(HERE, 'pass7-report.json');
  const repTmp = path.join(HERE, '.pass7-report.json.tmp');
  fs.writeFileSync(repTmp, JSON.stringify(report, null, 2));
  fs.renameSync(repTmp, repPath);
  console.log(`Captured ${Object.keys(frames).length} frames | Errors: ${page.errors.length}`);
  console.log('DONE AG-357 Step 4b Pass 7 WebGPU capture.');
} catch (err) {
  console.error('FAILED:', err && err.stack ? err.stack : err);
  code = 1;
} finally {
  await browser.close().catch(() => {});
  await server.close().catch(() => {});
  process.exit(code);
}
