// uzifit.mjs - GB-260: how much room the Uzi's stick has inside its grip, measured on the real vertices.
//   node qa/2026-10-31-GB-260/uzifit.mjs        (inside the game-test slot)
// The grip is the analytic outline the builder draws (78 mm across, 10 mm bevel); the stick's own vertices come
// out of the built model, in the gun's space. Only the part between the grip's top and bottom is constrained.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BODY = fs.readFileSync(path.join(ROOT, 'qa/2026-10-31-GB-260/uzibody.js'), 'utf8');
const srv = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const page = await browser.newPage({ width: 1280, height: 720 });
try { const { windowId } = await page.send('Browser.getWindowForTarget', {}); await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } }); } catch { }
await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
await page.waitFor('!!window.TT', { timeout: 400000 });
const code = '(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms));\n' + BODY + '\n})()';
console.log(await page.evaluate(code, 300000));
await browser.close(); srv.close && srv.close(); process.exit(0);