// tools/vmsheet.mjs - CL-281: first person's view gun on the real renderer, a few frames to look at (rule 18-19).
//   node tools/vmsheet.mjs [--out <dir>] [--soft] [--gun pistol] [--size 1280x720]
// Shots: the hip, down the sights, three beats of the reload, a look down, a turn (the sway), and the old first person
// (?vm=0) at the hip for comparison. --soft runs headless on the software renderer (slow: a minute a shot).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const soft = argv.includes('--soft'), gun = arg('--gun', 'pistol'), out = path.resolve(arg('--out', path.join(ROOT, 'qa', 'vmsheet')));
const [W, H] = arg('--size', '1280x720').split('x').map(Number);
const only = arg('--only', '');
fs.mkdirSync(out, { recursive: true });
const server = await serve(ROOT, 0);
const browser = await launch({ headless: soft, args: soft ? [] : ['--window-size=' + W + ',' + H] });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
async function open(q) {
  const page = await browser.newPage({ width: W, height: H });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer${soft ? '&renderer=webgl' : ''}${q}`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT: ' + (page.errors[0] || ''));
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);
  await page.evaluate(`(async () => { const T = TT; await startMatch(T, 'VM'); T.clearZombies && T.clearZombies(); T.setHp(1e5); T.grantAllWeapons();
    if (T.setWorldTime) T.setWorldTime(0.42);
    const w = '${gun}'; for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await new Promise((r) => setTimeout(r, 150)); }
    T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4000)); return 1; })()`, 600000);
  return page;
}
const shot = async (page, name, js, settle = 2500) => {
  if (only && !name.includes(only)) return;
  if (js) await page.evaluate(`(async () => { const T = TT; ${js}; return 1; })()`, 300000);
  await new Promise((r) => setTimeout(r, settle));
  const info = await page.evaluate(`(() => { const v = TT.viewmodelDbg && TT.viewmodelDbg(); return v ? JSON.stringify({ active: v.info.active, raise: +v.info.raise.toFixed(2), ads: +v.info.ads.toFixed(2), mag: v.info.magState, hand: v.info.handPlace, u: v.info.reloadU }) : 'none'; })()`);
  const file = path.join(out, name + '.png');
  await page.screenshot(file);
  console.log(name.padEnd(18), info, '->', path.relative(ROOT, file));
};
try {
  const page = await open('');
  await shot(page, 'vm-hip', '');
  await shot(page, 'vm-ads', 'T.setZoomHeldDbg(true)', 3500);
  await shot(page, 'vm-hip-again', 'T.setZoomHeldDbg(false)', 3000);
  for (const [name, at] of [['vm-reload-grab', 0.14], ['vm-reload-pouch', 0.4], ['vm-reload-seat', 0.58], ['vm-reload-slide', 0.78]]) {
    await shot(page, name, `T.setAmmoDbg('${gun}', 2); T.startReload(); const t0 = Date.now(); while (Date.now() - t0 < 30000) { const r = T.getReloadDbg(); if (!T.isReloading() || (1 - r.timer / r.anim) >= ${at}) break; await new Promise((q) => setTimeout(q, 5)); }`, 30);
    await page.evaluate(`(async () => { const T = TT; while (T.isReloading()) await new Promise((q) => setTimeout(q, 50)); return 1; })()`, 120000);
  }
  await shot(page, 'vm-look-down', 'T.setOtsAimDbg(null, -0.9)', 2500);
  await shot(page, 'vm-look-up', 'T.setOtsAimDbg(null, 0.5)', 2500);
  await shot(page, 'vm-turn', 'T.setOtsAimDbg(null, 0); for (let i = 0; i < 6; i++) { T.otsLook && T.otsLook(-160, 0); await new Promise((r) => setTimeout(r, 30)); }', 60);
  await page.send('Page.close', {});
  if (!only || 'old-hip'.includes(only)) { const old = await open('&vm=0'); await shot(old, 'old-hip', ''); await shot(old, 'old-ads', 'T.setZoomHeldDbg(true)', 3500); }
} catch (e) { console.log('FAIL', e.stack || e); }
await browser.close?.(); server.close?.();
process.exit(0);
