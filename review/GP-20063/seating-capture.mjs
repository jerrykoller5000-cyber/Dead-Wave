// GP-20063: seated hardware and fitted unit sheets through the shared game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20063', 'seating-after');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const guns = process.argv.slice(2);
const result = {};
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  for (const gun of guns) {
    await page.goto(`${server.origin}/tools/gunshot/index.html?gun=${encodeURIComponent(gun)}&w=1280&h=720&view=side`, { timeout: 240000 });
    if (!await page.waitFor('!!window.GUNSHOT', { timeout: 30000 })) throw new Error(`${gun} did not boot: ${JSON.stringify(page.errors)}`);
    await page.evaluate('window.GUNSHOT.shoot("side")');
    const bare = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(out, `${gun}-bare-side.png`), Buffer.from(bare.data, 'base64'));
    const mounted = await page.evaluate(`{const g=window.GUNSHOT.gun; const u=g.userData.laserLightUnit; if(u) u.visible=true; !!u}`);
    const info = await page.evaluate('window.GUNSHOT.shoot("side")');
    for (const view of ['side', 'sideR', 'top', 'quarter', 'close']) {
      await page.evaluate(`window.GUNSHOT.shoot(${JSON.stringify(view)})`);
      const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(out, `${gun}-${view}.png`), Buffer.from(shot.data, 'base64'));
    }
    result[gun] = { mounted, tris: info.tris, floats: info.floats, laser: await page.evaluate('window.GUNSHOT.gun.userData.laserLensLocal?.toArray()'),
      light: await page.evaluate('window.GUNSHOT.gun.userData.lightLensLocal?.toArray()'), errors: page.errors };
    console.log(JSON.stringify({ gun, ...result[gun] }));
    if (page.errors.length || !mounted || info.floats?.length) throw new Error(`${gun} model: errors ${JSON.stringify(page.errors)}, floats ${JSON.stringify(info.floats)}`);
  }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2) + '\n');
} finally { await browser.close(); await server.close(); }
