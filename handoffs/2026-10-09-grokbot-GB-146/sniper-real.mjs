// GB-146 (Grokbot): the sniper's bolt, on the real renderer (headless Chrome + SwiftShader, real three). Based on GB-145's script.
//   node handoffs/2026-10-09-grokbot-GB-146/sniper-real.mjs sniper <outDir>   side views and mid-cycle shots
//   node handoffs/2026-10-09-grokbot-GB-146/sniper-real.mjs t221 <out.txt>    tools/tests/t221.js on the real renderer (arm IK live)
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const { serve } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'serve.mjs').replace(/\\/g, '/')));
const { launch } = await import(new URL('file:///' + path.join(ROOT, 'tools', 'cdp.mjs').replace(/\\/g, '/')));
const [mode = 'sniper', outArg = path.join(HERE, 'after')] = process.argv.slice(2);
const wait = (page, ms) => page.evaluate(`new Promise((r) => setTimeout(r, ${ms}))`);
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
let code = 0;
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`);
  await page.waitFor('!!window.DWOpening', { timeout: 120000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); else { const b = document.getElementById('openingSkip'); if (b) b.click(); } })()`);
    await wait(page, 300);
  }
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('window.TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  console.log('title up:', await page.evaluate('TT.renderer && TT.renderer.constructor ? TT.renderer.constructor.name : "?"'));
  await page.evaluate(`(() => { const n = document.getElementById('playerName'); if (n) n.value = 'Reload'; document.getElementById('modeHunt').click(); })()`);
  await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 120000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  await page.evaluate(`(() => { TT.clearZombies && TT.clearZombies(); TT.setHp(100000); TT.grantAllWeapons(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true })); })()`);
  await wait(page, 1500);
  
  if (mode === 'sniper') {
    fs.mkdirSync(outArg, { recursive: true });
    await page.evaluate(`(async () => { const T = TT; for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'sniper'; i++) T.setWeapon(i); await new Promise((r) => setTimeout(r, 3000)); T.setAmmoDbg('sniper', 5); })()`);
    // Camera off the gun's side (sx 1 = the gun's +x, its left; -1 = its right), level with the gun, looking at the bolt.
    const cam = (sx, near) => `(() => { const p = TT.player.position, y = TT.sampleHeight(p.x, p.z); TT.aimTarget.set(p.x, y + 1.25, p.z + 10);
      const g = TT.weaponMeshes.sniper; g.updateMatrixWorld(true); const b = g.userData.bolt.getWorldPosition(g.position.clone());
      const q = g.getWorldQuaternion(g.quaternion.clone()); const X = g.position.clone().set(1, 0, 0).applyQuaternion(q); const Z = g.position.clone().set(0, 0, 1).applyQuaternion(q);
      const d = ${near ? 0.75 : 2.0};
      TT.setShotView({ x: b.x + X.x * ${sx} * d + Z.x * 0.25 * d, y: b.y + 0.12 * d, z: b.z + X.z * ${sx} * d + Z.z * 0.25 * d, tx: b.x + Z.x * 0.15, ty: b.y, tz: b.z + Z.z * 0.15, fov: ${near ? 35 : 40} }); })()`;
    const settle = (ms) => page.evaluate(`(async () => { const T = TT, p = T.player.position, y = T.sampleHeight(p.x, p.z); const t0 = Date.now(); while (Date.now() - t0 < ${ms}) { T.aimTarget.set(p.x, y + 1.25, p.z + 10); await new Promise((r) => setTimeout(r, 30)); } })()`);
    for (const [name, sx] of [['side-gun-left', 1], ['side-gun-right', -1]]) {
      for (const near of [false, true]) {
        await page.evaluate(cam(sx, near)); await settle(900);
        const f = path.join(outArg, `${name}${near ? '-close' : ''}.png`); await page.screenshot(f); console.log('shot', f);
      }
    }
    // Mid-cycle: one shot, then the cycle held at a beat (the script keeps setting its clock: the shot is real, the hold is
    // the script's) - c 0.30 turned up, 0.45 pulled back, 0.66 pushed forward and still up.
    for (const c of [0.30, 0.45, 0.66]) {
      for (const [name, sx] of [['gun-right', -1], ['gun-left', 1]]) {
        await page.evaluate(`TT.setAmmoDbg('sniper', 5)`); await page.evaluate(cam(sx, true)); await settle(1500);
        const st = await page.evaluate(`(async () => { const g = TT.weaponMeshes.sniper; TT.setMouseFireDbg(true); const t0 = Date.now();
          while (!(g.userData.boltCycle && g.userData.boltCycle.active) && Date.now() - t0 < 5000) await new Promise((r) => setTimeout(r, 5));
          TT.setMouseFireDbg(false); const S = g.userData.boltCycle; if (!S || !S.active) return 'no cycle';
          clearInterval(window.__gb146hold); window.__gb146hold = setInterval(() => { S.t = S.from + ${c} * (S.to - S.from); S.active = true; }, 2);
          await new Promise((r) => setTimeout(r, 1500)); return JSON.stringify({ c: S.c, open: S.open, back: S.back, hand: S.hand }); })()`);
        await settle(300);
        const f = path.join(outArg, `cycle-${String(c).replace('0.', '')}-${name}.png`); await page.screenshot(f);
        console.log('shot', f, st);
        await page.evaluate(`(async () => { clearInterval(window.__gb146hold); await new Promise((r) => setTimeout(r, 1500)); })()`);
      }
    }
  } else if (mode === 't221') {
    const res = await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools', 'tests', 't221.js'), 'utf8'), 1200000);
    console.log(res);
    if (outArg) fs.writeFileSync(outArg, String(res));
  }
  const errs = page.errors.slice(0, 10);
  if (errs.length) { console.log('page errors:\n  ' + errs.map((e) => e.split('\n')[0]).join('\n  ')); }
} catch (e) { console.error('FAILED', e && e.stack || e); code = 1; }
await browser.close?.(); server.close?.();
process.exit(code);
