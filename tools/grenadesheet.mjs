// tools/grenadesheet.mjs — CU-97: the grenade's throw and its arc on the real renderer.
//
//   node tools/grenadesheet.mjs [out]      out: review/grenade/v1
//
// In the Training Ground (flat, noon), the M4 in hand so the support hand leaving the gun shows: the throw held at each
// beat (holdGrenadeAnim) from his off-hand side, front three-quarter and from behind; then a real hold's arc at a short
// and the full charge, and the launcher's dotted arc (the mortar's style, which the grenade's used to be) to compare.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = path.resolve(ROOT, process.argv[2] || 'review/grenade/v1');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
let failed = false;
try {
  const page = await browser.newPage({ width: 1000, height: 1000 });
  await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 180000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  const step = (code, ms = 180000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
  const entered = await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
    await wait(3500);
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    const keep = new Set(); for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
    for (const ch of document.body.children) if (!keep.has(ch)) ch.style.setProperty('display', 'none', 'important');
    const cap = document.createElement('div'); cap.id = 'gsCap';
    cap.style.cssText = 'position:fixed;left:16px;top:12px;z-index:99999;padding:5px 11px;background:#0b0f0ccc;border-top:3px solid #f2c418;color:#f4ecd0;font:600 20px/1.25 Impact,"Arial Black",sans-serif;letter-spacing:.05em;text-transform:uppercase';
    document.body.append(cap);
    T.grantAllWeapons(); T.setWeapon(T.WEAPON_ORDER.indexOf('m4')); T.setGrenadesDbg(4);
    const tg = D.tg(), P = T.localPlayer ? T.localPlayer.position : T.player.position;
    P.set(tg.spawn.x, tg.floorY, tg.spawn.z + 6); T.setAimYawDbg(0);
    const cv = T.renderer.domElement, r = cv.getBoundingClientRect();
    cv.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.28, bubbles: true }));
    await wait(1500); return D.state().active;`, 120000);
  if (!entered) throw new Error('the Training Ground never opened');
  const shot = async (name, caption) => {
    await step(`document.getElementById('gsCap').textContent = ${JSON.stringify(caption)}; await wait(450); return true;`);
    await page.screenshot(path.join(out, name + '.png'));
    console.log('shot', name);
  };
  // Close views of him, facing downrange (+z) with the cursor taken off the canvas so the moved camera doesn't turn him:
  // from his off-hand side and in front (side), and from behind that shoulder (back).
  await step(`T.renderer.domElement.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true })); T.setAimYawDbg(0); await wait(300); return true;`);
  const views = {
    side: `const P = T.localPlayer ? T.localPlayer.position : T.player.position; T.setShotView({ x: P.x - 2.4, y: P.y + 1.35, z: P.z + 0.15, tx: P.x, ty: P.y + 1.12, tz: P.z + 0.1, fov: 38 });`,
    back: `const P = T.localPlayer ? T.localPlayer.position : T.player.position; T.setShotView({ x: P.x - 1.3, y: P.y + 1.75, z: P.z - 1.55, tx: P.x - 0.1, ty: P.y + 1.15, tz: P.z + 0.15, fov: 40 });`
  };
  const beats = [
    ['0-rest', '', 0, 'At rest: both hands on the gun'],
    ['1-reach', 'grab', 0.07, 'Grab: the off hand reaches to the pouch'],
    ['2-out', 'grab', 0.15, 'Grab: one out of the pouch'],
    ['3-raise', 'raise', 0.06, 'Wind-up: up in front of the shoulder'],
    ['4-raise', 'raise', 0.11, 'Wind-up: drawing it back'],
    ['5-cocked', 'cocked', 0, 'Wind-up: held behind his head (G held)'],
    ['6-whip', 'throw', 0.045, 'Throw: the arm comes over'],
    ['7-release', 'throw', 0.085, 'Throw: it leaves his hand'],
    ['8-follow', 'throw', 0.17, 'Follow-through'],
    ['9-back', 'back', 0.1, 'Back to the gun']
  ];
  // Where his hand really is at each beat (the real renderer's maths: the test build's IK can't be trusted), in his
  // facing frame: up from his feet, forward, out to his off side; and how far from the point the grenade leaves.
  const hand = `const P = T.localPlayer ? T.localPlayer.position : T.player.position, h = T.getMarine().userData.gripL.getWorldPosition(new T.THREE.Vector3()), y = T.player.rotation.y, s = Math.sin(y), c = Math.cos(y), dx = h.x - P.x, dz = h.z - P.z, r = T.grenadeAnimDbg().release;
    return { up: h.y - P.y, fwd: dx * s + dz * c, off: -(dx * c - dz * s), rel: h.distanceTo(r), inHand: T.grenadeAnimDbg().hand.visible };`;
  const at = {};
  for (const [vk, vcode] of Object.entries(views)) {
    for (const [name, phase, t, caption] of beats) {
      await step(`${vcode} T.holdGrenadeAnim(${phase ? JSON.stringify(phase) : 'null'}, ${t}); await wait(350); return true;`);
      if (vk === 'side') at[name] = await step(hand);
      await shot(`${vk}-${name}`, caption);
    }
  }
  const f2 = (v) => v.toFixed(2), say = (o) => `up ${f2(o.up)} fwd ${f2(o.fwd)} out ${f2(o.off)}`;
  const check = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) failed = true; };
  check(at['2-out'].up < at['0-rest'].up - 0.1 && at['2-out'].up < 1.05 && at['2-out'].inHand, 'the grab: off the gun down to the pouch, one in hand (' + say(at['0-rest']) + ' -> ' + say(at['2-out']) + ')');
  check(at['3-raise'].fwd > 0.1 && at['3-raise'].off > 0.1, 'on the way up: out in front of his shoulder (' + say(at['3-raise']) + ')');
  check(at['5-cocked'].up > 1.3 && at['5-cocked'].fwd < 0.05 && at['5-cocked'].off > 0.05, 'the wind-up: behind his head on his off side (' + say(at['5-cocked']) + ')');
  check(at['7-release'].rel < 0.2, 'the release: his hand where the grenade leaves (' + f2(at['7-release'].rel) + ' m from it)');
  check(at['8-follow'].up < at['7-release'].up - 0.25 && at['8-follow'].fwd > 0.2 && !at['8-follow'].inHand, 'the follow-through: down across his front, empty (' + say(at['8-follow']) + ')');
  fs.writeFileSync(path.join(out, 'hand.json'), JSON.stringify(at, null, 1));
  // Aim off to his left, so the play camera sees the arc's curve from the side.
  await step(`T.holdGrenadeAnim(null); T.setShotView(null); await wait(600);
    const cv = T.renderer.domElement, r = cv.getBoundingClientRect();
    cv.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + r.width * 0.3, clientY: r.top + r.height * 0.3, bubbles: true }));
    await wait(800); return true;`);
  // The arc on a real hold, from the play camera.
  await step(`T.setGrenadesDbg(4); if (!T.startGrenadeCharge()) return false; await wait(350); return true;`);
  await shot('arc-short', 'Grenade arc: a short hold');
  await step(`const t0 = Date.now(); while (T.grenadeArcDbg().t < T.GRENADE_THROW.FULL_S && Date.now() - t0 < 4000) await wait(50); await wait(200); return T.grenadeArcDbg().t;`);
  await shot('arc-full', 'Grenade arc: full at 1.6 s');
  const thrown = await step(`const n = T.grenadeArcDbg().n; T.releaseGrenadeCharge(); const t0 = Date.now(); while (T.grenadeArcDbg().n === n && Date.now() - t0 < 2000) await wait(10); return { ms: Date.now() - t0, left: T.grenadeArcDbg().n };`);
  console.log('thrown after', thrown.ms, 'ms;', thrown.left, 'left');
  await step(`await wait(2200); T.setWeapon(T.WEAPON_ORDER.indexOf('launcher')); await wait(1200); return true;`);
  await shot('launcher-arc', 'Launcher arc (the mortar style) for comparison');
  const errs = page.errors || [];
  console.log('page errors:', errs.length);
  if (errs.length) { failed = true; console.log(errs.slice(0, 5).join('\n')); }
} finally {
  await browser.close();
  await srv.close();
}
process.exit(failed ? 1 : 0);
