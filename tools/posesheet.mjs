// The player posed and photographed close up: his boots, his feet through a turn, his hands on a gun.
// It loads the Training Ground once, puts the game on a hand-cranked 60 fps clock (every run is the same frames), pins
// him to one spot, and for each pose picks the weapon, holds keys (KeyC crouches, KeyW walks), turns the aim, steps
// the frames, and takes pictures with the camera placed in his own frame (+x his left, +z where he faces).
//
//   node tools/posesheet.mjs <set> --out review/<task>/<name>/        sets: boots, turn, hands (or a .json list)
//   node tools/posesheet.mjs pair <before-dir> <after-dir> --out <file.jpg> [--only re]   before | after, row by row
//   --only <regex>   just the poses whose name matches
//   --soft           headless software rendering (anywhere; slow). Default on Windows: a real GPU window off screen
//   --show           the GPU window on screen
//   --size 1000x750  picture size
//
// A pose: { name, weapon, keys: [codes], aim (rad), settle (s), turn: { to, rate (rad/s; 0 = a snap) },
//           frames: [n, ...] (pictures this many frames after the turn starts; default one, after settle),
//           views: [view names or { cam: [x,y,z], look: [x,y,z], fov }], eval: "page code run before the shots" }
// Each picture is <out>/<pose>-<view>[-<frame>f].png, and <out>/sheet.jpg has them all.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const VALUED = ['out', 'only', 'size', 'tile'];
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : (VALUED.includes(k) ? argv[i + 1] : true); };
const set = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && VALUED.includes(argv[i - 1].slice(2))));
const OUT = path.resolve(ROOT, String(opt('out', 'review/posesheet/')));
const ONLY = opt('only') ? new RegExp(opt('only')) : null;
const SIZE = String(opt('size', '1000x750')).split('x').map(Number);
const D = Math.PI / 180;

