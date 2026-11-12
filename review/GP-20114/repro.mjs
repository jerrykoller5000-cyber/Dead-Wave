import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through the crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20114');
const kind = process.env.GP20114_KIND === 'mortar' ? 'mortar' : 'm240';
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: [
  '--window-position=40,40', '--window-size=1280,720', '--disable-background-timer-throttling'
] });
const result = {};
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&gp20114=repro`, { timeout: 120000 });
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 120000 }), 'game ready');
  await page.evaluate(`(() => {
    DWOpening.dismissForTesting();
    document.getElementById('playerName').value = 'GP20114';
    document.getElementById('modeTraining').click();
  })()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 90000 }), 'Training visible');
  const snapshot = () => page.evaluate(`(() => {
    const t = TT.trainingDbg.state(), c = TT.getMortarCarried();
    return { player: TT.player.position.toArray(), hp: TT.getHp(), wake: t.wake?.phase || (t.wake ? 'pending' : null),
      carrying: c ? { kind: c.kind, hp: c.hp, belt: c.belt } : null,
      carriedVisible: TT.m240VisDbg().carried, fence: t.infirmaryFence?.state(),
      placed: TT.builds.filter(b => b.type === '${kind}').map(b => ({ hp: b.hp, belt: b.belt })),
      fuel: TT.fuelDbg.run().phase, fuelSlow: TT.fuelDbg.slow(),
      bed: t.tg?.bed?.stand, bay: t.infirmaryFence?.bay, phase: TT.getPhase() };
  })()`);
  result.start = await snapshot();
  const setup = await page.evaluate(`(() => {
    const T = TT, p = T.player.position, tg = T.trainingDbg.tg();
    p.set(tg.origin.x - 14, tg.floorY, tg.origin.z - 8);
    const b = T.spawnBuild('${kind}', p.x + 1.2, p.z);
    if (!b) return { error: 'spawnBuild returned null', p: p.toArray() };
    const mounted = T.mountMortar(b);
    if (mounted) T.shoulderMortar();
    return { mounted, carried: T.getMortarCarried(), p: p.toArray() };
  })()`);
  console.log('setup ' + JSON.stringify(setup));
  assert.equal(setup?.carried?.kind, kind, `${kind} shouldered`);
  result.shouldered = await snapshot();
  await page.screenshot(path.join(out, `${kind}-before-death.png`));
  await page.evaluate(`TT.runDevCommand('rip')`);
  assert(await page.waitFor('!!TT.trainingDbg.state().wake', { timeout: 20000 }), 'death wake started');
  result.downed = await snapshot();
  assert(await page.waitFor('!TT.trainingDbg.state().wake', { timeout: 90000 }), 'infirmary recovery ended');
  result.recovered = await snapshot();
  await page.screenshot(path.join(out, `${kind}-after-recovery.png`));
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  await new Promise(resolve => setTimeout(resolve, 1800));
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  result.walked = await snapshot();
  await page.screenshot(path.join(out, `${kind}-after-walk.png`));
  assert.equal(result.recovered.carrying, null, `${kind} carry cleared on death`);
  assert.equal(result.recovered.placed.length, 1, `${kind} returned to death site`);
  assert.equal(result.recovered.placed[0].hp, result.shouldered.carrying.hp, `${kind} health preserved`);
  if (kind === 'm240') assert.equal(result.recovered.placed[0].belt, result.shouldered.carrying.belt, 'Watchman belt preserved');
  assert.equal(result.recovered.fence.raised, false, 'infirmary fence lowered for recovery');
  assert(result.walked.player[2] - result.recovered.player[2] > 5, `${kind} can walk out of infirmary`);
  assert.equal(result.walked.fence.raised, true, 'fence rises after exit');
  assert.equal(result.walked.fuelSlow, 1, 'no carried fuel slowdown');
  console.log('result ' + JSON.stringify(result));
  assert.equal(page.errors.length, 0, 'page errors');
} finally {
  fs.writeFileSync(path.join(out, `${kind}-repro.json`), JSON.stringify(result, null, 2) + '\n');
  await browser.close();
  await server.close();
}
