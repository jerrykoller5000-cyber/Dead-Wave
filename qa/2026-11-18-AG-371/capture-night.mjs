// qa/2026-11-18-AG-371/capture-night.mjs
// Captures AG-357 Shambler (Pass 6) vs Jerry Tripo at real game night settings (moonlight-only + player flashlight)
// via shared game-test slot:
//   node crew/crew.mjs slot run antigravity AG-371 --checks "AG-357 game night + flashlight capture" -- node qa/2026-11-18-AG-371/capture-night.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const FRAMES_DIR = path.join(HERE, 'frames-night');
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=800,1000', '--window-position=-2400,-2400'] });

let code = 0;
try {
  const page = await browser.newPage({ width: 720, height: 900 });
  const url = `${server.origin}/review/AG-357/index.html?capture=1&step=4&light=game_night&w=720&h=900`;
  await page.goto(url, { timeout: 120000 });
  const ok = await page.waitFor('window.__AG357 && window.__AG357.ready', { timeout: 120000 });
  if (!ok) throw new Error('Viewer did not initialize: ' + page.errors.join(' | '));

  const backend = await page.evaluate('window.__AG357.backend');
  const stats = await page.evaluate('window.__AG357.stats');
  const step3Stats = await page.evaluate('window.__AG357.step3Stats');
  const headMetrics = await page.evaluate('window.__AG357.headMetrics');

  const views = ['front', '3q', 'side', 'back', 'head_3q', 'head_side'];
  const subjects = ['step3_512_shamble', 'step3_512', 'tripo'];
  const lights = ['game_night', 'game_night_flash'];

  const frames = {};
  for (const light of lights) {
    for (const subj of subjects) {
      for (const view of views) {
        const res = await page.evaluate(`window.__AG357.snap(${JSON.stringify(subj)}, ${JSON.stringify(view)}, ${JSON.stringify(light)})`, 60000);
        const buf = Buffer.from(res.png.split(',')[1], 'base64');
        const fname = `${light}-${subj}-${view}.png`;
        const dst = path.join(FRAMES_DIR, fname);
        const tmp = path.join(FRAMES_DIR, `.${fname}.tmp`);
        fs.writeFileSync(tmp, buf);
        fs.renameSync(tmp, dst);
        frames[`${light}-${subj}-${view}`] = {
          file: `qa/2026-11-18-AG-371/frames-night/${fname}`,
          md5: md5(buf),
          ...res.info
        };
      }
    }
  }

  const report = {
    at: new Date().toISOString(),
    task: 'AG-371',
    backend,
    stats,
    step3Stats,
    headMetrics,
    settings: {
      toneMapping: 'NoToneMapping',
      exposure: 1.0,
      sun: { color: '#ffbd87', intensity: 0.025 },
      hemi: { sky: '#f3f1ea', ground: '#8c877c', intensity: 0.15 },
      ambientFill: { color: '#223344', intensity: 0.06 },
      moon: { color: '#8899cc', intensity: 0.40, pos: [-12, 20, -8] },
      fog: { color: '#020508', near: 18, far: 65 },
      flashlight: { color: '#fff2d0', distance: 26, angle: 0.42, penumbra: 0.74, decay: 1.1, formula: 'min(42, max(0.45, 2.35 * dist^1.1))' }
    },
    frames,
    errors: page.errors
  };
  const repPath = path.join(HERE, 'night-report.json');
  const repTmp = path.join(HERE, '.night-report.json.tmp');
  fs.writeFileSync(repTmp, JSON.stringify(report, null, 2));
  fs.renameSync(repTmp, repPath);
  console.log(`Backend: ${backend} | Captured ${Object.keys(frames).length} frames | Errors: ${page.errors.length}`);
  console.log('DONE AG-371 Game Night WebGPU capture.');
} catch (err) {
  console.error('FAILED:', err && err.stack ? err.stack : err);
  code = 1;
} finally {
  await browser.close().catch(() => {});
  await server.close().catch(() => {});
  process.exit(code);
}
