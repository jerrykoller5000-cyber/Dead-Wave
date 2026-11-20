// qa/2026-11-18-AG-357/capture-step1.mjs
// Must run through the shared game-test slot:
//   node crew/crew.mjs slot run antigravity AG-357 --checks "AG-357 Step 1 WebGPU renders + GLB export" -- node qa/2026-11-18-AG-357/capture-step1.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const FRAMES_DIR = path.join(HERE, 'frames');
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=800,1000', '--window-position=-2400,-2400'] });

let code = 0;
try {
  const page = await browser.newPage({ width: 720, height: 900 });
  const url = `${server.origin}/review/AG-357/index.html?capture=1&w=720&h=900`;
  await page.goto(url, { timeout: 120000 });
  const ok = await page.waitFor('window.__AG357 && window.__AG357.ready', { timeout: 120000 });
  if (!ok) throw new Error('Viewer did not initialize: ' + page.errors.join(' | '));

  const backend = await page.evaluate('window.__AG357.backend');
  const stats = await page.evaluate('window.__AG357.stats');
  const headMetrics = await page.evaluate('window.__AG357.headMetrics');
  console.log('Backend:', backend);
  console.log('Model stats:', JSON.stringify(stats));
  console.log('Proto 3D Head/Neck Metrics:', JSON.stringify(headMetrics));

  for (const pose of ['a-pose', 'shamble']) {
    const bytes = await page.evaluate(`window.__AG357.exportProtoGLB(${JSON.stringify(pose)})`, 60000);
    const outPath = path.join(HERE, `step1-${pose}.glb`);
    fs.writeFileSync(outPath, Buffer.from(bytes));
    console.log(`Exported ${outPath} (${bytes.length} bytes)`);
  }

  const subjectViews = {
    ours: ['front', '3q', 'side', 'back', 'head'],
    proto_apose: ['front', '3q', 'side', 'back', 'head', 'head_front', 'head_3q', 'head_side', 'head_back'],
    proto_shamble: ['front', '3q', 'side', 'back', 'head'],
    tripo: ['front', '3q', 'side', 'back', 'head', 'head_front', 'head_3q', 'head_side', 'head_back']
  };
  const frames = {};

  for (const [subj, views] of Object.entries(subjectViews)) {
    for (const view of views) {
      const res = await page.evaluate(`window.__AG357.snap(${JSON.stringify(subj)}, ${JSON.stringify(view)})`, 60000);
      const b64 = res.png.split(',')[1];
      const buf = Buffer.from(b64, 'base64');
      const fname = `${subj}-${view}.png`;
      const fpath = path.join(FRAMES_DIR, fname);
      fs.writeFileSync(fpath, buf);
      const hash = md5(buf);
      frames[`${subj}-${view}`] = {
        file: `qa/2026-11-18-AG-357/frames/${fname}`,
        md5: hash,
        ...res.info
      };
      console.log(`Captured ${subj}-${view}: hFill=${res.info.hFill} size=[${res.info.size.join(', ')}] md5=${hash}`);
    }
  }

  // Director #10: White clay AO + Noise proof renders (plain white albedo * baked AO)
  for (const [subj, vlist] of [
    ['white_apose', ['front', '3q', 'side', 'back', 'head', 'head_front', 'head_side']],
    ['white_shamble', ['3q', 'side', 'head']]
  ]) {
    for (const view of vlist) {
      const res = await page.evaluate(`window.__AG357.snap(${JSON.stringify(subj)}, ${JSON.stringify(view)})`, 60000);
      const b64 = res.png.split(',')[1];
      const buf = Buffer.from(b64, 'base64');
      const fname = `${subj}-${view}.png`;
      const fpath = path.join(FRAMES_DIR, fname);
      fs.writeFileSync(fpath, buf);
      const hash = md5(buf);
      frames[`${subj}-${view}`] = {
        file: `qa/2026-11-18-AG-357/frames/${fname}`,
        md5: hash,
        ...res.info
      };
      console.log(`Captured ${subj}-${view}: md5=${hash}`);
    }
  }

  const report = {
    at: new Date().toISOString(),
    backend,
    stats,
    headMetrics,
    frames,
    errors: page.errors
  };
  fs.writeFileSync(path.join(HERE, 'step1-report.json'), JSON.stringify(report, null, 2));
  if (page.errors.length) {
    console.log('Page warnings/errors:', page.errors.join(' | '));
  }
  console.log('DONE AG-357 Step 1 WebGPU capture.');
} catch (err) {
  console.error('FAILED:', err && err.stack ? err.stack : err);
  code = 1;
} finally {
  await browser.close().catch(() => {});
  if (server && server.close) server.close();
}
process.exit(code);
