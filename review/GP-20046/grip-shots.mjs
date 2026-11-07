// GP-20046: inspect the launcher/flamer grips at Jerry's requested 42 cm view.
// Run only through the shared game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const [subject, phase, lit = 'noon'] = process.argv.slice(2);
const gun = subject === 'flamer-front' ? 'flamer' : subject;
const target = { launcher: '0,-0.061,-0.032', flamer: '0,-0.078,-0.157', 'flamer-front': '0,-0.07,0.28' }[subject];
if (!target || !phase || !/^[a-z0-9-]+$/.test(phase) || !['noon', 'overcast', 'dusk', 'night'].includes(lit)) throw new Error('usage: grip-shots.mjs launcher|flamer|flamer-front phase [noon|overcast|dusk|night]');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20046', lit === 'noon' ? phase : `${phase}-${lit}`);
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  const url = new URL('/tools/gunshot/index.html', server.origin);
  for (const [k, v] of Object.entries({ gun, view: 'side', at: target, d: '0.42', w: '1280', h: '720', lit })) url.searchParams.set(k, v);
  await page.goto(url.href, { timeout: 180000 });
  if (!await page.waitFor('!!window.GUNSHOT', { timeout: 180000 })) throw new Error('GUNSHOT did not boot');
  const info = await page.evaluate('(async () => await window.GUNSHOT.ready)()');
  if (lit === 'overcast' || lit === 'dusk') await page.evaluate(`(() => {
    const lights = window.GUNSHOT.scene.children.filter(x => x.isLight);
    const hemi = lights.find(x => x.isHemisphereLight), directional = lights.filter(x => x.isDirectionalLight);
    if (hemi) { hemi.intensity = ${lit === 'overcast' ? 1.4 : 0.8}; hemi.color.setHex(${lit === 'overcast' ? '0xc8d1da' : '0x8d9bb7'}); }
    if (directional[0]) { directional[0].intensity = ${lit === 'overcast' ? 0.8 : 1.3}; directional[0].color.setHex(${lit === 'overcast' ? '0xdfe6e9' : '0xffb36b'}); }
    if (directional[1]) directional[1].intensity = ${lit === 'overcast' ? 0.3 : 0.18};
  })()`);
  for (const view of ['side', 'quarter']) {
    await page.evaluate(`(async () => await window.GUNSHOT.shoot(${JSON.stringify(view)}))()`);
    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(out, `${subject}-${view}.png`), Buffer.from(shot.data, 'base64'));
  }
  fs.writeFileSync(path.join(out, `${subject}.json`), JSON.stringify({ gun, subject, phase, lit, target, distance: 0.42, info, errors: page.errors }, null, 2) + '\n', 'utf8');
  if (page.errors.length) throw new Error(`${page.errors.length} page errors`);
  console.log(`${subject} ${phase}: side and quarter at 0.42 m; ${info.tris} triangles; 0 page errors`);
} finally { await browser.close(); await server.close(); }
