// probe.mjs: GB-245's check, the glove-pixel count per frame (Claude's spec: "your glove-pixel count per frame as
// the check").
//
// Each frozen reload frame is photographed twice: once as it is, once with the glove groups hidden and the frame
// drawn again. The pixels that differ between the two are the glove he can see. Nothing else can reach the count,
// and no image library is needed: the PNGs are read back with zlib (png.mjs, AGENTS.md rule 12).
//
//   node qa/2026-10-29-GB-245/probe.mjs before|after        (inside the game-test slot lease)
//
// Writes <phase>/counts.json, <phase>/frames/ (both photographs of every sample) and <phase>/strips/ (the six
// filmstrip frames per gun, which are the "shown" photographs).
//
// Two things about the game are load-bearing here:
//  - the camera must stay loaded: started per call, every call would load a fresh game and nothing would persist.
//  - the marine's rigid parts are baked into skinned meshes (CL-210) and a source's `visible` is part of what the
//    bake compares, so hiding a glove group and syncing re-bakes the body without it. The bake hands a source back
//    if it changes three times in three seconds, so each group flips twice per sample and samples are paced.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { readPng, diffPixels } from './png.mjs';

const PHASE = process.argv[2] || 'before';
const OUT = 'qa/2026-10-29-GB-245/' + PHASE;
const A = ['--agent', 'grokbot', '--task', 'GB-245'];
fs.mkdirSync(OUT + '/frames', { recursive: true });
fs.mkdirSync(OUT + '/strips', { recursive: true });

const call = (args) => {
  try { return execFileSync(process.execPath, ['tools/camera.mjs', ...args, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).trim(); }
  catch (e) { return 'ERR ' + String((e && (e.stdout || e.stderr)) || e.message).slice(0, 500); }
};
const ev = (code) => call(['eval', code]);
const shot = (f) => call(['shot', '--live', '--out', f]);

console.log('camera: ' + call(['start', '--match']));

const GUNS = ['m4', 'ak', 'aa12', 'shotgun', 'sniper', 'launcher', 'pistol', 'revolver', 'uzi'];
const US = [0.05, 0.2, 0.35, 0.5, 0.65, 0.8];   // six frames across each reload, clear of both ends

const HELP = `
window.gb245 = window.gb245 || (() => {
  const ud = T.marine.userData, groups = { L: [], R: [] };
  const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
  for (const grp of ud.dress.gloveOn) {
    if (under(grp, ud.elbowLG)) groups.L.push(grp);
    else if (under(grp, ud.elbowRG)) groups.R.push(grp);
  }
  const G = { groups };
  // Hide or show a hand's glove and put the change on screen: the bake is what takes it off the render layers.
  G.show = (side, on) => { for (const grp of groups[side]) grp.visible = on; };
  // The game's clock is frozen around each pair of photographs (the inspector's hold, CL-196: held, the frame is drawn
  // but the game does not run), so the sky, smoke, fires and his breathing cannot move between the two pictures.
  const host = TT.inspectHost();
  G.frozen = false;
  host.attach({ held: () => G.frozen, scale: (d) => d, frame() {} });
  G.freeze = (on) => { G.frozen = !!on; };
  G.detach = () => { G.frozen = false; host.attach(null); };
  G.apply = () => { T.rigSkinDbg.sync(); host.render(); };
  return G;
})();
return JSON.stringify({ groupsL: gb245.groups.L.length, groupsR: gb245.groups.R.length });`;

const pick = (w) => `
T.reloadClipDbg.hold(null);
T.marineIdleDbg().reset(); T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); T.setViewFirstDbg(true);
await wait(650); T.marineIdleDbg().reset(); await wait(350);
T.setAmmoDbg('${w}', 0);
await wait(250);
T.startReload();
await wait(150);
return JSON.stringify({ want: '${w}', w: T.getCurrentWeapon(), reloading: T.isReloading(), dbg: T.getReloadDbg() });`;

const holdAt = (u) => `gb245.freeze(false); T.reloadClipDbg.hold(${u}); await wait(320); gb245.freeze(true); await wait(120); return 'held ' + ${u}`;
const withGloves = `gb245.show('L', true); gb245.show('R', true); gb245.apply(); await wait(140); return 'shown'`;
const withoutGloves = `gb245.show('L', false); gb245.show('R', false); gb245.apply(); await wait(140); return 'hidden'`;

console.log('help: ' + ev(HELP));
const setup = `
T.runDevCommand('godmode'); T.clearZombies(); T.setViewFirstDbg(true); T.grantAllWeapons();
await wait(900); T.marineIdleDbg().reset(); await wait(500);
return JSON.stringify({ fp: T.fpDbg().first, idle: T.marineIdleDbg().state.phase, weapon: T.getCurrentWeapon(), skin: T.rigSkinDbg.info().bakes });`;
console.log('setup: ' + ev(setup));
ev(HELP);

const rows = [];
for (const w of GUNS) {
  ev(`gb245.freeze(false); return 'run'`);
  const p = ev(pick(w));
  let ok = false;
  try { ok = JSON.parse(p).w === w; } catch { ok = false; }
  console.log(w.padEnd(9) + ' ' + p + (ok ? '' : '   ! WEAPON DID NOT SWITCH'));
  const row = { gun: w, pick: p, switched: ok, frames: [] };
  // A control before the samples: the same held pose photographed twice with nothing changed. Whatever it counts is
  // the noise floor this measurement has (a drifting mote, an animated detail); the glove counts have to clear it.
  ev(holdAt(0.5));
  ev(withGloves);
  shot(OUT + '/frames/' + w + '-control-a.png');
  ev(withGloves);
  shot(OUT + '/frames/' + w + '-control-b.png');
  const ctl = diffPixels(readPng(OUT + '/frames/' + w + '-control-a.png'), readPng(OUT + '/frames/' + w + '-control-b.png'));
  row.noise = ctl.n;
  console.log('   control (no change at all): ' + ctl.n + ' pixel(s)');
  for (const u of US) {
    const tag = w + '-u' + Math.round(u * 100);
    ev(holdAt(u));
    // Shown first: this photograph is also the filmstrip frame.
    ev(withGloves);
    const shownFile = OUT + '/frames/' + tag + '-gloves.png';
    shot(shownFile);
    ev(withoutGloves);
    const hiddenFile = OUT + '/frames/' + tag + '-nogloves.png';
    shot(hiddenFile);
    ev(withGloves);
    let count = null, box = null;
    try {
      const d = diffPixels(readPng(shownFile), readPng(hiddenFile));
      count = d.n;
      box = d.n ? [d.minX, d.minY, d.maxX, d.maxY] : null;
    } catch (e) { count = 'ERR ' + e.message; }
    fs.copyFileSync(shownFile, OUT + '/strips/' + tag + '.png');
    row.frames.push({ u, glovePixels: count, box });
    console.log('   u=' + String(u).padEnd(5) + ' glove pixels ' + String(count).padEnd(7) + (box ? 'box ' + box.join(',') : ''));
    await new Promise((r) => setTimeout(r, 400));   // space the samples past the skin's hand-back window
  }
  ev(`gb245.freeze(false); T.reloadClipDbg.hold(null); await wait(150); return 'released'`);
  rows.push(row);
  fs.writeFileSync(OUT + '/counts.json', JSON.stringify(rows, null, 2));
}
console.log('wrote ' + OUT + '/counts.json');
console.log('detach: ' + ev(`gb245.detach(); return 'detached'`));
console.log('camera stop: ' + call(['stop']));