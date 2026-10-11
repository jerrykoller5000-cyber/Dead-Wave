// GB-148 (Grokbot): the revolver stowed on the pack, measured and shot on the real renderer (headless Chrome + SwiftShader).
//   node handoffs/2026-10-09-grokbot-GB-148/stow-probe.mjs <out.json> [shotsDir] [variant ...]
// Variants are tried live by swapping rig.placeSecondary in the page (nothing saved); 'game' is the file as it is.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const { serve } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'serve.mjs').replace(/\\/g, '/')));
const { launch } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'cdp.mjs').replace(/\\/g, '/')));
const [outJson = path.join(HERE, 'probe.json'), shotsDir = '', ...variants] = process.argv.slice(2);
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
const rows = [];
try {
  const page = await browser.newPage({ width: 1000, height: 1000 });
  await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
  const step = (code, ms = 180000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
  await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
    await wait(3500); return true;`, 120000);
  await step(`const tg = D.tg(); for (const t of tg.targets) t.pivot.parent.visible = false;
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    const keep = new Set(); for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
    for (const ch of document.body.children) if (!keep.has(ch)) ch.style.setProperty('display', 'none', 'important');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));
    const O = tg.origin, y0 = tg.floorY, p = T.localPlayer ? T.localPlayer.position : T.player.position;
    window.__S = { x: O.x, y: y0, z: O.z + 4 };
    window.__pin = setInterval(() => { p.x = __S.x; p.z = __S.z; T.aimTarget.set(__S.x, y0 + 1.25, __S.z + 30); }, 5);
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'pistol'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('pistol')); await wait(300); } await wait(2500); return true;`);
  await page.evaluate(fs.readFileSync(path.join(HERE, 'stow-page.js'), 'utf8'));
  if (process.env.SP_LOADOUT) await page.evaluate(`window.__stowOwn = ${process.env.SP_LOADOUT}`);
  for (const v of (variants.length ? variants : ['game'])) {
    const r = await page.evaluate(`window.__stow(${JSON.stringify(v)})`, 120000);
    rows.push(r); console.log(JSON.stringify(r));
    if (shotsDir) {
      fs.mkdirSync(shotsDir, { recursive: true });
      for (const [n, a, d, y] of (process.env.SP_FAR === '0' ? [] : [['back', 180, 4, 1.6], ['back-left', 225, 4, 1.6], ['left', 270, 4, 1.6]]).concat([['back-close', 180, 1.1, 1.0], ['back-left-close', 225, 1.1, 1.0], ['left-close', 270, 1.1, 1.0]])) {
        await step(`const S = __S, th = ${a} * Math.PI / 180, dx = -Math.sin(th), dz = Math.cos(th);
          T.setShotView({ x: S.x + dx * ${d}, y: S.y + ${y}, z: S.z + dz * ${d}, tx: S.x + (${d} < 2 ? 0.17 : 0), ty: S.y + (${d} < 2 ? 0.82 : 0.95), tz: S.z - (${d} < 2 ? 0.35 : 0), fov: 30 }); await wait(1200); return true;`);
        await page.screenshot(path.join(shotsDir, `${v.replace(/[^\w.=-]+/g, '_')}-${n}.png`));
      }
    }
  }
  fs.writeFileSync(outJson, JSON.stringify(rows, null, 1));
  console.log('page errors:', (page.errors || []).length);
} finally { await browser.close(); await srv.close(); }
