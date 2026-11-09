// GB-318 hold probe: GB-153 boot + live WEAPON_HOLD shots/measures, then optional finger-fit.
//   node qa/2026-11-07-GB-318/hold-probe.mjs <outDir>
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const toFileURL = (p) => new URL('file:///' + p.replace(/\\/g, '/'));
const { serve } = await import(toFileURL(path.join(ROOT, 'tools', 'serve.mjs')));
const { launch } = await import(toFileURL(path.join(ROOT, 'tools', 'cdp.mjs')));
const HERE_GB153 = path.join(ROOT, 'handoffs', '2026-10-09-grokbot-GB-153');
const outDir = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), 'shots'));

const VIEWS = {
  side: [-1.5, 0.05, 0.05],
  'three-front': [-1.0, 0.35, 1.05],
  top: [-0.05, 1.5, 0.02],
  front: [-0.15, 0.1, 1.5],
  right: [1.5, 0.05, 0.05]
};
const HV = {
  'R-front': ['R', [0.05, 0.08, 0.5]],
  'R-out': ['R', [0.5, 0.06, 0.08]],
  'L-front': ['L', [0.05, 0.08, 0.5]],
  'L-in': ['L', [-0.48, 0.08, 0.15]]
};

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });
let code = 0;
try {
  fs.mkdirSync(outDir, { recursive: true });
  const page = await browser.newPage({ width: 900, height: 900 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
  const ev = (expr, ms = 300000) => page.evaluate(expr, ms);
  const step = (c, ms = 300000) => ev(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${c} })()`, ms);

  const trained = await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now();
    while ((!D || !D.state || !D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
    await wait(2500);
    return !!(D && D.state && D.state().active);`);
  console.log('training active', trained);

  const ready = await step(`const tg = D && D.tg && D.tg();
    if (tg && tg.targets) for (const t of tg.targets) t.pivot.parent.visible = false;
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    const keep = new Set(); for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
    for (const ch of document.body.children) if (!keep.has(ch)) ch.style.setProperty('display', 'none', 'important');
    TT.clearZombies && TT.clearZombies(); TT.setHp(100000); TT.grantAllWeapons();
    const O = tg && tg.origin, y0 = tg && tg.floorY;
    const p = (TT.localPlayer && TT.localPlayer.position) || (TT.player && TT.player.position) || { x: 0, y: 0, z: 0 };
    window.__S = { x: (O && O.x) || p.x, y: y0 || p.y, z: ((O && O.z) || p.z) + 4 };
    return { hasTg: !!tg, S: window.__S };`);
  console.log('ready', JSON.stringify(ready));

  await ev(fs.readFileSync(path.join(HERE_GB153, 'grip-page.js'), 'utf8'));

  const ok = await ev(`(() => {
    const T = TT;
    if (T.setViewFirstDbg) T.setViewFirstDbg(false);
    if (T.setUnarmedDbg) T.setUnarmedDbg(false);
    document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    document.dispatchEvent(new Event('pointermove', { bubbles: true }));
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'revolver'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('revolver')); __step(8); }
    if (T.getCurrentWeapon() !== 'revolver') return { ok: false, w: T.getCurrentWeapon() };
    window.__aimPitch = 0;
    document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    __step(90);
    const gun = T.weaponMeshes.revolver;
    const chain = [];
    for (let x = gun; x; x = x.parent) chain.push({ name: x.name || x.type, vis: !!x.visible });
    const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
    for (let k = 0; k < 30 && !shown(gun); k++) __step(12);
    if (!shown(gun)) {
      for (let x = gun; x; x = x.parent) x.visible = true;
    }
    const H = T.getShoulderDbg().holds.revolver;
    return { ok: shown(gun), weapon: T.getCurrentWeapon(), hold: H, chain, forced: true };
  })()`);
  console.log('equipped', JSON.stringify(ok));
  if (!ok || !ok.ok) throw new Error('could not equip revolver: ' + JSON.stringify(ok));

  const size = await ev(`(() => {
    const T = TT, THREE = T.THREE, gun = T.weaponMeshes.revolver, y0 = -0.07, band = 0.012;
    let xmin = Infinity, xmax = -Infinity, zmin = Infinity, zmax = -Infinity, n = 0;
    const v = new THREE.Vector3();
    gun.updateMatrixWorld(true);
    gun.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      const P = o.geometry.attributes.position;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i);
        o.localToWorld(v);
        gun.worldToLocal(v);
        if (Math.abs(v.y - y0) > band) continue;
        n++;
        xmin = Math.min(xmin, v.x); xmax = Math.max(xmax, v.x);
        zmin = Math.min(zmin, v.z); zmax = Math.max(zmax, v.z);
      }
    });
    return { n, widthMm: +((xmax - xmin) * 1000).toFixed(1), depthMm: +((zmax - zmin) * 1000).toFixed(1),
      xmin: +xmin.toFixed(4), xmax: +xmax.toFixed(4), zmin: +zmin.toFixed(4), zmax: +zmax.toFixed(4) };
  })()`);
  console.log('gripCrossSection', JSON.stringify(size));

  const meas = await ev('window.__gripMeasure()');
  console.log('gripMeasure', JSON.stringify(meas));

  for (const [name, off] of Object.entries(VIEWS)) {
    await ev(`(() => { __gunView(${JSON.stringify(off)}, 28); __step(1); })()`);
    await new Promise((r) => setTimeout(r, 250));
    await page.screenshot(path.join(outDir, 'gun-' + name + '.png'));
  }
  for (const [name, [hs, off]] of Object.entries(HV)) {
    await ev(`(() => { __handView(${JSON.stringify(hs)}, ${JSON.stringify(off)}, 30); __step(1); })()`);
    await new Promise((r) => setTimeout(r, 250));
    await page.screenshot(path.join(outDir, 'hand-' + name + '.png'));
  }

  let fit = null, fitErr = null;
  try {
    await ev(fs.readFileSync(path.join(HERE_GB153, 'fit-page.js'), 'utf8'));
    const hands = [{ name: 'R', role: 'fire', swing: -0.6 }, { name: 'L', role: 'support', swing: -0.45, alsoHand: true }];
    fit = await ev('window.__fitHands("revolver", ' + JSON.stringify(hands) + ')', 300000);
    console.log('fit', JSON.stringify(fit));
  } catch (e) {
    fitErr = String((e && e.stack) || e);
    console.log('fit FAILED', fitErr.split('\n')[0]);
  }

  fs.writeFileSync(path.join(outDir, 'hold.json'), JSON.stringify({ ok, size, meas, fit, fitErr }, null, 2));
  const errs = (page.errors || []).filter((e) => !/contains' on 'Node'/.test(e)).slice(0, 5);
  if (errs.length) console.log('page errors:\n  ' + errs.map((e) => e.split('\n')[0]).join('\n  '));
} catch (e) {
  console.error('FAILED', e && e.stack || e);
  code = 1;
}
await browser.close?.();
server.close?.();
process.exit(code);
