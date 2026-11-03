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
  await startMatch(T, 'TEST_RELOAD');
  T.clearZombies && T.clearZombies();
  T.grantAllWeapons();
  T.setViewFirstDbg(true);
  const idx = T.WEAPON_ORDER.indexOf('pistol');
  T.setWeapon(idx);
  await new Promise((r) => setTimeout(r, 2000));
})()`);

// Test mag-out
const outData = await page.evaluate(`(async () => {
  const T = window.TT;
  T.setAmmoDbg('pistol', 1);
  T.startReload();
  T.reloadClipDbg.hold(0.34);
  await new Promise((r) => setTimeout(r, 600));
  const vm = T.viewmodelDbg();
  return {
    u: vm ? vm.info.reloadU : null,
    magState: vm ? vm.info.magState : null,
    active: vm ? vm.info.active : false,
    rootVis: vm ? vm.root.visible : false,
    magVis: vm && vm.gun && vm.gun.mag ? vm.gun.mag.visible : null
  };
})()`);
console.log('Mag-out state at u=0.34:', outData);

const shotOut = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
fs.writeFileSync(path.join(ROOT, 'qa/2026-11-02-AG-209/pistol-magout.jpg'), Buffer.from(shotOut.data, 'base64'));

// Test seating
const seatData = await page.evaluate(`(async () => {
  const T = window.TT;
  T.reloadClipDbg.hold(0.58);
  await new Promise((r) => setTimeout(r, 600));
  const vm = T.viewmodelDbg();
  return {
    u: vm ? vm.info.reloadU : null,
    magState: vm ? vm.info.magState : null,
    active: vm ? vm.info.active : false,
    rootVis: vm ? vm.root.visible : false,
    magVis: vm && vm.gun && vm.gun.mag ? vm.gun.mag.visible : null
  };
})()`);
console.log('Seating state at u=0.58:', seatData);

const shotSeat = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
fs.writeFileSync(path.join(ROOT, 'qa/2026-11-02-AG-209/pistol-seating.jpg'), Buffer.from(shotSeat.data, 'base64'));

await page.evaluate(`(() => { window.TT.reloadClipDbg.hold(null); })()`);

await browser.close();
server.close();
