import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-24-AG-9');
await fs.promises.mkdir(OUT_DIR, { recursive: true });
const WIDTH = 1280, HEIGHT = 720;

function kbOf(f) { return (fs.statSync(f).size / 1024).toFixed(0); }
function fmt(s) { return 'avg=' + s.fps.toFixed(1) + ' fps  low=' + s.low.toFixed(1) + ' fps  worst=' + s.worst.toFixed(1) + ' ms  hitches=' + s.hitches; }

const SKIP = "(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); })()";
const HIDE =
  "(() => {" +
  "  const c = [...document.querySelectorAll('canvas')]" +
  "    .sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];" +
  "  if (!c) return false;" +
  "  const keep = new Set();" +
  "  for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);" +
  "  for (const child of document.body.children) {" +
  "    if (!keep.has(child)) child.style.setProperty('display', 'none', 'important');" +
  "  }" +
  "  return true;" +
  "})()";

async function bootToGame(page, url) {
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 3; i++) {
    await page.evaluate(SKIP);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  const ready = await page.waitFor('!!window.TT', { timeout: 300000 });
  if (!ready) throw new Error('window.TT never appeared');
  const uncov = await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  if (!uncov) {
    await page.evaluate(SKIP);
    await page.waitFor('window.DWOpening.active === false', { timeout: 60000 });
  }
  await page.evaluate('new Promise(r => setTimeout(r, 1000))');
  console.log('  [boot] Canvas uncovered -- TT ready');
}

async function hideUI(page) { await page.evaluate(HIDE); }

async function sampleFor(page, seconds, label) {
  console.log('  [perf] Sampling ' + JSON.stringify(label) + ' for ' + seconds + 's...');
  let snap = null;
  const t0 = Date.now();
  while (Date.now() - t0 < seconds * 1000) {
    snap = await page.evaluate('TT.perfSnapshot()');
    await new Promise(r => setTimeout(r, 1000));
  }
  snap = snap || { fps: 0, low: 0, worst: 0, hitches: 0 };
  console.log('  [perf] ' + label + ': ' + fmt(snap));
  return snap;
}

