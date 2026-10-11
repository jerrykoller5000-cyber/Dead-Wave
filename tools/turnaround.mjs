// tools/turnaround.mjs - GB-147 (Jerry, 2026-10-09: "get me picture of the Player model and the survivors from every
// angle and then place them in the review folder"). Read-only on the game: it only places things and the camera.
//
//   node tools/turnaround.mjs [out] [model ...]      out: review/player-survivors/v1
//   TA_ANGLES=back,left TA_DIST=2 node tools/turnaround.mjs <out> player-kit   (GB-148: some angles, closer; player-kit
//   is the player with everything granted and the pistol in hand, so every other gun is stowed on him)
//
// Models: player-pistol (the live marine with the run's starting loadout: the pistol), player-rifle (the same with the
// M4 up), okafor, brandt, pike (makeSurvivorFigure, CL-75: the same figures that wait at the camps and live on the HQ
// roof). Each one stands alone on the Training Ground's range (noon held, no weather, trees or wildlife, so every model
// gets the same light), and the camera goes round him: the light stays put and the camera moves, at one distance.
// Ten angles, named from the model's own front and right: front, front-right, right, back-right, back, back-left,
// left, front-left at eye height (1.6 m), top (from above, a little to the front), low-3q (front-right from 0.35 m).
// The HUD (and the page's error card) is out of the frame; a caption says who and which angle.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const out = path.resolve(ROOT, args[0] || 'review/player-survivors/v1');
const only = args.slice(1);
const SIZE = 1000, DIST = +(process.env.TA_DIST || 4.3), FOV = 30, EYE = 1.6, AIM_Y = 0.95;
const ANGLES = [['front', 0], ['front-right', 45], ['right', 90], ['back-right', 135], ['back', 180], ['back-left', 225], ['left', 270], ['front-left', 315]]
  .map(([n, a]) => ({ n, a, y: EYE })).concat([{ n: 'top', a: 0, top: true }, { n: 'low-3q', a: 45, y: 0.35 }])
  .filter((A) => !process.env.TA_ANGLES || process.env.TA_ANGLES.split(',').includes(A.n));   // TA_ANGLES=back,left,... (GB-148)
const MODELS = [
  { id: 'player-pistol', label: 'Player - pistol (starting loadout)', player: 'pistol' },
  { id: 'player-rifle', label: 'Player - M4', player: 'm4' },
  { id: 'player-kit', label: 'Player - full kit, pistol in hand', player: 'pistol', grant: true, extra: true },   // GB-148: every gun stowed on him
  { id: 'okafor', label: 'Cpl. Okafor', who: 'okafor' },
  { id: 'brandt', label: 'Sgt. Brandt', who: 'brandt' },
  { id: 'pike', label: 'Spc. Pike', who: 'pike' }
].filter((m) => (!only.length && !m.extra) || only.includes(m.id));

