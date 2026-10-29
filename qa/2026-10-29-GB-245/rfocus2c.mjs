// rfocus2c.mjs: rfocus2.mjs plus a discarded warm-up sample per gun.
//
// Why: the first sample after a gun switch sometimes caught a stale frame before the first-person view settled (one m4 and
// one uzi u10 tile was the outdoor tower scene, and several u10 counts came back MERGED), so the first of the six frames
// was not trustworthy evidence. This takes one full four-state photo set first and throws it away, then samples cleanly.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { readPng, diffPixels } from './png.mjs';
const GUNS = (process.argv[2] || 'ak').split(',');
const US = (process.argv[3] || '0.35,0.5,0.65').split(',').map(Number);
const GRID = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
const NAME = process.argv[5] || 'rfocus2c';
const OUT = 'qa/2026-10-29-GB-245/tune/' + NAME;
fs.mkdirSync(OUT + '/f', { recursive: true });
const A = ['--agent', 'grokbot', '--task', 'GB-245'];
const call = (args) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...args, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).trim(); } catch (e) { return 'ERR ' + String((e && (e.stdout || e.stderr)) || e.message).slice(0, 300); } };
const ev = (c) => call(['eval', c]);
const shot = (f) => call(['shot', '--live', '--out', f]);
console.log('camera: ' + call(['start', '--match']));
const HELP = `
window.gb245r2c = window.gb245r2c || (() => {
  const ud = T.marine.userData, groups = { L: [], R: [] }, host = TT.inspectHost();
  const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
  for (const grp of ud.dress.gloveOn) { if (under(grp, ud.elbowLG)) groups.L.push(grp); else if (under(grp, ud.elbowRG)) groups.R.push(grp); }
  const G = { groups }; G.frozen = false;
  host.attach({ held: () => G.frozen, scale: (d) => d, frame() {} });
  G.freeze = (on) => { G.frozen = !!on; };
  G.set = (r, l) => { for (const grp of groups.R) grp.visible = r; for (const grp of groups.L) grp.visible = l; };
  G.apply = () => { T.rigSkinDbg.sync(); host.render(); };
  return G;
})();
return 'ok';`;
console.log('help: ' + ev(HELP));
console.log('setup: ' + ev(`T.runDevCommand('godmode'); T.clearZombies(); T.setViewFirstDbg(true); T.grantAllWeapons(); await wait(900); T.marineIdleDbg().reset(); await wait(500); return T.getCurrentWeapon()`));
const state = (r, l) => `gb245r2c.set(${r}, ${l}); gb245r2c.apply(); await wait(150); return 1`;
const rows = [];
for (const GUN of GUNS) {
ev(`gb245r2c.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { up: 0, in: 0, side: 0, tip: 0, turn: 1, cant: 1, hip: 0 }); T.setWeapon(T.WEAPON_ORDER.indexOf('${GUN}')); T.setViewFirstDbg(true); await wait(1600); T.marineIdleDbg().reset(); await wait(700); T.setAmmoDbg('${GUN}', 0); await wait(250); T.startReload(); await wait(150); return T.getCurrentWeapon()`);
// the warm-up: one full four-state set at the first grid row, then thrown away
ev(`gb245r2c.freeze(false); gb245r2c.set(true, true); Object.assign(T.fpReloadLiftDbg(), ${JSON.stringify(GRID[0])}); T.reloadClipDbg.hold(0.2); await wait(340); gb245r2c.freeze(true); await wait(130); return 1`);
for (const s of [['true','true'],['false','true'],['true','false'],['false','false']]) { ev(state(s[0], s[1])); shot(`${OUT}/f/${GUN}-warm-${s[1] === 'true' ? 'R' : 'noR'}${s[0] === 'true' ? 'L' : 'noL'}.png`); }
ev(state('true','true'));
console.log(GUN + ': warm-up done');
const n = (f) => { try { return diffPixels(readPng(f[0]), readPng(f[1])).n; } catch { return -1; } };
for (const [si, S] of GRID.entries()) {
  const row = { gun: GUN, S, frames: [] };
  for (const u of US) {
    ev(`gb245r2c.freeze(false); gb245r2c.set(true, true); Object.assign(T.fpReloadLiftDbg(), ${JSON.stringify(S)}); T.reloadClipDbg.hold(${u}); await wait(340); gb245r2c.freeze(true); await wait(130); return 1`);
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
    row.frames.push({ u, R, L, R1, R2, L1, L2, all, merged });
    await new Promise((r) => setTimeout(r, 230));
  }
  rows.push(row);
  console.log(`${GUN} ${JSON.stringify(S).padEnd(72)} ` + row.frames.map((f) => `u${Math.round(f.u * 100)} R${String(f.R).padStart(6)} L${String(f.L).padStart(6)}${f.merged ? ' MERGED' : ''}`).join(' | '));
  fs.writeFileSync(OUT + '/rows.json', JSON.stringify(rows, null, 1));
}
ev(`gb245r2c.freeze(false); T.reloadClipDbg.hold(null); return 1`);
}
ev(`gb245r2c.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { up: 0.02, in: 0.04, side: 0, tip: 0, turn: 0, cant: 0.4, hip: 0 }); return 1`);
console.log('camera stop: ' + call(['stop']));
