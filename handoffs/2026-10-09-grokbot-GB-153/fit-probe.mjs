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
const only = (process.argv[3] || '').split(',').filter((x) => x && x !== 'all');
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
  { name: 'pistol-sprint', weapon: 'pistol', keys: ['KeyW', 'ShiftLeft'], views: ['three-front'] },
  // GB-152: hands close up
  { name: 'm4', weapon: 'm4', views: ['three-front', 'side'], hands: true },
  { name: 'unarmed', weapon: 'pistol', holster: true, views: [], hands: true }
];
const HAND_VIEWS = { 'hand-front': [0.05, 0.08, 0.55], 'hand-out': [0.55, 0.1, 0.1], 'hand-top': [0.05, 0.55, 0.12], 'hand-in': [-0.5, 0.1, 0.2] };
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

  await page.evaluate(fs.readFileSync(path.join(HERE, 'fit-page.js'), 'utf8'));
  const weapons = await page.evaluate(`TT.WEAPON_ORDER.filter((w) => TT.weaponMeshes[w] && TT.getShoulderDbg().holds[w])`);
  const fit = {}; const shots = process.argv[4] === 'shots'; fs.mkdirSync(outDir, { recursive: true });
  for (const w of weapons) {
    if (only.length && !only.includes(w)) continue;
    for (const aki of [false, true]) {
      const ok = await page.evaluate(`(() => { const T = TT; for (let i = 0; i < 16 && T.getCurrentWeapon() !== '${w}'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); __step(12); }
        if (T.getCurrentWeapon() !== '${w}') return false;
        if (${aki}) { if (!(T.dualCapableDbg ? T.dualCapableDbg('${w}') : !!(T.offhandMeshes && T.offhandMeshes['${w}']))) return false; T.toggleDualWieldDbg(); }
        window.__aimPitch = 0; __step(150);
        const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
        for (let k = 0; k < 40 && !shown(T.weaponMeshes['${w}']); k++) __step(30);
        if (!shown(T.weaponMeshes['${w}'])) return false;
        if (${aki} && !(T.offhandMeshes['${w}'] && T.offhandMeshes['${w}'].visible)) { T.toggleDualWieldDbg(); __step(30); return false; }
        return true; })()`);
      if (!ok) continue;
      // which hands hold: the support fist near its anchor (or the akimbo second gun)
      const hands = await page.evaluate(`(() => { const T = TT, HD = T.handsDbg, H = T.getShoulderDbg().holds['${w}'], gun = T.weaponMeshes['${w}'];
        const V = (x, y, z) => new (T.THREE || THREE).Vector3(x, y, z); gun.updateMatrixWorld(true);
        const pist = '${w}' === 'pistol' || '${w}' === 'revolver';
        const out = [{ name: 'R', role: 'fire', swing: pist ? ${-0.6} : ${-0.3} }];
        if (${aki}) out.push({ name: 'L', role: 'offhand', gun: 'off', swing: pist ? ${-0.6} : ${-0.3} });
        else out.push({ name: 'L', role: 'support', swing: pist ? ${-0.45} : ${-0.15}, alsoHand: pist });
        return out; })()`);
      const r = await page.evaluate(`window.__fitHands('${w}', ${JSON.stringify(hands)})`, 300000);
      const key = w + (aki ? '-akimbo' : '');
      fit[key] = r; console.log(key, JSON.stringify(r));
      if (shots) {
        // the fitted pose as it is now (the fit leaves each rig there): hold it through the frames the views take
        await page.evaluate(`(() => { const ud = TT.getMarine().userData; for (const e of [ud.elbowRG, ud.elbowLG]) { const r = e.userData.wrist.userData.hand; r._set = r.set; r.set = function () { return this; }; for (const sk of r.skins) { const mt = sk.mesh.material; if (!mt.userData.gb153c) mt.userData.gb153c = mt.color.getHex(); mt.color.setHex(e === ud.elbowRG ? 0xd9a066 : 0x66b3d9); } } })()`);
        const HV = { front: [0.05, 0.08, 0.5], out: [0.5, 0.06, 0.08], in: [-0.48, 0.08, 0.15], top: [0.03, 0.5, 0.08] };
        for (const v of Object.keys(HV)) for (const hs of ['R', 'L']) {
          if (hs === 'L' && !hands.some((h) => h.name === 'L')) continue;
          await page.evaluate(`(() => { __handView('${hs}', ${JSON.stringify(HV[v])}, 30); __step(1); })()`);
          await new Promise((res) => setTimeout(res, 300));
          await page.screenshot(path.join(outDir, `${key}-${hs}-${v}.png`));
        }
        await page.evaluate(`(() => { const ud = TT.getMarine().userData; for (const e of [ud.elbowRG, ud.elbowLG]) { const r = e.userData.wrist.userData.hand; r.set = r._set; for (const sk of r.skins) { const mt = sk.mesh.material; if (mt.userData.gb153c != null) mt.color.setHex(mt.userData.gb153c); } } TT.setShotView(null); })()`);
      }
      await page.evaluate(`(() => { const T = TT; if (${aki}) T.toggleDualWieldDbg(); __step(60); })()`);
    }
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'fit.json'), JSON.stringify(fit, null, 1));
  const errs = (page.errors || []).filter((e) => !/contains' on 'Node'/.test(e)).slice(0, 5); if (errs.length) console.log('page errors:\n  ' + errs.map((e) => e.split('\n')[0]).join('\n  '));
} catch (e) { console.error('FAILED', e && e.stack || e); code = 1; }
await browser.close?.(); server.close?.();
process.exit(code);
