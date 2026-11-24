// tools/strict48.mjs (CB-369, D-216, Claude 2): the strict 48-near-brute A/B, quieter.
//
//   node crew/crew.mjs slot run <you> <task> --exclusive -- node tools/strict48.mjs --a "<page>[?query]" --b "<page>[?query]" [options]
//
// The bar is the one the crew already reads (GT-20140's run-native): B's mean frame no worse than A's, the 1% low no worse,
// the ready clock no worse, and every B block at 60 fps or more. Nothing here changes those. What changes is how much noise
// sits under them:
//   - a burn-in block first (A, thrown away): the first browser of a run was the slow one (GT-20140 A 20.16 ms vs 16.95);
//   - more blocks, in ABBA BAAB order (balanced against a slow drift), each a fresh browser as before;
//   - a longer measured window (--window, default 20 of --seconds 40): fps, low and frame over 20 one-second windows, not 10;
//   - --vsync off (the default here): Chrome without the vsync wait, so a frame's time is its own cost and not rounded up to
//     the display's 16.7 ms steps. A frame of 16.8 ms waits for 33.3 ms with vsync on, so near 60 fps a tiny change flips
//     whole frames and the A/A span blows up. The absolute 60 fps bar is a vsync-on number: run it with --vsync on;
//   - every delta comes with its 95% confidence interval, from the A/B pairs (block 1+2, 3+4, ...; paired, so drift between
//     pairs cancels), and the A/A noise floor: how far apart the A blocks are, and the smallest change this run can see.
//
// Options: --pairs N (A/B pairs after the burn-in, default 4 = 8 blocks), --burn N (default 1), --seconds S (default 40),
//   --window W (default 20), --vsync on|off (default off), --no-cal (no speed check per block), --fixture <file.js> (default tools/strict48-fixture.js),
//   --from <dir> (recompute the summary from a run's saved blocks; give it the same --out to write there),
//   --map-a/--map-b <json> ({"/url": "file"} swaps for that side), --prof (bench --prof-all, the sections; on by default,
//   --no-prof to leave the profiler off), --out <dir> (default review/strict48/<stamp>), --dry (print the plan only).
//   A side is a page file (served as /index.html; "live" = the index.html on disk) with an optional query, e.g.
//   --a "review/CB-369/hidden/index.hidwalk-fe06.html?hidwalk=0" --b "review/CB-369/hidden/index.hidwalk-fe06.html".
// Writes <out>/blocks/<n>-<side>.json (each block's bench line) and <out>/STRICT48.json (the summary); prints the summary.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const A = opt('--a', ''), B = opt('--b', '');
if (!A || !B) { console.error('strict48: --a and --b are required (a page file, optional ?query)'); process.exit(2); }
const PAIRS = Math.max(1, +opt('--pairs', 4) | 0), BURN = Math.max(0, +opt('--burn', 1) | 0);
const SECONDS = +opt('--seconds', 40), WINDOW = +opt('--window', 20), VSYNC = opt('--vsync', 'off');
const FIXTURE = opt('--fixture', 'tools/strict48-fixture.js'), PROF = !argv.includes('--no-prof');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = path.resolve(ROOT, opt('--out', 'review/strict48/' + stamp));
if (!['on', 'off'].includes(VSYNC)) throw new Error('--vsync on|off');
if (WINDOW > SECONDS) throw new Error('--window is longer than --seconds');

const side = (spec, map) => {
  const [file, query = ''] = spec.split('?');
  const page = file === 'live' ? '' : file;
  if (page && !fs.existsSync(path.resolve(ROOT, page))) throw new Error('no such page: ' + page);
  return { spec, page, query, map: map || '' };
};
const S = { A: side(A, opt('--map-a', '')), B: side(B, opt('--map-b', '')) };

