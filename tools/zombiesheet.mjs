// tools/zombiesheet.mjs — CU-95 (Jerry): one picture of every zombie type, on the real renderer.
//
//   node tools/zombiesheet.mjs [out] [type ...]      out: review/zombie-types
//
// Loads the game, goes into the Training Ground (noon held, no weather, trees or wildlife: every type gets the same
// light) and, one type at a time from ZOMBIE_TYPES: spawns it, lets it move for a moment so it is in a living pose,
// takes it out of the zombie list (nothing updates it after that, so it holds still), stands it on the range turned a
// little off the camera, and frames it by its own bounding box, so a colossus fits as well as a shambler. The HUD is
// taken out of the frame and the type's name put in a corner. One PNG per type: <out>/<NN>-<type>.png.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const out = path.resolve(ROOT, args[0] || 'review/zombie-types');
const only = args.slice(1);
fs.mkdirSync(out, { recursive: true });
const SIZE = 1000;
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
let failed = false;
try {
  const page = await browser.newPage({ width: SIZE, height: SIZE });
  await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 180000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  const step = (code, ms = 180000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
  const entered = await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
    await wait(3500);   // the first seconds sweep out anything that wasn't called in here
    return D.state().active;`, 120000);
  if (!entered) throw new Error('the Training Ground never opened');
  // The range clear for the pictures: the targets put away, the HUD out of the frame (every child of <body> but the
  // renderer's), and a caption of our own.
  await step(`const tg = D.tg();
    for (const t of tg.targets) t.pivot.parent.visible = false;
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    const keep = new Set(); for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
    for (const ch of document.body.children) if (!keep.has(ch)) ch.style.setProperty('display', 'none', 'important');
    const cap = document.createElement('div'); cap.id = 'zsCaption';
    cap.style.cssText = 'position:fixed;left:18px;top:14px;z-index:99999;padding:6px 12px;background:#0b0f0ccc;border-top:3px solid #f2c418;color:#f4ecd0;font:600 22px/1.25 Impact,"Arial Black",sans-serif;letter-spacing:.06em;text-transform:uppercase;pointer-events:none';
    document.body.append(cap);
    T.clearZombies && T.clearZombies();
    return true;`);
  const types = await step(`return Object.keys(T.ZOMBIE_TYPES).filter((k) => T.ZOMBIE_TYPES[k] && T.ZOMBIE_TYPES[k].name);`);
  const list = only.length ? types.filter((t) => only.includes(t)) : types;
  console.log('types:', list.join(' '));
  for (const type of list) {
    const n = String(types.indexOf(type) + 1).padStart(2, '0');
    const r = await step(`const tg = D.tg(), O = tg.origin, THREE = T.THREE, type = ${JSON.stringify(type)};
      const def = T.ZOMBIE_TYPES[type];
      // Spawned in the build room (the room keeps them there), moving for a moment, then out of the list: a statue.
      const p = T.localPlayer ? T.localPlayer.position : T.player.position;
      p.set(O.x + 4, tg.floorY, O.z + 3);
      const z = T.spawnZombie(O.x - 17, O.z - 2, type, true, true);
      if (!z || !z.mesh) return { type, error: 'did not spawn' };
      z.trainingZ = true;   // as if called in at the HQ panel: the room's first-seconds sweep leaves it alone
      await wait(900);
      const i = T.zombies.indexOf(z); if (i >= 0) T.zombies.splice(i, 1);
      const m = z.mesh;
      if (!m.parent) T.scene.add(m);
      const dy = m.position.y - tg.floorY;
      // On the range, the camera on its downrange side looking back (the sun is a little downrange, so his face is lit),
      // the body turned 25 degrees off the camera so the shape reads.
      const spot = { x: O.x, z: O.z + 4 };
      m.position.set(spot.x, tg.floorY + Math.max(0, dy), spot.z);
      const toCam = { x: 0, z: 1 };
      m.rotation.set(0, Math.atan2(toCam.x, toCam.z) - 0.44, 0);
      m.visible = true;
      m.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      const fov = 30, el = 0.3;
      const fit = Math.max(size.y, Math.hypot(size.x, size.z) * 0.85, 0.6);
      const dist = (fit * 0.5) / Math.tan((fov * Math.PI / 180) / 2) * 1.32 + Math.hypot(size.x, size.z) * 0.35;
      T.setShotView({ x: c.x + toCam.x * dist * Math.cos(el), y: c.y + dist * Math.sin(el), z: c.z + toCam.z * dist * Math.cos(el), tx: c.x, ty: c.y, tz: c.z, fov });
      p.set(O.x + 2, tg.floorY, Math.min(O.z + 28.5, c.z + dist + 2));   // behind the camera: hiding him doesn't hold, the frame loop shows him again
      document.getElementById('zsCaption').textContent = def.name;
      await wait(900);
      window.__zsMesh = m;
      return { type, name: def.name, size: [size.x, size.y, size.z].map((v) => +v.toFixed(2)), dist: +dist.toFixed(1) };`);
    if (r.error) { failed = true; console.log('FAIL', type, r.error); continue; }
    await page.screenshot(path.join(out, `${n}-${type}.png`));
    console.log('shot', `${n}-${type}`, r.name, 'size', r.size.join('x'), 'm, camera', r.dist, 'm');
    await step(`const m = window.__zsMesh; if (m && m.parent) m.parent.remove(m); window.__zsMesh = null; return true;`);
  }
  const errs = page.errors || [];
  console.log('page errors:', errs.length);
  if (errs.length) { failed = true; console.log(errs.slice(0, 5).join('\n')); }
} finally {
  await browser.close();
  await srv.close();
}
process.exit(failed ? 1 : 0);
