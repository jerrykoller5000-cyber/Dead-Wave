// GB-276 scratch runner: realtest.mjs for one test file given by path (probe copies of t189), real renderer. Usage: node rt.mjs <file> [--all]
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const ROOT = path.resolve('.'), TESTS = path.join(ROOT, 'tools', 'tests');
const file = process.argv[2];
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const code = fs.readFileSync(file, 'utf8');
const page = await browser.newPage({ width: 1280, height: 720 });
try { const { windowId } = await page.send('Browser.getWindowForTarget', {}); await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } }); } catch {}
await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
if (!(await page.waitFor('!!window.TT', { timeout: 400000 }))) throw new Error('no TT');
await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));
const out = await page.evaluate(code, 300000);
console.log(String(typeof out === 'string' ? out : JSON.stringify(out)));
try { await page.send('Page.close', {}); } catch {}
process.exit(0);
