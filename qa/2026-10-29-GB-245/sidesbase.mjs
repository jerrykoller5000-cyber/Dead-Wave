// sidesbase.mjs: GB-245's per-hand baseline for every gun, at rest and mid-reload, in first person.
// The control (sidescheck) showed the method does see the firing glove when it is on screen (pistol 25k px, sniper
// 8k px at the hip), so a zero is a real zero. This settles which hand is actually out of frame, and when.
//   node qa/2026-10-29-GB-245/sidesbase.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { readPng, diffPixels } from './png.mjs';
const OUT = 'qa/2026-10-29-GB-245/tune/sidesbase';
fs.mkdirSync(OUT, { recursive: true });
const A = ['--agent', 'grokbot', '--task', 'GB-245'];
const call = (args) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...args, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).trim(); } catch (e) { return 'ERR ' + String((e && (e.stdout || e.stderr)) || e.message).slice(0, 300); } };
const ev = (c) => call(['eval', c]);
const shot = (f) => call(['shot', '--live', '--out', f]);
console.log('camera: ' + call(['start', '--match']));
const HELP = `
window.gb245b = window.gb245b || (() => {
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
const both = `gb245b.show('L', true); gb245b.show('R', true); gb245b.apply(); await wait(150); return 1`;
const noR = `gb245b.show('R', false); gb245b.apply(); await wait(150); return 1`;
const noL = `gb245b.show('L', false); gb245b.apply(); await wait(150); return 1`;
const rows = [];
async function sample(gun, state, u) {
  const tag = `${OUT}/${gun}-${state}`;
  ev(both); shot(tag + '-all.png');
  ev(noR); shot(tag + '-nor.png');
  ev(noL); shot(tag + '-nol.png');
  ev(both);
  let R = null, L = null;
  try { R = diffPixels(readPng(tag + '-all.png'), readPng(tag + '-nor.png')).n; } catch { R = 'ERR'; }
  try { L = diffPixels(readPng(tag + '-all.png'), readPng(tag + '-nol.png')).n; } catch { L = 'ERR'; }
  const row = { gun, state, u, R, L };
  rows.push(row);
  console.log(`${gun.padEnd(9)} ${state.padEnd(8)} u=${String(u).padEnd(5)} R ${String(R).padStart(7)}  L ${String(L).padStart(7)}`);
  fs.writeFileSync(OUT + '/rows.json', JSON.stringify(rows, null, 1));
}
for (const gun of ['m4', 'ak', 'aa12', 'shotgun', 'sniper', 'launcher', 'pistol', 'revolver', 'uzi']) {
  // A long settle after the switch: the swap dips the gun, and the first m4 read in sidescheck caught that dip.
  ev(`gb245b.freeze(false); T.reloadClipDbg.hold(null); T.setViewFirstDbg(true); T.setWeapon(T.WEAPON_ORDER.indexOf('${gun}')); await wait(1600); T.marineIdleDbg().reset(); await wait(700); gb245b.freeze(true); await wait(200); return T.getCurrentWeapon()`);
  await sample(gun, 'rest', '-');
  ev(`gb245b.freeze(false); T.setAmmoDbg('${gun}', 0); await wait(250); T.startReload(); await wait(150); T.reloadClipDbg.hold(0.5); await wait(350); gb245b.freeze(true); await wait(200); return T.isReloading()`);
  await sample(gun, 'reload', 0.5);
  ev(`gb245b.freeze(false); T.reloadClipDbg.hold(null); await wait(300); return 1`);
}
ev(`gb245b.freeze(false); T.reloadClipDbg.hold(null); return 1`);
console.log('camera stop: ' + call(['stop']));