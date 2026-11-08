// GP-20051: render each affected gun from fixed views through the shared slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const phase = process.argv[2];
if (!phase || !/^[a-z0-9-]+$/.test(phase)) throw new Error('give before/after phase');
const gun = process.argv[3];
if (!['minigun', 'chainsaw'].includes(gun)) throw new Error('give minigun or chainsaw');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20051', gun, phase);
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/tools/gunshot/index.html?gun=${gun}&w=1280&h=720&view=side`, { timeout: 240000 });
  if (!await page.waitFor('!!window.GUNSHOT', { timeout: 120000 })) throw new Error('GUNSHOT did not boot');
  const info = await page.evaluate('window.GUNSHOT.ready');
  for (const view of ['side', 'sideR', 'top', 'quarter', 'close']) {
    await page.evaluate(`window.GUNSHOT.shoot(${JSON.stringify(view)})`);
    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(out, `${gun}-${view}.png`), Buffer.from(shot.data, 'base64'));
  }
  fs.writeFileSync(path.join(out, `${gun}.json`), JSON.stringify({ info, errors: page.errors }, null, 2) + '\n');
  console.log(JSON.stringify({ phase, tris: info.tris, box: info.box, floats: info.floats?.length, errors: page.errors.length }));
  if (page.errors.length) throw new Error(page.errors[0]);
} finally { await browser.close(); await server.close(); }
