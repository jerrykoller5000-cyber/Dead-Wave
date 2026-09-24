// tools/bench.mjs — the megaswarm numbers.
//
//   node tools/bench.mjs
//   node tools/bench.mjs --seconds 30 --count 500
//
// Spawns a fixed-seed shambler swarm past the normal cap, then prints the four
// frame-time numbers from the last second of the run: average fps, 1% low,
// worst frame, and how many frames took longer than 50 ms.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const num = (flag, d) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? Number(argv[i + 1]) || d : d;
};
const SECONDS = num('--seconds', 30);
const COUNT = num('--count', 500);

const server = await serve(ROOT, 0);
const browser = await launch({ headless: argv.includes('--headless') });
const url = `${server.origin}/index.html?debug=1&raf=timer`;
console.log(`bench: ${url}`);
console.log(`bench: ${COUNT} shamblers for ${SECONDS}s\n`);
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 250))');
  }
  const ready = await page.waitFor('!!window.TT && !!window.TT.spawnMegaswarm', { timeout: 180000 });
  if (!ready) throw new Error('TT.spawnMegaswarm never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  const made = await page.evaluate(`TT.spawnMegaswarm(${COUNT | 0})`);
  console.log(`bench: spawned ${made}`);
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < SECONDS * 1000) {
    last = await page.evaluate('TT.perfSnapshot()');
    await new Promise((r) => setTimeout(r, 1000));
  }
  const snap = last || { fps: 0, low: 0, worst: 0, hitches: 0 };
  console.log(`fps    ${snap.fps.toFixed(1)}`);
  console.log(`low    ${snap.low.toFixed(1)}   (1% low)`);
  console.log(`worst  ${snap.worst.toFixed(1)} ms`);
  console.log(`hitch  ${snap.hitches}   (frames over 50 ms)`);
} finally {
  await browser.close();
  await server.close();
}