// ABBA BAAB ABBA ...: pair k is AB when k%4 is 0 or 3, BA otherwise, so every four pairs balance a straight-line drift.
const order = [];
for (let i = 0; i < BURN; i++) order.push({ side: 'A', burn: true });
for (let k = 0; k < PAIRS; k++) {
  const ab = (k % 4 === 0 || k % 4 === 3);
  for (const s of (ab ? ['A', 'B'] : ['B', 'A'])) order.push({ side: s, burn: false, pair: k });
}
console.log(`strict48: ${order.length} blocks (${BURN} burn-in, ${PAIRS} pairs): ${order.map((o) => (o.burn ? 'a' : o.side)).join('')}  vsync ${VSYNC}, ${SECONDS} s each, window ${WINDOW} s`);
console.log(`strict48: A = ${A}${S.A.map ? ' + ' + S.A.map : ''}\nstrict48: B = ${B}${S.B.map ? ' + ' + S.B.map : ''}\nstrict48: out ${path.relative(ROOT, OUT)}`);
if (argv.includes('--dry')) process.exit(0);
if (!argv.includes('--from')) fs.mkdirSync(path.join(OUT, 'blocks'), { recursive: true });

function runBlock(n, o) {
  const s = S[o.side], file = path.join(OUT, 'blocks', `${String(n).padStart(2, '0')}-${o.burn ? 'burn' : o.side}.json`);
  const args = [path.join(ROOT, 'tools/bench.mjs'), '--count', '48', '--seconds', String(SECONDS), '--window', String(WINDOW),
    '--fixture', FIXTURE, '--vsync', VSYNC, '--out', file];
  if (PROF) args.push('--prof-all');
  if (!argv.includes('--no-cal')) args.push('--cal');   // the main thread's speed per block (bench --cal)
  if (argv.includes('--headless')) args.push('--headless');   // the cloud (SwiftShader): checks the runner, not a speed number
  if (s.page) args.push('--page', s.page);
  if (s.map) args.push('--map', s.map);
  if (s.query) args.push('--query', s.query);
  return new Promise((resolve) => {
    const p = spawn(process.execPath, args, { cwd: ROOT, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    p.stdout.on('data', (d) => { log += d; for (const l of String(d).split('\n')) if (/^bench: (ready|fixture|serving)/.test(l)) console.log('  ' + l); });
    p.stderr.on('data', (d) => { log += d; });
    p.on('exit', (code) => {
      fs.writeFileSync(file.replace(/\.json$/, '.log'), log);
      let line = null;
      try { line = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* the block failed */ }
      resolve({ n, ...o, code, line, file: path.relative(ROOT, file) });
    });
  });
}

const blocks = [];
// --from <dir>: the summary again from a run's saved blocks (same --pairs/--burn as that run), nothing is run.
const FROM = opt('--from', '');
for (let i = 0; i < order.length; i++) {
  const b = FROM ? (() => { const f = path.join(path.resolve(ROOT, FROM), 'blocks', `${String(i + 1).padStart(2, '0')}-${order[i].burn ? 'burn' : order[i].side}.json`);
    let line = null; try { line = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* missing */ }
    return { n: i + 1, ...order[i], code: line ? 0 : 1, line, file: path.relative(ROOT, f) }; })() : await runBlock(i + 1, order[i]);
  const L = b.line;
  console.log(`strict48: block ${b.n} ${b.burn ? 'burn' : b.side}: ` + (L ? `frame ${frameOf(L).toFixed(2)} ms  fps ${L.fps}  low ${L.low}  ready ${L.readyMs} ms  placed ${L.fixture && L.fixture.count}  errors ${(L.pageErrors || []).length}` : `FAILED (exit ${b.code}), see ${b.file.replace(/json$/, 'log')}`));
  blocks.push(b);
}

function frameOf(L) { return (L.prof && L.prof.last10 && L.prof.last10.frameMs) || (L.fps > 0 ? 1000 / L.fps : NaN); }
const get = { frameMs: frameOf, fps: (L) => L.fps, low: (L) => L.low, readyMs: (L) => L.readyMs,
  gpuMs: (L) => (L.prof && typeof L.prof.gpuMs === 'number' ? L.prof.gpuMs : NaN), draws: (L) => L.draws };
// two-sided 95% t quantiles by degrees of freedom (1..30; normal beyond)
const T95 = [NaN, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131,
  2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042];
const t95 = (df) => (df < 1 ? NaN : df <= 30 ? T95[Math.floor(df)] : 1.96);
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const r = (x, d = 3) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);

const good = blocks.filter((b) => !b.burn && b.line && b.code === 0);
const pairs = [];
for (let k = 0; k < PAIRS; k++) {
  const a = good.find((b) => b.pair === k && b.side === 'A'), b = good.find((b) => b.pair === k && b.side === 'B');
  if (a && b) pairs.push({ k, A: a.line, B: b.line });
}
const stats = {};
for (const [k, f] of Object.entries(get)) {
  const av = good.filter((b) => b.side === 'A').map((b) => f(b.line)).filter(Number.isFinite);
  const bv = good.filter((b) => b.side === 'B').map((b) => f(b.line)).filter(Number.isFinite);
  if (!av.length || !bv.length) { stats[k] = null; continue; }
  const d = pairs.map((p) => f(p.B) - f(p.A)).filter(Number.isFinite);
  const half = d.length > 1 ? t95(d.length - 1) * sd(d) / Math.sqrt(d.length) : NaN;
  const mA = mean(av), mB = mean(bv), delta = mB - mA;
  stats[k] = {
    A: r(mA), B: r(mB), delta: r(delta), deltaPct: r(100 * delta / mA, 2),
    ci95: Number.isFinite(half) ? [r(mean(d) - half), r(mean(d) + half)] : null,   // paired, over the A/B pairs
    pairedMean: d.length ? r(mean(d)) : null,
    // the A/A noise floor: the A blocks' spread, and the smallest delta this design (these pairs) can tell from zero
    noise: { sdA: r(sd(av)), sdB: r(sd(bv)), spanA: r(Math.max(...av) - Math.min(...av)), sdPairs: r(sd(d)),
      floor: Number.isFinite(half) ? r(half) : null, floorPct: Number.isFinite(half) ? r(100 * half / mA, 2) : null },
    values: { A: av.map((x) => r(x, 2)), B: bv.map((x) => r(x, 2)) }
  };
}
// Every profiler section (bench --prof-all, last window), the same way: where a delta comes from (the D-216 spider split).
const secOf = (L, k) => { const t = L.prof && L.prof.last10 && L.prof.last10.top; const e = t && t.find((x) => x.k === k); return e ? e.avg : 0; };
const secKeys = [...new Set(good.flatMap((b) => ((b.line.prof && b.line.prof.last10 && b.line.prof.last10.top) || []).map((x) => x.k)))];
const sections = secKeys.map((k) => {
  const av = good.filter((b) => b.side === 'A').map((b) => secOf(b.line, k)), bv = good.filter((b) => b.side === 'B').map((b) => secOf(b.line, k));
  const d = pairs.map((p) => secOf(p.B, k) - secOf(p.A, k)), half = d.length > 1 ? t95(d.length - 1) * sd(d) / Math.sqrt(d.length) : NaN;
  return { k, A: r(mean(av)), B: r(mean(bv)), delta: r(mean(bv) - mean(av)), ci95: Number.isFinite(half) ? [r(mean(d) - half), r(mean(d) + half)] : null };
}).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
// The speed state of each block's browser (bench --cal): GP-20187's A/A blocks fell in two groups with the same code. If the
// blocks' main-thread speed differs, say how much of the frame's spread it explains, and the frame delta with each block's
// frame scaled to the median speed (beside the bar, not the bar).
const calOf = (L) => (L.cal && L.cal.mean) || NaN;
const calRows = good.map((b) => ({ side: b.side, cal: calOf(b.line), frame: frameOf(b.line) })).filter((x) => Number.isFinite(x.cal));
let speed = null;
if (calRows.length > 2) {
  const cs = calRows.map((x) => x.cal), fs = calRows.map((x) => x.frame), mc = mean(cs), mf = mean(fs);
  const cov = calRows.reduce((s, x) => s + (x.cal - mc) * (x.frame - mf), 0), vc = cs.reduce((s, x) => s + (x - mc) ** 2, 0), vf = fs.reduce((s, x) => s + (x - mf) ** 2, 0);
  const med = cs.slice().sort((x, y) => x - y)[cs.length >> 1];
  const adj = (side) => calRows.filter((x) => x.side === side).map((x) => x.frame * x.cal / med);
  const aA = adj('A'), aB = adj('B');
  speed = { cal: calRows.map((x) => x.side + ' ' + x.cal), spreadPct: r(100 * (Math.max(...cs) - Math.min(...cs)) / med, 1),
    corrFrameVsSpeed: vc > 0 && vf > 0 ? r(cov / Math.sqrt(vc * vf), 2) : null,
    adjustedFrame: aA.length && aB.length ? { A: r(mean(aA)), B: r(mean(aB)), delta: r(mean(aB) - mean(aA)), sdA: r(sd(aA)), sdB: r(sd(aB)) } : null };
}
const sideB = good.filter((b) => b.side === 'B');
const checks = {   // the bar, as GT-20140 reads it; unchanged
  frameNoWorse: stats.frameMs ? stats.frameMs.delta <= 0 : null,
  lowNoWorse: stats.low ? stats.low.delta >= 0 : null,
  readyNoWorse: stats.readyMs ? stats.readyMs.delta <= 0 : null,
  absolute60fps: sideB.length ? sideB.every((b) => b.line.fps >= 60) : null
};
// Read beside the bar: is the delta inside this run's noise (its 95% CI holds zero)?
const insideNoise = Object.fromEntries(['frameMs', 'low', 'readyMs'].map((k) => [k, stats[k] && stats[k].ci95 ? stats[k].ci95[0] <= 0 && stats[k].ci95[1] >= 0 : null]));
const sane = {
  blocksOk: blocks.filter((b) => b.line && b.code === 0).length + '/' + blocks.length,
  all48: good.every((b) => b.line.fixture && b.line.fixture.count === 48),
  pageErrors: good.reduce((s, b) => s + (b.line.pageErrors || []).length, 0)
};
const summary = {
  tool: 'tools/strict48.mjs', when: new Date().toISOString(), A: S.A, B: S.B,
  design: { burn: BURN, pairs: PAIRS, order: order.map((o) => (o.burn ? 'a' : o.side)).join(''), seconds: SECONDS, window: WINDOW, vsync: VSYNC, fixture: FIXTURE, prof: PROF },
  checks, insideNoise, stats, sections, speed, sane,
  absolute60Note: VSYNC === 'off' ? 'vsync off: fps here is the uncapped frame rate; read the absolute 60 fps bar from a --vsync on run' : 'vsync on',
  // vsync off: a block over 61 fps proves the cap is gone; a heavy scene under 60 cannot prove it either way.
  vsyncCheck: VSYNC === 'off' ? { maxFps: Math.max(...good.map((b) => b.line.fps)), provenUncapped: good.some((b) => b.line.fps > 61) } : null,
  blocks: blocks.map((b) => ({ n: b.n, side: b.burn ? 'burn' : b.side, code: b.code, file: b.file,
    frameMs: b.line ? r(frameOf(b.line), 2) : null, fps: b.line ? b.line.fps : null, low: b.line ? b.line.low : null, readyMs: b.line ? b.line.readyMs : null }))
};
fs.writeFileSync(path.join(OUT, 'STRICT48.json'), JSON.stringify(summary, null, 2));
const show = (k, u) => { const s = stats[k]; if (!s) return `${k}: no data`; return `${k.padEnd(8)} A ${s.A} ${u}  B ${s.B} ${u}  delta ${s.delta} (${s.deltaPct}%)  95% CI ${s.ci95 ? '[' + s.ci95.join(', ') + ']' : 'n/a'}  noise floor ±${s.noise.floor} ${u} (${s.noise.floorPct}%), A span ${s.noise.spanA}`; };
console.log('\n' + ['frameMs', 'fps', 'low', 'readyMs', 'gpuMs'].map((k) => show(k, k === 'fps' || k === 'low' ? 'fps' : 'ms')).join('\n'));
console.log('sections, biggest change first: ' + sections.slice(0, 8).map((x) => `${x.k} ${x.delta >= 0 ? '+' : ''}${x.delta}${x.ci95 ? ' [' + x.ci95.join(', ') + ']' : ''}`).join('  '));
if (speed) console.log(`speed states: blocks' main-thread speed spread ${speed.spreadPct}%, frame vs speed r = ${speed.corrFrameVsSpeed}; frame at the median speed: ${JSON.stringify(speed.adjustedFrame)}`);
console.log(`bar (unchanged): ${Object.entries(checks).map(([k, v]) => k + ' ' + (v === null ? 'n/a' : v ? 'GREEN' : 'RED')).join('  ')}`);
console.log(`inside noise (CI holds 0): ${JSON.stringify(insideNoise)}   ${JSON.stringify(sane)}`);
console.log(`strict48: ${path.relative(ROOT, path.join(OUT, 'STRICT48.json'))}`);
process.exit(sane.blocksOk === blocks.length + '/' + blocks.length ? 0 : 1);
