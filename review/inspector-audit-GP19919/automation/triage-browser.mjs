// Optional paired checks after the full suite closes its workers; never use the shared camera daemon.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../../tools/serve.mjs';
import { launch } from '../../../tools/cdp.mjs';
const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url))), HERE = path.dirname(fileURLToPath(import.meta.url));
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
html = html.replace(/(\s(?:src|href)=")(?!https?:|\/|data:|#)/g, '$1/').replace(/from (['"])\.\//g, 'from $1/').replace(/import (['"])\.\//g, 'import $1/');
fs.writeFileSync(path.join(HERE, 'triage-current.html'), html, 'utf8');
const tests = process.argv.slice(2).length ? process.argv.slice(2) : ['t3', 't50'];
for (const name of tests) if (!/^t[0-9a-z]+$/.test(name) || !fs.existsSync(path.join(ROOT, 'tools', 'tests', name + '.js'))) throw Error('unknown test ' + name);
const server = await serve(ROOT, 0), out = { at: new Date().toISOString(), limits: 'Both fixtures use current external modules and the current fake renderer; this isolates inline game-source changes, not complete historical dependency snapshots.', results: [] };
let browser;
try {
  browser = await launch({ headless: true });
  for (const name of tests) for (const [label, file] of [['pre-audit', '/tools/tests/test-31404.html'], ['current', '/review/inspector-audit-GP19919/automation/triage-current.html']]) {
    const page = await browser.newPage(), at = Date.now(), result = { name, label };
    try {
      await page.send('Storage.clearDataForOrigin', { origin: server.origin, storageTypes: 'local_storage' });
      await page.goto(server.origin + file + '?debug=1&raf=timer', { waitUntil: 'none' });
      if (!await page.waitFor('!!window.TT', { timeout: 120000 })) throw Error('no TT: ' + (page.errors[0] || 'no page error'));
      await page.evaluate('window.DWOpening?.dismissForTesting()');
      if (!await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 })) throw Error('opening did not finish');
      await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));
      result.raw = await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests', name + '.js'), 'utf8'), 200000);
      result.pass = result.raw.split('\n').filter((s) => s.startsWith('PASS')).length;
      result.fail = result.raw.split('\n').filter((s) => s.startsWith('FAIL')).length;
    } catch (error) { result.error = String(error.stack || error); }
    result.seconds = (Date.now() - at) / 1000; result.errors = page.errors; out.results.push(result);
    fs.writeFileSync(path.join(HERE, 'triage-browser.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify({ name, label, pass: result.pass, fail: result.fail, seconds: result.seconds, error: result.error, failures: result.raw && result.raw.split('\n').filter((s) => s.startsWith('FAIL')) }));
    await page.send('Page.close', {}).catch(() => {});
  }
} finally { if (browser) await browser.close(); await server.close(); }
process.exit(0);
