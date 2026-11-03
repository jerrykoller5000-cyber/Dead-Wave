// qa/2026-11-02-AG-198/run-ag198-ear-only.mjs
// AG-198 Ear-Proxy & Places Pass with T.clearZombies() so calm place tracks (graveyard, relay, hikers, dusk)
// play without daytime POI guard zombies triggering chip_skirmish_b dayfight.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Must run under the shared game-test slot');

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const TESTS = path.join(ROOT, 'tools', 'tests');
const OUT = path.join(ROOT, 'qa', '2026-11-02-AG-198');
const telemPath = path.join(OUT, 'ag198-telemetry.json');
const telemetry = JSON.parse(fs.readFileSync(telemPath, 'utf8'));

const WIDTH = 1280;
const HEIGHT = 720;

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: [
    `--window-size=${WIDTH},${HEIGHT}`,
    '--enable-precise-memory-info',
    '--task-id=AG-198-EAR-ONLY'
  ]
});

try {
  const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  await page.waitFor('!!window.TT', { timeout: 600000 });
  await page.evaluate('DWOpening?.dismissForTesting?.()');
  await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));

  // Start match with score ON, clear daytime POI zombies so stage stays 'calm', and set worldTime to mid-day (0.50)
  await page.evaluate(`(async () => {
    const T = window.TT, A = T.AudioSys;
    await startMatch(T, 'AG198EarProxyCalm');
    if (T.clearZombies) T.clearZombies();
    if (A.setMuted) A.setMuted(false);
    if (!A.musicState().playing) A.startMusic();
    T.setWorldTime(0.50);
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
    window.TT.AudioSys.calmFlow.dwellS = 1.0;
    window.TT.AudioSys.calmFlow.gapS = 1.5;
  })()`);

  // Visit Graveyard (within 40 m)
  const graveyardState = await page.evaluate(`(async () => {
    const T = window.TT, A = T.AudioSys, ms = () => A.musicState();
    if (T.clearZombies) T.clearZombies();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
    const g = T.POI.graveyard, pp = T.player.position;
    pp.set(g.x + 6, T.sampleHeight(g.x + 6, g.z), g.z);
    await until(() => ms().deckTrack === 'gh/gh-place-graveyard' && ms().volume > 0.01, 20000);
    return {
      poi: { x: g.x, z: g.z },
      dist: Math.hypot(pp.x - g.x, pp.z - g.z),
      stage: ms().stage,
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
    if (T.clearZombies) T.clearZombies();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
    const m = T.POI.mast, pp = T.player.position;
    pp.set(m.x + 6, T.sampleHeight(m.x + 6, m.z), m.z);
    await until(() => ms().deckTrack === 'gh/gh-place-relay' && ms().volume > 0.01, 20000);
    return {
      poi: { x: m.x, z: m.z },
      dist: Math.hypot(pp.x - m.x, pp.z - m.z),
      stage: ms().stage,
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
    if (T.clearZombies) T.clearZombies();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
    const h = T.POI.campsites && T.POI.campsites.find((c) => c.style === 'hikers');
    const pp = T.player.position;
    pp.set(h.x + 5, T.sampleHeight(h.x + 5, h.z), h.z);
    await until(() => ms().deckTrack === 'gh/gh-place-hikers' && ms().volume > 0.01, 20000);
    return {
      poi: { x: h.x, z: h.z, style: h.style },
      dist: Math.hypot(pp.x - h.x, pp.z - h.z),
      stage: ms().stage,
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
    if (T.clearZombies) T.clearZombies();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
    const pp = T.player.position;
    pp.set(0, T.sampleHeight(0, 12), 12);
    await until(() => !String(ms().mood || '').startsWith('place_') && /^gh\\/gh-place-(hq|menu|dawn)$/.test(ms().deckTrack || ''), 20000);
    A.calmFlow.dwellS = 20;
    A.calmFlow.gapS = 60;

    const cueBeforeDusk = ms().lastCue;
    T.setWorldTime(0.68);
    await wait(500);
    T.setWorldTime(0.72);
    await until(() => ms().mood === 'dusk' && ms().deckTrack === 'gh/gh-place-alarm-build' && ms().volume > 0.01, 20000);
    const cueAfterNaturalDuskTransition = ms().lastCue;
    const duskMoodState = {
      worldTime: T.getWorldTime(),
      stage: ms().stage,
      mood: ms().mood,
      deckTrack: ms().deckTrack,
      front: ms().front,
      volume: ms().volume,
      deckLevel: ms().deckLevel,
      overlapFrames: ms().overlapFrames,
      lastCueAfterTransition: cueAfterNaturalDuskTransition
    };

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
    duskAndNightFalls,
    noteOnRelayAndHikersGuards: 'Without T.clearZombies(), daytime POI guard zombies at POI.mast and hikers camp stand within DAY_FIGHT_RANGE (38m), switching stage from calm to dayfight (chip_skirmish_b) before the 20s calmFlow.dwellS completes.'
  };

  console.log('Clean calm ear-proxy telemetry:', JSON.stringify(telemetry.earProxyAndPlaces, null, 2));
  fs.writeFileSync(telemPath, JSON.stringify(telemetry, null, 2));
  try { await page.send('Page.close', {}); } catch {}
} finally {
  await browser.close();
  await server.close();
}
