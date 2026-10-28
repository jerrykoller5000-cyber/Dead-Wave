// GB-240 negative control: the t69 wave wait must still FAIL when the wave never comes out.
// Runs the exact untilGame helper from tools/tests/t69.js with a condition that can never be true,
// and confirms it returns false. Also times it in game seconds and wall seconds, so a slow page
// cannot be mistaken for a passing wait. Not part of the suite (a probe, run through the slot).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TESTS = path.join(ROOT, 'tools', 'tests');
const src = fs.readFileSync(path.join(TESTS, 't69.js'), 'utf8');
const a = src.indexOf('  const untilGame =');
const b = src.indexOf('  try {');
if (a < 0 || b < 0 || b < a) { console.log('FAIL could not lift the helper out of t69.js'); process.exit(1); }
const helper = src.slice(a, b);   // the helper and its comment, verbatim

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const page = await browser.newPage({ width: 1280, height: 720 });
let out = '';
try {
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 400000 }))) throw new Error('window.TT never appeared');
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
  await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));
  out = await page.evaluate(`(async () => {
    const T = window.TT; const out = [];
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    await startMatch(T, 'NegCtl');
    T.runDevCommand('godmode');
    ${helper}
    // The wave never comes out: the wait must come back false after its game-time cap.
    const g0 = T.getSimTime(), w0 = Date.now();
    const never = await untilGame(() => false, 30);
    const gameS = T.getSimTime() - g0, wallS = (Date.now() - w0) / 1000;
    out.push((never === false ? 'PASS ' : 'FAIL ') + 'a wave that never comes out fails the wait (returned ' + never + ')');
    out.push((gameS >= 29.9 ? 'PASS ' : 'FAIL ') + 'it waited the full 30 s of GAME time (' + gameS.toFixed(1) + ' s game / ' + wallS.toFixed(1) + ' s wall)');
    // And a condition that is already true comes back at once, so the helper is not just slow.
    const g1 = T.getSimTime();
    const yes = await untilGame(() => true, 30);
    out.push((yes === true && T.getSimTime() - g1 < 1 ? 'PASS ' : 'FAIL ') + 'a wave that is already out returns at once');
    return out.join('\\n');
  })()`, 300000);
} catch (e) { out = 'FAIL probe did not run: ' + String(e.message || e).split('\n')[0]; }
for (const l of String(out).split('\n').map((s) => s.trim()).filter(Boolean)) console.log('    ' + l);
console.log(String(out).split('\n').filter((l) => l.startsWith('FAIL')).length ? 'FAIL negctl' : 'ok   negctl  (negative control)');
try { await page.send('Page.close', {}); } catch { /* gone */ }
await browser.close?.(); server.close?.();
process.exit(0);
