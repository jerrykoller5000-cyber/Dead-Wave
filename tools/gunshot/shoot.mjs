// tools/gunshot/shoot.mjs - CL-309 (D-121): shoot one of our guns from the fixed views, without the game.
//   node tools/gunshot/shoot.mjs <gun> <outDir> [views=side,top,quarter,close] [--can] [--night] [--w 1280 --h 720] [--at x,y,z --d 0.4 --fov 28]
// Writes <outDir>/<gun>-<view>.png and <outDir>/<gun>.json ({ tris, box }). Chromium from CHROME / playwright's.
import { serve } from '../serve.mjs';
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const [gun, outDir, viewsArg] = process.argv.slice(2);
if (!gun || !outDir) { console.error('usage: shoot.mjs <gun> <outDir> [views]'); process.exit(2); }
const views = (viewsArg && !viewsArg.startsWith('--') ? viewsArg : 'side,top,quarter,close').split(',');
const flag = (k) => process.argv.includes(k);
const num = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const W = num('--w', 1280), H = num('--h', 720);
fs.mkdirSync(outDir, { recursive: true });
const server = await serve(ROOT, 0);
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: (process.env.CHROME_ARGS || '').split(' ').filter(Boolean).concat(['--use-gl=swiftshader', '--enable-unsafe-swiftshader']) });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const str = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
// --at x,y,z (metres, the game's scale) and --d (metres) aim every view at one spot: a grip, a port, a sight.
const extra = (flag('--can') ? '&can=1' : '') + (flag('--night') ? '&lit=night' : '') + (flag('--machete') ? '&blade=machete' : '')
  + (str('--at') ? '&at=' + str('--at') : '') + (str('--d') ? '&d=' + str('--d') : '') + (str('--fov') ? '&fov=' + str('--fov') : '');
await page.goto(`${server.origin}/tools/gunshot/index.html?gun=${gun}&w=${W}&h=${H}&view=${views[0]}${extra}`, { waitUntil: 'load' });
let info = null;
try {
  info = await page.evaluate(() => window.GUNSHOT.ready, undefined);
} catch (e) { errors.push(String(e)); }
// CL-319: --pose "<js>" runs in the page before the views (G = window.GUNSHOT, g = its gun), e.g. a bolt worked open:
// --pose "g.userData.bolt.rotation.z = 1.05; g.userData.bolt.position.z -= 0.09; g.userData.boltPoseHook && g.userData.boltPoseHook(1, 1)"
if (str('--pose')) { try { await page.evaluate((js) => { const G = window.GUNSHOT, g = G.gun; return new Function('G', 'g', js)(G, g); }, str('--pose')); } catch (e) { errors.push('pose: ' + e); } }
for (const v of views) {
  try { await page.evaluate((view) => window.GUNSHOT.shoot(view), v); } catch (e) { errors.push(v + ': ' + e); }
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(outDir, `${gun}-${v}.png`), clip: { x: 0, y: 0, width: W, height: H } });
}
fs.writeFileSync(path.join(outDir, `${gun}.json`), JSON.stringify({ gun, info, errors }, null, 1));
console.log(JSON.stringify({ gun, tris: info && info.tris, box: info && info.box, floats: info && info.floats, errors }));
await browser.close();
await server.close();
