// tools/abtime.mjs — in-page A/B timing (CB-367, Claude 2, 2026-11-20). A DIAGNOSTIC, not a gate.
//
// The strict cross-page ABBA (fresh page per variant) stays the acceptance gate (Director, 20 Nov 15:40Z). Native pages
// swing more than the changes we judge (the same model 24-65 ms a frame), so this tool loads BOTH variants of one or more
// modules into ONE page and switches the live code between them every few seconds: A B A B ... Same page, same GPU state,
// same actors, same camera. Each B block is compared with the A blocks either side of it, so slow drift cancels.
//
//   node crew/crew.mjs slot run <you> <task> --checks "abtime" -- node tools/abtime.mjs \
//        --mod game/zombie-feet.js=review/CE-18/b/game/zombie-feet.js,review/CE-18/c/game/zombie-feet.js \
//        --fixture review/GT-20111/d204/spider48-standard-camera-fixture-v1.js --blocks 12 --block 5 --settle 1 \
//        --out review/<task>/abtime-1.json [--gfx high] [--headless] [--respawn]
//
// --mod <served path>=<A file>,<B file>   repeatable. Leave A empty (=,<B>) for the live file. Every export of the module
//          must exist in both files. Exported FUNCTIONS are switched (a wrapper calls A's or B's by the page's
//          globalThis.__AB). Exported values (const/let/class) come from A only: tunables shared by both, so a tweak of
//          them reaches both. Each variant keeps its own module state; state a variant caches ON SHARED OBJECTS under the
//          same key (e.g. a limb's _zfFoot) is seen by the other: check that before trusting a number (README).
// --fixture <js file>  evaluated in the page after the match starts; must leave the actors in place (count returned).
//          Default: none (whatever the match has).
// --respawn            run the fixture again after every switch (for model/builder variants: bodies are built at spawn).
//          The settle time must then cover the spawn; pools may still hold the other variant's bodies.
// --blocks N (12, even)  --block S seconds a block (5)  --settle S seconds dropped at the start of a block (1)
// Output: one JSON (stdout and --out): per block the game's frame mean and 1% low (its perf samples), the tick (sum of its PROF
// sections) and each PROF section (avg ms a frame),
// then per adjacent pair B - mean(neighbouring A) and a summary (mean, min, max of the pair deltas, and how many pairs
// agree in sign). A known-cost check (calibrate B as A plus a fixed spin) is how to see the tool's own floor on a machine.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const flag = (name, d = '') => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : d; };
const flags = (name) => argv.flatMap((a, i) => (a === name ? [argv[i + 1]] : []));
const BLOCKS = Number(flag('--blocks', 12)), BLOCK = Number(flag('--block', 5)), SETTLE = Number(flag('--settle', 1));
const GFX = flag('--gfx'), FIXTURE = flag('--fixture'), OUT = flag('--out'), RESPAWN = argv.includes('--respawn');
// --fake: the test runner's page (tools/tests/run-all.mjs buildTestPage: the fake three, no GPU). CPU only: for a cloud with no
// GPU, and for code whose cost is game JS (feet, joins, AI). Its frame is the game's JS, not a real draw.
const FAKE = argv.includes('--fake');
const WARM_FIRST = flag('--warm-first', 'A');
if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the game-test slot: node crew/crew.mjs slot run <you> <task> -- node tools/abtime.mjs ...');
if (!(BLOCKS >= 4 && BLOCKS % 2 === 0)) throw new Error('--blocks must be even and at least 4');
if (!(BLOCK > SETTLE && SETTLE >= 0)) throw new Error('--block must be longer than --settle');

