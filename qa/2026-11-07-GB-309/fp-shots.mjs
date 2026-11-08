// qa/2026-11-07-GB-309/fp-shots.mjs - FP hip+ADS Wasp
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const tag = process.argv[2] || 'after';
const OUT = path.join(HERE, tag);
fs.mkdirSync(OUT, { recursive: true });
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
  const T = TT, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await startMatch(T, 'GB309'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
  T.setWorldTime?.(0.42); T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0);
  for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'uzi'; i++) {
    T.setWeapon(T.WEAPON_ORDER.indexOf('uzi')); await wait(150);
  }
  T.setViewFirstDbg(true); await wait(4000);
  return T.getCurrentWeapon();
})()`, 600000);
await page.evaluate(`(() => { TT.setZoomHeldDbg?.(false); return 1; })()`);
await new Promise((r) => setTimeout(r, 800));
await page.screenshot(path.join(OUT, 'fp-hip.png'));
console.log(tag, 'fp-hip');
await page.evaluate(`(() => { TT.setZoomHeldDbg?.(true); return 1; })()`);
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot(path.join(OUT, 'fp-ads.png'));
console.log(tag, 'fp-ads');
await page.evaluate(`(() => { TT.setZoomHeldDbg?.(false); return 1; })()`);
await browser.close?.(); server.close?.();
process.exit(0);