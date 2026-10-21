// CU-99 probe: the Training Ground on posesheet's 60 fps clock, then probe-page.js (t226's standing turns in order).
//   node review/turn/turn-probe.mjs [frame log name, e.g. "snap 180 other way"]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..');
const { serve } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'serve.mjs').replace(/\\/g, '/')));
const { launch } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'cdp.mjs').replace(/\\/g, '/')));
const src = fs.readFileSync(path.join(ROOT, 'tools', 'posesheet.mjs'), 'utf8');
const grab = (name) => { const i = src.indexOf('const ' + name + ' = String.raw`'), s = src.indexOf('`', i) + 1; return src.slice(s, src.indexOf('`;', s)); };
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=800,600'] });
const page = await browser.newPage({ width: 800, height: 600 });
try { const { windowId } = await page.send('Browser.getWindowForTarget', {}); await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } }); } catch { /* stays */ }
await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); return 1; })()`);
await page.waitFor('!!window.TT', { timeout: 400000 });
await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
await page.evaluate(grab('SETUP'), 180000);
await page.evaluate(grab('PAGE'));
await new Promise((r) => setTimeout(r, 400));   // the game's next frame queues itself on the hand-cranked clock
if (process.argv[2]) await page.evaluate(`window.__LOG = ${JSON.stringify(process.argv[2])}`);
console.log(await page.evaluate(fs.readFileSync(path.join(HERE, 'probe-page.js'), 'utf8'), 300000));
await browser.close(); server.close(); process.exit(0);
