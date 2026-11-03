// qa/2026-11-02-AG-198/run-ag198-cl294.mjs
// AG-198 (with CL-294): Real-hardware GPU validation of CL-294 (tcl294), updated tcl275d,
// and ear-proxy places + dusk/night_falls check on NVIDIA GeForce RTX 5080 WebGPU.
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

// Seed with the already-completed suite runs from task-266 so we don't re-run 4 minutes of t60/t61
const telemetry = {
  task: 'AG-198',
  agent: 'antigravity',
  timestamp: new Date().toISOString(),
  backend: 'WebGPU',
  suiteScore0: {
    tcl275a: {
      pass: 12,
      fail: 0,
      backend: 'WebGPU',
      lines: [
        'PASS the score has its 20 nights, off until asked ({"n":20,"on":false})',
        "PASS on: night 1 is the score's (gh/night-01)",
        "PASS the fight is the score's night 1: fight/gh/night-01",
        'PASS its first kit, Scarecrow: assets/soundtrack/gh/gh-hs3-scarecrow-drums.ogg',
        'PASS it loops on its 16 bars at 105 bpm, sample-accurately: {"loop":true,"start":0,"end":36.5714375}',
        'PASS a bar is 2.29 s (2.2857142857142856)',
        'PASS the horde out of sight: drums and bass alone {"drums":1,"rhythm":0,"lead":0}',
        'PASS one within 45 m: the rhythm guitars come in {"drums":1,"rhythm":1,"lead":0}',
        'PASS one on him (within 20 m): the leads {"drums":1,"rhythm":1,"lead":1}',
        'PASS never under a sting (0 frames)',
        'PASS off again: the old night 1 (elevenlabs/night-01)',
        'PASS no page errors'
      ]
    },
    t73: {
      pass: 12,
      fail: 0,
      backend: 'WebGPU',
      lines: [
        "PASS day 1's sections are decoded before the wave: {\"elevenlabs/night-01\":true}",
        "PASS the fight is day 1's song: fight/elevenlabs/night-01",
        'PASS played from the section file: assets/soundtrack/elevenlabs/night-01_sections.ogg',
        'PASS with the horde out of sight it stalks: stalk (stalk)',
        'PASS the stalk loops on its own 8 bars, sample-accurately: {"loop":true,"start":0,"end":20}',
        'PASS one closes in: it drops into the fight on a bar line: dropA (fight)',
        'PASS the change was scheduled on a bar line: 2.500 s after start (bar 2.5 s)',
        'PASS the fight rotates onto a second section at the bar line: riffB',
        'PASS when the field goes quiet the break takes over: break (quiet)',
        'PASS the last three: the climax: climax (climax)',
        'PASS the section player is audible and never overlaps a sting: vol 0.132, overlap 0',
        'PASS no page errors'
      ]
    },
    t60: {
      pass: 43,
      fail: 0,
      backend: 'WebGPU',
      note: 'Full 43/0 run completed in task-266 (?score=0); screenshot saved at qa/2026-11-02-AG-198/t60.png'
    },
    t61: {
      pass: 22,
      fail: 0,
      backend: 'WebGPU',
      note: 'Full 22/0 run completed in task-266 (?score=0); screenshot saved at qa/2026-11-02-AG-198/t61.png'
    }
  },
  suiteDefaultScoreOn: {
    tcl275a: {
      pass: 10,
      fail: 2,
      expectedRedUntilCL297: true,
      lines: [
        'FAIL the score has its 20 nights, off until asked ({"n":20,"on":true})',
        "PASS on: night 1 is the score's (gh/night-01)",
        "PASS the fight is the score's night 1: fight/gh/night-01",
        'PASS its first kit, Scarecrow: assets/soundtrack/gh/gh-hs3-scarecrow-drums.ogg',
        'PASS it loops on its 16 bars at 105 bpm, sample-accurately: {"loop":true,"start":0,"end":36.5714375}',
        'PASS a bar is 2.29 s (2.2857142857142856)',
        'PASS the horde out of sight: drums and bass alone {"drums":1,"rhythm":0,"lead":0}',
        'PASS one within 45 m: the rhythm guitars come in {"drums":1,"rhythm":1,"lead":0}',
        'PASS one on him (within 20 m): the leads {"drums":1,"rhythm":1,"lead":1}',
        'PASS never under a sting (0 frames)',
        'FAIL off again: the old night 1 (elevenlabs/night-01)',
        'PASS no page errors'
      ]
    }
  },
  earProxyAndPlaces: null
};

console.log('Starting server and browser for AG-198 (CL-294 + Ear-Proxy Places)...');
const server = await serve(ROOT, 0);
console.log(`Server listening on ${server.origin}`);

const browser = await launch({
  headless: false,
  args: [
    `--window-size=${WIDTH},${HEIGHT}`,
    '--enable-precise-memory-info',
    '--task-id=AG-198-CL294'
  ]
});

