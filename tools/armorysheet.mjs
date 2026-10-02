// tools/armorysheet.mjs — CL-113: review shots of the Armory (the menu, the wheel, the HQ hatch's rack).
//
//   node tools/armorysheet.mjs [out]      out: review/armory/v2 (CL-114 adds the camo workbench and the new-gun card)
//
// Loads the game the way the tests do (index.html, the real renderer), starts a match, gives him every gun and a few
// attachments (fitted at the workbench), and shoots: the Armory window, its workbench on the AK, the weapon wheel,
// and the rack in the HQ's Armory hatch.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = path.resolve(ROOT, process.argv[2] || 'review/armory/v2');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 1440, height: 900 });
  await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 120000 });
  await page.waitFor('!!window.TT', { timeout: 120000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 30000 });
  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));
  const step = async (code, ms = 120000) => { console.log('step', code.slice(0, 50).replace(/\s+/g, ' ')); return page.evaluate(`(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms); };
  await step(`await startMatch(T, 'Armory'); const w0 = Date.now(); while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.addCash(1e6); T.grantAllWeapons();
    for (const [f, w] of [['buySuppressor', 'm4'], ['buyExtMag', 'ak'], ['buyHeavyBarrel', 'm4'], ['buySuppressor', 'sniper'], ['buyExtMag', 'uzi'], ['buySuppressor', 'pistol'], ['buyExtMag', 'minigun']]) T[f](w);
    T.buyPistolAuto && T.buyPistolAuto();
    const A = T.armoryDbg; A.fit('m4', 'suppressor', true); A.fit('m4', 'heavy', true); A.fit('ak', 'ext', true); A.fit('sniper', 'suppressor', true); A.fit('uzi', 'ext', true); A.fit('pistol', 'suppressor', true);
    return true;`, 600000);
  const shot = async (name) => { await new Promise((r) => setTimeout(r, 400)); await page.screenshot(path.join(out, name + '.png')); console.log('shot', name); };
  // The Armory window, alone, as from its hatch.
  await step(`T.openCIF(); document.getElementById('cif').classList.add('armory-only'); document.getElementById('armoryOpen').click();
    const p = document.getElementById('armoryPanel'); const t0 = Date.now();
    while (p.querySelectorAll('.armory-pic.real img').length < 8 && Date.now() - t0 < 30000) await wait(200);
    return p.querySelectorAll('.armory-pic.real img').length;`, 60000);
  await shot('armory-window');
  await step(`T.armoryDbg.ui().bench('ak'); await wait(600); return true;`);
  await shot('armory-workbench-ak');
  await step(`T.armoryDbg.ui().bench('m4'); await wait(600); document.querySelector('#armoryPanel .armory-shelf').scrollIntoView(); return true;`);
  await shot('armory-workbench-m4');
  await step(`document.querySelector('#armoryPanel .armory-actions button:last-child').click(); T.closeCIF(); await wait(300);
    T.openWheel('weapon'); window.dispatchEvent(new PointerEvent('pointermove', { clientX: innerWidth / 2 + 160, clientY: innerHeight / 2 - 40, bubbles: true })); return T.getWheelState().keys;`);
  await shot('wheel');
  await step(`window.dispatchEvent(new PointerEvent('pointermove', { clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true })); return true;`);
  await shot('wheel-unarmed');
  await step(`T.closeWheelDbg(); T.armoryDbg.refreshRack();
    const r = T.house.armoryRack; r.visible = true; r.updateMatrixWorld(true);
    const p = new T.THREE.Vector3(0, 1.62, 0.1); r.parent.localToWorld(p);
    const f = new T.THREE.Vector3(0, 1.62, 1.9); r.parent.localToWorld(f);
    T.setShotView ? T.setShotView({ x: f.x, y: f.y, z: f.z, tx: p.x, ty: p.y, tz: p.z, fov: 50 }) : null;
    await wait(800); return T.armoryDbg.rack();`);
  await shot('hq-rack');
  // CL-114: the gun's camo at the workbench, and the night's new-gun card.
  await step(`T.openCIF(); document.getElementById('cif').classList.add('armory-only'); document.getElementById('armoryOpen').click();
    const free = T.armoryFinishDbg.list('m4').list.find((f) => !f.locked && f.key); if (free) T.armoryFinishDbg.paint('m4', free.key);
    T.armoryDbg.ui().bench('m4'); await wait(400);
    const p = document.getElementById('armoryPanel'); const t0 = Date.now();
    while (!p.querySelector('.armory-bench .armory-pic.real img') && Date.now() - t0 < 30000) await wait(200);
    p.querySelector('.armory-finish').scrollIntoView({ block: 'center' }); await wait(400); return free && free.key;`, 60000);
  await shot('armory-finish');
  await step(`document.querySelector('#armoryPanel .armory-actions button:last-child').click(); T.closeCIF(); await wait(300);
    T.stockNoticeDbg.show(['uzi', 'shotgun']); await wait(600); return T.stockNoticeDbg.state();`);
  await shot('stock-notice');
} finally {
  await browser.close();
  await srv.close();
}
