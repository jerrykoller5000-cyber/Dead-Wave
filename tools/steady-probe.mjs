// tools/steady-probe.mjs — CL-240: does this computer slow a steady page down on a clock of its own?
//
//   node tools/steady-probe.mjs                 30 s, the same Chrome and flags bench.mjs uses
//   node tools/steady-probe.mjs --seconds 60 --work 8
//
// Night 20's slow frames (AG-111 to AG-114) come about every 3 s, locked to the wall clock (their start times are whole
// seconds apart to within a few ms), run every phase of the frame 2.5-3x slower at once, and build, collect and draw
// nothing new. Nothing in the game runs on that clock. This page does the same fixed piece of arithmetic every
// animation frame (no allocation, no drawing, nothing on a timer) and times it. If some frames still take 2-3x as long,
// on the same clock, the cause is the computer (another process, the CPU moving the thread), not the game.
//
// Prints one JSON line: frames, the work's median and p99 (ms), how many frames took 1.5x the median or more, the gaps
// between them (ms), and their start times modulo 1000 ms (a wall-clock timer shows as one narrow cluster).
import { launch } from './cdp.mjs';

const argv = process.argv.slice(2);
const num = (flag, d) => { const i = argv.indexOf(flag); return i >= 0 ? Number(argv[i + 1]) || d : d; };
const SECONDS = num('--seconds', 30);
const WORK = num('--work', 8);   // ms of arithmetic per frame, calibrated on the page

const PAGE = `<!doctype html><title>steady</title><body style="background:#111;color:#ccc;font:14px sans-serif">steady probe<script>
const R = window.__steady = { done: false, frames: [] };
let sink = 0;
function spin(n) { let x = 1.0001; for (let i = 0; i < n; i++) { x = x * 1.0000001 + 0.000001; if (x > 2) x -= 1; } sink += x; }
// The first 3 s set how many iterations make WORK ms (once the function is optimised); then it stays fixed.
let n = 200000;
R.threads = navigator.hardwareConcurrency || null;
const start = performance.now(), warm = start + 3000, end = warm + ${SECONDS} * 1000;
function frame(ts) {
  const t0 = performance.now(); spin(n); const t1 = performance.now();
  if (t0 < warm) n = Math.max(1000, Math.round(n * Math.min(2, Math.max(0.5, ${WORK} / Math.max(0.05, t1 - t0)))));
  else { if (!R.iters) R.iters = n; R.frames.push([+t0.toFixed(2), +(t1 - t0).toFixed(3)]); }
  if (t1 < end) requestAnimationFrame(frame); else R.done = true;
}
requestAnimationFrame(frame);
</script>`;

const browser = await launch({ headless: argv.includes('--headless'), args: ['--enable-precise-memory-info'] });
try {
  const page = await browser.newPage();
  await page.send('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(PAGE).toString('base64') });
  const t0 = Date.now();
  let r = null;
  while (Date.now() - t0 < (SECONDS + 30) * 1000) {
    await new Promise((res) => setTimeout(res, 2000));
    try { r = await page.evaluate('window.__steady && window.__steady.done ? window.__steady : null'); } catch { r = null; }
    if (r) break;
  }
  if (!r) throw new Error('the probe page never finished');
  const work = r.frames.map((f) => f[1]).sort((a, b) => a - b);
  const med = work[Math.floor(work.length / 2)], p99 = work[Math.floor(work.length * 0.99)];
  const slow = r.frames.filter((f) => f[1] >= med * 1.5);
  const gaps = slow.slice(1).map((f, i) => Math.round(f[0] - slow[i][0]));
  const mod = slow.map((f) => Math.round(f[0] % 1000));
  const hist = {}; for (const m of mod) { const b = Math.floor(m / 50) * 50; hist[b] = (hist[b] || 0) + 1; }
  console.log(JSON.stringify({
    seconds: SECONDS, workMs: WORK, iters: r.iters, frames: r.frames.length, threads: r.threads,
    medianMs: med, p99Ms: p99, maxMs: work[work.length - 1],
    slowFrames: slow.length, slow: slow.slice(0, 30).map((f) => ({ t: f[0], ms: f[1], x: +(f[1] / med).toFixed(2) })),
    gapsMs: gaps.slice(0, 30), mod1000: mod.slice(0, 30), mod1000Hist50ms: hist
  }));
} finally {
  await browser.close();
}
process.exit(0);
