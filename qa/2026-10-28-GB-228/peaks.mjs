import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const PH = process.argv[2] || 'before';
const A = ['--agent', 'grokbot', '--task', 'GB-228'];
const GUNS = ['pistol', 'revolver', 'uzi', 'ak', 'aa12', 'sniper', 'm4'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cam = (code) => {
  try { return execFileSync(process.execPath, ['tools/camera.mjs', 'eval', code, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
  catch (e) { return 'ERR ' + String(e.stderr || e.message).slice(0, 160); }
};
const M = 'TT.marine.userData.weaponMount';
const pick = (w) => `(TT.grantAllWeapons(), TT.setWeapon(TT.WEAPON_ORDER.indexOf('${w}')), TT.setViewFirstDbg(true), TT.getCurrentWeapon())`;
const arm = `(window.__pk = { y: 0, rz: 0, n: 0 }, window.__pkT0 = performance.now(), clearInterval(window.__pkTimer), window.__pkTimer = setInterval(() => { const m = ${M}; const e = m.rotation; window.__pk.n++; if (Math.abs(e.z) > Math.abs(window.__pk.rz)) window.__pk = { y: +m.position.y.toFixed(4), rz: +e.z.toFixed(4), rx: +e.x.toFixed(4), t: Math.round(performance.now() - window.__pkT0), n: window.__pk.n }; }, 16), 'armed')`;
const fire = "(TT.setMouseFireDbg(true), setTimeout(() => TT.setMouseFireDbg(false), 130), 'fired')";
const reload = "(TT.startReload(), 'reloading')";
const read = `(clearInterval(window.__pkTimer), TT.setViewFirstDbg(false), JSON.stringify({ gun: TT.getCurrentWeapon(), peak: window.__pk }))`;
const rows = [];
for (const w of GUNS) {
  const picked = cam(pick(w));
  await sleep(1400);
  cam(arm);
  cam(fire);
  await sleep(430);
  cam(reload);
  await sleep(1600);
  const line = cam(read);
  let j = null;
  try { j = JSON.parse(line); } catch { j = null; }
  if (j) { rows.push(j); console.log(w.padEnd(9) + ' y ' + String(j.peak.y).padStart(8) + '  rz ' + String(j.peak.rz).padStart(7) + '  n ' + j.peak.n + '  (' + picked + ')'); }
  else console.log(w.padEnd(9) + ' no reading (' + picked + '): ' + line.slice(0, 110));
}
fs.writeFileSync('qa/2026-10-28-GB-228/' + PH + '-peaks.json', JSON.stringify(rows, null, 2));
console.log('wrote ' + rows.length);
