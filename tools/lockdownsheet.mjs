// tools/lockdownsheet.mjs — CU-82's review sheet, on tools/shoot.mjs's harness: the HQ by day in a match, then the
// same views in the night lockdown (every light on the HQ red). --out <dir>, --show, --list.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIDTH = 1280, HEIGHT = 720;
// The HQ's faces: the west bays (the skull window and the kiosk), the east hatches (the CIF and the Armory),
// the south face (the alarm cabinet), and one from above with the strobes.
const FACES = {
  west: `(() => { const g = TT.house.group.position, h = TT.HQ_HALF || 5; return { x: g.x - h - 9, y: g.y + 3.2, z: g.z + 1.5, tx: g.x - h, ty: g.y + 2.2, tz: g.z + 1.5, fov: 50 }; })()`,
  east: `(() => { const g = TT.house.group.position, h = TT.HQ_HALF || 5, z = (TT.HQ_CIF_FRONT.z + TT.HQ_ARMORY_FRONT.z) / 2; return { x: g.x + h + 7, y: g.y + 2.6, z: g.z + z, tx: g.x + h, ty: g.y + 2.0, tz: g.z + z, fov: 50 }; })()`,
  south: `(() => { const g = TT.house.group.position, h = TT.HQ_HALF || 5; return { x: g.x + 1.5, y: g.y + 3.0, z: g.z - h - 8, tx: g.x + 1.5, ty: g.y + 2.2, tz: g.z - h, fov: 50 }; })()`,
  above: `(() => { const g = TT.house.group.position; return { x: g.x - 14, y: g.y + 13, z: g.z - 14, tx: g.x, ty: g.y + 3, tz: g.z, fov: 50 }; })()`
};
const VIEWS = [];
for (const when of ['day', 'night']) for (const [face, expr] of Object.entries(FACES)) VIEWS.push([when + '-' + face, when, expr]);

const argv = process.argv.slice(2);
if (argv.includes('--list')) { for (const [n] of VIEWS) console.log(n); process.exit(0); }
const show = argv.includes('--show');
const outIdx = argv.indexOf('--out');
const outDir = outIdx >= 0 ? argv[outIdx + 1] : path.join('Claude outputs', 'shots');
fs.mkdirSync(path.join(ROOT, outDir), { recursive: true });

const server = await serve(ROOT, 0);
const browser = await launch({ headless: !show });
const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
try {
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`);
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  if (!await page.waitFor('!!window.TT', { timeout: 300000 })) throw new Error('window.TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  // Into a match, past the insertion, so the HQ is his and the lockdown can come on.
  await page.evaluate(`(() => { const n = document.getElementById('playerName'); if (n) n.value = 'Lockdown'; document.getElementById('modeHunt').click(); })()`);
  await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 60000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 90000 });
  await page.evaluate(`(() => { const c = [...document.querySelectorAll('canvas')].sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0]; const keep = new Set(); for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el); for (const ch of document.body.children) if (!keep.has(ch)) ch.style.setProperty('display', 'none', 'important'); })()`);
  let night = false;
  for (const [name, when, expr] of VIEWS) {
    if (when === 'night' && !night) {
      await page.evaluate('TT.beginWave()');
      await page.evaluate('new Promise(r => setTimeout(r, 4000))');   // the sky goes to night
      night = true;
    }
    await page.evaluate(`TT.setShotView(${expr})`);
    await page.evaluate('new Promise(r => setTimeout(r, 600))');
    const file = path.join(ROOT, outDir, `${name}.png`);
    try { await page.screenshot(file); } catch (e) { await page.screenshot(file); }
    const lock = await page.evaluate('TT.nightLockdown()');
    console.log(`  ${name.padEnd(14)} ${(fs.statSync(file).size / 1024).toFixed(0).padStart(5)} KB  lockdown ${lock}`);
  }
  await page.evaluate('TT.setShotView(null)');
  for (const e of page.errors.slice(0, 3)) console.log('page error: ' + e.split('\n')[0]);
} finally {
  await browser.close();
  await server.close();
}
