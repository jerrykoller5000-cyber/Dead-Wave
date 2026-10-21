// tools/marinesheet.mjs — the marine's review sheet (CL-94), built on tools/shoot.mjs's harness.
// Same flags: --list, --out <dir>, --show, --compare <dirA> <dirB>.
//
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
// The marine's review sheet (CL-94, D-64): fresh marines from the game's own makeMarine(), in a row in
// the sky, turned front, three-quarter, side and back; one row in the kit he starts with, one in
// the full kit (helmet, carrier, pads, NVG stowed); close-ups of the head both ways; one in the
// field at night.
const ANGLES = [0, -Math.PI / 4, -Math.PI / 2, Math.PI];
const STAGE = `(() => {
  if (!window.__mline) {
    const T = TT, THREE = T.THREE;
    const base = new THREE.Vector3(30, T.sampleHeight(30, -60) + 30, -60);
    const dress = (m, kit) => { const gp = m.userData.gearParts; for (const k of Object.keys(gp)) { const on = kit ? !k.startsWith('bare') : k.startsWith('bare'); for (const o of gp[k]) o.visible = on; } };
    const row = (kit) => ${JSON.stringify(ANGLES)}.map((ry, i) => {
      const m = T.makeMarine(); dress(m, kit);
      const g = new THREE.Group(); g.add(m); g.rotation.y = ry; g.visible = false; T.scene.add(g);
      return g;
    });
    window.__mlineRows = [...row(false), ...row(true)];
    const field = T.makeMarine(); dress(field, true);
    const fg = new THREE.Group(); fg.add(field); fg.visible = false; T.scene.add(fg);
    const cm = T.makeMarine(); const cg = new THREE.Group(); cg.add(cm); cg.visible = false; T.scene.add(cg);
    const mine = new Set([fg, ...window.__mlineRows, cg]);
    // A studio backdrop for the sky row: everything but the lights is hidden (the sky colour stays),
    // which also keeps a frame quick on a slow headless box. The field views put it all back.
    const solo = (on) => { for (const c of T.scene.children) if (!c.isLight && !mine.has(c)) { if (on) { if (c.visible) { c.userData.__msHid = true; c.visible = false; } } else if (c.userData.__msHid) { c.visible = true; delete c.userData.__msHid; } } };
    window.__mline = { base, rows: { bare: window.__mlineRows.slice(0, 4), kit: window.__mlineRows.slice(4) }, field: fg, solo, carry: cg, carryMarine: cm, dress };
  }
  return window.__mline;
})()`;
const hideAll = `for (const r of Object.values(S.rows)) for (const g of r) g.visible = false; S.field.visible = false; S.solo(false); S.carry.visible = false;`;
const lineup = (kit) => `(() => { const S = ${STAGE}; ${hideAll} S.solo(true); const b = S.base; S.rows.${kit}.forEach((g, i) => { g.visible = true; g.position.set(b.x - 1.65 + i * 1.1, b.y, b.z); }); return { x: b.x, y: b.y + 0.95, z: b.z + 4.3, tx: b.x, ty: b.y + 0.88, tz: b.z, fov: 40 }; })()`;
const head = (kit, side) => `(() => { const S = ${STAGE}; ${hideAll} S.solo(true); const b = S.base; const g = S.rows.${kit}[0]; g.visible = true; g.position.set(b.x, b.y, b.z); const a = ${side ? 0.9 : 0}; return { x: b.x + Math.sin(a) * 1.25, y: b.y + 1.5, z: b.z + Math.cos(a) * 1.25, tx: b.x, ty: b.y + 1.42, tz: b.z, fov: 28 }; })()`;
const VIEWS = [
  ['marine-bare', lineup('bare')],
  ['marine-kit', lineup('kit')],
  ['head-bare', head('bare', false)],
  ['head-bare-side', head('bare', true)],
  ['head-kit', head('kit', false)],
  ['head-kit-side', head('kit', true)],
  ['field-dusk', `(() => { const S = ${STAGE}; ${hideAll} const T = TT; const x = 9, z = 9, y = T.sampleHeight(x, z); S.field.visible = true; S.field.position.set(x, y, z); S.field.rotation.y = 0.6; return { x: x + 2.2, y: y + 1.35, z: z + 3.1, tx: x, ty: y + 0.95, tz: z, fov: 45 }; })()`, { worldTime: 0.95 }],
  ['field-night', `(() => { const S = ${STAGE}; ${hideAll} const T = TT; const x = 9, z = 9, y = T.sampleHeight(x, z); S.field.visible = true; S.field.position.set(x, y, z); S.field.rotation.y = 0.6; return { x: x + 2.2, y: y + 1.35, z: z + 3.1, tx: x, ty: y + 0.95, tz: z, fov: 45 }; })()`, { worldTime: 0.0 }],
  ['field-day', `(() => { const S = ${STAGE}; ${hideAll} const T = TT; const x = 9, z = 9, y = T.sampleHeight(x, z); S.field.visible = true; S.field.position.set(x, y, z); S.field.rotation.y = 0.6; return { x: x + 2.2, y: y + 1.35, z: z + 3.1, tx: x, ty: y + 0.95, tz: z, fov: 45 }; })()`, { worldTime: 0.4 }],
];

