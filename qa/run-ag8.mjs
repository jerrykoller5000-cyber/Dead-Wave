// qa/run-ag8.mjs -- AG-8: Pit rune ring on real GPU after CL-14.
// Three views: overhead (Claude's camera), from the bank, overhead night.
// Compare against qa/shots/cl14/ (before-pit.png, after-pit.png, after-pit-1.png).
//
// Shots: qa/shots/2026-09-24-AG-8/   Report: qa/2026-09-24-AG-8.md

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIDTH = 1280, HEIGHT = 720;
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-24-AG-8');
const CL14_DIR = path.join(ROOT, 'qa', 'shots', 'cl14');
await fs.promises.mkdir(OUT_DIR, { recursive: true });

function kbOf(f) { return (fs.statSync(f).size / 1024).toFixed(0); }
async function shot(page, name) {
  const file = path.join(OUT_DIR, name + '.png');
  await page.screenshot(file);
  console.log('  [shot] ' + name + '.png (' + kbOf(file) + ' KB)');
  return file;
}

let server = null;
let origin = 'http://127.0.0.1:8971';
try {
  const res = await fetch(origin + '/index.html', { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error('not ok');
  console.log('[AG-8] Reusing server at', origin);
} catch {
  server = await serve(ROOT, 8971);
  origin = server.origin;
  console.log('[AG-8] Started server at', origin);
}

const url = origin + '/index.html?debug=1&raf=timer';
const browser = await launch({ headless: false });
const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
const shots = {};

try {
  // Boot
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 3; i++) {
    await page.evaluate('(() => { const b = document.getElementById("openingSkip"); if (b) b.click(); })()');
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await page.evaluate('new Promise(r => setTimeout(r, 1000))');
  console.log('[AG-8] TT ready.');

  // Hide UI
  await page.evaluate(
    '(() => {' +
    '  const c = [...document.querySelectorAll("canvas")]' +
    '    .sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];' +
    '  if (!c) return false;' +
    '  const keep = new Set();' +
    '  for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);' +
    '  for (const child of document.body.children)' +
    '    if (!keep.has(child)) child.style.setProperty("display", "none", "important");' +
    '  return true;' +
    '})()'
  );

  // Check TT.LAKE_HOLE exists
  const lakeHole = await page.evaluate('TT.LAKE_HOLE ? JSON.stringify(TT.LAKE_HOLE) : "missing"');
  console.log('[AG-8] TT.LAKE_HOLE:', lakeHole);

  // Daytime (world time 0.4)
  await page.evaluate('TT.setWorldTime(0.4)');
  await page.evaluate('new Promise(r => setTimeout(r, 500))');

  // VIEW 1: Overhead (Claude's camera from D-5)
  // LAKE_HOLE has no .y -- water surface ~-3.4 from AG-2 measurements
  // Overhead: cam at (L.x+12, 12.6, L.z+12), looking at (L.x, -8.4, L.z)
  await page.evaluate(
    '(() => {' +
    '  const L = TT.LAKE_HOLE;' +
    '  TT.setShotView({ x: L.x + 12, y: 12.6, z: L.z + 12, tx: L.x, ty: -8.4, tz: L.z, fov: 50 });' +
    '})()'
  );
  await page.evaluate('new Promise(r => setTimeout(r, 800))');
  shots.overhead = await shot(page, 'pit-overhead-day');

  // VIEW 2: From the bank (shallows east of the pit)
  // Bank cam at (L.x+46, -1.6, L.z+6), looking at (L.x+12, -3.2, L.z+2)
  await page.evaluate(
    '(() => {' +
    '  const L = TT.LAKE_HOLE;' +
    '  TT.setShotView({ x: L.x + 46, y: -1.6, z: L.z + 6, tx: L.x + 12, ty: -3.2, tz: L.z + 2, fov: 55 });' +
    '})()'
  );
  await page.evaluate('new Promise(r => setTimeout(r, 800))');
  shots.bank = await shot(page, 'pit-bank-day');

  // VIEW 3: Overhead at night (midnight)
  await page.evaluate('TT.setWorldTime(0.0)');
  await page.evaluate('new Promise(r => setTimeout(r, 800))');
  await page.evaluate(
    '(() => {' +
    '  const L = TT.LAKE_HOLE;' +
    '  TT.setShotView({ x: L.x + 12, y: 12.6, z: L.z + 12, tx: L.x, ty: -8.4, tz: L.z, fov: 50 });' +
    '})()'
  );
  await page.evaluate('new Promise(r => setTimeout(r, 800))');
  shots.overheadNight = await shot(page, 'pit-overhead-night');

  // VIEW 4: From bank at night
  await page.evaluate(
    '(() => {' +
    '  const L = TT.LAKE_HOLE;' +
    '  TT.setShotView({ x: L.x + 46, y: -1.6, z: L.z + 6, tx: L.x + 12, ty: -3.2, tz: L.z + 2, fov: 55 });' +
    '})()'
  );
  await page.evaluate('new Promise(r => setTimeout(r, 800))');
  shots.bankNight = await shot(page, 'pit-bank-night');

} finally {
  await browser.close();
}

// Compare: log file sizes of our shots vs cl14 reference (visual comparison in report)
const cl14Files = fs.readdirSync(CL14_DIR).filter(f => f.endsWith('.png'));
console.log('[AG-8] CL-14 reference shots:', cl14Files);
console.log('[AG-8] Our shots:');
for (const [k, f] of Object.entries(shots)) {
  if (f) console.log('  ' + k + ': ' + path.basename(f) + ' (' + kbOf(f) + ' KB)');
}
let compareResults = 'Visual comparison only -- shoot.mjs --compare expects directories, not individual files.';

// Write report
const _now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
const reportLines = [
  '# Antigravity -- AG-8 Pit rune ring real GPU -- ' + _now.slice(0, 10),
  '',
  '> Run ' + _now + ' on Claude Sonnet 4.6 (Thinking). Real browser, Jerry GPU.',
  '> CL-14: rune ring added. Compare against qa/shots/cl14/ reference shots.',
  '',
  '## Shots taken',
  '',
  '| View | File | KB |',
  '| --- | --- | --- |',
  Object.entries(shots).map(([k,f]) => '| ' + k + ' | ' + path.basename(f) + ' | ' + kbOf(f) + ' |').join('\\n'),
  '',
  '## Comparison vs CL-14',
  '',
  '- CL-14 reference shots: ' + cl14Files.join(', '),
  '- ' + compareResults,
  '',
  '## Screenshots',
  '',
  '### Overhead (daytime)',
  '![pit overhead day](qa/shots/2026-09-24-AG-8/pit-overhead-day.png)',
  '',
  '### From bank (daytime)',
  '![pit bank day](qa/shots/2026-09-24-AG-8/pit-bank-day.png)',
  '',
  '### Overhead (night)',
  '![pit overhead night](qa/shots/2026-09-24-AG-8/pit-overhead-night.png)',
  '',
  '### From bank (night)',
  '![pit bank night](qa/shots/2026-09-24-AG-8/pit-bank-night.png)',
  '',
  '### CL-14 reference (before)',
  '![cl14 before](qa/shots/cl14/before-pit.png)',
  '',
  '### CL-14 reference (after)',
  '![cl14 after](qa/shots/cl14/after-pit.png)',
  '',
  '### CL-14 reference (after-1)',
  '![cl14 after-1](qa/shots/cl14/after-pit-1.png)',
  '',
  '## Notes',
  '',
  '- Camera positions from AG-2 / run-ag2.mjs: LAKE_HOLE + offsets',
  '- Daytime world time 0.4, night 0.0',
  '- All: headed Chrome (real GPU), 1280x720, debug=1&raf=timer',
].join('\\n');

const reportPath = path.join(ROOT, 'qa', '2026-09-24-AG-8.md');
await fs.promises.writeFile(reportPath, reportLines, 'utf8');
console.log('[AG-8] Report:', reportPath);
console.log('[AG-8] Done.');
if (server) await server.close();
