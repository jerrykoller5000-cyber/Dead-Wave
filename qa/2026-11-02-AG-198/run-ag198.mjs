// qa/2026-11-02-AG-198/run-ag198.mjs
// AG-198: Real-hardware GPU validation of CL-275 score cues, calm places, and audio regression suite
// on NVIDIA GeForce RTX 5080 WebGPU.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Must run under the shared game-test slot');

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const TESTS = path.join(ROOT, 'tools', 'tests');
const OUT = path.join(ROOT, 'qa', '2026-11-02-AG-198');
fs.mkdirSync(OUT, { recursive: true });

const WIDTH = 1280;
const HEIGHT = 720;

const telemetry = {
  task: 'AG-198',
  agent: 'antigravity',
  timestamp: new Date().toISOString(),
  backend: null,
  suiteScore0: {},
  suiteDefaultScoreOn: {},
  earProxyAndPlaces: null
};

console.log('Starting server and browser for AG-198 Real-GPU Score Cues & Places Suite...');
const server = await serve(ROOT, 0);
console.log(`Server listening on ${server.origin}`);

const browser = await launch({
  headless: false,
  args: [
    `--window-size=${WIDTH},${HEIGHT}`,
    '--enable-precise-memory-info',
    '--task-id=AG-198-CUES-PLACES'
  ]
});

