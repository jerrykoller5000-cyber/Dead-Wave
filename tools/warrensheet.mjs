// tools/warrensheet.mjs — the warrens' review sheet (CL-99, docs/specs/hollows.md §3), on tools/shoot.mjs's harness
// (the same flags: --list, --out <dir>, --show). Each warren is built where the runtime puts it (far below the
// island) with its roof off, and shot from above, then from inside its first chamber and its Deep.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIDTH = 1280, HEIGHT = 720;
const THEMES = ['root', 'shale', 'iron', 'wet', 'hill'];
const STAGE = (theme) => `(() => {
  const T = TT;
  window.__warrens = window.__warrens || {};
  for (const w of Object.values(window.__warrens)) w.group.visible = false;
  let w = window.__warrens['${theme}'];
  if (!w) { w = window.__warrens['${theme}'] = T.buildWarren('${theme}'); T.scene.add(w.group); }
  w.group.visible = true;
  // Only the warren is drawn (as the runtime does below): the island above is hidden while the sheet runs.
  for (const c of T.scene.children) if (!c.isLight && c !== w.group && !Object.values(window.__warrens).some((x) => x.group === c)) { if (c.visible) { c.userData.__wsHid = true; c.visible = false; } }
  return w;
})()`;
const top = (theme) => `(() => { const w = ${STAGE(theme)}; w.group.traverse((o) => { if (o.userData.roof) o.visible = false; });
  const xs = w.cells.map((c) => c.i), zs = w.cells.map((c) => c.j), C = TT.HOLLOW.CELL, o = w.group.position;
  const cx = o.x + (Math.min(...xs) + Math.max(...xs) + 1) * C / 2, cz = o.z + (Math.min(...zs) + Math.max(...zs) + 1) * C / 2;
  const span = Math.max(Math.max(...xs) - Math.min(...xs) + 1, Math.max(...zs) - Math.min(...zs) + 1) * C;
  return { x: cx, y: o.y + span * 1.05, z: cz + span * 0.35, tx: cx, ty: o.y - 4, tz: cz, fov: 50 }; })()`;
const inside = (theme, where) => `(() => { const w = ${STAGE(theme)}; w.group.traverse((o) => { if (o.userData.roof) o.visible = true; });
  const C = TT.HOLLOW.CELL, o = w.group.position, p = w.plan;
  const c = ${where === 'deep' ? `p.cells[p.deep[0]]` : `p.cells[p.chambers[0]]`};
  const t = ${where === 'deep' ? `w.points.set` : `{ x: o.x + c.i * C + C / 2, y: w.groundAt(o.x + c.i * C + C / 2, o.z + c.j * C + C / 2), z: o.z + c.j * C + C / 2 }`};
  const e = ${where === 'deep' ? `w.points.strongbox` : `w.entry`};
  const dx = t.x - e.x, dz = t.z - e.z, l = Math.hypot(dx, dz) || 1;
  const cam = ${where === 'deep' ? `{ x: t.x - dx / l * 4.5, z: t.z - dz / l * 4.5 }` : `{ x: t.x - dx / l * 5, z: t.z - dz / l * 5 }`};
  const gy = w.groundAt(cam.x, cam.z) ?? t.y;
  return { x: cam.x, y: gy + 1.7, z: cam.z, tx: t.x, ty: t.y + 1.2, tz: t.z, fov: 70 }; })()`;
const VIEWS = [];
for (const t of THEMES) VIEWS.push(['warren-' + t, top(t)]);
// The views from inside wait for the runtime (CU-71): headless, a camera this far down renders the game's under-water
// path and the screenshot times out. `--inside` asks for them anyway.
if (process.argv.includes('--inside')) {
  for (const t of THEMES) VIEWS.push(['warren-' + t + '-deep', inside(t, 'deep')]);
  VIEWS.push(['warren-iron-galleries', inside('iron', 'galleries')]);
}

// CL-99 v3: the warren built high in the sky instead (the camera far below takes the game's under-water path and times
// out headless), its roof on, and shot from inside: the husks over the first chamber, FOB Threshold's crates, and the
// iron warren's cut wall and the hikers' rope.
const HIGH = (theme) => `(() => {
  window.__warrensHigh = window.__warrensHigh || {};
  let w = window.__warrensHigh['${theme}'];
  if (!w) { w = window.__warrensHigh['${theme}'] = TT.buildWarren('${theme}', { origin: { x: 0, y: 260, z: 0 } }); TT.scene.add(w.group); }
  // A lantern's worth of warm light at each of its lamps, for the sheet only (the runtime lends effect lights).
  if (!w.__lit) { w.__lit = true; for (const l of w.lamps) { const L = new TT.THREE.PointLight(0xffc488, 6, 16, 1.2); L.position.set(l.x, l.y, l.z); w.group.parent.add(L); } }
  return w; })()`;
