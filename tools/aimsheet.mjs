// tools/aimsheet.mjs — CU-96: the reticle's states on the real renderer, full frame and a close-up round the cursor.
//
//   node tools/aimsheet.mjs [out] [--before]      out: review/aiming
//
// In the Training Ground's build room, a still shambler 7 m from him: the cursor on its head (the ring), on its chest
// (green), on open floor; the shotgun's spread ticks; and the X a round of his flashes on a headshot, held mid-flash.
// --before hides what CU-96 added to the reticle (its ticks, ring and X), which is the reticle as it was: the cross
// itself did not change.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const before = args.includes('--before');
const out = path.resolve(ROOT, args.find((a) => !a.startsWith('--')) || 'review/aiming', before ? 'before' : 'after');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
let failed = false;
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 180000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  const step = (code, ms = 180000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
  const entered = await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
    await wait(3500); const p = document.getElementById('perf'); if (p) p.style.display = 'none';
    ${before ? `const st = document.createElement('style'); st.textContent = '#reticle i { display: none !important; }'; document.head.append(st);` : ''}
    return D.state().active;`, 120000);
  if (!entered) throw new Error('the Training Ground never opened');
  // Him in the build room facing the gate, a still shambler 7 m off; window.__aimAt(point) puts the cursor on a world point.
  await step(`const tg = D.tg(), O = tg.origin, P = T.localPlayer ? T.localPlayer.position : T.player.position;
    P.set(O.x - 17, tg.floorY, O.z - 7); T.setAimYawDbg(0);
    T.clearZombies && T.clearZombies();
    const z = T.spawnZombie(O.x - 17, O.z, 'shambler', true, true); z.trainingZ = true; z.riseT = 0; z.hp = z.maxHp = 1e6; z.speed = z.baseSpeed = 0;
    window.__z = z;
    window.__aimAt = (x, y, zz) => { const v = new T.THREE.Vector3(x, y, zz).project(T.camera), c = T.renderer.domElement, r = c.getBoundingClientRect();
      const cx = r.left + (v.x + 1) / 2 * r.width, cy = r.top + (1 - v.y) / 2 * r.height;
      c.dispatchEvent(new PointerEvent('pointermove', { clientX: cx, clientY: cy, bubbles: true })); window.__cursor = { x: cx, y: cy }; };
    window.__head = () => { const v = new T.THREE.Vector3(); z.mesh.userData.head.getWorldPosition(v); return v; };
    await wait(1500); return true;`);
  const hold = async (code, settle = 900) => { await step(`for (let i = 0; i < 4; i++) { ${code} await wait(${Math.round(settle / 4)}); } return true;`); };
  const shot = async (name) => {
    const c = await page.evaluate('window.__cursor');
    const file = path.join(out, name + '.png');
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot(file);
    fs.writeFileSync(path.join(out, name + '.cursor.json'), JSON.stringify(c));
    console.log('shot', name, 'cursor', Math.round(c.x), Math.round(c.y), await page.evaluate(`document.getElementById('reticle').className`));
  };
  await hold(`const h = __head(); __aimAt(h.x, h.y, h.z);`);
  await shot('1-on-head');
  await hold(`const p = __z.mesh.position; __aimAt(p.x, p.y + __z.hitH * 0.5, p.z);`);
  await shot('2-on-chest');
  await hold(`const p = __z.mesh.position; __aimAt(p.x + 2.2, p.y, p.z - 1.5);`);
  await shot('3-open-floor');
  await step(`if (!T.getWeaponOwned().shotgun) T.grantAllWeapons(); T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun')); await wait(900); return true;`);
  await hold(`const p = __z.mesh.position; __aimAt(p.x, p.y + __z.hitH * 0.5, p.z);`);
  await shot('4-shotgun-spread');
  await step(`T.setWeapon(T.WEAPON_ORDER.indexOf('pistol')); await wait(900); return true;`);
  await hold(`const h = __head(); __aimAt(h.x, h.y, h.z);`);
  const hit = await step(`const M = T.getMuzzleWorld().clone(), d = T.aimTarget.clone().sub(M).normalize();
    T.fireRoundDbg(M.x, M.y, M.z, d.x, d.y, d.z, 20, 90, 0);
    for (let i = 0; i < 20; i++) T.stepProjectilesDbg(0.016);
    const x = document.querySelector('#reticle .rx'), a = x.getAnimations ? x.getAnimations() : [];
    if (a[0]) { a[0].pause(); a[0].currentTime = 70; }
    return { anims: a.length, color: x.style.color };`);
  console.log('headshot mark:', JSON.stringify(hit));
  if (!before && !(hit.anims > 0)) { failed = true; console.log('FAIL: no hit mark on the reticle'); }
  await shot('5-headshot-mark');
  const errs = page.errors || [];
  console.log('page errors:', errs.length);
  if (errs.length) { failed = true; console.log(errs.slice(0, 5).join('\n')); }
} finally {
  await browser.close();
  await srv.close();
}
process.exit(failed ? 1 : 0);
