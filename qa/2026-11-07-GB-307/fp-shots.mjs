// GB-307 first-person hip + ADS at 1280. Usage: node ... before|after
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const tag = process.argv[2] || 'before';
const OUT = path.join(HERE, tag);
fs.mkdirSync(OUT, { recursive: true });
const W = 1280, H = 720;
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true, args: ['--window-size=' + W + ',' + H] });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
try {
  const page = await browser.newPage({ width: W, height: H });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);
  const boot = await page.evaluate(`(async () => {
    const T = TT; await startMatch(T, 'GB307'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
    T.setWorldTime?.(0.42);
    T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0);
    T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4000));
    const ix = T.WEAPON_ORDER.indexOf('pistol');
    T.setWeapon(ix); await new Promise((r) => setTimeout(r, 800));
    return { first: !!T.fpDbg?.()?.first, vm: !!(T.viewmodelDbg?.()?.info?.active), w: T.getCurrentWeapon() };
  })()`, 600000);
  console.log('boot', JSON.stringify(boot));
  if (!boot.first || !boot.vm) throw new Error('FP viewmodel not up');

  await page.evaluate(`(async () => { TT.setZoomHeldDbg(false); await new Promise((r) => setTimeout(r, 700)); })()`, 30000);
  await page.screenshot(path.join(OUT, 'fp-hip.png'));
  console.log(tag, 'fp-hip ok');

  await page.evaluate(`(async () => { TT.setZoomHeldDbg(true); await new Promise((r) => setTimeout(r, 900)); })()`, 30000);
  await page.screenshot(path.join(OUT, 'fp-ads.png'));
  console.log(tag, 'fp-ads ok');

  // night pair (short)
  await page.evaluate(`(async () => { TT.setZoomHeldDbg(false); TT.setWorldTime?.(0.02); await new Promise((r) => setTimeout(r, 500)); })()`, 30000);
  await page.screenshot(path.join(OUT, 'fp-hip-night.png'));
  await page.evaluate(`(async () => { TT.setZoomHeldDbg(true); await new Promise((r) => setTimeout(r, 700)); })()`, 30000);
  await page.screenshot(path.join(OUT, 'fp-ads-night.png'));
  console.log(tag, 'fp night ok');
} finally {
  await browser.close();
  server.close && server.close();
}