// Views in his frame: cam and look are [left, up, forward] from his root on the ground.
export const VIEWS = {
  'feet-left': { cam: [1.15, 0.32, 0.12], look: [0, 0.17, 0.04], fov: 30 },
  'feet-right': { cam: [-1.15, 0.32, 0.12], look: [0, 0.17, 0.04], fov: 30 },
  'feet-front': { cam: [0.75, 0.5, 1.05], look: [0, 0.18, 0.02], fov: 30 },
  'feet-back': { cam: [-0.75, 0.5, -1.05], look: [0, 0.18, 0], fov: 30 },
  'feet-top': { cam: [0.02, 2.2, 0.15], look: [0, 0.1, 0.05], fov: 26 },
  'legs-left': { cam: [2.1, 0.62, 0.35], look: [0, 0.45, 0.02], fov: 30 },
  'legs-front': { cam: [1.3, 0.75, 1.8], look: [0, 0.45, 0], fov: 30 },
  body: { cam: [2.3, 1.55, 2.5], look: [0, 0.85, 0], fov: 34 },
  top: { cam: [0, 4.2, 0.25], look: [0, 0.85, 0], fov: 34 },
  'hands-left': { cam: [1.15, 1.25, 0.55], look: [0, 1.12, 0.32], fov: 34 },
  'hands-right': { cam: [-1.15, 1.25, 0.55], look: [0, 1.12, 0.32], fov: 34 },
  'hands-front': { cam: [0.45, 1.35, 1.45], look: [0, 1.12, 0.3], fov: 34 },
  'hands-top': { cam: [0.05, 2.25, 0.4], look: [0, 1.1, 0.32], fov: 34 },
  'hands-low': { cam: [0.7, 0.75, 0.9], look: [0, 1.1, 0.3], fov: 34 },
  // Close on each hand (at its palm point): from his gun side, from below, from the support side, from ahead.
  'gripR-side': { at: 'handR', cam: [-0.42, 0.06, 0.12], look: [0, 0, 0], fov: 30 },
  'gripR-under': { at: 'handR', cam: [-0.22, -0.36, 0.2], look: [0, 0, 0], fov: 30 },
  'gripL-side': { at: 'handL', cam: [0.42, 0.04, 0.05], look: [0, 0, 0], fov: 30 },
  'gripL-under': { at: 'handL', cam: [0.18, -0.38, 0.18], look: [0, 0, 0], fov: 30 },
  'gripL-front': { at: 'handL', cam: [0.12, 0.08, 0.45], look: [0, 0, 0], fov: 30 },
  // Fixed in the world (where he faced when the pose began): for turns.
  'turn-feet': { cam: [1.1, 1.05, 1.5], look: [0, 0.12, 0.05], fov: 30, fixed: true },
  'turn-back': { cam: [-1.0, 1.1, -1.6], look: [0, 0.15, 0], fov: 32, fixed: true },
  'turn-body': { cam: [2.3, 1.7, 2.6], look: [0, 0.8, 0], fov: 36, fixed: true }
};
const FEET = ['feet-left', 'feet-front', 'feet-back', 'feet-right'];
export const SETS = {
  boots: [
    { name: 'stand-m4', weapon: 'm4', settle: 1.5, views: [...FEET, 'legs-left'] },
    { name: 'crouch-m4', weapon: 'm4', keys: ['KeyC'], settle: 1.5, views: [...FEET, 'legs-left'] },
    { name: 'crouch-pistol', weapon: 'pistol', keys: ['KeyC'], settle: 1.5, views: [...FEET, 'legs-front'] },
    { name: 'stand-turned-m4', weapon: 'm4', settle: 1.5, turn: { to: 40 * D, rate: 0 }, frames: [8], views: [...FEET] },
    { name: 'crouch-turned-m4', weapon: 'm4', keys: ['KeyC'], settle: 1.5, turn: { to: 40 * D, rate: 0 }, frames: [8], views: [...FEET] },
    { name: 'walk-m4', weapon: 'm4', keys: ['KeyW'], settle: 1.2, frames: [0, 9, 18], views: ['feet-left', 'legs-left'] },
    { name: 'crouch-walk-m4', weapon: 'm4', keys: ['KeyC', 'KeyW'], settle: 1.5, frames: [0, 12, 24], views: ['feet-left', 'legs-left'] }
  ],
  turn: [
    { name: 'stand-m4-flick30', weapon: 'm4', settle: 1.5, turn: { to: 30 * D, rate: 0 }, frames: [0, 4, 8, 12, 16, 20, 26, 34, 44, 60], views: ['turn-feet'] },
    { name: 'stand-m4-snap90', weapon: 'm4', settle: 1.5, turn: { to: 90 * D, rate: 0 }, frames: [0, 4, 8, 12, 16, 20, 26, 34, 44, 60], views: ['turn-feet', 'turn-body'] },
    { name: 'stand-m4-slow120', weapon: 'm4', settle: 1.5, turn: { to: 120 * D, rate: 40 * D }, frames: [0, 20, 40, 60, 80, 100, 120, 140, 160, 200], views: ['turn-feet', 'turn-body'] },
    { name: 'stand-pistol-snap90', weapon: 'pistol', settle: 1.5, turn: { to: -90 * D, rate: 0 }, frames: [0, 4, 8, 12, 16, 20, 26, 34, 44, 60], views: ['turn-feet'] },
    { name: 'crouch-m4-snap90', weapon: 'm4', keys: ['KeyC'], settle: 1.5, turn: { to: 90 * D, rate: 0 }, frames: [0, 4, 8, 12, 16, 20, 26, 34, 44, 60], views: ['turn-feet', 'turn-back'] },
    { name: 'crouch-m4-slow120', weapon: 'm4', keys: ['KeyC'], settle: 1.5, turn: { to: 120 * D, rate: 40 * D }, frames: [0, 20, 40, 60, 80, 100, 120, 140, 160, 200], views: ['turn-feet'] }
  ],
  hands: ['pistol', 'revolver', 'uzi', 'm4', 'ak', 'aa12', 'shotgun', 'sniper', 'launcher', 'minigun', 'flamer', 'chainsaw']
    .map((w) => ({ name: 'hands-' + w, weapon: w, settle: 1.5, views: ['gripR-side', 'gripR-under', 'gripL-side', 'gripL-under', 'gripL-front'] }))
};

