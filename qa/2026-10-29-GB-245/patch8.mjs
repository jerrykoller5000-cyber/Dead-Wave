// patch8.mjs: rfocus2.mjs takes one gun. GB-245's candidate setting has to be checked on every long gun in one
// session (each camera start costs about 30 s), so this teaches it a comma-separated list. Exact-line, LF, no BOM.
import fs from 'node:fs';
const p = 'qa/2026-10-29-GB-245/rfocus2.mjs';
let s = fs.readFileSync(p, 'utf8');
if (!fs.existsSync(p + '.orig')) fs.writeFileSync(p + '.orig', s, { encoding: 'utf8' });
const before = s;
const old = "const GUN = process.argv[2] || 'ak';";
const neu = "const GUNS = (process.argv[2] || 'ak').split(',');";
if (s.split(old).length !== 2) throw new Error('gun line not found exactly once');
s = s.replace(old, neu);
// Wrap the per-gun body in a loop: the setup line and the row loop both name GUN.
const setupOld = "ev(`gb245r2.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { up: 0, in: 0, side: 0, tip: 0, turn: 1, cant: 1, hip: 0 }); T.setWeapon(T.WEAPON_ORDER.indexOf('${GUN}')); T.setViewFirstDbg(true); await wait(1600); T.marineIdleDbg().reset(); await wait(700); T.setAmmoDbg('${GUN}', 0); await wait(250); T.startReload(); await wait(150); return T.getCurrentWeapon()`);";
if (s.split(setupOld).length !== 2) throw new Error('setup line not found exactly once');
s = s.replace(setupOld, "for (const GUN of GUNS) {\n" + setupOld);
const endOld = "ev(`gb245r2.freeze(false); T.reloadClipDbg.hold(null); Object.assign(T.fpReloadLiftDbg(), { up: 0.06, in: 0, side: 0, tip: 0, turn: 1, cant: 1, hip: 0 }); return 1`);";
if (s.split(endOld).length !== 2) throw new Error('tail line not found exactly once');
s = s.replace(endOld, "ev(`gb245r2.freeze(false); T.reloadClipDbg.hold(null); return 1`);\n}\n" + endOld);
if (s.includes('\r')) throw new Error('CRLF appeared');
fs.writeFileSync(p, s, { encoding: 'utf8' });
console.log('changed:', before !== s, 'bytes:', Buffer.byteLength(s));