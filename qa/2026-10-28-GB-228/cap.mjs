import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const PH = process.argv[2] || 'after';
const A = ['--agent', 'grokbot', '--task', 'GB-228'];
const GUNS = ['pistol', 'revolver', 'uzi', 'ak', 'aa12', 'sniper', 'm4'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cam = (code) => { try { return execFileSync(process.execPath, ["tools/camera.mjs", "eval", code, ...A], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); } catch (e) { return "ERR " + String(e.stderr || e.message).slice(0, 140); } };
const shot = (f) => { try { execFileSync(process.execPath, ["tools/camera.mjs", "shot", "--live", "--out", f, ...A], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); return "ok"; } catch (e) { return "shotfail"; } };
const setup = "T.runDevCommand(\u0027godmode\u0027); T.clearZombies(); T.marineIdleDbg().reset(); T.setViewFirstDbg(true); await new Promise(r => setTimeout(r, 800)); T.marineIdleDbg().reset(); await new Promise(r => setTimeout(r, 400)); return JSON.stringify({ idle: T.marineIdleDbg().state.phase, vis: T.marine.userData.weaponMount.visible, fp: T.fpDbg().first, god: T.devGodMode })";
const pick = (w) => "T.marineIdleDbg().reset(); T.setWeapon(T.WEAPON_ORDER.indexOf(\u0027" + w + "\u0027)); T.setViewFirstDbg(true); await new Promise(r => setTimeout(r, 700)); T.marineIdleDbg().reset(); await new Promise(r => setTimeout(r, 300)); return JSON.stringify({ w: T.getCurrentWeapon(), vis: T.marine.userData.weaponMount.visible })";
const probe = "const M = T.marine.userData.weaponMount; const base = { y: M.position.y, rz: M.rotation.z, rx: M.rotation.x }; T.setMouseFireDbg(true); setTimeout(() => T.setMouseFireDbg(false), 120); await new Promise(r => setTimeout(r, 350)); const s = { y: 0, rz: 0, rx: 0, n: 0 }; const iv = setInterval(() => { s.n++; if (Math.abs(M.position.y - base.y) > Math.abs(s.y)) s = { y: +(M.position.y - base.y).toFixed(5), rz: +(M.rotation.z - base.rz).toFixed(5), rx: +(M.rotation.x - base.rx).toFixed(5), n: s.n }; }, 8); T.startReload(); await new Promise(r => setTimeout(r, 2200)); clearInterval(iv); return JSON.stringify({ base: { y: +base.y.toFixed(4), rz: +base.rz.toFixed(4) }, dip: s, reloading: T.isReloading() })";
console.log("setup: " + cam(setup));
const rows = [];
for (const w of GUNS) {
  const p1 = cam(pick(w));
  const d = cam(probe);
  const f = "qa/2026-10-28-GB-228/" + PH + "/fp-" + w + "-reload.png";
  const s = shot(f);
  rows.push({ gun: w, pick: p1, dip: d });
  console.log(w.padEnd(9) + " " + p1 + "  " + d + "  shot " + s);
}
fs.writeFileSync("qa/2026-10-28-GB-228/" + PH + "-dip.json", JSON.stringify(rows, null, 2));
console.log("wrote " + rows.length + " rows");
