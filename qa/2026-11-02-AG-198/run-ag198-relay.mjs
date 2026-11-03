// qa/2026-11-02-AG-198/run-ag198-relay.mjs
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
  args: [`--window-size=${WIDTH},${HEIGHT}`, '--task-id=AG-198-RELAY']
});

try {
  const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  await page.waitFor('!!window.TT', { timeout: 600000 });
  await page.evaluate('DWOpening?.dismissForTesting?.()');
  await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));

  const relayState = await page.evaluate(`(async () => {
    const T = window.TT, A = T.AudioSys, ms = () => A.musicState();
    await startMatch(T, 'AG198RelayCalm');
    if (A.setMuted) A.setMuted(false);
    if (!ms().playing) A.startMusic();
    A.setScore(true);
    A.calmFlow.dwellS = 1.0;
    A.calmFlow.gapS = 1.5;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
    const m = T.POI.mast, pp = T.player.position;
    pp.set(m.x + 6, T.sampleHeight(m.x + 6, m.z), m.z);
    for (let i = 0; i < 6; i++) { await wait(80); if (T.clearZombies) T.clearZombies(); }
    await until(() => { if (T.clearZombies) T.clearZombies(); return ms().deckTrack === 'gh/gh-place-relay' && ms().volume > 0.01; }, 20000);
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

  telemetry.earProxyAndPlaces.relayState = relayState;
  console.log('Verified relayState:', JSON.stringify(relayState, null, 2));
  fs.writeFileSync(telemPath, JSON.stringify(telemetry, null, 2));
  try { await page.send('Page.close', {}); } catch {}
} finally {
  await browser.close();
  await server.close();
}
