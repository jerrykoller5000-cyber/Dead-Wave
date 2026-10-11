// CU-100 probe: the Training Ground on posesheet's 60 fps clock, then hands-page.js; a table of the worst hand-to-anchor
// distances (cm) and barrel errors (degrees) per gun and state, on the real renderer.
//   node review/hands/hands-probe.mjs [out.json] [--guns m4,ak] [--states stand,ads]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..');
const { serve } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'serve.mjs').replace(/\\/g, '/')));
const { launch } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'cdp.mjs').replace(/\\/g, '/')));
const argv = process.argv.slice(2), arg = (k) => { const i = argv.indexOf('--' + k); return i < 0 ? null : argv[i + 1]; };
const outFile = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
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
if (arg('guns')) await page.evaluate(`window.__GUNS = ${JSON.stringify(arg('guns').split(','))}`);
if (arg('states')) await page.evaluate(`window.__STATES = ${JSON.stringify(arg('states').split(',').map((n) => ({ name: n, ...({ ads: { zoom: true }, walk: { keys: ['KeyW'] }, run: { keys: ['KeyW', 'ShiftLeft'] }, strafe: { keys: ['KeyD'] }, crouch: { keys: ['KeyC'] }, 'crouch-walk': { keys: ['KeyC', 'KeyW'] }, turn: { turn: 1.6 }, fire: { fire: true } })[n] })))}`);
const rows = JSON.parse(await page.evaluate(fs.readFileSync(path.join(HERE, 'hands-page.js'), 'utf8'), 900000));
const errs = (page.errors || []).filter((e) => !/contains/.test(e)).slice(0, 3);
if (outFile) fs.writeFileSync(path.resolve(ROOT, outFile), JSON.stringify(rows, null, 1));
const states = [...new Set(rows.filter((r) => r.state).map((r) => r.state))];
console.log('gun'.padEnd(12) + states.map((s) => s.padStart(18)).join(''));
for (const g of [...new Set(rows.map((r) => r.gun))]) {
  const cells = states.map((s) => { const r = rows.find((x) => x.gun === g && x.state === s); return r ? `${(r.R * 100).toFixed(1)}/${(r.L * 100).toFixed(1)}/${r.barrel.toFixed(1)}`.padStart(18) : (rows.find((x) => x.gun === g && x.error) ? 'n/a'.padStart(18) : ''.padStart(18)); });
  console.log(g.padEnd(12) + cells.join(''));
}
console.log('cells: firing hand cm / support hand cm / barrel off the reticle deg (worst of 40 frames); a long gun\'s support hand is measured off its forend\'s line');
const slid = rows.filter((r) => r.slide > 0.001);
if (slid.length) console.log('support hand back along the forend (worst, cm): ' + slid.map((r) => r.gun + ' ' + r.state + ' ' + (r.slide * 100).toFixed(1)).join(', '));
if (errs.length) console.log('page errors:\n  ' + errs.join('\n  '));
await browser.close(); server.close(); process.exit(0);