let server = null;
let origin = 'http://127.0.0.1:8971';
try {
  const res = await fetch(origin + '/index.html', { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error('not ok');
  console.log('[AG-9] Reusing existing dev server at', origin);
} catch {
  server = await serve(ROOT, 8971);
  origin = server.origin;
  console.log('[AG-9] Started server at', origin);
}

const URL_DEBUG = origin + '/index.html?debug=1&raf=timer';
const results = {};

// SCENARIO 1 -- MEGASWARM
console.log('\n[AG-9] ===== SCENARIO 1: MEGASWARM (500 shamblers, 30 s) =====');
{
  const browser = await launch({ headless: false });
  const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
  try {
    await bootToGame(page, URL_DEBUG);
    const hasMega = await page.waitFor('!!window.TT && !!TT.spawnMegaswarm', { timeout: 30000 });
    if (!hasMega) throw new Error('TT.spawnMegaswarm not found -- is CU-15 landed?');
    const made = await page.evaluate('TT.spawnMegaswarm(500)');
    console.log('  [mega] spawned', made, 'shamblers');
    await page.evaluate('new Promise(r => setTimeout(r, 2000))');
    await hideUI(page);
    const s1 = path.join(OUT_DIR, 'megaswarm-start.png');
    await page.screenshot(s1);
    console.log('  [shot] megaswarm-start.png (' + kbOf(s1) + ' KB)');
    const snap = await sampleFor(page, 30, 'megaswarm');
    const s2 = path.join(OUT_DIR, 'megaswarm-end.png');
    await page.screenshot(s2);
    console.log('  [shot] megaswarm-end.png (' + kbOf(s2) + ' KB)');
    results.megaswarm = { snap, shots: [s1, s2] };
  } finally { await browser.close(); }
}

// SCENARIO 2 -- DAY-5 FIGHT
console.log('\n[AG-9] ===== SCENARIO 2: DAY-5 FIGHT (20 s) =====');
{
  const browser = await launch({ headless: false });
  const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
  try {
    await bootToGame(page, URL_DEBUG);
    const adv = await page.evaluate(
      "(() => {" +
      "  if (typeof TT.debugDay === 'function') { TT.debugDay(5); return { method: 'debugDay', day: 5 }; }" +
      "  if (TT.state && typeof TT.state.day !== 'undefined') { TT.state.day = 5; return { method: 'state.day', day: 5 }; }" +
      "  return { method: 'none', day: TT.state ? TT.state.day : '?' };" +
      "})()"
    );
    console.log('  [setup] Advance:', JSON.stringify(adv));
    const waveOk = await page.evaluate(
      "(() => {" +
      "  if (typeof TT.debugStartWave === 'function') { TT.debugStartWave(); return true; }" +
      "  if (typeof TT.beginWave === 'function') { TT.beginWave(); return true; }" +
      "  return false;" +
      "})()"
    );
    console.log('  [setup] Wave started:', waveOk);
    await page.evaluate('new Promise(r => setTimeout(r, 3000))');
    await hideUI(page);
    const s1 = path.join(OUT_DIR, 'day5-fight-start.png');
    await page.screenshot(s1);
    console.log('  [shot] day5-fight-start.png (' + kbOf(s1) + ' KB)');
    const zc = await page.evaluate('TT.getZombieCount ? TT.getZombieCount() : 0');
    console.log('  [setup] Zombie count:', zc);
    const snap = await sampleFor(page, 20, 'day-5 fight');
    const s2 = path.join(OUT_DIR, 'day5-fight-end.png');
    await page.screenshot(s2);
    console.log('  [shot] day5-fight-end.png (' + kbOf(s2) + ' KB)');
    results.day5 = { snap, adv, waveOk, zc, shots: [s1, s2] };
  } finally { await browser.close(); }
}

// SCENARIO 3 -- BUILD PIECES
console.log('\n[AG-9] ===== SCENARIO 3: BUILD PIECES (10 walls) =====');
{
  const browser = await launch({ headless: false });
  const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
  try {
    await bootToGame(page, URL_DEBUG);
    await hideUI(page);
    const s1 = path.join(OUT_DIR, 'build-before.png');
    await page.screenshot(s1);
    console.log('  [shot] build-before.png (' + kbOf(s1) + ' KB)');
    const placed = await page.evaluate(
      "(async () => {" +
      "  const res = [];" +
      "  const px = TT.player.position.x, pz = TT.player.position.z;" +
      "  for (let i = 0; i < 10; i++) {" +
      "    const x = px + 4 + i * 2.5, z = pz + 4;" +
      "    let ok = false;" +
      "    if (typeof TT.debugPlace === 'function') { ok = TT.debugPlace('wall', x, z); }" +
      "    else if (typeof TT.tryPlace === 'function') { ok = TT.tryPlace('wall', { x, y: TT.sampleHeight(x, z), z }); }" +
      "    res.push({ i, x: x.toFixed(1), z: z.toFixed(1), ok });" +
      "    await new Promise(r => setTimeout(r, 800));" +
      "  }" +
      "  return res;" +
      "})()"
    );
    console.log('  [build] Placements:', JSON.stringify(placed));
    const snap = await sampleFor(page, 15, 'post-build');
    const s2 = path.join(OUT_DIR, 'build-after.png');
    await page.screenshot(s2);
    console.log('  [shot] build-after.png (' + kbOf(s2) + ' KB)');
    results.build = { snap, placed, shots: [s1, s2] };
  } finally { await browser.close(); }
}

// REPORT
const _now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
const ms = (results.megaswarm && results.megaswarm.snap) || { fps: 0, low: 0, worst: 0, hitches: 0 };
const d5s = (results.day5 && results.day5.snap) || { fps: 0, low: 0, worst: 0, hitches: 0 };
const bd = (results.build && results.build.snap) || { fps: 0, low: 0, worst: 0, hitches: 0 };
const rel = (abs) => path.relative(ROOT, abs).replace(/\\/g, '/');

function imgLines(r, label) {
  if (!r) return '';
  return r.shots.map((s, i) => '![' + label + '-' + i + '](' + rel(s) + ')').join('\n');
}

const report = [
  '# Antigravity -- AG-9 Real-GPU numbers -- ' + _now.slice(0, 10),
  '',
  '> Run ' + _now + ' on Claude Sonnet 4.6 (Thinking). Real browser, Jerry GPU.',
  '> CU-15 honest FPS counter: avg fps, 1% low, worst-frame ms, hitches (>50 ms).',
  '',
  '## Results',
  '',
  '| Scenario | Avg FPS | 1% Low | Worst frame | Hitches |',
  '|---|---|---|---|---|',
  '| Megaswarm (500 shamblers, 30 s) | ' + ms.fps.toFixed(1) + ' | ' + ms.low.toFixed(1) + ' | ' + ms.worst.toFixed(1) + ' ms | ' + ms.hitches + ' |',
  '| Day-5 fight (20 s live combat)  | ' + d5s.fps.toFixed(1) + ' | ' + d5s.low.toFixed(1) + ' | ' + d5s.worst.toFixed(1) + ' ms | ' + d5s.hitches + ' |',
  '| Build pieces (10 walls placed)  | ' + bd.fps.toFixed(1) + ' | ' + bd.low.toFixed(1) + ' | ' + bd.worst.toFixed(1) + ' ms | ' + bd.hitches + ' |',
  '',
  'Budget: 60 fps avg, worst frame <50 ms at 48 zombies, 60 fps standard view.',
  '',
  '## Setup detail',
  '',
  '- Day-5 advance: ' + JSON.stringify(results.day5 ? results.day5.adv : 'not run'),
  '- Wave started: ' + (results.day5 ? results.day5.waveOk : 'not run') + ', zombie count: ' + (results.day5 ? results.day5.zc : '?'),
  '- Build placements: ' + JSON.stringify(results.build ? results.build.placed : 'not run'),
  '',
  '## Screenshots',
  '',
  imgLines(results.megaswarm, 'megaswarm'),
  '',
  imgLines(results.day5, 'day5'),
  '',
  imgLines(results.build, 'build'),
  '',
  '## Notes',
  '',
  '- All: headed Chrome (real GPU), 1280x720, debug=1&raf=timer',
  '- Megaswarm: TT.spawnMegaswarm(500) -- requires CU-15',
  '- Day-5: TT.debugDay(5) + TT.debugStartWave()',
  '- Build: TT.debugPlace(wall, x, z) x10, 0.8 s apart',
].join('\n');

const reportPath = path.join(ROOT, 'qa', '2026-09-24-AG-9.md');
await fs.promises.writeFile(reportPath, report, 'utf8');
console.log('\n[AG-9] Report:', reportPath);
console.log('[AG-9] FINAL NUMBERS');
console.log('Megaswarm:   ' + fmt(ms));
console.log('Day-5 fight: ' + fmt(d5s));
console.log('Build pieces:' + fmt(bd));
console.log('[AG-9] Done.');
if (server) await server.close();