const PAGE = String.raw`(() => {
  const T = window.TT, THREE = T.THREE;
  if (!window.__ft) {
    window.__ft = performance.now(); window.__q = [];
    performance.now = () => window.__ft;
    window.requestAnimationFrame = (cb) => { window.__q.push(cb); return window.__q.length; };
    window.cancelAnimationFrame = () => {};
  }
  const S = window.__S, p = T.localPlayer ? T.localPlayer.position : T.player.position;
  let aimYaw = 0;
  const pin = () => { p.x = S.x; p.z = S.z; T.aimTarget.set(S.x + Math.sin(aimYaw) * 30, S.y + 1.25, S.z + Math.cos(aimYaw) * 30); T.setAimYawDbg(aimYaw); };
  // A key nothing is bound to, on the page (not window: the prep checklist reads e.target as a Node), keeps the idle
  // layer from taking his hands for a cigarette after 25 s without input.
  const busy = () => document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'F24', key: 'F24', bubbles: true }));
  window.__step = (n = 1) => { for (let i = 0; i < n; i++) { pin(); if (!window.__idleOk) busy(); window.__ft += 1000 / 60; const q = window.__q; window.__q = []; for (const cb of q) cb(window.__ft); } };
  window.__aim = (y) => { aimYaw = y; };
  window.__key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  window.__weapon = (w) => { for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); window.__step(10); } return T.getCurrentWeapon(); };
  // The camera in his frame: [left, up, forward] from his root, turned by where he faces now (fixed: where he faced
  // when the pose began, so a turn shows).
  // at: 'handR' / 'handL' looks at that hand's palm point (the IK's hand point), the camera cam from it.
  window.__view = (v) => {
    const y = v.fixed ? (v.baseYaw || 0) : aimYaw, c = Math.cos(y), s = Math.sin(y), m = T.getMarine(); m.updateMatrixWorld(true);
    let o0 = { x: p.x, y: S.y, z: p.z };
    if (v.at) { const ud = m.userData, h = v.at === 'handR' ? ud.elbowRG.localToWorld(new THREE.Vector3(-0.01, -0.26, 0.12)) : ud.elbowLG.localToWorld(new THREE.Vector3(0.02, -0.27, 0.13)); o0 = { x: h.x, y: h.y, z: h.z }; }
    const at = (o) => ({ x: o0.x + o[0] * c + o[2] * s, y: o0.y + o[1], z: o0.z - o[0] * s + o[2] * c });
    const a = at(v.cam), b = at(v.look);
    T.setShotView({ x: a.x, y: a.y, z: a.z, tx: b.x, ty: b.y, tz: b.z, fov: v.fov || 34 });
  };
})()`;

const SETUP = String.raw`(async () => {
  const T = window.TT, D = T.trainingDbg, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
  const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
  await wait(3500);
  const tg = D.tg(); for (const t of tg.targets) t.pivot.parent.visible = false;
  const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
  const keep = new Set(); for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
  for (const ch of document.body.children) if (!keep.has(ch)) ch.style.setProperty('display', 'none', 'important');
  T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
  const O = tg.origin; window.__S = { x: O.x, y: tg.floorY, z: O.z + 4 };
  return true;
})()`;

