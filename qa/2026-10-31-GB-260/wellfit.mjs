// wellfit.mjs - GB-260: the magazine's cross-section against the well's opening, per gun, from the real meshes.
//   node qa/2026-10-31-GB-260/wellfit.mjs     (inside the game-test slot)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BODY = fs.readFileSync(path.join(ROOT, 'qa/2026-10-31-GB-260/wellbody.js'), 'utf8');
const srv = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const page = await browser.newPage({ width: 1280, height: 720 });
try { const { windowId } = await page.send('Browser.getWindowForTarget', {}); await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } }); } catch { }
await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
await page.waitFor('!!window.TT', { timeout: 400000 });
const code = '(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms));\n' + BODY + '\n})()';
console.log(await page.evaluate(code, 300000));
await browser.close(); srv.close && srv.close(); process.exit(0);