// where.mjs: GB-245's geometry probe. For each gun and each frozen reload frame it projects each glove's bounding-box
// centre to the screen (NDC, x and y in -1..1, y up), which says exactly where a hand sits and how far off-frame it is,
// instead of guessing from a pixel count. One camera session, no edit per guess.
//   node qa/2026-10-29-GB-245/where.mjs <name> [guns] [us]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const NAME = process.argv[2] || 'where1';
const GUNS = (process.argv[3] || 'm4,ak,aa12,shotgun,sniper,launcher,pistol,revolver,uzi').split(',');
const US = (process.argv[4] || '0.05,0.2,0.35,0.5,0.65,0.8').split(',').map(Number);
const OUT = 'qa/2026-10-29-GB-245/tune/' + NAME;
fs.mkdirSync(OUT, { recursive: true });
const A = ['--agent', 'grokbot', '--task', 'GB-245'];
const call = (args) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...args, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).trim(); } catch (e) { return 'ERR ' + String((e && (e.stdout || e.stderr)) || e.message).slice(0, 300); } };
const ev = (c) => call(['eval', c]);
console.log('camera: ' + call(['start', '--match']));
const HELP = `
window.gb245 = window.gb245 || (() => {
  const ud = T.marine.userData, groups = { L: [], R: [] }, host = TT.inspectHost();
  const under = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
  for (const grp of ud.dress.gloveOn) { if (under(grp, ud.elbowLG)) groups.L.push(grp); else if (under(grp, ud.elbowRG)) groups.R.push(grp); }
  const G = { groups, host, B: null, V: null };
  const T3 = host.THREE; G.B = new T3.Box3(); G.V = new T3.Vector3(); const B = G.B, V = G.V;
  G.frozen = false; host.attach({ held: () => G.frozen, scale: (d) => d, frame() {} });
  G.freeze = (on) => { G.frozen = !!on; };
  // NDC of each hand's box centre and its box size in NDC. y up; |x| or |y| over 1 means off that edge.
  G.where = () => {
    const cam = host.camera, out = {};
    for (const side of ['L', 'R']) {
      B.makeEmpty();
      for (const g of groups[side]) B.expandByObject(g);
      if (B.isEmpty()) { out[side] = null; continue; }
      const c = B.getCenter(V.clone()), a = c.clone().project(cam);
      const b = B.max.clone().project(cam), d = B.min.clone().project(cam);
      out[side] = { x: +a.x.toFixed(3), y: +a.y.toFixed(3), z: +a.z.toFixed(3), w: +Math.abs(b.x - d.x).toFixed(3), h: +Math.abs(b.y - d.y).toFixed(3) };
    }
    return out;
  };
  return G;
})();
return 'ok';`;
console.log('setup: ' + ev(`T.runDevCommand('godmode'); T.clearZombies(); T.setViewFirstDbg(true); T.grantAllWeapons(); await wait(900); T.marineIdleDbg().reset(); await wait(500); return T.getCurrentWeapon()`));
console.log('help: ' + ev(HELP));
const rows = [];
for (const w of GUNS) {
  ev(`gb245.freeze(false); T.reloadClipDbg.hold(null); T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); T.setViewFirstDbg(true); await wait(650); T.marineIdleDbg().reset(); await wait(300); T.setAmmoDbg('${w}', 0); await wait(200); T.startReload(); await wait(150); return T.getCurrentWeapon()`);
  for (const u of [null, ...US]) {
    ev(`gb245.freeze(false); T.reloadClipDbg.hold(${u}); await wait(300); gb245.freeze(true); await wait(100); return 1`);
    const raw = ev(`return JSON.stringify(gb245.where())`);
    let wh = null; try { wh = JSON.parse(raw); } catch {}
    rows.push({ gun: w, u, where: wh });
    const f = (o) => o ? `x${String(o.x).padStart(7)} y${String(o.y).padStart(7)} w${String(o.w).padStart(6)} h${String(o.h).padStart(6)}` : '(none)';
    console.log(`${w.padEnd(8)} u=${u == null ? 'idle' : u}   L ${f(wh && wh.L)}   R ${f(wh && wh.R)}`);
  }
  fs.writeFileSync(OUT + '/where.json', JSON.stringify(rows, null, 1));
}
ev(`gb245.freeze(false); T.reloadClipDbg.hold(null); return 1`);
console.log('camera stop: ' + call(['stop']));