// node tools/posesheet.mjs pair <before-dir> <after-dir> --out <file.jpg> [--only re]: the same pictures side by side.
async function pair() {
  const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && VALUED.includes(argv[i - 1].slice(2))));
  const [, beforeDir, afterDir] = pos.map((p) => path.resolve(ROOT, p));
  const names = fs.readdirSync(afterDir).filter((f) => f.endsWith('.png') && fs.existsSync(path.join(beforeDir, f)) && (!ONLY || ONLY.test(f)));
  const out = path.resolve(ROOT, String(opt('out', path.join(path.relative(ROOT, afterDir), 'pairs.jpg'))));
  const browser = await launch({ headless: true });
  const page = await browser.newPage({ width: 400, height: 300 });
  const data = (f) => fs.readFileSync(f).toString('base64');
  const rows = names.map((f) => ({ label: f.replace(/\.png$/, ''), a: data(path.join(beforeDir, f)), b: data(path.join(afterDir, f)) }));
  const jpg = await page.evaluate(`(async (rows, tw) => {
    const load = (d) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = 'data:image/png;base64,' + d; });
    const imgs = []; for (const r of rows) imgs.push([await load(r.a), await load(r.b)]);
    const th = Math.round(tw * imgs[0][0].height / imgs[0][0].width), c = document.createElement('canvas');
    c.width = tw * 2 + 6; c.height = rows.length * (th + 4); const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach((r, k) => { const y = k * (th + 4); imgs[k].forEach((im, j) => { if (im) g.drawImage(im, j * (tw + 6), y, tw, th); });
      g.fillStyle = '#000b'; g.fillRect(0, y + th - 24, c.width, 24); g.fillStyle = '#f4ecd0'; g.font = '600 15px Arial';
      g.fillText('BEFORE  ' + r.label, 8, y + th - 7); g.fillText('AFTER  ' + r.label, tw + 14, y + th - 7); });
    return c.toDataURL('image/jpeg', 0.86).split(',')[1];
  })(${JSON.stringify(rows)}, 560)`, 120000);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(jpg, 'base64'));
  console.log('pairs', path.relative(ROOT, out), '(' + names.length + ')');
  await browser.close?.();
  process.exit(0);
}

