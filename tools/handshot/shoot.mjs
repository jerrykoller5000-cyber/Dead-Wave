// CL-334: node tools/handshot/shoot.mjs <outDir> <shots.json>   shots: [{ name, which, pose, view, side, glove, bar, d }]
import { serve } from '../serve.mjs';
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path';
const require = createRequire('/home/claude/fpshot/fptune2.mjs'); const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const [outDir, shotsFile] = process.argv.slice(2);
const shots = JSON.parse(fs.readFileSync(shotsFile, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const server = await serve(ROOT, 0);
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pages = {}; const errors = [];
for (const which of [...new Set(shots.map((s) => s.which || 'new'))]) {
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  page.on('pageerror', (e) => errors.push(which + ': ' + e));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(which + ' console: ' + m.text()); });
  await page.goto(`${server.origin}/tools/handshot/index.html?which=${which}&w=640&h=480${process.env.HS_Q || ""}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.HS_READY === true, null, { timeout: 60000 }).catch((e) => errors.push(which + ' ready: ' + e));
  pages[which] = page;
  console.log(which, JSON.stringify(await page.evaluate(() => window.HS && window.HS.tris).catch(() => null)));
}
for (const s of shots) {
  const page = pages[s.which || 'new'];
  try {
    const url = await page.evaluate((o) => window.HS.shot(o), s);
    fs.writeFileSync(path.join(outDir, s.name + '.jpg'), Buffer.from(url.split(',')[1], 'base64'));
  } catch (e) { errors.push(s.name + ': ' + e); }
}
console.log(JSON.stringify({ n: shots.length, errors: errors.slice(0, 10) }));
await browser.close(); await server.close();
