import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(ROOT, 'qa/2026-11-07-GB-313/after');
fs.mkdirSync(out, { recursive: true });
const VIEWS = ['side', 'tq', 'rearsight', 'recv'];
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
const metrics = {};
try {
  for (const view of VIEWS) {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(`${srv.origin}/qa/2026-11-07-GB-313/studio.html?view=${view}&t=${Date.now()}`, { timeout: 90000 });
    await page.waitFor('window.DONE === true', { timeout: 120000 });
    const err = await page.evaluate('window.ERR || ""');
    if (err) console.log(view, 'ERR', err.slice(0, 400));
    const m = await page.evaluate('window.METRICS || null');
    if (m) Object.assign(metrics, m);
    await page.screenshot(path.join(out, `studio-${view}.png`));
    console.log('after', view, 'ok', m && m.tris, 'floats', m && m.floatingCount);
    await page.close();
  }
} finally {
  await browser.close();
  srv.close && srv.close();
}
fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify(metrics, null, 2));
console.log('METRICS', JSON.stringify(metrics));