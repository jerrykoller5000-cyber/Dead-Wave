// tools/gunsheet.mjs — the guns' review sheet, on tools/shoot.mjs's harness.
//
//   node tools/gunsheet.mjs                     every view
//   node tools/gunsheet.mjs side-m4 lineup      just those
//   node tools/gunsheet.mjs --list              names only
//   node tools/gunsheet.mjs --out review/x/v1   write there
//   node tools/gunsheet.mjs --compare A B       how far two sets moved
//   node tools/gunsheet.mjs --page x.html       shoot another copy of the game (a before build)
//
// PNGs land in "Claude outputs/shots/<view>.png" at 1280x720. The suppressor and camo views (CL-95, CL-97)
// use the six-gun rack; lineup, side-* and three-* (CU-81) show every gun, the blades and the M240, bare.
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
const GUNS = ['m4', 'ak', 'sniper', 'shotgun', 'uzi', 'pistol'];
// A rack in the sky: one group per gun, the bare gun above and the same gun with its can below, stocks lined up.
const RACK = `(() => {
  if (!window.__rack) {
    const T = TT, THREE = T.THREE;
    const base = new THREE.Vector3(30, T.sampleHeight(30, -60) + 30, -60);
    const groups = {};
    ['m4', 'ak', 'sniper', 'shotgun', 'uzi', 'pistol'].forEach((k) => {
      const grp = new THREE.Group(); grp.position.copy(base); T.scene.add(grp); groups[k] = grp;
      const small = k === 'uzi' || k === 'pistol';
      for (const on of [false, true]) {
        const g = T.weaponMeshes[k].clone(true);
        g.visible = true; g.traverse((o) => { if (o.name === 'suppressor') o.visible = on; });
        g.position.set(0, on ? -(small ? 0.22 : 0.24) : (small ? 0.22 : 0.24), 0); g.rotation.set(0, 0, 0);
        grp.add(g);
      }
    });
    window.__rack = { base, groups };
  }
  return window.__rack;
})()`;
// CU-81: every gun and the blades on a shelf of their own, away from the rack. lineup() lays them out four rows by
// three; solo(key, 'side' | 'three') frames one by its bounding box, from its right side or from ahead and above.
const ALL = ['m4', 'ak', 'aa12', 'shotgun', 'sniper', 'minigun', 'launcher', 'flamer', 'chainsaw', 'uzi', 'pistol', 'revolver'];
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
    const m240 = T.spawnBuild ? T.spawnBuild('m240', base.x, base.z + 6) : null;
    if (m240 && m240.mesh) { const g = m240.mesh; g.position.copy(base); g.visible = false; items.m240 = g; }
    for (const [k, part] of [['knife', 'knifeModel'], ['machete', 'macheteModel']]) {
      if (!kn || !kn.userData[part]) continue;
      const g = kn.userData[part].clone(true); g.traverse((o) => { o.visible = true; }); g.visible = false;
      g.position.copy(base); T.scene.add(g); items[k] = g;
    }
    const hideAll = () => { for (const g of Object.values(items)) g.visible = false; };
    const box = new THREE.Box3(), c = new THREE.Vector3(), s = new THREE.Vector3();
    const frame = (g, dir, fov) => {
      g.updateMatrixWorld(true); box.makeEmpty(); g.traverseVisible((o) => { if (o.isMesh) box.expandByObject(o); }); box.getCenter(c); box.getSize(s);
      const span = Math.max(s.z, s.y * 1.78, 0.3);
      const d = span * 0.62 / Math.tan(fov * Math.PI / 360) / 1.78 + 0.25;
      const n = dir.clone().normalize();
      return { x: c.x + n.x * d, y: c.y + n.y * d, z: c.z + n.z * d, tx: c.x, ty: c.y, tz: c.z, fov };
    };
    window.__shelf = {
      items,
      lineup() {
        hideAll(); TT.dressGuns({ guns: {} });
        ${JSON.stringify(ALL)}.forEach((k, i) => { const g = items[k]; g.visible = true; g.rotation.set(0, 0, 0); g.position.set(base.x, base.y + 0.95 - Math.floor(i / 3) * 0.62, base.z + 2.2 - (i % 3) * 2.2); });
        return { x: base.x + 4.3, y: base.y + 0.02, z: base.z, tx: base.x, ty: base.y, tz: base.z, fov: 50 };
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
  ['guns-all', `(() => { const R = ${RACK}; Object.keys(R.groups).forEach((k, i) => { const g = R.groups[k]; g.visible = true; g.position.set(R.base.x, R.base.y + 1.1 - Math.floor(i / 2) * 1.1, R.base.z - 1.0 + (i % 2) * 2.1); }); const b = R.base; return { x: b.x + 4.6, y: b.y + 0.1, z: b.z + 0.2, tx: b.x, ty: b.y, tz: b.z + 0.2, fov: 50 }; })()`],
  // CL-97 part 2: the same rack with camo on the furniture (one pick per gun), then put back bare.
  ['guns-camo', `(() => { const R = ${RACK}; TT.dressGuns({ guns: { m4: 'multicam', ak: 'tigerStripe', sniper: 'dpmDesert', shotgun: 'm81', uzi: 'marpat', pistol: 'flecktarn' } }); Object.keys(R.groups).forEach((k, i) => { const g = R.groups[k]; g.visible = true; g.position.set(R.base.x, R.base.y + 1.1 - Math.floor(i / 2) * 1.1, R.base.z - 1.0 + (i % 2) * 2.1); }); const b = R.base; return { x: b.x + 4.6, y: b.y + 0.1, z: b.z + 0.2, tx: b.x, ty: b.y, tz: b.z + 0.2, fov: 50 }; })()`],
  ['gun-m4-camo', `(() => { const R = ${RACK}; TT.dressGuns({ guns: { m4: 'multicam' } }); for (const [key, g] of Object.entries(R.groups)) { g.visible = key === 'm4'; g.position.copy(R.base); } const b = R.base; return { x: b.x + 2.1, y: b.y + 0.03, z: b.z + 0.3, tx: b.x, ty: b.y, tz: b.z + 0.3, fov: 40 }; })()`],
  ...GUNS.map((k) => ['gun-' + k, `(() => { const R = ${RACK}; for (const [key, g] of Object.entries(R.groups)) { g.visible = key === '${k}'; g.position.copy(R.base); } const b = R.base; const small = '${k}' === 'uzi' || '${k}' === 'pistol'; const zc = small ? 0.12 : 0.3; const d = small ? 1.45 : 2.1; return { x: b.x + d, y: b.y + 0.03, z: b.z + zc, tx: b.x, ty: b.y, tz: b.z + zc, fov: 40 }; })()`]),
  ['lineup', `(() => { const R = ${SHELF}; return R.lineup(); })()`],
  ['lineup-rune', `(() => { const R = ${SHELF}; const spec = R.lineup(); TT.runeFinishDbg.unlock(); const g = {}; for (const k of ${JSON.stringify(ALL)}) g[k] = 'rune'; TT.dressGuns({ guns: g }); return spec; })()`, { worldTime: 0.0 }],
  ...[...ALL, 'knife', 'machete', 'm240'].map((k) => ['side-' + k, `(() => { const R = ${SHELF}; return R.solo('${k}', 'side'); })()`]),
  ...[...ALL, 'knife', 'machete', 'm240'].map((k) => ['three-' + k, `(() => { const R = ${SHELF}; return R.solo('${k}', 'three'); })()`]),
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
