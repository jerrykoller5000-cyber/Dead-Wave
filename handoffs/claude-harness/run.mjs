// Runs one test file (tNN.js) inside the game page and prints logs, page errors and the result.
// Usage: node run.mjs t41.js    (serve this folder on PORT, default 8793, first; see README)
import { chromium } from 'playwright';
import fs from 'fs';
const testFile = process.argv[2];
const port = process.env.PORT || 8793;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [], logs = [];
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 6).join('\n')));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning' || m.type() === 'info' || m.text().startsWith('[T]')) logs.push('[' + m.type() + '] ' + m.text()); });
await page.goto('http://localhost:' + port + '/' + (process.env.PAGE || 'test.html') + '?debug=1&raf=timer', { waitUntil: 'load' });
for (let i = 0; i < 60; i++) { if (await page.evaluate('!!window.TT')) break; await page.waitForTimeout(500); }
let out = null;
if (testFile) {
  const code = fs.readFileSync(testFile, 'utf8');
  try { out = await page.evaluate(code); } catch (e) { out = 'EVAL ERROR: ' + e.message; }
}
console.log('=== LOGS ===\n' + logs.slice(0, 60).join('\n'));
console.log('=== ERRORS ===\n' + (errs.length ? errs.slice(0, 10).join('\n---\n') : '(none)'));
console.log('=== RESULT ===\n' + (typeof out === 'string' ? out : JSON.stringify(out, null, 1)));
await browser.close();
