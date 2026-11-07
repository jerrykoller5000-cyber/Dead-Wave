// qa/2026-11-07-GB-294/shots-before-akimbo.mjs - BEFORE akimbo Wasp shot (J11)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const BEFORE = path.join(HERE, 'before');
fs.mkdirSync(BEFORE, { recursive: true });
const W = 1280, H = 720;
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=' + W + ',' + H] });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const page = await browser.newPage({ width: W, height: H });
await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
await page.evaluate(lib);
const setup = await page.evaluate(`(async () => {
  const T = TT; await startMatch(T, 'GB294a'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
  T.setWorldTime?.(0.42);
  for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'uzi'; i++) {
    T.setWeapon(T.WEAPON_ORDER.indexOf('uzi')); await new Promise((r) => setTimeout(r, 150));
  }
  T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0);
  T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4500));
  // force dual owned then toggle
  T.setDualOwnedDbg?.('uzi', true);
  T.toggleDualWieldDbg();
  await new Promise((r) => setTimeout(r, 1800));
  // verify via offhand mesh / viewmodel
  const off = T.offhandMeshes && T.offhandMeshes.uzi;
  const v = T.viewmodelDbg?.();
  const hud = T.fpDbg?.() || {};
  return {
    w: T.getCurrentWeapon(),
    offVis: !!(off && off.visible),
    vmAki: !!(v && v.info && v.info.akimbo),
    gun2: !!(v && v.gun2),
    hudAki: !!hud.akimbo
  };
})()`, 600000);
console.log('setup', JSON.stringify(setup));
if (!setup.offVis && !setup.vmAki && !setup.gun2) {
  // try KeyY
  await page.evaluate(`(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyY', key: 'y', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyY', key: 'y', bubbles: true }));
  })()`);
  await new Promise((r) => setTimeout(r, 1800));
  const again = await page.evaluate(`(() => {
    const T = TT; const off = T.offhandMeshes && T.offhandMeshes.uzi; const v = T.viewmodelDbg?.();
    return { offVis: !!(off && off.visible), vmAki: !!(v && v.info && v.info.akimbo), gun2: !!(v && v.gun2) };
  })()`);
  console.log('after KeyY', JSON.stringify(again));
  Object.assign(setup, again);
}
fs.writeFileSync(path.join(HERE, 'probe-before-akimbo.json'), JSON.stringify(setup, null, 2));
await page.screenshot(path.join(BEFORE, 'fp-akimbo.png'));
console.log('wrote before/fp-akimbo.png aki=', !!(setup.offVis || setup.vmAki || setup.gun2));
await browser.close?.(); server.close?.();
process.exit((setup.offVis || setup.vmAki || setup.gun2) ? 0 : 1);