// ---- the module pairs and their shims -------------------------------------------------------------------------------
const rel = (f) => path.relative(ROOT, path.resolve(ROOT, f)).split(path.sep).join('/');
const mods = flags('--mod').map((spec) => {
  const m = /^([^=]+)=([^,]*),(.+)$/.exec(spec || '');
  if (!m) throw new Error('--mod needs <served path>=<A file>,<B file>: ' + spec);
  const served = rel(m[1]), a = m[2] ? rel(m[2]) : served, b = rel(m[3]);
  return { served, a, b };
});
// --page <file> (CB-369): serve that file as /index.html. A page that switches its own code on globalThis.__AB (a measurement
// copy, e.g. review/CB-369/hidden/index.hidwalk2-ab.html) needs no --mod.
const PAGE_FILE = flag('--page');
const pageBody = PAGE_FILE ? fs.readFileSync(path.join(ROOT, PAGE_FILE)) : null;
if (!mods.length && !PAGE_FILE) throw new Error('at least one --mod (or a --page that switches on globalThis.__AB)');
// Relative imports inside a variant are made absolute, so both variants share every other module (one three, one game).
function absolutize(src, servedPath) {
  const dir = path.posix.dirname('/' + servedPath);
  const fix = (s) => (s.startsWith('./') || s.startsWith('../') ? path.posix.normalize(path.posix.join(dir, s)) : s);
  return src
    .replace(/(\bfrom\s*)(['"])([^'"]+)\2/g, (_, k, q, s) => k + q + fix(s) + q)
    .replace(/(\bimport\s*)(['"])([^'"]+)\2/g, (_, k, q, s) => k + q + fix(s) + q)
    .replace(/(\bimport\s*\(\s*)(['"])([^'"]+)\2/g, (_, k, q, s) => k + q + fix(s) + q);
}
function exportsOf(src, file) {
  const fns = new Set(), vals = new Set();
  for (const m of src.matchAll(/^\s*export\s+(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/gm)) fns.add(m[1]);
  for (const m of src.matchAll(/^\s*export\s+(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) vals.add(m[1]);
  for (const m of src.matchAll(/^\s*export\s+(?:const|let|var)\s+\{([^}]*)\}/gm)) m[1].split(',').forEach((x) => { const n = x.split(':').pop().trim(); if (n) vals.add(n); });
  if (/^\s*export\s*\{|^\s*export\s+default|^\s*export\s*\*/m.test(src)) throw new Error(file + ': export lists / default / star exports are not handled; name each export');
  return { fns, vals };
}
const shims = new Map(), variants = new Map();
for (const m of mods) {
  const sa = fs.readFileSync(path.join(ROOT, m.a), 'utf8'), sb = fs.readFileSync(path.join(ROOT, m.b), 'utf8');
  const ea = exportsOf(sa, m.a), eb = exportsOf(sb, m.b);
  const same = (x, y) => x.size === y.size && [...x].every((k) => y.has(k));
  if (!same(ea.vals, eb.vals)) throw new Error(m.served + ': A and B export different values (const/let/class)');
  // A function only one variant exports (e.g. one exported for its own test) is called from that variant in both blocks.
  m.oneSided = [...new Set([...ea.fns, ...eb.fns])].filter((f) => !(ea.fns.has(f) && eb.fns.has(f)));
  variants.set('/__ab/A/' + m.served, absolutize(sa, m.served));
  variants.set('/__ab/B/' + m.served, absolutize(sb, m.served));
  const lines = [`// abtime shim for ${m.served}: A ${m.a}, B ${m.b}`,
    `import * as A from '/__ab/A/${m.served}';`, `import * as B from '/__ab/B/${m.served}';`,
    `globalThis.__AB = globalThis.__AB || 'A';`];
  for (const f of new Set([...ea.fns, ...eb.fns])) lines.push(ea.fns.has(f) && eb.fns.has(f)
    ? `export function ${f}(...a) { return (globalThis.__AB === 'B' ? B : A).${f}(...a); }`
    : `export function ${f}(...a) { return ${ea.fns.has(f) ? 'A' : 'B'}.${f}(...a); }   // only one variant exports it`);
  for (const v of ea.vals) lines.push(`export const ${v} = A.${v};`);
  shims.set('/' + m.served, lines.join('\n') + '\n');
}

// ---- a front server: shims and variants, everything else from the game's own server ----------------------------------
const back = await serve(ROOT, 0);
const backUrl = new URL(back.origin);
const front = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (fakeHtml && u.pathname === '/tools/tests/' + FAKE_PAGE) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(fakeHtml); return; }
  if (pageBody && u.pathname === '/index.html') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(pageBody); return; }
  const body = shims.get(u.pathname) ?? variants.get(u.pathname);
  if (body != null) { res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' }).end(body); return; }
  const p = http.request({ hostname: backUrl.hostname, port: backUrl.port, path: req.url, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on('error', (e) => { if (!res.headersSent) res.writeHead(502); res.end(String(e)); });
  req.pipe(p);
});
await new Promise((r) => front.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${front.address().port}`;

// The fake-three page, built the way tools/tests/run-all.mjs builds it.
function buildFakePage() {
  const src = fs.readFileSync(path.join(ROOT, PAGE_FILE || 'index.html'), 'utf8');
  const map = src.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  if (!map) throw new Error('no import map in index.html');
  let out = src.replace(map[0], `<script type="importmap">
  { "imports": { "three": "./fakethree.mjs", "three/webgpu": "./fakethree.mjs", "three/tsl": "./faketsl.mjs", "three/addons/": "./addons/" } }
  </script>`);
  out = out.replace('<head>', '<head>\n  <script>try{localStorage.clear()}catch(e){}</script>');
  out = out.replace(/(\s(?:src|href)=")(?!https?:|\/|data:|#)/g, '$1/');
  out = out.replace(/from (['"])\.\//g, 'from $1/');
  out = out.replace(/import (['"])\.\//g, 'import $1/');
  return out;   // served from memory by the front server (no file written)
}
const FAKE_PAGE = 'abtime-fake.html', fakeHtml = FAKE ? buildFakePage() : null;

// ---- the page --------------------------------------------------------------------------------------------------------
const browser = await launch({ headless: argv.includes('--headless') });
const result = { tool: 'abtime', diagnostic: true, gate: false, date: new Date().toISOString(), mods, blocks: BLOCKS, block: BLOCK, settle: SETTLE, warmFirst: WARM_FIRST, gfx: GFX || null, fixture: FIXTURE || null, respawn: RESPAWN, rows: [] };
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  // A headless page gets no animation frames: the game then runs its loop on timers (raf=timer), as the test runner does.
  const raf = argv.includes('--headless') || FAKE ? '&raf=timer' : '';
  if (FAKE) {
    await page.goto(`${origin}/tools/tests/${FAKE_PAGE}?debug=1${raf}`, { timeout: 120000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) throw new Error('TT never appeared (fake page): ' + (page.errors?.[0] || ''));
  } else {
  await page.goto(`${origin}/index.html?debug=1${raf}`, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); else { const b = document.getElementById('openingSkip'); if (b) b.click(); } })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 250))');
  }
  if (!(await page.waitFor('!!window.TT && !!window.TT.spawnMegaswarm', { timeout: 240000 }))) throw new Error('TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  }
  result.fake = FAKE;
  result.shims = await page.evaluate(`(() => ({ ab: globalThis.__AB || null }))()`);
  if (result.shims.ab !== 'A') throw new Error('the shim never loaded (globalThis.__AB unset): check --mod paths');
  if (GFX) { const g = await page.evaluate(`(() => { if (!TT.GFX_PRESETS || !TT.GFX_PRESETS[${JSON.stringify(GFX)}]) return ''; TT.applyGraphicsPreset(${JSON.stringify(GFX)}); return TT.getGfx(); })()`); if (g !== GFX) throw new Error('preset ' + GFX + ' did not apply'); }
  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));
  if (FAKE) await page.evaluate(`startMatch(TT, 'AB')`, 300000);
  else {
    await page.evaluate(`(() => { const n = document.getElementById('playerName'); if (n) n.value = 'Bench'; const p = document.getElementById('modeHunt'); if (p) p.click(); })()`);
    if (!(await page.waitFor(`TT.getPhase && TT.getPhase() === 'prep'`, { timeout: 60000 }))) throw new Error('match never reached prep');
    if (!(await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 240000 }))) throw new Error('never landed');
  }
  const fixtureSrc = FIXTURE ? fs.readFileSync(path.join(ROOT, FIXTURE), 'utf8') : null;
  if (fixtureSrc) result.fixtureResult = summarize(await page.evaluate(fixtureSrc, 180000));
  // One block in the page: switch, (re)spawn, drop the settle, then RAF frames and the game's PROF sections.
  const blockJs = (v) => `(async () => {
    globalThis.__AB = ${JSON.stringify(v)};
    ${RESPAWN && fixtureSrc ? 'await (0, eval)(' + JSON.stringify(fixtureSrc) + ');' : ''}
    await new Promise((r) => setTimeout(r, ${SETTLE * 1000}));
    // The game's own loop is the clock (a headless page runs it on timers, raf=timer, and gets no animation frames):
    // the game's frame samples (TT.resetPerf / perfSnapshot, what the bench's fps and 1% low read) and its PROF sections.
    const P = TT.profDbg; if (P) { P.reset(); P.on = true; }
    TT.resetPerf(); const t0 = performance.now();
    await new Promise((r) => setTimeout(r, ${(BLOCK - SETTLE) * 1000}));
    const snap = TT.perfSnapshot() || {}, wall = performance.now() - t0;
    const rep = P ? P.report() : null; if (P) P.on = false;
    const prof = rep ? Object.fromEntries(rep.phases.map((x) => [x.k, x.avg])) : null;
    const alive = (TT.zombies || []).filter((z) => z.alive).length;
    const info = (TT.renderer && TT.renderer.info && TT.renderer.info.render) || {};
    return { v: ${JSON.stringify(v)}, frames: snap.frames || 0, profFrames: rep ? rep.frames : null, wallMs: wall, mean: snap.fps ? 1000 / snap.fps : wall / Math.max(1, rep ? rep.frames : 1), lowMs: snap.low ? 1000 / snap.low : null, worst: snap.worst ?? null,
      tick: prof ? Object.values(prof).reduce((a, b) => a + b, 0) : null, alive, draws: info.drawCalls ?? info.calls ?? null, prof };
  })()`;
  // A warm block of each first (not counted), then A B A B ...
  // --warm-first B: B's warm block runs first, for a pair where B caches a richer value on a shared object (CE-18c's
  // limb._zfFoot.low) that A reads the same way without it; else whichever variant fills the cache first decides both.
  for (const v of WARM_FIRST === 'B' ? ['B', 'A'] : ['A', 'B']) await page.evaluate(blockJs(v), (BLOCK + 60) * 1000);
  for (let i = 0; i < BLOCKS; i++) {
    const row = await page.evaluate(blockJs(i % 2 ? 'B' : 'A'), (BLOCK + 60) * 1000);
    result.rows.push(row);
    console.error(`abtime: block ${i + 1}/${BLOCKS} ${row.v} frame ${row.mean.toFixed(2)} ms tick ${row.tick?.toFixed(2)} ms alive ${row.alive}`);
  }
  await page.evaluate(`globalThis.__AB = 'A'`);
  result.summary = pairs(result.rows);
} finally {
  await browser.close?.().catch?.(() => {});
  front.close(); back.close?.();
}
if (OUT) { fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true }); fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); }
console.log(JSON.stringify(result.summary));
process.exit(0);

function summarize(x) { try { const s = JSON.stringify(x); return s.length > 4000 ? { count: x && x.count, truncated: true } : x; } catch { return null; } }
// B block i against the mean of the A blocks either side of it (the last B has only the A before it).
function pairs(rows) {
  const keys = ['mean', 'lowMs', 'tick'];
  const profKeys = [...new Set(rows.flatMap((r) => Object.keys(r.prof || {})))];
  const out = { pairs: [], note: 'B minus neighbouring A, ms. Diagnostic only: the strict cross-page ABBA is the gate.' };
  for (let i = 1; i < rows.length; i += 2) {
    const a = [rows[i - 1], rows[i + 1]].filter(Boolean), b = rows[i], d = {};
    for (const k of keys) d[k] = (b[k] ?? 0) - a.reduce((s, r) => s + (r[k] ?? 0), 0) / a.length;
    d.prof = {}; for (const k of profKeys) d.prof[k] = (b.prof?.[k] ?? 0) - a.reduce((s, r) => s + (r.prof?.[k] ?? 0), 0) / a.length;
    out.pairs.push(d);
  }
  const stat = (xs) => ({ mean: +(xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(3), min: +Math.min(...xs).toFixed(3), max: +Math.max(...xs).toFixed(3), sameSign: Math.max(xs.filter((x) => x > 0).length, xs.filter((x) => x < 0).length) + '/' + xs.length });
  for (const k of keys) out[k] = stat(out.pairs.map((p) => p[k]));
  out.prof = Object.fromEntries(profKeys.map((k) => [k, stat(out.pairs.map((p) => p.prof[k]))]).sort((x, y) => Math.abs(y[1].mean) - Math.abs(x[1].mean)).slice(0, 12));
  return out;
}
