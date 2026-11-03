import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-position=-2400,-2400', '--window-size=1920,1080'] });
const page = await browser.newPage({ width: 1920, height: 1080 });
await page.goto(server.origin + '/index.html?solid=1&debug=1&raf=timer', { timeout: 120000 });
await page.waitFor('!!window.TT');
await page.evaluate(`(() => {
  if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
  else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
})()`);

const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
await page.evaluate(lib);
await page.evaluate(`(async () => {
  const T = window.TT;
  await startMatch(T, 'DIAG_WALK');
  T.clearZombies && T.clearZombies();
  T.grantAllWeapons();
  T.setViewFirstDbg(true);
  if (!T.trainingDbg.state().active) T.trainingDbg.enter();
  if (T.isUnarmed()) T.toggleHolster();
  const idx = T.WEAPON_ORDER.indexOf('pistol');
  T.setWeapon(idx);
  T.setViewFirstDbg(true);
  // Real-time settle
  await new Promise((r) => setTimeout(r, 3000));
})()`);

console.log('Testing 90 frames of walk in real time...');
const visLog = [];

for (let f = 0; f < 90; f++) {
  const state = await page.evaluate(`(async (f) => {
    const T = window.TT;
    T.flightInput({ keys: ['KeyW'], zoom: false, fire: false });
    await new Promise((r) => setTimeout(r, 33));
    const vm = T.viewmodelDbg();
    return {
      f,
      curW: T.getCurrentWeapon(),
      unarmed: T.isUnarmed(),
      rootVis: vm ? vm.root.visible : false,
      active: vm ? vm.info.active : false,
      raise: vm ? vm.info.raise : 0
    };
  })(${f})`);
  visLog.push(state.rootVis);

  if (f === 0 || f === 45 || f === 89) {
    const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
    fs.writeFileSync(path.join(ROOT, `qa/2026-11-02-AG-209/walk-frame-${f}.jpg`), Buffer.from(shot.data, 'base64'));
    console.log(`Frame ${f}: rootVis=${state.rootVis}, active=${state.active}, raise=${state.raise}`);
  }
}

// Release input
await page.evaluate(`(() => { window.TT.flightInput({ keys: [], zoom: false, fire: false }); })()`);

const allTrue = visLog.every(Boolean);
console.log('All 90 frames rootVis === true:', allTrue);

await browser.close();
server.close();
