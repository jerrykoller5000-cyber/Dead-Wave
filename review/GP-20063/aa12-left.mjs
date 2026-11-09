// GP-20063: left receiver selector crop through the shared game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20063/after');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/tools/gunshot/index.html?gun=aa12&w=1280&h=720&view=sideR&at=0,-0.02,-0.09&d=0.46`, { timeout: 240000 });
  if (!await page.waitFor('!!window.GUNSHOT', { timeout: 30000 })) throw new Error('GUNSHOT did not boot');
  const info = await page.evaluate('window.GUNSHOT.ready');
  await page.evaluate(`window.GUNSHOT.shoot('sideR')`);
  const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(out, 'aa12-selector-closeL.png'), Buffer.from(shot.data, 'base64'));
  console.log(JSON.stringify({ tris: info.tris, floats: info.floats?.length, errors: page.errors.length }));
  if (page.errors.length) throw new Error(page.errors[0]);
} finally { await browser.close(); await server.close(); }
