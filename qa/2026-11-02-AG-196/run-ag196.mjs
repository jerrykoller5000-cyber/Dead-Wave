// qa/2026-11-02-AG-196/run-ag196.mjs
// AG-196: The score's real memory (process private bytes & private working set)
// Claude's request:
// "On the PC, night 20 at the wave's peak, score off then on (setScore(true) before the wave),
// two runs each: the private working set of every Chrome process of the game page
// (renderer, GPU, audio service; PowerShell Get-Process with the command line telling which is which),
// summed and per process. Also once in the Training Ground with three motifs called in a row
// (feral, brute, spitter): does memory come back down after each is cleared?
// Report handoffs/2026-11-02-antigravity-AG-196.md."

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Must run under the shared game-test slot');

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT = path.join(ROOT, 'qa', '2026-11-02-AG-196');
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

function getProcessMemory(tag = 'AG-196') {
  const psPath = path.join(OUT, 'get-chrome-memory.ps1');
  const raw = execFileSync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', psPath,
    '-Tag', tag
  ], { encoding: 'utf8' });
  let list = [];
  try {
    list = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse PS output:', raw);
  }
  const arr = Array.isArray(list) ? list : (list ? [list] : []);
  const sumPrivBytesMB = arr.reduce((acc, p) => acc + (p.PrivateBytesMB || 0), 0);
  const sumPrivWsMB = arr.reduce((acc, p) => acc + (p.PrivateWorkingSetMB || 0), 0);
  const sumWsMB = arr.reduce((acc, p) => acc + (p.WorkingSetMB || 0), 0);
  return {
    processes: arr,
    sumPrivateBytesMB: Math.round(sumPrivBytesMB * 100) / 100,
    sumPrivateWorkingSetMB: Math.round(sumPrivWsMB * 100) / 100,
    sumWorkingSetMB: Math.round(sumWsMB * 100) / 100
  };
}

async function getPageMetrics(page) {
  const memData = await page.evaluate(`(() => {
    const T = TT;
    const mem = window.performance?.memory || {};
    const ms = T.AudioSys?.musicState() || {};
    return {
      backend: T.getRendererBackend ? T.getRendererBackend() : 'unknown',
      usedJSHeapMB: mem.usedJSHeapSize ? (mem.usedJSHeapSize / (1024 * 1024)).toFixed(2) : null,
      totalJSHeapMB: mem.totalJSHeapSize ? (mem.totalJSHeapSize / (1024 * 1024)).toFixed(2) : null,
      musicState: {
        playing: ms.playing,
        stage: ms.stage,
        deckTrack: ms.deckTrack,
        overlapFrames: ms.overlapFrames,
        score: ms.score ? {
          on: ms.score.on,
          track: ms.score.track,
          kit: ms.score.kit,
          barS: ms.score.barS,
          layers: ms.score.layers,
          layerGains: ms.score.layerGains,
          motif: ms.score.motif
        } : null
      }
    };
  })()`);

  let cdpMetrics = {};
  try {
    const resp = await page.send('Performance.getMetrics', {});
    for (const m of resp.metrics || []) cdpMetrics[m.name] = m.value;
  } catch (e) {}

  return {
    usedJSHeapMB: memData.usedJSHeapMB,
    totalJSHeapMB: memData.totalJSHeapMB,
    cdpJSHeapUsedMB: cdpMetrics.JSHeapUsedSize ? (cdpMetrics.JSHeapUsedSize / (1024 * 1024)).toFixed(2) : null,
    backend: memData.backend,
    musicState: memData.musicState
  };
}

