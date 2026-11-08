// GB-316: tools/gunshot sheets via tools/cdp.mjs (no playwright).
// Views: side, three-quarter, close-up, the other side.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const tag = process.argv[2] || 'before';
const out = path.join(ROOT, 'qa/2026-11-07-GB-316', tag);
fs.mkdirSync(out, { recursive: true });
const VIEWS = ['side', 'quarter', 'close', 'sideR'];
const GUNS = ['pistol', 'revolver', 'uzi'];
const W = 1280, H = 720;
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
const summary = {};
try {
  for (const gun of GUNS) {
    const page = await browser.newPage({ width: W, height: H });
    await page.goto(`${srv.origin}/tools/gunshot/index.html?gun=${gun}&w=${W}&h=${H}&view=${VIEWS[0]}&t=${Date.now()}`, { timeout: 90000 });
    await page.waitFor('window.GUNSHOT && window.GUNSHOT.ready', { timeout: 120000 });
    const info = await page.evaluate('window.GUNSHOT.ready');
    summary[gun] = info;
    console.log(tag, gun, 'ready tris', info && info.tris, 'floats', info && info.floats && info.floats.length);
    if (info && info.floats && info.floats.length) console.log(tag, gun, 'FLOATS', JSON.stringify(info.floats));
    for (const view of VIEWS) {
      await page.evaluate('window.GUNSHOT.shoot(' + JSON.stringify(view) + ')');
      await new Promise((r) => setTimeout(r, 200));
      const file = path.join(out, gun + '-' + view + '.png');
      await page.screenshot(file);
      console.log(tag, gun, view, 'ok');
    }
    await page.close();
  }
} finally {
  await browser.close();
  if (srv.close) srv.close();
}
fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify(summary, null, 2));
console.log('METRICS', JSON.stringify(summary));
