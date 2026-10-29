// tune2.mjs: GB-245's tuning in the measurement that counts (pixels), not in geometry. Same method as probe.mjs (frozen
// clock, shown vs hidden photograph, diff), swept over settings read from a JSON file: { "gun": {"x":..,"y":..,"z":..,"turn":..}, ... }
//   node qa/2026-10-29-GB-245/tune2.mjs <name> <sets.json> [frames]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { readPng, diffPixels } from './png.mjs';
const NAME = process.argv[2] || 'sweep2';
const SETS = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const US = (process.argv[4] || '0.2,0.35,0.5,0.65').split(',').map(Number);
const OUT = 'qa/2026-10-29-GB-245/tune/' + NAME;
fs.mkdirSync(OUT, { recursive: true });
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
const both = `gb245.show('L', true); gb245.show('R', true); gb245.apply(); await wait(130); return 1`;
const none = `gb245.show('L', false); gb245.show('R', false); gb245.apply(); await wait(130); return 1`;
const rows = [];
for (const [gun, sets] of Object.entries(SETS)) {
  for (const [si, S] of sets.entries()) {
    ev(`gb245.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), ${JSON.stringify(S)}); T.setWeapon(T.WEAPON_ORDER.indexOf('${gun}')); T.setViewFirstDbg(true); await wait(650); T.marineIdleDbg().reset(); await wait(300); T.setAmmoDbg('${gun}', 0); await wait(200); T.startReload(); await wait(150); return T.getCurrentWeapon()`);
    const row = { gun, set: S, frames: [] };
    for (const u of US) {
      ev(`gb245.freeze(false); T.reloadClipDbg.hold(${u}); await wait(300); gb245.freeze(true); await wait(110); return 1`);
      const tag = `${gun}-s${si}-u${Math.round(u * 100)}`;
      ev(both); shot(`${OUT}/${tag}-a.png`);
      ev(none); shot(`${OUT}/${tag}-b.png`);
      ev(both);
      let n = null, box = null;
      try { const d = diffPixels(readPng(`${OUT}/${tag}-a.png`), readPng(`${OUT}/${tag}-b.png`)); n = d.n; box = d.n ? [d.minX, d.minY, d.maxX, d.maxY] : null; } catch (e) { n = 'ERR'; }
      row.frames.push({ u, n, box });
      await new Promise((r) => setTimeout(r, 260));
    }
    rows.push(row);
    console.log(`${gun.padEnd(8)} ${JSON.stringify(S).padEnd(52)} ${row.frames.map((f) => String(f.n).padStart(6)).join(' ')}   (u ${US.join(' ')})`);
    fs.writeFileSync(OUT + '/rows.json', JSON.stringify(rows, null, 1));
  }
}
ev(`gb245.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { x: 0.02, y: 0.08, z: 0.04, turn: 1 }); return 1`);
console.log('camera stop: ' + call(['stop']));