async function runNight20(server, { scoreOn, runIndex }) {
  console.log(`\n======================================================`);
  console.log(`Starting Night 20 (Score ${scoreOn ? 'ON' : 'OFF'}, Run ${runIndex})...`);
  console.log(`======================================================`);
  const tag = `AG-196-N20-${scoreOn ? 'ON' : 'OFF'}-R${runIndex}`;
  const browser = await launch({
    headless: false,
    args: [
      `--window-size=${WIDTH},${HEIGHT}`,
      '--enable-precise-memory-info',
      '--js-flags=--expose-gc',
      `--task-id=${tag}`
    ]
  });

  try {
    const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
    await page.waitFor('!!window.TT', { timeout: 600000 });
    await page.evaluate('DWOpening?.dismissForTesting?.()');
    await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

    if (scoreOn) {
      await page.evaluate(`(async () => {
        const T = TT;
        await startMatch(T, 'ScoreOn');
        T.runDevCommand('godmode');
        T.AudioSys.setMuted(false);
        T.AudioSys.setScore(true);
        if (!T.AudioSys.musicState().playing) T.AudioSys.startMusic();
      })()`);

      console.log('Preloading & waiting for Night 20 score tracks...');
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
    } else {
      await page.evaluate(`(async () => {
        const T = TT;
        await startMatch(T, 'ScoreOff');
        T.runDevCommand('godmode');
        T.AudioSys.setScore(false);
        const ok = !!T.devJumpToNight(20, true);
        if (!ok) throw new Error('devJumpToNight 20 failed');
      })()`);
    }

    console.log('Advancing wave to peak push (6/6)...');
    let state = null;
    for (let i = 0; i < 40; i++) {
      state = await page.evaluate(ADVANCE, 180000);
      console.log(`push ${state.push == null ? '?' : state.push + 1}/${state.pushes} zombies=${state.zombies} spawned=${state.spawned}/${state.total}`);
      if (state.done) break;
    }

    await sleep(3500); // Allow frame/audio settling
    await page.evaluate('window.gc && window.gc()');
    await sleep(500);

    const shotName = `night20-score-${scoreOn ? 'on' : 'off'}-run${runIndex}.png`;
    await page.screenshot(path.join(OUT, shotName));

    const pageMetrics = await getPageMetrics(page);
    const procMem = getProcessMemory(tag);

    console.log(`[Night 20 ${scoreOn ? 'ON' : 'OFF'} R${runIndex}] Summed PrivWS: ${procMem.sumPrivateWorkingSetMB} MB, Summed PrivBytes: ${procMem.sumPrivateBytesMB} MB, JS Heap: ${pageMetrics.usedJSHeapMB} MB`);
    for (const p of procMem.processes) {
      console.log(`  - [${p.Role}] PID ${p.Id}: PrivWS=${p.PrivateWorkingSetMB} MB, PrivBytes=${p.PrivateBytesMB} MB, WS=${p.WorkingSetMB} MB`);
    }

    return {
      scoreOn,
      runIndex,
      screenshot: shotName,
      pageMetrics,
      processMemory: procMem
    };
  } finally {
    await browser.close();
    await sleep(1000); // Allow processes to fully terminate
  }
}

