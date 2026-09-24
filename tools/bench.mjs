// tools/bench.mjs — frame-time numbers for a named scenario.
//
//   node tools/bench.mjs                         megaswarm, 500 shamblers, 30 s
//   node tools/bench.mjs --scenario day5         day 5, start the wave, then 30 s
//   node tools/bench.mjs --scenario build        place ten walls through tryPlace, then 30 s
//   node tools/bench.mjs --seconds 8 --headless  short run
//
// Prints average fps, 1% low, worst frame, and frames over 50 ms.
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
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : '';
};
const SECONDS = num('--seconds', 30);
const COUNT = num('--count', 500);
const SCENARIO = flag('--scenario') || 'megaswarm';

const server = await serve(ROOT, 0);
const browser = await launch({ headless: argv.includes('--headless') });
const url = `${server.origin}/index.html?debug=1&raf=timer`;
console.log(`bench: ${url}`);
console.log(`bench: scenario ${SCENARIO} for ${SECONDS}s\n`);

async function startMatch(page) {
  await page.evaluate(`(() => {
    const name = document.getElementById('playerName');
    if (name) name.value = 'Bench';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  const prep = await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  if (!prep) throw new Error('match never reached prep');
  const landed = await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  if (!landed) throw new Error('insertion never finished');
}

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => {
      if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
      else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 250))');
  }
  const ready = await page.waitFor('!!window.TT && !!window.TT.spawnMegaswarm', { timeout: 180000 });
  if (!ready) throw new Error('TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });

  if (SCENARIO === 'megaswarm') {
    const made = await page.evaluate(`TT.spawnMegaswarm(${COUNT | 0})`);
    console.log(`bench: spawned ${made}`);
  } else if (SCENARIO === 'day5') {
    await startMatch(page);
    const wave = await page.evaluate(`(() => {
      TT.setDay(4);
      TT.startPrep();
      TT.skipPrep();
      const preview = TT.getWavePreview(TT.getDay());
      return { day: TT.getDay(), phase: TT.getPhase(), preview };
    })()`);
    console.log(`bench: day ${wave.day} phase ${wave.phase} preview ${JSON.stringify(wave.preview)}`);
  } else if (SCENARIO === 'build') {
    await startMatch(page);
    const placed = await page.evaluate(`(() => {
      TT.unlockAllBuilds(); TT.addCash(100000);
      const p = TT.player.position;
      const gx = TT.gridIndex(p.x), gz = TT.gridIndex(p.z);
      TT.setPlaceMode('wall');
      const c = TT.camera.position;
      const tz = TT.gridCentre(gz + 3);
      const aim = (gxCell) => {
        const tx = TT.gridCentre(gxCell);
        const ty = TT.sampleHeight(tx, tz);
        TT.setAimRay(c.x, c.y, c.z, tx - c.x, ty - c.y, tz - c.z);
      };
      aim(gx - 4);
      TT.beginPlaceClick();
      aim(gx + 5);
      TT.updateGhostPreview();
      const before = TT.builds.length;
      TT.commitBuildDrag();
      return TT.builds.length - before;
    })()`);
    console.log(`bench: placed ${placed} walls`);
  } else {
    throw new Error('unknown scenario ' + SCENARIO + ' (megaswarm, day5, build)');
  }

  await page.evaluate('TT.resetPerf()');
  const t0 = Date.now();
  const windows = [];
  while (Date.now() - t0 < SECONDS * 1000) {
    const snap = await page.evaluate('TT.perfSnapshot()');
    if (snap) windows.push(snap);
    await new Promise((r) => setTimeout(r, 1000));
  }
  const tail = windows.slice(-10);
  const paced = tail.filter((w) => w.fps > 0);
  const use = paced.length ? paced : tail;
  const avg = (key) => use.reduce((sum, w) => sum + (w[key] || 0), 0) / (use.length || 1);
  const final = windows.at(-1) || { worst: 0, hitches: 0 };
  console.log(`fps    ${avg('fps').toFixed(1)}   (mean of last ${use.length} s)`);
  console.log(`low    ${avg('low').toFixed(1)}   (1% low, same windows)`);
  console.log(`worst  ${final.worst.toFixed(1)} ms`);
  console.log(`hitch  ${final.hitches}   (frames over 50 ms, whole run)`);
} finally {
  await browser.close();
  await server.close();
}
