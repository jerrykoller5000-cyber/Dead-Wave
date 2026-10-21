// GB-152: frame rate on the real renderer with the fingered hands posing every frame, against the same session with the
// hands' pose updates switched off (A/B/A), holding the M4 and swapping the support hand on and off (the pose changing).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { serve } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'serve.mjs').replace(/\\/g, '/')));
const { launch } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'cdp.mjs').replace(/\\/g, '/')));
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
  const step = (c, ms = 180000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${c} })()`, ms);
  await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
    await wait(3500); T.grantAllWeapons(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'm4'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('m4')); await wait(150); } await wait(1500); return true;`, 120000);
  const run = (off) => step(`
    const ud = T.getMarine().userData, rigs = [ud.elbowRG, ud.elbowLG].map((e) => e.userData.wrist.userData.hand).filter(Boolean);
    for (const r of rigs) { if (!r._upd) { r._upd = r.update; r._set = r.set; } r.update = ${off} ? function () { return this; } : r._upd; r.set = ${off} ? function () { return this; } : r._set; }
    // the pose changing all the time: a sine on both hands' curl, as heavy as it gets
    let n = 0; const t0 = performance.now(); let k = 0;
    const tick = () => { n++; k += 0.05; const p = JSON.parse(JSON.stringify(rigs[0].pose)); for (const f of p.f) f[0] = 0.5 + 0.5 * Math.sin(k);
      for (const r of rigs) r.set(p).update(); if (performance.now() - t0 < 8000) requestAnimationFrame(tick); };
    await new Promise((res) => { requestAnimationFrame(tick); setTimeout(res, 8200); });
    return { fps: +(n / 8).toFixed(1), hands: rigs.length };`, 60000);
  const res = [];
  for (const off of [false, true, false, true]) res.push({ hands: off ? 'pose updates off' : 'posing every frame', ...(await run(off)) });
  console.log(JSON.stringify(res));
} finally { await browser.close(); server.close(); }
