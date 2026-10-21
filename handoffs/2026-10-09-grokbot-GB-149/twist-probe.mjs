// GB-149 (Grokbot): how far his shoulders twist past his hips on a turn, on the real renderer (headless Chrome +
// SwiftShader), on a manual 60 fps clock so every run is the same frames.
//   node handoffs/2026-10-09-grokbot-GB-149/twist-probe.mjs measure <out.json>
//   node handoffs/2026-10-09-grokbot-GB-149/twist-probe.mjs strip <outDir>     6 frames across a snap 180 (m4), top + 3/4
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const { serve } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'serve.mjs').replace(/\\/g, '/')));
const { launch } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'cdp.mjs').replace(/\\/g, '/')));
const [mode = 'measure', outArg = path.join(HERE, 'measure.json')] = process.argv.slice(2);
const D2R = Math.PI / 180;
export const SCEN = [
  { name: 'stand m4 90deg/s x180', weapon: 'm4', turn: { from: 0, to: Math.PI, rate: 90 * D2R } },
  { name: 'stand m4 360deg/s x360', weapon: 'm4', turn: { from: 0, to: 2 * Math.PI, rate: 360 * D2R } },
  { name: 'stand m4 snap 180', weapon: 'm4', turn: { from: 0, to: Math.PI - 0.01, rate: Infinity } },
  { name: 'stand m4 snap 180 other way', weapon: 'm4', turn: { from: 0, to: -Math.PI + 0.01, rate: Infinity } },
  { name: 'stand pistol snap 180', weapon: 'pistol', turn: { from: 0, to: Math.PI - 0.01, rate: Infinity } },
  { name: 'stand pistol 360deg/s x360', weapon: 'pistol', turn: { from: 0, to: 2 * Math.PI, rate: 360 * D2R } },
  { name: 'crouch m4 snap 180', weapon: 'm4', keys: ['KeyC'], turn: { from: 0, to: Math.PI - 0.01, rate: Infinity } },
  { name: 'walk m4 strafe D, aim held', weapon: 'm4', keys: ['KeyD'], turn: { from: 0, to: 0, rate: 1 }, hold: 1 },
  { name: 'walk m4 strafe A, aim held', weapon: 'm4', keys: ['KeyA'], turn: { from: 0, to: 0, rate: 1 }, hold: 1 },
  { name: 'walk m4 fwd, 180deg/s x360', weapon: 'm4', keys: ['KeyW'], turn: { from: 0, to: 2 * Math.PI, rate: 180 * D2R } },
  { name: 'run m4 fwd, 360deg/s x360', weapon: 'm4', keys: ['KeyW', 'ShiftLeft'], turn: { from: 0, to: 2 * Math.PI, rate: 360 * D2R } },
  { name: 'walk pistol strafe D, snap 180', weapon: 'pistol', keys: ['KeyD'], turn: { from: 0, to: Math.PI - 0.01, rate: Infinity } }
];
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
let code = 0;
try {
  const page = await browser.newPage({ width: 1000, height: 1000 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
  const step = (c, ms = 180000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${c} })()`, ms);
  await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
    await wait(3500); return true;`, 120000);
  await step(`const tg = D.tg(); for (const t of tg.targets) t.pivot.parent.visible = false;
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    const keep = new Set(); for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
    for (const ch of document.body.children) if (!keep.has(ch)) ch.style.setProperty('display', 'none', 'important');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));
    const O = tg.origin, y0 = tg.floorY;
    window.__S = { x: O.x, y: y0, z: O.z + 4 };
    return true;`);
  await page.evaluate(fs.readFileSync(path.join(HERE, 'twist-page.js'), 'utf8'));
  const simCheck = await page.evaluate(`(() => { const t0 = TT.getSimTime(); __step(60); return TT.getSimTime() - t0; })()`);
  console.log('sim seconds per 60 steps:', simCheck.toFixed(3));
  if (mode === 'measure') {
    const only = process.env.TW_ONLY ? new RegExp(process.env.TW_ONLY) : null;
    const res = [];
    for (const s of SCEN) {
      if (only && !only.test(s.name)) continue;
      const r = await page.evaluate(`window.__twist(${JSON.stringify(s, (k, v) => v === Infinity ? 1e9 : v).replace(/1000000000/g, 'Infinity')})`, 300000);
      res.push(r); const { rows, ...brief } = r; console.log(JSON.stringify(brief));
    }
    fs.writeFileSync(outArg, JSON.stringify(res, null, 1));
  } else if (mode === 'strip') {
    fs.mkdirSync(outArg, { recursive: true });
    const frames = [0, 6, 12, 18, 27, 42];   // 0, 0.1, 0.2, 0.3, 0.45, 0.7 s after the snap
    for (const [view, v] of [['top', '{ x: S.x, y: S.y + 4.2, z: S.z + 0.25, tx: S.x, ty: S.y + 0.9, tz: S.z, fov: 34 }'], ['three-quarter', '{ x: S.x + 2.5, y: S.y + 1.9, z: S.z + 2.5, tx: S.x, ty: S.y + 0.95, tz: S.z, fov: 34 }']]) {
      await page.evaluate(`(() => { const T = TT, S = __S; for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'm4'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('m4')); __step(10); } __setAim(0); __step(120); T.setShotView(${v}); __step(3); })()`);
      let at = 0;
      for (const f of frames) {
        await page.evaluate(`(() => { __setAim(Math.PI - 0.01); __step(${f - at}); TT.getMarine().updateMatrixWorld(true); })()`); at = f;
        await new Promise((r) => setTimeout(r, 400));
        const file = path.join(outArg, `${view}-${String(f).padStart(2, '0')}f.png`); await page.screenshot(file); console.log('shot', file);
      }
      await page.evaluate(`(() => { __setAim(0); __step(150); })()`);
    }
  }
  const errs = (page.errors || []).slice(0, 5); if (errs.length) console.log('page errors:\n  ' + errs.map((e) => e.split('\n')[0]).join('\n  '));
} catch (e) { console.error('FAILED', e && e.stack || e); code = 1; }
await browser.close?.(); server.close?.();
process.exit(code);