const v3 = (theme, what) => `(() => { const w = ${HIGH(theme)}, C = TT.HOLLOW.CELL, o = w.group.position, p = w.plan;
  if ('${what}' === 'breach') {
    const r = p.cells[p.ramps[0]], D = [[0, -1], [1, 0], [0, 1], [-1, 0]][r.rampSide];
    const cx = o.x + r.i * C + C / 2, cz = o.z + r.j * C + C / 2, top = o.y + w.groundAt(cx - D[0] * 2.6, cz - D[1] * 2.6) - o.y;
    const ex = cx - D[0] * 5.5, ez = cz - D[1] * 5.5;
    return { x: ex, y: (w.groundAt(ex, ez) ?? top) + 1.6, z: ez, tx: cx, ty: top + 1.0, tz: cz, fov: 70 };
  }
  const c = p.cells[p.chambers[0]], x = o.x + c.i * C + C / 2, z = o.z + c.j * C + C / 2, y = w.groundAt(x, z);
  const e = w.entry, dx = x - e.x, dz = z - e.z, l = Math.hypot(dx, dz) || 1;
  const cam = { x: x - dx / l * 2.6, z: z - dz / l * 2.6 };
  return { x: cam.x, y: (w.groundAt(cam.x, cam.z) ?? y) + 1.6, z: cam.z, tx: x, ty: y + ${what === 'up' ? 4.2 : 0.6}, tz: z, fov: 75 }; })()`;
if (process.argv.includes('--v3')) {
  VIEWS.length = 0;
  for (const t of THEMES) VIEWS.push(['v3-' + t + '-chamber', v3(t, 'up')]);
  VIEWS.push(['v3-root-crates', v3('root', 'floor')]);
  VIEWS.push(['v3-iron-breach', v3('iron', 'breach')]);
}

const argv = process.argv.slice(2);
if (argv.includes('--list')) {
  for (const [name] of VIEWS) console.log(name);
  process.exit(0);
}

// --compare <dirA> <dirB>: how different are two sets of shots?
//
// A byte or hash comparison is useless here: the world animates (wind in the canopies, water,
// wildlife, drifting cloud), so two runs of the same build differ by a few hundred bytes out
// of 900 KB and never match exactly. What matters is whether a change moved the *picture*, so
// this measures mean and worst-case pixel difference. Done in the browser because that is the
// only PNG decoder available without adding a dependency.
if (argv.includes('--compare')) {
  const ci = argv.indexOf('--compare');
  const dirA = argv[ci + 1], dirB = argv[ci + 2];
  if (!dirA || !dirB) { console.error('usage: --compare <dirA> <dirB>'); process.exit(2); }
  const listA = new Set(fs.readdirSync(path.join(ROOT, dirA)).filter((f) => f.endsWith('.png')));
  const names = fs.readdirSync(path.join(ROOT, dirB)).filter((f) => f.endsWith('.png') && listA.has(f));
  if (!names.length) { console.error('no shots in common between those folders'); process.exit(2); }
  const srv = await serve(ROOT, 0);
  const br = await launch({ headless: true });
  const pg = await br.newPage({ width: 200, height: 200 });
  await pg.goto(`${srv.origin}/tools/blank.html`, { waitUntil: 'none' });
  await pg.evaluate('document.title = "compare"');
  let worst = 0;
  console.log(`comparing ${names.length} view(s): ${dirA} → ${dirB}\n`);
  console.log('view                   mean%   max%  verdict');
  for (const n of names) {
    const res = await pg.evaluate(`(async () => {
      const load = (u) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u; });
      const [a, b] = await Promise.all([load(${JSON.stringify('/' + dirA + '/' + n)}), load(${JSON.stringify('/' + dirB + '/' + n)})]);
      if (a.width !== b.width || a.height !== b.height) return { sizeMismatch: true };
      const c = document.createElement('canvas'); c.width = a.width; c.height = a.height;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(a, 0, 0); const pa = x.getImageData(0, 0, c.width, c.height).data;
      x.clearRect(0, 0, c.width, c.height);
      x.drawImage(b, 0, 0); const pb = x.getImageData(0, 0, c.width, c.height).data;
      let sum = 0, max = 0, n2 = 0;
      for (let i = 0; i < pa.length; i += 4) {
        const d = (Math.abs(pa[i] - pb[i]) + Math.abs(pa[i+1] - pb[i+1]) + Math.abs(pa[i+2] - pb[i+2])) / 3;
        sum += d; if (d > max) max = d; n2++;
      }
      return { mean: sum / n2 / 255 * 100, max: max / 255 * 100 };
    })()`);
    if (res.sizeMismatch) { console.log(`${n.replace('.png','').padEnd(22)}   —      —    DIFFERENT SIZE`); worst = 100; continue; }
    worst = Math.max(worst, res.mean);
    const verdict = res.mean < 0.5 ? 'same (animation noise)' : res.mean < 3 ? 'CHANGED slightly' : 'CHANGED';
    console.log(`${n.replace('.png','').padEnd(22)} ${res.mean.toFixed(2).padStart(6)} ${res.max.toFixed(1).padStart(6)}  ${verdict}`);
  }
  await br.close(); await srv.close();
  console.log(`\nworst mean difference: ${worst.toFixed(2)}%`);
  console.log('Under ~0.5% is the noise floor for this game: wind, water and wildlife move between runs.');
  process.exit(worst >= 3 ? 1 : 0);
}
const show = argv.includes('--show');
const outIdx = argv.indexOf('--out');
const outDir = outIdx >= 0 ? argv[outIdx + 1] : path.join('Claude outputs', 'shots');
const wanted = argv.filter((a, i) => !a.startsWith('--') && !(outIdx >= 0 && i === outIdx + 1));
const views = wanted.length ? VIEWS.filter(([n]) => wanted.includes(n)) : VIEWS;
if (!views.length) {
  console.error('No views matched. Try --list.');
  process.exit(2);
}

