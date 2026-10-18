// tools/bench.mjs — frame-time numbers for a named scenario.
//
//   node tools/bench.mjs                         megaswarm, 500 shamblers, 30 s
//   node tools/bench.mjs --scenario day5         day 5, start the wave, then 30 s
//   node tools/bench.mjs --scenario build        place ten walls through tryPlace, then 30 s
//   node tools/bench.mjs --night 5               night 5's last push, horde out, then 30 s
//   node tools/bench.mjs --night 20 --gfx high   same, on the High preset
//   node tools/bench.mjs --seconds 8 --headless  short run
//
// One JSON line per scenario (the line AG-82 reads): fps, 1% low, worst frame,
// frames over 50 ms, draw calls and triangles. Draw calls and triangles come
// from renderer.info the same way tools/scene-counts.mjs reads them.
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
const GFX = flag('--gfx');
const NIGHT_ARG = flag('--night');
const SCENARIO_ARG = flag('--scenario');
let SCENARIO = SCENARIO_ARG || 'megaswarm';
let NIGHT = null;
if (NIGHT_ARG !== '') {
  NIGHT = Number(NIGHT_ARG);
  if (!Number.isInteger(NIGHT) || NIGHT < 1 || NIGHT > 20) {
    throw new Error('--night needs a night from 1 to 20');
  }
  if (SCENARIO_ARG && SCENARIO_ARG !== 'night') throw new Error('--night is its own scenario');
  SCENARIO = 'night';
}
if (GFX && !['low', 'medium', 'high', 'max'].includes(GFX)) {
  throw new Error('--gfx needs low, medium, high or max');
}

const server = await serve(ROOT, 0);
const browser = await launch({ headless: argv.includes('--headless') });
// Real animation frames. The raf=timer mode is clamped to one frame a second in a
// throttled tab, which left every one-second window empty.
const url = `${server.origin}/index.html?debug=1`;
console.log(`bench: ${url}`);
console.log(`bench: scenario ${SCENARIO}${SCENARIO === 'night' ? ' ' + NIGHT : ''} for ${SECONDS}s\n`);

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

// renderer.info the way scene-counts.mjs reads it, plus the one-second fps window.
// The counters reset at the start of a frame, so a single read can land on zero;
// two reads, and the larger draw count, is the frame that actually drew.
const SAMPLE = `(() => {
  const read = () => {
    const info = (TT.renderer && TT.renderer.info && TT.renderer.info.render) || {};
    const draws = info.drawCalls != null ? info.drawCalls : (info.calls || 0);
    return { draws, triangles: info.triangles || 0 };
  };
  let best = read();
  const again = read();
  if (again.draws > best.draws) best = again;
  const snap = TT.perfSnapshot() || { fps: 0, low: 0, worst: 0, hitches: 0, frames: 0 };
  return Object.assign({}, snap, best);
})()`;

// Jump to night N, start it, then walk the director to the last push and let that
// push's horde out (the field fills to the cap; a short push stops when it is out).
const ADVANCE = `(() => {
  const st = () => TT.getWaveDirectorState();
  const up = () => (TT.zombies || []).filter((z) => z.alive && !z.dying).length;
  const cap = TT.MAX_ZOMBIES || 48;
  let steps = 0;
  while (steps++ < 250) {
    const pc = st().pace;
    const onLast = !!(pc && pc.pushes > 0 && pc.push === pc.pushes - 1 && !pc.inLull);
    if (onLast) {
      if (up() >= cap) break;
      if (pc.left <= 0 && up() > 0) break;
      TT.spawnWaveBatch(0.25);
      continue;
    }
    if (!pc || pc.inLull || up() > 6) TT.clearZombies();
    TT.spawnWaveBatch(0.5);
  }
  const pc = st().pace;
  const onLast = !!(pc && pc.pushes > 0 && pc.push === pc.pushes - 1 && !pc.inLull);
  const out = up() >= cap || (pc && pc.left <= 0 && up() > 0);
  return {
    done: onLast && out,
    day: st().day,
    phase: st().phase,
    push: pc ? pc.push : null,
    pushes: pc ? pc.pushes : null,
    left: pc ? pc.left : null,
    zombies: up(),
    spawned: st().waveSpawned,
    total: st().waveTotal
  };
})()`;

