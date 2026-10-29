// patch2.mjs: GB-245 tuning door. FP_RELOAD_LIFT gains `turn` (how much of the reload's tilt about the butt first
// person keeps, 1 = all of it) and TT.fpReloadLiftDbg() hands the object to the camera so values can be swept live.
import fs from 'node:fs';
import crypto from 'node:crypto';
const DRY = process.argv.includes('--dry');
const FILE = 'index.html';
const WANT = '65B3834F150717A7D30472B74F6DB5E8A564494A33321318AFCA718FD5D726B7';
const buf = fs.readFileSync(FILE);
const got = crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
console.log('index.html sha256 ' + got);
if (got !== WANT) console.log('note: the file moved on since ' + WANT.slice(0, 8) + ' (another agent); the anchors below decide');
const text = buf.toString('utf8');
const EDITS = [
 ['const', `    const FP_RELOAD_LIFT = { x: 0.02, y: 0.30, z: 0.04 };`, `    const FP_RELOAD_LIFT = { x: 0.02, y: 0.30, z: 0.04, turn: 1 };`],
 ['turn', `      _hE.set(reloadMountOff.rx + recoilKick.rx, reloadMountOff.ry + recoilKick.ry, reloadMountOff.rz + recoilKick.rz);`,
          `      const rlT = viewFirst ? 1 + (FP_RELOAD_LIFT.turn - 1) * fpReloadLiftW : 1;   // GB-245: first person keeps this much of the reload's tilt
      _hE.set(reloadMountOff.rx * rlT + recoilKick.rx, reloadMountOff.ry * rlT + recoilKick.ry, reloadMountOff.rz * rlT + recoilKick.rz);`],
 ['dbg', `/* CL-122 */ reloadClipDbg: {`, `/* CL-122 */ fpReloadLiftDbg: () => FP_RELOAD_LIFT,   /* GB-245 */ reloadClipDbg: {`],
];
let out = text, bad = 0;
for (const [n, a, b] of EDITS) { const c = out.split(a).length - 1; console.log((c === 1 ? 'ok   ' : 'FAIL ') + n + ' x' + c); if (c !== 1) { bad++; continue; } out = out.replace(a, () => b); }
if (bad) { console.error('REFUSING'); process.exit(1); }
if (DRY) { console.log('dry: +' + (Buffer.byteLength(out) - buf.length) + ' bytes'); process.exit(0); }
const now = crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex').toUpperCase();
if (now !== got) { console.error('REFUSING: index.html changed while patching'); process.exit(1); }
fs.writeFileSync(FILE, out, 'utf8');
console.log('wrote, new sha256 ' + crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex').toUpperCase() + ' ' + fs.statSync(FILE).size + ' bytes');