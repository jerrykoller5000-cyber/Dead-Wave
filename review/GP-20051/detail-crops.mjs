// GP-20051: inspect feed and reflex housing at a fixed close scale.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20051/minigun/after');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720', '--disable-features=CalculateNativeWinOcclusion'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  for (const item of [
    { name: 'belt-close', at: '0.18,0.065,0.015', d: '0.42', view: 'quarter' },
    { name: 'sight-rear', at: '0,0.33,0.01', d: '0.35', view: 'rear' },
    { name: 'sight-quarter', at: '0,0.33,0.01', d: '0.35', view: 'quarter' },
  ]) {
    const url = `${server.origin}/tools/gunshot/index.html?gun=minigun&w=1280&h=720&view=${item.view}&at=${item.at}&d=${item.d}`;
    await page.goto(url, { timeout: 240000 });
    if (!await page.waitFor('!!window.GUNSHOT', { timeout: 120000 })) throw new Error(`GUNSHOT did not boot: ${item.name}`);
    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(out, `${item.name}.png`), Buffer.from(shot.data, 'base64'));
  }
  console.log(JSON.stringify({ crops: 3, errors: page.errors.length }));
  if (page.errors.length) throw new Error(page.errors[0]);
} finally { await browser.close(); await server.close(); }
