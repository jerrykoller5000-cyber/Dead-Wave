// GB-249: tools/realtest.mjs against another copy of index.html (proof runs only; never a shipped file).
// The repo is served as realtest serves it, except GET /index.html, which returns the --html file instead.
// Run only through crew.mjs slot run.
//   node qa/2026-10-29-GB-249/realtest-page.mjs --html qa/2026-10-29-GB-248/index.before.html t93 [--all]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), TESTS = path.join(ROOT, 'tools', 'tests');
const argv = process.argv.slice(2);
const hi = argv.indexOf('--html'), htmlRel = hi >= 0 ? argv[hi + 1] : null;
const names = argv.filter((a, i) => !a.startsWith('--') && i !== hi + 1), all = argv.includes('--all');
if (!htmlRel || !names.length) { console.log('usage: node qa/2026-10-29-GB-249/realtest-page.mjs --html <file> t93 [--all]'); process.exit(2); }
const html = fs.readFileSync(path.resolve(ROOT, htmlRel));
console.log('page: ' + htmlRel + ' (' + html.length + ' bytes) served as /index.html');
const inner = await serve(ROOT, 0);
const front = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && u.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': html.length }).end(html);
    return;
  }
  const p = http.request(inner.origin + req.url, { method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on('error', (e) => { if (!res.headersSent) res.writeHead(502); res.end(String(e)); });
  req.pipe(p);
});
await new Promise((r) => front.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + front.address().port;
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
let total = { pass: 0, fail: 0 };
for (const name of names) {
  const code = fs.readFileSync(name.endsWith('.js') ? path.resolve(ROOT, name) : path.join(TESTS, name + '.js'), 'utf8'), t0 = Date.now();
  const page = await browser.newPage({ width: 1280, height: 720 });
  try { const { windowId } = await page.send('Browser.getWindowForTarget', {}); await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } }); } catch { /* stays */ }
  let lines = [];
  try {
    await page.goto(`${origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
    if (!(await page.waitFor('!!window.TT', { timeout: 400000 }))) throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
    await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));
    const out = await page.evaluate(code, 300000);
    lines = String(typeof out === 'string' ? out : JSON.stringify(out)).split('\n').map((l) => l.trim()).filter(Boolean);
  } catch (e) { lines = ['FAIL ' + name + ' did not run: ' + String(e.message || e).split('\n')[0]]; }
  const pass = lines.filter((l) => l.startsWith('PASS')).length, fail = lines.filter((l) => l.startsWith('FAIL')).length;
  total.pass += pass; total.fail += fail;
  console.log(`${fail ? 'FAIL' : 'ok  '}  ${name.padEnd(6)} ${String(pass).padStart(4)} pass ${String(fail).padStart(3)} fail  ${((Date.now() - t0) / 1000).toFixed(1)}s  (real renderer, ${htmlRel})`);
  for (const l of lines) if (all || !l.startsWith('PASS')) console.log('    ' + l);
  try { await page.send('Page.close', {}); } catch { /* gone */ }
}
console.log(`${names.length} checks: ${total.pass} pass, ${total.fail} fail (real renderer, ${htmlRel})`);
await browser.close?.(); front.close(); inner.close?.();
process.exit(0);
