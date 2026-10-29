// rfocus3b.mjs: rfocus2 with one extra reading per sample - where each glove's fist point lands on screen (ndc), so a
// zero pixel count can be told apart: off the bottom of the frame, or behind the gun. The ndc is a diagnostic only; the
// number that decides anything is still the hide-one-glove pixel count.
//   node qa/2026-10-29-GB-245/rfocus3b.mjs <gun> <u,u,...> <grid.json> <name>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { readPng, diffPixels } from './png.mjs';
const GUNS = (process.argv[2] || 'uzi').split(',');
const US = (process.argv[3] || '0.35,0.5,0.65').split(',').map(Number);
const GRID = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
const NAME = process.argv[5] || 'rfocus3b';
const OUT = 'qa/2026-10-29-GB-245/tune/' + NAME;
fs.mkdirSync(OUT + '/f', { recursive: true });
const A = ['--agent', 'grokbot', '--task', 'GB-245'];
const call = (args) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...args, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).trim(); } catch (e) { return 'ERR ' + String((e && (e.stdout || e.stderr)) || e.message).slice(0, 300); } };
const ev = (c) => call(['eval', c]);
const shot = (f) => call(['shot', '--live', '--out', f]);
console.log('camera: ' + call(['start', '--match']));
const HELP = `
window.gb245r2 = window.gb245r2 || (() => {
  const ud = T.marine.userData, groups = { L: [], R: [] }, host = TT.inspectHost();
  const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
  for (const grp of ud.dress.gloveOn) { if (under(grp, ud.elbowLG)) groups.L.push(grp); else if (under(grp, ud.elbowRG)) groups.R.push(grp); }
  const G = { groups }; G.frozen = false;
  host.attach({ held: () => G.frozen, scale: (d) => d, frame() {} });
  G.freeze = (on) => { G.frozen = !!on; };
  G.set = (r, l) => { for (const grp of groups.R) grp.visible = r; for (const grp of groups.L) grp.visible = l; };
  G.apply = () => { T.rigSkinDbg.sync(); host.render(); };
  // diagnostic: the fist point of each hand in ndc (z<1 in front of the camera)
  G.ndc = () => {
    const out = {};
    for (const s of ['R', 'L']) {
      const v = T.handsDbg.gripPoint(s).project(TT.camera);
      out[s] = { x: +v.x.toFixed(2), y: +v.y.toFixed(2), z: +v.z.toFixed(3) };
    }
    return JSON.stringify(out);
  };
  return G;
})();
return 'ok';`;
console.log('help: ' + ev(HELP));
console.log('setup: ' + ev(`T.runDevCommand('godmode'); T.clearZombies(); T.setViewFirstDbg(true); T.grantAllWeapons(); await wait(900); T.marineIdleDbg().reset(); await wait(500); return T.getCurrentWeapon()`));
const state = (r, l) => `gb245r2.set(${r}, ${l}); gb245r2.apply(); await wait(150); return 1`;
const rows = [];
for (const GUN of GUNS) {
ev(`gb245r2.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { up: 0, in: 0, side: 0, fwd: 0, tip: 0, turn: 1, cant: 1, hip: 0 }); T.setWeapon(T.WEAPON_ORDER.indexOf('${GUN}')); T.setViewFirstDbg(true); await wait(1600); T.marineIdleDbg().reset(); await wait(700); T.setAmmoDbg('${GUN}', 0); await wait(250); T.startReload(); await wait(150); return T.getCurrentWeapon()`);
const n = (f) => { try { return diffPixels(readPng(f[0]), readPng(f[1])).n; } catch { return -1; } };
for (const [si, S] of GRID.entries()) {
  const row = { gun: GUN, S, frames: [] };
  for (const u of US) {
    const nd = ev(`gb245r2.freeze(false); gb245r2.set(true, true); Object.assign(T.fpReloadLiftDbg(), ${JSON.stringify(S)}); T.reloadClipDbg.hold(${u}); await wait(340); gb245r2.freeze(true); await wait(130); return gb245r2.ndc()`);
    const tag = `${OUT}/f/${GUN}-g${si}-u${Math.round(u * 100)}`;
    ev(state('true', 'true')); shot(tag + '-both.png');
    ev(state('false', 'true')); shot(tag + '-noR.png');
    ev(state('true', 'false')); shot(tag + '-noL.png');
    ev(state('false', 'false')); shot(tag + '-none.png');
    ev(state('true', 'true'));
    const L1 = n([tag + '-both.png', tag + '-noL.png']), L2 = n([tag + '-noR.png', tag + '-none.png']);
    const R1 = n([tag + '-both.png', tag + '-noR.png']), R2 = n([tag + '-noL.png', tag + '-none.png']);
    const all = n([tag + '-both.png', tag + '-none.png']);
    const merged = L1 === R1 && L1 === all;
    const R = Math.min(R1, R2), L = Math.min(L1, L2);
    row.frames.push({ u, R, L, R1, R2, L1, L2, all, merged, ndc: nd });
    await new Promise((r) => setTimeout(r, 230));
  }
  rows.push(row);
  console.log(`${JSON.stringify(S).padEnd(70)} ` + row.frames.map((f) => `u${Math.round(f.u * 100)} R${String(f.R).padStart(6)} L${String(f.L).padStart(6)}${f.merged ? ' MERGED' : ''}`).join(' | '));
  fs.writeFileSync(OUT + '/rows.json', JSON.stringify(rows, null, 1));
}
ev(`gb245r2.freeze(false); T.reloadClipDbg.hold(null); return 1`);
}
ev(`gb245r2.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { up: 0.06, in: 0, side: 0, fwd: 0, tip: 0, turn: 1, cant: 1, hip: 0 }); return 1`);
console.log('camera stop: ' + call(['stop']));
