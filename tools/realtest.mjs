// Suite checks on the real renderer: the same check files as `npm test`, run in the game's own index.html with real
// three.js (a GPU window off screen; --soft for headless software), instead of the test build, whose three stand-in
// (tools/tests/fakethree.mjs) gets poses wrong: Matrix4.transpose is a no-op, slerpQuaternions is missing, and a
// quaternion set directly never reaches .rotation. Use it for arm, leg and foot poses. It does not write crew/tests.json.
//   node tools/realtest.mjs t226 t227 [--soft] [--show] [--all]     (--all prints the PASS lines too)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), TESTS = path.join(ROOT, 'tools', 'tests');
const argv = process.argv.slice(2), names = argv.filter((a) => !a.startsWith('--'));
const soft = argv.includes('--soft'), show = argv.includes('--show'), all = argv.includes('--all');
if (!names.length) { console.log('usage: node tools/realtest.mjs t226 [t227 ...] [--soft] [--show] [--all]'); process.exit(2); }
const server = await serve(ROOT, 0);
const browser = await launch({ headless: soft, args: soft ? [] : ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
let total = { pass: 0, fail: 0 };
for (const name of names) {
  const code = fs.readFileSync(path.join(TESTS, name + '.js'), 'utf8'), t0 = Date.now();
  const page = await browser.newPage({ width: 1280, height: 720 });
  if (!soft && !show) {
    try { const { windowId } = await page.send('Browser.getWindowForTarget', {}); await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } }); } catch { /* stays */ }
  }
  let lines = [];
  try {
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer${soft ? '&renderer=webgl' : ''}`, { timeout: 240000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 400000 }))) throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
    await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));
    const out = await page.evaluate(code, 300000);
    lines = String(typeof out === 'string' ? out : JSON.stringify(out)).split('\n').map((l) => l.trim()).filter(Boolean);
  } catch (e) { lines = ['FAIL ' + name + ' did not run: ' + String(e.message || e).split('\n')[0]]; }
  const pass = lines.filter((l) => l.startsWith('PASS')).length, fail = lines.filter((l) => l.startsWith('FAIL')).length;
  total.pass += pass; total.fail += fail;
  console.log(`${fail ? 'FAIL' : 'ok  '}  ${name.padEnd(6)} ${String(pass).padStart(4)} pass ${String(fail).padStart(3)} fail  ${((Date.now() - t0) / 1000).toFixed(1)}s  (real renderer)`);
  for (const l of lines) if (all || !l.startsWith('PASS')) console.log('    ' + l);
  try { await page.send('Page.close', {}); } catch { /* gone */ }
}
console.log(`${names.length} checks: ${total.pass} pass, ${total.fail} fail (real renderer)`);
await browser.close?.(); server.close?.();
process.exit(0);
