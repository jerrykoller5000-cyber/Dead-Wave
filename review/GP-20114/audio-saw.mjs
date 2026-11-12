import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through the crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20114');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: [
  '--window-position=40,40', '--window-size=1280,720',
  '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling'
] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&gp20114=audio`, { timeout: 120000 });
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 120000 }), 'game ready');
  await page.evaluate(`(() => {
    DWOpening.dismissForTesting();
    document.getElementById('playerName').value = 'GP20114';
    document.getElementById('modeTraining').click();
  })()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 90000 }), 'Training visible');
  await page.evaluate(`(() => {
    TT.AudioSys.setMuted(false);
    TT.AudioSys.unlock();
    if (TT.isUnarmed()) TT.toggleHolster();
    TT.grantWeaponDbg('chainsaw');
    TT.setWeapon(TT.WEAPON_ORDER.indexOf('chainsaw'));
  })()`);
  const engine = `TT.sawStartDbg().phase === 'ready' && TT.AudioSys.isChainsawRunning()`;
  assert(await page.waitFor(engine, { timeout: 25000 }), 'audio loop started');
  // The existing HUD refreshes on saw use; one short bite establishes its Running label.
  await page.evaluate('TT.setMouseFireDbg(true)');
  await new Promise(resolve => setTimeout(resolve, 300));
  await page.evaluate('TT.setMouseFireDbg(false)');
  const running = `TT.sawStartDbg().phase === 'ready' && TT.AudioSys.isChainsawRunning() && document.getElementById('ammoDetail').textContent.includes('Running')`;
  const ready = await page.waitFor(running, { timeout: 25000 });
  if (!ready) console.log('audio setup ' + JSON.stringify(await page.evaluate(`({
    weapon: TT.getCurrentWeapon(), unarmed: TT.isUnarmed(), phase: TT.sawStartDbg(),
    audio: TT.AudioSys.isChainsawRunning(), muted: TT.AudioSys.isMuted(),
    hud: document.getElementById('ammoDetail').textContent,
    gamePhase: TT.getPhase(), pageErrors: []
  })`)));
  assert(ready, 'running audio and HUD before stab');
  const state = () => page.evaluate(`({ phase: TT.sawStartDbg().phase, pulls: TT.sawStartDbg().starts,
    audio: TT.AudioSys.isChainsawRunning(), hud: document.getElementById('ammoDetail').textContent })`);
  const before = await state();
  await page.evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', key: 'f', bubbles: true }))`);
  assert(await page.waitFor('TT.getKnifeAnimT() > 0', { timeout: 2000 }), 'knife started');
  const during = await state();
  assert(await page.waitFor('TT.getKnifeAnimT() <= 0', { timeout: 45000 }), 'knife ended');
  const after = await state();
  for (const [name, s] of Object.entries({ before, during, after })) {
    assert.equal(s.phase, 'ready', `${name} phase`);
    assert.equal(s.audio, true, `${name} audible engine loop`);
    assert(s.hud.includes('Running'), `${name} HUD`);
    assert.equal(s.pulls, before.pulls, `${name} pull count`);
  }
  await page.screenshot(path.join(out, 'saw-audio-after-stab.png'));
  assert.equal(page.errors.length, 0, 'page errors');
  const result = { before, during, after, pageErrors: page.errors };
  fs.writeFileSync(path.join(out, 'audio-saw.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
  await server.close();
}