// CL-90: what he carries, on the player's own marine (the only one with the rig), lifted into the same sky
// stage. He is unarmed for the shot so everything is on him. A build without the rig (the "before") shows him bare.
const CARRY_LOADS = {
  full: { primary: ['m4', 'shotgun'], secondary: ['uzi', 'revolver'], launcher: false },
  heavy: { primary: ['minigun', 'launcher'], secondary: ['revolver', null] },
  flamer: { primary: ['flamer', 'sniper'], secondary: ['uzi', 'uzi'] }
};
const carryView = (load, empty, angle, cam) => `(() => { const S = ${STAGE}; ${hideAll} S.solo(true); const T = TT, b = S.base;
  T.grantAllWeapons();
  if (${empty}) { for (const w of ['pistol','uzi','revolver','m4','ak','sniper','aa12','minigun','flamer']) T.setSpareMags(w, 0); const r = T.getReserve(); r['12ga'] = 0; r['40mm'] = 0; }
  S.dress(S.carryMarine, true);
  if (T.carryPreview) T.carryPreview(S.carryMarine, { loadout: ${JSON.stringify(CARRY_LOADS[load])}, inHand: null, akimbo: false, grenades: ${empty ? 0 : 4}, vest: true });
  const g = S.carry; g.visible = true; g.position.set(b.x, b.y, b.z); g.rotation.y = ${angle};
  return { x: b.x + Math.sin(${cam}) * 2.6, y: b.y + 1.1, z: b.z + Math.cos(${cam}) * 2.6, tx: b.x, ty: b.y + 0.95, tz: b.z, fov: 40 }; })()`;
const CARRY_VIEWS = [
  ['carry-full-back', carryView('full', false, 0, Math.PI)],
  ['carry-full-front', carryView('full', false, 0, 0)],
  ['carry-full-side', carryView('full', false, 0, Math.PI / 2)],
  ['carry-full-quarter', carryView('full', false, 0, 2.4)],
  ['carry-heavy-back', carryView('heavy', false, 0, 2.6)],
  ['carry-heavy-front', carryView('heavy', false, 0, 0.5)],
  ['carry-flamer-back', carryView('flamer', false, 0, 3.6)],
  ['carry-empty-front', carryView('full', true, 0, 0.5)],
  ['carry-empty-back', carryView('full', true, 0, 2.6)],
];
VIEWS.push(...CARRY_VIEWS);   // last: the empty views spend his ammunition