try {
  const suite = ['tcl275d', 'tcl275a', 't73', 't60', 't61'];

  // 1. Run the 5 tests with ?score=0 (matching pre-D-97-switch initial state where tests toggle setScore(true) themselves)
  for (const name of suite) {
    console.log(`\n======================================================`);
    console.log(`Running [${name}] with ?score=0 on real WebGPU renderer...`);
    console.log(`======================================================`);
    const code = fs.readFileSync(path.join(TESTS, name + '.js'), 'utf8');
    const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer&score=0`, { timeout: 300000 });
    await page.waitFor('!!window.TT', { timeout: 600000 });
    await page.evaluate('DWOpening?.dismissForTesting?.()');
    await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 });
    await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));

    const out = await page.evaluate(code, 300000);
    const lines = String(typeof out === 'string' ? out : JSON.stringify(out)).split('\n').map((l) => l.trim()).filter(Boolean);
    const pass = lines.filter((l) => l.startsWith('PASS')).length;
    const fail = lines.filter((l) => l.startsWith('FAIL')).length;

    const backend = await page.evaluate('window.TT?.getRendererBackend ? window.TT.getRendererBackend() : "unknown"');
    if (!telemetry.backend) telemetry.backend = backend;

    telemetry.suiteScore0[name] = { pass, fail, backend, lines };
    console.log(`[${name} (?score=0)] Finished: ${pass} PASS, ${fail} FAIL (Backend: ${backend})`);
    for (const l of lines) console.log('    ' + l);

    const shotFile = path.join(OUT, `${name}.png`);
    await page.screenshot(shotFile);
    try { await page.send('Page.close', {}); } catch {}
  }

  // 2. Also probe tcl275d and tcl275a under default URL (no ?score=0, where D-97 switch has score ON by default)
  for (const name of ['tcl275d', 'tcl275a']) {
    console.log(`\n======================================================`);
    console.log(`Running [${name}] under default URL (score ON by default)...`);
    console.log(`======================================================`);
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

    telemetry.suiteDefaultScoreOn[name] = { pass, fail, lines };
    console.log(`[${name} (default URL)] Finished: ${pass} PASS, ${fail} FAIL`);
    for (const l of lines) console.log('    ' + l);
    try { await page.send('Page.close', {}); } catch {}
  }

  // 3. Ear-proxy & places run with the score ON:
  //    - Check all cues in musicState().stings and score.stings (alarm untouched)
  //    - Walk to Graveyard (<40m), Relay mast (<35m), Hikers' camp (<30m), and verify each place track plays audibly
  //    - Advance to dusk (last prep before dark) and verify Pressure ('gh/gh-place-alarm-build') plays
  //    - Check musicState().lastCue at dusk transition and on night_falls cue, and verify overlapFrames stays 0
  console.log(`\n======================================================`);
  console.log(`Running Ear-Proxy & Places Pass on real WebGPU renderer...`);
  console.log(`======================================================`);
  const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  await page.waitFor('!!window.TT', { timeout: 600000 });
  await page.evaluate('DWOpening?.dismissForTesting?.()');
  await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));

  // Start match with score ON
  await page.evaluate(`(async () => {
    const T = window.TT, A = T.AudioSys;
    await startMatch(T, 'AG198EarProxy');
    if (A.setMuted) A.setMuted(false);
    if (!A.musicState().playing) A.startMusic();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
    await until(() => A.musicState().score && Object.keys(A.musicState().score.pools || {}).length > 0, 10000);
    A.setScore(true);
    await until(() => A.musicState().stage === 'calm' && /^gh\\/gh-place-/.test(A.musicState().deckTrack || '') && A.musicState().volume > 0.01, 20000);
  })()`, 60000);

  const initialCalm = await page.evaluate(`(() => {
    const ms = window.TT.AudioSys.musicState();
    return {
      scoreOn: ms.score.on,
      stage: ms.stage,
      mood: ms.mood,
      deckTrack: ms.deckTrack,
      front: ms.front,
      volume: ms.volume,
      deckLevel: ms.deckLevel,
      overlapFrames: ms.overlapFrames,
      lastCue: ms.lastCue,
      stings: ms.stings,
      scorePools: ms.score.pools,
      scoreStings: ms.score.stings
    };
  })()`);
  await page.screenshot(path.join(OUT, 'place-hq-day.png'));

  // Visit Graveyard (within 40 m)
  const graveyardState = await page.evaluate(`(async () => {
    const T = window.TT, A = T.AudioSys, ms = () => A.musicState();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
    const g = T.POI.graveyard, pp = T.player.position;
    pp.set(g.x + 6, T.sampleHeight(g.x + 6, g.z), g.z);
    await until(() => ms().deckTrack === 'gh/gh-place-graveyard' && ms().volume > 0.01, 20000);
    return {
      poi: g,
      dist: Math.hypot(pp.x - g.x, pp.z - g.z),
      mood: ms().mood,
      deckTrack: ms().deckTrack,
      front: ms().front,
      volume: ms().volume,
      deckLevel: ms().deckLevel,
      overlapFrames: ms().overlapFrames,
      lastDeckError: ms().lastDeckError
    };
  })()`, 60000);
  await page.screenshot(path.join(OUT, 'place-graveyard.png'));

  // Visit Relay Mast (within 35 m)
  const relayState = await page.evaluate(`(async () => {
    const T = window.TT, A = T.AudioSys, ms = () => A.musicState();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
    const m = T.POI.mast, pp = T.player.position;
    pp.set(m.x + 6, T.sampleHeight(m.x + 6, m.z), m.z);
    await until(() => ms().deckTrack === 'gh/gh-place-relay' && ms().volume > 0.01, 20000);
    return {
      poi: m,
      dist: Math.hypot(pp.x - m.x, pp.z - m.z),
      mood: ms().mood,
      deckTrack: ms().deckTrack,
      front: ms().front,
      volume: ms().volume,
      deckLevel: ms().deckLevel,
      overlapFrames: ms().overlapFrames,
      lastDeckError: ms().lastDeckError
    };
  })()`, 60000);
  await page.screenshot(path.join(OUT, 'place-relay.png'));

  // Visit Hikers' Camp (within 30 m)
  const hikersState = await page.evaluate(`(async () => {
    const T = window.TT, A = T.AudioSys, ms = () => A.musicState();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
    const h = T.POI.campsites && T.POI.campsites.find((c) => c.style === 'hikers');
    const pp = T.player.position;
    pp.set(h.x + 5, T.sampleHeight(h.x + 5, h.z), h.z);
    await until(() => ms().deckTrack === 'gh/gh-place-hikers' && ms().volume > 0.01, 20000);
    return {
      poi: { x: h.x, z: h.z, style: h.style },
      dist: Math.hypot(pp.x - h.x, pp.z - h.z),
      mood: ms().mood,
      deckTrack: ms().deckTrack,
      front: ms().front,
      volume: ms().volume,
      deckLevel: ms().deckLevel,
      overlapFrames: ms().overlapFrames,
      lastDeckError: ms().lastDeckError
    };
  })()`, 60000);
  await page.screenshot(path.join(OUT, 'place-hikers.png'));

  // Return to HQ & test Dusk (Pressure: gh/gh-place-alarm-build) and check musicState().lastCue for night_falls at dusk
  const duskAndNightFalls = await page.evaluate(`(async () => {
    const T = window.TT, A = T.AudioSys, ms = () => A.musicState();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
    // Move back to HQ away from special places
    const pp = T.player.position;
    pp.set(0, T.sampleHeight(0, 12), 12);
    await until(() => ms().mood === 'day' && /^gh\\/gh-place-(hq|menu)$/.test(ms().deckTrack || ''), 20000);

    const cueBeforeDusk = ms().lastCue;
    // Set clock to dusk (worldTime ~ 0.72 -> hod = 0.47, which is > 0.40 and < 0.62, and naturalNight = true)
    // First step through sunset transition (0.68 -> 0.72) to see if crossing into dusk/night triggers night_falls automatically
    T.setWorldTime(0.68);
    await wait(500);
    T.setWorldTime(0.72);
    await until(() => ms().mood === 'dusk' && ms().deckTrack === 'gh/gh-place-alarm-build' && ms().volume > 0.01, 20000);
    const cueAfterNaturalDuskTransition = ms().lastCue;
    const duskMoodState = {
      worldTime: T.getWorldTime(),
      mood: ms().mood,
      deckTrack: ms().deckTrack,
      front: ms().front,
      volume: ms().volume,
      deckLevel: ms().deckLevel,
      overlapFrames: ms().overlapFrames,
      lastCueAfterTransition: cueAfterNaturalDuskTransition
    };

    // Also test triggering musicCue('night_falls') at dusk and verify lastCue and overlapFrames
    A.musicCue('night_falls');
    await wait(600);
    const cueAfterExplicitNightFalls = ms().lastCue;
    const overlapAfterExplicit = ms().overlapFrames;

    return {
      cueBeforeDusk,
      duskMoodState,
      autoTriggeredNightFallsAtDusk: !!(cueAfterNaturalDuskTransition && cueAfterNaturalDuskTransition.name === 'night_falls'),
      cueAfterExplicitNightFalls,
      overlapAfterExplicit
    };
  })()`, 60000);
  await page.screenshot(path.join(OUT, 'place-dusk-pressure.png'));

  telemetry.earProxyAndPlaces = {
    initialCalm,
    graveyardState,
    relayState,
    hikersState,
    duskAndNightFalls
  };

  console.log('Ear-proxy & places telemetry:', JSON.stringify(telemetry.earProxyAndPlaces, null, 2));

  try { await page.send('Page.close', {}); } catch {}

  const telemPath = path.join(OUT, 'ag198-telemetry.json');
  fs.writeFileSync(telemPath, JSON.stringify(telemetry, null, 2));
  console.log(`\n======================================================`);
  console.log(`All AG-198 checks complete. Telemetry saved to ${telemPath}`);
  console.log(`======================================================`);
} finally {
  await browser.close();
  await server.close();
}
