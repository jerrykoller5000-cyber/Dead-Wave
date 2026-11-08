// qa/2026-11-07-GB-310/fp-shots.mjs - FP blade swing stills (knife + machete)
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
  await startMatch(T, 'GB310'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons?.();
  T.setWorldTime?.(0.42); T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0);
  T.setViewFirstDbg(true); await wait(2500);
  T.setMacheteOwned?.(false);
  return 1;
})()`, 600000);

async function swingShot(label, machete) {
  await page.evaluate(`(() => {
    TT.setMacheteOwned?.(${machete ? 'true' : 'false'});
    return TT.isMacheteOwned ? TT.isMacheteOwned() : ${machete};
  })()`);
  // Kick a swing and sample mid-swing frames
  await page.evaluate(`(() => { TT.knifeAttack?.(); return 1; })()`);
  await new Promise((r) => setTimeout(r, 180));
  await page.screenshot(path.join(OUT, label + '-swing.png'));
  console.log(tag, label, 'swing');
  // Hold a second frame a bit later
  await new Promise((r) => setTimeout(r, 120));
  await page.screenshot(path.join(OUT, label + '-swing2.png'));
  console.log(tag, label, 'swing2');
}

await swingShot('knife', false);
await swingShot('machete', true);
await browser.close?.(); server.close?.();
process.exit(0);
