// fit.mjs: GB-245's fit. Measures where each wrist bone actually sits in the picture (NDC, y up, |v| > 1 = off that
// edge) for a grid of reload-hold settings, which costs no screenshots. The wrists are real bones of the rig (the
// gloves are baked meshes, so a bounding box would be meaningless), so this is where the hands really are.
//   node qa/2026-10-29-GB-245/fit.mjs <name>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const NAME = process.argv[2] || 'fit1';
const OUT = 'qa/2026-10-29-GB-245/tune/' + NAME;
fs.mkdirSync(OUT, { recursive: true });
const A = ['--agent', 'grokbot', '--task', 'GB-245'];
const call = (args) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...args, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).trim(); } catch (e) { return 'ERR ' + String((e && (e.stdout || e.stderr)) || e.message).slice(0, 300); } };
const ev = (c) => call(['eval', c]);
const GUNS = ['m4', 'ak', 'aa12', 'shotgun', 'sniper', 'launcher', 'uzi'];
const US = [0.25, 0.45, 0.7];
const UPS = [0.02, 0.06, 0.10, 0.16, 0.24];
const TIPS = [0, 0.25, 0.5, 0.75];
const INS = [0, 0.06];
console.log('camera: ' + call(['start', '--match']));
const HELP = `
window.gb245 = window.gb245 || (() => {
  const ud = T.marine.userData, host = TT.inspectHost(), T3 = host.THREE;
  const V = new T3.Vector3(), G = { host };
  G.frozen = false; host.attach({ held: () => G.frozen, scale: (d) => d, frame() {} });
  G.freeze = (on) => { G.frozen = !!on; };
  const wr = (e) => (e && e.userData && e.userData.wrist) || null;
  const wL = wr(ud.elbowLG), wR = wr(ud.elbowRG);
  G.ndc = () => {
    const cam = host.camera, out = {};
    for (const [side, b] of [['L', wL], ['R', wR]]) {
      if (!b) { out[side] = null; continue; }
      b.getWorldPosition(V); V.project(cam);
      out[side] = { x: +V.x.toFixed(3), y: +V.y.toFixed(3), z: +V.z.toFixed(3) };
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
  ev(`gb245.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { up: 0, in: 0, tip: 0, turn: 1 }); T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); T.setViewFirstDbg(true); await wait(650); T.marineIdleDbg().reset(); await wait(300); T.setAmmoDbg('${w}', 0); await wait(200); T.startReload(); await wait(150); return T.getCurrentWeapon()`);
  for (const u of US) {
    ev(`gb245.freeze(false); T.reloadClipDbg.hold(${u}); await wait(260); gb245.freeze(true); await wait(100); return 1`);
    for (const up of UPS) for (const tip of TIPS) for (const ins of INS) {
      const raw = ev(`Object.assign(T.fpReloadLiftDbg(), { up: ${up}, in: ${ins}, tip: ${tip}, turn: 1 }); await wait(110); return JSON.stringify(gb245.ndc())`);
      let n = null; try { n = JSON.parse(raw); } catch {}
      rows.push({ gun: w, u, up, in: ins, tip, ndc: n });
    }
    fs.writeFileSync(OUT + '/fit.json', JSON.stringify(rows));
    const best = rows.filter((r) => r.gun === w).map((r) => {
      const ok = r.ndc && r.ndc.L && r.ndc.R && Math.abs(r.ndc.L.x) < 0.8 && Math.abs(r.ndc.L.y) < 0.8 && Math.abs(r.ndc.R.x) < 0.8 && Math.abs(r.ndc.R.y) < 0.8;
      return { ...r, ok };
    });
    console.log(w.padEnd(8) + ' u=' + u + '  in-frame combos: ' + best.filter((r) => r.ok).length + '/' + best.length);
  }
}
// Print, per gun, the smallest (up, in, tip) that keeps BOTH wrists in frame at every sampled frame.
console.log('\nper gun: settings whose every sampled frame keeps both wrists inside |x|,|y| < 0.8:');
for (const w of GUNS) {
  const sets = {};
  for (const r of rows.filter((x) => x.gun === w)) {
    const k = r.up + '/' + r.in + '/' + r.tip;
    const ok = r.ndc && r.ndc.L && r.ndc.R && Math.abs(r.ndc.L.x) < 0.8 && Math.abs(r.ndc.L.y) < 0.8 && Math.abs(r.ndc.R.x) < 0.8 && Math.abs(r.ndc.R.y) < 0.8;
    sets[k] = (sets[k] === undefined ? true : sets[k]) && ok;
  }
  const good = Object.entries(sets).filter(([, v]) => v).map(([k]) => k);
  console.log(w.padEnd(8) + (good.length ? good.join('  ') : '(none)'));
}
ev(`gb245.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { up: 0.06, in: 0.06, tip: 0.3, turn: 1 }); return 1`);
console.log('camera stop: ' + call(['stop']));