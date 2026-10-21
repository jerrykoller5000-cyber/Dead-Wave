// tools/heartsheet.mjs — CL-112's review sheet: the heart in the Marrow, built high in the sky (a camera far below takes
// the game's under-water path and times out headless), lit for the sheet by the source's light alone, and shot from
// the tunnel's foot, from beside the source, and with a column down. Same flags as tools/shoot.mjs.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIDTH = 1280, HEIGHT = 720;
const STAGE = `(() => { if (window.__heart) return window.__heart;
  const h = window.__heart = TT.buildHeart({ origin: { x: 0, y: 300, z: 0 } }); TT.scene.add(h.group);
  for (const c of TT.scene.children) if (!c.isLight && c !== h.group && c.visible) { c.userData.__hid = true; c.visible = false; }
  const L = new TT.THREE.PointLight(0x9eeeff, 40, 40, 1.2); L.position.set(h.source.x, h.source.y + 4, h.source.z); TT.scene.add(L);
  const L2 = new TT.THREE.PointLight(0xffd8a8, 8, 30, 1.2); L2.position.set(h.entry.x, h.entry.y + 2, h.entry.z + 4); TT.scene.add(L2);
  return h; })()`;
const VIEWS = [
  ['heart-from-tunnel', `(() => { const h = ${STAGE}; const R = TT.HEART.R; return { x: 0, y: h.source.y + 2.2, z: h.source.z - R + 1, tx: 0, ty: h.source.y + 4, tz: h.source.z + 4, fov: 75 }; })()`, { worldTime: 0.0 }],
  ['heart-source', `(() => { const h = ${STAGE}; return { x: h.source.x + 7, y: h.source.y + 2.5, z: h.source.z - 6, tx: h.source.x, ty: h.source.y + 1.5, tz: h.source.z, fov: 65 }; })()`, { worldTime: 0.0 }],
  ['heart-column-down', `(() => { const h = ${STAGE}; h.fellColumn(1); const c = h.columns[1]; return { x: c.x * 0.4 + 6, y: h.source.y + 3, z: c.z * 0.4 - 6, tx: c.x * 0.6, ty: h.source.y + 0.5, tz: c.z * 0.6, fov: 70 }; })()`, { worldTime: 0.0 }],
  ['heart-tunnel', `(() => { const h = ${STAGE}; return { x: h.entry.x, y: h.entry.y + 1.7, z: h.entry.z, tx: 0, ty: h.source.y + 1.5, tz: h.source.z - 10, fov: 70 }; })()`, { worldTime: 0.0 }]
];

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
