// GB-297: one first-person close hip shot per gun (parts in view).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'fp');
fs.mkdirSync(OUT, { recursive: true });
const W = 1280, H = 720;
const GUNS = ['pistol', 'revolver', 'uzi', 'm4', 'ak', 'aa12', 'shotgun', 'sniper', 'minigun', 'launcher', 'flamer', 'chainsaw'];

const server = await serve(ROOT, 0);
const browser = await launch({ headless: true, args: ['--window-size=' + W + ',' + H] });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
try {
  const page = await browser.newPage({ width: W, height: H });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);
  const boot = await page.evaluate(`(async () => {
    const T = TT; await startMatch(T, 'GB297'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
    T.setWorldTime?.(0.42);
    T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0);
    T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4000));
    return { first: !!T.fpDbg?.()?.first, vm: !!(T.viewmodelDbg?.()?.info?.active) };
  })()`, 600000);
  console.log('boot', JSON.stringify(boot));
  if (!boot.first || !boot.vm) throw new Error('FP viewmodel not up');

  for (const gun of GUNS) {
    const row = await page.evaluate(`(async () => {
      const T = TT, gun = ${JSON.stringify(gun)};
      for (let i = 0; i < 25 && T.getCurrentWeapon() !== gun; i++) {
        const ix = T.WEAPON_ORDER.indexOf(gun);
        if (ix < 0) return { gun, ok: false, err: 'no weapon' };
        T.setWeapon(ix); await new Promise((r) => setTimeout(r, 100));
      }
      T.setZoomHeldDbg(false);
      await new Promise((r) => setTimeout(r, 700));
      return { gun, ok: T.getCurrentWeapon() === gun, have: T.getCurrentWeapon() };
    })()`, 120000);
    console.log('equip', JSON.stringify(row));
    await page.screenshot(path.join(OUT, `fp-${gun}-hip.png`));
  }
} finally {
  await browser.close();
  server.close && server.close();
}