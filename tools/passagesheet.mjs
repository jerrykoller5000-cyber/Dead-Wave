// tools/passagesheet.mjs — CU-72's review sheet, on tools/shoot.mjs's harness: a warren's Deep with its passage shut and
// open. Each warren is built high in the sky (as warrensheet.mjs's v3 views do: a camera far below takes the game's
// under-water path and times out headless), its roof on, a lantern's light at each lamp. --out <dir>, --list.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const THEMES = ['root', 'shale', 'iron', 'wet', 'hill'];
const view = (theme, open) => `(() => {
  window.__ps = window.__ps || {};
  let w = window.__ps['${theme}'];
  if (!w) {
    w = window.__ps['${theme}'] = TT.buildWarren('${theme}', { origin: { x: 0, y: 260, z: 0 } }); TT.scene.add(w.group);
    w.mark = TT.markHollowPassage(w);
    for (const l of w.lamps) { const L = new TT.THREE.PointLight(0xffc488, 6, 16, 1.2); L.position.set(l.x, l.y, l.z); TT.scene.add(L); }
    const P = new TT.THREE.PointLight(0xcfe6ff, 5, 12, 1.4); P.position.set(w.exits.deep.x, w.exits.deep.y + 1.5, w.exits.deep.z); P.visible = false; TT.scene.add(P); w.glow = P;
  }
  for (const [k, o] of Object.entries(window.__ps)) o.group.visible = k === '${theme}';
  w.mark.visible = ${open}; w.glow.visible = ${open};
  const d = w.exits.deep, sb = w.points.strongbox;
  // From the chamber, two metres out along the line from the strongbox to the passage, looking at it.
  const dx = d.x - sb.x, dz = d.z - sb.z, l = Math.hypot(dx, dz) || 1;
  return { x: d.x - dx / l * 4.2, y: d.y + 1.6, z: d.z - dz / l * 4.2, tx: d.x, ty: d.y + 1.3, tz: d.z, fov: 62 }; })()`;
const VIEWS = [];
for (const t of THEMES) for (const open of [false, true]) VIEWS.push([`passage-${t}-${open ? 'open' : 'shut'}`, view(t, open)]);

const argv = process.argv.slice(2);
if (argv.includes('--list')) { for (const [n] of VIEWS) console.log(n); process.exit(0); }
const outIdx = argv.indexOf('--out');
const outDir = outIdx >= 0 ? argv[outIdx + 1] : path.join('Claude outputs', 'shots');
const wanted = argv.filter((a, i) => !a.startsWith('--') && !(outIdx >= 0 && i === outIdx + 1));
const views = wanted.length ? VIEWS.filter(([n]) => wanted.includes(n)) : VIEWS;
fs.mkdirSync(path.join(ROOT, outDir), { recursive: true });

const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const page = await browser.newPage({ width: 1280, height: 720 });
try {
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`);
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); else { const b = document.getElementById('openingSkip'); if (b) b.click(); } })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  if (!await page.waitFor('!!window.TT', { timeout: 300000 })) throw new Error('window.TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await page.evaluate('new Promise(r => setTimeout(r, 700))');
  await page.evaluate(`(() => { const c = [...document.querySelectorAll('canvas')].sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0]; const keep = new Set(); for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el); for (const ch of document.body.children) if (!keep.has(ch)) ch.style.setProperty('display', 'none', 'important'); })()`);
  for (const [name, expr] of views) {
    const spec = await page.evaluate(expr);
    await page.evaluate('TT.setWorldTime(0.0)');
    await page.evaluate(`TT.setShotView(${JSON.stringify(spec)})`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    const file = path.join(ROOT, outDir, `${name}.png`);
    try { await page.screenshot(file); } catch (e) { await page.screenshot(file); }
    console.log(`  ${name.padEnd(22)} ${(fs.statSync(file).size / 1024).toFixed(0).padStart(5)} KB`);
  }
  await page.evaluate('TT.setShotView(null)');
  for (const e of page.errors.slice(0, 3)) console.log('page error: ' + e.split('\n')[0]);
} finally { await browser.close(); await server.close(); }
