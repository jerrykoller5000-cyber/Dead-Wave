// qa/2026-11-07-GB-302/page-load.mjs — light real page-load: index.html boots to TT (WebGPU headed).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });
const page = await browser.newPage({ width: 1280, height: 720 });
let bad = 0;
const t0 = Date.now();
try {
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); else { const b = document.getElementById('openingSkip'); if (b) b.click(); } })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  const up = await page.waitFor('!!window.TT', { timeout: 180000 });
  if (!up) throw new Error('window.TT never appeared: ' + (page.errors[0] || 'no page error').split('\n')[0]);
  const ms = Date.now() - t0;
  const info = await page.evaluate(`(() => ({
    tt: !!window.TT,
    version: (document.getElementById('gameVersion') || {}).textContent || '',
    renderer: (window.TT && TT.renderer && (TT.renderer.constructor && TT.renderer.constructor.name)) || null
  }))()`);
  console.log('page-load PASS', JSON.stringify({ ms, ...info }));
  if (page.errors.length) {
    console.log('page errors (informational):');
    for (const e of page.errors.slice(0, 6)) console.log('  ' + e.split('\n')[0]);
  }
} catch (e) {
  bad++;
  console.log('page-load FAIL: ' + (e && e.message || e));
  if (page.errors && page.errors.length) {
    for (const e2 of page.errors.slice(0, 6)) console.log('  ' + e2.split('\n')[0]);
  }
} finally {
  await browser.close();
  await server.close();
}
process.exit(bad ? 1 : 0);
