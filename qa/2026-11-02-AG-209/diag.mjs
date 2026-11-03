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
  await startMatch(T, 'DIAG');
  T.clearZombies && T.clearZombies();
  T.grantAllWeapons();
  T.setViewFirstDbg(true);
  if (T.isUnarmed()) T.toggleHolster();
})()`);

const r1 = await page.evaluate(`(() => {
  const T = window.TT;
  const vm = T.viewmodelDbg();
  return {
    curW: T.getCurrentWeapon(),
    isUnarmed: T.isUnarmed(),
    fpFirst: T.fpDbg().first,
    vm: vm ? { active: vm.info.active, raise: vm.info.raise, key: vm.info.key, rootVis: vm.root.visible } : null
  };
})()`);
console.log('Initial state in world:', r1);

// Now enter training
await page.evaluate(`(() => {
  const T = window.TT;
  if (!T.trainingDbg.state().active) T.trainingDbg.enter();
})()`);

const r2 = await page.evaluate(`(() => {
  const T = window.TT;
  const vm = T.viewmodelDbg();
  return {
    curW: T.getCurrentWeapon(),
    isUnarmed: T.isUnarmed(),
    fpFirst: T.fpDbg().first,
    vm: vm ? { active: vm.info.active, raise: vm.info.raise, key: vm.info.key, rootVis: vm.root.visible } : null
  };
})()`);
console.log('After trainingDbg.enter():', r2);

// Now draw weapon and switch to pistol
await page.evaluate(`(async () => {
  const T = window.TT;
  if (T.isUnarmed()) T.toggleHolster();
  const idx = T.WEAPON_ORDER.indexOf('pistol');
  T.setWeapon(idx);
  T.setViewFirstDbg(true);
})()`);

// Step 30 frames
for (let i = 0; i < 30; i++) {
  await page.evaluate(`(() => { window.TT.stepFrame(1/60); })()`);
}

const r3 = await page.evaluate(`(() => {
  const T = window.TT;
  const vm = T.viewmodelDbg();
  return {
    curW: T.getCurrentWeapon(),
    isUnarmed: T.isUnarmed(),
    fpFirst: T.fpDbg().first,
    vm: vm ? { active: vm.info.active, raise: vm.info.raise, key: vm.info.key, rootVis: vm.root.visible } : null
  };
})()`);
console.log('After unholster + 30 stepFrame ticks:', r3);

// Capture screenshot and check pixels
const shot = await page.send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(ROOT, 'qa/2026-11-02-AG-209/diag-shot.png'), Buffer.from(shot.data, 'base64'));

await browser.close();
server.close();
