// tune.mjs: GB-245's sweep. One camera session; for each setting of FP_RELOAD_LIFT (via TT.fpReloadLiftDbg()), each
// gun and each reload frame, counts each hand's glove pixels separately (shown vs that hand hidden, clock frozen).
//   node qa/2026-10-29-GB-245/tune.mjs <name> '<json list of settings>' [guns,comma] [us,comma]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { readPng, diffPixels } from './png.mjs';
const NAME = process.argv[2] || 'sweep1';
const SETS = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const GUNS = (process.argv[4] || 'm4,sniper').split(',');
const US = (process.argv[5] || '0.35,0.65').split(',').map(Number);
const OUT = 'qa/2026-10-29-GB-245/tune/' + NAME;
fs.mkdirSync(OUT, { recursive: true });
const A = ['--agent', 'grokbot', '--task', 'GB-245'];
const call = (args) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...args, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).trim(); } catch (e) { return 'ERR ' + String((e && (e.stdout || e.stderr)) || e.message).slice(0, 400); } };
const ev = (c) => call(['eval', c]);
const shot = (f) => call(['shot', '--live', '--out', f]);
console.log('camera: ' + call(['start', '--match']));
const HELP = `
window.gb245 = window.gb245 || (() => {
  const ud = T.marine.userData, groups = { L: [], R: [] };
  const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
  for (const grp of ud.dress.gloveOn) { if (under(grp, ud.elbowLG)) groups.L.push(grp); else if (under(grp, ud.elbowRG)) groups.R.push(grp); }
  const G = { groups }, host = TT.inspectHost();
  G.frozen = false; host.attach({ held: () => G.frozen, scale: (d) => d, frame() {} });
  G.freeze = (on) => { G.frozen = !!on; }; G.detach = () => { G.frozen = false; host.attach(null); };
  G.show = (side, on) => { for (const grp of groups[side]) grp.visible = on; };
  G.apply = () => { T.rigSkinDbg.sync(); host.render(); };
  return G;
})();
return JSON.stringify({ L: gb245.groups.L.length, R: gb245.groups.R.length, lift: JSON.stringify(T.fpReloadLiftDbg()) });`;
console.log('setup: ' + ev(`T.runDevCommand('godmode'); T.clearZombies(); T.setViewFirstDbg(true); T.grantAllWeapons(); await wait(900); T.marineIdleDbg().reset(); await wait(500); return T.getCurrentWeapon()`));
console.log('help: ' + ev(HELP));
const both = `gb245.show('L', true); gb245.show('R', true); gb245.apply(); await wait(140); return 1`;
const only = (side) => `gb245.show('L', ${side !== 'L'}); gb245.show('R', ${side !== 'R'}); gb245.apply(); await wait(140); return 1`;
const rows = [];
for (const [si, S] of SETS.entries()) {
  for (const w of GUNS) {
    ev(`gb245.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), ${JSON.stringify(S)}); T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); T.setViewFirstDbg(true); await wait(650); T.marineIdleDbg().reset(); await wait(300); T.setAmmoDbg('${w}', 0); await wait(200); T.startReload(); await wait(150); return T.getCurrentWeapon()`);
    for (const u of US) {
      ev(`gb245.freeze(false); T.reloadClipDbg.hold(${u}); await wait(320); gb245.freeze(true); await wait(120); return 1`);
      const tag = `s${si}-${w}-u${Math.round(u * 100)}`;
      ev(both); shot(`${OUT}/${tag}.png`);
      const cnt = {};
      for (const side of ['L', 'R']) { ev(only(side)); shot(`${OUT}/_tmp.png`); cnt[side] = diffPixels(readPng(`${OUT}/${tag}.png`), readPng(`${OUT}/_tmp.png`)).n; }
      ev(both);
      rows.push({ set: S, gun: w, u, L: cnt.L, R: cnt.R });
      console.log(`s${si} ${JSON.stringify(S)} ${w.padEnd(8)} u=${u}  support(L) ${String(cnt.L).padEnd(7)} firing(R) ${cnt.R}`);
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  fs.writeFileSync(OUT + '/rows.json', JSON.stringify(rows, null, 1));
}
ev(`gb245.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { x: 0.02, y: 0.30, z: 0.04, turn: 1 }); gb245.detach(); return 1`);
console.log('camera stop: ' + call(['stop']));