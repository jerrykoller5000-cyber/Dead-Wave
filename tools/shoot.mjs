// tools/shoot.mjs — before-and-after screenshots of named views.
//
//   node tools/shoot.mjs                     every view
//   node tools/shoot.mjs hq river-mouth      just those
//   node tools/shoot.mjs --list              names only
//   node tools/shoot.mjs --out before        write to "Claude outputs/before"
//   node tools/shoot.mjs --show              watch it work in a real window
//
// PNGs land in "Claude outputs/shots/<view>.png" at 1280x720.
//
// Shots are taken from the title screen, not from a running match. The whole world is built
// before the title appears, so every view is reachable there, and it keeps a run of shots
// deterministic and quick — no insertion cine, no wave timers, no drifting day clock. The
// camera is parked through TT.setShotView(), which the frame loop applies last, after the
// play rig and the menu orbit have had their say.
//
// The views are named in handoffs/requests.md by Claude; keep the two in step.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIDTH = 1280, HEIGHT = 720;
const CAVE_THEMES = ['root', 'shale', 'iron', 'wet', 'hill', 'chalk'];

// A view is a name plus an expression evaluated in the page, returning
// {x,y,z,tx,ty,tz,fov} — the camera, and what it looks at. Written as page expressions so
// they can read the real POI positions rather than hard-coding what the world generator did.
const VIEWS = [
  // The cabin and yard, framed as the play camera frames it: behind and above, looking down.
  ['hq', `TT.shotHQ()`],
  ['night-hq', `TT.shotHQ()`, { worldTime: 0.0 }],   // 0.0 is midnight; 0.25 is sunrise
  // The river mouth, from above and to the north-east, per Claude's request.
  ['river-mouth', `({ x: -121 + 26, y: -4 + 19, z: -62 + 26, tx: -121, ty: -4, tz: -62, fov: 50 })`],
  // Low across the east shallows, to see through the water rather than down onto it.
  ['lake-shore', `(() => {
     const L = TT.LAKE_HOLE;
     return { x: L.x + 46, y: -1.6, z: L.z + 6, tx: L.x + 12, ty: -3.2, tz: L.z + 2, fov: 55 };
   })()`],
  ['bridge-east', `({ x: 56 + 14, y: TT.sampleHeight(56, 72) + 9, z: 72 + 14, tx: 56, ty: TT.sampleHeight(56, 72) + 1, tz: 72, fov: 50 })`],
  ['bridge-west', `({ x: -46 + 14, y: TT.sampleHeight(-46, 50) + 9, z: 50 + 14, tx: -46, ty: TT.sampleHeight(-46, 50) + 1, tz: 50, fov: 50 })`],
  // Claude's pit camera (CU-7): closer than the first framing, aimed at the funnel
  // floor rather than the surface, so the rune ring reads through the water. Not straight
  // down — lookAt() along the up vector is degenerate and the camera points at the sky.
  ['pit', `(() => {
     const L = TT.LAKE_HOLE;
     return { x: L.x + 12, y: -3.4 + 16, z: L.z + 12, tx: L.x, ty: -3.4 - 5, tz: L.z, fov: 50 };
   })()`],
  // Each cave from three sides. Distances and heights are Claude's numbers.
  ...CAVE_THEMES.flatMap((theme) => [
    [`cave-${theme}-front`, caveShot(theme, 'front')],
    [`cave-${theme}-side`, caveShot(theme, 'side')],
    [`cave-${theme}-top`, caveShot(theme, 'top')]
  ])
];

// A cave's own frame: +z (fx, fz) points out of the mouth, +x (rx, rz) is to its right.
function caveShot(theme, kind) {
  const spec = {
    front: { out: 24, right: 0, up: 17, fov: 50 },
    side: { out: 2, right: 26, up: 12, fov: 50 },
    top: { out: 30, right: 0, up: 34, fov: 55 }
  }[kind];
  return `(() => {
    const c = (TT.POI.caves || []).find(c => c.theme === ${JSON.stringify(theme)});
    if (!c) return null;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
    const out = ${spec.out}, right = ${spec.right}, up = ${spec.up};
    return {
      x: c.x + fx * out + rx * right,
      y: c.gy + up,
      z: c.z + fz * out + rz * right,
      tx: c.x, ty: c.gy + 2.2, tz: c.z, fov: ${spec.fov}
    };
  })()`;
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
    await page.evaluate(`(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  const ready = await page.waitFor('!!window.TT', { timeout: 300000 });
  if (!ready) throw new Error('window.TT never appeared — the game did not finish loading. '
    + 'Page errors:\n' + (page.errors.slice(0, 3).join('\n') || '(none)'));
  // DWOpening.active goes false only when the overlay has actually handed over to the menu,
  // which is the one honest signal that the canvas is visible.
  const uncovered = await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  if (!uncovered) {
    await page.evaluate(`(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
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
    await page.screenshot(file);
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