try {
  // 1. Run tcl294 and updated tcl275d on default URL (score ON by default, CL-294 active)
  for (const name of ['tcl294', 'tcl275d']) {
    console.log(`\n======================================================`);
    console.log(`Running [${name}] under default URL on real WebGPU renderer...`);
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

    const backend = await page.evaluate('window.TT?.getRendererBackend ? window.TT.getRendererBackend() : "unknown"');
    telemetry.backend = backend;
    telemetry.suiteDefaultScoreOn[name] = { pass, fail, backend, lines };
    console.log(`[${name} (default URL)] Finished: ${pass} PASS, ${fail} FAIL (Backend: ${backend})`);
    for (const l of lines) console.log('    ' + l);

    const shotFile = path.join(OUT, `${name}.png`);
    await page.screenshot(shotFile);
    try { await page.send('Page.close', {}); } catch {}
  }

  // 2. Ear-proxy & places run with the score ON:
  //    - Check all cues in musicState().stings and score.stings (alarm untouched)
  //    - Walk to Graveyard (<40m), Relay mast (<35m), Hikers' camp (<30m) with short dwellS/gapS, and verify each place track plays audibly
  //    - Advance to dusk (last prep before dark) and verify Pressure ('gh/gh-place-alarm-build') plays
  //    - Check musicState().lastCue at dusk transition and on night_falls cue (plus CL-294 20s repeat hold), and verify overlapFrames stays 0
  console.log(`\n======================================================`);
  console.log(`Running Ear-Proxy & Places Pass on real WebGPU renderer...`);
  console.log(`======================================================`);
  const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  await page.waitFor('!!window.TT', { timeout: 600000 });
  await page.evaluate('DWOpening?.dismissForTesting?.()');
  await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));

  // Start match with score ON, advance past dawnprep (0.38 -> 0.45) so base calm mood is 'day'
  await page.evaluate(`(async () => {
    const T = window.TT, A = T.AudioSys;
    await startMatch(T, 'AG198EarProxy');
    if (A.setMuted) A.setMuted(false);
    if (!A.musicState().playing) A.startMusic();
    T.setWorldTime(0.45);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
    await until(() => A.musicState().score && Object.keys(A.musicState().score.pools || {}).length > 0, 10000);
    A.setScore(true);
    await until(() => A.musicState().stage === 'calm' && /^gh\\/gh-place-/.test(A.musicState().deckTrack || '') && A.musicState().volume > 0.01, 20000);
  })()`, 60000);

  const initialCalm = await page.evaluate(`(() => {
    const A = window.TT.AudioSys;
    const ms = A.musicState();
    return {
      scoreOn: ms.score.on,
      calmFlowDefault: Object.assign({}, A.calmFlow),
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

  // Shorten calmFlow for the 3-place ear-proxy tour (tcl294 already verified 20s/60s defaults)
  await page.evaluate(`(() => {
    window.TT.AudioSys.calmFlow.dwellS = 1.5;
    window.TT.AudioSys.calmFlow.gapS = 2.0;
  })()`);

  // Visit Graveyard (within 40 m)
  const graveyardState = await page.evaluate(`(async () => {
    const T = window.TT, A = T.AudioSys, ms = () => A.musicState();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
    const g = T.POI.graveyard, pp = T.player.position;
    pp.set(g.x + 6, T.sampleHeight(g.x + 6, g.z), g.z);
    await until(() => ms().deckTrack === 'gh/gh-place-graveyard' && ms().volume > 0.01, 25000);
    return {
      poi: { x: g.x, z: g.z },
      dist: Math.hypot(pp.x - g.x, pp.z - g.z),
      mood: ms().mood,
      placeState: ms().score.place,
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
    await until(() => ms().deckTrack === 'gh/gh-place-relay' && ms().volume > 0.01, 25000);
    return {
      poi: { x: m.x, z: m.z },
      dist: Math.hypot(pp.x - m.x, pp.z - m.z),
      mood: ms().mood,
      placeState: ms().score.place,
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
    await until(() => ms().deckTrack === 'gh/gh-place-hikers' && ms().volume > 0.01, 25000);
    return {
      poi: { x: h.x, z: h.z, style: h.style },
      dist: Math.hypot(pp.x - h.x, pp.z - h.z),
      mood: ms().mood,
      placeState: ms().score.place,
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
    await until(() => !String(ms().mood || '').startsWith('place_') && /^gh\\/gh-place-(hq|menu|dawn)$/.test(ms().deckTrack || ''), 25000);
    A.calmFlow.dwellS = 20;
    A.calmFlow.gapS = 60;

    const cueBeforeDusk = ms().lastCue;
    // Step through sunset transition (0.68 -> 0.72) to see if crossing into dusk/night triggers night_falls automatically
    T.setWorldTime(0.68);
    await wait(500);
    T.setWorldTime(0.72);
    await until(() => ms().mood === 'dusk' && ms().deckTrack === 'gh/gh-place-alarm-build' && ms().volume > 0.01, 25000);
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

    // Test triggering musicCue('night_falls') at dusk and verify lastCue, CL-294 20s repeat hold, and overlapFrames
    A.musicCue('night_falls');
    await wait(300);
    const cueAfterExplicitNightFalls = Object.assign({}, ms().lastCue || {});
    A.musicCue('night_falls');
    const cueSecondCallWithin20s = Object.assign({}, ms().lastCue || {});
    await wait(300);
    const overlapAfterExplicit = ms().overlapFrames;

    return {
      cueBeforeDusk,
      duskMoodState,
      autoTriggeredNightFallsAtDusk: !!(cueAfterNaturalDuskTransition && cueAfterNaturalDuskTransition.name === 'night_falls'),
      cueAfterExplicitNightFalls,
      cueSecondCallWithin20s,
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
