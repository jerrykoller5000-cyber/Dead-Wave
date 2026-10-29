import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const PH = process.argv[2] || 'after';
const A = ['--agent', 'grokbot', '--task', 'GB-228'];
const GUNS = ['uzi', 'pistol', 'revolver', 'sniper', 'ak', 'aa12', 'm4'];
const cam = (c) => { try { return execFileSync(process.execPath, ["tools/camera.mjs", "eval", c, ...A], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); } catch (e) { return "ERR " + String(e.stderr || e.message).slice(0, 120); } };
const rows = [];
for (const w of GUNS) {
  const code = "const M = T.marine.userData.weaponMount; T.setViewFirstDbg(true); T.marineIdleDbg().reset(); await new Promise(r => setTimeout(r, 700)); T.setWeapon(T.WEAPON_ORDER.indexOf(\u0027" + w + "\u0027)); await new Promise(r => setTimeout(r, 700)); T.marineIdleDbg().reset(); await new Promise(r => setTimeout(r, 400)); T.setViewFirstDbg(true); T.setAmmoDbg(\u0027" + w + "\u0027, 2); await new Promise(r => setTimeout(r, 900)); const rest = { y: M.position.y, rz: M.rotation.z }; T.startReload(); let lo = rest.y, hi = rest.y, loRz = 0, n = 0; for (let i = 0; i < 45; i++) { n++; if (M.position.y < lo) { lo = M.position.y; loRz = M.rotation.z - rest.rz; } hi = Math.max(hi, M.position.y); await new Promise(r => setTimeout(r, 55)); } return JSON.stringify({ gun: T.getCurrentWeapon(), rest: +rest.y.toFixed(5), lo: +lo.toFixed(5), hi: +hi.toFixed(5), dip: +(lo - rest.y).toFixed(5), rise: +(hi - rest.y).toFixed(5), rzAtDip: +loRz.toFixed(4), n })";
  const r = cam(code);
  console.log(w.padEnd(9) + " " + r);
  rows.push(r);
}
fs.writeFileSync("qa/2026-10-28-GB-228/" + PH + "-mount.json", rows.join("\n"));
console.log("done " + rows.length);
