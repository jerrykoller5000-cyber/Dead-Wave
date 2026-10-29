// sides.mjs: GB-245's per-hand count. The spec judges the firing hand and the support hand separately (the support
// hand may leave the frame for its pouch trip, at most a third of the reload), so counting both gloves as one number
// cannot tell a passing reload from a failing one. This measures each hand on its own: photograph the frame, hide
// only the right glove, photograph it, hide only the left, photograph it. The firing hand is the RIGHT (he is
// left-handed, D-75, so the right hand is on the grip).
//   node qa/2026-10-29-GB-245/sides.mjs <name> <guns> <frames> <grid.json>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { readPng, diffPixels } from './png.mjs';
const NAME = process.argv[2] || 'sides1';
const GUNS = (process.argv[3] || 'm4,aa12,sniper').split(',');
const US = (process.argv[4] || '0.2,0.35,0.5,0.65,0.8').split(',').map(Number);
const GRID = JSON.parse(fs.readFileSync(process.argv[5], 'utf8'));
const OUT = 'qa/2026-10-29-GB-245/tune/' + NAME;
fs.mkdirSync(OUT + '/f', { recursive: true });
const A = ['--agent', 'grokbot', '--task', 'GB-245'];
const call = (args) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...args, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).trim(); } catch (e) { return 'ERR ' + String((e && (e.stdout || e.stderr)) || e.message).slice(0, 300); } };
const ev = (c) => call(['eval', c]);
const shot = (f) => call(['shot', '--live', '--out', f]);
console.log('camera: ' + call(['start', '--match']));
const HELP = `
window.gb245s = window.gb245s || (() => {
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
return JSON.stringify({ L: gb245s.groups.L.length, R: gb245s.groups.R.length });`;
console.log('setup: ' + ev(`T.runDevCommand('godmode'); T.clearZombies(); T.setViewFirstDbg(true); T.grantAllWeapons(); await wait(900); T.marineIdleDbg().reset(); await wait(500); return T.getCurrentWeapon()`));
console.log('help: ' + ev(HELP));
const both = `gb245s.show('L', true); gb245s.show('R', true); gb245s.apply(); await wait(130); return 1`;
const noR = `gb245s.show('R', false); gb245s.apply(); await wait(130); return 1`;
const noL = `gb245s.show('L', false); gb245s.apply(); await wait(130); return 1`;
const rows = [];
for (const gun of GUNS) {
  ev(`gb245s.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { up: 0, in: 0, side: 0, tip: 0, turn: 1, cant: 1, hip: 0 }); T.setWeapon(T.WEAPON_ORDER.indexOf('${gun}')); T.setViewFirstDbg(true); await wait(650); T.marineIdleDbg().reset(); await wait(300); T.setAmmoDbg('${gun}', 0); await wait(200); T.startReload(); await wait(150); return T.getCurrentWeapon()`);
  for (const [si, S] of GRID.entries()) {
    const row = { gun, S, frames: [] };
    for (const u of US) {
      ev(`gb245s.show('R', true); gb245s.show('L', true); gb245s.freeze(false); Object.assign(T.fpReloadLiftDbg(), ${JSON.stringify(S)}); T.reloadClipDbg.hold(${u}); await wait(300); gb245s.freeze(true); await wait(110); return 1`);
      const tag = `${OUT}/f/${gun}-g${si}-u${Math.round(u * 100)}`;
      ev(both); shot(tag + '-all.png');
      ev(noR); shot(tag + '-nor.png');
      ev(noL); shot(tag + '-nol.png');
      ev(both);
      let R = null, L = null;
      try { R = diffPixels(readPng(tag + '-all.png'), readPng(tag + '-nor.png')).n; } catch { R = -1; }
      try { L = diffPixels(readPng(tag + '-all.png'), readPng(tag + '-nol.png')).n; } catch { L = -1; }
      row.frames.push({ u, R, L });
      await new Promise((r) => setTimeout(r, 260));
    }
    rows.push(row);
    console.log(`${gun.padEnd(8)} ${JSON.stringify(S).padEnd(62)} ` + row.frames.map((f) => `u${Math.round(f.u * 100)} R${String(f.R).padStart(6)} L${String(f.L).padStart(6)}`).join(' | '));
    fs.writeFileSync(OUT + '/rows.json', JSON.stringify(rows, null, 1));
  }
}
ev(`gb245s.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { up: 0.06, in: 0, side: 0, tip: 0, turn: 1, cant: 1, hip: 0 }); return 1`);
console.log('camera stop: ' + call(['stop']));