// CL-73: the boat comes in, at the dock. The boat's own clock is stepped to the moment wanted.
const boatView = (at, time, near) => [`(() => { const S = ${STAGE}; ${hideAll} const T = TT;
  const b = T.boatRig && T.boatRig(), d = T.POI.dock; if (!d) return null;
  if (b) { b.reset(); b.arrive(); for (let i = 0; i < Math.round(${at} / 0.1); i++) b.update(0.1); }
  // Without the boat (the build before it), the same camera on the dock: its end in deeper water, 20 m out past it.
  const fx = Math.sin(d.yaw), fz = Math.cos(d.yaw), h = 4.75, dA = T.waterDepthAt(d.x + fx * h, d.z + fz * h), dB = T.waterDepthAt(d.x - fx * h, d.z - fz * h);
  const e = b ? b.end : (dA >= dB ? { x: d.x + fx * h, z: d.z + fz * h } : { x: d.x - fx * h, z: d.z - fz * h });
  const bx = b ? b.group.position.x : e.x + (e.x - d.x) * 4, bz = b ? b.group.position.z : e.z + (e.z - d.z) * 4;
  const ox = e.x - d.x, oz = e.z - d.z, ol = Math.hypot(ox, oz) || 1, ux = ox / ol, uz = oz / ol;
  const back = ${near ? 9 : 16}, up = ${near ? 4 : 7};
  if (${at} < 6) return { x: e.x - ux * 24 + uz * 6, y: (d.deckY || 0) + 5, z: e.z - uz * 24 - ux * 6, tx: e.x + ux * 8, ty: (d.deckY || 0) + 17, tz: e.z + uz * 8, fov: 55 };
  return { x: e.x - ux * back + uz * 5, y: (d.deckY || 0) + up, z: e.z - uz * back - ux * 5, tx: (e.x + bx) / 2, ty: (d.deckY || 0) + 1.5, tz: (e.z + bz) / 2, fov: 50 }; })()`, { worldTime: time }];
const BOAT_VIEWS = [
  ['boat-flares', ...boatView(4, 0.93, false)],
  ['boat-coming', ...boatView(12, 0.95, false)],
  ['boat-docked-night', ...boatView(30, 0.0, true)],
  ['boat-docked-day', ...boatView(30, 0.4, true)],
];
VIEWS.push(...BOAT_VIEWS);

// CL-97: the wardrobe on the rig. Four marines a row, each dressed through TT.dressMarine: the hats, the eyewear
// (close on the heads), and the body picks (sleeves rolled, shorts, bare hands) across skins, hair and eyes.
const DRESS_ROWS = {
  hats: [{ cap: 'cover' }, { cap: 'boonie' }, { cap: 'ballcap' }, { cap: 'ballcapBack' }],
  eyewear: [{ eyewear: 'aviators' }, { eyewear: 'pitViper' }, { eyewear: 'wayfarer' }, { eyewear: 'goggles' }],
  body: [
    { rolled: true, shorts: true, bare: true, skin: 0, hair: 'blond', eyes: 'blue' },
    { rolled: true, shorts: false, bare: false, skin: 2, hair: 'auburn', eyes: 'green' },
    { rolled: false, shorts: true, bare: true, skin: 4, hair: 'black', eyes: 'brown', cap: 'ballcapBack', eyewear: 'wayfarer' },
    { rolled: true, shorts: true, bare: false, skin: 5, hair: 'grey', eyes: 'hazel', cap: 'boonie', eyewear: 'goggles' },
  ],
};
const dressView = (row, facing, close) => `(() => { const S = ${STAGE}; ${hideAll} S.solo(true); const T = TT, THREE = T.THREE, b = S.base;
  window.__mdress = window.__mdress || {};
  if (!window.__mdress.${row}) window.__mdress.${row} = ${JSON.stringify(DRESS_ROWS[row])}.map((o) => {
    const m = T.makeMarine(); S.dress(m, false);
    const w = T.normalizeWardrobe(null);
    if (o.cap) w.items.cap.style = o.cap;
    if (o.eyewear) w.items.eyewear = { style: o.eyewear };
    if (o.rolled) w.items.shirt.sleeves = 'rolled';
    if (o.shorts) w.items.trousers.cut = 'shorts';
    if (o.bare) w.items.gloves.worn = false;
    if (o.skin != null) Object.assign(w.body, { skin: o.skin, hair: o.hair, eyes: o.eyes });
    T.dressMarine(m, w);
    const g = new THREE.Group(); g.add(m); T.scene.add(g); return g;
  });
  for (const r of Object.values(window.__mdress)) for (const g of r) g.visible = false;
  const gap = ${close ? 0.5 : 1.1};
  window.__mdress.${row}.forEach((g, i) => { g.visible = true; g.position.set(b.x + (i - 1.5) * gap, b.y, b.z); g.rotation.y = ${facing}; });
  return ${close} ? { x: b.x, y: b.y + 1.45, z: b.z + 1.9, tx: b.x, ty: b.y + 1.42, tz: b.z, fov: 38 }
    : { x: b.x, y: b.y + 0.95, z: b.z + 4.3, tx: b.x, ty: b.y + 0.88, tz: b.z, fov: 40 }; })()`;
