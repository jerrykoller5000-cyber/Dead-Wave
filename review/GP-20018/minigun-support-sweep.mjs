// Runtime-only J61 minigun support-hand placement study. Run through crew.mjs slot run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20018/minigun-support-sweep');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1920,1080'] });
try {
  const page = await browser.newPage({ width: 1920, height: 1080 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('TT did not boot');
  await page.evaluate(`(() => window.DWOpening?.dismissForTesting?.())()`);
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'GP20018');
    T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster();
    T.setViewFirstDbg(true);
    T.setWeapon(T.WEAPON_ORDER.indexOf('minigun'));
    for (let i = 0; i < 100 && (T.getCurrentWeapon() !== 'minigun' || !T.viewmodelDbg()?.showing('minigun')); i++)
      await new Promise(r => setTimeout(r, 100));
  })()`);
  const variants = [
    { id: 'current', support: [-0.10, -0.16, 0.02] },
    { id: 'up-8cm', support: [-0.10, -0.08, 0.02] },
    { id: 'up-14cm', support: [-0.10, -0.02, 0.02] },
    { id: 'up-20cm', support: [-0.10, 0.04, 0.02] },
    { id: 'out-4cm-up-14cm', support: [-0.14, -0.02, 0.02] },
    { id: 'out-10cm-up-14cm', support: [-0.20, -0.02, 0.02] },
    { id: 'out-10cm-up-20cm', support: [-0.20, 0.04, 0.02] },
    { id: 'out-16cm-up-14cm', support: [-0.26, -0.02, 0.02] },
    { id: 'out-16cm-up-20cm', support: [-0.26, 0.04, 0.02] },
    { id: 'out-22cm-up-20cm', support: [-0.32, 0.04, 0.02] }
  ];
  const samples = [];
  for (const variant of variants) {
    const data = await page.evaluate(`(async () => {
      const T = window.TT, v = ${JSON.stringify(variant)};
      const sockets = (await import('./game/viewmodel-poses.js')).VM_SOCKETS;
      sockets.minigun.support = [...v.support];
      const vm = T.viewmodelDbg();
      vm.retune();
      await new Promise(r => setTimeout(r, 750));
      const wr = vm.wrists;
      return {
        variant: v.id, support: [...v.support], first: T.fpDbg().first,
        active: vm.info.active, key: vm.info.key, raise: vm.info.raise,
        wristR: wr?.r?.p ? vm.ndc(wr.r.p) : null,
        wristL: wr?.l?.p ? vm.ndc(wr.l.p) : null,
        backend: T.getRendererBackend()
      };
    })()`);
    if (!data.first || !data.active || data.key !== 'minigun' || data.raise < .99) throw new Error('view gun not ready: ' + JSON.stringify(data));
    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(out, `${variant.id}.png`), Buffer.from(shot.data, 'base64'));
    samples.push(data);
  }
  fs.writeFileSync(path.join(out, 'samples.json'), JSON.stringify({ samples, errors: page.errors }, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ samples, errors: page.errors }, null, 2));
  if (page.errors.length) throw new Error('page errors');
} finally {
  await browser.close();
  await server.close();
}
