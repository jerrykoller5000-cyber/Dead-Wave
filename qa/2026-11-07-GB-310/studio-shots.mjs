// GB-310 studio stills: knife + machete, 5 views each. Usage: node ... before|after
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const tag = process.argv[2] || 'before';
const out = path.join(ROOT, 'qa/2026-11-07-GB-310', tag);
fs.mkdirSync(out, { recursive: true });
const VIEWS = ['side', 'top', 'tq', 'blade', 'grip'];
const WHICHS = ['knife', 'machete'];
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
const metrics = {};
try {
  for (const which of WHICHS) {
    for (const view of VIEWS) {
      const page = await browser.newPage({ width: 1280, height: 720 });
      await page.goto(`${srv.origin}/qa/2026-11-07-GB-310/studio.html?which=${which}&view=${view}&t=${Date.now()}`, { timeout: 90000 });
      await page.waitFor('window.DONE === true', { timeout: 120000 });
      const err = await page.evaluate('window.ERR || ""');
      if (err) console.log(which, view, 'ERR', err.slice(0, 400));
      const m = await page.evaluate('window.METRICS || null');
      if (m) metrics[which] = m;
      const file = path.join(out, `${which}-${view}.png`);
      await page.screenshot(file);
      console.log(tag, which, view, 'ok', m && m.tris);
      await page.close();
    }
  }
} finally {
  await browser.close();
  srv.close && srv.close();
}
fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify(metrics, null, 2));
console.log('METRICS', JSON.stringify(metrics));
