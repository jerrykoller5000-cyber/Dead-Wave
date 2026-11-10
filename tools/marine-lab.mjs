// CC-340 (Claude 3): drives studio/marine-lab (the marine built outside the game) and saves pictures.
// node tools/marine-lab.mjs <out-dir> '<json: {build:{...}, shots:[{name, yaw, pitch, y, dist, fov}]}>'
// A quick look for the one working on the model; the game's own inspector (tools/camera.mjs) is the proof.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [outDir, specArg] = process.argv.slice(2);
const spec = JSON.parse(fs.existsSync(specArg) ? fs.readFileSync(specArg, 'utf8') : specArg);
fs.mkdirSync(outDir, { recursive: true });
const server = await serve(process.cwd());
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: (process.env.CHROME_ARGS || '').split(/\s+/).filter(Boolean).concat(['--use-angle=swiftshader', '--enable-unsafe-swiftshader']) });
try {
  const W = spec.w || 900, H = spec.h || 900;
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto(server.origin + `/studio/marine-lab/index.html?w=${W}&h=${H}`);
  await page.waitForFunction(() => window.LAB_READY || window.LAB_ERR, null, { timeout: 60000 });
  for (const b of (Array.isArray(spec.build) ? spec.build : [spec.build || {}])) {
    const m = await page.evaluate((o) => window.LAB.build(o), b);
    console.log('build', JSON.stringify(b), JSON.stringify(m));
    for (const s of spec.shots || []) {
      const data = await page.evaluate((o) => window.LAB.shot(o), s);
      const f = path.join(outDir, (b.tag ? b.tag + '-' : '') + s.name + '.png');
      fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64')); console.log(f);
    }
  }
  if (errors.length) console.log('page errors:', errors.slice(0, 10).join('\n'));
} finally { await browser.close(); server.close?.(); }
process.exit(0);
