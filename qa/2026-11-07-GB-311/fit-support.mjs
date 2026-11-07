// qa/2026-11-07-GB-311/fit-support.mjs — GB-153 fit for shotgun support (+fire) with long CDP timeout
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const GB153 = path.join(ROOT, 'handoffs', '2026-10-09-grokbot-GB-153');
const { serve } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'serve.mjs').replace(/\\/g, '/')));
const { launch } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'cdp.mjs').replace(/\\/g, '/')));
const outDir = path.join(HERE, 'fit');
fs.mkdirSync(outDir, { recursive: true });
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
let code = 0;
try {
  const page = await browser.newPage({ width: 900, height: 900 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) throw new Error('no TT');
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
  await page.evaluate(fs.readFileSync(path.join(GB153, 'grip-page.js'), 'utf8'));
  await page.evaluate(fs.readFileSync(path.join(GB153, 'fit-page.js'), 'utf8'));
  const w = 'shotgun';
  const ok = await page.evaluate(`(() => { const T = TT; for (let i = 0; i < 16 && T.getCurrentWeapon() !== '${w}'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); __step(12); }
    if (T.getCurrentWeapon() !== '${w}') return {ok:false, cur:T.getCurrentWeapon()};
    window.__aimPitch = 0; __step(150);
    const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
    for (let k = 0; k < 40 && !shown(T.weaponMeshes['${w}']); k++) __step(30);
    return {ok: shown(T.weaponMeshes['${w}']), cur:T.getCurrentWeapon()}; })()`, 180000);
  console.log('show', JSON.stringify(ok));
  if (!ok || !ok.ok) throw new Error('could not show shotgun');
  // Support first (the forend refit), then fire (unchanged expected)
  for (const hand of [
    [{ name: 'L', role: 'support', swing: -0.15 }],
    [{ name: 'R', role: 'fire', swing: -0.3 }]
  ]) {
    console.log('fitting', hand[0].role);
    const r = await page.evaluate(`window.__fitHands('${w}', ${JSON.stringify(hand)})`, 600000);
    fs.writeFileSync(path.join(outDir, `fit-${hand[0].role}.json`), JSON.stringify(r, null, 2));
    console.log(hand[0].role, JSON.stringify(r));
  }
  // pumpDy measure
  const meas = await page.evaluate(`(() => {
    const T = TT, THREE = T.THREE, gun = T.weaponMeshes.shotgun, pump = gun.userData.pump;
    gun.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(pump);
    const min = box.min.clone(), max = box.max.clone();
    gun.worldToLocal(min); gun.worldToLocal(max);
    const pumpLocal = pump.position.clone();
    const bottomY = Math.min(min.y, max.y);
    const curPumpDy = -0.015;
    const handY = pumpLocal.y + curPumpDy;
    // palm under forend: channel ~12 mm above bottom for a wrap under a 44 mm tube
    const wantY = bottomY + 0.012;
    return {
      pumpLocal: [+pumpLocal.x.toFixed(4), +pumpLocal.y.toFixed(4), +pumpLocal.z.toFixed(4)],
      bottomY: +bottomY.toFixed(4),
      curPumpDy, handY: +handY.toFixed(4),
      handAboveBottomMm: +((handY - bottomY) * 1000).toFixed(1),
      suggestedPumpDy: +(wantY - pumpLocal.y).toFixed(4)
    };
  })()`, 60000);
  fs.writeFileSync(path.join(outDir, 'pump-measure.json'), JSON.stringify(meas, null, 2));
  console.log('pump', JSON.stringify(meas));
} catch (e) { console.error('FAILED', e && e.stack || e); code = 1; }
await browser.close?.(); server.close?.();
process.exit(code);
