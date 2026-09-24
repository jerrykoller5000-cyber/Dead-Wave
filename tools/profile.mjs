// tools/profile.mjs — measure, don't change. CU-16.
//
//   node tools/profile.mjs
//   node tools/profile.mjs --headless
//
// A short fight (40 shamblers past the cap) then eight walls. Prints frame times and
// the pathfinding rebuild cost the game already records (flowField ms).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const headless = process.argv.includes('--headless');
const server = await serve(ROOT, 0);
const browser = await launch({ headless });
const url = `${server.origin}/index.html?debug=1&raf=timer`;
console.log(`profile: ${url}\n`);

const sample = `(() => {
  const p = TT.perfSnapshot();
  const f = TT.flowField ? TT.flowField() : null;
  return { fps: p.fps, low: p.low, worst: p.worst, hitches: p.hitches, zombies: TT.zombies.length, flow: f };
})()`;

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.TT && !!window.TT.spawnZombie', { timeout: 180000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
  }
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await page.evaluate(`(() => {
    const name = document.getElementById('playerName');
    if (name) name.value = 'Profile';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  await page.evaluate('new Promise(r => setTimeout(r, 12000))');
  const made = await page.evaluate(`TT.spawnMegaswarm(40)`);
  console.log(`spawned ${made}`);
  const fight = [];
  for (let i = 0; i < 6; i++) {
    fight.push(await page.evaluate(sample));
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
  }
  const before = await page.evaluate('TT.flowField()');
  const placed = await page.evaluate(`(() => {
    let n = 0;
    for (let i = 0; i < 8; i++) if (TT.spawnBuild('wall', 6 + i * 2, 20)) n++;
    return n;
  })()`);
  await page.evaluate('new Promise(r => setTimeout(r, 500))');
  const after = await page.evaluate('TT.flowField()');
  console.log('\nfight frames (1s windows):');
  for (const s of fight) {
    console.log(`  fps ${s.fps.toFixed(1)}  low ${s.low.toFixed(1)}  worst ${s.worst.toFixed(0)}ms  hitch ${s.hitches}  z ${s.zombies}  flow ${s.flow ? s.flow.ms.toFixed(1) : '?'}ms`);
  }
  console.log(`\nplaced ${placed} walls`);
  console.log(`flow before ${before ? before.ms.toFixed(1) : '?'} ms, after ${after ? after.ms.toFixed(1) : '?'} ms`);
  console.log('placement does not call the flow rebuild; it runs on its own timer, and immediately when a tree falls.');
} finally {
  await browser.close();
  await server.close();
}