async function runTrainingGround(server) {
  console.log(`\n======================================================`);
  console.log(`Starting Training Ground Motifs Memory Audit...`);
  console.log(`======================================================`);
  const tag = 'AG-196-TG-MOTIFS';
  const browser = await launch({
    headless: false,
    args: [
      `--window-size=${WIDTH},${HEIGHT}`,
      '--enable-precise-memory-info',
      '--js-flags=--expose-gc',
      `--task-id=${tag}`
    ]
  });

  const tgResults = {
    baseline: null,
    motifs: {}
  };

  try {
    const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
    await page.waitFor('!!window.TT', { timeout: 600000 });
    await page.evaluate('DWOpening?.dismissForTesting?.()');
    await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 });

    console.log('Entering Training Ground...');
    await page.evaluate(`(async () => {
      const T = TT;
      const nameEl = document.getElementById('playerName');
      if (nameEl && !nameEl.value) nameEl.value = 'Trainee';
      document.getElementById('modeTraining').click();
    })()`);
    await page.waitFor('window.TT && window.TT.trainingDbg && window.TT.trainingDbg.state().active', { timeout: 30000 });

    await page.evaluate(`(async () => {
      const T = TT;
      if (T.AudioSys.setMuted) T.AudioSys.setMuted(false);
      if (!T.AudioSys.musicState().playing && T.AudioSys.startMusic) T.AudioSys.startMusic();
      T.AudioSys.setScore(true);
    })()`);

    await page.waitFor('window.TT && window.TT.AudioSys && window.TT.AudioSys.musicState().score && Object.keys(window.TT.AudioSys.musicState().score.motifs || {}).length > 0', { timeout: 25000 });

    // Allow room audio to settle
    console.log('Settling room audio before baseline...');
    await sleep(4000);
    await page.evaluate('window.gc && window.gc()');
    await sleep(500);

    await page.screenshot(path.join(OUT, 'tg-motif-baseline.png'));
    const basePage = await getPageMetrics(page);
    const baseProc = getProcessMemory(tag);
    tgResults.baseline = {
      screenshot: 'tg-motif-baseline.png',
      pageMetrics: basePage,
      processMemory: baseProc
    };
    console.log(`[Baseline] PrivWS: ${baseProc.sumPrivateWorkingSetMB} MB, PrivBytes: ${baseProc.sumPrivateBytesMB} MB, Heap: ${basePage.usedJSHeapMB} MB`);

    // Sequentially test feral, brute, spitter
    const kinds = ['feral', 'brute', 'spitter'];
    for (const kind of kinds) {
      console.log(`\n--- Calling motif: ${kind} ---`);
      await page.evaluate(`window.TT.trainingDbg.spawn('${kind}', 1)`);

      // Wait until motif started
      await page.waitFor(`(() => {
        const ms = window.TT.AudioSys.musicState();
        return ms.score && ms.score.motif && ms.score.motif.kind === '${kind}' && ms.score.motif.started;
      })()`, { timeout: 25000 });

      // Let it play / buffer
      await sleep(3500);
      const activeShot = `tg-motif-${kind}-active.png`;
      await page.screenshot(path.join(OUT, activeShot));
      const activePage = await getPageMetrics(page);
      const activeProc = getProcessMemory(tag);
      console.log(`[${kind} ACTIVE] PrivWS: ${activeProc.sumPrivateWorkingSetMB} MB, PrivBytes: ${activeProc.sumPrivateBytesMB} MB, Heap: ${activePage.usedJSHeapMB} MB`);
      for (const p of activeProc.processes) {
        console.log(`    - [${p.Role}] PrivWS=${p.PrivateWorkingSetMB} MB, PrivBytes=${p.PrivateBytesMB} MB`);
      }

      // Clear practice
      console.log(`Clearing ${kind}...`);
      await page.evaluate('window.TT.trainingDbg.clear()');

      // Wait until motif gone
      await page.waitFor(`(() => {
        const ms = window.TT.AudioSys.musicState();
        return !ms.score || !ms.score.motif;
      })()`, { timeout: 20000 });

      // Wait for quiet / audio release
      await sleep(4000);
      await page.evaluate('window.gc && window.gc()');
      await sleep(500);

      const clearedShot = `tg-motif-${kind}-cleared.png`;
      await page.screenshot(path.join(OUT, clearedShot));
      const clearedPage = await getPageMetrics(page);
      const clearedProc = getProcessMemory(tag);
      console.log(`[${kind} CLEARED] PrivWS: ${clearedProc.sumPrivateWorkingSetMB} MB, PrivBytes: ${clearedProc.sumPrivateBytesMB} MB, Heap: ${clearedPage.usedJSHeapMB} MB`);
      for (const p of clearedProc.processes) {
        console.log(`    - [${p.Role}] PrivWS=${p.PrivateWorkingSetMB} MB, PrivBytes=${p.PrivateBytesMB} MB`);
      }

      tgResults.motifs[kind] = {
        active: {
          screenshot: activeShot,
          pageMetrics: activePage,
          processMemory: activeProc
        },
        cleared: {
          screenshot: clearedShot,
          pageMetrics: clearedPage,
          processMemory: clearedProc
        }
      };
    }

    await page.evaluate('window.TT.trainingDbg.leave && window.TT.trainingDbg.leave()');
    return tgResults;
  } finally {
    await browser.close();
    await sleep(1000);
  }
}

async function main() {
  console.log('Starting AG-196 Memory Benchmark Suite...');
  const server = await serve(ROOT, 0);
  console.log(`Server listening on ${server.origin}`);

  const telemetry = {
    task: 'AG-196',
    agent: 'antigravity',
    timestamp: new Date().toISOString(),
    night20: {
      scoreOff: [],
      scoreOn: []
    },
    trainingGround: null
  };

  try {
    // 1. Two runs Score OFF at Night 20 wave peak
    telemetry.night20.scoreOff.push(await runNight20(server, { scoreOn: false, runIndex: 1 }));
    telemetry.night20.scoreOff.push(await runNight20(server, { scoreOn: false, runIndex: 2 }));

    // 2. Two runs Score ON at Night 20 wave peak
    telemetry.night20.scoreOn.push(await runNight20(server, { scoreOn: true, runIndex: 1 }));
    telemetry.night20.scoreOn.push(await runNight20(server, { scoreOn: true, runIndex: 2 }));

    // 3. Training Ground Motifs sequence
    telemetry.trainingGround = await runTrainingGround(server);

    // Save telemetry JSON
    const telemPath = path.join(OUT, 'ag196-telemetry.json');
    fs.writeFileSync(telemPath, JSON.stringify(telemetry, null, 2));
    console.log(`\n======================================================`);
    console.log(`Telemetry successfully written to ${telemPath}`);
    console.log(`======================================================`);
  } finally {
    await server.close();
  }
}

await main();