async function main() {
  if (set === 'pair') return pair();
  let poses = SETS[set];
  if (!poses && set && fs.existsSync(path.resolve(ROOT, set))) poses = JSON.parse(fs.readFileSync(path.resolve(ROOT, set), 'utf8'));
  if (!poses) { console.log('usage: node tools/posesheet.mjs <' + Object.keys(SETS).join('|') + '|list.json> --out <dir>/ [--only re] [--soft] [--show]'); process.exit(2); }
  if (ONLY) poses = poses.filter((p) => ONLY.test(p.name));
  const headless = !!opt('soft');
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless, args: headless ? [] : ['--disable-features=CalculateNativeWinOcclusion', '--window-size=' + SIZE.join(',')] });
  let code = 0;
  try {
    const page = await browser.newPage({ width: SIZE[0], height: SIZE[1] });
    if (!headless && !opt('show')) {
      try {
        const { windowId } = await page.send('Browser.getWindowForTarget', {});
        await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
      } catch { /* stays where it is */ }
    }
    await page.setViewport(SIZE[0], SIZE[1]);
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer${headless ? '&renderer=webgl' : ''}`, { timeout: 240000 });
    await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
    await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); return true; })()`);
    if (!(await page.waitFor('!!window.TT', { timeout: 400000 }))) throw new Error('the game never loaded: ' + (page.errors[0] || ''));
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
    await page.evaluate(SETUP, 180000);
    await page.evaluate(PAGE);
    await new Promise((r) => setTimeout(r, 400));   // the game's next frame queues itself on the hand-cranked clock
    const renderer = await page.evaluate(`(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`);
    console.log('renderer:', renderer);
    fs.mkdirSync(OUT, { recursive: true });
    const thumbs = [];
    for (const pose of poses) {
      const views = (pose.views || ['body']).map((v) => typeof v === 'string' ? { name: v, ...VIEWS[v], baseYaw: +pose.aim || 0 } : { name: v.name || 'view', baseYaw: +pose.aim || 0, ...v });
      await page.evaluate(`(() => { __aim(${+pose.aim || 0}); __weapon(${JSON.stringify(pose.weapon || 'm4')}); __step(30);
        for (const k of ${JSON.stringify(pose.keys || [])}) __key(k, true); __step(${Math.round((pose.settle ?? 1.2) * 60)}); return true; })()`, 120000);
      if (pose.eval) await page.evaluate(`(() => { const T = window.TT; ${pose.eval} })()`, 60000);
      const frames = pose.frames || [0], turn = pose.turn;
      const steps0 = await page.evaluate(`(() => { const t = TT.getMarine().userData.turn; return t ? t.steps || 0 : 0; })()`);
      let at = 0;
      for (const f of frames) {
        await page.evaluate(`(() => { const from = ${+pose.aim || 0}, to = ${turn ? +turn.to : +pose.aim || 0}, rate = ${turn ? +turn.rate || 0 : 0};
          for (let i = ${at}; i < ${f}; i++) { const t = (i + 1) / 60; __aim(rate ? from + Math.sign(to - from) * Math.min(Math.abs(to - from), rate * t) : to); __step(1); }
          return true; })()`, 120000);
        at = Math.max(at, f) + views.length;   // each picture draws one frame
        for (const v of views) {
          await page.evaluate(`(() => { __view(${JSON.stringify(v)}); __step(1); __view(${JSON.stringify(v)}); return true; })()`);
          await new Promise((r) => setTimeout(r, headless ? 300 : 120));
          const file = path.join(OUT, `${pose.name}-${v.name}${frames.length > 1 ? '-' + String(f).padStart(3, '0') + 'f' : ''}.png`);
          await page.screenshot(file);
          const t = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: SIZE[0], height: SIZE[1], scale: 400 / SIZE[0] } });
          thumbs.push({ label: path.basename(file, '.png'), data: t.data, row: pose.name + (frames.length > 1 ? '/' + v.name : '') });
          console.log('shot', path.relative(ROOT, file));
        }
      }
      if (turn) {
        // Steps counted from the turn's own debug (a step that started counts); the clock restarts when he moves.
        const steps = await page.evaluate(`(() => { const t = TT.getMarine().userData.turn; return t ? t.steps || 0 : 0; })()`);
        console.log(`steps ${pose.name}: ${Math.max(0, steps - steps0)} over ${(at / 60).toFixed(2)} s`);
      }
      // Each picture took one more frame (a frame draws the shot view); keys off, and he settles back square.
      await page.evaluate(`(() => { for (const k of ${JSON.stringify(pose.keys || [])}) __key(k, false); __aim(0); __step(90); window.TT.setShotView(null); return true; })()`, 120000);
    }
    // One row per pose (its views side by side), or per pose and view for a strip (its frames side by side).
    const rows = [];
    for (const t of thumbs) { const r = rows.find((x) => x.key === t.row); if (r && r.items.length < 10) r.items.push(t); else rows.push({ key: t.row, items: [t] }); }
    const sheet = await page.evaluate(`(async (rows, tw) => {
      const load = (d) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = 'data:image/jpeg;base64,' + d; });
      const imgs = await Promise.all(rows.map((r) => Promise.all(r.items.map((t) => load(t.data)))));
      const first = imgs[0][0], th = Math.round(tw * first.height / first.width), cols = Math.max(...rows.map((r) => r.items.length)), c = document.createElement('canvas');
      c.width = cols * tw; c.height = rows.length * th; const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
      rows.forEach((r, y0) => r.items.forEach((t, x0) => { const x = x0 * tw, y = y0 * th, im = imgs[y0][x0]; if (im) g.drawImage(im, x, y, tw, th);
        g.fillStyle = '#000b'; g.fillRect(x, y + th - 22, tw, 22); g.fillStyle = '#f4ecd0'; g.font = '600 13px Arial'; g.fillText(t.label, x + 6, y + th - 7, tw - 12);
        g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(x, y, tw, th); }));
      return c.toDataURL('image/jpeg', 0.86).split(',')[1];
    })(${JSON.stringify(rows)}, ${+opt('tile', 0) || 400})`, 120000);
    fs.writeFileSync(path.join(OUT, 'sheet.jpg'), Buffer.from(sheet, 'base64'));
    console.log('sheet', path.relative(ROOT, path.join(OUT, 'sheet.jpg')));
    const errs = (page.errors || []).filter((e) => !/contains/.test(e)).slice(0, 5);
    if (errs.length) console.log('page errors:\n  ' + errs.map((e) => e.split('\n')[0]).join('\n  '));
  } catch (e) { console.error('FAILED', e && e.stack || e); code = 1; }
  await browser.close?.(); server.close?.();
  process.exit(code);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