const server = await serve(ROOT, 0);
const browser = await launch({ headless: !show });
const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
const failures = [];
try {
  // raf=timer keeps the frame loop running even when the window is not in front, and
  // renderer=webgl is the fallback path: headless Chrome has no WebGPU adapter.
  const url = `${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`;
  console.log(`shoot: ${browser.exe}\nshoot: ${url}`);
  const t0 = Date.now();
  await page.goto(url);
  // Get out of the opening: it covers the canvas with a title card, and a shot taken behind
  // it is a photograph of a black overlay. Two clicks on its skip button take it from the
  // video to the intro sting to the loading bar; from there it hands over on its own once
  // the world is built.
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  const ready = await page.waitFor('!!window.TT', { timeout: 300000 });
  if (!ready) throw new Error('window.TT never appeared — the game did not finish loading. '
    + 'Page errors:\n' + (page.errors.slice(0, 3).join('\n') || '(none)'));
  // DWOpening.active goes false only when the overlay has actually handed over to the menu,
  // which is the one honest signal that the canvas is visible.
  const uncovered = await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  if (!uncovered) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.waitFor('window.DWOpening.active === false', { timeout: 60000 });
  }
  await page.evaluate('new Promise(r => setTimeout(r, 700))');   // let the hand-over fade end
  console.log(`shoot: world ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // Take the UI out of the frame. These are shots of the world, used to compare a change
  // against the version before it, and the title card and menu cover the left third. Done by
  // walking up from the canvas and hiding every other child of <body>, so it needs no
  // knowledge of anyone else's element ids — nothing here reaches into ui/*.
  if (!argv.includes('--ui')) {
    await page.evaluate(`(() => {
      // The page has several canvases (minimap, map, the renderer). The renderer's is the
      // big one; picking the first in document order hid its container and every shot came
      // out black.
      const c = [...document.querySelectorAll('canvas')]
        .sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
      if (!c) return false;
      const keep = new Set();
      for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
      for (const child of document.body.children) {
        if (!keep.has(child)) child.style.setProperty('display', 'none', 'important');
      }
      return true;
    })()`);
  }

  for (const [name, expr, opts = {}] of views) {
    const spec = await page.evaluate(expr);
    if (!spec) { failures.push(`${name}: view expression returned null (missing POI?)`); continue; }
    await page.evaluate(`TT.setWorldTime(${opts.worldTime ?? 0.4})`);
    await page.evaluate(`TT.setShotView(${JSON.stringify(spec)})`);
    // Let the sky, water and any fades settle on the new camera before the grab.
    await page.evaluate('new Promise(r => setTimeout(r, 450))');
    const file = path.join(ROOT, outDir, `${name}.png`);
    // A slow headless box can miss one capture (a CDP timeout); try that view once more.
    try { await page.screenshot(file); } catch (e) { console.log(`  ${name}: ${e.message}, once more`); await page.screenshot(file); }
    const kb = (fs.statSync(file).size / 1024).toFixed(0);
    console.log(`  ${name.padEnd(20)} ${kb.padStart(5)} KB`);
  }
  await page.evaluate('TT.setShotView(null)');
  const errs = page.errors.slice(0, 5);
  if (errs.length) {
    console.log('\npage errors during the run:');
    for (const e of errs) console.log('  ' + e.split('\n')[0]);
  }
} finally {
  await browser.close();
  await server.close();
}
if (failures.length) {
  console.error('\nfailed views:\n' + failures.map((f) => '  ' + f).join('\n'));
  process.exit(1);
}
console.log(`\nshoot: ${views.length} view(s) written to ${outDir}`);
