// qa/2026-11-07-GB-312/shots.mjs - BEFORE or AFTER FP hip+ADS for m4/aa12/sniper/ak/shotgun. Usage: node shots.mjs before|after
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const WHICH = process.argv[2] === 'after' ? 'after' : 'before';
const DIR = path.join(HERE, WHICH); fs.mkdirSync(DIR, { recursive: true });
const WEAPONS = (process.env.GB312_WEAPONS || 'm4,aa12,sniper,ak,shotgun').split(',');
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
await page.evaluate(`(async () => {
  const T = TT; await startMatch(T, 'GB312${WHICH}'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
  T.setWorldTime?.(0.42); T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0); return 1;
})()`, 600000);

const probes = {};
for (const w of WEAPONS) {
  await page.evaluate(`(async () => {
    const T = TT, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 20 && T.getCurrentWeapon() !== '${w}'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await wait(150); }
    T.setZoomHeldDbg?.(false); T.setViewFirstDbg(true); await wait(3500); return T.getCurrentWeapon();
  })()`, 600000);
  await page.screenshot(path.join(DIR, `fp-${w}-hip.png`));
  console.log(WHICH, w, 'hip');
  await page.evaluate(`(() => { TT.setZoomHeldDbg?.(true); return 1; })()`);
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot(path.join(DIR, `fp-${w}-ads.png`));
  console.log(WHICH, w, 'ads');
  await page.evaluate(`(() => { TT.setZoomHeldDbg?.(false); return 1; })()`);
  probes[w] = await page.evaluate(`(() => {
    const T = TT, v = T.viewmodelDbg();
    return { weapon: T.getCurrentWeapon(), handPlace: v && v.info && v.info.handPlace };
  })()`);
}
fs.writeFileSync(path.join(HERE, `probe-${WHICH}.json`), JSON.stringify(probes, null, 2));
await browser.close?.(); server.close?.();
process.exit(0);