function median(nums) {
  if (!nums.length) return 0;
  const s = nums.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
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

  let placed = null;
  if (GFX) {
    const applied = await page.evaluate(`(() => {
      if (!TT.GFX_PRESETS || !TT.GFX_PRESETS[${JSON.stringify(GFX)}]) return '';
      TT.applyGraphicsPreset(${JSON.stringify(GFX)});
      return TT.getGfx();
    })()`);
    if (applied !== GFX) throw new Error('graphics preset ' + GFX + ' did not apply');
    console.log(`bench: graphics ${applied}`);
  }

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
    placed = await page.evaluate(`(() => {
      TT.unlockAllBuilds(); TT.addCash(100000);
      const p = TT.player.position;
      const gx = TT.gridIndex(p.x), gz = TT.gridIndex(p.z);
      TT.setPlaceMode('wall');
      const c = TT.camera.position;
      // South of the landing spot: gz + 3 runs through the HQ cabin.
      const tz = TT.gridCentre(gz - 3);
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
  } else if (SCENARIO === 'night') {
    await startMatch(page);
    const jumped = await page.evaluate(`(() => {
      TT.runDevCommand('godmode');
      const ok = !!TT.devJumpToNight(${NIGHT}, true);
      const st = TT.getWaveDirectorState();
      return { ok, phase: st.phase, day: st.day, pushes: st.pace ? st.pace.pushes : 0 };
    })()`);
    if (!jumped.ok || jumped.phase !== 'wave') {
      throw new Error('devJumpToNight refused night ' + NIGHT + ' (' + JSON.stringify(jumped) + ')');
    }
    let state = null;
    for (let i = 0; i < 40; i++) {
      state = await page.evaluate(ADVANCE, 180000);
      console.log(`bench: night ${state.day} push ${state.push == null ? '?' : state.push + 1}/${state.pushes}  out ${state.zombies}  spawned ${state.spawned}/${state.total}`);
      if (state.done) break;
    }
    if (!state || !state.done) {
      throw new Error('night ' + NIGHT + ' never reached its last push with the horde out (' + JSON.stringify(state) + ')');
    }
    // The alarm brings night on over a couple of seconds. Measure after that, so the
    // frame is the night and not the sky tween.
    await page.evaluate('new Promise(r => setTimeout(r, 3000))');
  } else {
    throw new Error('unknown scenario ' + SCENARIO + ' (megaswarm, day5, build, night)');
  }

  await page.evaluate('TT.resetPerf()');
  const t0 = Date.now();
  const windows = [];
  while (Date.now() - t0 < SECONDS * 1000) {
    const snap = await page.evaluate(SAMPLE);
    if (snap) windows.push(snap);
    await new Promise((r) => setTimeout(r, 1000));
  }
  const tail = windows.slice(-10);
  const paced = tail.filter((w) => w.fps > 0);
  const use = paced.length ? paced : tail;
  const avg = (key) => use.reduce((sum, w) => sum + (w[key] || 0), 0) / (use.length || 1);
  const final = windows.at(-1) || { worst: 0, hitches: 0 };
  const counted = (use.some((w) => w.draws > 0) ? use : windows).filter((w) => w.draws > 0);
  const drawRows = counted.length ? counted : use;
  const end = await page.evaluate(`(() => {
    const pc = TT.getWaveDirectorState ? TT.getWaveDirectorState() : null;
    const pace = pc && pc.pace;
    return {
      zombies: (TT.zombies || []).filter((z) => z.alive).length,
      phase: pc ? pc.phase : null,
      day: pc ? pc.day : null,
      push: pace ? pace.push : null,
      pushes: pace ? pace.pushes : null,
      gfx: TT.getGfx ? TT.getGfx() : null
    };
  })()`);
  const round1 = (n) => Math.round(n * 10) / 10;
  const line = {
    scenario: SCENARIO,
    seconds: SECONDS,
    fps: round1(avg('fps')),
    low: round1(avg('low')),
    worst: round1(final.worst || 0),
    hitches: final.hitches || 0,
    draws: Math.round(median(drawRows.map((w) => w.draws || 0))),
    triangles: Math.round(median(drawRows.map((w) => w.triangles || 0))),
    zombies: end.zombies,
    gfx: end.gfx,
    windows: use.length
  };
  if (SCENARIO === 'night') {
    line.night = NIGHT;
    line.push = end.push;
    line.pushes = end.pushes;
    line.last = end.push != null && end.pushes != null && end.push === end.pushes - 1;
  }
  if (SCENARIO === 'megaswarm') line.count = COUNT;
  if (SCENARIO === 'build') line.placed = placed;
  console.log(`fps    ${line.fps.toFixed(1)}   (mean of last ${use.length} s)`);
  console.log(`low    ${line.low.toFixed(1)}   (1% low, same windows)`);
  console.log(`worst  ${line.worst.toFixed(1)} ms`);
  console.log(`hitch  ${line.hitches}   (frames over 50 ms, whole run)`);
  console.log(`draws  ${line.draws}`);
  console.log(`tris   ${line.triangles}`);
  console.log(JSON.stringify(line));
} finally {
  await browser.close();
  await server.close();
}
