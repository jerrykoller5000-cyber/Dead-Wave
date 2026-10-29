// sidescheck.mjs: is the per-hand count trustworthy? The firing hand (right glove) read 0 visible pixels in EVERY
// grid6 sample, even a 0.40 m lift. Before that is believed it has to be shown the count can see that hand at all:
// this photographs poses where the firing hand must be on screen (first-person hip hold, aimed, and a third-person
// look at the marine) and counts each glove on its own by the same hide-one-glove method.
//   node qa/2026-10-29-GB-245/sidescheck.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { readPng, diffPixels } from './png.mjs';
const OUT = 'qa/2026-10-29-GB-245/tune/sidescheck';
fs.mkdirSync(OUT, { recursive: true });
const A = ['--agent', 'grokbot', '--task', 'GB-245'];
const call = (args) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...args, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).trim(); } catch (e) { return 'ERR ' + String((e && (e.stdout || e.stderr)) || e.message).slice(0, 300); } };
const ev = (c) => call(['eval', c]);
const shot = (f) => call(['shot', '--live', '--out', f]);
console.log('camera: ' + call(['start', '--match']));
const HELP = `
window.gb245c = window.gb245c || (() => {
  const ud = T.marine.userData, groups = { L: [], R: [] }, host = TT.inspectHost();
  const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
  for (const grp of ud.dress.gloveOn) { if (under(grp, ud.elbowLG)) groups.L.push(grp); else if (under(grp, ud.elbowRG)) groups.R.push(grp); }
  const G = { groups }; G.frozen = false;
  host.attach({ held: () => G.frozen, scale: (d) => d, frame() {} });
  G.freeze = (on) => { G.frozen = !!on; };
  G.show = (side, on) => { for (const grp of groups[side]) grp.visible = on; };
  G.apply = () => { T.rigSkinDbg.sync(); host.render(); };
  G.info = () => JSON.stringify({ L: groups.L.map(g=>g.name), R: groups.R.map(g=>g.name), armL: !!(ud.armLG&&ud.armLG.visible), armR: !!(ud.armRG&&ud.armRG.visible), head: !!(ud.headG&&ud.headG.visible) });
  return G;
})();
return gb245c.info();`;
console.log('help: ' + ev(HELP));
console.log('setup: ' + ev(`T.runDevCommand('godmode'); T.clearZombies(); T.grantAllWeapons(); await wait(900); T.marineIdleDbg().reset(); await wait(500); return 1`));
const both = `gb245c.show('L', true); gb245c.show('R', true); gb245c.apply(); await wait(140); return 1`;
const noR = `gb245c.show('R', false); gb245c.apply(); await wait(140); return 1`;
const noL = `gb245c.show('L', false); gb245c.apply(); await wait(140); return 1`;
const rows = [];
async function sample(name, gun) {
  ev(`gb245c.freeze(false); gb245c.show('L', true); gb245c.show('R', true); T.reloadClipDbg.hold(null); T.setWeapon(T.WEAPON_ORDER.indexOf('${gun}')); await wait(700); T.marineIdleDbg().reset(); await wait(400); gb245c.freeze(true); await wait(150); return gb245c.info()`);
  const tag = OUT + '/' + name;
  ev(both); shot(tag + '-all.png');
  ev(noR); shot(tag + '-nor.png');
  ev(noL); shot(tag + '-nol.png');
  ev(both);
  let R = null, L = null;
  try { R = diffPixels(readPng(tag + '-all.png'), readPng(tag + '-nor.png')).n; } catch (e) { R = 'ERR'; }
  try { L = diffPixels(readPng(tag + '-all.png'), readPng(tag + '-nol.png')).n; } catch (e) { L = 'ERR'; }
  const info = ev(`return gb245c.info()`);
  const row = { name, gun, R, L, info };
  rows.push(row);
  console.log(`${name.padEnd(22)} R ${String(R).padStart(7)}  L ${String(L).padStart(7)}  ${info}`);
  fs.writeFileSync(OUT + '/rows.json', JSON.stringify(rows, null, 1));
}
for (const gun of ['m4', 'pistol', 'sniper']) {
  ev(`gb245c.freeze(false); T.setViewFirstDbg(true); return 1`);
  await sample(gun + '-fp-hip', gun);
  ev(`gb245c.freeze(false); T.setViewFirstDbg(false); await wait(400); gb245c.freeze(true); await wait(150); return 1`);
  await sample(gun + '-tp-shoulder', gun);
}
ev(`gb245c.freeze(false); T.reloadClipDbg.hold(null); T.setViewFirstDbg(true); return 1`);
console.log('camera stop: ' + call(['stop']));