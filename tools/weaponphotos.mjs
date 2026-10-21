// tools/weaponphotos.mjs: a photo of every weapon in the game, for review (Jerry, 2026-10-09: "photos of all current
// weapons, including the Watchman MG and the Mortar"). Built on tools/gunsheet.mjs's harness: the title screen, the camera
// parked with TT.setShotView, each weapon alone on a shelf in the sky, bare (no can, no camo, no flash or laser).
//
//   node tools/weaponphotos.mjs --out review/weapon-photos       every weapon: side, three-quarter; and the line-up
//   node tools/weaponphotos.mjs --out x side-m4 three-mortar      just those
//
// The Watchman and the mortar are shot two ways each: set up (as built) and carried (folded on his shoulder).
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIDTH = 1600, HEIGHT = 900;
const CAVE_THEMES = ['root', 'shale', 'iron', 'wet', 'hill', 'chalk'];

// A view is a name plus an expression evaluated in the page, returning
// {x,y,z,tx,ty,tz,fov} — the camera, and what it looks at. Written as page expressions so
// they can read the real POI positions rather than hard-coding what the world generator did.
// CU-81: every gun and the blades on a shelf of their own, away from the rack. lineup() lays them out four rows by
// three; solo(key, 'side' | 'three') frames one by its bounding box, from its right side or from ahead and above.
const ALL = ['pistol', 'revolver', 'uzi', 'm4', 'ak', 'aa12', 'shotgun', 'sniper', 'minigun', 'launcher', 'flamer', 'chainsaw'];
const EXTRA = ['knife', 'machete', 'm240', 'm240Carried', 'mortar', 'mortarCarried'];
const SHELF = `(() => {
  if (!window.__shelf) {
    const T = TT, THREE = T.THREE;
    const base = new THREE.Vector3(-40, T.sampleHeight(-40, -70) + 34, -70);
    const items = {};
    for (const k of ${JSON.stringify(ALL)}) {
      const src = T.weaponMeshes[k], g = src.clone(true);
      const fx = new Set([src.userData.flash, src.userData.laser, src.userData.flare].filter(Boolean).map((o) => o.material));
      g.traverse((o) => { o.visible = o.name !== 'suppressor' && !(o.material && fx.has(o.material)); if (o.isLight) o.intensity = 0; });
      g.position.copy(base); g.visible = false; T.scene.add(g); items[k] = g;
    }
    let kn = T.knifeMesh ? T.knifeMesh() : null;
    if (!kn) T.scene.traverse((o) => { if (!kn && o.userData && o.userData.knifeModel) kn = o; });
    // The Watchman and the mortar set up, as built (their own models), and as carried (the folded ones on his shoulder).
    for (const kind of ['m240', 'mortar']) {
      const b = T.spawnBuild ? T.spawnBuild(kind, base.x, base.z + 6) : null;
      if (b && b.mesh) { const g = b.mesh; g.traverse((o) => { if (o.userData && o.userData.flash) o.userData.flash.visible = false; if (o.isLight) o.intensity = 0; }); g.position.copy(base); g.visible = false; items[kind] = g; }
    }
    const cm = T.m240VisDbg ? T.m240VisDbg().carriedGun : null;
    if (cm) {
      const g = cm.clone(true); g.traverse((o) => { o.visible = true; if (o.isLight) o.intensity = 0; });
      g.scale.setScalar(1); g.rotation.set(0, 0, 0); g.position.copy(base); g.visible = false; T.scene.add(g); items.m240Carried = g;
      // the carried mortar is its sibling on the player: the broken-down tube at 0.78 scale
      const mt = cm.parent && cm.parent.children.find((o) => o !== cm && Math.abs(o.scale.x - 0.78) < 1e-3 && Math.abs(o.position.y - 1.06) < 1e-3);
      if (mt) { const h = mt.clone(true); h.traverse((o) => { o.visible = true; }); h.scale.setScalar(1); h.rotation.set(0, 0, 0); h.position.copy(base); h.visible = false; T.scene.add(h); items.mortarCarried = h; }
    }
    for (const g of Object.values(items)) g.traverse((o) => { if (o.name === 'flash' || (o.userData && o.userData.isFlash)) o.visible = false; });
    for (const [k, part] of [['knife', 'knifeModel'], ['machete', 'macheteModel']]) {
      if (!kn || !kn.userData[part]) continue;
      const g = kn.userData[part].clone(true); g.traverse((o) => { o.visible = true; }); g.visible = false;
      g.position.copy(base); T.scene.add(g); items[k] = g;
    }
    const hideAll = () => { for (const g of Object.values(items)) g.visible = false; };
    const box = new THREE.Box3(), c = new THREE.Vector3(), s = new THREE.Vector3();
    const frame = (g, dir, fov) => {
      g.updateMatrixWorld(true); box.makeEmpty(); g.traverseVisible((o) => { if (o.isMesh) box.expandByObject(o); }); box.getCenter(c); box.getSize(s);
      const span = Math.max(dir.x > 0.9 ? s.z : Math.hypot(s.x, s.z), s.y * 1.78, 0.3);
      const d = span * 0.7 / Math.tan(fov * Math.PI / 360) / 1.78 + 0.25;
      const n = dir.clone().normalize();
      return { x: c.x + n.x * d, y: c.y + n.y * d, z: c.z + n.z * d, tx: c.x, ty: c.y, tz: c.z, fov };
    };
    window.__shelf = {
      items,
      lineup() {
        hideAll(); TT.dressGuns({ guns: {} });
        ${JSON.stringify(ALL)}.forEach((k, i) => { const g = items[k]; g.visible = true; g.rotation.set(0, 0, 0); g.position.set(base.x, base.y + 0.7 - Math.floor(i / 4) * 0.7, base.z + 2.4 - (i % 4) * 1.6); });
        return { x: base.x + 4.2, y: base.y + 0.05, z: base.z, tx: base.x, ty: base.y, tz: base.z, fov: 50 };
      },
      solo(k, view) {
        hideAll(); TT.dressGuns({ guns: {} });
        const g = items[k]; if (!g) return null;
        g.visible = true; g.rotation.set(0, 0, 0); g.position.copy(base);
        return view === 'side' ? frame(g, new THREE.Vector3(1, 0.02, 0), 34) : frame(g, new THREE.Vector3(0.75, 0.42, 0.62), 34);
      }
    };
  }
  return window.__shelf;
})()`;
const VIEWS = [
  ['lineup', `(() => { const R = ${SHELF}; return R.lineup(); })()`],
  ...[...ALL, ...EXTRA].flatMap((k) => [
    ['side-' + k, `(() => { const R = ${SHELF}; return R.solo('${k}', 'side'); })()`],
    ['three-' + k, `(() => { const R = ${SHELF}; return R.solo('${k}', 'three'); })()`]
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
const outDir = outIdx >= 0 ? argv[outIdx + 1] : path.join('review', 'weapon-photos');
fs.mkdirSync(path.join(ROOT, outDir), { recursive: true });
const wanted = argv.filter((a, i) => !a.startsWith('--') && !(outIdx >= 0 && i === outIdx + 1) && !(argv[i - 1] === '--page'));
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
  const pgIdx = argv.indexOf('--page');
  const pageFile = pgIdx >= 0 ? argv[pgIdx + 1] : 'index.html';
  const url = `${server.origin}/${pageFile}?debug=1&raf=timer&renderer=webgl`;
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
