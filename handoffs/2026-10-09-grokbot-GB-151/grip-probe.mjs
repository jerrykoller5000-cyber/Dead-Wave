// GB-151 (Grokbot): the pistol and revolver hold, measured and shot close on the real renderer (headless Chrome), on a
// manual 60 fps clock so every run is the same frames.
//   node handoffs/2026-10-09-grokbot-GB-151/grip-probe.mjs <outDir> [states]
//   states (comma list, default all): pistol, revolver, pistol-up, pistol-down, pistol-akimbo, revolver-akimbo,
//   pistol-fire, pistol-reload, revolver-reload, pistol-sprint
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const { serve } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'serve.mjs').replace(/\\/g, '/')));
const { launch } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'cdp.mjs').replace(/\\/g, '/')));
const outDir = path.resolve(process.argv[2] || path.join(HERE, 'shots'));
const only = (process.argv[3] || '').split(',').filter(Boolean);
// Views round the grip in the gun's own frame (x right, y up, z muzzle), ~1.5 m out with a narrow lens.
const VIEWS = { side: [-1.5, 0.05, 0.05], 'three-front': [-1.0, 0.35, 1.05], top: [-0.05, 1.5, 0.02], front: [-0.15, 0.1, 1.5], right: [1.5, 0.05, 0.05] };
const STATES = [
  { name: 'pistol', weapon: 'pistol' },
  { name: 'revolver', weapon: 'revolver' },
  { name: 'pistol-up', weapon: 'pistol', pitch: 0.45, views: ['side', 'three-front'] },
  { name: 'pistol-down', weapon: 'pistol', pitch: -0.45, views: ['side', 'three-front'] },
  { name: 'pistol-akimbo', weapon: 'pistol', akimbo: true, views: ['three-front', 'top'] },
  { name: 'revolver-akimbo', weapon: 'revolver', akimbo: true, views: ['three-front', 'top'] },
  { name: 'pistol-fire', weapon: 'pistol', fire: true, views: ['side', 'three-front'] },
  { name: 'pistol-reload', weapon: 'pistol', reload: [0.1, 0.5, 0.92], views: ['three-front'] },
  { name: 'revolver-reload', weapon: 'revolver', reload: [0.1, 0.5, 0.92], views: ['three-front'] },
  { name: 'pistol-sprint', weapon: 'pistol', keys: ['KeyW', 'ShiftLeft'], views: ['three-front'] }
];
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
let code = 0; const results = [];
try {
  fs.mkdirSync(outDir, { recursive: true });
  const page = await browser.newPage({ width: 900, height: 900 });
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
    const O = tg.origin, y0 = tg.floorY;
    window.__S = { x: O.x, y: y0, z: O.z + 4 };
    return true;`);
  await page.evaluate(fs.readFileSync(path.join(HERE, 'grip-page.js'), 'utf8'));
  const key = (code, down) => `document.dispatchEvent(new KeyboardEvent('${down ? 'keydown' : 'keyup'}', { code: '${code}', key: '${code}', bubbles: true }));`;
  for (const s of STATES) {
    if (only.length && !only.includes(s.name)) continue;
    await page.evaluate(`(() => { const T = TT; for (let i = 0; i < 16 && T.getCurrentWeapon() !== '${s.weapon}'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('${s.weapon}')); __step(12); }
      window.__aimPitch = ${s.pitch || 0}; ${s.akimbo ? "if (!(T.akimboOnDbg ? T.akimboOnDbg() : false)) T.toggleDualWieldDbg();" : ''} ${(s.keys || []).map((k) => key(k, true)).join(' ')} __step(150); })()`);
    const frames = s.reload ? s.reload : s.fire ? ['fire'] : [null];
    for (const fr of frames) {
      if (fr === 'fire') await page.evaluate(`(() => { TT.setMouseFireDbg(true); __step(2); TT.setMouseFireDbg(false); __step(1); })()`);
      else if (fr != null) await page.evaluate(`(() => { const T = TT; if (!T.isReloading()) { T.setMagazinesDbg('${s.weapon}', 1, [12, 12]); T.startReload(); } T.reloadClipDbg.hold(${fr}); __step(3); })()`);
      const meas = await page.evaluate(`window.__gripMeasure()`);
      meas.state = s.name + (fr != null ? '@' + fr : ''); results.push(meas);
      console.log(JSON.stringify(meas));
      for (const v of s.views || Object.keys(VIEWS)) {
        await page.evaluate(`(() => { __gunView(${JSON.stringify(VIEWS[v])}); __step(1); })()`);
        await new Promise((r) => setTimeout(r, 300));
        const file = path.join(outDir, `${s.name}${fr != null ? '-' + String(fr).replace('.', '') : ''}-${v}.png`);
        await page.screenshot(file); console.log('shot', path.relative(ROOT, file));
      }
    }
    await page.evaluate(`(() => { const T = TT; T.reloadClipDbg.hold(null); ${(s.keys || []).map((k) => key(k, false)).join(' ')} ${s.akimbo ? 'T.toggleDualWieldDbg();' : ''} window.__aimPitch = 0; __step(120); T.setShotView(null); })()`);
  }
  fs.writeFileSync(path.join(outDir, 'measure.json'), JSON.stringify(results, null, 1));
  const errs = (page.errors || []).filter((e) => !/contains' on 'Node'/.test(e)).slice(0, 5); if (errs.length) console.log('page errors:\n  ' + errs.map((e) => e.split('\n')[0]).join('\n  '));
} catch (e) { console.error('FAILED', e && e.stack || e); code = 1; }
await browser.close?.(); server.close?.();
process.exit(code);
