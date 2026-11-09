// GP-20063: matched builder views of the Breacher, rotary gun, flamer and chainsaw.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const phase = process.argv[2];
if (!['before', 'after', 'launcher-after'].includes(phase)) throw new Error('give before, after or launcher-after phase');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20063', phase);
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  const results = [];
  for (const gun of (phase === 'launcher-after' ? ['launcher'] : ['aa12', 'minigun', 'flamer', 'chainsaw'])) {
    await page.goto(`${server.origin}/tools/gunshot/index.html?gun=${gun}&w=1280&h=720&view=side`, { timeout: 240000 });
    if (!await page.waitFor('!!window.GUNSHOT', { timeout: 30000 })) throw new Error(`${gun} GUNSHOT did not boot: ${JSON.stringify(page.errors)}`);
    const info = await page.evaluate('window.GUNSHOT.ready');
    for (const view of ['side', 'quarter', 'top', 'close']) {
      await page.evaluate(`window.GUNSHOT.shoot(${JSON.stringify(view)})`);
      const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(out, `${gun}-${view}.png`), Buffer.from(shot.data, 'base64'));
    }
    results.push({ gun, ...info, errors: page.errors });
    console.log(JSON.stringify({ gun, tris: info.tris, box: info.box, floats: info.floats?.length, errors: page.errors.length }));
    if (page.errors.length) throw new Error(page.errors[0]);
  }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2) + '\n');
} finally { await browser.close(); await server.close(); }