// The stage's other rows stay hidden: hideAll only knows its own, so these views go last.
const DRESS_VIEWS = [
  ['wardrobe-hats', dressView('hats', -0.45, false)],
  ['wardrobe-hats-back', dressView('hats', Math.PI - 0.45, false)],
  ['wardrobe-eyewear', dressView('eyewear', -0.35, true)],
  ['wardrobe-eyewear-side', dressView('eyewear', -1.2, true)],
  ['wardrobe-body', dressView('body', -0.35, false)],
  ['wardrobe-body-back', dressView('body', Math.PI - 0.35, false)],
];
VIEWS.push(...DRESS_VIEWS);

// CL-90 part 2: the draw and holster moves, as a strip: four marines, each posed a moment further into the move.
const DRAW_LOAD = { primary: ['m4', 'shotgun'], secondary: ['uzi', 'revolver'] };
const DRAW_MOVES = {
  'm4-to-pistol': ['m4', 'pistol', [0.09, 0.2, 0.3, 0.44]],       // the M4 onto his back, the pistol off the hip
  'pistol-to-revolver': ['pistol', 'revolver', [0.09, 0.2, 0.29, 0.42]],   // the hip, then the cross-draw under the left arm
  'uzi-to-shotgun': ['uzi', 'shotgun', [0.09, 0.2, 0.33, 0.47]],   // the chest, then over the shoulder
};
const drawView = (move, facing) => `(() => { const S = ${STAGE}; ${hideAll} S.solo(true); const T = TT, THREE = T.THREE, b = S.base;
  if (window.__mdress) for (const r of Object.values(window.__mdress)) for (const g of r) g.visible = false;
  window.__mdraw = window.__mdraw || {};
  for (const r of Object.values(window.__mdraw)) for (const g of r) g.visible = false;
  const [from, to, times] = ${JSON.stringify(DRAW_MOVES[move])};
  if (!window.__mdraw['${move}']) window.__mdraw['${move}'] = times.map((t) => {
    const m = T.makeMarine(); S.dress(m, true);
    T.drawPreview(m, from, to, t, ${JSON.stringify(DRAW_LOAD)});
    const g = new THREE.Group(); g.add(m); T.scene.add(g); return g;
  });
  window.__mdraw['${move}'].forEach((g, i) => { g.visible = true; g.position.set(b.x + (i - 1.5) * 1.15, b.y, b.z); g.rotation.y = ${facing}; });
  return { x: b.x, y: b.y + 1.0, z: b.z + 4.4, tx: b.x, ty: b.y + 0.9, tz: b.z, fov: 40 }; })()`;
const DRAW_VIEWS = [
  ['draw-m4-to-pistol', drawView('m4-to-pistol', -0.6)],
  ['draw-m4-to-pistol-back', drawView('m4-to-pistol', Math.PI - 0.6)],
  ['draw-pistol-to-revolver', drawView('pistol-to-revolver', -0.3)],
  ['draw-uzi-to-shotgun', drawView('uzi-to-shotgun', Math.PI - 0.8)],
];
VIEWS.push(...DRAW_VIEWS);

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