const srv = await serve(ROOT);
const browser = await launch({ headless: true });
let failed = false;
const shots = [];
try {
  const page = await browser.newPage({ width: SIZE, height: SIZE });
  await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
  const step = (code, ms = 180000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
  const entered = await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
    await wait(3500);
    return D.state().active;`, 120000);
  if (!entered) throw new Error('the Training Ground never opened');
  await step(`const tg = D.tg();
    for (const t of tg.targets) t.pivot.parent.visible = false;
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    const keep = new Set(); for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
    for (const ch of document.body.children) if (!keep.has(ch)) ch.style.setProperty('display', 'none', 'important');
    const cap = document.createElement('div'); cap.id = 'taCaption';
    cap.style.cssText = 'position:fixed;left:18px;top:14px;z-index:99999;padding:6px 12px;background:#0b0f0ccc;border-top:3px solid #f2c418;color:#f4ecd0;font:600 22px/1.25 Impact,"Arial Black",sans-serif;letter-spacing:.06em;text-transform:uppercase;pointer-events:none';
    document.body.append(cap);
    T.clearZombies && T.clearZombies(); T.setHp && T.setHp(100000);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));   // busy: no idle fidget
    return true;`);
  for (const M of MODELS) {
    const dir = path.join(out, M.id); fs.mkdirSync(dir, { recursive: true });
    // Stand the model on the spot. The player: the live marine, faced down the range (+z) by his aim, the gun drawn.
    // A survivor: a fresh figure, turned to +z; the marine parked behind the camera for each shot.
    const setup = await step(`const tg = D.tg(), O = tg.origin, THREE = T.THREE, M = ${JSON.stringify(M)};
      const spot = { x: O.x, z: O.z + 4 }, y0 = tg.floorY;
      const p = T.localPlayer ? T.localPlayer.position : T.player.position;
      window.__taSpot = { x: spot.x, y: y0, z: spot.z };
      clearInterval(window.__taPin);
      if (M.player) {
        p.set(spot.x, y0, spot.z);
        window.__taPin = setInterval(() => { p.x = spot.x; p.z = spot.z; T.aimTarget.set(spot.x, y0 + 1.25, spot.z + 30); }, 5);
        // The starting loadout as the Training Ground hands it over; any other gun is granted first (and then he carries the
        // rest slung, as a player who owns them does).
        if ((M.player !== 'pistol' || M.grant) && T.grantAllWeapons) T.grantAllWeapons();
        if (T.isUnarmed && T.isUnarmed() && T.takeOutGun) T.takeOutGun();
        for (let i = 0; i < 16 && T.getCurrentWeapon() !== M.player; i++) T.setWeapon(T.WEAPON_ORDER.indexOf(M.player));
        await wait(3500);
        return { weapon: T.getCurrentWeapon(), unarmed: T.isUnarmed ? T.isUnarmed() : null };
      }
      const f = T.makeSurvivorFigure(M.who);
      f.position.set(spot.x, y0, spot.z); f.rotation.set(0, 0, 0); T.scene.add(f); f.updateMatrixWorld(true);
      window.__taFig = f;
      await wait(600);
      return { figure: true };`);
    console.log(M.id, JSON.stringify(setup));
    if (M.player && setup.weapon !== M.player) { console.log('FAIL', M.id, 'could not take', M.player); failed = true; }
    for (const A of ANGLES) {
      await step(`const S = window.__taSpot, A = ${JSON.stringify(A)}, M = ${JSON.stringify(M)};
        const th = A.a * Math.PI / 180;
        // His right is -x when he faces +z: front-right puts the camera at (-sin, cos).
        const dx = -Math.sin(th), dz = Math.cos(th);
        const v = A.top ? { x: S.x, y: S.y + 4.5, z: S.z + 0.3, tx: S.x, ty: S.y + 0.9, tz: S.z, fov: ${FOV} }
          : { x: S.x + dx * ${DIST}, y: S.y + A.y, z: S.z + dz * ${DIST}, tx: S.x, ty: S.y + (A.y < 1 ? 1.0 : ${AIM_Y}), tz: S.z, fov: ${FOV} };
        T.setShotView(v);
        if (!M.player) {
          const p = T.localPlayer ? T.localPlayer.position : T.player.position;
          clearInterval(window.__taPin);
          const px = S.x + dx * ${DIST + 4}, pz = S.z + (A.top ? 1 : dz) * ${DIST + 4};
          window.__taPin = setInterval(() => { p.x = px; p.z = pz; }, 5);
        }
        document.getElementById('taCaption').textContent = ${JSON.stringify(M.label)} + '  -  ' + A.n;
        await wait(1100);
        return true;`);
      const file = path.join(dir, `${A.n}.png`);
      try { await page.screenshot(file); } catch (e) { console.log('  retry', e.message); await page.screenshot(file); }
      shots.push(path.relative(out, file).replace(/\\/g, '/'));
      console.log('shot', M.id, A.n);
    }
    await step(`clearInterval(window.__taPin); const f = window.__taFig; if (f && f.parent) f.parent.remove(f); window.__taFig = null; return true;`);
  }
  await page.evaluate('TT.setShotView(null)');
  const errs = page.errors || [];
  console.log('page errors:', errs.length);
  if (errs.length) console.log(errs.slice(0, 5).map((e) => '  ' + e.split('\n')[0]).join('\n'));
} finally {
  await browser.close();
  await srv.close();
}
console.log(`${shots.length} shots in ${out}`);
process.exit(failed ? 1 : 0);
