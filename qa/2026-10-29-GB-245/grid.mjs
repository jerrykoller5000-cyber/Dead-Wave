// grid.mjs: GB-245's wide fit sweep in THE measurement that counts (glove pixels), one camera session, no screenshots
// beyond the pair each sample needs. Settings: up (m, camera space up), in (m, toward him), tip (rad, muzzle down),
// cant (rad, roll about the gun's own axis), turn (how much of GB-233's reload tilt stays).
//   node qa/2026-10-29-GB-245/grid.mjs <name> <guns> <frames> <grid.json>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { readPng, diffPixels } from './png.mjs';
const NAME = process.argv[2] || 'grid1';
const GUNS = (process.argv[3] || 'm4,aa12,sniper').split(',');
const US = (process.argv[4] || '0.35,0.6').split(',').map(Number);
const GRID = JSON.parse(fs.readFileSync(process.argv[5], 'utf8'));
const OUT = 'qa/2026-10-29-GB-245/tune/' + NAME;
fs.mkdirSync(OUT + '/f', { recursive: true });
const WIDTH = +(process.env.GB245_W || 0);
const A = ['--agent', 'grokbot', '--task', 'GB-245'];
const call = (args) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...args, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).trim(); } catch (e) { return 'ERR ' + String((e && (e.stdout || e.stderr)) || e.message).slice(0, 300); } };
const ev = (c) => call(['eval', c]);
const shot = (f) => call(['shot', '--live', '--out', f]);
console.log('camera: ' + call(['start', '--match']));
const HELP = `
window.gb245 = window.gb245 || (() => {
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
console.log('setup: ' + ev(`T.runDevCommand('godmode'); T.clearZombies(); T.setViewFirstDbg(true); T.grantAllWeapons(); await wait(900); T.marineIdleDbg().reset(); await wait(500); return T.getCurrentWeapon()`));
console.log('help: ' + ev(HELP));
const both = `gb245.show('L', true); gb245.show('R', true); gb245.apply(); await wait(120); return 1`;
const none = `gb245.show('L', false); gb245.show('R', false); gb245.apply(); await wait(120); return 1`;
const rows = [];
for (const gun of GUNS) {
  ev(`gb245.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { up: 0, in: 0, tip: 0, turn: 1 }); T.setWeapon(T.WEAPON_ORDER.indexOf('${gun}')); T.setViewFirstDbg(true); await wait(650); T.marineIdleDbg().reset(); await wait(300); T.setAmmoDbg('${gun}', 0); await wait(200); T.startReload(); await wait(150); return T.getCurrentWeapon()`);
  for (const [si, S] of GRID.entries()) {
    const row = { gun, S, frames: [] };
    for (const u of US) {
      ev(`gb245.freeze(false); Object.assign(T.fpReloadLiftDbg(), ${JSON.stringify(S)}); T.reloadClipDbg.hold(${u}); await wait(280); gb245.freeze(true); await wait(110); return 1`);
      const tag = `${OUT}/f/${gun}-g${si}-u${Math.round(u * 100)}`;
      ev(both); shot(tag + '-a.png');
      ev(none); shot(tag + '-b.png');
      ev(both);
      let n = null;
      try { n = diffPixels(readPng(tag + '-a.png'), readPng(tag + '-b.png')).n; } catch { n = 'ERR'; }
      row.frames.push({ u, n });
      await new Promise((r) => setTimeout(r, 240));
    }
    rows.push(row);
    console.log(`${gun.padEnd(8)} ${JSON.stringify(S).padEnd(64)} ${row.frames.map((f) => String(f.n).padStart(6)).join(' ')}`);
    fs.writeFileSync(OUT + '/rows.json', JSON.stringify(rows, null, 1));
  }
  console.log('-- ' + gun + ' best: ' + JSON.stringify(rows.filter((r) => r.gun === gun).sort((x, y) => Math.min(...y.frames.map((f) => (typeof f.n === 'number' ? f.n : 0))) - Math.min(...x.frames.map((f) => (typeof f.n === 'number' ? f.n : 0))))[0]));
}
ev(`gb245.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { up: 0.06, in: 0, tip: 0, turn: 1, hip: 0 }); return 1`);
console.log('camera stop: ' + call(['stop']));