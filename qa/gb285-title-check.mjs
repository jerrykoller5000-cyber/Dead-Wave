// GB-285: short title check — assert #gameVersion shows v1.2.0 after page load.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const page = await browser.newPage({ width: 1280, height: 720 });
let bad = 0;
try {
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`);
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); else { const b = document.getElementById('openingSkip'); if (b) b.click(); } })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  const up = await page.waitFor('!!window.TT', { timeout: 120000 });
  if (!up) throw new Error('window.TT never appeared: ' + (page.errors[0] || 'no page error').split('\n')[0]);
  // showVersion runs during boot; wait until the title label is filled.
  await page.waitFor(`!!((document.getElementById('gameVersion')||{}).textContent||'').includes('1.2.0')`, { timeout: 30000 });
  const version = await page.evaluate(`(document.getElementById('gameVersion') || {}).textContent || ''`);
  console.log('title gameVersion:', JSON.stringify(version));
  if (!version.includes('1.2.0')) { bad++; console.log('FAIL: expected 1.2.0 in title'); }
  else console.log('PASS: title shows v1.2.0');
  if (page.errors.length) {
    console.log('page errors (informational):');
    for (const e of page.errors.slice(0, 4)) console.log('  ' + e.split('\n')[0]);
  }
} catch (e) {
  bad++;
  console.log('title check failed: ' + (e && e.message || e));
} finally {
  await browser.close();
  await server.close();
}
process.exit(bad ? 1 : 0);