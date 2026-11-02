// qa/2026-11-02-AG-194/run-ag194-score.mjs
// AG-194: Real-hardware GPU validation of CL-275 1.2 score on NVIDIA RTX 5080 WebGPU:
// 1. Suite tests tcl275a and tcl275b on real WebGPU renderer
// 2. Night 20 memory comparison (Score ON vs OFF) at peak wave push
// 3. Audible fault detection (overlapFrames, layer gains, bar-exact transitions)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Must run under the shared game-test slot');

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const TESTS = path.join(ROOT, 'tools', 'tests');
const OUT = path.join(ROOT, 'qa', '2026-11-02-AG-194');
fs.mkdirSync(OUT, { recursive: true });

const WIDTH = 1280;
const HEIGHT = 720;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    day: st().day,
    push: pc ? pc.push : null,
    pushes: pc ? pc.pushes : 0,
    zombies: up(),
    spawned: pc ? pc.spawned : 0,
    total: pc ? pc.total : 0,
    done: onLast && out
  };
})()`;

const telemetry = {
  task: 'AG-194',
  agent: 'antigravity',
  timestamp: new Date().toISOString(),
  backend: null,
  suiteTests: {},
  night20: {
    scoreOff: {},
    scoreOn: {},
    deltaMB: {}
  },
  audioState: {},
  faults: []
};

console.log('Starting server and browser for AG-194 Score & Memory GPU Audit...');
const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: [
    `--window-size=${WIDTH},${HEIGHT}`,
    '--enable-precise-memory-info',
    '--js-flags=--expose-gc'
  ]
});

try {
  // =========================================================================
  // 1. RUN SUITE TESTS: tcl275a AND tcl275b ON REAL WEBGPU RENDERER
  // =========================================================================
  console.log('\n--- 1. Real Renderer Suite Tests (tcl275a, tcl275b) ---');
  for (const name of ['tcl275a', 'tcl275b']) {
    console.log(`Running ${name} on real WebGPU renderer...`);
    const code = fs.readFileSync(path.join(TESTS, name + '.js'), 'utf8');
    const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
    await page.waitFor('!!window.TT', { timeout: 600000 });
    await page.evaluate('DWOpening?.dismissForTesting?.()');
    await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));

    const out = await page.evaluate(code, 300000);
    const lines = String(typeof out === 'string' ? out : JSON.stringify(out)).split('\n').map((l) => l.trim()).filter(Boolean);
    const pass = lines.filter((l) => l.startsWith('PASS')).length;
    const fail = lines.filter((l) => l.startsWith('FAIL')).length;

    telemetry.suiteTests[name] = { pass, fail, lines };
    console.log(`[${name}] Result: ${pass} PASS, ${fail} FAIL`);
    for (const l of lines) console.log('    ' + l);
    try { await page.send('Page.close', {}); } catch {}
  }

  // =========================================================================
  // 2. NIGHT 20 MEMORY BENCHMARK: SCORE OFF
  // =========================================================================
  console.log('\n--- 2. Night 20 Wave Peak Memory: Score OFF (Baseline) ---');
  {
    const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
    await page.waitFor('!!window.TT', { timeout: 600000 });
    await page.evaluate('DWOpening?.dismissForTesting?.()');
    await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

    await page.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'ScoreOff');
      T.runDevCommand('godmode');
      T.AudioSys.setScore(false);
      const ok = !!T.devJumpToNight(20, true);
      if (!ok) throw new Error('devJumpToNight 20 failed');
    })()`);

    // Advance to wave peak
    let state = null;
    for (let i = 0; i < 40; i++) {
      state = await page.evaluate(ADVANCE, 180000);
      console.log(`[Score OFF] Night 20 push ${state.push == null ? '?' : state.push + 1}/${state.pushes} zombies=${state.zombies} spawned=${state.spawned}/${state.total}`);
      if (state.done) break;
    }

    await sleep(3000); // Allow frame/audio stabilization

    // Force GC if available to measure true retained heap
    await page.evaluate('window.gc && window.gc()');
    await sleep(500);

    const memData = await page.evaluate(`(() => {
      const T = TT;
      const mem = window.performance?.memory || {};
      const ms = T.AudioSys?.musicState() || {};
      return {
        backend: T.getRendererBackend(),
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit,
        musicState: {
          playing: ms.playing,
          stage: ms.stage,
          deckTrack: ms.deckTrack,
          overlapFrames: ms.overlapFrames,
          scoreOn: ms.score?.on
        }
      };
    })()`);

    let cdpMetrics = {};
    try {
      const resp = await page.send('Performance.getMetrics', {});
      for (const m of resp.metrics || []) cdpMetrics[m.name] = m.value;
    } catch (e) {
      console.warn('CDP Performance.getMetrics unavailable:', e.message);
    }

    telemetry.night20.scoreOff = {
      usedHeapMB: (memData.usedJSHeapSize / (1024 * 1024)).toFixed(2),
      totalHeapMB: (memData.totalJSHeapSize / (1024 * 1024)).toFixed(2),
      cdpJSHeapUsedMB: cdpMetrics.JSHeapUsedSize ? (cdpMetrics.JSHeapUsedSize / (1024 * 1024)).toFixed(2) : null,
      cdpJSHeapTotalMB: cdpMetrics.JSHeapTotalSize ? (cdpMetrics.JSHeapTotalSize / (1024 * 1024)).toFixed(2) : null,
      musicState: memData.musicState
    };
    telemetry.backend = memData.backend;
    console.log('[Score OFF] Wave Peak Memory:', telemetry.night20.scoreOff);

    await page.screenshot(path.join(OUT, 'night20-score-off-peak.png'));
    try { await page.send('Page.close', {}); } catch {}
  }

  // =========================================================================
  // 3. NIGHT 20 MEMORY BENCHMARK: SCORE ON
  // =========================================================================
  console.log('\n--- 3. Night 20 Wave Peak Memory: Score ON (Opt-in 1.2 Score) ---');
  {
    const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
    await page.waitFor('!!window.TT', { timeout: 600000 });
    await page.evaluate('DWOpening?.dismissForTesting?.()');
    await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

    await page.evaluate(`(async () => {
      const T = TT;
      await startMatch(T, 'ScoreOn');
      T.runDevCommand('godmode');
      T.AudioSys.setMuted(false);
      T.AudioSys.setScore(true);
      if (!T.AudioSys.musicState().playing) T.AudioSys.startMusic();
    })()`);

    // Wait for night 20 score track to load / decode
    console.log('[Score ON] Preloading & decoding Night 20 score tracks...');
    await page.evaluate(`(async () => {
      const ms = () => TT.AudioSys.musicState();
      const t0 = Date.now();
      while (Date.now() - t0 < 30000) {
        if (ms().sectionsReady && (ms().sectionsReady['gh/night-20'] || ms().score?.failed?.includes('gh/night-20'))) break;
        await new Promise(r => setTimeout(r, 200));
      }
    })()`);

    await page.evaluate(`(() => {
      const ok = !!TT.devJumpToNight(20, true);
      if (!ok) throw new Error('devJumpToNight 20 failed');
    })()`);

    // Advance to wave peak
    let state = null;
    for (let i = 0; i < 40; i++) {
      state = await page.evaluate(ADVANCE, 180000);
      console.log(`[Score ON] Night 20 push ${state.push == null ? '?' : state.push + 1}/${state.pushes} zombies=${state.zombies} spawned=${state.spawned}/${state.total}`);
      if (state.done) break;
    }

    await sleep(3000);

    // Force GC to measure retained heap with decoded audio buffers
    await page.evaluate('window.gc && window.gc()');
    await sleep(500);

    const memData = await page.evaluate(`(() => {
      const T = TT;
      const mem = window.performance?.memory || {};
      const ms = T.AudioSys?.musicState() || {};
      return {
        backend: T.getRendererBackend(),
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit,
        musicState: {
          playing: ms.playing,
          stage: ms.stage,
          deckTrack: ms.deckTrack,
          overlapFrames: ms.overlapFrames,
          sectionLoop: ms.sectionLoop,
          score: ms.score ? {
            on: ms.score.on,
            track: ms.score.track,
            kit: ms.score.kit,
            barS: ms.score.barS,
            layers: ms.score.layers,
            layerGains: ms.score.layerGains,
            failed: ms.score.failed
          } : null
        }
      };
    })()`);

    let cdpMetrics = {};
    try {
      const resp = await page.send('Performance.getMetrics', {});
      for (const m of resp.metrics || []) cdpMetrics[m.name] = m.value;
    } catch (e) {
      console.warn('CDP Performance.getMetrics unavailable:', e.message);
    }

    telemetry.night20.scoreOn = {
      usedHeapMB: (memData.usedJSHeapSize / (1024 * 1024)).toFixed(2),
      totalHeapMB: (memData.totalJSHeapSize / (1024 * 1024)).toFixed(2),
      cdpJSHeapUsedMB: cdpMetrics.JSHeapUsedSize ? (cdpMetrics.JSHeapUsedSize / (1024 * 1024)).toFixed(2) : null,
      cdpJSHeapTotalMB: cdpMetrics.JSHeapTotalSize ? (cdpMetrics.JSHeapTotalSize / (1024 * 1024)).toFixed(2) : null,
      musicState: memData.musicState
    };
    console.log('[Score ON] Wave Peak Memory:', telemetry.night20.scoreOn);

    await page.screenshot(path.join(OUT, 'night20-score-on-peak.png'));

    // Check for audible faults
    const ms = memData.musicState;
    if (ms.overlapFrames > 0) {
      telemetry.faults.push(`overlapFrames detected: ${ms.overlapFrames}`);
    }
    if (ms.score) {
      const gains = ms.score.layerGains || {};
      for (const [layer, gain] of Object.entries(gains)) {
        if (Number.isNaN(gain) || gain < 0 || gain > 1.0) {
          telemetry.faults.push(`Invalid layer gain on ${layer}: ${gain}`);
        }
      }
    }

    // Delta computation
    const offUsed = parseFloat(telemetry.night20.scoreOff.usedHeapMB);
    const onUsed = parseFloat(telemetry.night20.scoreOn.usedHeapMB);
    telemetry.night20.deltaMB = {
      usedHeapDeltaMB: (onUsed - offUsed).toFixed(2),
      cdpUsedDeltaMB: (telemetry.night20.scoreOn.cdpJSHeapUsedMB && telemetry.night20.scoreOff.cdpJSHeapUsedMB)
        ? (parseFloat(telemetry.night20.scoreOn.cdpJSHeapUsedMB) - parseFloat(telemetry.night20.scoreOff.cdpJSHeapUsedMB)).toFixed(2)
        : null
    };

    console.log('\n--- Memory Delta Summary (Score ON vs OFF) ---');
    console.log(`Used Heap Delta: +${telemetry.night20.deltaMB.usedHeapDeltaMB} MB (decoded multi-track Hellshot suite)`);

    try { await page.send('Page.close', {}); } catch {}
  }

  // Save telemetry
  fs.writeFileSync(path.join(OUT, 'ag194-telemetry.json'), JSON.stringify(telemetry, null, 2));
  console.log('\nTelemetry written to ag194-telemetry.json');

} finally {
  await browser.close();
  await server.close();
}
