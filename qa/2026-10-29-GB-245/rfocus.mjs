// rfocus.mjs: GB-245's firing-hand search. One gun, a few held frames, a list of tuning settings, and the per-hand
// count for each: R is the firing hand (the right glove, he is left-handed D-75, so the right hand is on the grip),
// L the support hand. The baseline showed R goes to 0 on every long gun mid-reload while L keeps thousands of
// pixels, so this searches for what brings R back: muzzle dip both ways (only positive 0.35/0.70 was ever tried),
// the cant both ways (only 0.5/1.0/0 was ever tried), and side.
//   node qa/2026-10-29-GB-245/rfocus.mjs <gun> <u,u,...> <grid.json> <name>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { readPng, diffPixels } from './png.mjs';
const GUN = process.argv[2] || 'ak';
const US = (process.argv[3] || '0.35,0.5').split(',').map(Number);
const GRID = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
const NAME = process.argv[5] || 'rfocus1';
const OUT = 'qa/2026-10-29-GB-245/tune/' + NAME;
fs.mkdirSync(OUT, { recursive: true });
const A = ['--agent', 'grokbot', '--task', 'GB-245'];
const call = (args) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...args, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).trim(); } catch (e) { return 'ERR ' + String((e && (e.stdout || e.stderr)) || e.message).slice(0, 300); } };
const ev = (c) => call(['eval', c]);
const shot = (f) => call(['shot', '--live', '--out', f]);
console.log('camera: ' + call(['start', '--match']));
const HELP = `
window.gb245r = window.gb245r || (() => {
  const ud = T.marine.userData, groups = { L: [], R: [] }, host = TT.inspectHost();
  const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
  for (const grp of ud.dress.gloveOn) { if (under(grp, ud.elbowLG)) groups.L.push(grp); else if (under(grp, ud.elbowRG)) groups.R.push(grp); }
  const G = { groups }; G.frozen = false;
  host.attach({ held: () => G.frozen, scale: (d) => d, frame() {} });
  G.freeze = (on) => { G.frozen = !!on; };
  G.show = (side, on) => { for (const grp of groups[side]) grp.visible = on; };
  G.apply = () => { T.rigSkinDbg.sync(); host.render(); };
  return G;
})();
return 'ok';`;
console.log('help: ' + ev(HELP));
console.log('setup: ' + ev(`T.runDevCommand('godmode'); T.clearZombies(); T.setViewFirstDbg(true); T.grantAllWeapons(); await wait(900); T.marineIdleDbg().reset(); await wait(500); return T.getCurrentWeapon()`));
const both = `gb245r.show('L', true); gb245r.show('R', true); gb245r.apply(); await wait(130); return 1`;
const noR = `gb245r.show('R', false); gb245r.apply(); await wait(130); return 1`;
const noL = `gb245r.show('L', false); gb245r.apply(); await wait(130); return 1`;
const rows = [];
ev(`gb245r.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { up: 0, in: 0, side: 0, tip: 0, turn: 1, cant: 1, hip: 0 }); T.setWeapon(T.WEAPON_ORDER.indexOf('${GUN}')); T.setViewFirstDbg(true); await wait(1600); T.marineIdleDbg().reset(); await wait(700); T.setAmmoDbg('${GUN}', 0); await wait(250); T.startReload(); await wait(150); return T.getCurrentWeapon()`);
for (const [si, S] of GRID.entries()) {
  const row = { gun: GUN, S, frames: [] };
  for (const u of US) {
    ev(`gb245r.show('R', true); gb245r.show('L', true); gb245r.freeze(false); Object.assign(T.fpReloadLiftDbg(), ${JSON.stringify(S)}); T.reloadClipDbg.hold(${u}); await wait(320); gb245r.freeze(true); await wait(120); return 1`);
    const tag = `${OUT}/f/${GUN}-g${si}-u${Math.round(u * 100)}`;
    fs.mkdirSync(OUT + '/f', { recursive: true });
    ev(both); shot(tag + '-all.png');
    ev(noR); shot(tag + '-nor.png');
    ev(noL); shot(tag + '-nol.png');
    ev(both);
    let R = null, L = null;
    try { R = diffPixels(readPng(tag + '-all.png'), readPng(tag + '-nor.png')).n; } catch { R = -1; }
    try { L = diffPixels(readPng(tag + '-all.png'), readPng(tag + '-nol.png')).n; } catch { L = -1; }
    row.frames.push({ u, R, L });
    await new Promise((r) => setTimeout(r, 220));
  }
  rows.push(row);
  console.log(`${JSON.stringify(S).padEnd(70)} ` + row.frames.map((f) => `u${Math.round(f.u * 100)} R${String(f.R).padStart(6)} L${String(f.L).padStart(6)}`).join(' | '));
  fs.writeFileSync(OUT + '/rows.json', JSON.stringify(rows, null, 1));
}
ev(`gb245r.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { up: 0.06, in: 0, side: 0, tip: 0, turn: 1, cant: 1, hip: 0 }); return 1`);
console.log('camera stop: ' + call(['stop']));